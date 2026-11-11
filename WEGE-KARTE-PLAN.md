# Deine 15 Minuten — Plan für die Erreichbarkeitskarte

Stand: 11.11.2026. Arbeitsgrundlage für die Umsetzung in einer eigenen Sitzung.
Dieses Dokument ist vollständig: Wer es liest, braucht den Entstehungsverlauf nicht.

## 1. Idee in einem Absatz

Die „15-Minuten-Stadt“ misst Zeit, nicht Erreichbarkeit. Dieselben 15 Minuten
sind für ein Kind, eine ältere Person, jemanden mit Kinderwagen oder Rollstuhl
und für eine Besucherin, die die Stadt nicht kennt, vier verschiedene Städte.
Und dieselbe Person erreicht nachts, bei 35 Grad oder mit einer gesperrten
Unterführung weniger als am Nachmittag im Mai. Die Karte zeigt deshalb nicht
einen Score, sondern **„die andere Stadt“**: Von einem gewählten Punkt aus, für
eine gewählte Person, unter gewählten Bedingungen, die tatsächlich erreichbare
Fläche und was darin liegt. Leitsatz aus dem Post von Francesco Procacci:
*Same 15 minutes. Different cities.*

Inspiration: LinkedIn-Post „15 minutes. For whom?“ (Procacci, 2026) und als
technischer Anstoß „How walkable is your city?“ (Milan Janosov, Substack,
12/2025). Der Substack-Post selbst rechnet nur Verbindungsgraphen auf dem
Autonetz, ohne Gehzeit und ohne Bevölkerung; er liefert nur die Grundidee
„OpenStreetMap plus Netzwerkdistanz“.

## 2. Was am Ende herauskommt

Eine neue Themenseite `wege.html` mit zwei Blicken:

**Blick 1 — Mein Punkt (die Hauptansicht).**
Klick auf die Karte, eigener Standort über den Browser oder eine Adresse aus
der OSM-Adressliste. Dann:
- Wahl der Person: Kind · Erwachsene (Maßstab) · Ältere Person · Mit Rad/Rollstuhl/Kinderwagen · Besucher:in.
- Wahl der Bedingungen: Tag/Nacht · Hitze · (später: Baustelle/Sperrung).
- Die Karte färbt, was in 5, 10 und 15 Minuten erreichbar ist.
- Eine Liste daneben: „Supermarkt 6 Min · Apotheke 12 Min · Spielplatz 4 Min ·
  Haltestelle 3 Min (Bus alle 20 Min) · Hausarzt: nicht in 15 Min“.
- Ein Knopf „Vergleichen“ legt eine zweite Person darüber: Die Fläche der
  Erwachsenen bleibt als Umriss stehen, die der älteren Person füllt sich darin.
  Das ist das Bild aus dem Post, nur echt und für die eigene Haustür.

**Blick 2 — Mein Bezirk (der politische Blick).**
Für jeden der zwölf Bezirksausschuss-Bezirke: Welcher Anteil der Menschen, die
dort wohnen, erreicht die Grundversorgung in 15 Minuten, je Person. Ranking,
Kachel-Zahl für die Startseite, Leichte Sprache. Dazu die Lücken-Karte: Wo
wohnen viele Ältere, und fehlt dort die Apotheke in Senioren-Reichweite? Wo
wohnen viele Kinder ohne sicheren Weg zum Spielplatz?

**Verknüpfung mit PapierPanther (das Alleinstellungsmerkmal).**
- Bezirksausschuss- und Stadtratsbeschlüsse mit Ortsbezug als Marker auf der
  Karte; Klick auf eine Zelle zeigt, was der zuständige Bezirksausschuss zuletzt
  dazu beraten hat (der Feed kennt den Bezirk je Eintrag).
- Was-wäre-wenn: Jede Zelle kennt den nächsten **und** den zweitnächsten Ort je
  Kategorie. Schließt eine Bücherei-Zweigstelle oder ein Supermarkt, zeigt ein
  Klick ohne Neuberechnung, wie viele Menschen wie viel Weg verlieren. Kopplung
  an Maßnahmen aus dem Sparplan (`hsk.html`).

