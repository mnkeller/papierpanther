#!/usr/bin/env python3
"""
Baut die Daten fuer die Erreichbarkeitskarte „Deine 15 Minuten“ (Plan: WEGE-KARTE-PLAN.md).

    python3 scraper/wege_bauen.py          # Abrufe aus dem Cache, wenn vorhanden
    python3 scraper/wege_bauen.py --neu    # OpenStreetMap und Bezirke frisch holen

Quellen (alles in scraper/.cache/wege/ gepuffert, 1,2 s Pause je Abruf):
- OpenStreetMap ueber Overpass, Gemeindeschluessel 09161000: Fusswegenetz,
  Alltagsorte, Baeume/Wald/Parks fuer das Schatten-Merkmal. ODbL.
- Stadt Ingolstadt: Stadtbezirke als GeoJSON in EPSG:25832 (UTM 32). CC BY 3.0 DE.
- Zensus 2022, 100-m-Gitter (Destatis): Einwohner, Anteil unter 18 und ab 65.
  Koordinaten laut Datensatzbeschreibung ETRS89-LAEA Europe (EPSG:3035),
  Zellmittelpunkte. Die Zensus-Zips werden nur einmal geladen (Stichtag 2022).

Ergebnis (je .json und .js):
- data/wege-netz.*    window.WEGE_NETZ    Knoten und Kanten mit allen Merkmalen,
                                          die Personen und Bedingungen brauchen
- data/wege-orte.*    window.WEGE_ORTE    Alltagsorte mit Einstiegsknoten
- data/wege-zellen.*  window.WEGE_ZELLEN  Zensus-Zellen mit Minuten zum naechsten
                                          und zweitnaechsten Ort je Kategorie
- data/bezirke.*      window.BEZIRKE      12 Stadtbezirke, WGS84, auf ~5 m vereinfacht

Das Netz wird verdichtet: Zwischenpunkte ohne Merkmal fallen weg, solange die
Linie um hoechstens 3 m abweicht; die Kantenlaenge bleibt die echte Weglaenge.
Die Projektionen (UTM, LAEA) sind hier selbst umgesetzt, ohne Bibliothek.
"""
import base64, collections, heapq, io, json, math, os, socket, ssl, subprocess, sys, time, urllib.error, urllib.parse, \
    urllib.request, zipfile
from datetime import date

HIER = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HIER, '.cache', 'wege')
DATEN = os.path.join(HIER, '..', 'data')
NEU = '--neu' in sys.argv
USER_AGENT = 'PapierPanther (schanzer-papierpanther.de)'
PAUSE_SEKUNDEN = 1.2

# IPv4 zuerst, wie in ris_ingolstadt.py: Die IPv6-Route haengt von manchen Anschluessen aus.
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: sorted(_getaddrinfo(*a, **k), key=lambda x: x[0] != socket.AF_INET)

ZENSUS_URL = 'https://www.destatis.de/static/DE/zensus/gitterdaten/'
ZENSUS = {  # Kurzname: (Zip, Spalte im 100-m-CSV)
    'einwohner': ('Zensus2022_Bevoelkerungszahl.zip', 'Einwohner'),
    'u18': ('Anteil_unter_18-jaehrige_in_Gitterzellen.zip', 'AnteilUnter18'),
    'ue65': ('Anteil_ab_65-jaehrige_in_Gitterzellen.zip', 'AnteilUeber65'),
}
BEZIRKE_URL = 'https://www.ingolstadt.de/openbydata/GIS/Stadtbezirke_Ingolstadt.geojson'
OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

# Startwerte der Person „Erwachsene“ (WEGE-KARTE-PLAN.md, Abschnitt 4)
TEMPO = 5.0 / 3.6          # m/s
AMPEL_S = 30               # Zuschlag je Ampel
GRENZE_S = 60 * 60         # weiter wird nicht gerechnet
UNERREICHBAR = 255
KEIN_ORT = 65535
VEREINFACHUNG_M = 3.0      # Netz
BEZIRK_VEREINFACHUNG_M = 5.0

_letzter_abruf = [0.0]


def abrufen(url, daten=None, timeout=300):
    warte = PAUSE_SEKUNDEN - (time.time() - _letzter_abruf[0])
    if warte > 0:
        time.sleep(warte)
    anfrage = urllib.request.Request(url, data=daten, headers={'User-Agent': USER_AGENT, 'Accept': '*/*'})
    try:
        return urllib.request.urlopen(anfrage, timeout=timeout).read()
    except urllib.error.URLError as fehler:
        if not isinstance(fehler.reason, ssl.SSLError):
            raise
        # overpass-api.de verlangt inzwischen TLS 1.3; das System-Python von macOS
        # (LibreSSL 2.8.3) kann das nicht. Dann holt das mitgelieferte curl.
        befehl = ['curl', '-sS', '--fail', '-4', '--max-time', str(timeout), '-A', USER_AGENT, url]
        if daten is not None:
            befehl[1:1] = ['--data-binary', '@-']
        return subprocess.run(befehl, input=daten, stdout=subprocess.PIPE, check=True).stdout
    finally:
        _letzter_abruf[0] = time.time()


def speichere(pfad, inhalt):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad + '.teil', 'wb') as f:
        f.write(inhalt)
    os.replace(pfad + '.teil', pfad)


def datei(name, url, neu=False):
    pfad = os.path.join(CACHE, name)
    if not os.path.exists(pfad) or neu:
        print('lade', url)
        speichere(pfad, abrufen(url, timeout=600))
    return pfad


# ------------------------------------------------------------------ Overpass

GEMEINDE = 'area["de:amtlicher_gemeindeschluessel"="09161000"]->.a;'
# Begehbare Wegetypen; motorway und trunk fehlen bewusst.
KLASSE = {
    'footway': 'fussweg', 'corridor': 'fussweg', 'pedestrian': 'fussgaengerzone',
    'path': 'pfad', 'bridleway': 'pfad', 'track': 'feldweg', 'steps': 'treppe',
    'cycleway': 'radweg', 'living_street': 'wohnstrasse', 'service': 'erschliessung',
    'residential': 'anlieger', 'unclassified': 'anlieger', 'road': 'anlieger',
    'tertiary': 'sammelstrasse', 'tertiary_link': 'sammelstrasse',
    'secondary': 'hauptstrasse', 'secondary_link': 'hauptstrasse',
    'primary': 'hauptstrasse', 'primary_link': 'hauptstrasse',
}
ABFRAGEN = {
    'netz': '[out:json][timeout:600];' + GEMEINDE
            + 'way["highway"~"^(%s)$"](area.a)->.w;.w out body;node(w.w);out body;' % '|'.join(sorted(KLASSE)),
    'orte': '[out:json][timeout:600];' + GEMEINDE + '('
            'nwr["shop"~"^(supermarket|bakery|pastry|ice_cream)$"](area.a);'
            'nwr["amenity"~"^(pharmacy|doctors|hospital|school|kindergarten|childcare|library|bank|post_office|'
            'place_of_worship|toilets|cafe|ice_cream|drinking_water|bench)$"](area.a);'
            'nwr["healthcare"~"^(doctor|pharmacy)$"](area.a);'
            'nwr["post_office"="post_partner"](area.a);'
            'nwr["leisure"~"^(playground|park|pitch|sports_centre|stadium)$"](area.a);'
            'nwr["public_transport"="platform"](area.a);node["highway"="bus_stop"](area.a);'
            'nwr["railway"~"^(station|halt)$"](area.a);'
            'nwr["tourism"~"^(hotel|hostel|guest_house|information|attraction|museum|viewpoint)$"](area.a);'
            ');out tags geom;',
    'schatten': '[out:json][timeout:600];' + GEMEINDE + '('
                'node["natural"="tree"](area.a);way["natural"="tree_row"](area.a);'
                'nwr["natural"="wood"](area.a);nwr["landuse"="forest"](area.a);nwr["leisure"="park"](area.a);'
                ');out tags geom;',
}


