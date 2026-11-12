#!/usr/bin/env python3
"""
Bus-Reichweite fuer wege.html aus dem Soll-Fahrplan (GTFS) des VGI.

    python3 scraper/oepnv_bauen.py          # Fahrplan aus dem Cache, wenn vorhanden
    python3 scraper/oepnv_bauen.py --neu    # Fahrplan frisch laden (12,7 MB)

Quelle: https://www.vgi.de/FileServlet?gtfs=true, Ingolstaedter Verkehrsgesellschaft mbH
(INVG) / Verkehrsverbund Grossraum Ingolstadt. Lizenz laut Nutzungsbedingungen
(https://www.vgi.de/Nutzungsbedingungen_GTFS): CC BY-SA 3.0 DE, zur nicht kommerziellen
Nutzung. Die Ergebnisdatei ist davon abgeleitet und steht unter derselben Lizenz.

Fuer fuenf Zeitfenster an je einem Stichtag (Mo 7-9, Mo 12-14, Mo 17-19, Sa 10-12,
So 10-12) entsteht je Haltestelle im Stadtgebiet:
- der Takt: 120 Minuten geteilt durch die Zahl der Abfahrten im Fenster (alle Linien),
- die Haltestellen, die man in 30 Minuten Fahrt erreicht, mit Minuten. Umsteigen kostet
  5 Minuten, auch zu einer Haltestelle bis 200 m entfernt (plus Fussweg); die erste
  Wartezeit (halber Takt) rechnet erst die Seite dazu.
Die Fahrzeit je Linienabschnitt ist der Median der Fahrten im Fenster (plus 30 Minuten
danach, damit Fahrten vom Fensterende noch zu Ende gerechnet werden).
Dazu je Haltestelle der Einstiegsknoten im Fussnetz (data/wege-netz.json).

Ergebnis: data/wege-bus.json + data/wege-bus.js (window.WEGE_BUS).
"""
import collections, csv, heapq, io, itertools, json, math, os, statistics, sys, time, zipfile
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wege_bauen import datei, xy, im_polygon, LAT0, LON0, MX, MY   # noqa: E402

HIER = os.path.dirname(os.path.abspath(__file__))
CACHE_NAME = os.path.join('..', 'oepnv', 'gtfs.zip')   # relativ zu scraper/.cache/wege
DATEN = os.path.join(HIER, '..', 'data')
GTFS_URL = 'https://www.vgi.de/FileServlet?gtfs=true'
NEU = '--neu' in sys.argv
FENSTER = [   # id, Bezeichnung, Bezeichnung leicht, Stichtag, Wochentag-Spalte, von, bis (Minuten)
    ('mo_frueh', 'Montag 7–9 Uhr', 'Montag früh', '20261116', 'monday', 7 * 60, 9 * 60),
    ('mo_mittag', 'Montag 12–14 Uhr', 'Montag Mittag', '20261116', 'monday', 12 * 60, 14 * 60),
    ('mo_abend', 'Montag 17–19 Uhr', 'Montag Abend', '20261116', 'monday', 17 * 60, 19 * 60),
    ('samstag', 'Samstag 10–12 Uhr', 'Samstag', '20261121', 'saturday', 10 * 60, 12 * 60),
    ('sonntag', 'Sonntag 10–12 Uhr', 'Sonntag', '20261122', 'sunday', 10 * 60, 12 * 60),
]
GRENZE_S = 30 * 60
UMSTIEG_S = 5 * 60
UMSTIEG_M = 200          # Umsteigen auch zu Haltestellen in der Naehe (ZOB-Steige sind im GTFS getrennt)
GEH_MS = 5.0 / 3.6       # Fussweg beim Umsteigen
NACHLAUF_S = 30 * 60


def zeit_s(t):
    h, m, s = t.split(':')
    return int(h) * 3600 + int(m) * 60 + int(s)


def lies(z, name):
    with z.open(name) as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig')))


def stadtgebiet():
    with open(os.path.join(DATEN, 'bezirke.json'), encoding='utf-8') as f:
        geo = json.load(f)
    ringe = []
    for ft in geo['features']:
        g = ft['geometry']
        for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
            ringe.append([xy(la, lo) for lo, la in poly[0]])
    return lambda lat, lon: any(im_polygon(*xy(lat, lon), [r]) for r in ringe)