### Was Besucherinnen und Besucher daraus mitnehmen

1. „Von meiner Haustür reicht es für X, nicht für Y.“ Konkret in Minuten, mit Ortsnamen.
2. „Für meine Mutter / mein Kind ist dieselbe Straße eine andere Stadt.“ Die
   Vergleichsansicht macht das in einem Bild klar.
3. „Nachts oder bei Hitze schrumpft mein Viertel.“ Bedingungen als Schalter.
4. „Mein Bezirk steht im Vergleich so da.“ Mit der Zahl, wie viele Menschen es betrifft.
5. „Dieser Beschluss betrifft genau diese Ecke.“ Politik wird räumlich lesbar.
6. „Hier fehlen Daten, hier kann ich mithelfen.“ Lücken im Gehweg-Tagging
   werden ehrlich gezeigt und auf die Beteiligen-Seite verlinkt.

## 3. Warum Bevölkerungsdaten nötig sind

Ohne Bevölkerung zeigt die Karte Fläche. Dann ist ein Gewerbegebiet ohne
Supermarkt genauso rot wie ein Wohnviertel ohne Supermarkt. Mit dem
Zensus-Gitter (100-Meter-Zellen mit Einwohnerzahl, Durchschnittsalter, Anteil
unter 18 und ab 65) kann die Karte drei Dinge, die sie sonst nicht kann:

1. **Zählen statt färben.** „81 % der Menschen in Mailing erreichen einen
   Supermarkt in 10 Minuten, in Zuchering 34 %.“ Das ist die Zahl, mit der man in
   einen Bezirksausschuss gehen kann. Fläche interessiert dort niemanden.
2. **Die richtige Person an den richtigen Ort rechnen.** Die Senioren-Reichweite
   ist dort wichtig, wo Seniorinnen wohnen; die Kinder-Reichweite dort, wo
   Kinder wohnen. Zelle für Zelle lässt sich „wer wohnt hier“ mit „was erreicht
   diese Person von hier“ verschneiden. Das Ergebnis ist eine Lücken-Karte, die
   nur die Stellen zeigt, an denen es wirklich jemanden trifft.
3. **Was-wäre-wenn in Betroffenen.** „Die Schließung trifft 2.300 Menschen,
   davon 600 über 65.“ Nicht „trifft 1,2 Quadratkilometer“.

Die Bevölkerungsdaten erscheinen auf der Karte nicht als eigene Ebene. Sie
sitzen unter der Haube und machen aus Flächen Menschen.

## 4. Personen und Bedingungen (Rechenmodell)

Alle Werte sind Startwerte, in einer Konstanten-Tabelle gebündelt und auf der
Seite „So funktioniert’s“ offengelegt. Die Zeit einer Kante ist
`Länge / Geschwindigkeit + Zuschläge`, manche Kanten sind je Person gesperrt.

| Person | Tempo | Gesperrt | Zuschläge | Eigene Ziele |
|---|---|---|---|---|
| Erwachsene (Maßstab) | 5,0 km/h | — | Ampel +30 s | Standardliste |
| Kind (ca. 6–10, allein unterwegs) | 3,6 km/h | Querung von Haupt- und Sammelstraßen ohne Ampel/Zebrastreifen; Straßen ohne Gehweg ab tertiary | Ampel +30 s | Grundschule, Spielplatz, Bolzplatz, Eis/Bäcker, Bücherei |
| Ältere Person | 3,2 km/h | — | Treppe +60 s/Lauf, Ampel +30 s, alle 300 m ohne Bank +30 s | Apotheke, Hausarzt, Supermarkt, Bank/Post, Bushaltestelle, Kirche, Toilette |
| Rad/Rollstuhl/Kinderwagen | 4,0 km/h | Treppen; Wege mit `wheelchair=no`; Bordstein ohne Absenkung (`kerb=raised`) | unbefestigt (`surface` Kies/Schotter) ×1,5, Kopfsteinpflaster ×1,3 | Standardliste plus barrierefreie Haltestelle, Toilette |
| Besucher:in | 4,5 km/h | — | Fußwege ohne Namen und Pfade ×2 (kennt die Abkürzung nicht); ÖPNV nur Direktverbindungen ab Hbf/Nordbahnhof/ZOB, +10 Min Umsteigezuschlag | Bahnhof, Tourist-Info, Toilette, Café, Sehenswürdigkeiten, Donauufer, Hotel, Apotheke |