def overpass(name):
    pfad = os.path.join(CACHE, 'osm-%s.json' % name)
    if os.path.exists(pfad) and not NEU:
        return json.load(open(pfad, encoding='utf-8'))
    daten = urllib.parse.urlencode({'data': ABFRAGEN[name]}).encode()
    for versuch in range(4):
        try:
            print('Overpass:', name)
            inhalt = abrufen(OVERPASS_URL, daten, timeout=700)
            if inhalt.lstrip()[:1] == b'{':
                d = json.loads(inhalt)
                # Overpass meldet Zeitueberschreitungen mit Status 200 und halbem Ergebnis
                if 'runtime error' not in d.get('remark', ''):
                    speichere(pfad, inhalt)
                    print('Overpass: Datenstand', d.get('osm3s', {}).get('timestamp_osm_base'))
                    return d
                print('Overpass:', d['remark'])
        except (OSError, subprocess.CalledProcessError) as fehler:
            print('Overpass:', fehler)
        time.sleep(10 * (versuch + 1))
    raise SystemExit('Overpass liefert nichts, spaeter noch einmal versuchen.')


# --------------------------------------------------------------- Projektionen
# GRS80; ETRS89 und WGS84 sind fuer diesen Zweck gleich (Abweichung unter 1 m).
A = 6378137.0
F = 1 / 298.257222101
E2 = F * (2 - F)
E = math.sqrt(E2)


def utm32_nach_wgs84(x, y):
    """Inverse Transversale Mercator (Snyder 1987, Gl. 8-12 ff.), Zone 32, Mittelmeridian 9 Grad."""
    k0, lon0 = 0.9996, math.radians(9)
    ep2 = E2 / (1 - E2)
    x -= 500000.0
    mu = y / k0 / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    p1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu)
          + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
          + (151 * e1 ** 3 / 96) * math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    s, c, t = math.sin(p1), math.cos(p1), math.tan(p1)
    c1, t1 = ep2 * c * c, t * t
    n1 = A / math.sqrt(1 - E2 * s * s)
    r1 = A * (1 - E2) / (1 - E2 * s * s) ** 1.5
    d = x / (n1 * k0)
    lat = p1 - (n1 * t / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24
                                + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6 / 720)
    lon = lon0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6
                  + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5 / 120) / c
    return math.degrees(lat), math.degrees(lon)


# Lambertsche flaechentreue Azimutalprojektion, EPSG:3035 (EPSG Guidance Note 7-2, Methode 9820)
LAEA_LAT0, LAEA_LON0, LAEA_FE, LAEA_FN = math.radians(52), math.radians(10), 4321000.0, 3210000.0


def _q(phi):
    s = math.sin(phi)
    return (1 - E2) * (s / (1 - E2 * s * s) - 1 / (2 * E) * math.log((1 - E * s) / (1 + E * s)))


_QP = _q(math.pi / 2)
_B0 = math.asin(_q(LAEA_LAT0) / _QP)
_RQ = A * math.sqrt(_QP / 2)
_D = A * (math.cos(LAEA_LAT0) / math.sqrt(1 - E2 * math.sin(LAEA_LAT0) ** 2)) / (_RQ * math.cos(_B0))


def wgs84_nach_laea(lat, lon):
    b = math.asin(_q(math.radians(lat)) / _QP)
    dl = math.radians(lon) - LAEA_LON0
    bb = _RQ * math.sqrt(2 / (1 + math.sin(_B0) * math.sin(b) + math.cos(_B0) * math.cos(b) * math.cos(dl)))
    return (LAEA_FE + bb * _D * math.cos(b) * math.sin(dl),
            LAEA_FN + bb / _D * (math.cos(_B0) * math.sin(b) - math.sin(_B0) * math.cos(b) * math.cos(dl)))


def laea_nach_wgs84(x, y):
    dx, dy = x - LAEA_FE, y - LAEA_FN
    rho = math.hypot(dx / _D, _D * dy)
    c = 2 * math.asin(rho / (2 * _RQ))
    b = math.asin(math.cos(c) * math.sin(_B0) + _D * dy * math.sin(c) * math.cos(_B0) / rho)
    lon = LAEA_LON0 + math.atan2(dx * math.sin(c), _D * rho * math.cos(_B0) * math.cos(c)
                                 - _D ** 2 * dy * math.sin(_B0) * math.sin(c))
    lat = (b + (E2 / 3 + 31 * E2 ** 2 / 180 + 517 * E2 ** 3 / 5040) * math.sin(2 * b)
           + (23 * E2 ** 2 / 360 + 251 * E2 ** 3 / 3780) * math.sin(4 * b)
           + (761 * E2 ** 3 / 45360) * math.sin(6 * b))
    return math.degrees(lat), math.degrees(lon)


# Pruefwert aus der EPSG Guidance Note 7-2: 50 N, 5 O -> E 3962799.45, N 2999718.85
_x, _y = wgs84_nach_laea(50, 5)
assert abs(_x - 3962799.45) < 0.05 and abs(_y - 2999718.85) < 0.05, (_x, _y)
_la, _lo = laea_nach_wgs84(_x, _y)
assert abs(_la - 50) < 1e-7 and abs(_lo - 5) < 1e-7, (_la, _lo)

# Ortsnahe Meter fuer Laengen, Naehe und Raster: x nach Osten, y nach Norden.
LAT0, LON0 = 48.7630, 11.4250
_p = math.radians(LAT0)
MY = 111132.92 - 559.82 * math.cos(2 * _p) + 1.175 * math.cos(4 * _p)
MX = 111412.84 * math.cos(_p) - 93.5 * math.cos(3 * _p)


def xy(lat, lon):
    return (lon - LON0) * MX, (lat - LAT0) * MY


def vereinfache(pts, tol):
    """Douglas-Peucker; liefert die Indizes der behaltenen Punkte."""
    if len(pts) < 3:
        return list(range(len(pts)))
    behalten = {0, len(pts) - 1}
    stapel = [(0, len(pts) - 1)]
    if pts[0] == pts[-1]:  # Ring: am weitesten entfernten Punkt teilen
        k = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
        behalten.add(k)
        stapel = [(0, k), (k, len(pts) - 1)]
    while stapel:
        a, b = stapel.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        lang = math.hypot(x2 - x1, y2 - y1)
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            d = (abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / lang) if lang > 1e-9 else math.hypot(x - x1, y - y1)
            if d > best:
                best, bi = d, i
        if bi >= 0 and best >= tol:
            behalten.add(bi)
            stapel += [(a, bi), (bi, b)]
    return sorted(behalten)


