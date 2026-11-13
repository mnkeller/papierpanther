# PapierPanther

Was der Ingolstädter Stadtrat entscheidet, und wen es betrifft.

Die Tagesordnungen des Stadtrats und der zwölf Bezirksausschüsse sind öffentlich —
aber in Amtsdeutsch, verteilt über hunderte Einzelpunkte in einem Ratsinfoportal,
das niemand freiwillig durchsucht. PapierPanther liest sie aus, übersetzt sie in
normale Sprache und sortiert sie danach, wen sie betreffen.

**Kein offizielles Angebot der Stadt Ingolstadt.** Verbindlich ist immer das
Originaldokument — jeder Eintrag verlinkt seine Quelle.

Live: https://schanzer-papierpanther.de/

## Schnellstart

```bash
python3 -m http.server 8000
```

und dann <http://localhost:8000> aufrufen. Ein Doppelklick auf `index.html`
funktioniert je nach Browser auch — die Daten liegen seit dem Zwei-Jahres-Stand
in `data/feed.js` statt in der Seite selbst, und manche Browser (Safari) laden
lokale Unterdateien nicht. Die Seite sagt es dann selbst und nennt den Ausweg.

Daten neu holen und Feed neu bauen:

```bash
cd scraper && python3 ris_ingolstadt.py --von 2026-01 --bis 2026-07 \
  && python3 niederschriften_lesen.py && python3 feed_bauen.py && python3 pruefen.py
```

Nur Python-Standardbibliothek, keine Abhängigkeiten.

## Aufbau

```
index.html            Startseite: Auf einen Blick, Themen-Kacheln, alle Einträge
themen.html           Themen im Überblick (Kacheln mit je einer Kernzahl)
kopf.js               gemeinsame Kopfzeile aller Seiten (Start · Themen · So funktioniert's)
themen-kacheln.js     zeichnet die Themen-Kacheln aus data/themen.js
impressum.html        Impressum (§ 5 DDG)
datenschutz.html      Datenschutzerklärung
KURATION.md           wie die Kurztexte entstehen (inkl. Leichte Sprache)
scraper/
  ris_ingolstadt.py   liest beide Portale aus       -> data/rohdaten.json
  entwuerfe_bauen.py  erzeugt Kurations-Vorschläge  -> data/kuration.json
  niederschriften_lesen.py  Beschlüsse aus Protokollen -> data/beschluesse.json
                            (+ data/niederschriften.json)
  feed_bauen.py       Rohdaten + Kuration           -> data/feed.json + feed.js
  pruefen.py          Zusagen der Seite nachrechnen (Exit-Code)
  themen_bauen.py     Kennzahlen für die Themen-Kacheln -> data/themen.js
  beteiligungen_bauen.py  prüft data/beteiligungen.json -> data/beteiligungen.js
  grafik_bauen.py     Daten der grafischen Fassung  -> data/grafik.js
  altstadt_bauen.py   Altstadt aus OpenStreetMap    -> data/altstadt.js
  wege_bauen.py       Fußnetz, Orte, Zensus, Bezirke -> data/wege-*.js, data/bezirke.js
  karte_bauen.py      Grundkarte aus Protomaps      -> karten/ingolstadt.pmtiles
  .cache/             HTML-Cache, schont das Portal bei Wiederholläufen
data/
  rohdaten.json       unveränderte Auslesung beider Quellen
  kuration.json       Klartext + Schlagworte, hand- und maschinengepflegt
  feed.json           erzeugt — nicht händisch ändern
  feed.js             dasselbe als window.FEED, das lädt die Seite
```

`feed_bauen.py` schreibt `data/feed.json` und `data/feed.js`. `index.html` wird
dabei **nicht** verändert — Gestaltung und Logik der Seite gehören dir allein.

Die Trennung von `rohdaten.json` und `kuration.json` ist bewusst: Neu-Scrapen
überschreibt niemals die aufbereiteten Texte.

