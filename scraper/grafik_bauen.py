#!/usr/bin/env python3
"""
Baut die Daten fuer die grafische Fassung der Seiten (grafik/*.js).

    python3 scraper/grafik_bauen.py

Liest nur, was schon in data/ liegt (feed.json, antraege.json, haushalt.json,
hsk.json, klima.json) und fasst es knapp zusammen: Die Startseite braucht je
Tagesordnungspunkt nur Bezirk, Schlagworte, Stand und Titel. Nach jedem
Daten-Update am Ende laufen lassen, zusammen mit themen_bauen.py.

Ergebnis: data/grafik.js (window.GRAFIK_DATEN).
"""
import json, collections, itertools, os
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
OUT = os.path.join(DATA, 'grafik.js')
def laden(name): return json.load(open(os.path.join(DATA, name), encoding='utf-8'))
f = laden('feed.json')
A = f['achsen']; E = f['eintraege']
LL = A['lebenslage']; BZ = A['bezirk']; AN = A['anlass']
STATUS = ['Entschieden', 'Ergebnis steht im Protokoll', 'Noch offen', 'Nur zur Information']
def kurz(s, n):
    s = (s or '').strip()
    return s if len(s) <= n else s[:n-1].rsplit(' ', 1)[0] + '…'
# Start: ein Eintrag = [bezirk-index (-1 ohne), lebenslage-bitmaske, anlass-bitmaske, status, titel, datum, gremium, link]
# Der Link zeigt auf die Vorlage, sonst auf die Sitzung. Er wird als 'praefix-index|rest' gespeichert, das spart gut 200 KB.
praefixe = []
def link(e):
    u = e.get('vorlage_url') or e.get('sitzung_url') or ''
    if '=' not in u: return u
    p, r = u.rsplit('=', 1)
    p += '='
    if p not in praefixe: praefixe.append(p)
    return str(praefixe.index(p)) + '|' + r
start = []
for e in E:
    b = e['bezirk'][0] if e['bezirk'] else None
    bi = BZ.index(b) if b in BZ else -1
    lm = sum(1 << LL.index(x) for x in e['lebenslage'] if x in LL)
    am = sum(1 << AN.index(x) for x in e['anlass'] if x in AN)
    start.append([bi, lm, am, STATUS.index(e['status']), kurz(e['klartext_titel'] or e.get('amtlicher_titel'), 90), e.get('datum_anzeige') or '', e.get('gremium') or '', link(e)])
# Themen-Netz: Schlagworte + Ko-Vorkommen
tags = [('l', x) for x in LL] + [('a', x) for x in AN]
cnt = collections.Counter(); co = collections.Counter()
for e in E:
    t = [('l', x) for x in e['lebenslage']] + [('a', x) for x in e['anlass']]
    t = [x for x in t if x in tags]
    for x in t: cnt[x] += 1
    for x, y in itertools.combinations(sorted(set(t)), 2): co[(x, y)] += 1
knoten = [{'id': k + ':' + n, 'name': n, 'art': k, 'n': cnt[(k, n)]} for k, n in tags]
kanten = [{'a': x[0] + ':' + x[1], 'b': y[0] + ':' + y[1], 'n': n} for (x, y), n in co.items() if n >= 12]
# Antraege
a = laden('antraege.json')
parteien = []
for p, l in a['parteien'].items():
    if not l: continue
    l = sorted(l, key=lambda x: x['datum'], reverse=True)
    def art(x):
        return {'t': kurz(x.get('klartext_titel') or x['titel'], 110), 'x': kurz(x.get('klartext') or '', 420), 'd': x['datum_anzeige'], 'datum': x['datum'],
                'stand': x['stand'] or ('In Beratung' if x['in_beratung'] else 'Noch auf keiner Tagesordnung'), 'url': x.get('vorlage_url'), 'b': x['in_beratung']}
    parteien.append({'name': p, 'n': len(l), 'offen': sum(1 for x in l if not x['in_beratung']),
                     'beschlossen': sum(1 for x in l if x['stand'] == 'Beschlossen'),
                     'artikel': [art(x) for x in l[:6]],
                     'liegen': [art(x) for x in sorted([x for x in l if not x['in_beratung']], key=lambda x: x['datum'])[:3]]})
antraege = {'statistik': a['statistik'], 'abgerufen': a.get('abgerufen_am'), 'parteien': parteien}
# Haushalt
h = laden('haushalt.json')
hk = laden('hsk.json')
haushalt = {'summe_ausgaben': h['jahre']['2026']['summe_ausgaben'], 'summe_einnahmen': h['jahre']['2026']['summe_einnahmen'],
            'einwohner': h['vorbericht_aktuell']['einwohner']['anzahl'], 'referate': h['referate_aktuell'],
            'einnahmen': hk['bericht']['einnahmen_2026']['posten'], 'kredite': h['vorbericht_aktuell']['kredite_planjahr'],
            'zeitreihe': [{'jahr': z['jahr'], 'art': z['art'], 'ausgaben': z['ausgaben']} for z in h['zeitreihe']],
            'vwh': h['verwaltungs_vermoegenshaushalt_aktuell']}