def im_polygon(x, y, ringe):
    """Gerade-ungerade-Regel ueber alle Ringe (Loecher zaehlen mit)."""
    drin = False
    for r in ringe:
        j = len(r) - 1
        for i in range(len(r)):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                drin = not drin
            j = i
    return drin


# ------------------------------------------------------------------- Bezirke

def bezirke_bauen():
    roh = json.load(open(datei('Stadtbezirke_Ingolstadt.geojson', BEZIRKE_URL, NEU), encoding='utf-8'))
    name = (roh.get('crs') or {}).get('properties', {}).get('name', '')
    if '25832' not in name:
        raise SystemExit('Bezirke: unerwartetes Koordinatensystem %r' % name)
    ausgabe, bezirke = [], []
    for f in sorted(roh['features'], key=lambda f: int(f['properties']['beznr'])):
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        ringe_xy, geo = [], []
        for poly in polys:
            neu = []
            for ring in poly:
                ll = [utm32_nach_wgs84(p[0], p[1]) for p in ring]
                ringe_xy.append([xy(la, lo) for la, lo in ll])
                idx = vereinfache([(p[0], p[1]) for p in ring], BEZIRK_VEREINFACHUNG_M)
                neu.append([[round(ll[i][1], 6), round(ll[i][0], 6)] for i in idx])
            geo.append(neu)
        p = f['properties']
        geometrie = {'type': 'Polygon', 'coordinates': geo[0]} if len(geo) == 1 else {'type': 'MultiPolygon', 'coordinates': geo}
        ausgabe.append({'type': 'Feature', 'properties': {'bezname': p['bezname'], 'beznr': p['beznr']}, 'geometry': geometrie})
        xs = [q[0] for r in ringe_xy for q in r]
        ys = [q[1] for r in ringe_xy for q in r]
        bezirke.append({'nr': int(p['beznr']), 'name': p['bezname'], 'ringe': ringe_xy,
                        'bbox': (min(xs), min(ys), max(xs), max(ys))})
    return {'type': 'FeatureCollection', 'erzeugt_von': 'scraper/wege_bauen.py', 'erzeugt_am': date.today().isoformat(),
            'quelle': 'Stadt Ingolstadt, Stadtbezirke (open.bydata), CC BY 3.0 DE; aus EPSG:25832 umgerechnet, auf etwa 5 m vereinfacht',
            'features': ausgabe}, bezirke


def bezirk_von(x, y, bezirke):
    for b in bezirke:
        x0, y0, x1, y1 = b['bbox']
        if x0 <= x <= x1 and y0 <= y <= y1 and im_polygon(x, y, b['ringe']):
            return b['nr']
    return 0


# -------------------------------------------------------------- Schattenraster

RASTER_M = 10.0


class Raster:
    def __init__(self, x0, y0, x1, y1):
        self.x0, self.y0 = x0, y0
        self.b = int((x1 - x0) / RASTER_M) + 1
        self.h = int((y1 - y0) / RASTER_M) + 1
        self.z = bytearray(self.b * self.h)

    def setze(self, x, y, r):
        cx, cy, n = int((x - self.x0) / RASTER_M), int((y - self.y0) / RASTER_M), int(r / RASTER_M) + 1
        for j in range(cy - n, cy + n + 1):
            for i in range(cx - n, cx + n + 1):
                if 0 <= i < self.b and 0 <= j < self.h and \
                        math.hypot((i + .5) * RASTER_M + self.x0 - x, (j + .5) * RASTER_M + self.y0 - y) <= r:
                    self.z[j * self.b + i] = 1

    def fuelle(self, segmente):
        """Scanline mit Gerade-ungerade-Regel; Multipolygon-Teile muessen nicht zusammengesetzt sein."""
        zeilen = collections.defaultdict(list)
        for (xa, ya), (xb, yb) in segmente:
            if ya == yb:
                continue
            ja = math.ceil((min(ya, yb) - self.y0) / RASTER_M - .5)
            jb = math.floor((max(ya, yb) - self.y0) / RASTER_M - .5)
            for j in range(max(ja, 0), min(jb, self.h - 1) + 1):
                yy = (j + .5) * RASTER_M + self.y0
                zeilen[j].append(xa + (xb - xa) * (yy - ya) / (yb - ya))
        for j, xs in zeilen.items():
            xs.sort()
            for k in range(0, len(xs) - 1, 2):
                i0 = max(math.ceil((xs[k] - self.x0) / RASTER_M - .5), 0)
                i1 = min(math.floor((xs[k + 1] - self.x0) / RASTER_M - .5), self.b - 1)
                for i in range(i0, i1 + 1):
                    self.z[j * self.b + i] = 1

    def wert(self, x, y):
        i, j = int((x - self.x0) / RASTER_M), int((y - self.y0) / RASTER_M)
        return self.z[j * self.b + i] if 0 <= i < self.b and 0 <= j < self.h else 0


def geometrie_teile(e):
    """Linienzuege eines Overpass-Elements (out geom) in Ortsmetern."""
    if e['type'] == 'way':
        return [[xy(p['lat'], p['lon']) for p in e.get('geometry', [])]]
    if e['type'] == 'relation':
        return [[xy(p['lat'], p['lon']) for p in m['geometry']]
                for m in e.get('members', []) if m.get('type') == 'way' and m.get('geometry')
                and m.get('role') in ('outer', 'inner', '')]
    return []


def schatten_raster(bbox):
    r = Raster(*bbox)
    for e in overpass('schatten')['elements']:
        t = e.get('tags', {})
        if e['type'] == 'node':
            if t.get('natural') == 'tree':
                r.setze(*xy(e['lat'], e['lon']), 10)
        elif t.get('natural') == 'tree_row':
            for (xa, ya), (xb, yb) in zip(geometrie_teile(e)[0], geometrie_teile(e)[0][1:]):
                n = max(1, int(math.hypot(xb - xa, yb - ya) / 5))
                for k in range(n + 1):
                    r.setze(xa + (xb - xa) * k / n, ya + (yb - ya) * k / n, 8)
        else:
            teile = [p for p in geometrie_teile(e) if len(p) > 1]
            if e['type'] == 'way' and teile and teile[0][0] != teile[0][-1]:
                continue
            r.fuelle([(a, b) for p in teile for a, b in zip(p, p[1:])])
    return r


# -------------------------------------------------------------------- Netz

CODES = {
    'klasse': ['fussweg', 'gehweg', 'querung', 'fussgaengerzone', 'pfad', 'feldweg', 'treppe', 'radweg',
               'wohnstrasse', 'erschliessung', 'anlieger', 'sammelstrasse', 'hauptstrasse'],
    'lit': ['unbekannt', 'ja', 'nein'],
    'treppe': ['nein', 'ja'],
    'oberflaeche': ['unbekannt', 'befestigt', 'pflaster_grob', 'wassergebunden', 'unbefestigt'],
    'gehweg': ['unbekannt', 'ja', 'nein', 'separat'],
    'querung': ['keine', 'ampel', 'zebrastreifen', 'insel', 'ungesichert', 'unbekannt'],
    'schatten': ['nein', 'ja'],
    'gesperrt': ['nein', 'ja'],
    'rollstuhl': ['unbekannt', 'ja', 'nein'],
    'benannt': ['nein', 'ja'],
    'bauwerk': ['keins', 'bruecke', 'tunnel'],
    'bordstein': ['unbekannt', 'abgesenkt', 'hoch'],
    'barriere': ['nein', 'ja'],
}
KANTEN_FELDER = ['klasse', 'lit', 'treppe', 'oberflaeche', 'gehweg', 'querung', 'schatten', 'gesperrt',
                 'rollstuhl', 'benannt', 'bauwerk']
