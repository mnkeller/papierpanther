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
  && python3 niederschriften_lesen.py && python3 feed_bauen.py \
  && python3 orte_bauen.py && python3 pruefen.py
```

Auslesen, Feed-Bau und `pruefen.py` brauchen nur die Python-Standardbibliothek.
Die Skripte, die PDFs lesen (Niederschriften, Haushalt, Sparplan, Vorlagen),
brauchen `pdfplumber` und `pypdf` (`pip install -r requirements.txt`). Die
Karten- und Wege-Skripte rufen zusätzlich `curl` auf.

Ohne `--no-cache` lädt `ris_ingolstadt.py` nur neu, was sich noch ändern kann:
Kalender ab dem Vormonat, Sitzungen der letzten 70 Tage und alle kommenden,
Beratungswege laufender Vorlagen. Alles Ältere kommt aus `scraper/.cache/`.

## Aufbau

```
index.html            Startseite: Auf einen Blick, Themen-Kacheln, alle Einträge
basis.css             Farben, Schriften, Kopf- und Fußzeile für alle Seiten
themenseite.css       Bausteine der Zahlen-Themenseiten (Legende, Kacheln, Quellen)
seiten/               das Skript jeder Seite (seiten/index.js gehört zu index.html)
seiten/hilfen.js      gemeinsame Hilfsfunktionen (esc, zahl, datum, el, svgEl), lädt vor dem Seitenskript
themen.html           Themen im Überblick (Kacheln mit je einer Kernzahl)
kopf.js               gemeinsame Kopfzeile aller Seiten (Start · Themen · So funktioniert's)
themen-kacheln.js     zeichnet die Themen-Kacheln aus data/themen.js
impressum.html        Impressum (§ 5 DDG)
datenschutz.html      Datenschutzerklärung
barrierefreiheit.html Erklärung zur Barrierefreiheit (Selbstprüfung)
KURATION.md           wie die Kurztexte entstehen (inkl. Einfache Sprache)
scraper/
  ris_ingolstadt.py   liest beide Portale aus       -> data/rohdaten.json
  entwuerfe_bauen.py  erzeugt Kurations-Vorschläge  -> data/kuration.json
  niederschriften_lesen.py  Beschlüsse aus Protokollen -> data/beschluesse.json
                            (+ data/niederschriften.json)
  feed_bauen.py       Rohdaten + Kuration           -> data/feed.json + feed.js
  orte_bauen.py       Orte der Einträge, Unfälle, Baustellen -> data/orte.js, unfaelle.js, baustellen.js
  anker_setzen.py     Titel-Anker in kuration.json prüfen und reparieren
  pruefen.py          Zusagen der Seite nachrechnen (Exit-Code)
  themen_bauen.py     Kennzahlen für die Themen-Kacheln -> data/themen.js
  inhalte_bauen.py    Inhaltskatalog aller Seiten mit Zahlen -> INHALTE.md
  beteiligungen_bauen.py  prüft data/beteiligungen.json -> data/beteiligungen.js
  plangebiete_holen.py  Umgriffe der Bebauungspläne (Land) -> data/plangebiete.js
  plaene_alt_holen.py Plan-Punkte vor 11/2023 (Stadtrat, Planungsausschuss) -> data/plaene_alt.json
  plaene_bauen.py     Ratsdaten + Landesdienst + Handdatei -> data/plaene.js
  waerme_bauen.py     Eignungsgebiete der Wärmeplanung (2035.de) + Adressen + Ratsdaten -> data/waerme.js
  baublock_bauen.py   Baublöcke des Energie-Atlas Bayern (Heizung, Baualter, Wärmebedarf) -> data/baublock.js
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

### Titel-Anker: Text und Tagesordnungspunkt gehören zusammen

Der Schlüssel eines Eintrags ist Sitzung plus TOP-Nummer, bei unnummerierten
Punkten die Position („Ö3"). Schiebt die Stadt per Nachtrag einen Punkt ein,
zeigt derselbe Schlüssel auf einen anderen Punkt. Jeder Eintrag merkt sich
deshalb in `titel_anker` den amtlichen Titel, zu dem er geschrieben wurde.
`feed_bauen.py` setzt den Anker bei neuen Einträgen selbst, `pruefen.py`
bricht ab, wenn Anker und Titel auseinanderlaufen.

```bash
python3 scraper/anker_setzen.py --zeigen      # was ist verrutscht?
python3 scraper/anker_setzen.py --umhaengen   # an den Punkt mit passendem Titel hängen
python3 scraper/anker_setzen.py --bestaetigen "stadt:13534#Ö 2"   # Titel nur umformuliert
```

### Aufbau der Seiten

Jede Seite besteht aus drei Teilen: der HTML-Datei mit ihrem eigenen
`<style>`-Block, dem Skript in `seiten/<name>.js` und den gemeinsamen Dateien
`basis.css`, `kopf.js` und `zaehler.js`. Was alle Seiten teilen (Farben,
Kopfzeile, Fußzeile, Sprunglink), steht nur in `basis.css`. In die HTML-Datei
gehört kein `<script>` mit Inhalt und kein `onclick=`: Die
Content-Security-Policy im `<head>` jeder Seite erlaubt nur Skripte aus eigenen
Dateien (`script-src 'self'`).

### Sicherheit

Die Seite zeigt Texte, die nicht von hier stammen: Titel aus dem
Ratsinfoportal, Zusammenfassungen eines Sprachmodells, Ortsnamen aus
OpenStreetMap. Drei Sicherungen greifen hintereinander:

1. **Maskieren bei der Ausgabe.** Fremder Text kommt per `textContent` auf die
   Seite oder läuft vor `innerHTML` durch `esc()`.
2. **Content-Security-Policy ohne `'unsafe-inline'` für Skripte.** Selbst wenn
   HTML durchrutscht, führt der Browser darin keinen Code aus.
3. **`pruefen.py`.** Links im Feed zeigen nur auf die erlaubten Hosts
   (`p_nur_erlaubte_hosts`), Namen aus OpenStreetMap, Fahrplan und Adressbestand
   enthalten keine HTML-Tags (`p_kein_html_in_fremddaten`).

Gegen manipulierte Vorlagen (versteckter Text, der dem Sprachmodell
Anweisungen gibt) steht eine Regel in [KURATION.md](KURATION.md).

Jeder kuratierte Eintrag trägt seine Texte in zwei Fassungen — normale Sprache
und **Einfache Sprache**. Beide entstehen im selben Arbeitsgang; die Regeln dafür
stehen in [KURATION.md](KURATION.md).

Hintergrund zur Datenlage, zum Beratungsstand und zu den offenen Fragen:
[PROTOTYP-INGOLSTADT.md](PROTOTYP-INGOLSTADT.md).

### Navigation und Themen-Kacheln

Alle Seiten laden `kopf.js`, das die Navigation in die Kopfzeile setzt; neue
Themenseiten dort in `THEMEN` eintragen (und in `scraper/themen_bauen.py`,
falls sie eine Kachel bekommen). Die Kacheln auf der Startseite und auf
`themen.html` zeigen je eine Zahl aus den Datendateien der Themenseiten:

```bash
cd scraper && python3 themen_bauen.py && python3 inhalte_bauen.py   # nach jedem Daten-Update
```

`inhalte_bauen.py` schreibt [INHALTE.md](INHALTE.md): je Seite Kernaussage,
Zahlen mit Stand, Quellen, Lizenz, Fallstricke und Ideen für Posts, dazu
kommende Sitzungen und die zuletzt entschiedenen Punkte. Der Katalog ist für
Arbeit außerhalb des Repos gedacht (Social Media, Vorträge) und lässt sich in
andere Projekte kopieren. Die Texte je Seite stehen im Skript (`SEITEN`); bei
einer neuen Themenseite dort einen Eintrag und eine Zahlenfunktion ergänzen.

### Grafische Fassung (`grafik/`)

Jede Themenseite und die Startseite hat unter der Hauptüberschrift den Schalter
„Text | Schaubild“. Bei „Schaubild“ blendet `grafik/kern.js` den Inhalt aus und lädt erst jetzt die
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
  Einfacher Sprache.

Beim neuen Mietspiegel (Befragung voraussichtlich 2. Quartal 2027) die Tabellen
komplett ersetzen. Angebotsmieten fehlen bewusst: Dafür gibt es keine offenen Daten.

### Sparplan / Haushaltssicherungskonzept (`hsk.html`)

```bash
cd scraper && python3 hsk_lesen.py
```

Liest das Haushaltssicherungskonzept (Vorlage V0652/26, Stadtrat 29.10.2026)
und schreibt `data/hsk.json` + `data/hsk.js` (window.HSK_DATEN). Grundlage ist
seit 23.11.2026 die zur Stadtratssitzung nachgereichte Fassung: Konzept „V2“
(Stand 28.10.2026) und Anlagen in der überarbeiteten Fassung vom 20.10.2026.
Gegenüber der ersten Fassung vom 15.10.2026 sind alle Zahlen gleich; gestrichen
ist das Zieljahr 2030 („schnellstmöglich“ statt „bis 2030“), deshalb ist
`ziel_jahr` in `hsk_bericht.json` leer und `ziel` beschreibt die Änderung.

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

### Baugebiete und Pläne (`plaene.html`)

```bash
cd scraper && python3 plangebiete_holen.py && python3 plaene_bauen.py && python3 themen_bauen.py
```

Anlass ist ein Antrag aus dem Bezirksausschuss Friedrichshofen/Hollerstauden
(25.02.2025): Der Stand von Bebauungs- und Grünordnungsplänen soll an einer
Stelle zu finden sein. Die Seite führt zwei Quellen zusammen:

- **Ratsinfoportal**: `plaene_bauen.py` sucht in `data/rohdaten.json` alle
  Punkte mit Planbezug, ordnet sie nach Plannummer, erkennt den
  Verfahrensschritt am Titel der Vorlage (Grundsatz, Aufstellung, Entwurf,
  Satzung) und sortiert die Anlagen nach Alltagsfragen (Verkehr, Lärm, Natur,
  Boden und Wasser …), ebenfalls nur nach dem Titel. `plaene_alt_holen.py`
  liest einmalig Stadtrat und Planungsausschuss von 2014 bis 10/2023 zurück
  und behält nur die Punkte mit Planbezug (`data/plaene_alt.json`);
  `rohdaten.json` bleibt unberührt. Für diese Jahre gibt es keine
  Abstimmungsergebnisse.
- **Bauleitpläne Bayern** (Landesamt für Digitalisierung, Breitband und
  Vermessung, CC BY-ND 4.0): `plangebiete_holen.py` holt für alle Ingolstädter
  Pläne Umgriff, Datum von Aufstellungsbeschluss, Satzungsbeschluss und
  Inkrafttreten und die Links zur geltenden Planzeichnung. Ob ein Plan gilt,
  steht nicht im Ratsinfoportal (das entscheidet die Bekanntmachung im
  Amtsblatt); „in Kraft“ kommt deshalb ausschließlich von hier, und
  `pruefen.py` wacht darüber. Der Dienst ist ein WMS ohne WFS und vereinfacht
  die Geometrie je nach Maßstab; wie das Skript damit umgeht, steht in seinem
  Kopf. Die Geometrien werden unverändert übernommen (ND).
- `data/plaene_hand.json`: Alltagsnamen („Am Samhof“ für 107 H), Stichworte,
  über die Punkte ohne Plannummer zugeordnet werden (vor allem aus den
  Bezirksausschüssen), Gleichsetzungen und Ausschlüsse.

Pläne der Nachbargemeinden, zu denen die Stadt nur gehört wird, fallen heraus.
Planzeichnungen und Gutachten werden nur verlinkt, nicht gespiegelt. Die
grafische Fassung ist `grafik/plaene.js` (Stadtkarte mit MapLibre wie bei
„Deine 15 Minuten“). `data/plangebiete.js` ist als eigene Ebene angelegt und
kann von anderen Karten mitgenutzt werden.

Nach einem Daten-Update genügt `plaene_bauen.py`; `plangebiete_holen.py`
(etwa drei Minuten, rund 450 Abfragen) lohnt, wenn ein Satzungsbeschluss
gefallen ist und das Inkrafttreten noch aussteht.

### Wärmeplan (`waerme.html`)

```bash
cd scraper && python3 waerme_bauen.py && python3 themen_bauen.py
```

Die Stadt zeigt die Eignungsgebiete ihrer kommunalen Wärmeplanung auf
https://2035.de/map/ als eingefärbte Flächen. Diese Seite nimmt dieselben
Flächen und beantwortet damit Fragen, die die Karte der Stadt offen lässt:

- **Adresse statt Farbe**: Wer Straße und Hausnummer eingibt, bekommt in einem
  Satz, in welchem Gebiet das Haus liegt, was der Plan dort vorsieht und was
  daraus folgt. Die Suche läuft im Browser (Adressen aus `data/wege-adressen.js`).
- **Je Stadtbezirk**: `waerme_bauen.py` ordnet jede der rund 27.000 Hausnummern
  der Fläche zu, in der sie liegt, und zählt je Bezirk. Das ist eine eigene
  Auswertung: Der Bericht zählt Gebäude aus dem Kataster und nennt keine
  Bezirkszahlen. Gegenprobe im Skript: 18.895 Adressen in
  Gas/Wärmepumpen-Prüfgebieten gegenüber „ca. 18.700 Gebäuden“ im Bericht (S. 80).
- **Was der Plan nicht ist**: nicht bindend (§ 23 Abs. 4 WPG), keine
  Anschlusszusage, kein Termin, kein Anschlusszwang. Der Bericht von 2024 und
  die Seiten von Stadt und Stadtwerken beschreiben noch die 65-Prozent-Regel
  des alten § 71 GEG; seit 29.07.2026 gilt das Gebäudemodernisierungsgesetz
  (§ 43 GModG). Der Rechtsstand ist am 14.11.2026 am Gesetzestext geprüft und
  steht mit Datum in `waerme.html` (`GEG`); bei einer Gesetzesänderung dort anpassen.
- **Seit dem Beschluss**: Einträge aus `data/feed.json`, von Hand ausgewählt
  (Liste `RAT` im Skript). Der Beschluss vom 22.10.2024 („gegen vier Stimmen“)
  ist aus der Niederschrift gelesen.

- **Heizung heute je Baublock**: `baublock_bauen.py` holt aus dem Dienst
  „Planungsgrundlagen Wärme“ des Landesamts für Umwelt (Energie-Atlas Bayern,
  CC BY 4.0) für rund 2.000 Baublöcke den überwiegenden Energieträger, das
  Baualter (beides Zensus 2022) und den modellierten Wärmebedarf und ordnet
  jeden Block einem Gebiet des Wärmeplans zu. Der Dienst gibt keine Geometrien
  als Daten heraus; das Skript rechnet sie aus dem SVG-Kartenbild zurück und
  prüft jede Fläche gegen die Flächenangabe des LfU. Wichtig beim Abruf: Ein
  Pixel muss in beiden Richtungen gleich viele Grad messen, sonst verschiebt
  der Dienst den Ausschnitt stillschweigend. Neu holen (rund 2.700 Abfragen,
  einige Minuten): `python3 baublock_bauen.py --neu`. Die Daten werden von der
  eigenen Domain ausgeliefert; Besucher rufen nichts beim LfU ab.

Die Zahlen aus dem Abschlussbericht (greenventory, 28.05.2024) stehen mit
Seitenzahl in `AUS_DEM_BERICHT` im Skript; sie stammen aus dem Fließtext, nicht
aus Tabellen oder Abbildungen. Die GeoJSON-Datei der Stadt trägt keine
Lizenzangabe (siehe NOTICE). Die grafische Fassung ist `grafik/waerme.js`
(Stadtkarte mit Adresssuche); der Knopf „Auf der Karte ansehen“ der Textseite
übergibt die Adresse dorthin. `pruefen.py` wacht über Flächenzahl, Summen und
Links. Wärmebedarf, Baualter oder Heizung je Gebäude gibt es nicht als offene Daten.

### Orte, Vorgänge und Unfälle (Startseite)

```bash
cd scraper && python3 feed_bauen.py && python3 orte_bauen.py && python3 pruefen.py
```

Drei Verknüpfungen machen aus der Liste der Einträge etwas, das man nach Ort
und Verlauf lesen kann. Alle drei entstehen automatisch und sagen das auf der
Seite auch.

- **Orte** (`orte_bauen.py` → `data/orte.js`): Das Skript sucht in Titel,
  Kurztext und im Feld `ort` jedes Eintrags von Stadtrat und
  Bezirksausschüssen nach Straßen (Verlauf aus dem OpenStreetMap-Auszug von
  `wege_bauen.py`), Hausnummern, benannten Einrichtungen und Bebauungsplänen
  (Zuordnung von `plaene_bauen.py`). Am 17.11.2026 trugen 873 von 3.708
  Einträgen mindestens einen Ort. Die Regeln stehen im Kopf des Skripts und
  sind vorsichtig: Ein Straßenname, den es mehrfach gibt, zählt nur im
  Bezirksausschuss des Bezirks, in dem er liegt; im Bezirksausschuss zählt
  ein Ort nur im eigenen Bezirk oder bis 300 m davor; Allerweltsnamen wie
  „Schulweg“ zählen nur im amtlichen Titel. `python3 orte_bauen.py --zeigen`
  druckt die häufigsten Namen und eine Stichprobe zum Gegenlesen.
- **Auf der Seite**: Jeder Ortsname an einem Eintrag ist ein Knopf und zeigt
  alles, was denselben Ort nennt (`?ort=<Name>` in der Adresse). „In meiner
  Nähe“ nimmt eine Adresse und einen Umkreis (300 m, 500 m, 1 km) und zeigt
  die Einträge, deren Ort in diesem Umkreis liegt; bei Straßen zählt der
  Abstand zum Verlauf, bei Bebauungsplänen der Umgriff aus
  `data/plangebiete.js`. Die Adresse bleibt im Browser und steht nicht in der
  Adresszeile. Im Schaubild der Startseite zeigt `grafik/orte.js` dieselben
  Orte auf der Stadtkarte.
- **Vorgänge** (`feed_bauen.py::ketten_setzen` → Feld `kette`): Punkte der
  Bezirksausschüsse haben keine Vorlage, über die der Feed sie bündeln könnte.
  Verbunden wird, was im selben Bezirksausschuss in verschiedenen Sitzungen
  dasselbe Aktenzeichen trägt und im Titel ein tragendes Wort teilt, oder was
  denselben Titel hat und kein Routinepunkt ist. Das Aktenzeichen allein
  reicht nicht, die Nummern werden doppelt vergeben (`2024-07-005` steht für
  ein Holztipi im Kindergarten und für E-Scooter-Stellplätze). Die Seite zeigt
  den Verlauf an der Karte und unter `?kette=<Kennung>`.
- **Unfälle** (`data/orte.js`, `data/unfaelle.js`): Bei Verkehrsthemen steht
  an der Straße, Kreuzung oder Adresse, wie viele Unfälle mit Verletzten der
  Unfallatlas dort in den letzten fünf Jahren verzeichnet (Straße: bis 15 m
  neben der Achse, Kreuzung: 35 m, Adresse: 50 m). Der Atlas enthält nur
  Unfälle mit Personenschaden, die die Polizei aufgenommen hat; die Seite
  nennt die Zahl mit Quelle und wertet nicht. `--neu` holt den Atlas frisch
  (fünf Jahre, rund 65 MB, im Cache bleiben nur die Ingolstädter Zeilen).
- **Baustellen** (`data/baustellen.js`): die Vorschau der Stadt für 14 Tage,
  bei jedem Lauf frisch geholt. Die Seite blendet abgelaufene Baustellen aus
  und nennt den Stand. Sie veraltet schnell; `pruefen.py` warnt nach 14 Tagen.

`pruefen.py` wacht darüber, dass `orte.json` zum aktuellen Feed gehört, jeder
Ort im Stadtgebiet liegt und gebraucht wird, die Unfallzahlen in sich stimmen,
Ketten nur Punkte eines Bezirksausschusses aus verschiedenen Sitzungen
verbinden und die Baustellen keine Kontaktadresse enthalten. Die Lärmkarte des
Landesamts für Umwelt ist nicht eingebunden: Der Dienst liefert nur ein
Kartenbild und an Hausadressen überwiegend keinen Wert.

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
und Bedingung stehen in `data/wege-personen.json` (in `wege.js` als `PERSONEN`,
`BEDINGUNGEN`) und werden auf der Seite als Tabelle gezeigt. Die Flächen werden geglättet (Schließen mit
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

**Unterwegs: zu Fuß, mit Bus, mit dem Rad.** Die Einzelansicht hat drei
Verkehrsarten. **Mit dem Rad** nutzt dasselbe Netz und dieselbe Suche wie zu Fuß,
mit eigenen Gewichten (`gewichteRad` in `wege.js`, `gewichte_rad` in
`wege_bauen.py`): Tempo je Person aus `rad_kmh` in `data/wege-personen.json`
(Erwachsene und Besucher:in 15 km/h, Ältere 12 km/h; Kind und Rollstuhl/Kinderwagen
haben kein Rad und sind dann nicht wählbar). Radwege, Radstreifen und Straßen ohne
Radverbot sind fahrbar; Gehwege, Fußgängerzonen und Treppen ohne `bicycle=yes`
sowie die Gegenrichtung von Einbahnstraßen (ohne `oneway:bicycle=no` oder
`cycleway=opposite*`) nur schiebend mit `verkehrsarten.rad.schieben_kmh`
(4 km/h), Treppen dazu mit Zuschlag; Kraftfahrstraßen (`motorroad=yes`) und
Straßen mit Radverbot ohne Gehweg sind gesperrt. Ampeln: Ampelknoten bis
`verkehrsarten.rad.kreuzung_m` (35 m) auseinander bilden eine Kreuzung (rund 190
in der Stadt); die Suche merkt sich je Knoten die Kreuzung, an der der beste Weg
zuletzt gewartet hat, und rechnet für weitere Ampelknoten derselben Kreuzung
keine Wartezeit (zu Fuß zählt weiter jeder Ampelknoten). Nacht gilt wie zu Fuß, Hitze
nicht (die Regel ist ein Umweg über Schatten für Fußgänger). Ringe 5/10/15
Minuten auf einem eigenen Raster über die erreichte Fläche (24 m), Ziel-Liste wie
zu Fuß; „Wenn dieser Ort schließt“ gibt es nur zu Fuß, weil die Zellen Gehminuten
enthalten.

**Ein neuer Ort** (Einzelansicht, zu Fuß und mit dem Rad): Man wählt eine Kategorie
aus der Zielliste der Person und setzt einen gedachten Ort auf die Karte. Der
Browser rechnet zweimal rückwärts zu den Zensus-Zellen (`rechneNeu` in `wege.js`):
von allen bestehenden Orten der Kategorie zugleich und vom neuen Ort aus, mit den
Gewichten der Person, der Verkehrsart und der Bedingung. Die Zahl sind die
Menschen (beim Kind unter 18, bei der älteren Person ab 65), die vorher keinen
Ort dieser Kategorie in 15 Minuten hatten und mit dem neuen einen hätten; ihre
Zellen erscheinen blau. Das Gegenstück ist „Wenn dieser Ort schließt“. Bei „Mit
Bus“ ist der Rechner ausgeblendet. Drogeriemarkt-Ketten (dm, Müller, Rossmann,
Budni) zählen nur als Drogerie, auch wenn OSM sie als `shop=supermarket` führt;
derselbe Ort zweimal (gleicher Name unter 50 m) zählt einmal.

**Einrasten ohne Inseln.** Startpunkt, Wohnzellen, Orte und Haltestellen rasten
auf die nächste Kante ein, die die Person nutzen kann und die zu einem Netzstück
mit mindestens `allgemein.insel_knoten_min` (50) Knoten gehört (`einrastbar` in
`wege.js` und `wege_bauen.py`). Kleinere Stücke sind Inseln, etwa ein
Bahnsteig, der für den Rollstuhl nur über Treppen angebunden ist, oder ein Bus-Halt
auf der Fahrbahn einer Hauptstraße ohne Gehweg (Kind). Orte und Haltestellen
bekommen dafür je Einrast-Maske (Personen zu Fuß und auf dem Rad) einen
Einstieg; `pruefen.py` meldet Haltestellen und Orte, die für eine Person nur über
eine Insel erreichbar wären.

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
`orte_bauen.py` → `grafik_bauen.py` → `themen_bauen.py` → `pruefen.py`. `wege_bauen.py` schreibt dabei
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
  Merkmal fallen weg, solange die Linie um höchstens 3 m abweicht. Fürs Rad
  tragen Kanten zusätzlich `rad` (fahren, schieben, gesperrt) und `einbahn`
  (bezogen auf die Richtung von → nach in der Datei). Nur die
  größte zusammenhängende Komponente bleibt. Grenze: 2 MB als `.js`.
- `data/wege-orte` (window.WEGE_ORTE): Alltagsorte in 31 Kategorien mit
  Einstiegsknoten (Drogerie, Kino, Fitnessstudio und Leihrad aus einer eigenen,
  kleinen Overpass-Abfrage `alltag`; Bürgerbüro und Carsharing gibt es in OSM für
  Ingolstadt nicht und fehlen deshalb); Flächen (Parks, Spielplätze, Sportanlagen, Schulhöfe)
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

Code unter der European Union Public Licence 1.2 (EUPL-1.2, siehe
[LICENSE](LICENSE)), geschriebene Inhalte dieses Repositories unter CC BY 4.0.
Wer eine veränderte Fassung weitergibt oder als Website betreibt, muss den
Quellcode ebenfalls unter der EUPL oder einer kompatiblen Lizenz offenlegen.
Stände vor der Umstellung am 18.11.2026 bleiben unter der MIT-Lizenz. Name,
Wortmarke und Maskottchen „PapierPanther“ sind nicht mitlizenziert. Die
kuratierten Ratsdaten in `data/` (Auslesung der Ratsinfoportale, Kurztexte,
Schlagworte, Ortszuordnungen, Zahlen aus HSK, Haushalt und
Beteiligungsbericht) stehen unter CC BY 4.0; welche Dateien genau dazugehören,
steht in [NOTICE](NOTICE). Alle übrigen Daten tragen die Lizenzen ihrer
Quellen.

PapierPanther folgt der Idee von **MeinBezirk**, einem Toolkit von Igor
Schwarzmann / Known Unknowns GmbH für kommunale Transparenz
([github.com/igor/meinbezirk](https://github.com/igor/meinbezirk)). Von dort
stammen die Anregung und die frühe Methodik, danke dafür. Das Repository ist
aus einer Kopie seines Berliner Prototyps hervorgegangen; seine Commits in der
Git-Historie behalten ihre Lizenzen MIT und CC BY 4.0. Im heutigen Stand ist
kein Code und kein Text daraus mehr enthalten. Details zur Herkunft:
[NOTICE](NOTICE).
