# PapierPanther: Inhaltskatalog

Erzeugt von `scraper/inhalte_bauen.py` am 23.11.2026. Nicht von Hand ändern: Texte stehen im Skript (`SEITEN`), Zahlen kommen aus `data/`.

Wozu: Wer über PapierPanther schreibt, postet oder vorträgt, findet hier jede Seite mit Kernaussage, Zahlen, Quellen, Lizenz und Fallstricken, ohne das Repository zu durchsuchen. Die Datei lässt sich in andere Projekte kopieren.

## Grundsätzliches

- Website: https://schanzer-papierpanther.de/ (Schanzer PapierPanther). Kein offizielles Angebot der Stadt Ingolstadt.
- Idee: Was der Ingolstädter Stadtrat entscheidet, und wen es betrifft. Tagesordnungen in Klartext und Einfacher Sprache, sortiert nach Betroffenheit.
- Haltung: erklärt, bewertet nicht. Parteipolitisch neutral. Verbindlich ist immer das Originaldokument, jeder Eintrag verlinkt es.
- Jede Seite gibt es in Alltagssprache, Einfacher Sprache und als Schaubild (`#grafisch` an die Adresse hängen).
- Lizenzen: Code EUPL-1.2; eigene Texte CC BY 4.0; kuratierte Ratsdaten CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“. Fremddaten behalten ihre Lizenz (bei jeder Seite genannt). Name, Wortmarke und Maskottchen „PapierPanther“ sind nicht mitlizenziert.
- Kurztexte entstehen teils mit einem Sprachmodell und werden nach den Regeln in `KURATION.md` geprüft.

## Seiten

### Startseite: alle Einträge aus Stadtrat und Bezirksausschüssen

Adresse: https://schanzer-papierpanther.de/

**Worum es geht:** Jeder öffentliche Tagesordnungspunkt von Stadtrat, Ausschüssen, den zwölf Bezirksausschüssen und dem Bezirk Oberbayern in Klartext und Einfacher Sprache, sortiert nach Lebenslage, Stadtbezirk und Anlass. Jeder Eintrag verlinkt Sitzung, Vorlage und Dokumente der Stadt.

**Was man dort tun kann:** Filter nach Bezirk, Lebenslage und Stand; Orte an Einträgen anklickbar (`?ort=`); „In meiner Nähe“ mit Umkreis; Vorgangsketten der Bezirksausschüsse (`?kette=`); Unfallzahlen an Verkehrsthemen; Baustellen der nächsten 14 Tage; kommende Sitzungstermine.

**Zahlen** (Daten abgerufen 23.11.2026, Feed gebaut 23.11.2026):

- 667 Sitzungen und 6.568 Tagesordnungspunkte ausgelesen (2023-11 bis 2027-01), davon 4.303 als Eintrag in Klartext
- Einträge je Quelle: Stadtrat und Ausschüsse 2.182, Bezirksausschüsse 1.548, Bezirk Oberbayern 573
- 1.655 Einträge auch in Einfacher Sprache
- Stand der Einträge: Im Bezirksausschuss behandelt 1.548, Nur besprochen, nichts entschieden 1.266, Beschlossen 631, Bekanntgabe 337, Entscheidung angesetzt 264, Noch nicht terminiert 143, Wird noch beraten 53, Steht auf der Tagesordnung 26, Entscheidung geplant 21, Abgelehnt 13, Teilweise beschlossen 1
- 875 von 3.730 Einträgen tragen einen Ort (496 verschiedene Orte)
- Unfallatlas 2021–2025: 3.326 Unfälle mit Verletzten im Stadtgebiet
- Einträge je Stadtbezirk: stadtweit 1.011, I-Mitte 343, IV-Südost 196, II-Nordwest 171, V-Südwest 164, VII-Etting 145, III-Nordost 140, XII-Münchener Straße 139, X-Süd 131, XI-Friedrichshofen/Hollerstauden 100, VI-West 96, VIII-Oberhaunstadt 47, IX-Mailing/Feldkirchen 36

**Schaubild:** Schaubild mit Szenen „start“, „orte“ (Stadtkarte mit Orten der Einträge) und „themen“.

