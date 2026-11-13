#!/usr/bin/env python3
"""Prüft data/beteiligungen.json und schreibt data/beteiligungen.js.

Die Zahlen werden von Hand aus dem Beteiligungsbericht übertragen. Dieses Skript
rechnet nach, was sich nachrechnen lässt, und bricht bei Abweichungen ab:

- Überleitung des Berichts (S. 56): Gewinnanteil INKB - Verlust + Steuerersparnis
  + Rücklage = -Einlage.
- Bereich Energie = Gewinnanteil INKB + Mitgesellschafter + Steuerersparnis + Ertragsteuern.
- Zerlegung des Verlusts 2024/25 (S. 55) ergibt den Bereichswert.
- Der Rest (Energie + Einlage - Verlust) ist in keinem Jahr negativ.
- Zahlungen und Einnahmen der Stadt (S. 14, 15) ergeben die Summen des Berichts.
- Zins und Abschreibung der Freizeitanlagen sind kleiner als ihr Verlust.

Nur Standardbibliothek.
"""
import json
import pathlib
import sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
d = json.loads((WURZEL / 'data' / 'beteiligungen.json').read_text(encoding='utf-8'))
fehler = []
w = d['waage']
for j in w['jahre']:
    rest = j['energie'] + j['einlage'] - j['verlust']
    if rest < 0:
        fehler.append(f"{j['jahr']}: Rest negativ ({rest})")
    j['rest'] = rest
    u = j.get('ueberleitung')
    if u:
        if u['gewinnanteil_inkb'] - j['verlust'] + u['steuerersparnis'] + u['ruecklage'] != -j['einlage']:
            fehler.append(f"{j['jahr']}: Überleitung S. 56 geht nicht auf")
        if j['energie'] != u['gewinnanteil_inkb'] + u['mitgesellschafter'] + u['steuerersparnis'] + u['ertragsteuern']:
            fehler.append(f"{j['jahr']}: Bereich Energie passt nicht zu Gewinnanteil + Mitgesellschafter + Steuern")
    t = j.get('verlust_teile')
    if t and sum(v for k, v in t.items() if not k.startswith('_')) != j['verlust']:
        fehler.append(f"{j['jahr']}: Zerlegung des Verlusts ergibt nicht {j['verlust']}")
for teil in ('zahlungen', 'einnahmen'):
    summe = sum(x['teur'] for x in d[teil]['posten'])
    if summe != d[teil]['summe_teur']:
        fehler.append(f"{teil}: Posten ergeben {summe}, im Bericht stehen {d[teil]['summe_teur']}")
if len({b['id'] for b in d['bereiche']}) != len(d['bereiche']):
    fehler.append('bereiche: doppelte id')
for b in d['bereiche']:
    if b['art'] not in ('selbst', 'teils', 'haushalt'):
        fehler.append(f"bereiche/{b['id']}: unbekannte art")
# Schulden des Kernhaushalts aus dem Sparplan, damit die Seite beides nebeneinander zeigen kann
hsk = json.loads((WURZEL / 'data' / 'hsk_bericht.json').read_text(encoding='utf-8'))['schulden']
d['kernhaushalt'] = {'schulden_teur': hsk['bestand_teur'], 'stand': hsk['bestand_stand'], '_quelle': 'Haushaltssicherungskonzept, S. %s' % hsk['_seite']}
f = w['freizeit_fest']
if not 0 < f['abschreibungen'] + f['zinsen'] < f['verlust']:
    fehler.append('Freizeitanlagen: Zins und Abschreibung nicht kleiner als der Verlust')
if fehler:
    print('FEHLER in data/beteiligungen.json:')
    for x in fehler:
        print(' -', x)
    sys.exit(1)
(WURZEL / 'data' / 'beteiligungen.js').write_text(
    '/* Erzeugt von scraper/beteiligungen_bauen.py aus data/beteiligungen.json, nicht von Hand aendern */\n'
    'window.BETEILIGUNGEN_DATEN = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('data/beteiligungen.js geschrieben,', len(w['jahre']), 'Jahre, alle Proben bestanden')
