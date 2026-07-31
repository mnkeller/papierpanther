# PapierPanther — Datenlage und Befunde

Hintergrunddokument zu [README.md](README.md). Stand: 31.07.2026.

**Zweck:** festhalten, was die Datenrecherche im Ingolstädter Ratsinfoportal
ergeben hat, und welche Fragen offen sind.

**Bewusste Beschränkungen:**

- ausschließlich öffentlich zugängliche Daten
- kein Kontakt zur Stadtverwaltung
- keine Spiegelung städtischer PDFs, nur Verlinkung

---

## Schnellstart

```bash
open "index.html"
```

Der Prototyp läuft ohne Webserver: `index.html` lädt keine externen Dateien, die
Daten stehen direkt in der Seite (geprüft — null Unterressourcen).

Daten neu holen und Feed neu bauen:

```bash
cd scraper && python3 ris_ingolstadt.py --von 2026-01 --bis 2026-07 && python3 feed_bauen.py
```

Nur Python-Standardbibliothek, keine Abhängigkeiten.

---

## Was die Datenrecherche ergeben hat

Das ist das eigentliche Ergebnis von Phase 2 des Toolkits — die Ingolstädter Datenlandschaft:

| Frage | Befund |
|---|---|
| Ratsinformationssystem | **SessionNet** ("Session" von Somacos GmbH & Co. KG), unter `ingolstadt.de/sessionnet` |
| Zweite Instanz | **`ingolstadt.de/sessionnetbza`** — eigenes Portal für die 12 Bezirksausschüsse, gleiche Software, gleicher Parser |
| OParl-Schnittstelle | **Nein.** Die Standard-Endpunkte (`/oparl`, `/oparl/v1.0/system`) antworten mit 404 |
| Bei *Politik bei uns* erfasst | **Nein.** Von 56 dort geführten Körperschaften ist Ingolstadt keine |
| RSS / iCal / API | **Keine gefunden** (`rss.php`, `ical.php`, `kalender.php` → 404) |
| robots.txt | Sperrt weder `/sessionnet/` noch `/sessionnetbza/` (geprüft 29.07.2026) |
| Datentiefe | Sitzungskalender reicht bis **2003** zurück |
| Livestreams | Stadtrat als Video, Ausschüsse als Audio, `ingolstadt.de/live` |
| Beteiligungsplattform | `ingolstadt-macht-mit.de` (bisher nicht ausgewertet) |
| Offenes Datenportal | Keines gefunden |

### Die Bezirksausschüsse sind der Fund

Ingolstadt hat **12 Bezirksausschüsse** und ist die einzige bayerische Stadt, die
sie freiwillig eingeführt hat (seit 1967). Ihre Tagesordnungen liegen in einer
eigenen SessionNet-Instanz und enthalten genau die hyperlokale Ebene, die dem
Stadtrat fehlt:

> „Tempo 30 auf der Gaimersheimer Straße" · „Schachtische im Piuspark" ·
> „Trinkbrunnen in der Kanalstraße" · „Basketballkorb für den Piuspark" ·
> „Mülleimer Wohnmobilstellplatz am Hallenbad" · „Gefährlicher Verkehr Kupferstraße"

Zwei Eigenheiten:

- **Keine Vorlagennummern.** In 186 geprüften BZA-Punkten kam keine einzige vor.
  Deshalb gibt es für BZA-Punkte keinen Beratungsstand — sie erscheinen trotzdem.
- **Viel Sitzungsroutine.** Etwa ein Drittel jeder BZA-Tagesordnung ist Formalie
  („Feststellung der Beschlussfähigkeit", „Genehmigung des Protokolls"). Diese
  Punkte werden in `ris_ingolstadt.py` über `VERFAHREN_MUSTER` markiert und aus
  der Aufbereitung herausgehalten, bleiben aber in den Rohdaten.

Die 12 Bezirke, wie sie das Portal führt: I-Mitte, II-Nordwest, III-Nordost,
IV-Südost, V-Südwest, VI-West, VII-Etting, VIII-Oberhaunstadt,
IX-Mailing/Feldkirchen, X-Süd, XI-Friedrichshofen/Hollerstauden,
XII-Münchener Straße.