# Hauptgruppen 2026 wie im ersten Diagramm der Haushaltsseite: 5 und 6 sind dort zusammengefasst
hg = h['jahre']['2026']['hauptgruppen']
def gruppe(codes):
    w = hg[codes[0]]
    return {'codes': codes, 'name': w['bezeichnung'], 'euro': sum(hg[c]['ansatz'] for c in codes),
            'vorjahr': sum(hg[c]['ansatz_vorjahr'] for c in codes),
            'unter': [[u['bezeichnung'], u['ansatz']] for u in sorted(w['untergruppen'], key=lambda u: -u['ansatz']) if u['ansatz'] > 0][:6]}
haushalt['ausgaben_hg'] = [gruppe(['4']), gruppe(['5', '6']), gruppe(['7']), gruppe(['8']), gruppe(['9'])]
haushalt['einnahmen_hg'] = [gruppe(['0']), gruppe(['1']), gruppe(['2']), gruppe(['3'])]
haushalt['einnahmen_unter'] = {c: {u['code']: u['ansatz'] for u in hg[c]['untergruppen']} for c in '0123'}
# Sparplan
b = hk['bericht']; m = hk['massnahmen']
def mittel(d): 
    v = [float(d.get(j, 0) or 0) for j in ('2026', '2027', '2028', '2029')]; return round(sum(v) / 4)
mass = []
for teil in ('verwaltungshaushalt', 'personal', 'vermoegenshaushalt'):
    for x in m[teil]:
        mass.append({'t': x.get('titel') or x['art'], 'x': kurz(x.get('text') or x.get('erlaeuterung') or '', 300), 'teur': mittel(x['teur']),
                     'bereich': x.get('bereich') or ('personal' if teil == 'personal' else 'sonstiges'), 'status': x.get('status') or '', 'teil': teil})
fw = collections.defaultdict(float)
for p in hk['freiwillige_leistungen']['posten']: fw[p['einzelplan']] += float(p['euro'].get('2026') or 0)
st = b['steuern']
sparplan = {'luecke_teur': -b['konsolidierungsziel']['durchschnitt_kzv'], 'massnahmen': mass,
            'freiwillig': [{'ep': k, 'name': hk['einzelplaene'][k], 'teur': round(v / 1000),
                            'posten': [[kurz(p['name'], 80), round(float(p['euro'].get('2026') or 0) / 1000)] for p in sorted(
                                [p for p in hk['freiwillige_leistungen']['posten'] if p['einzelplan'] == k and float(p['euro'].get('2026') or 0) >= 1000],
                                key=lambda p: -float(p['euro'].get('2026') or 0))]} for k, v in sorted(fw.items())],
            'gewst': {'hebesatz': st['gewerbesteuer_hebesatz'], 'plan_teur': st['gewerbesteuer_plan_2026_teur'], 'schnitt': st['gewerbesteuer_durchschnitt']},
            'grundst': {'hebesatz': st['grundsteuer_b_hebesatz'], 'aufkommen_teur': st['grundsteuer_b_aufkommen_teur'], 'schnitt': st['grundsteuer_b_durchschnitt']},
            'einwohner': haushalt['einwohner']}
# Klima
k = laden('klima.json')
klima = {'referenz': k['klima']['referenz'],
         'jahre': [{kk: j[kk] for kk in ('jahr', 'vollstaendig', 'mitteltemperatur', 'abweichung', 'heisse_tage', 'sommertage', 'tropennaechte', 'frosttage', 'eistage', 'niederschlag_mm')} for j in k['klima']['jahre']],
         'solar': [{'jahr': r['jahr'], 'n': r['bestand_anzahl'], 'kw': r['bestand_kw']} for r in k['solar']['reihe'] if r['jahr'] >= 1990],
         'laden': {'ladepunkte': k['laden']['ladepunkte'], 'reihe': k['laden']['reihe']},
         'thg': k['bericht']['thg'], 'strom': k['bericht']['strom'], 'ziele': k['bericht']['ziele'],
         'solar_zubau': [{'jahr': r['jahr'], 'kw': r['zubau_kw'], 'bestand': r['bestand_kw']} for r in k['solar']['reihe'] if r['jahr'] >= 2018],
         'speicher': [{'jahr': r['jahr'], 'n': r['bestand_anzahl'], 'kw': r['bestand_kw'], 'kwh': r['bestand_kwh']} for r in k['speicher']['reihe'] if r['jahr'] >= 2018],
         'endenergie': k['bericht']['endenergie']}
open(OUT, 'w', encoding='utf-8').write('/* Erzeugt von scraper/grafik_bauen.py aus data/*.json, nicht von Hand aendern */\nwindow.GRAFIK_DATEN = ' + json.dumps(
    {'start': {'achsen': {'lebenslage': LL, 'bezirk': BZ, 'anlass': AN, 'status': STATUS}, 'e': start, 'praefixe': praefixe, 'sitzungen': f['statistik']['sitzungen_ausgelesen']},
     'netz': {'knoten': knoten, 'kanten': kanten}, 'antraege': antraege, 'haushalt': haushalt, 'sparplan': sparplan, 'klima': klima},
    ensure_ascii=False, separators=(',', ':')) + ';\n')
print('data/grafik.js:', round(os.path.getsize(OUT) / 1024), 'KB')