Jeder kuratierte Eintrag trägt seine Texte in zwei Fassungen — normale Sprache
und **Leichte Sprache**. Beide entstehen im selben Arbeitsgang; die Regeln dafür
stehen in [KURATION.md](KURATION.md).

Hintergrund zur Datenlage, zum Beratungsstand und zu den offenen Fragen:
[PROTOTYP-INGOLSTADT.md](PROTOTYP-INGOLSTADT.md).

### Navigation und Themen-Kacheln

Alle Seiten laden `kopf.js`, das die Navigation in die Kopfzeile setzt; neue
Themenseiten dort in `THEMEN` eintragen (und in `scraper/themen_bauen.py`,
falls sie eine Kachel bekommen). Die Kacheln auf der Startseite und auf
`themen.html` zeigen je eine Zahl aus den Datendateien der Themenseiten:

```bash
cd scraper && python3 themen_bauen.py   # nach jedem Daten-Update
```

### Grafische Fassung (`grafik/`)

Neben „Leichte Sprache“ hat jede Themenseite und die Startseite einen Knopf
„Grafisch“. `grafik/kern.js` blendet dann den Inhalt aus und lädt erst jetzt die
Szenen aus `grafik/<name>.js`, dazu `vendor/d3/` und `data/grafik.js`. Welche
Seite welche Szenen zeigt, steht oben in `grafik/kern.js` (`SEITEN`). Die Wahl
bleibt gespeichert; `#grafisch` in der Adresse öffnet eine Seite direkt grafisch.

```bash
python3 scraper/grafik_bauen.py      # nach jedem Daten-Update, nach themen_bauen.py
python3 scraper/altstadt_bauen.py    # nur selten, --neu holt OpenStreetMap frisch
```

`grafik_bauen.py` fasst nur zusammen, was schon in `data/` liegt. Die Szenen für
Wohnen und Miete lesen direkt `data/wohnen.js` und `data/miete.js`.

### Klima (`klima.html`)

```bash
cd scraper && python3 klima_bauen.py   # --neu, um den Cache zu umgehen
```

Holt offene Daten und schreibt `data/klima.json` + `data/klima.js`
(window.KLIMA_DATEN). Der erste Lauf lädt rund 110 MB (vor allem das
Ladesäulenregister) und dauert etwa zwei Minuten.

- Deutscher Wetterdienst: Tageswerte der Station Kösching (seit 1961). Dieselbe
  Station und Referenzperiode (1971–2000) wie im Fortschrittsbericht der Stadt.
- Marktstammdatenregister: Solaranlagen und Stromspeicher, Gemeindeschlüssel
  09161000. Gespeichert werden nur Jahressummen, keine Einzelanlagen.
- Ladesäulenregister der Bundesnetzagentur: öffentliche Ladepunkte.
- `data/klima_bericht.json`: von Hand gepflegte Werte aus den
  Fortschrittsberichten der Stabsstelle Klima (THG-Bilanz, Ziele).

### Miete (`miete.html`)

Kein Skript: `data/miete.js` (window.MIETE_DATEN) ist von Hand gepflegt.

- Basismiete und Zu-/Abschläge aus der amtlichen Mietspiegel-Broschüre
  November 2025 (Tabellen 1 und 2), gültig bis 31.10.2027. Der Bericht zur
  Fortschreibung weicht beim Aufzug ab (+5 statt +6 %); es gilt die Broschüre.
  Der Rechner läuft nur im Browser; Eingaben werden weder gespeichert noch übermittelt.
- Mietpreisbremse und Kappungsgrenze laut Bayerischer Mieterschutzverordnung
  (Ingolstadt: Anlage Nr. 1.1.1).
- Ablauf, Ausnahmen, Zeitleiste, „Wer profitiert?“ und die Stadtratsvorgänge
  zum Wohnen stehen ebenfalls in `data/miete.js`, jeweils in normaler und
  Leichter Sprache.