Die Schwangere aus dem Post ist als eigene Gruppe nicht sinnvoll rechenbar; sie
steckt zwischen „Ältere Person“ (Tempo, Bänke, Toiletten) und „Kinderwagen“.
Auf der Seite wird das so gesagt.

| Bedingung | Wirkung |
|---|---|
| Nacht | Unbeleuchtete Kanten (`lit=no` oder ohne Tag bei Pfad/Park) ×1,5; für Kind gesperrt. Ehrlicher Hinweis: `lit` ist nur an 3.225 von 17.000 Wegen getaggt. |
| Hitze | Kanten ohne Baumschatten ×1,3 (Schätzung aus `natural=tree`, Wald, Park); Trinkwasserbrunnen (Datensatz der Stadt) und Hitzeschutz-Standorte (Sommerportal) als Ziele eingeblendet. |
| Steigung | Ingolstadt ist flach; nur Brückenrampen und Unterführungen. Keine Höhendaten nötig, Rampen über `incline` wenn vorhanden. |

Ingolstädter Besonderheiten, die die Karte sichtbar machen wird: Donau und
Bahnlinien als Barrieren (Brücken und Unterführungen als Nadelöhre), die
Glacis-Grünringe, das Audi-Werk als Loch im Netz, die Westpark-Achse.

## 5. Datenquellen (alle geprüft am 11.11.2026)

| Was | Quelle | Format / Lizenz | Hinweis |
|---|---|---|---|
| Fußwegenetz, Alltagsorte, Ampeln, Bänke, Toiletten, Bäume, Adressen | OpenStreetMap über Overpass, `area["de:amtlicher_gemeindeschluessel"="09161000"]` | JSON / ODbL | wie `scraper/altstadt_bauen.py`, mit Cache |
| Stadtbezirke (12) und Unterbezirke (62) | `https://www.ingolstadt.de/openbydata/GIS/Stadtbezirke_Ingolstadt.geojson`, `.../Unterbezirke_Ingolstadt.geojson` | GeoJSON, **EPSG:25832**, CC BY 3.0 DE | Properties `bezname`, `beznr`; nach WGS84 umrechnen |
| Bevölkerung, Alter | Zensus 2022 Gitterdaten: `https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Bevoelkerungszahl.zip`, `Durchschnittsalter_in_Gitterzellen.zip`, `Anteil_unter_18-jaehrige_in_Gitterzellen.zip`, `Anteil_ab_65-jaehrige_in_Gitterzellen.zip` | CSV im Zip (10 km, 1 km, 100 m) / Namensnennung | Koordinaten vermutlich ETRS89-LAEA (EPSG:3035), beim ersten Lauf an der Datensatzbeschreibung prüfen; nur Zellen im Stadtgebiet behalten |
| Fahrplan INVG/VGI | `https://www.vgi.de/FileServlet?gtfs=true` (12,7 MB) | GTFS / Nutzungsbedingungen `vgi.de/Nutzungsbedingungen_GTFS` | keine Standardlizenz, vor Veröffentlichung ganz lesen, Namensnennung |
| Trinkwasserbrunnen, Hitzeschutz-Standorte | Stadt Ingolstadt auf open.bydata | GeoJSON bzw. CSV | Suche: `https://open.bydata.de/api/hub/search/search?q=<Begriff>` |
| Grundkarte | Protomaps-Build, Ausschnitt mit `pmtiles extract` | PMTiles / ODbL | ca. 15 MB, selbst gehostet |

Nicht als Geodaten der Stadt verfügbar: Kitas, Schulen, Spielplätze (nur OSM).
Altersgruppen je Unterbezirk gibt die Stadt nur als Wanderungssalden, deshalb
Alter aus dem Zensus-Gitter.