KNOTEN_FELDER = ['querung', 'bordstein', 'barriere']
OBERFLAECHE = {}
for _w in ('asphalt', 'concrete', 'concrete:plates', 'concrete:lanes', 'paving_stones', 'paving_stones:lanes',
           'paved', 'metal', 'wood', 'rubber', 'tartan', 'bricks', 'chipseal'):
    OBERFLAECHE[_w] = 1
for _w in ('sett', 'cobblestone', 'unhewn_cobblestone', 'cobblestone:flattened', 'grass_paver', 'stepping_stones'):
    OBERFLAECHE[_w] = 2
for _w in ('compacted', 'fine_gravel'):
    OBERFLAECHE[_w] = 3
for _w in ('gravel', 'pebblestone', 'unpaved', 'dirt', 'earth', 'ground', 'grass', 'sand', 'mud', 'woodchips', 'rock'):
    OBERFLAECHE[_w] = 4
FUSS_OK = ('yes', 'designated', 'permissive', 'destination')


def code(feld, wert):
    return CODES[feld].index(wert)


def querung(t):
    c = t.get('crossing', '')
    if c == 'traffic_signals' or t.get('highway') == 'traffic_signals' or t.get('crossing:signals') == 'yes':
        return 1
    if c in ('zebra', 'marked', 'uncontrolled') or t.get('crossing_ref') == 'zebra' \
            or t.get('crossing:markings', 'no') not in ('no', ''):
        return 2
    if c in ('unmarked', 'informal', 'no'):
        return 3 if t.get('crossing:island') == 'yes' else 4
    if t.get('highway') == 'crossing' or t.get('footway') == 'crossing' or c:
        return 5
    return 0


def lit(t):
    v = t.get('lit')
    return 0 if v is None else (2 if v in ('no', 'disused') else 1)


def gehweg(t):
    seiten = [t.get(k, '') for k in ('sidewalk', 'sidewalk:both', 'sidewalk:left', 'sidewalk:right')]
    if any(s in ('both', 'left', 'right', 'yes') for s in seiten):
        return 1
    if 'separate' in seiten:
        return 3
    if any(s in ('no', 'none') for s in seiten):
        return 2
    return 0


def kanten_merkmale(t):
    """Merkmale eines OSM-Wegs, ohne Schatten. None = nicht begehbar oder privat."""
    hw = t['highway']
    fuss, zugang = t.get('foot', ''), t.get('access', '')
    if fuss == 'private' or (zugang == 'private' and fuss not in FUSS_OK):
        return None
    if t.get('area') == 'yes' and hw not in ('pedestrian', 'footway'):
        return None
    klasse = KLASSE[hw]
    if hw == 'footway' and t.get('footway') == 'sidewalk':
        klasse = 'gehweg'
    if t.get('footway') == 'crossing' or (hw in ('path', 'cycleway', 'footway') and 'crossing' in t):
        klasse = 'querung'
    gesperrt = 1 if fuss == 'no' or (zugang == 'no' and fuss not in FUSS_OK) else 0
    rs = t.get('wheelchair')
    tunnel = t.get('tunnel', 'no')
    return [code('klasse', klasse), lit(t), 1 if hw == 'steps' else 0, OBERFLAECHE.get(t.get('surface'), 0),
            gehweg(t) if KLASSE[hw] in ('wohnstrasse', 'erschliessung', 'anlieger', 'sammelstrasse', 'hauptstrasse') else 0,
            querung(t) if klasse == 'querung' else 0, 0, gesperrt,
            0 if rs is None else (2 if rs == 'no' else 1), 1 if t.get('name') else 0,
            1 if t.get('bridge', 'no') != 'no' else (2 if tunnel not in ('no', 'building_passage') else 0)]


def knoten_merkmale(t):
    k = t.get('kerb') or (t.get('barrier') == 'kerb' and 'raised') or ''
    bordstein = 1 if k in ('lowered', 'flush', 'no', 'rolled') else (2 if k == 'raised' else 0)
    barriere = 1 if t.get('barrier') in ('cycle_barrier', 'stile', 'turnstile', 'kissing_gate', 'full-height_turnstile') \
        or t.get('wheelchair') == 'no' else 0
    return (querung(t), bordstein, barriere)


def netz_bauen():
    roh = overpass('netz')['elements']
    knoten = {e['id']: e for e in roh if e['type'] == 'node'}
    wege = [e for e in roh if e['type'] == 'way']
    pos = {i: xy(n['lat'], n['lon']) for i, n in knoten.items()}
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    schatten = schatten_raster((min(xs) - 50, min(ys) - 50, max(xs) + 50, max(ys) + 50))

    # 1. Einzelsegmente zwischen OSM-Knoten mit Merkmalen
    segment = {}   # (a, b) mit a < b -> [merkmale-tupel, laenge]
    for w in wege:
        m = kanten_merkmale(w.get('tags', {}))
        if m is None:
            continue
        nds = [n for n in w['nodes'] if n in pos]
        for a, b in zip(nds, nds[1:]):
            if a == b:
                continue
            (xa, ya), (xb, yb) = pos[a], pos[b]
            lang = math.hypot(xb - xa, yb - ya)
            n = max(1, int(lang / 10))
            treffer = sum(schatten.wert(xa + (xb - xa) * (k + .5) / n, ya + (yb - ya) * (k + .5) / n) for k in range(n))
            mm = list(m)
            mm[6] = 1 if treffer * 2 >= n else 0
            schluessel = (min(a, b), max(a, b))
            if schluessel not in segment:
                segment[schluessel] = (tuple(mm), lang)

    nachbarn = collections.defaultdict(list)
    for (a, b) in segment:
        nachbarn[a].append(b)
        nachbarn[b].append(a)
    km = {i: knoten_merkmale(knoten[i].get('tags', {})) for i in nachbarn}

    def seg(a, b):
        return segment[(min(a, b), max(a, b))]

    def fest(i):
        nb = nachbarn[i]
        return len(nb) != 2 or nb[0] == nb[1] or km[i] != (0, 0, 0) or seg(i, nb[0])[0] != seg(i, nb[1])[0]

    # 2. Ketten zwischen festen Knoten verdichten
    kanten, besucht, behalten = [], set(), set()

    def kette(start, erster):
        zug, i, vor = [start, erster], erster, start
        while not fest(i) and i != start:
            nb = nachbarn[i]
            i, vor = (nb[1] if nb[0] == vor else nb[0]), i
            zug.append(i)
        return zug

    def verdichte(zug):
        for a, b in zip(zug, zug[1:]):
            besucht.add((min(a, b), max(a, b)))
        merkmal = seg(zug[0], zug[1])[0]
        idx = vereinfache([pos[i] for i in zug], VEREINFACHUNG_M)
        for i0, i1 in zip(idx, idx[1:]):
            lang = sum(seg(zug[k], zug[k + 1])[1] for k in range(i0, i1))
            kanten.append((zug[i0], zug[i1], lang, merkmal))
            behalten.update((zug[i0], zug[i1]))

    for i in list(nachbarn):
        if fest(i):
            for j in nachbarn[i]:
                if (min(i, j), max(i, j)) not in besucht:
                    verdichte(kette(i, j))
    for (a, b) in list(segment):           # reine Ringe ohne festen Knoten
        if (a, b) not in besucht:
            verdichte(kette(a, b))

    # 3. Doppelte Kanten: kuerzere behalten
    einzig = {}
    for a, b, lang, m in kanten:
        k = (min(a, b), max(a, b), m)
        if a != b and (k not in einzig or lang < einzig[k]):
            einzig[k] = lang

    # 4. Nur die groesste zusammenhaengende Komponente bleibt
    eltern = {i: i for i in behalten}

    def wurzel(i):
        while eltern[i] != i:
            eltern[i] = eltern[eltern[i]]
            i = eltern[i]
        return i
    for a, b, _ in einzig:
        eltern[wurzel(a)] = wurzel(b)
    groesse = collections.Counter(wurzel(i) for i in behalten)
    haupt = groesse.most_common(1)[0][0]
    rest = sorted(groesse.values(), reverse=True)[1:]
    print('Netz: %d OSM-Wege, %d Segmente, %d Komponenten; verworfen %d kleine mit zusammen %d Knoten (groesste davon %s)'
          % (len(wege), len(segment), len(groesse), len(rest), sum(rest), rest[:3]))
    behalten = {i for i in behalten if wurzel(i) == haupt}
    einzig = {k: v for k, v in einzig.items() if k[0] in behalten}

    # 5. Nummerierung in Tiefensuche-Reihenfolge: Nachbarn bekommen nahe Nummern,
    #    das haelt die Differenzen in der Datei klein.
    adj = collections.defaultdict(list)
    for a, b, _ in einzig:
        adj[a].append(b)
        adj[b].append(a)
    nummer, reihe = {}, []
    for s in sorted(behalten, key=lambda i: (round(pos[i][1] / 500), pos[i][0])):
        if s in nummer:
            continue
        stapel = [s]
        while stapel:
            i = stapel.pop()
            if i in nummer:
                continue
            nummer[i] = len(reihe)
            reihe.append(i)
            stapel.extend(sorted((j for j in adj[i] if j not in nummer), key=lambda j: -math.hypot(
                pos[j][0] - pos[i][0], pos[j][1] - pos[i][1])))

    kanten = sorted((min(nummer[a], nummer[b]), max(nummer[a], nummer[b]), lang, m) for (a, b, m), lang in einzig.items())
    return {'knoten': [(knoten[i]['lat'], knoten[i]['lon']) for i in reihe],
            'xy': [pos[i] for i in reihe],
            'merkmale': [km[i] for i in reihe],
            'kanten': kanten, 'osm_wege': len(wege)}