Beim neuen Mietspiegel (Befragung voraussichtlich 2. Quartal 2027) die Tabellen
komplett ersetzen. Angebotsmieten fehlen bewusst: Dafür gibt es keine offenen Daten.

### Sparplan / Haushaltssicherungskonzept (`hsk.html`)

```bash
cd scraper && python3 hsk_lesen.py
```

Liest das Haushaltssicherungskonzept (Vorlage V0652/26, Stadtrat 29.10.2026)
und schreibt `data/hsk.json` + `data/hsk.js` (window.HSK_DATEN).

- Aus den Anlagen maschinell gelesen: der Maßnahmenkatalog (Anlage 1, drei
  Blätter) und die Liste der freiwilligen Leistungen (Anlage 5). Jede Tabelle
  wird gegen ihre gedruckte Summenzeile geprüft; bei einer Abweichung bricht
  das Skript ab. Ein Fehler in der Quelle selbst (Personal-Blatt, Summe 2027)
  ist im Skript als bekannte Abweichung vermerkt.
- `data/hsk_bericht.json`: von Hand gepflegte Werte aus dem Konzepttext
  (Sparziel, Schuldenszenarien, Ausgabenstruktur, Zeitleiste), jeweils mit
  Seitenangabe, plus die Klartexte zu jeder Maßnahme in normaler und Leichter
  Sprache. Kommt in einer Fortschreibung eine Maßnahme dazu, warnt das Skript.
- `pruefen.py` rechnet die Summen in `data/hsk.json` ein zweites Mal nach.

Für eine Fortschreibung des HSK: neue Dokument-IDs in `DOK_IDS` eintragen,
Seitenbereiche in `lies_anlage1`/`lies_anlage5` prüfen, `hsk_bericht.json`
abgleichen.

### Unternehmen der Stadt (`beteiligungen.html`)

```bash
cd scraper && python3 beteiligungen_bauen.py && python3 themen_bauen.py
```

Grundlage ist der Beteiligungsbericht 2026 der Stadt (Vorlage V0569/26,
Berichtsjahr 2025). Anders als beim Sparplan wird nichts maschinell gelesen:

- `data/beteiligungen.json`: von Hand aus dem Bericht übertragen, jede Zahl
  mit gedruckter Seitenzahl. Enthält die Eckdaten, neun Alltagsbereiche
  (Wohnungen, Wasser, Busse …), die Zahlungen zwischen Stadt und Unternehmen
  und die Reihe „Energiegewinn, Verlust, Einlage“ der Stadtwerke seit 2020/21.
- `beteiligungen_bauen.py` rechnet nach, was sich nachrechnen lässt (die
  Überleitung des Berichts auf S. 56, die Summen der Seiten 14 und 15), holt
  den Schuldenstand des Kernhaushalts aus `data/hsk_bericht.json` und schreibt
  `data/beteiligungen.js` (window.BETEILIGUNGEN_DATEN). Bei einer Abweichung
  bricht es ab.
- Die grafische Fassung ist `grafik/waage.js`. Ihre Regler rechnen vereinfacht;
  die Annahmen stehen in der Fußzeile der Szene.

Die Seite gibt wieder, was im Bericht steht, und bewertet nicht. Die Tabellenwerte
sind am 13.11.2026 mit dem Seitenbild des PDF abgeglichen; wo die Gesamtübersicht
(S. 21) von den Einzelberichten abweicht, steht das im `_hinweis` der JSON. Für den nächsten Bericht: Werte in der JSON ersetzen, ein
weiteres Jahr an `waage.jahre` anhängen, Skripte laufen lassen.

### Deine 15 Minuten (`wege.html`)

```bash
python3 scraper/wege_bauen.py          # --neu holt OpenStreetMap und Bezirke frisch
python3 scraper/karte_bauen.py         # Grundkarte, nur selten (z. B. zweimal im Jahr)
```