OSM-Tagging-Dichte in Ingolstadt (11/2026): 17.081 Wege, davon 6.351
Fuß/Rad/Treppe; `sidewalk` an 1.980, `lit` an 3.225, `wheelchair` an 86 Wegen;
281 Treppen, 631 Bordstein-Knoten, 1.384 Querungen (991 taktil), 859 Bänke,
51 Toiletten, 2.432 Einzelbäume. Alltagsorte: 54 Supermärkte, 64 Bäcker,
27 Apotheken, 44 Arztpraxen, 42 Schulen, 57 Kitas, 201 Spielplätze, 59 Parks,
720 Haltestellen-Bahnsteige. Öffnungszeiten: Supermärkte 50/54, Ärzte 27/44.

## 6. Architektur

Alles Open Source, alles statisch, keine Abrufe bei Dritten, wie der Rest der
Seite. Der entscheidende Punkt: **Die Wegsuche läuft im Browser.** Personas und
Bedingungen ändern Kantengewichte; das geht nur live, wenn der Graph beim
Nutzer liegt. Das Ingolstädter Fußnetz hat etwa 60.000 Knoten und 70.000
Kanten, als gepackte Zahlenfelder 1 bis 2 MB; ein Dijkstra mit 15-Minuten-Grenze
berührt wenige tausend Knoten und läuft in Millisekunden.

```
scraper/wege_bauen.py      Overpass (Cache) + Zensus + Bezirke + GTFS  ->  data/wege-*.js
  Standardbibliothek wie altstadt_bauen.py; Projektion in Meter; eigener Dijkstra
  für die Bezirks-Statistik (Blick 2) und die Zweitnächsten-Orte.
data/wege-netz.js          Knoten (lat, lon), Kanten (von, nach, Länge, Typklasse,
                           lit, Treppe, Oberfläche, Gehweg, Querungstyp, Schatten)
                           als Int-Arrays; window.WEGE_NETZ
data/wege-orte.js          Orte: Kategorie, Name, Einstiegsknoten (Flächen über
                           Randpunkte angebunden, nicht über den Mittelpunkt),
                           Öffnungszeiten-Flag; window.WEGE_ORTE
data/wege-zellen.js        Zensus-Zellen im Stadtgebiet (~6.000 bewohnte): Einwohner,
                           Anteil u18/ü65, Bezirk, je Person und Kategorie Minuten zum
                           nächsten und zweitnächsten Ort (quantisiert, 1 Byte)
data/bezirke.js            12 Bezirke als vereinfachtes GeoJSON in WGS84
data/wege-oepnv.js         Haltestellen mit Takt je Zeitfenster (Mo–Fr 7–9, 12–14,
                           20–22, Sa, So), später Haltestelle-zu-Haltestelle-Zeiten
karten/ingolstadt.pmtiles  Grundkarte, Ausschnitt Stadtgebiet
vendor/maplibre-gl/        MapLibre GL JS (BSD-3), vendor/pmtiles/ (BSD-3),
                           Protomaps-Basisstil, Glyphen und Sprites selbst gehostet
wege.html + wege.js        Karte, Dijkstra, Personas, Panel, Vergleich, Bezirksblick
```

Browser-Bibliotheken: MapLibre GL JS statt Leaflet, weil Vektorkacheln und
6.000 gefüllte Zellen flüssig bleiben. Keine Geocoder-API: Adresssuche über
eine lokale Liste aus OSM-Adressen (`addr:street` + `addr:housenumber`,
gepackt etwa 1 MB), Standort über die Browser-Geolocation ohne Übermittlung.

GitHub Pages liefert Bereichsanfragen für die PMTiles-Datei; vor Phase 2 einmal
mit `curl -r 0-1023` gegen die Live-Seite prüfen. Datei bleibt unter 50 MB.

Konventionen des Projekts, die gelten: Python nur Standardbibliothek; Skripte
schreiben `data/*.json` + `data/*.js`; `pruefen.py` bekommt Kontrollzahlen;
`kopf.js` bekommt den Eintrag in `THEMEN`; `scraper/themen_bauen.py` die
Kachel-Zahl; jede Seite in normaler und Leichter Sprache; Datenschutz-Seite um
Geolocation ergänzen (nur im Browser, nichts verlässt das Gerät). Vorschau nur
über die Scratchpad-Kopie (siehe Memory „Vorschau über Scratchpad-Kopie“).

