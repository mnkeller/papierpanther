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