def netz_ausgabe(netz):
    lat = [round(a * 1e5) for a, _ in netz['knoten']]
    lon = [round(o * 1e5) for _, o in netz['knoten']]
    kt = collections.Counter(m for *_, m in netz['kanten'])
    kanten_typen = [list(m) for m, _ in kt.most_common()]
    typ_nr = {tuple(m): i for i, m in enumerate(kanten_typen)}
    knt = collections.Counter(m for m in netz['merkmale'] if m != (0, 0, 0))
    knoten_typen = [[0, 0, 0]] + [list(m) for m, _ in knt.most_common()]
    knoten_nr = {tuple(m): i for i, m in enumerate(knoten_typen)}
    sparse, vor = [], 0
    for i, m in enumerate(netz['merkmale']):
        if m != (0, 0, 0):
            sparse += [i - vor, knoten_nr[m]]
            vor = i
    von, vor = [], 0
    for a, *_ in netz['kanten']:
        von.append(a - vor)
        vor = a
    return {
        'erzeugt_von': 'scraper/wege_bauen.py', 'erzeugt_am': date.today().isoformat(),
        'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0 (openstreetmap.org/copyright)',
        'format': ('lat/lon: 1e-5 Grad, erster Wert absolut, danach Differenz zum Vorgaenger. '
                   'von: Differenz zur vorigen Kante (Kanten nach von sortiert), nach: nach minus von (von < nach). '
                   'laenge: echte Weglaenge in m (auch ueber weggelassene Zwischenpunkte). '
                   'typ: Index in kanten_typen, Felder siehe kanten_felder, Werte siehe codes. '
                   'Kanten sind in beide Richtungen begehbar. knoten_merkmale: Paare (Knoten minus voriger '
                   'Knoten, Index in knoten_typen), nur fuer Knoten mit Querung, Bordstein oder Barriere. '
                   'Ampeln an Strassenkreuzungen zaehlen als Querung „ampel“. gesperrt = foot=no oder access=no: '
                   'im Netz markiert, fuer Fussgaenger nicht nutzbar.'),
        'knoten_anzahl': len(lat), 'kanten_anzahl': len(netz['kanten']),
        'lat': [lat[0]] + [b - a for a, b in zip(lat, lat[1:])],
        'lon': [lon[0]] + [b - a for a, b in zip(lon, lon[1:])],
        'von': von, 'nach': [b - a for a, b, *_ in netz['kanten']],
        'laenge': [round(l) for _, _, l, _ in netz['kanten']],
        'typ': [typ_nr[m] for *_, m in netz['kanten']],
        'kanten_felder': KANTEN_FELDER, 'kanten_typen': kanten_typen,
        'knoten_felder': KNOTEN_FELDER, 'knoten_typen': knoten_typen, 'knoten_merkmale': sparse,
        'codes': CODES,
    }


# ------------------------------------------------------------- Einrasten

class Kantenraster:
    """Naechste begehbare Kante zu einem Punkt (Gitter mit 50 m Maschen)."""
    M = 50.0

    def __init__(self, netz):
        self.netz, self.zellen = netz, collections.defaultdict(list)
        for k, (a, b, _, m) in enumerate(netz['kanten']):
            if m[7]:   # gesperrt
                continue
            (xa, ya), (xb, yb) = netz['xy'][a], netz['xy'][b]
            for i in range(int(math.floor(min(xa, xb) / self.M)), int(math.floor(max(xa, xb) / self.M)) + 1):
                for j in range(int(math.floor(min(ya, yb) / self.M)), int(math.floor(max(ya, yb) / self.M)) + 1):
                    self.zellen[(i, j)].append(k)

    def naechste(self, x, y, maxd):
        ci, cj = int(math.floor(x / self.M)), int(math.floor(y / self.M))
        best = (maxd, None, 0.0)
        for r in range(int(maxd / self.M) + 2):
            if best[1] is not None and best[0] < (r - 1) * self.M:
                break
            for i in range(ci - r, ci + r + 1):
                for j in range(cj - r, cj + r + 1):
                    if max(abs(i - ci), abs(j - cj)) != r:
                        continue
                    for k in self.zellen.get((i, j), ()):
                        a, b = self.netz['kanten'][k][:2]
                        (xa, ya), (xb, yb) = self.netz['xy'][a], self.netz['xy'][b]
                        dx, dy = xb - xa, yb - ya
                        q = dx * dx + dy * dy
                        t = 0.0 if q == 0 else max(0.0, min(1.0, ((x - xa) * dx + (y - ya) * dy) / q))
                        d = math.hypot(xa + t * dx - x, ya + t * dy - y)
                        if d < best[0]:
                            best = (d, k, t)
        return best

    def einstieg(self, x, y, maxd):
        """{knoten: Meter bis dorthin} ueber die naechste Kante, oder {}."""
        d, k, t = self.naechste(x, y, maxd)
        if k is None:
            return {}
        a, b, lang, _ = self.netz['kanten'][k]
        return {a: d + t * lang, b: d + (1 - t) * lang}