**Quellen und Lizenz:** Ratsinfoportale der Stadt (SessionNet) und des Bezirks Oberbayern; Kurztexte teils mit Sprachmodell. Lizenz der kuratierten Ratsdaten: CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“. Unfallatlas: dl-de/by-2-0. Baustellen: Stadt Ingolstadt, CC BY 4.0. Orte/Straßen: OpenStreetMap, ODbL.

**Vorsicht:** Verbindlich ist immer das Originaldokument. „Nur besprochen“ heißt nicht beschlossen. Unfallatlas zählt nur Unfälle mit Verletzten, die die Polizei aufgenommen hat. Baustellen veralten nach 14 Tagen.

**Ideen für Posts:** Wochenvorschau „Das kommt in den Rat“; Beschluss der Woche erklärt; „Was dein Bezirksausschuss gerade macht“; ein Ort, viele Vorgänge.

### Anträge der Parteien

Adresse: https://schanzer-papierpanther.de/antraege.html

**Kachel:** 391 Anträge der Stadtratsfraktionen in dieser Wahlperiode – 168 davon noch auf keiner Tagesordnung.  
*Einfache Sprache:* Das wollen die Parteien im Stadt-Rat. 168 Anträge sind noch nicht besprochen.

**Worum es geht:** Alle Anträge der Stadtratsfraktionen in der Wahlperiode, je Fraktion, mit Klartext und Stand: in Beratung oder noch auf keiner Tagesordnung.

**Was man dort tun kann:** Je Partei aufklappbar, Stand je Antrag, Link zum Antrag als PDF.

**Zahlen** (abgerufen 23.11.2026):

- 391 Anträge der Stadtratsfraktionen in dieser Wahlperiode
- 223 davon schon in Beratung, 168 noch auf keiner Tagesordnung
- Je Fraktion: SPD 77, CSU 69, BÜNDNIS 90/DIE GRÜNEN 44, ÖDP 38, Freie Wähler 35, Gemeinschaftsanträge 35, AfD 29, Die Linke 21, UWG 20, FDP/JU 20, Die Linke/ÖDP 3

**Schaubild:** Szene „antraege“.

**Quellen und Lizenz:** Ratsinfoportal der Stadt. CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“.

**Vorsicht:** Zahl der Anträge sagt nichts über Qualität oder Erfolg; Gemeinschaftsanträge eigens gezählt. Parteipolitisch neutral bleiben, keine Rangliste als Wertung.

**Ideen für Posts:** „Liegt seit Monaten: Anträge ohne Termin“; ein Antrag aus jeder Fraktion zum selben Thema.

### Haushalt: das Geld der Stadt

Adresse: https://schanzer-papierpanther.de/haushalt.html

**Kachel:** 919,8 Mio. € will die Stadt 2026 ausgeben. Wofür – und woher das Geld kommt.  
*Einfache Sprache:* So viel Geld will die Stadt 2026 ausgeben.

**Worum es geht:** Einnahmen und Ausgaben der Stadt, Verwaltungs- und Vermögenshaushalt, Referate, Plan gegen Ergebnis der Vorjahre, Schulden und Rücklage.

**Was man dort tun kann:** Aufschlüsselung nach Referaten und Hauptgruppen, Zeitreihe seit 2022.

**Zahlen** (Haushaltsplan 2026):

- Ausgaben 2026 gesamt: 919,8 Mio. € (Verwaltungshaushalt 740,9 Mio. €, Vermögenshaushalt 178,9 Mio. €)
- Lücke im Verwaltungshaushalt 2026: 66,1 Mio. €
- Neue Kredite für Investitionen 2026: 97,8 Mio. €
- Schulden Kernhaushalt: 2023 0,0 Mio. € (ergebnis), 2024 20,0 Mio. € (ergebnis), 2025 44,5 Mio. € (vorlaeufig), 2026 249,6 Mio. € (plan)
- Schulden je Einwohner: 2023 0 € (amtlich), 2024 142 € (berechnet), 2025 315 € (berechnet), 2026 1.768 € (plan), 2027 2.356 € (plan), 2028 2.833 € (plan), 2029 3.327 € (plan)
- Größter Zuschussbedarf je Referat: Kultur und Bildung 80,5 Mio. €, Soziales, Jugend und Gesundheit 63,3 Mio. €, Recht, Sicherheit und Ordnung 30,6 Mio. €

