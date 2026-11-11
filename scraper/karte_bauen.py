#!/usr/bin/env python3
"""
Schneidet die Grundkarte fuer wege.html aus dem taeglichen Protomaps-Build.

    python3 scraper/karte_bauen.py              # neuester Build
    python3 scraper/karte_bauen.py 20261111     # bestimmter Build

Liest nur die noetigen Teile des weltweiten Archivs (rund 140 GB) ueber
HTTP-Bereichsabfragen und schreibt einen eigenen PMTiles-v3-Ausschnitt:
Stadtgebiet plus etwa 2 km Rand, Zoomstufen 10 bis 15 (die Protomaps-Kacheln
enden bei 15, MapLibre vergroessert darueber hinaus). Ersetzt `pmtiles extract`,
damit kein Zusatzwerkzeug noetig ist; nur Python-Standardbibliothek.
Spezifikation: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md

Daten: (c) OpenStreetMap-Mitwirkende, ODbL; Protomaps Basemap.
Ergebnis: karten/ingolstadt.pmtiles
"""
import gzip, json, math, os, ssl, struct, subprocess, sys, time, urllib.error, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HIER, '.cache', 'karte')
ZIEL = os.path.join(HIER, '..', 'karten', 'ingolstadt.pmtiles')
USER_AGENT = 'PapierPanther (schanzer-papierpanther.de)'
PAUSE_SEKUNDEN = 1.2
BUILDS = 'https://build-metadata.protomaps.dev/builds.json'
BUILD_URL = 'https://build.protomaps.com/%s'
MIN_ZOOM, MAX_ZOOM = 10, 15
RAND_GRAD = 0.025                 # gut 2 km um die Bezirke
LUECKE = 256 * 1024               # Bereiche mit kleinerem Abstand in einem Abruf holen
GRENZE_MB = 50

_letzter = [0.0]


def abrufen(url, von=None, bis=None):
    warte = PAUSE_SEKUNDEN - (time.time() - _letzter[0])
    if warte > 0:
        time.sleep(warte)
    kopf = {'User-Agent': USER_AGENT}
    if von is not None:
        kopf['Range'] = 'bytes=%d-%d' % (von, bis)
    try:
        for versuch in range(4):
            try:
                try:
                    inhalt = urllib.request.urlopen(urllib.request.Request(url, headers=kopf), timeout=120).read()
                except urllib.error.URLError as fehler:
                    if not isinstance(fehler.reason, ssl.SSLError):
                        raise
                    # TLS 1.3 kann das System-Python von macOS nicht (siehe wege_bauen.py)
                    befehl = ['curl', '-sS', '--fail', '-4', '--max-time', '120', '-A', USER_AGENT, url]
                    if von is not None:
                        befehl[1:1] = ['-r', '%d-%d' % (von, bis)]
                    inhalt = subprocess.run(befehl, stdout=subprocess.PIPE, check=True).stdout
                if von is not None and len(inhalt) != bis - von + 1:
                    raise OSError('Bereich unvollstaendig: %d statt %d Bytes' % (len(inhalt), bis - von + 1))
                return inhalt
            except (OSError, subprocess.CalledProcessError) as fehler:
                print('Abruf:', fehler)
                time.sleep(5 * (versuch + 1))
        raise SystemExit('Protomaps-Build nicht erreichbar: ' + url)
    finally:
        _letzter[0] = time.time()


# ------------------------------------------------------------------ PMTiles v3

KOPF = struct.Struct('<7sBQQQQQQQQQQQBBBBBBiiiiBii')   # 127 Bytes


def lies_kopf(b):
    w = KOPF.unpack(b[:127])
    if w[0] != b'PMTiles' or w[1] != 3:
        raise SystemExit('Kein PMTiles-v3-Archiv')
    namen = ['magie', 'version', 'root_off', 'root_len', 'meta_off', 'meta_len', 'leaf_off', 'leaf_len',
             'data_off', 'data_len', 'adressiert', 'eintraege', 'inhalte', 'geclustert', 'intern_komp',
             'kachel_komp', 'kachel_typ', 'min_z', 'max_z', 'min_lon', 'min_lat', 'max_lon', 'max_lat',
             'mitte_z', 'mitte_lon', 'mitte_lat']
    return dict(zip(namen, w))


def entpacke(b, komp):
    if komp == 1:
        return b
    if komp == 2:
        return gzip.decompress(b)
    raise SystemExit('Verzeichnis-Kompression %d wird nicht unterstuetzt' % komp)


def varint(b, i):
    wert = schieb = 0
    while True:
        c = b[i]
        i += 1
        wert |= (c & 0x7f) << schieb
        if c < 0x80:
            return wert, i
        schieb += 7