Die Seite zeigt, was man von einem Punkt aus in 5, 10 und 15 Minuten zu Fuß
erreicht, für fünf Personen (Erwachsene, Kind, ältere Person, Rollstuhl oder
Kinderwagen, Besucher:in) und unter zwei Bedingungen (Nacht, Hitze). Die
Ansicht „Alle Personen“ legt die fünf 15-Minuten-Flächen als Schichtbild
übereinander, die größte unten. Die Wegsuche (Dijkstra) läuft in `wege.js` im
Browser; für das Kind über gerichtete Kanten mit Straßenseite, damit es Haupt-
und Sammelstraßen nur an Ampel oder Zebrastreifen quert. Alle Werte je Person
und Bedingung stehen oben in `wege.js` (`PERSONEN`, `BEDINGUNGEN`) und werden
auf der Seite als Tabelle gezeigt. Die Flächen werden geglättet (Schließen mit
70 m, Löcher unter 4 ha gefüllt, Inseln unter 1 ha weggelassen). Adresssuche
und Standort bleiben im Browser.

Alles kommt von der eigenen Domain, kein Kartendienst:

- `vendor/maplibre-gl/` MapLibre GL JS 6.16.0 (ESM, der Worker lädt als Modul
  von derselben Domain), `vendor/pmtiles/` pmtiles 4.5.0,
  `vendor/protomaps/` Protomaps-Basemap-Stil 5.7.2 (`basemaps.js`, Stil „light“,
  deutsch beschriftet) mit Sprites und Glyphen (Noto Sans, nur die Bereiche für
  lateinische Schrift). Lizenzen liegen jeweils daneben.
- `karten/ingolstadt.pmtiles` (rund 9 MB): Ausschnitt aus dem täglichen
  Protomaps-Build, Stadtgebiet plus 2 km, Zoom 10 bis 15. `karte_bauen.py`
  liest dafür per HTTP-Bereichsabfrage nur die nötigen Kacheln aus dem
  weltweiten Archiv und schreibt eine eigene PMTiles-Datei; das ersetzt
  `pmtiles extract`, ein Zusatzwerkzeug ist nicht nötig.
- Der Server muss Bereichsabfragen (`Range`) beantworten. GitHub Pages tut das
  (geprüft am 11.11.2026: `curl -s -r 0-1023 -D - -o /dev/null
  https://schanzer-papierpanther.de/data/feed.js` liefert `206` mit
  `Content-Range`). Achtung: Textdateien wie `.js` liefert Pages gzip-komprimiert,
  der Bereich bezieht sich dann auf die komprimierte Fassung; PNG und WOFF2 kommen
  unkomprimiert. Befund nach dem ersten Push (12.11.2026): Auch die Kartendatei
  (`application/octet-stream`) komprimiert Pages, sobald der Client
  `Accept-Encoding: gzip` schickt; der Bereich bezieht sich dann auf den
  Gzip-Strom und ist für PMTiles unbrauchbar. Es funktioniert trotzdem, weil
  Browser bei Bereichsabfragen `Accept-Encoding: identity` schicken (Fetch-Standard;
  Chrome und Safari schon lange, Firefox erst ab Version 148, ältere Firefox
  bekommen Decodierfehler oder 416). Prüfen deshalb so, wie ein Browser fragt:
  `curl -s -r 0-1023 -H "Accept-Encoding: identity" -D - -o /dev/null https://schanzer-papierpanther.de/karten/ingolstadt.pmtiles`
  muss `206` ohne `content-encoding` und `Content-Range: bytes 0-1023/<Dateigröße>`
  liefern. Dieselbe Abfrage mit `Accept-Encoding: gzip` zeigt den komprimierten
  Fall und ist kein Fehler.
  `python3 -m http.server` kann Range nicht, für die lokale Vorschau also einen
  Server mit Range-Unterstützung nehmen.