**Schaubild:** Szene „haushalt“.

**Quellen und Lizenz:** Haushaltsplan und Vorbericht der Stadt Ingolstadt. CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“.

**Vorsicht:** Plan ist nicht Ergebnis; Schulden je Einwohner ab 2024 selbst berechnet, bis 2023 amtlich.

**Ideen für Posts:** „Von 100 € gibt die Stadt so viel aus für …“; Schulden von 0 auf … in drei Jahren.

### Sparplan (Haushaltssicherungskonzept)

Adresse: https://schanzer-papierpanther.de/hsk.html

**Kachel:** 79,0 Mio. € muss die Stadt im Schnitt pro Jahr einsparen (2026–2029). Wo, steht im Sparplan.  
*Einfache Sprache:* So viel Geld muss die Stadt jedes Jahr sparen.

**Worum es geht:** Wo die Stadt bis 2029 sparen will: Maßnahmenkatalog mit Beträgen je Jahr, Stand jeder Maßnahme, freiwillige Leistungen einzeln, Schuldenszenarien mit und ohne Sparen. Jede Maßnahme in Klartext und Leichter Sprache.

**Was man dort tun kann:** Maßnahmen nach Bereich und Stand; Betroffene einzelner Maßnahmen auf der Karte „Deine 15 Minuten“.

**Zahlen** (Konzept Stand 28.10.2026):

- Sparziel im Schnitt 79,0 Mio. € pro Jahr (2026–2029), das sind im Schnitt 12,6 % des bereinigten Verwaltungshaushalts
- Sparziel je Jahr: 2026 70,1 Mio. €, 2027 71,8 Mio. €, 2028 76,9 Mio. €, 2029 97,2 Mio. €
- Schulden September 2026: 125 Mio. €; ohne Sparen im Jahr 2036 rund 803 Mio. € (Trendszenario, S. 47)
- 47 Maßnahmen im Katalog, Stand: ohne Angabe 15, beschlossen 11, verwaltung 9, beratung 5, geplant 4, offen 2, erwartet 1
- 210 freiwillige Leistungen einzeln aufgelistet (Anlage 5)

**Schaubild:** Szene „sparplan“.

**Quellen und Lizenz:** Haushaltssicherungskonzept, Vorlage V0652/26 (Stadtrat 29.10.2026), Anlagen 1 und 5, mit Seitenangaben. CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“.

**Vorsicht:** Viele Beträge sind Schätzungen der Verwaltung; „geplant“ ist nicht „beschlossen“. Seitenzahlen beim Zitieren mitnennen.

**Ideen für Posts:** Karussell „5 Maßnahmen, die du merkst“; was eine Million im Haushalt bedeutet; Schulden-Szenario 2036.

### Unternehmen der Stadt

Adresse: https://schanzer-papierpanther.de/beteiligungen.html

**Kachel:** 49 Unternehmen gehören der Stadt ganz oder teilweise, von den Stadtwerken bis zum Klinikum. Für Busse, Bäder und Eishallen legt der Haushalt jährlich 8 bis 20 Mio. € dazu.  
*Einfache Sprache:* So viele Firmen gehören der Stadt. Zum Beispiel die Stadt-Werke und das Kranken-Haus.

**Worum es geht:** Stadtwerke, Klinikum, Busse, Bäder und weitere Beteiligungen: wem was gehört, wer wem zahlt, wo der Haushalt zuschießt. Gibt wieder, was im Beteiligungsbericht steht, ohne zu bewerten.

**Was man dort tun kann:** Neun Alltagsbereiche (Wohnungen, Wasser, Busse …); Waage „Energiegewinn, Verlust, Einlage“ der Stadtwerke.

**Zahlen** (Beteiligungsbericht 2026 der Stadt Ingolstadt (Oktober 2026)):