**Konsequenz:** Es gibt keinen maschinenlesbaren Zugang. Die Daten müssen aus dem
HTML gelesen werden — genau der Fall, den das Toolkit als Regelfall in Deutschland
beschreibt. Der Parser in `scraper/ris_ingolstadt.py` leistet das.

Struktur, an der der Parser hängt (bei Portal-Updates die Bruchstelle):

- Monatsansicht: `si0040.php?__cjahr=JJJJ&__cmonat=M&__canz=1&__cselect=0`
- Sitzung mit Tagesordnung: `si0056.php?__ksinr=<id>`
- Vorlage: `vo0050.php?__kvonr=<id>`
- **Beratungsweg einer Vorlage: `vo0053.php?__kvonr=<id>`**
- Dokument: `getfile.php?id=<id>&type=do`
- Sitzungsdaten in `div.smc-table-cell.siname|sigrname|siort|sidat|yytime`
- Tagesordnungspunkte als `div.card.card-light` mit `span.badge` (Nummer) und
  `div.smc-card-text-title` (Titel), innerhalb `#smcaccordion`
- Beratungsstationen als `div#smcpanelN`, Kopfzeile im Format
  `01.07.2026 Ausschuss … TOP 3 öffentlich - Vorberatung`

---

## Der Beratungsstand

Aus `vo0053.php` lässt sich ohne einen einzigen PDF-Zugriff ablesen, welches
Gremium wann und **in welcher Rolle** befasst war. Gefundene Rollen: `Vorberatung`,
`Entscheidung`, `Bekanntgabe`. Unbekannte Rollen werden unverändert
durchgereicht, statt verworfen zu werden.

Daraus leitet `feed_bauen.py` den Stand ab, der als Filterachse und als Badge
erscheint:

| Stand | Bedeutung |
|---|---|
| Wird noch beraten | nur Vorberatung, keine Entscheidungsstation |
| Entscheidung geplant | Entscheidungsstation liegt in der Zukunft |
| Entscheidung angesetzt | Entscheidungsstation liegt in der Vergangenheit |
| Bekanntgabe | wird nur mitgeteilt, nicht beschlossen |
| Ohne Vorlage | mündliche Berichte und alle BZA-Punkte |

**Wichtige Einschränkung, bewusst so beschriftet:** Die Rolle ist die *geplante*
Rolle. „Entscheidung angesetzt" heißt **nicht**, dass der Beschluss gefasst wurde —
er kann vertagt worden sein. Deshalb steht dort nicht „entschieden", und die Karte
weist im aufgeklappten Bereich darauf hin, dass erst die Niederschrift das Ergebnis
belegt.

Der Stand ist ausdrücklich **kein Filter, der etwas versteckt**: ohne Auswahl
erscheinen alle Einträge, auch reine Beratungen ohne jede Entscheidung.

Eine Beobachtung aus dem Testlauf: Für Mai–Juli 2026 gibt es **keine** Einträge mit
„Wird noch beraten", weil alle Vorlagen dieses Zeitraums ihre Entscheidungsstation
schon hinter sich haben. Kommende Sitzungen stehen zwar im Kalender (Termin,
Gremium, Ort), aber **ohne Tagesordnung** — die wird erst mit der Ladung
veröffentlicht, etwa eine bis zwei Wochen vorher. Der Status funktioniert also, es
gibt derzeit nur keine Daten dafür; er füllt sich, sobald Oktober-Tagesordnungen
online sind. Die Logik ist mit synthetischen Fällen gegengeprüft.

---

## Aufbau

```
index.html                     Oberfläche + eingebettete Daten
impressum.html                 Impressum (§ 5 DDG)
datenschutz.html               Datenschutzerklärung
scraper/
  ris_ingolstadt.py            liest beide Portale aus       -> data/rohdaten.json
  entwuerfe_bauen.py           erzeugt Kurations-Vorschläge  -> data/kuration.json
  feed_bauen.py                Rohdaten + Kuration           -> data/feed.json
                               und setzt die Daten in index.html ein
  .cache/                      HTML-Cache, damit Wiederholläufe das Portal schonen
data/
  rohdaten.json                unveränderte Auslesung beider Quellen
  kuration.json                HAND-/MASCHINELL-GEPFLEGT: Klartext + Schlagworte
  feed.json                    erzeugt — nicht händisch ändern
```