Die Ansicht „Mein Bezirk“ färbt die zwölf Bezirke nach dem Anteil, der ein Ziel
in 15 Minuten erreicht (je Person; beim Kind zählen die unter 18-Jährigen, bei
der älteren Person die ab 65-Jährigen), zeigt auf Wunsch die bewohnten Zellen,
in denen es Menschen trifft, und je Bezirk die letzten fünf Einträge des
Bezirksausschusses aus `data/feed.js` (erst beim Anklicken geladen). In der
Einzelansicht rechnet „Wenn dieser Ort schließt“ vor Ort neu und stadtweit über
die zweitnächsten Orte der Zellen. Darunter steht „Was der Sparplan für Wege
bedeutet“ aus `data/wege-massnahmen.json` (von Hand gepflegt: Maßnahmen aus
`data/hsk.json` mit eindeutigem Ort, Text in beiden Sprachen, Quelle).

**Mit Bus** (`scraper/oepnv_bauen.py`):

```bash
python3 scraper/oepnv_bauen.py         # nach wege_bauen.py; --neu lädt den Fahrplan frisch (12,7 MB)
```

Liest den Soll-Fahrplan (GTFS) der VGI/INVG
(`https://www.vgi.de/FileServlet?gtfs=true`, Cache in `scraper/.cache/oepnv/`) und
schreibt `data/wege-bus.json` + `.js` (window.WEGE_BUS, rund 800 KB): die rund 315
Haltestellen im Stadtgebiet mit Einstiegsknoten im Fußnetz und für fünf Zeitfenster
an je einem Stichtag (Mo 7–9, 12–14, 17–19, Sa 10–12, So 10–12) den Takt je
Haltestelle (alle Linien) und die Haltestellen, die man in 30 Minuten Fahrt
erreicht. Fahrzeit je Linienabschnitt ist der Median der Fahrten im Fenster;
Umsteigen kostet 5 Minuten, auch zu einem Steig bis 200 m entfernt (die ZOB-Steige
sind im GTFS getrennte Haltestellen). Die Seite rechnet dazu: Fußweg zur
Haltestelle + halber Takt (höchstens 10 Minuten) + Fahrt + Fußweg weiter, Grenze
30 Minuten. Die Stichtage stehen oben im Skript (`FENSTER`) und müssen im
Gültigkeitszeitraum des Fahrplans liegen, sonst bricht das Skript ab. Lizenz der
Fahrplandaten: CC BY-SA 3.0 DE, nicht kommerziell (siehe NOTICE); die abgeleitete
Datei steht unter derselben Lizenz.

Reihenfolge nach einem Daten-Update: `wege_bauen.py` → `oepnv_bauen.py` →
`grafik_bauen.py` → `themen_bauen.py` → `pruefen.py`. `wege_bauen.py` schreibt dabei
auch `data/wege-rathausplatz.json` (Orte in 15 Minuten ab Rathausplatz je Person)
für die grafische Fassung (`grafik/wege.js`).

Plan und Rechenmodell: [WEGE-KARTE-PLAN.md](WEGE-KARTE-PLAN.md). Die Werte je
Person und Bedingung stehen nur in `data/wege-personen.json` (von Hand
gepflegt); `wege_bauen.py` rechnet damit und legt sie als `data/wege-personen.js`
für `wege.js` bei, damit Seite und Zellen nie auseinanderlaufen. Das Skript
schreibt je eine `.json` und `.js`:

- `data/wege-netz` (window.WEGE_NETZ): Fußwegenetz aus OpenStreetMap, als
  Differenzen gepackte Zahlenfelder. Jede Kante trägt Länge, Wegeklasse,
  Beleuchtung, Treppe, Oberfläche, Gehweg, Querung, Schatten, Sperrung
  (`foot=no` bleibt markiert im Netz), Rollstuhl, Name und Brücke/Tunnel;
  Knoten tragen Querungsart, Bordstein und Barrieren. Zwischenpunkte ohne
  Merkmal fallen weg, solange die Linie um höchstens 3 m abweicht. Nur die
  größte zusammenhängende Komponente bleibt. Grenze: 2 MB als `.js`.