- 49 Unternehmen, an 28 hält die Stadt die Mehrheit
- 5.976 Beschäftigte, Vermögen 2.249 Mio. €, Investitionen 161 Mio. €
- Kredite der Unternehmen: 1.182 Mio. €, davon der Stadt zugerechnet 90 Mio. € (Busse 40, Freizeit 50)
- Einlage der Stadt für Busse, Bäder, Eishallen: 8 bis 20 Mio. € im Jahr
- Alltagsbereiche auf der Seite: Wohnungen, Wasser, Abwasser, Müll, Gewerbeflächen, Parkhäuser, Strom, Gas, Wärme, Bäder, Eishallen, Glasfaser, Busse, Sanierte Altbauten, Krankenhaus

**Schaubild:** Szene „waage“ mit Reglern (vereinfachte Rechnung, Annahmen in der Fußzeile).

**Quellen und Lizenz:** Beteiligungsbericht 2026, Vorlage V0569/26, jede Zahl mit Seitenzahl. CC BY 4.0, Namensnennung: „PapierPanther, Michael Keller, schanzer-papierpanther.de, CC BY 4.0“.

**Vorsicht:** Berichtsjahr 2025, bei Stadtwerken das Geschäftsjahr 10/2024–9/2025.

**Ideen für Posts:** „Dein Bus, dein Bad, dein Wasser: gehört alles der Stadt“; wer den Busverkehr bezahlt.

### Klima

Adresse: https://schanzer-papierpanther.de/klima.html

**Kachel:** 9.750 Solaranlagen gibt es in Ingolstadt (2026), dazu 1.538 öffentliche Ladepunkte. Plus: Wetter seit 1961.  
*Einfache Sprache:* So viele Anlagen machen in Ingolstadt Strom aus Sonne.

**Worum es geht:** Wetter seit 1961 (heiße Tage, Tropennächte, Frosttage), Solaranlagen und Speicher, öffentliche Ladepunkte, Klimaziele und Treibhausgasbilanz der Stadt.

**Was man dort tun kann:** Zeitreihen je Jahr, Vergleich mit Referenzperiode 1971–2000.

**Zahlen** (erzeugt 23.11.2026):

- 9.750 Solaranlagen mit 127,7 MW (2026), Zubau 2026: 1.404 Anlagen, davon 671 Steckersolar
- 1.538 öffentliche Ladepunkte an 869 Standorten, 222 davon Schnelllader (Stand 12.11.2026)
- Wetter: Station Kösching, Tageswerte seit 1961
- Heiße Tage (ab 30 °C): Mittel 1971–2000 5,6, 2025: 17, 2026 bis 22.11.2026: 40; Höchstwert 40 (2026). Mitteltemperatur 2025: 10,1 °C (Referenz 8,2 °C)
- Ziel klimaneutral: Stadt 2035, Verwaltung 2030 (Stadtratsbeschluss Juni 2022)
- CO₂-Minderung nötig 89.500 t/Jahr, erreicht 70.500 t/Jahr (Durchschnitt seit 2019, Bilanzjahr 2023); Industrie-Anteil 2021: 48 %

**Schaubild:** Szenen „klima“ und „sonne“ (Altstadt in 3D mit Sonnenstand).

**Quellen und Lizenz:** Deutscher Wetterdienst (Station Kösching), Marktstammdatenregister, Ladesäulenregister der Bundesnetzagentur, Fortschrittsberichte der Stabsstelle Klima. Lizenzen der jeweiligen Quellen.

**Vorsicht:** Station Kösching liegt außerhalb der Stadt (dieselbe wie im Bericht der Stadt). Industrie macht rund die Hälfte der Emissionen aus.

**Ideen für Posts:** „So viele heiße Tage wie nie“; Balkonkraftwerke-Boom; Ziel 2035 und wie weit wir sind.

### Wärmeplan

Adresse: https://schanzer-papierpanther.de/waerme.html