`feed_bauen.py` schreibt in `index.html` nur den Bereich zwischen den Markern
`/* FEED-DATEN-ANFANG */` und `/* FEED-DATEN-ENDE */`. Gestaltung und Logik der
Seite kannst du frei bearbeiten, der Build überschreibt sie nicht.

Die **Trennung von `rohdaten.json` und `kuration.json` ist bewusst**: Neu-Scrapen
überschreibt niemals die aufbereiteten Texte. Verknüpft wird über den Schlüssel
`<quelle>:<sitzungs-id>#<top-nr>`, z. B. `stadt:13534#Ö 2` oder `bza:14155#Ö 5.1`.
Das Quellen-Präfix ist nötig, weil die Sitzungs-IDs der beiden Instanzen
grundsätzlich kollidieren können.

### Aufbereitung skalieren

`entwuerfe_bauen.py` erzeugt für alle offenen Punkte regelbasiert Vorschläge —
geputzter Titel, Schlagworte über Stichwortlisten, bei BZA-Punkten der Bezirk
automatisch aus dem Gremiennamen. Diese Einträge tragen `"entwurf": true` und
werden in der Oberfläche als *maschineller Entwurf* gekennzeichnet.

```bash
python3 entwuerfe_bauen.py --probelauf        # erst ansehen
python3 entwuerfe_bauen.py --quelle bza       # dann schreiben
```

Bestehende Einträge werden **nie** überschrieben. Der `klartext` bleibt bei
Entwürfen absichtlich leer — die Karte zeigt dann nur den Titel, statt Text zu
erfinden. Für sprachliche Nachbearbeitung schreibt `--prompt-bundle` die offenen
Punkte als Textdatei heraus.