# --------------------------------------------------------------------- Orte

KATEGORIEN = [  # id, Bezeichnung
    ('supermarkt', 'Supermarkt'), ('apotheke', 'Apotheke'), ('hausarzt', 'Hausarzt'),
    ('grundschule', 'Grundschule'), ('spielplatz', 'Spielplatz'), ('haltestelle', 'Haltestelle'),
    ('kita', 'Kita'), ('baecker', 'Bäckerei'), ('eis', 'Eisdiele'), ('facharzt', 'Facharzt'),
    ('krankenhaus', 'Krankenhaus'), ('schule', 'Weiterführende Schule'), ('bolzplatz', 'Bolzplatz'),
    ('sportanlage', 'Sportanlage'), ('park', 'Park'), ('bahnhof', 'Bahnhof'), ('buecherei', 'Bücherei'),
    ('bank_post', 'Bank/Post'), ('kirche', 'Kirche/Gebetshaus'), ('toilette', 'Toilette'), ('cafe', 'Café'),
    ('hotel', 'Hotel'), ('touristinfo', 'Tourist-Info'), ('sehenswuerdigkeit', 'Sehenswürdigkeit'),
    ('trinkwasser', 'Trinkwasser'), ('sitzbank', 'Sitzbank'),
]
KAT_NR = {k: i for i, (k, _) in enumerate(KATEGORIEN)}
OHNE_MINUTEN = {'sitzbank'}   # Merkmal fuer Personen (Baenke), kein Ziel


def ist_hausarzt(t):
    text = (t.get('healthcare:speciality', '') + ' ' + t.get('name', '') + ' ' + t.get('description', '')).lower()
    if any(w in text for w in ('general', 'family', 'allgemein', 'hausarzt', 'hausärzt', 'praktische')):
        return True
    if any(w in text for w in FACHRICHTUNG):
        return False
    # Ohne Fachrichtung zaehlt eine Praxis als Hausarzt: In Ingolstadt ist sie meist nicht getaggt.
    return not t.get('healthcare:speciality')


FACHRICHTUNG = ('haut', 'derma', 'augen', 'hno', 'hals-nasen', 'ortho', 'gynäk', 'frauen', 'kinder', 'jugend',
                'radiolog', 'urolog', 'neurolog', 'psych', 'kardio', 'chirurg', 'onkolog', 'nephro', 'gastro',
                'pneumo', 'lungen', 'rheuma', 'anästh', 'nuklear', 'patholog', 'labor', 'zahn', 'kiefer', 'mvz',
                'klinik', 'sanversz')


def ist_grundschule(t):
    n = t.get('name', '').lower()
    return (t.get('school') == 'primary' or '1' in t.get('isced:level', '').replace(',', ';').split(';')
            or any(w in n for w in ('grundschule', 'grund- und ', 'volksschule')))


def kategorien(t):
    if t.get('access') in ('private', 'no'):
        return []
    a, s, l, tour = t.get('amenity'), t.get('shop'), t.get('leisure'), t.get('tourism')
    k = []
    if s == 'supermarket':
        k.append('supermarkt')
    if s in ('bakery', 'pastry'):
        k.append('baecker')
    if a == 'ice_cream' or s == 'ice_cream':
        k.append('eis')
    if a == 'pharmacy' or t.get('healthcare') == 'pharmacy':
        k.append('apotheke')
    if a == 'doctors' or t.get('healthcare') == 'doctor':
        k.append('hausarzt' if ist_hausarzt(t) else 'facharzt')
    if a == 'hospital':
        k.append('krankenhaus')
    if a == 'school':
        k.append('grundschule' if ist_grundschule(t) else 'schule')
    if a in ('kindergarten', 'childcare'):
        k.append('kita')
    if l == 'playground':
        k.append('spielplatz')
    if l == 'pitch' and 'soccer' in t.get('sport', ''):
        k.append('bolzplatz')
    if l in ('sports_centre', 'stadium'):
        k.append('sportanlage')
    if l == 'park':
        k.append('park')
    if t.get('public_transport') == 'platform' or t.get('highway') == 'bus_stop':
        k.append('haltestelle')
    if t.get('railway') in ('station', 'halt') and t.get('usage') != 'industrial':
        k.append('bahnhof')
    if a == 'library':
        k.append('buecherei')
    if a in ('bank', 'post_office') or t.get('post_office') == 'post_partner':
        k.append('bank_post')
    if a == 'place_of_worship':
        k.append('kirche')
    if a == 'toilets':
        k.append('toilette')
    if a == 'cafe':
        k.append('cafe')
    if tour in ('hotel', 'hostel', 'guest_house'):
        k.append('hotel')
    if tour == 'information' and t.get('information') == 'office':
        k.append('touristinfo')
    if tour in ('attraction', 'museum', 'viewpoint'):
        k.append('sehenswuerdigkeit')
    if a == 'drinking_water':
        k.append('trinkwasser')
    if a == 'bench':
        k.append('sitzbank')
    return k