**Kachel:** 21 % der Adressen liegen in einem Gebiet, das der Wärmeplan für Fernwärme vorsieht, 69 % in einem Prüfgebiet mit Gasleitung. Was steht für Ihre Adresse drin?  
*Einfache Sprache:* So viele Häuser liegen in einem Gebiet für Fern-Wärme. Was steht im Plan für Ihr Haus?

**Worum es geht:** Was die kommunale Wärmeplanung für jede Adresse vorsieht (Fernwärme, Prüfgebiet Gas/Wärmepumpe, Einzelversorgung), Zahlen je Stadtbezirk, Heizung heute je Baublock und was der Plan nicht ist.

**Was man dort tun kann:** Adresssuche mit Antwort in einem Satz; Karte mit Baublöcken; Ratsbeschlüsse seit dem Plan.

**Zahlen** (Adressen Stand 14.11.2026):

- 27.244 Hausadressen ausgewertet (eigene Auswertung, keine Zahl der Stadt)
- Wärmenetz-Gebiet: 21 % (davon später: 1.190 Adressen), Prüfgebiet Gas/Wärmepumpe: 69 %, Einzelversorgung: 8 %
- Anteil Wärmenetz je Bezirk: Nordwest 60 %, Mitte 49 %, Nordost 41 %, Friedrichshofen-Hollerst. 34 %, Südost 24 %, Münchener Straße 16 %, Mailing 13 %, Südwest 0 %, West 0 %, Etting 0 %, Oberhaunstadt 0 %, Süd 0 %
- Beschluss: Stadtrat 22.10.2024, Gegen vier Stimmen beschlossen (V0651/24), genannte Kosten 290 Mio. €
- Rechtsstand: Seit 29.07.2026 gilt § 43 GModG, die 65-Prozent-Regel des alten GEG ist weg

**Schaubild:** Szene „waerme“ (Stadtkarte mit Adresssuche).

**Quellen und Lizenz:** Eignungsgebiete der Stadt (2035.de, ohne Lizenzangabe), Abschlussbericht greenventory 28.05.2024, Energie-Atlas Bayern/LfU (CC BY 4.0), Adressen OpenStreetMap (ODbL).

**Vorsicht:** Plan ist nicht bindend, keine Anschlusszusage, kein Termin, kein Anschlusszwang. Seit 29.07.2026 gilt § 43 GModG; Seiten von Stadt und Stadtwerken nennen noch die alte 65-Prozent-Regel. Bezirkszahlen sind eigene Auswertung.

**Ideen für Posts:** „Kommt Fernwärme in meine Straße?“; Mythos-Check 65-Prozent-Regel; Bezirksvergleich.

### Wohnen

Adresse: https://schanzer-papierpanther.de/wohnen.html

**Kachel:** 62,6 % der Haushalte wohnen zur Miete. Wem die Wohnungen gehören und wie viele leer stehen (Zensus 2022).  
*Einfache Sprache:* So viele Haushalte wohnen zur Miete. Und: Wem gehören die Wohnungen?

**Worum es geht:** Mieten oder besitzen, wem die Wohnungen gehören, Leerstand, was die Stadt tun kann und was nicht, Wohnen im Haushalt, Stadtratsvorgänge. Erklärt statt fordert.

**Was man dort tun kann:** Vergleich Zensus 2011 und 2022; Werkzeuge der Stadt im festen Raster.

**Zahlen** (Zensus 2022 (Stichtag 15.05.2022), abgerufen 23.10.2026):

- 67.430 Haushalte, 62,6 % wohnen zur Miete, 37,4 % im Eigentum
- Weitere Zahlen der Seite (Eigentümer, Leerstand, Vergleich 2011): direkt in data/wohnen.js

**Schaubild:** Szene „wohnen“.

**Quellen und Lizenz:** Zensus 2022, © Statistische Ämter des Bundes und der Länder, dl-de/by-2-0.

**Vorsicht:** Zensuszahlen von 2022, nächster Zensus 2031.

**Ideen für Posts:** „Fast zwei Drittel wohnen zur Miete“; wem Ingolstadts Wohnungen gehören.

### Miete

Adresse: https://schanzer-papierpanther.de/miete.html