- `data/wege-orte` (window.WEGE_ORTE): Alltagsorte in 26 Kategorien mit
  Einstiegsknoten; Flächen (Parks, Spielplätze, Sportanlagen, Schulhöfe)
  hängen über Randpunkte alle 20 m am Netz, nicht über ihren Mittelpunkt.
  Trinkwasserbrunnen zusätzlich aus dem Datensatz der Stadt (open.bydata,
  CC BY 4.0; Brunnen unter 30 m neben einem OSM-Brunnen fallen weg). Dazu
  `grosse_ziele` (Klinikum, Hauptbahnhof, Rathaus, Westpark, Audi Forum,
  Stadttheater) für die Liste „Große Ziele“ bei „Mit Bus“.
- `data/wege-zellen` (window.WEGE_ZELLEN): bewohnte Zensus-2022-Zellen
  (100 m) im Stadtgebiet mit Einwohnern, Anteil unter 18 und ab 65 und Bezirk.
- `data/wege-zellen-<person>` (window.WEGE_ZELLEN_<PERSON>): je Person und
  Ziel ihrer Liste die Gehminuten zum nächsten und zweitnächsten Ort samt
  Ortsindex (aufgerundet, 255 = nicht in 60 Minuten), mit denselben Regeln wie
  `wege.js`, auch der Straßenseiten-Regel des Kindes. Die Seite lädt nur die
  Datei der gewählten Person.
- `data/wege-massnahmen.js` (nur `.js`): die von Hand gepflegten Maßnahmen plus
  berechnete Betroffene.
- `data/bezirke` (window.BEZIRKE): die 12 Stadtbezirke, auf etwa 5 m vereinfacht.
- `data/wege-adressen` (window.WEGE_ADRESSEN): rund 27.000 Hausadressen aus
  OpenStreetMap für die Adresssuche, je Straße gepackt (rund 300 KB).

Das Zensus-Gitter liegt in ETRS89-LAEA (EPSG:3035), die Bezirke der Stadt in
UTM 32 (EPSG:25832). Beide Umrechnungen nach WGS84 stehen im Skript (mit
Prüfwert aus der EPSG-Anleitung), ohne Zusatzbibliothek. Der erste Lauf lädt
rund 60 MB Zensus-Zips und drei Overpass-Abfragen; alles bleibt in
`scraper/.cache/wege/`. Am Ende druckt das Skript für jede der fünf Personen
eine Bezirkstabelle (Anteil mit Ziel in 15 Minuten) und die Betroffenen der
Sparplan-Maßnahmen. `pruefen.py` zählt Knoten, Bezirke und Einwohner nach und
prüft, dass `wege-personen.js` zur `.json` passt, jede Person ihre Zellendatei
hat und jede Maßnahme auf einen Ort in `wege-orte` und eine Nummer in
`hsk.json` zeigt.

## Datenquelle

Ratsinfoportal der Stadt Ingolstadt (SessionNet / Somacos „Session"), zwei
Instanzen:

- `ingolstadt.de/sessionnet` — Stadtrat, Ausschüsse
- `ingolstadt.de/sessionnetbza` — die zwölf Bezirksausschüsse

Ausschließlich öffentlich zugängliche Seiten, ohne Anmeldung. Der Scraper hält
1,2 Sekunden Pause je Abruf, schickt einen eigenen User-Agent und puffert im
Dateicache.

## Lizenz und Herkunft

Code MIT (siehe [LICENSE](LICENSE)), geschriebene Inhalte dieses Repositories
CC-BY-4.0.

PapierPanther baut auf dem **MeinBezirk-Toolkit von Igor Schwarzmann /
Known Unknowns GmbH** auf ([github.com/igor/meinbezirk](https://github.com/igor/meinbezirk),
CC-BY-4.0), aus dem die frühe Methodik und Teile der ursprünglichen
Oberflächenstruktur stammen. Scraper, Datenaufbereitung und die Ingolstädter
Anpassung — inklusive des kompletten Redesigns von `index.html` — sind in
diesem Repository entstanden. Details zur Herkunft: [NOTICE](NOTICE).