def lies_verzeichnis(b):
    n, i = varint(b, 0)
    ids, laeufe, laengen, offs = [], [], [], []
    letzte = 0
    for _ in range(n):
        d, i = varint(b, i)
        letzte += d
        ids.append(letzte)
    for liste in (laeufe, laengen):
        for _ in range(n):
            v, i = varint(b, i)
            liste.append(v)
    for k in range(n):
        v, i = varint(b, i)
        offs.append(offs[k - 1] + laengen[k - 1] if v == 0 and k > 0 else v - 1)
    return list(zip(ids, laeufe, offs, laengen))


def schreibe_varint(w, aus):
    while w >= 0x80:
        aus.append((w & 0x7f) | 0x80)
        w >>= 7
    aus.append(w)


def baue_verzeichnis(eintraege):
    aus = bytearray()
    schreibe_varint(len(eintraege), aus)
    letzte = 0
    for e in eintraege:
        schreibe_varint(e[0] - letzte, aus)
        letzte = e[0]
    for spalte in (1, 3):
        for e in eintraege:
            schreibe_varint(e[spalte], aus)
    for k, e in enumerate(eintraege):
        if k > 0 and e[2] == eintraege[k - 1][2] + eintraege[k - 1][3]:
            schreibe_varint(0, aus)
        else:
            schreibe_varint(e[2] + 1, aus)
    return gzip.compress(bytes(aus), mtime=0)


def kachel_id(z, x, y):
    """Hilbert-Nummer wie in der PMTiles-Referenz (zxyToTileId)."""
    d, s = 0, 1 << (z - 1) if z else 0
    while s > 0:
        rx = 1 if x & s else 0
        ry = 1 if y & s else 0
        d += s * s * ((3 * rx) ^ ry)
        if ry == 0:
            if rx == 1:
                x, y = s - 1 - x, s - 1 - y
            x, y = y, x
        s >>= 1
    return (4 ** z - 1) // 3 + d