def aktive_dienste(z, datum, spalte):
    aktiv = set()
    for r in lies(z, 'calendar.txt'):
        if r[spalte] == '1' and r['start_date'] <= datum <= r['end_date']:
            aktiv.add(r['service_id'])
    for r in lies(z, 'calendar_dates.txt'):
        if r['date'] == datum:
            (aktiv.add if r['exception_type'] == '1' else aktiv.discard)(r['service_id'])
    return aktiv


class Einraster:
    """Naechste begehbare Kante im Fussnetz (wie Kantenraster in wege_bauen.py, auf der fertigen Datei)."""

    def __init__(self):
        with open(os.path.join(DATEN, 'wege-netz.json'), encoding='utf-8') as f:
            n = json.load(f)
        lat = list(itertools.accumulate(n['lat']))
        lon = list(itertools.accumulate(n['lon']))
        self.pos = [xy(a / 1e5, b / 1e5) for a, b in zip(lat, lon)]
        von = list(itertools.accumulate(n['von']))
        nach = [a + d for a, d in zip(von, n['nach'])]
        gesperrt = n['kanten_felder'].index('gesperrt')
        self.kanten = [(a, b, l) for a, b, l, t in zip(von, nach, n['laenge'], n['typ'])
                       if not n['kanten_typen'][t][gesperrt]]
        self.gitter = collections.defaultdict(list)
        for k, (a, b, _) in enumerate(self.kanten):
            (xa, ya), (xb, yb) = self.pos[a], self.pos[b]
            for i in range(int(min(xa, xb) // 50), int(max(xa, xb) // 50) + 1):
                for j in range(int(min(ya, yb) // 50), int(max(ya, yb) // 50) + 1):
                    self.gitter[(i, j)].append(k)

    def einstieg(self, x, y):
        best = (300.0, None, 0.0)
        ci, cj = int(x // 50), int(y // 50)
        for i in range(ci - 7, ci + 8):
            for j in range(cj - 7, cj + 8):
                for k in self.gitter.get((i, j), ()):
                    a, b, _ = self.kanten[k]
                    (xa, ya), (xb, yb) = self.pos[a], self.pos[b]
                    dx, dy = xb - xa, yb - ya
                    q = dx * dx + dy * dy
                    t = 0.0 if q == 0 else max(0.0, min(1.0, ((x - xa) * dx + (y - ya) * dy) / q))
                    d = math.hypot(xa + t * dx - x, ya + t * dy - y)
                    if d < best[0]:
                        best = (d, k, t)
        d, k, t = best
        if k is None:
            return [], []
        a, b, l = self.kanten[k]
        return [a, b], [round(d + t * l), round(d + (1 - t) * l)]


def main():
    t0 = time.time()
    z = zipfile.ZipFile(datei(CACHE_NAME, GTFS_URL, NEU))
    feed = lies(z, 'feed_info.txt')[0]
    print('Fahrplan', feed.get('feed_version'), 'gueltig', feed.get('feed_start_date'), '-', feed.get('feed_end_date'))
    for f in FENSTER:
        if not feed['feed_start_date'] <= f[3] <= feed['feed_end_date']:
            raise SystemExit('Stichtag %s liegt nicht im Fahrplanzeitraum, FENSTER anpassen.' % f[3])

    stops = lies(z, 'stops.txt')
    zeile = {s['stop_id']: s for s in stops}
    station = {s['stop_id']: (s['parent_station'] or s['stop_id']) for s in stops}
    im_stadtgebiet = stadtgebiet()
    stadt = sorted({station[s['stop_id']] for s in stops if s['location_type'] in ('', '0')
                    and im_stadtgebiet(float(zeile[station[s['stop_id']]]['stop_lat']), float(zeile[station[s['stop_id']]]['stop_lon']))},
                   key=lambda sid: (float(zeile[sid]['stop_lat']), float(zeile[sid]['stop_lon'])))
    nr = {sid: i for i, sid in enumerate(stadt)}
    trips = {t['trip_id']: t for t in lies(z, 'trips.txt')}
    halte = collections.defaultdict(list)
    for r in lies(z, 'stop_times.txt'):
        halte[r['trip_id']].append((int(r['stop_sequence']), zeit_s(r['arrival_time']), zeit_s(r['departure_time']),
                                    station[r['stop_id']], r.get('pickup_type', '0')))
    for v in halte.values():
        v.sort()
    print('%d Haltestellen im Stadtgebiet, %d Fahrten im Fahrplan' % (len(stadt), len(trips)))

    raster = Einraster()
    haltestellen = []
    for sid in stadt:
        r = zeile[sid]
        name = r['stop_name'].replace('Ingolstadt, ', '')
        knoten, abstand = raster.einstieg(*xy(float(r['stop_lat']), float(r['stop_lon'])))
        haltestellen.append([name, round(float(r['stop_lat']), 5), round(float(r['stop_lon']), 5), knoten, abstand])

    takt, ziele, statistik = {}, {}, {}
    dienste_je_tag = {}
    for fid, _, _, datum, spalte, von, bis in FENSTER:
        if datum not in dienste_je_tag:
            dienste_je_tag[datum] = aktive_dienste(z, datum, spalte)
        dienste = dienste_je_tag[datum]
        lo, hi = von * 60, bis * 60
        abfahrten = collections.Counter()
        abschnitte = collections.defaultdict(list)   # (muster, i) -> Fahrzeiten
        muster_folge = {}
        for tid, t in trips.items():
            if t['service_id'] not in dienste:
                continue
            h = halte[tid]
            folge = tuple(x[3] for x in h)
            m = (t['route_id'], folge)
            for i in range(len(h) - 1):
                dep = h[i][2]
                if lo <= dep < hi and h[i][4] != '1' and h[i][3] in nr:
                    abfahrten[h[i][3]] += 1
                if lo <= dep < hi + NACHLAUF_S:
                    abschnitte[(m, i)].append(max(0, h[i + 1][1] - dep))
                    muster_folge[m] = folge
        # Graph: Positionen (Muster, Index); Umsteigen ueber den Haltestellenknoten (+5 Min)
        pos = {}
        for (m, i) in abschnitte:
            pos.setdefault((m, i), len(pos))
            pos.setdefault((m, i + 1), len(pos))
        weiter = [None] * len(pos)
        an_station = collections.defaultdict(list)
        stat_von = [None] * len(pos)
        for (m, i), p in pos.items():
            stat_von[p] = muster_folge[m][i]
            an_station[stat_von[p]].append(p)
            if (m, i) in abschnitte:
                weiter[p] = (pos[(m, i + 1)], statistics.median(abschnitte[(m, i)]))
        stationen = list(an_station)
        st_nr = {s: k for k, s in enumerate(stationen)}
        # Nachbarn zum Umsteigen: Haltestellen bis UMSTIEG_M, mit Fussweg in Sekunden
        lage = {st: xy(float(zeile[st]['stop_lat']), float(zeile[st]['stop_lon'])) for st in stationen}
        gitter = collections.defaultdict(list)
        for st, (x, y) in lage.items():
            gitter[(int(x // UMSTIEG_M), int(y // UMSTIEG_M))].append(st)
        nachbarn = {}
        for st, (x, y) in lage.items():
            gx, gy = int(x // UMSTIEG_M), int(y // UMSTIEG_M)
            nachbarn[st] = [(o, math.hypot(lage[o][0] - x, lage[o][1] - y) / GEH_MS)
                            for i in (gx - 1, gx, gx + 1) for j in (gy - 1, gy, gy + 1) for o in gitter.get((i, j), ())
                            if math.hypot(lage[o][0] - x, lage[o][1] - y) <= UMSTIEG_M]
        ziele_f = []
        for sid in stadt:
            best = {}
            if sid not in an_station:
                ziele_f.append([])
                continue
            zp = [math.inf] * len(pos)
            zs = [math.inf] * len(stationen)
            heap = []
            for p in an_station[sid]:
                zp[p] = 0
                heap.append((0, 0, p))   # (zeit, art 0 = Position / 1 = Station, nummer)
            heapq.heapify(heap)
            while heap:
                tz, art, k = heapq.heappop(heap)
                if art == 0:
                    if tz > zp[k]:
                        continue
                    s = stat_von[k]
                    sk = st_nr[s]
                    if tz < zs[sk]:            # aussteigen
                        zs[sk] = tz
                        heapq.heappush(heap, (tz, 1, sk))
                    if weiter[k]:
                        q, dt = weiter[k]
                        if tz + dt < zp[q] and tz + dt <= GRENZE_S:
                            zp[q] = tz + dt
                            heapq.heappush(heap, (tz + dt, 0, q))
                else:
                    if tz > zs[k]:
                        continue
                    s = stationen[k]
                    if s in nr and s != sid:
                        best[nr[s]] = min(best.get(nr[s], math.inf), tz)
                    for s2, geh in nachbarn[s]:   # wieder einsteigen, andere Linie, auch am Nachbarsteig
                        nz = tz + UMSTIEG_S + geh
                        for q in an_station[s2]:
                            if nz < zp[q] and nz <= GRENZE_S:
                                zp[q] = nz
                                heapq.heappush(heap, (nz, 0, q))
            # kompakt: je Ziel eine Zahl = (Abstand zum vorigen Zielindex) * 32 + Minuten
            liste, vor = [], 0
            for d in sorted(best):
                minuten = math.ceil(best[d] / 60 - 1e-9)
                liste.append((d - vor) * 32 + minuten)
                vor = d
            ziele_f.append(liste)
        takt[fid] = [min(120, round((bis - von) / abfahrten[sid])) if abfahrten[sid] else 255 for sid in stadt]
        ziele[fid] = ziele_f
        statistik[fid] = {'haltestellen_mit_abfahrt': sum(1 for x in takt[fid] if x != 255),
                          'verbindungen': sum(len(x) for x in ziele_f)}
        print('%-10s %s: %d Haltestellen mit Abfahrt, %d Verbindungen in 30 Min, %d Linienabschnitte'
              % (fid, datum, statistik[fid]['haltestellen_mit_abfahrt'], statistik[fid]['verbindungen'], len(abschnitte)))

    aus = {
        'erzeugt_von': 'scraper/oepnv_bauen.py', 'erzeugt_am': date.today().isoformat(),
        'quelle': ('Soll-Fahrplandaten (GTFS): Ingolstädter Verkehrsgesellschaft mbH (INVG) / Verkehrsverbund '
                   'Großraum Ingolstadt, CC BY-SA 3.0 DE, zur nicht kommerziellen Nutzung; Fahrplanstand '
                   + str(feed.get('feed_version'))),
        'lizenz': 'CC BY-SA 3.0 DE (https://creativecommons.org/licenses/by-sa/3.0/de/)',
        'format': ('haltestellen: [name, lat, lon, knoten, abstand] (knoten/abstand: Einstieg im Fussnetz WEGE_NETZ, Meter). '
                   'takt[fenster]: Minuten zwischen zwei Abfahrten (alle Linien), 255 = keine Abfahrt. '
                   'ziele[fenster][haltestelle]: je Ziel eine Zahl (Zielindex minus vorigem Zielindex) * 32 + Minuten Fahrt '
                   'inklusive 5 Minuten je Umstieg (auch zu Haltestellen bis 200 m, plus Fussweg), ohne erste Wartezeit; '
                   'nur Ziele in 30 Minuten.'),
        'umstieg_min': UMSTIEG_S // 60, 'grenze_min': GRENZE_S // 60,
        'fenster': [{'id': f[0], 'name': f[1], 'name_l': f[2], 'stichtag': f[3]} for f in FENSTER],
        'haltestellen': haltestellen, 'takt': takt, 'ziele': ziele, 'statistik': statistik,
    }
    text = json.dumps(aus, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(DATEN, 'wege-bus.json'), 'w', encoding='utf-8') as f:
        f.write(text + '\n')
    pfad = os.path.join(DATEN, 'wege-bus.js')
    with open(pfad, 'w', encoding='utf-8') as f:
        f.write('/* Bus-Reichweite aus dem Soll-Fahrplan der INVG/VGI, CC BY-SA 3.0 DE, nicht kommerziell; '
                'erzeugt von scraper/oepnv_bauen.py */\nwindow.WEGE_BUS = ' + text + ';\n')
    print('wege-bus.js %d KB, fertig in %d s' % (os.path.getsize(pfad) // 1024, time.time() - t0))


if __name__ == '__main__':
    main()
