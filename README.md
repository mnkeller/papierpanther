# PapierPanther

Was der Ingolstädter Stadtrat entscheidet, und wen es betrifft.

Die Tagesordnungen des Stadtrats und der zwölf Bezirksausschüsse sind öffentlich —
aber in Amtsdeutsch, verteilt über hunderte Einzelpunkte in einem Ratsinfoportal,
das niemand freiwillig durchsucht. PapierPanther liest sie aus, übersetzt sie in
normale Sprache und sortiert sie danach, wen sie betreffen.

**Kein offizielles Angebot der Stadt Ingolstadt.** Verbindlich ist immer das
Originaldokument — jeder Eintrag verlinkt seine Quelle.

Live: https://mnkeller.github.io/papierpanther/

## Schnellstart

```bash
open index.html
```

Die Seite läuft ohne Webserver: `index.html` lädt keine externen Dateien, die
Daten stehen direkt in der Seite.

Daten neu holen und Feed neu bauen:

```bash
cd scraper && python3 ris_ingolstadt.py --von 2026-01 --bis 2026-07 && python3 feed_bauen.py
```

Nur Python-Standardbibliothek, keine Abhängigkeiten.

## Aufbau

```
index.html            Oberfläche + eingebettete Daten
impressum.html        Impressum (§ 5 DDG)
datenschutz.html      Datenschutzerklärung
KURATION.md           wie die Kurztexte entstehen (inkl. Leichte Sprache)
scraper/
  ris_ingolstadt.py   liest beide Portale aus       -> data/rohdaten.json
  entwuerfe_bauen.py  erzeugt Kurations-Vorschläge  -> data/kuration.json
  feed_bauen.py       Rohdaten + Kuration           -> data/feed.json
                      und setzt die Daten in index.html ein
  .cache/             HTML-Cache, schont das Portal bei Wiederholläufen
data/
  rohdaten.json       unveränderte Auslesung beider Quellen
  kuration.json       Klartext + Schlagworte, hand- und maschinengepflegt
  feed.json           erzeugt — nicht händisch ändern
```

`feed_bauen.py` schreibt in `index.html` nur den Bereich zwischen den Markern
`/* FEED-DATEN-ANFANG */` und `/* FEED-DATEN-ENDE */`. Gestaltung und Logik der
Seite bleiben unangetastet.

Die Trennung von `rohdaten.json` und `kuration.json` ist bewusst: Neu-Scrapen
überschreibt niemals die aufbereiteten Texte.

Jeder kuratierte Eintrag trägt seine Texte in zwei Fassungen — normale Sprache
und **Leichte Sprache**. Beide entstehen im selben Arbeitsgang; die Regeln dafür
stehen in [KURATION.md](KURATION.md).

Hintergrund zur Datenlage, zum Beratungsstand und zu den offenen Fragen:
[PROTOTYP-INGOLSTADT.md](PROTOTYP-INGOLSTADT.md).

## Datenquelle

Ratsinfoportal der Stadt Ingolstadt (SessionNet / Somacos „Session"), zwei
Instanzen:

- `ingolstadt.de/sessionnet` — Stadtrat, Ausschüsse
- `ingolstadt.de/sessionnetbza` — die zwölf Bezirksausschüsse

Ausschließlich öffentlich zugängliche Seiten, ohne Anmeldung. Der Scraper hält
1,2 Sekunden Pause je Abruf, schickt einen eigenen User-Agent und puffert im
Dateicache.

## Lizenz und Herkunft

Code MIT, Inhalte CC-BY-4.0 — siehe [LICENSE](LICENSE).

PapierPanther baut auf dem **MeinBezirk-Toolkit von Igor Schwarzmann /
Known Unknowns GmbH** auf (CC-BY-4.0), aus dem die Methodik und Teile der
Oberfläche stammen. Scraper, Datenaufbereitung und die Ingolstädter Anpassung
sind in diesem Repository entstanden.