def kachel_xy(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


# --------------------------------------------------------------------- Ablauf

def stadtgrenzen():
    with open(os.path.join(HIER, '..', 'data', 'bezirke.json'), encoding='utf-8') as f:
        geo = json.load(f)
    pts = []
    for ft in geo['features']:
        g = ft['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        pts += [p for poly in polys for ring in poly for p in ring]
    return (min(p[0] for p in pts) - RAND_GRAD, min(p[1] for p in pts) - RAND_GRAD,
            max(p[0] for p in pts) + RAND_GRAD, max(p[1] for p in pts) + RAND_GRAD)


def main():
    if len(sys.argv) > 1:
        build = sys.argv[1] if sys.argv[1].endswith('.pmtiles') else sys.argv[1] + '.pmtiles'
    else:
        build = json.loads(abrufen(BUILDS))[-1]['key']
    url = BUILD_URL % build
    print('Build:', url)
    w, s, o, n = stadtgrenzen()

    roh = abrufen(url, 0, 16383)
    k = lies_kopf(roh)
    root = lies_verzeichnis(entpacke(roh[k['root_off']:k['root_off'] + k['root_len']], k['intern_komp']))
    meta = entpacke(abrufen(url, k['meta_off'], k['meta_off'] + k['meta_len'] - 1), k['intern_komp'])

    gesucht = []
    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        x0, y0 = kachel_xy(w, n, z)
        x1, y1 = kachel_xy(o, s, z)
        gesucht += [kachel_id(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    gesucht.sort()

    blaetter = {}

    def finde(verz, tid):
        lo, hi = 0, len(verz) - 1
        while lo <= hi:   # letzter Eintrag mit id <= tid
            m = (lo + hi) // 2
            if verz[m][0] <= tid:
                lo = m + 1
            else:
                hi = m - 1
        return verz[hi] if hi >= 0 else None

    def suche(tid):
        verz = root
        for _ in range(4):
            e = finde(verz, tid)
            if e is None:
                return None
            if e[1] == 0:   # Verweis auf ein Blattverzeichnis
                if e[2] not in blaetter:
                    a = k['leaf_off'] + e[2]
                    blaetter[e[2]] = lies_verzeichnis(entpacke(abrufen(url, a, a + e[3] - 1), k['intern_komp']))
                verz = blaetter[e[2]]
                continue
            return (e[2], e[3]) if tid < e[0] + e[1] else None
        return None

    fundorte = {}
    for tid in gesucht:
        f = suche(tid)
        if f:
            fundorte[tid] = f
    print('%d Kacheln gesucht, %d vorhanden, %d Blattverzeichnisse gelesen' % (len(gesucht), len(fundorte), len(blaetter)))

    # Kacheldaten in zusammengefassten Bereichen holen
    bereiche = sorted(set(fundorte.values()))
    gruppen, aktuell = [], [bereiche[0]]
    for b in bereiche[1:]:
        if b[0] - (aktuell[-1][0] + aktuell[-1][1]) <= LUECKE:
            aktuell.append(b)
        else:
            gruppen.append(aktuell)
            aktuell = [b]
    gruppen.append(aktuell)
    os.makedirs(CACHE, exist_ok=True)
    inhalt = {}
    gesamt = sum(g[-1][0] + g[-1][1] - g[0][0] for g in gruppen)
    print('%d Abrufe, zusammen %.1f MB' % (len(gruppen), gesamt / 1e6))
    for nr, g in enumerate(gruppen):
        a, e = k['data_off'] + g[0][0], k['data_off'] + g[-1][0] + g[-1][1] - 1
        pfad = os.path.join(CACHE, '%s-%d-%d' % (build, a, e))
        if os.path.exists(pfad):
            stueck = open(pfad, 'rb').read()
        else:
            stueck = abrufen(url, a, e)
            open(pfad, 'wb').write(stueck)
        for off, lang in g:
            inhalt[(off, lang)] = stueck[off - g[0][0]:off - g[0][0] + lang]
        if nr % 10 == 9:
            print('  %d/%d' % (nr + 1, len(gruppen)))

    # Neues Archiv: Kacheln nach Nummer, gleiche Inhalte nur einmal, Laeufe zusammengefasst
    daten, neu_off, eintraege = bytearray(), {}, []
    for tid in sorted(fundorte):
        quelle = fundorte[tid]
        if quelle not in neu_off:
            neu_off[quelle] = len(daten)
            daten += inhalt[quelle]
        off = neu_off[quelle]
        if eintraege and eintraege[-1][2] == off and eintraege[-1][0] + eintraege[-1][1] == tid:
            eintraege[-1][1] += 1
        else:
            eintraege.append([tid, 1, off, quelle[1]])

    wurzel = baue_verzeichnis(eintraege)
    blatt = b''
    if 127 + len(wurzel) > 16384:   # zu gross fuer den Anfang der Datei: Blaetter zu je 4096 Eintraegen
        stuecke, verweise = [], []
        for i in range(0, len(eintraege), 4096):
            teil = baue_verzeichnis(eintraege[i:i + 4096])
            verweise.append([eintraege[i][0], 0, sum(len(x) for x in stuecke), len(teil)])
            stuecke.append(teil)
        blatt, wurzel = b''.join(stuecke), baue_verzeichnis(verweise)
    meta_gz = gzip.compress(meta, mtime=0)
    root_off = 127
    meta_off = root_off + len(wurzel)
    leaf_off = meta_off + len(meta_gz)
    data_off = leaf_off + len(blatt)
    mitte_lon, mitte_lat = (w + o) / 2, (s + n) / 2
    kopf = KOPF.pack(b'PMTiles', 3, root_off, len(wurzel), meta_off, len(meta_gz), leaf_off, len(blatt),
                     data_off, len(daten), len(fundorte), len(eintraege), len(neu_off), 1, 2,
                     k['kachel_komp'], k['kachel_typ'], MIN_ZOOM, MAX_ZOOM,
                     round(w * 1e7), round(s * 1e7), round(o * 1e7), round(n * 1e7),
                     13, round(mitte_lon * 1e7), round(mitte_lat * 1e7))
    os.makedirs(os.path.dirname(ZIEL), exist_ok=True)
    with open(ZIEL + '.teil', 'wb') as f:
        f.write(kopf + wurzel + meta_gz + blatt + daten)
    os.replace(ZIEL + '.teil', ZIEL)
    groesse = os.path.getsize(ZIEL) / 1024 / 1024
    print('%s: %d Kacheln, %d Inhalte, %.1f MB' % (os.path.relpath(ZIEL), len(fundorte), len(neu_off), groesse))
    if groesse > GRENZE_MB:
        print('WARNUNG: groesser als %d MB' % GRENZE_MB)

    # Gegenprobe: jede Kachel im neuen Archiv wiederfinden und mit der Quelle vergleichen
    neu = open(ZIEL, 'rb').read()
    nk = lies_kopf(neu)
    verz = lies_verzeichnis(entpacke(neu[nk['root_off']:nk['root_off'] + nk['root_len']], 2))
    if nk['leaf_len']:
        alle = []
        for e in verz:
            a = nk['leaf_off'] + e[2]
            alle += lies_verzeichnis(entpacke(neu[a:a + e[3]], 2))
        verz = alle
    gefunden = 0
    for tid, lauf, off, lang in verz:
        for t in range(tid, tid + lauf):
            a = nk['data_off'] + off
            assert neu[a:a + lang] == inhalt[fundorte[t]], t
            gefunden += 1
    assert gefunden == len(fundorte)
    print('Gegenprobe: alle %d Kacheln stimmen' % gefunden)


if __name__ == '__main__':
    main()