**Kachel:** bis 31.10.2027 gilt der Mietspiegel. Rechnen Sie nach, was für Ihre Wohnung üblich ist – und wo die Mietpreisbremse greift.  
*Einfache Sprache:* Wie viel Miete ist üblich? Hier können Sie es ausrechnen.

**Worum es geht:** Mietspiegel-Rechner (was für die eigene Wohnung üblich ist), Mietpreisbremse und Kappungsgrenze, Ablauf, Ausnahmen, wer profitiert.

**Was man dort tun kann:** Rechner im Browser, Eingaben werden nicht gespeichert.

**Zahlen** (Mietspiegel November 2025):

- Mietspiegel gilt bis 31.10.2027, Rechner läuft nur im Browser
- Mietpreisbremse und Kappungsgrenze gelten in Ingolstadt (Bayerische Mieterschutzverordnung, Anlage 1.1.1)
- Neuer Mietspiegel: Befragung voraussichtlich 2. Quartal 2027

**Schaubild:** Szene „miete“.

**Quellen und Lizenz:** Mietspiegel-Broschüre November 2025, Bayerische Mieterschutzverordnung.

**Vorsicht:** Angebotsmieten fehlen bewusst (keine offenen Daten). Keine Rechtsberatung.

**Ideen für Posts:** „Zahlst du zu viel? In 1 Minute nachrechnen“; Mietpreisbremse in 3 Sätzen.

### Baugebiete und Pläne

Adresse: https://schanzer-papierpanther.de/plaene.html

**Kachel:** 16 Pläne im Verfahren und 427 geltende Bebauungspläne: wie weit jeder ist, mit Planzeichnung, Gutachten und den Beratungen im Bezirksausschuss.  
*Einfache Sprache:* So viele Pläne für neue Bau-Gebiete macht die Stadt gerade. Hier sehen Sie: Wie weit ist jeder Plan?

**Worum es geht:** Stand jedes Bebauungsplans: Grundsatz, Aufstellung, Entwurf, Satzung, in Kraft; mit Planzeichnung, Gutachten nach Alltagsfragen (Verkehr, Lärm, Natur …) und Beratungen im Bezirksausschuss. Angestoßen durch einen Antrag des BZA Friedrichshofen/Hollerstauden.

**Was man dort tun kann:** Suche nach Plan, Bezirk und Stand; Umgriffe auf der Karte.

**Zahlen** (Stand 10.11.2026):

- 16 Bebauungspläne im Verfahren, 427 in Kraft
- Zuletzt bewegt: Nr. 935 Solarpark Winden südlich B16 (Süd, satzung, 29.10.2026); Nr. 114 M Ä II Südlich der Stinnesstraße (Nordwest, entwurf, 28.10.2026); Nr. 196 Friedrichshofen - Dachsberg (Friedrichshofen-Hollerst., entwurf, 27.10.2026); Nr. 107 H Am Samhof (Friedrichshofen-Hollerst., kraft, 27.10.2026); Nr. 120 C Ä I Wohnen an der Weningstraße (Südost, kraft, 08.10.2026)

**Schaubild:** Szene „plaene“ (Stadtkarte).

**Quellen und Lizenz:** Ratsinfoportal (CC BY 4.0) und Bauleitpläne Bayern (LDBV, CC BY-ND 4.0).

**Vorsicht:** Umgriffe und Planzeichnungen aus Bauleitpläne Bayern: CC BY-ND, also nicht verändern, nicht zuschneiden oder einfärben. Ob ein Plan gilt, entscheidet die Bekanntmachung im Amtsblatt.

**Ideen für Posts:** „Was wird hier gebaut?“ je Plan; ein Plan von der Idee bis zur Satzung.

### Deine 15 Minuten

Adresse: https://schanzer-papierpanther.de/wege.html

**Kachel:** 48 % der Menschen ab 65 erreichen in ihrem Tempo eine Apotheke in 15 Minuten zu Fuß, in Oberhaunstadt 0 %. Wie ist es bei Ihnen?  
*Einfache Sprache:* So viele ältere Menschen haben eine Apotheke in der Nähe. Wie ist es bei Ihnen?

