#!/usr/bin/env python3
"""
Baut die Altstadt-Karte fuer den CO2-Wuerfel (grafik/klima.js) aus OpenStreetMap.

    python3 scraper/altstadt_bauen.py          # Abfragen aus dem Cache, wenn vorhanden
    python3 scraper/altstadt_bauen.py --neu    # frisch bei Overpass holen

Gebaeudegrundrisse, Wasser, Gruenflaechen und Hauptstrassen rund um die
Altstadt, vereinfacht auf etwa einen Meter. Hoehen aus OSM (height,
building:levels), sonst geschaetzt. Das Liebfrauenmuenster (Weg 358009451)
wird getrennt gespeichert, die Tuerme ergaenzt grafik/klima.js.
Daten: (c) OpenStreetMap-Mitwirkende, ODbL. Nur bei Bedarf neu bauen, die
Altstadt aendert sich selten.

Ergebnis: data/altstadt.js (window.ALTSTADT).
"""
import os, time, urllib.parse, urllib.request
HIER = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HIER, '.cache')
BBOX = '48.7515,11.403,48.7745,11.448'
ABFRAGEN = {
    'gross': '[out:json][timeout:140];(way["building"](%s););out tags geom;' % BBOX,
    'natur': ('[out:json][timeout:140];(way["natural"="water"]({b});relation["natural"="water"]({b});way["waterway"="riverbank"]({b});'
              'way["leisure"="park"]({b});relation["leisure"="park"]({b});way["landuse"="grass"]({b});'
              'way["highway"~"^(primary|secondary|tertiary|pedestrian)$"]({b}););out tags geom;').format(b=BBOX),
}
def hole(name, neu):
    pfad = os.path.join(CACHE, 'osm-altstadt-%s.json' % name)
    if os.path.exists(pfad) and not neu: return pfad
    os.makedirs(CACHE, exist_ok=True)
    daten = urllib.parse.urlencode({'data': ABFRAGEN[name]}).encode()
    for versuch in range(4):
        try:
            anfrage = urllib.request.Request('https://overpass-api.de/api/interpreter', data=daten,
                                             headers={'User-Agent': 'PapierPanther (schanzer-papierpanther.de)', 'Accept': 'application/json'})
            inhalt = urllib.request.urlopen(anfrage, timeout=180).read()
            if inhalt.lstrip()[:1] == b'{':
                open(pfad, 'wb').write(inhalt); return pfad
        except OSError as fehler:
            print('Overpass:', fehler)
        time.sleep(10 * (versuch + 1))
    raise SystemExit('Overpass liefert nichts, spaeter noch einmal versuchen.')
import json, math, sys
NEU = '--neu' in sys.argv
ZIEL = os.path.join(HIER, '..', 'data', 'altstadt.js')
# Koordinaten in Metern: x nach Osten, y nach Sueden, Ursprung bei 48.7630 N, 11.4250 O.
LAT0, LON0 = 48.7630, 11.4250
KX, KY = math.cos(math.radians(LAT0)) * 111320, 110540
def xy(p): return (round((p['lon'] - LON0) * KX, 1), round(-(p['lat'] - LAT0) * KY, 1))
def vereinfache(pts, tol=0.9):
    if len(pts) < 4: return pts
    def dp(a, b, liste):
        if not liste: return []
        (x1, y1), (x2, y2) = a, b; L = math.hypot(x2 - x1, y2 - y1) or 1e-9
        best, bi = -1, -1
        for i, (x, y) in enumerate(liste):
            d = abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / L
            if d > best: best, bi = d, i
        if best < tol: return []
        m = liste[bi]
        return dp(a, m, liste[:bi]) + [m] + dp(m, b, liste[bi + 1:])
    if pts[0] == pts[-1]:
        # Geschlossener Ring: am weitesten entfernten Punkt teilen, sonst fällt alles weg
        k = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
        return [pts[0]] + dp(pts[0], pts[k], pts[1:k]) + [pts[k]] + dp(pts[k], pts[-1], pts[k + 1:-1]) + [pts[-1]]
    return [pts[0]] + dp(pts[0], pts[-1], pts[1:-1]) + [pts[-1]]
def hoehe(t):
    try:
        if 'height' in t: return float(t['height'].replace('m', '').replace(',', '.').strip())
    except ValueError: pass
    try:
        if 'building:levels' in t: return float(t['building:levels']) * 3.1 + 2
    except ValueError: pass
    return {'house': 8, 'detached': 8, 'garage': 3, 'garages': 3, 'roof': 4, 'shed': 3, 'church': 20, 'apartments': 15}.get(t.get('building'), 11)
geb = json.load(open(hole('gross', NEU)))['elements']
b, muenster = [], None
for e in geb:
    g = e.get('geometry'); t = e.get('tags', {})
    if not g or len(g) < 4: continue
    pts = vereinfache([xy(p) for p in g])
    if len(pts) < 4: continue
    if e["id"] == 358009451: muenster = pts; continue
    flach = [v for p in pts[:-1] for v in p]
    b.append([round(hoehe(t), 1)] + flach)
nat = json.load(open(hole('natur', NEU)))['elements']
wasser, gruen, strassen = [], [], []
def ringe(e):
    if e['type'] == 'way': return [e.get('geometry', [])]
    return [m.get('geometry', []) for m in e.get('members', []) if m.get('role') == 'outer']
for e in nat:
    t = e.get('tags', {})
    if 'highway' in t:
        pts = vereinfache([xy(p) for p in e.get('geometry', [])], 1.5)
        w = {'primary': 14, 'secondary': 11, 'tertiary': 9, 'pedestrian': 8}[t['highway']]
        strassen.append([w] + [v for p in pts for v in p]); continue
    for r in ringe(e):
        if len(r) < 4: continue
        pts = vereinfache([xy(p) for p in r], 2)
        ziel = wasser if (t.get('natural') == 'water' or t.get('waterway') == 'riverbank') else gruen
        ziel.append([v for p in pts for v in p])
out = {'b': b, 'muenster': [v for p in muenster[:-1] for v in p], 'wasser': wasser, 'gruen': gruen, 'strassen': strassen}
open(ZIEL, 'w').write('/* Altstadt Ingolstadt aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL). Meter, x Ost, y Sued. */\nwindow.ALTSTADT = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(len(b), len(wasser), len(gruen), len(strassen), muenster and len(muenster), round(len(open(ZIEL).read()) / 1024), 'KB')
xs = [v for bb in b for v in bb[1::2]]; ys = [v for bb in b for v in bb[2::2]]
print('x', min(xs), max(xs), 'y', min(ys), max(ys))