Zwei Erfahrungswerte aus dem Bau: Bei den **BZA-Titeln reicht die Regelbasis**, weil
sie schon Alltagssprache sind („Basketballkorb für den Piuspark"). Bei
**Stadtrats-Titeln reicht sie nicht** — dort steckt die Übersetzungsleistung, und
die bleibt Handarbeit oder LLM-Arbeit. Deshalb sind derzeit nur die BZA-Punkte als
Entwürfe eingespielt.

Zu breite Stichwörter erzeugen falsche Zuordnungen, und die sind schädlicher als
fehlende. Aufgefallen und behoben: „markt" traf *Viktualienmarkt*, „pflege" traf
*Schwenkweiherpflege*, „kanal" traf *Kanalstraße*, „see" hätte *Museen* getroffen.
Die Listen arbeiten deshalb mit Wortgrenzen und zusammengesetzten Begriffen.

Aktueller Stand: **51 Sitzungen, 470 Tagesordnungspunkte** (Mai–Juli 2026) aus
beiden Quellen, davon 64 als Sitzungsroutine ausgesondert. Aufbereitet sind
**136 Einträge** — 22 von Hand, 114 maschinelle Entwürfe. `feed_bauen.py` meldet
am Ende, wie viele Punkte noch offen sind, und welche Einträge keinen Stadtbezirk
haben.

---

## Umgang mit Fehlern

Bewusste Entscheidung: **keine Einzelprüfung jedes Eintrags**, sondern ein klarer
Hinweis plus Quellenlink. Der Aufwand für redaktionelle Verifikation stünde in
keinem Verhältnis zum Nutzen eines Prototyps.

Konkret:

- Der Hinweisbalken oben sagt, dass die Texte automatisiert und mit KI aufbereitet
  sind, **Fehler enthalten können** und das Originaldokument maßgeblich ist.
- Jede Karte hat einen **immer sichtbaren Button „Im Ratsinfoportal prüfen"**, der
  direkt auf die Vorlage verlinkt — nicht erst nach dem Aufklappen.
- Aufgeklappt zeigt jede Karte zusätzlich den amtlichen Wortlaut sowie Links zu
  Sitzung, Vorlage und allen Anlagen.
- Die Oberfläche sagt an zwei Stellen, dass dies **kein Angebot der Stadt** ist.

**Was der Prototyp strukturell nicht zeigt:** Beschlussergebnisse. Was beraten
wurde, ist nicht, was entschieden wurde — siehe nächster Abschnitt.

---

## Befund: Beschlüsse und Sitzungsinhalte auswerten

Recherchiert am 29.07.2026 an echten Dokumenten. Ergebnis: **machbar und
überraschend billig** — die Protokolle reichen aus.

**Sind die Niederschriften öffentlich?** Ja. Der öffentliche Teil steht online im
Ratsinfoportal, als PDF am jeweiligen Sitzungseintrag. (Nur Kommissionen und
Beiräte sind ausschließlich vor Ort einsehbar, und auf Abschriften besteht kein
Anspruch — für das Lesen und Aufbereiten der Online-PDFs ist das unerheblich.)

**Abdeckung** (Stichprobe Sept.–Nov. 2025, 40 Sitzungen): 12 Sitzungen hatten eine
Niederschrift. Die Lücken sind fast ausschließlich Aufsichtsräte städtischer
GmbHs und Beiräte. Die politisch relevanten Gremien — Stadtrat und Fachausschüsse
— haben ihre Protokolle. **Wichtig:** Protokolle erscheinen erst nach Genehmigung
in der Folgesitzung, also mit **4–8 Wochen Verzug**. Im aktuellen Quartal lagen
nur 2 von 29 vor.

**Was drinsteht** — die Protokolle sind Verlaufsprotokolle mit namentlichen
Wortbeiträgen, und sie enthalten den Beschluss in einem klaren, maschinell
auffindbaren Muster:

```
Abstimmung über den Antrag der Verwaltung V0657/25:
Mit allen Stimmen:
1. Der Stadtrat befürwortet ...
```

In allen 12 Abstimmungen der Stichprobe lautete die Formel „Mit allen Stimmen" —
also einstimmig. Wie eine strittige Abstimmung notiert wird, ist damit **nicht
belegt**: Formulierungen wie „Stimmenmehrheit", „Gegenstimmen", „Enthaltung" oder
„abgelehnt" kamen in der Stichprobe **null Mal** vor. Zahlenmäßige
Stimmenverhältnisse werden nicht protokolliert. Das müsste an einer strittigen
Sitzung noch geprüft werden.

**Aufwand pro Protokoll** (gemessen):

| Protokoll | Seiten | Zeichen | ≈ Tokens |
|---|---|---|---|
| Sportausschuss 07.10.2025 | 10 | 16.700 | 4.200 |
| Stadtrat 08.10.2025 | 24 | 52.600 | 13.100 |
| Bauausschuss 15.10.2025 (33 TOPs) | 60 | 136.100 | 34.000 |

Grobrechnung: Kerngremien tagen etwa **4–6 Mal im Monat**, im Schnitt ~15.000
Tokens pro Protokoll → **grob 60.000–100.000 Tokens Eingabe pro Monat**. Das ist
für ein Sprachmodell wenig; die Kosten liegen im Bereich weniger Euro monatlich.
Der Textabruf selbst ist kostenlos: PDFs sind digital erzeugt, kein OCR nötig
(`pdfplumber` liest sie direkt).

**Günstiger Zwischenschritt ohne PDFs:** Der Reiter „Beratungen" jeder Vorlage
(`vo0053.php?__kvonr=<id>`) listet den Beratungsweg und markiert die Rolle jeder
Station explizit:

```
01.07.2026  Ausschuss für Sport ...  TOP 3  öffentlich - Vorberatung
29.07.2026  Stadtrat                 TOP 14 öffentlich - Entscheidung
```

Damit ist ohne jeden PDF-Zugriff erkennbar, **wo die Entscheidung fiel** und ob
sie schon gefallen ist. Nur der Beschlusstext selbst fehlt.

**Empfohlene Reihenfolge**, wenn das weiterverfolgt wird:

1. `vo0053.php` mitauslesen — billig, rein strukturell, unterscheidet sofort
   „wird noch beraten" von „ist entschieden"
2. Niederschriften-PDFs nur für Stadtrat und Fachausschüsse ziehen und den
   Abschnitt je TOP am Muster `Abstimmung über … / Mit … Stimmen:` herausschneiden
3. Erst diesen Ausschnitt (wenige hundert Zeichen statt 60 Seiten) aufbereiten —
   das drückt die Kosten um mehr als eine Größenordnung
4. Den Verzug von 4–8 Wochen offen ausweisen („Beschluss noch nicht protokolliert")

## Hosting — eingerichtet

Die Seite läuft auf **GitHub Pages** aus dem Repository
`github.com/mnkeller/papierpanther`, Branch `main`:
<https://mnkeller.github.io/papierpanther/>

`index.html` ist eine einzige Datei ohne externe Unterressourcen — ein `git push`
auf `main` genügt, um den Live-Stand zu aktualisieren.

**Offene Architekturfrage:** Die Feed-Daten stehen inline in `index.html`
(881 Bytes je Eintrag). Bei den aktuellen 136 Einträgen sind das 117 KB und
unproblematisch. Ein Rückstand von zwei Jahren (~2.600 Einträge, siehe unten)
ergäbe rund 2,3 MB in einer Datei, die vor dem ersten Bildaufbau vollständig
geladen und als ebenso viele Karten ins DOM gerendert wird. Spätestens dann
braucht es Auslagerung in eine separate JSON-Datei, Paginierung oder beides.

### Rechtliches — erledigt

- **Impressum** nach § 5 DDG: [impressum.html](impressum.html), verlinkt im
  Seitenfuß, mit Verantwortlichem nach § 18 Abs. 2 MStV.
- **Datenschutzerklärung**: [datenschutz.html](datenschutz.html). Die Seite
  setzt keine Cookies und bindet nichts Externes ein; personenbezogene Daten
  fallen nur über die Server-Logs von GitHub an (Drittlandübermittlung USA).
- Der Hinweis „kein offizielles Angebot der Stadt Ingolstadt" ist von einer
  Höflichkeit zu einer rechtlich relevanten Aussage geworden. Er steht im
  Hinweisbalken, im Fußtext und im Impressum.

### Wenn eine eigene Domain dazukommt

Bei Partei-Infrastruktur (netzbegruenung) wäre abzuwägen: Das Tool tritt als
neutrale Bürgerinformation auf. Auf Parteiservern gehostet kann diese Neutralität
in Frage stehen, unabhängig von der Qualität der Aufbereitung. Das ist eine
politische Entscheidung, keine technische.
- **Urheberrecht:** Beschlüsse, Vorlagen und Satzungen sind weitgehend amtliche
  Werke (§ 5 UrhG). Auf die Originaldokumente zu **verlinken** ist unproblematisch
  und genau das, was der Prototyp tut. Die PDFs der Stadt selbst zu spiegeln wäre
  eine andere Frage — und ist nicht nötig.
- **Rücksicht auf die Quelle:** Die Pause von 1,2 Sekunden pro Abruf, der eigene
  User-Agent und der Dateicache in `scraper/.cache/` sind kein Beiwerk. Wenn ein
  Server das automatisiert tut, gilt das erst recht. Ein voller Lauf über beide
  Portale sind rund 700 Abrufe; mit Cache bleiben es bei Wiederholung wenige.

## Bewertungsfragen

Wofür der Prototyp gebaut ist — diese Fragen sollte er beantworten:

1. **Relevanz:** Treffen die 136 Einträge, was Ingolstädter:innen wissen wollen?
   Die BZA-Punkte sind sehr konkret („Fahrradbügel Mauthstraße") — ist das die
   richtige Körnung, oder ist es zu kleinteilig?
2. **Mischung:** Stadtrat und Bezirksausschüsse stehen jetzt gleichrangig im
   selben Feed. Funktioniert das, oder gehören sie getrennt?
3. **Entwürfe:** Bei 114 Einträgen steht nur ein Titel, kein erklärender Satz, und
   sie sind als „maschineller Entwurf" markiert. Ist das brauchbar oder wirkt es
   unfertig?
4. **Achsen:** Trägt die Bezirksachse jetzt? Und ist der *Stand* verständlich —
   insbesondere die Unterscheidung „angesetzt" gegen „entschieden"?
5. **Sprache:** Bei den 22 handgemachten Einträgen — klar genug oder noch zu nah am
   Amtsdeutsch?
6. **Aufwand:** Die Schlagwortzuordnung trifft bei etwa zwei Dritteln der
   BZA-Punkte. Reicht das, oder braucht es doch eine LLM-Runde?
7. **Beschlüsse:** Reicht der Beratungsstand für einen ersten Nutzen, oder braucht
   es die Ergebnisse aus den Niederschriften? (Machbarkeit ist geklärt — siehe Befund.)

## Gemessen: wie groß ist der Rückstand von zwei Jahren?

Erhoben am 31.07.2026 für **August 2024 bis Juli 2026**, indem alle 48
Kalendermonate beider Portale gezogen wurden (exakte Sitzungszahl) und je Quelle
eine Zufallsstichprobe von 12 Sitzungen ausgewertet wurde (Verhältniszahlen).

| | Stadtrat + Ausschüsse | Bezirksausschüsse | gesamt |
|---|---|---|---|
| Sitzungen (exakt) | 251 | 109 | **360** |
| TOPs je Sitzung (Stichprobe) | 5,2 | 11,8 | — |
| TOPs hochgerechnet | ~1.320 | ~1.290 | **~2.610** |
| davon Sitzungsroutine | 6 % | 22 % | — |
| davon mit Vorlage | 57 % | **0 %** | — |

**Das ist deutlich weniger als eine lineare Hochrechnung aus dem Fenster
Mai–Juli 2026 ergibt** (die käme auf ~3.700 TOPs). Grund: 2026 ist
Kommunalwahljahr, die Monate nach der Konstituierung sind ungewöhnlich dicht —
im Juni 2026 tagten 12 Bezirksausschüsse, in ruhigen Monaten sind es 1 bis 3.

Konsequenz für die Aufbereitung:

- Die **~1.290 BZA-Punkte brauchen kein Sprachmodell**. Sie haben keine Vorlage
  (0 % — bestätigt den Befund oben), ihre Titel sind bereits Alltagssprache, und
  die Regelbasis in `entwuerfe_bauen.py` trifft sie.
- Die eigentliche Übersetzungsarbeit sind die **~750 Stadtrats-Punkte mit
  Vorlage** (57 % von ~1.320). Das ist die Menge, für die sich ein LLM lohnt —
  eine Größenordnung weniger als befürchtet.
- Ein vollständiger Scrape-Lauf über zwei Jahre sind rund **1.900 Abrufe**
  (360 Sitzungen + ~750 Beratungswege + ~750 Vorlagen), bei 1,2 s Pause etwa
  40 Minuten.

## Wenn es weitergeht

- **Kommende Sitzungen aufnehmen.** Der Kalender kennt Termine, für die noch keine
  Tagesordnung veröffentlicht ist (Gremium, Datum, Ort, aber kein
  `si0056.php`-Link). Genau dort kann man noch einwirken — das wäre der nächste
  naheliegende Ausbau, und er ist billig: nur die Kalendertabelle parsen.
- Beschlüsse aus Niederschriften erschließen (Reihenfolge im Befund oben).
- Die fünf Einträge ohne Stadtbezirk zuordnen — Weiherfeld, Sandrach,
  Unterbrunnenreuth und Baggersee habe ich absichtlich nicht geraten.
- Stadtrats-Entwürfe erzeugen (`entwuerfe_bauen.py --quelle stadt`, 231 Punkte) und
  sprachlich nachbearbeiten.
- Stadtratsanträge nach Fraktion (`vo0040.php`) als dritte Quelle erschließen.
- Erst dann: Hosting, Reichweite, Verwaltungskontakt (Phase 5 des Toolkits).

---

Methodik: MeinBezirk-Toolkit von Igor Schwarzmann, CC-BY-4.0.
Ingolstadt-Adaption und Parser: dieses Repository.
Datenquelle: Ratsinfoportal der Stadt Ingolstadt, öffentlich zugängliche Seiten.