**Worum es geht:** Was man von einem Punkt in 5, 10 und 15 Minuten zu Fuß erreicht, für fünf Personen und unter Nacht- und Hitzebedingungen; Auswertung je Bezirk; Betroffene von Sparplan-Maßnahmen.

**Was man dort tun kann:** Adresse oder Standort eingeben, Person wählen, Erreichbarkeit auf der Karte; „Alle Personen“ als Schichtbild; Wegsuche im Browser.

**Zahlen** (Zensus-Gitter 2022 und OpenStreetMap):

- Fünf Personen (Erwachsene, Kind, ältere Person, Rollstuhl/Kinderwagen, Besucher:in), zwei Bedingungen (Nacht, Hitze)
- Ziele: Apotheke, Hausarzt, Supermarkt, Bank/Post, Haltestelle, Kirche, Toilette, Drogerie
- Kernzahl siehe Kachel oben; Bezirkstabellen druckt scraper/wege_bauen.py

**Schaubild:** Szenen „wege“ und „wege-apotheke“.

**Quellen und Lizenz:** OpenStreetMap (ODbL), Zensus-Gitter 2022 (dl-de/by-2-0), Fahrplan VGI (GTFS), Bezirke der Stadt.

**Vorsicht:** Bezirkswerte hängen daran, ob OpenStreetMap ein Ziel kennt; 0 % in einem Bezirk nicht als Schlagzeile verwenden. Gehtempo je Person ist eine Annahme (Tabelle auf der Seite).

**Ideen für Posts:** „Kommt deine Oma zu Fuß zur Apotheke?“; Kind allein zur Schule; Hitze-Wege.

### Beteiligen

Adresse: https://schanzer-papierpanther.de/beteiligen.html

**Kachel:** 12 Bezirksausschüsse vertreten die Stadtteile. Wer dort für Sie sitzt, der Mängelmelder und Projekte zum Mitmachen.  
*Einfache Sprache:* So können Sie in Ihrem Stadt-Teil mitreden.

**Worum es geht:** Wie man mitreden kann: gewählte Vertreter:innen im Bezirksausschuss ansprechen, Mängelmelder, Beteiligungsprojekte der Stadt, eigene Projektideen (MitmacherINnen), Wege und Orte in OpenStreetMap eintragen.

**Was man dort tun kann:** Bezirk wählen und sehen, wer dort sitzt; Links zu Mängelmelder und Projekten.

**Zahlen**:

- 12 Bezirksausschüsse, je einer pro Stadtbezirk

**Schaubild:** Szene „beteiligen“.

**Quellen und Lizenz:** Stadt Ingolstadt.

**Vorsicht:** Namen von Mitgliedern nur in ihrer öffentlichen Rolle nennen.

**Ideen für Posts:** „Dein Bezirksausschuss: Wer, wann, wo“; so stellst du einen Antrag im BZA.

## Aktuell aus dem Rat

Stand 23.11.2026. Veraltet schnell, vor einem Post auf der Seite gegenprüfen.

### Kommende Sitzungen

- 24.11.2026 16:00 Uhr: Ausschuss für Kultur und Bildung
- 24.11.2026 18:30 Uhr: Bürgerversammlung XII - Münchener Straße
- 25.11.2026 16:00 Uhr: Inklusionsbeirat
- 26.11.2026 16:00 Uhr: Ausschuss für Stadtentwicklung, Bau, Umwelt und Nachhaltigkeit
- 01.12.2026 17:30 Uhr: Bezirksausschusses I-Mitte
- 03.12.2026 16:00 Uhr: Ausschuss für Finanzen und Personal
- 08.12.2026: Bezirksausschusses XI-Friedrichshofen/Hollerstauden
- 10.12.2026 10:00 Uhr: Stadtrates
- 11.12.2026 17:30 Uhr: Jugendparlamentes
- 17.12.2026: Bezirksausschusses IV-Südost
- 19.01.2027 16:00 Uhr: Jugendhilfeausschusses
- 26.01.2027 16:00 Uhr: Ausschusses für Sport, Veranstaltungen und Freizeit

### Zuletzt entschieden