## 7. Phasen mit Abnahme

**Phase 1 — Daten (ohne Karte).**
`wege_bauen.py` holt Netz, Orte, Zensus-Zellen, Bezirke; baut den Graphen;
rechnet für die Person „Erwachsene“ und sechs Kategorien (Supermarkt, Apotheke,
Hausarzt, Grundschule, Spielplatz, Haltestelle) die Minuten je Zelle.
Abnahme: Tabelle je Bezirk „Anteil Einwohner mit Supermarkt in 15 Min“, die
plausibel ist (Mitte hoch, Zuchering/Etting niedrig); `pruefen.py` grün;
`wege-netz.js` unter 2 MB; Knotenzahl, Kantenzahl, Ortszahlen im Skript-Log.

**Phase 2 — Karte, Blick 1.**
`wege.html` mit Grundkarte, Klick/Standort/Adresse, Dijkstra im Browser,
Isochronen 5/10/15, Liste der Ziele mit Minuten, Person „Erwachsene“ und
„Ältere Person“, Vergleichsmodus. Eintrag in Kopf und Themen-Kacheln.
Abnahme: Klick am Rathausplatz zeigt Supermarkt und Apotheke unter 10 Minuten;
Klick in Zuchering zeigt die Lücken; Umschalten der Person braucht unter 100 ms;
keine Netzabrufe außer zur eigenen Domain (Netzwerk-Tab leer).

**Phase 3 — Alle Personen und Bedingungen.**
Kind, Rad/Rollstuhl/Kinderwagen, Besucher:in; Nacht, Hitze; Hinweise auf
Datenlücken je Bedingung; „So funktioniert’s“ mit der Konstanten-Tabelle.
Abnahme: Bei „Kind“ enden Isochronen an Hauptstraßen ohne Ampel; bei
„Rollstuhl“ fehlen Treppenabgänge zur Donau; Besucher:in startet am Hauptbahnhof.

**Phase 4 — Blick 2 und Politik.**
Bezirksvergleich je Person, Lücken-Karte (Alter × Reichweite), Beschlüsse als
Marker, Was-wäre-wenn über Zweitnächsten-Orte, Kopplung an Sparplan-Maßnahmen.
Abnahme: Kachel-Zahl auf der Startseite; ein HSK-Beispiel rechnet Betroffene aus.

**Phase 5 — ÖPNV und Grafisch.**
Bus-Reichweite aus GTFS je Zeitfenster („wohin in 30 Minuten, sonntags 20 Uhr“),
große Ziele (Klinikum, Hauptbahnhof, THI, Audi, Theater) als eigene Liste;
grafische Fassung in `grafik/wege.js`; Mapping-Aufruf auf der Beteiligen-Seite.

Phasen 1 und 2 sind der tragfähige Kern. Die Datenstruktur aus Phase 1 trägt
alle späteren Phasen ohne Umbau, wenn die Kanten von Anfang an alle Attribute
aus Abschnitt 6 bekommen.

## 8. Offene Punkte

- Nutzungsbedingungen der VGI vollständig lesen; falls Weitergabe der Rohdaten
  eingeschränkt ist, nur abgeleitete Taktwerte veröffentlichen.
- ODbL: Die abgeleiteten Datendateien sind eine abgeleitete Datenbank und
  werden unter ODbL mitveröffentlicht; Hinweis in `NOTICE`.
- Zensus-Gitter: Koordinatensystem und Spaltennamen in der
  Datensatzbeschreibung prüfen (lokal gespeichert, XLSX).
- Protomaps-Ausschnitt: Zoomstufen 10 bis 16 reichen; Glyphen und Sprites
  müssen mit in `vendor/`, sonst lädt der Browser bei Protomaps nach.
- Öffnungszeiten: nur als Hinweis („Sonntag geschlossen“), nicht als Rechenfaktor.