def orte_bauen(raster):
    orte, ohne = [], collections.Counter()
    for e in overpass('orte')['elements']:
        t = e.get('tags', {})
        kats = kategorien(t)
        if not kats:
            continue
        if e['type'] == 'node':
            punkte = [xy(e['lat'], e['lon'])]
            einstieg = raster.einstieg(punkte[0][0], punkte[0][1], 300)
            flaeche = False
        else:
            teile = [p for p in geometrie_teile(e) if p]
            punkte = [q for p in teile for q in p]
            if not punkte:
                continue
            # Flaechen ueber den Rand anbinden: alle 20 m ein Punkt, jeder sucht die naechste Kante.
            einstieg = {}
            for p in teile:
                for (xa, ya), (xb, yb) in zip(p, p[1:] or p):
                    n = max(1, int(math.hypot(xb - xa, yb - ya) / 20))
                    for k in range(n):
                        for kn, d in raster.einstieg(xa + (xb - xa) * k / n, ya + (yb - ya) * k / n, 30).items():
                            einstieg[kn] = min(d, einstieg.get(kn, 1e9))
            if not einstieg:   # Rand liegt abseits: naechste Kante zum naechsten Randpunkt
                best = min((raster.naechste(x, y, 300)[0], x, y) for x, y in punkte[::max(1, len(punkte) // 40)])
                einstieg = raster.einstieg(best[1], best[2], 300)
            flaeche = len(punkte) > 2
        if not einstieg:
            ohne.update(kats)
            continue
        mx = sum(p[0] for p in punkte) / len(punkte)
        my = sum(p[1] for p in punkte) / len(punkte)
        rs = t.get('wheelchair')
        merkmale = (1 if flaeche else 0) | (2 if t.get('opening_hours') else 0) \
            | (4 if rs in ('yes', 'limited', 'designated') else 0) | (8 if rs == 'no' else 0)
        # Viele Einstiege einer grossen Flaeche: die naechsten 40 reichen.
        knoten = sorted(einstieg.items(), key=lambda kv: kv[1])[:40]
        for kat in kats:
            orte.append({'kat': KAT_NR[kat], 'name': t.get('name', ''), 'lat': round(LAT0 + my / MY, 5),
                         'lon': round(LON0 + mx / MX, 5), 'merkmale': merkmale,
                         'knoten': [kn for kn, _ in knoten], 'abstand': [round(d) for _, d in knoten],
                         'oeffnungszeiten': t.get('opening_hours', '')})
    orte.sort(key=lambda o: (o['kat'], o['lat'], o['lon']))
    if ohne:
        print('Orte ohne Weg in 300 m (ausgelassen):', dict(ohne))
    return orte


def orte_ausgabe(orte):
    anzahl = collections.Counter(o['kat'] for o in orte)
    return {
        'erzeugt_von': 'scraper/wege_bauen.py', 'erzeugt_am': date.today().isoformat(),
        'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0 (openstreetmap.org/copyright)',
        'format': ('orte: [kategorie, name, lat, lon, merkmale, knoten, abstand, oeffnungszeiten]. '
                   'merkmale: Bits 1 Flaeche, 2 Oeffnungszeiten bekannt, 4 rollstuhlgerecht, 8 nicht rollstuhlgerecht. '
                   'knoten: Einstiegsknoten in WEGE_NETZ (Flaechen ueber ihren Rand angebunden), '
                   'abstand: Meter vom Ort bis zum jeweiligen Knoten. lat/lon: Punkt bzw. Mitte der Flaeche. '
                   'Praxen ohne Fachrichtung in OSM zaehlen als Hausarzt.'),
        'kategorien': [{'id': k, 'name': n, 'anzahl': anzahl[i]} for i, (k, n) in enumerate(KATEGORIEN)],
        'orte': [[o['kat'], o['name'], o['lat'], o['lon'], o['merkmale'], o['knoten'], o['abstand'], o['oeffnungszeiten']]
                 for o in orte],
    }


# ------------------------------------------------------------------- Zensus

def zensus_lesen(bezirke):
    """Bewohnte 100-m-Zellen, deren Mittelpunkt im Stadtgebiet liegt."""
    xs = [b['bbox'][0] for b in bezirke] + [b['bbox'][2] for b in bezirke]
    ys = [b['bbox'][1] for b in bezirke] + [b['bbox'][3] for b in bezirke]
    ecken = [wgs84_nach_laea(LAT0 + y / MY, LON0 + x / MX) for x in (min(xs), max(xs)) for y in (min(ys), max(ys))]
    ex0, ex1 = min(e[0] for e in ecken) - 200, max(e[0] for e in ecken) + 200
    ey0, ey1 = min(e[1] for e in ecken) - 200, max(e[1] for e in ecken) + 200
    werte = {}
    for kurz, (zipname, spalte) in ZENSUS.items():
        pfad = datei(zipname, ZENSUS_URL + zipname)
        with zipfile.ZipFile(pfad) as z:
            name = [n for n in z.namelist() if n.endswith('100m-Gitter.csv')][0]
            with io.TextIOWrapper(z.open(name), encoding='utf-8-sig') as f:
                kopf = f.readline().strip().split(';')
                ix, iy, iw = kopf.index('x_mp_100m'), kopf.index('y_mp_100m'), kopf.index(spalte)
                for zeile in f:
                    t = zeile.split(';')
                    x, y = int(t[ix]), int(t[iy])
                    if ex0 <= x <= ex1 and ey0 <= y <= ey1:
                        try:
                            v = float(t[iw].replace(',', '.'))
                        except ValueError:
                            continue   # „–“: kein Wert oder geheim
                        werte.setdefault((x, y), {})[kurz] = v
    zellen = []
    for (x, y), w in sorted(werte.items(), key=lambda kv: (-kv[0][1], kv[0][0])):
        if w.get('einwohner', 0) <= 0:
            continue
        la, lo = laea_nach_wgs84(x, y)
        px, py = xy(la, lo)
        nr = bezirk_von(px, py, bezirke)
        if nr:
            zellen.append({'x': x, 'y': y, 'lat': la, 'lon': lo, 'px': px, 'py': py, 'bezirk': nr,
                           'einwohner': int(w['einwohner']),
                           'u18': round(w['u18']) if 'u18' in w else UNERREICHBAR,
                           'ue65': round(w['ue65']) if 'ue65' in w else UNERREICHBAR})
    return zellen


# ----------------------------------------------------------------- Wegsuche

def zwei_naechste(quellen, adj, strafe, anzahl):
    """Dijkstra von allen Orten zugleich; je Knoten die zwei naechsten verschiedenen Orte."""
    marke = [None] * anzahl
    heap = list(quellen)
    heapq.heapify(heap)
    while heap:
        t, k, o = heapq.heappop(heap)
        m = marke[k]
        if m is None:
            marke[k] = [(t, o)]
        elif len(m) == 1 and m[0][1] != o:
            m.append((t, o))
        else:
            continue
        for n, dt in adj[k]:
            tn = t + dt + strafe[n]
            if tn > GRENZE_S:
                continue
            mn = marke[n]
            if mn is not None and (len(mn) == 2 or mn[0][1] == o):
                continue
            heapq.heappush(heap, (tn, n, o))
    return marke


def minuten(t):
    return UNERREICHBAR if t is None or t > GRENZE_S else math.ceil(t / 60 - 1e-9)


def zellen_rechnen(netz, raster, orte, zellen):
    anzahl = len(netz['knoten'])
    adj = [[] for _ in range(anzahl)]
    for a, b, lang, m in netz['kanten']:
        if not m[7]:
            adj[a].append((b, lang / TEMPO))
            adj[b].append((a, lang / TEMPO))
    strafe = [AMPEL_S if m[0] == 1 else 0 for m in netz['merkmale']]
    einstieg = [raster.einstieg(z['px'], z['py'], 300) for z in zellen]
    print('Zellen ohne Weg in 300 m:', sum(1 for e in einstieg if not e))
    ergebnis = {}
    for kat, _ in KATEGORIEN:
        if kat in OHNE_MINUTEN:
            continue
        nr = KAT_NR[kat]
        quellen = [(d / TEMPO, kn, oi) for oi, o in enumerate(orte) if o['kat'] == nr
                   for kn, d in zip(o['knoten'], o['abstand'])]
        marke = zwei_naechste(quellen, adj, strafe, anzahl)
        n1, n2, o1, o2 = bytearray(), bytearray(), [], []
        for e in einstieg:
            best = {}
            for kn, d in e.items():
                for t, o in marke[kn] or ():
                    t += d / TEMPO
                    if t < best.get(o, 1e18):
                        best[o] = t
            rang = sorted((t, o) for o, t in best.items() if t <= GRENZE_S)[:2] + [(None, KEIN_ORT)] * 2
            n1.append(minuten(rang[0][0]))
            n2.append(minuten(rang[1][0]))
            o1.append(rang[0][1])
            o2.append(rang[1][1])
        b64 = lambda b: base64.b64encode(bytes(b)).decode('ascii')
        u16 = lambda liste: b64(b''.join(v.to_bytes(2, 'little') for v in liste))
        ergebnis[kat] = {'n1': b64(n1), 'n2': b64(n2), 'ort1': u16(o1), 'ort2': u16(o2), '_n1': list(n1)}
    return ergebnis


def zellen_ausgabe(zellen, ergebnis):
    # Ecken einer Zelle als Versatz zum Mittelpunkt (in der Stadtmitte gerechnet; im Stadtgebiet
    # weicht das um weniger als 0,1 m ab). Die Zellen sind gegen Norden um gut 1 Grad gedreht.
    mx, my = wgs84_nach_laea(LAT0, LON0)
    mx, my = round(mx, -2) + 50, round(my, -2) + 50
    la0, lo0 = laea_nach_wgs84(mx, my)
    ecken = []
    for dx, dy in ((-50, -50), (50, -50), (50, 50), (-50, 50)):
        la, lo = laea_nach_wgs84(mx + dx, my + dy)
        ecken.append([round(la - la0, 7), round(lo - lo0, 7)])
    return {
        'erzeugt_von': 'scraper/wege_bauen.py', 'erzeugt_am': date.today().isoformat(),
        'quelle': ('Zensus 2022, Gitterdaten 100 m: Statistische Ämter des Bundes und der Länder (destatis.de); '
                   'Wege und Orte © OpenStreetMap-Mitwirkende, ODbL 1.0'),
        'format': ('Je Zelle ein Eintrag in jedem Feld. laea_x/laea_y: Mittelpunkt in EPSG:3035 geteilt durch 100 '
                   '(ganzzahlig abgerundet), lat/lon: Mittelpunkt WGS84, ecken: [dlat, dlon] der vier Ecken. '
                   'u18/ue65: Anteil in Prozent, 255 = kein Wert (geheim gehalten). bezirk: beznr. '
                   'minuten[person][kategorie]: n1/n2 Base64 Uint8, Gehminuten (aufgerundet) zum naechsten bzw. '
                   'zweitnaechsten Ort, 255 = nicht in 60 Minuten. ort1/ort2: Base64 Uint16 little-endian, Index in '
                   'WEGE_ORTE.orte, 65535 = keiner. Weg von der Zellmitte zur naechsten Kante zaehlt mit.'),
        'personen': {'erwachsene': {'tempo_kmh': round(TEMPO * 3.6, 1), 'ampel_s': AMPEL_S}},
        'anzahl': len(zellen), 'ecken': ecken,
        'laea_x': [z['x'] // 100 for z in zellen], 'laea_y': [z['y'] // 100 for z in zellen],
        'lat': [round(z['lat'], 5) for z in zellen], 'lon': [round(z['lon'], 5) for z in zellen],
        'einwohner': [z['einwohner'] for z in zellen], 'u18': [z['u18'] for z in zellen],
        'ue65': [z['ue65'] for z in zellen], 'bezirk': [z['bezirk'] for z in zellen],
        'minuten': {'erwachsene': {k: {f: v for f, v in e.items() if not f.startswith('_')} for k, e in ergebnis.items()}},
    }


# ------------------------------------------------------------------ Ausgabe

def schreibe(name, variable, daten, kommentar):
    text = json.dumps(daten, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(DATEN, name + '.json'), 'w', encoding='utf-8') as f:
        f.write(text + '\n')
    pfad = os.path.join(DATEN, name + '.js')
    with open(pfad, 'w', encoding='utf-8') as f:
        f.write('/* %s */\nwindow.%s = %s;\n' % (kommentar, variable, text))
    return os.path.getsize(pfad)


def main():
    t0 = time.time()
    bez_geo, bezirke = bezirke_bauen()
    netz = netz_bauen()
    raster = Kantenraster(netz)
    orte = orte_bauen(raster)
    zellen = zensus_lesen(bezirke)
    ergebnis = zellen_rechnen(netz, raster, orte, zellen)

    drin = sum(1 for x, y in netz['xy'][::20] if bezirk_von(x, y, bezirke))
    print('Kontrolle Projektion: %d %% der Netzknoten liegen in einem Stadtbezirk' % round(100 * drin / len(netz['xy'][::20])))

    groessen = {
        'wege-netz.js': schreibe('wege-netz', 'WEGE_NETZ', netz_ausgabe(netz),
                                 'Fusswegenetz Ingolstadt, © OpenStreetMap-Mitwirkende, ODbL 1.0; erzeugt von scraper/wege_bauen.py'),
        'wege-orte.js': schreibe('wege-orte', 'WEGE_ORTE', orte_ausgabe(orte),
                                 'Alltagsorte Ingolstadt, © OpenStreetMap-Mitwirkende, ODbL 1.0; erzeugt von scraper/wege_bauen.py'),
        'wege-zellen.js': schreibe('wege-zellen', 'WEGE_ZELLEN', zellen_ausgabe(zellen, ergebnis),
                                   'Zensus 2022 (Statistische Ämter des Bundes und der Länder) mit Gehminuten; erzeugt von scraper/wege_bauen.py'),
        'bezirke.js': schreibe('bezirke', 'BEZIRKE', bez_geo,
                               'Stadtbezirke Ingolstadt, Stadt Ingolstadt, CC BY 3.0 DE; erzeugt von scraper/wege_bauen.py'),
    }

    kanten_gesperrt = sum(1 for k in netz['kanten'] if k[3][7])
    print('\nKnoten %d · Kanten %d (davon gesperrt %d) · aus %d OSM-Wegen'
          % (len(netz['knoten']), len(netz['kanten']), kanten_gesperrt, netz['osm_wege']))
    zaehl = collections.Counter(o['kat'] for o in orte)
    print('Orte:', ' · '.join('%s %d' % (n, zaehl[KAT_NR[k]]) for k, n in KATEGORIEN))
    print('Zellen %d · Einwohner %d' % (len(zellen), sum(z['einwohner'] for z in zellen)))

    spalten = ['supermarkt', 'apotheke', 'hausarzt', 'grundschule', 'spielplatz', 'haltestelle']
    print('\nAnteil der Einwohner, die den naechsten Ort in 15 Minuten zu Fuss erreichen (Person: Erwachsene)\n')
    print('%-3s %-26s %8s ' % ('Nr', 'Bezirk', 'Einw.') + ' '.join('%11s' % s[:11] for s in spalten))
    for b in bezirke:
        idx = [i for i, z in enumerate(zellen) if z['bezirk'] == b['nr']]
        ew = sum(zellen[i]['einwohner'] for i in idx) or 1
        anteile = [100 * sum(zellen[i]['einwohner'] for i in idx if ergebnis[s]['_n1'][i] <= 15) / ew for s in spalten]
        print('%02d  %-26s %8d ' % (b['nr'], b['name'], ew) + ' '.join('%10.0f%%' % a for a in anteile))
    ew = sum(z['einwohner'] for z in zellen)
    print('    %-26s %8d ' % ('Stadt', ew) + ' '.join(
        '%10.0f%%' % (100 * sum(z['einwohner'] for i, z in enumerate(zellen) if ergebnis[s]['_n1'][i] <= 15) / ew)
        for s in spalten))
    print()
    for name, g in groessen.items():
        print('%-15s %7d KB' % (name, round(g / 1024)))
    if groessen['wege-netz.js'] > 2 * 1024 * 1024:
        print('WARNUNG: wege-netz.js ist groesser als 2 MB')
    print('fertig in %d s' % (time.time() - t0))


if __name__ == '__main__':
    main()