Ein Ergebnis steht erst fest, wenn die Niederschrift erschienen ist; das dauert oft Wochen.

- 29.07.2026, Stadtrat: Neue Regeln für den Baggersee (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23032)
- 29.07.2026, Stadtrat: Gebühren der Kommunalbetriebe werden neu berechnet (Gegen 3 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23181)
- 29.07.2026, Stadtrat: Seniorenpolitisches Gesamtkonzept 2026 (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22705)
- 29.07.2026, Stadtrat: Weiherfeld Süd: Bebauungsplan im letzten Schritt (Mit 46 : 2 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23055)
- 29.07.2026, Stadtrat: Musikschule: Gebühren und Regeln werden neu gefasst (Mit 46 : 3 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23030)
- 29.07.2026, Stadtrat: Selbsthilfegruppen können Zuschüsse länger beantragen (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22908)
- 29.07.2026, Stadtrat: Peter-Steuart-Haus schließt 2025 mit 390.000 Euro Fehlbetrag (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23042)
- 29.07.2026, Stadtrat: Volkshochschule: Jugendparlament bekommt erstmals einen Sitz (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23161)
- 29.07.2026, Stadtrat: Kommunalbetriebe planen mit bis zu 213 Millionen Euro Krediten (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23176)
- 29.07.2026, Stadtrat: Neue Satzungen für Müll, Wasser, Abwasser und Straßenreinigung (Mit 48 : 0 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23180)
- 29.07.2026, Stadtrat: Wirtschaftsförderungsgesellschaft IFG macht 3,55 Millionen Euro Verlust (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23129)
- 29.07.2026, Stadtrat: Bürgerhaus: Hausmeister und Seniorenbüro werden halbiert (Gegen 3 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23184)
- 29.07.2026, Stadtrat: Musikschule: Gebühren sollen regelmäßig steigen (Gegen 3 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23232)
- 29.07.2026, Stadtrat: Stadtteiltreffs sollen mehr einnehmen, Filiale im Piusviertel kommt (Gegen 3 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23163)
- 29.07.2026, Stadtrat: Feuerwehr bekommt zwei neue Drehleitern für 2,6 Millionen Euro (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23099)
- 29.07.2026, Stadtrat: Fahrradbeirat wird aufgelöst und durch einen Runden Tisch ersetzt (Gegen 5 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23037)
- 29.07.2026, Stadtrat: Klimabeirat wird aufgelöst und durch ein formloses Format ersetzt (Mit 45 : 2 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23092)
- 29.07.2026, Stadtrat: Kommission für Seniorenarbeit bekommt eine neue Satzung (Mit 47 : 1 Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23068)
- 29.07.2026, Stadtrat: Städtische Wohnungsbaugesellschaft macht 4,87 Millionen Euro Gewinn (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23126)
- 29.07.2026, Stadtrat: Gutachterausschuss für Grundstückswerte wird neu besetzt (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23093)
- 29.07.2026, Stadtrat: Dritter Bürgermeister darf künftig Trauungen vornehmen (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23114)
- 29.07.2026, Stadtrat: Stellungnahme der Verwaltung zum Badesteg am Baggersee (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23237)
- 01.07.2026, Ausschuss für Sport, Veranstaltungen und Freizeit: Außenbestuhlung für zwei Lokale in der Altstadt (Gegen 1 Stimme) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22916)
- 16.06.2026, Ausschuss für Finanzen und Personal: Container-Krippe „Schatztruhe“ bleibt bis 2027 (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22922)
- 11.06.2026, Ausschuss für Stadtentwicklung, Bau, Umwelt und Nachhaltigkeit: Neue Straße im Gewerbegebiet südlich der Manchinger Straße wird gewidmet (Mit allen Stimmen) – [Quelle](https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22930)
- … und 411 ältere, siehe Startseite

## Weiterlesen im Repository

- `README.md`: Technik, Datenwege, Skripte
- `KURATION.md`: Regeln für Kurztexte und Einfache Sprache
- `PROTOTYP-INGOLSTADT.md`: Datenlage und Befunde
- `NOTICE`: Lizenzen im Einzelnen
