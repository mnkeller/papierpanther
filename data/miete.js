/* Von Hand gepflegt: Daten fuer miete.html.
   Quelle der Mietspiegel-Werte: "Fortschreibung 2025 des qualifizierten
   Mietspiegels 2023 fuer die Stadt Ingolstadt", DOMUS Consult, Bericht vom
   06.05.2025, Tab. 2 (Basismiete) und Tab. 3 (Zu- und Abschlaege), Abschnitt
   4.2 (Spanne). Massgeblich ist die amtliche Broschuere "Qualifizierter
   Mietspiegel fuer nicht preisgebundenen Wohnraum November 2025" (Tabelle 1
   und 2); sie weicht beim Aufzug ab (+6 % statt +5 % im Bericht), hier gilt
   der Wert der Broschuere. Bei einem neuen Mietspiegel (Befragung voraussichtlich
   2. Quartal 2027) diese Datei komplett abgleichen. */
window.MIETE_DATEN = {
  stand: "2026-10-23",
  mietspiegel: {
    titel: "Qualifizierter Mietspiegel Ingolstadt 2025–2027",
    gueltig_ab: "01.11.2025",
    gueltig_bis: "31.10.2027",
    erhebung_stichtag: "01.12.2022",
    erhebung_zeitraum: "Dezember 2022 bis März 2023",
    haushalte_angeschrieben: 10000,
    ersteller: "DOMUS Consult",
    anerkannt: "Stadtrat, 30.10.2025, mit allen Stimmen",
    fortschreibung: { methode: "Verbraucherpreisindex", vpi_alt: 113.2, vpi_neu: 120.5, prozent: 6.45, faktor: 1.0645,
      zeitraum: "Dezember 2022 bis Dezember 2024" },
    spanne: { unten: -21, oben: 20 },
    flaeche_min: 25, flaeche_max: 160,
    /* Basismiete netto kalt in €/m². [von, bis, Wert]; Flaechen werden nach
       unten auf volle m² gerundet (25,99 m² -> Feld 25). */
    basismiete: [
      [25, 25, 11.03], [26, 26, 10.82], [27, 27, 10.62], [28, 28, 10.44], [29, 29, 10.27],
      [30, 30, 10.11], [31, 31, 9.97], [32, 32, 9.84], [33, 33, 9.71], [34, 34, 9.59],
      [35, 35, 9.48], [36, 36, 9.38], [37, 37, 9.28], [38, 38, 9.19], [39, 39, 9.10],
      [40, 40, 9.02], [41, 41, 8.94], [42, 42, 8.87], [43, 43, 8.80], [44, 44, 8.74],
      [45, 45, 8.68], [46, 46, 8.61], [47, 47, 8.56], [48, 48, 8.51], [49, 49, 8.46],
      [50, 50, 8.41], [51, 51, 8.37], [52, 52, 8.32], [53, 53, 8.28], [54, 54, 8.24],
      [55, 55, 8.21], [56, 56, 8.16], [57, 57, 8.13], [58, 58, 8.10], [59, 59, 8.07],
      [60, 60, 8.05], [61, 64, 7.97], [65, 68, 7.88], [69, 72, 7.80], [73, 76, 7.74],
      [77, 80, 7.70], [81, 84, 7.65], [85, 88, 7.61], [89, 92, 7.58], [93, 96, 7.56],
      [97, 124, 7.54], [125, 139, 7.56], [140, 149, 7.61], [150, 160, 7.66]
    ],
    /* Zu- und Abschlaege in Prozent auf die Basismiete; sie werden addiert. */
    baujahr: [
      { id: "b1899", n: "bis 1899", l: "vor 1900", wert: 12 },
      { id: "b1918", n: "1900 – 1918", l: "1900 bis 1918", wert: -11 },
      { id: "b1948", n: "1919 – 1948", l: "1919 bis 1948", wert: -8 },
      { id: "b1960", n: "1949 – 1960", l: "1949 bis 1960", wert: 0 },
      { id: "b1969", n: "1961 – 1969", l: "1961 bis 1969", wert: -3 },
      { id: "b1980", n: "1970 – 1980", l: "1970 bis 1980", wert: -9 },
      { id: "b1989", n: "1981 – 1989", l: "1981 bis 1989", wert: 8 },
      { id: "b1995", n: "1990 – 1995", l: "1990 bis 1995", wert: 14 },
      { id: "b2002", n: "1996 – 2002", l: "1996 bis 2002", wert: 19 },
      { id: "b2009", n: "2003 – 2009", l: "2003 bis 2009", wert: 22 },
      { id: "b2015", n: "2010 – 2015", l: "2010 bis 2015", wert: 32, neubau: "teils" },
      { id: "b2016", n: "2016 und später", l: "ab 2016", wert: 36, neubau: "ja" }
    ],
    lage: [
      { id: "einfach", n: "Einfache Wohnlage", l: "Einfache Lage", wert: -4 },
      { id: "normal", n: "Normale Wohnlage", l: "Normale Lage", wert: 0 },
      { id: "gut", n: "Gute Wohnlage", l: "Gute Lage", wert: 12 }
    ],
    haustyp: [
      { id: "mfh", n: "Mehrfamilienhaus", l: "Haus mit vielen Wohnungen", wert: 0 },
      { id: "efh", n: "Ein-, Zweifamilien- oder Reihenhaus", l: "Einzel-Haus, Doppel-Haus oder Reihen-Haus", wert: 12 }
    ],
    merkmale: [
      { id: "stellplatz", gruppe: "mfh", n: "Stellplatz ohne eigenen Mietvertrag", l: "Auto-Stellplatz ist in der Miete mit drin", wert: 4 },
      { id: "garten", gruppe: "mfh", n: "Garten zur eigenen Nutzung (auch Gemeinschaftsgarten)", l: "Garten für die Bewohner", wert: 9 },
      { id: "daemmung", gruppe: "mod", n: "Außenwand nach 1999 gedämmt", l: "Die Haus-Wand wurde nach 1999 gedämmt", wert: 10 },
      { id: "elektro", gruppe: "mod", n: "Elektroinstallation nach 2009 erneuert", l: "Neue Strom-Leitungen nach 2009", wert: 5 },
      { id: "sanitaer", gruppe: "mod", n: "Bad nach 2009 erneuert (Fliesen, WC, Wanne/Dusche, Waschbecken)", l: "Neues Bad nach 2009", wert: 8 },
      { id: "ebk", gruppe: "aus", n: "Einbauküche (Schränke, Spüle, Herd, Kühlschrank)", l: "Küche ist schon eingebaut", wert: 9 },
      { id: "aufzug", gruppe: "aus", n: "Aufzug", l: "Es gibt einen Aufzug", wert: 6 },
      { id: "dusche", gruppe: "aus", n: "Bodengleiche Dusche", l: "Dusche ohne Stufe", wert: 5 },
      { id: "keineheizung", gruppe: "aus", n: "Keine Zentral- oder Etagenheizung (z. B. Nachtspeicher, Einzelöfen)", l: "Keine Zentral-Heizung", wert: -14 },
      { id: "durchgang", gruppe: "aus", n: "Durchgangszimmer", l: "Man muss durch ein Zimmer gehen, um in ein anderes zu kommen", wert: -9 },
      { id: "aufputz", gruppe: "aus", n: "Leitungen sichtbar über Putz", l: "Leitungen sieht man an der Wand", wert: -5 }
    ]
  },

  bremse: {
    aufschlag: 10,
    gilt_seit_bund: "01.06.2015",
    laeuft_bis: "31.12.2029",
    verordnung: "Bayerische Mieterschutzverordnung vom 16.12.2025, in Kraft seit 01.01.2026, Anlage Nr. 1.1.1",
    gemeinden_bayern: 285,
    gemeinden_bayern_vorher: 208,
    kappung: 15,
    kappung_jahre: 3,
    kuendigungssperre_jahre: 10
  },

  /* Ablauf vom Fragebogen zur Obergrenze. */
  stationen: [
    {
      titel: { n: "Befragung", l: "Fragen an die Haushalte" },
      text: {
        n: "Ein Institut schreibt 10.000 Ingolstädter Mieterhaushalte an. Sie geben Miete, Größe, Baujahr und Ausstattung ihrer Wohnung an. Die Befragung lief von Dezember 2022 bis März 2023.",
        l: "Eine Firma schreibt 10.000 Haushalte in Ingolstadt an. Die Menschen sagen: So viel Miete zahle ich. So groß ist meine Wohnung. So ist meine Wohnung ausgestattet."
      },
      haken: {
        n: "Sozialwohnungen und andere preisgebundene Wohnungen zählen nicht mit, obwohl sie oft die günstigsten sind.",
        l: "Sozial-Wohnungen zählen nicht mit. Dabei sind sie oft am billigsten."
      }
    },
    {
      titel: { n: "Nur jüngere Mieten", l: "Nur neue Mieten zählen" },
      text: {
        n: "In den Mietspiegel dürfen nur Mieten, die in den letzten sechs Jahren neu vereinbart oder erhöht wurden. So schreibt es § 558 Abs. 2 BGB vor.",
        l: "Es zählen nur Mieten aus den letzten 6 Jahren. Also Mieten, die neu sind. Oder Mieten, die erhöht wurden."
      },
      haken: {
        n: "Wer seit Jahren zur gleichen Miete wohnt, fällt heraus. In einem Markt mit steigenden Mieten zieht das den Durchschnitt nach oben. Der Mieterbund fordert deshalb zehn statt sechs Jahre.",
        l: "Alte, günstige Mieten zählen nicht. Darum ist der Mietspiegel höher als der Durchschnitt aller Mieten."
      }
    },
    {
      titel: { n: "Rechenmodell", l: "Die Rechnung" },
      text: {
        n: "Mit einer Regression rechnet das Institut aus, wie stark Größe, Baujahr, Lage und Ausstattung die Miete beeinflussen. Ergebnis: eine Basismiete je Wohnungsgröße und Zu- oder Abschläge in Prozent.",
        l: "Die Firma rechnet aus: Wie viel macht die Größe aus? Wie viel das Baujahr? Wie viel ein Aufzug? Daraus wird eine Tabelle."
      },
      haken: {
        n: "Die Prozente beschreiben, was heute gezahlt wird. Ein Neubau ab 2016 bekommt +36 %, eine sanierte Fassade +10 %. Wer modernisiert, darf dauerhaft mehr verlangen.",
        l: "Neue Häuser bekommen viel mehr Prozent. Wer ein Haus erneuert, darf mehr Miete verlangen."
      }
    },
    {
      titel: { n: "Fortschreibung", l: "Neu rechnen nach 2 Jahren" },
      text: {
        n: "Nach zwei Jahren muss ein qualifizierter Mietspiegel aktualisiert werden. Ingolstadt hat 2025 nicht neu befragt, sondern alle Werte mit der Inflation hochgerechnet: +6,45 % (Verbraucherpreisindex Dez. 2022 bis Dez. 2024).",
        l: "Nach 2 Jahren muss der Mietspiegel neu sein. Ingolstadt hat 2025 nicht neu gefragt. Die Stadt hat alle Werte um 6,45 Prozent erhöht. So stark sind die Preise allgemein gestiegen."
      },
      haken: {
        n: "Das ist gesetzlich erlaubt, hat aber mit dem Ingolstädter Wohnungsmarkt nichts zu tun: Steigen Lebensmittel- und Energiepreise, steigt auch der Mietspiegel.",
        l: "Dann wird die Miete teurer, weil zum Beispiel Essen und Strom teurer wurden. Nicht, weil Wohnungen teurer wurden."
      }
    },
    {
      titel: { n: "Ortsübliche Vergleichsmiete", l: "Die übliche Miete" },
      text: {
        n: "Basismiete × (1 + Summe der Zu- und Abschläge) ergibt die ortsübliche Vergleichsmiete. Sie ist kein fester Wert: Die Spanne reicht von −21 % bis +20 %.",
        l: "Aus der Tabelle kommt die übliche Miete für eine Wohnung. Sie darf ein bisschen höher oder niedriger sein."
      },
      haken: {
        n: "Innerhalb der Spanne darf ein Vermieter mit besonderen Merkmalen nach oben gehen. Wie weit, ist oft Streitfrage vor Gericht.",
        l: "Vermieter dürfen manchmal mehr verlangen. Darüber wird oft vor Gericht gestritten."
      }
    },
    {
      titel: { n: "Mietpreisbremse", l: "Die Miet-Bremse" },
      text: {
        n: "Bei einer Neuvermietung darf die Miete höchstens 10 % über der ortsüblichen Vergleichsmiete liegen. In Ingolstadt gilt das, weil die Stadt in der Bayerischen Mieterschutzverordnung steht – derzeit bis Ende 2029.",
        l: "Bei einer neuen Wohnung darf die Miete nur 10 Prozent über der üblichen Miete liegen. Das gilt in Ingolstadt bis Ende 2029."
      },
      haken: {
        n: "Viele Wohnungen fallen unter Ausnahmen. Und niemand prüft die Miete von Amts wegen: Mieter müssen selbst rügen. Ein Bußgeld gibt es bislang nicht.",
        l: "Für viele Wohnungen gilt die Bremse nicht. Niemand prüft das. Mieter müssen sich selbst beschweren. Vermieter müssen keine Strafe zahlen."
      }
    }
  ],

  /* Die Tore, an denen eine Neuvermietung aus der Bremse herausfaellt. */
  ausnahmen: [
    { id: "neuvertrag", frage: { n: "Ist es ein neuer Mietvertrag (Neuvermietung)?", l: "Ist es ein neuer Miet-Vertrag?" },
      nein: true, folge: "bestand",
      erklaerung: { n: "Die Bremse gilt nur bei Neuvermietung. Für laufende Verträge regeln Mietspiegel und Kappungsgrenze, wie stark die Miete steigen darf.",
        l: "Die Bremse gilt nur für neue Verträge. Für alte Verträge gibt es andere Regeln." } },
    { id: "neubau", frage: { n: "Wurde die Wohnung nach dem 1. Oktober 2014 zum ersten Mal genutzt und vermietet?", l: "Wurde die Wohnung erst nach Oktober 2014 gebaut und das erste Mal vermietet?" },
      folge: "aus",
      erklaerung: { n: "Neubau-Ausnahme (§ 556f BGB): Die Miete ist frei, auch bei allen späteren Vermietungen.",
        l: "Neue Wohnungen sind ausgenommen. Der Vermieter darf jede Miete verlangen. Auch später noch." } },
    { id: "modernisiert", frage: { n: "Wurde sie vor der Vermietung umfassend modernisiert (etwa ein Drittel der Neubaukosten)?", l: "Wurde die Wohnung vorher ganz erneuert?" },
      folge: "aus",
      erklaerung: { n: "Bei der ersten Vermietung nach einer umfassenden Modernisierung gilt die Bremse nicht (§ 556f Satz 2 BGB).",
        l: "Nach einer großen Erneuerung gilt die Bremse beim ersten Mal nicht." } },
    { id: "kurzzeit", frage: { n: "Nur vorübergehend vermietet (z. B. wenige Monate, Ferienwohnung)?", l: "Ist die Wohnung nur für kurze Zeit vermietet?" },
      folge: "aus",
      erklaerung: { n: "Wohnraum „zum vorübergehenden Gebrauch“ ist ausgenommen (§ 549 Abs. 2 BGB). Die Mietrechtsreform 2026 will das auf höchstens sechs Monate begrenzen.",
        l: "Kurze Miet-Zeiten sind ausgenommen. Das soll sich ändern." } },
    { id: "vormiete", frage: { n: "War die Miete des Vormieters schon höher als die Grenze?", l: "Hat der Mieter vorher schon mehr bezahlt?" },
      folge: "teil",
      erklaerung: { n: "Bestandsschutz (§ 556e BGB): Die Vormiete darf weiter verlangt werden, auch wenn sie über der Grenze liegt.",
        l: "Dann darf der Vermieter die alte, hohe Miete weiter verlangen." } },
    { id: "moebliert", frage: { n: "Ist die Wohnung möbliert?", l: "Sind Möbel in der Wohnung?" },
      folge: "teil",
      erklaerung: { n: "Die Bremse gilt, aber wie hoch der Möbelzuschlag sein darf, ist gesetzlich nicht geregelt. Das macht die Grenze schwer prüfbar. Die Reform 2026 soll den Zuschlag offenlegungspflichtig machen und deckeln.",
        l: "Die Bremse gilt. Aber für die Möbel darf der Vermieter mehr verlangen. Wie viel, ist nicht klar geregelt." } },
    { id: "index", frage: { n: "Ist eine Indexmiete vereinbart?", l: "Steigt die Miete jedes Jahr mit den Preisen?" },
      folge: "teil",
      erklaerung: { n: "Die Bremse gilt nur für die Anfangsmiete. Danach steigt die Miete mit der Inflation – ohne Kappungsgrenze und ohne Blick in den Mietspiegel.",
        l: "Die Bremse gilt nur am Anfang. Danach steigt die Miete, wenn alles teurer wird." } }
  ],

  zeitleiste: [
    { datum: "2015-06-01", ebene: "bund", n: "Mietpreisbremse tritt in Kraft", l: "Die Miet-Bremse beginnt" },
    { datum: "2019-01-01", ebene: "bund", n: "Vermieter müssen Ausnahmen vorab offenlegen, einfache Rüge reicht", l: "Vermieter müssen sagen, warum die Miete höher ist" },
    { datum: "2020-01-01", ebene: "bund", n: "Mietspiegel: Betrachtungszeitraum von 4 auf 6 Jahre verlängert", l: "Der Mietspiegel zählt jetzt 6 Jahre statt 4" },
    { datum: "2020-04-01", ebene: "bund", n: "Rückforderung bis 30 Monate rückwirkend möglich", l: "Mieter bekommen zu viel bezahltes Geld länger zurück" },
    { datum: "2022-07-01", ebene: "bund", n: "Mietspiegelpflicht für Städte über 50.000 Einwohner", l: "Große Städte müssen einen Mietspiegel haben" },
    { datum: "2023-10-17", ebene: "stadt", n: "Stadtrat erkennt ersten qualifizierten Mietspiegel an (gilt ab 1.11.2023)", l: "Ingolstadt hat den ersten Mietspiegel" },
    { datum: "2025-06-26", ebene: "bund", n: "Bundestag verlängert die Bremse bis Ende 2029", l: "Die Bremse gilt länger: bis Ende 2029" },
    { datum: "2025-10-30", ebene: "stadt", n: "Fortschreibung per Inflation anerkannt (+6,45 %), mit allen Stimmen", l: "Der Mietspiegel wird um 6,45 Prozent erhöht" },
    { datum: "2026-01-01", ebene: "land", n: "Neue Bayerische Mieterschutzverordnung: 285 statt 208 Gemeinden", l: "In Bayern gilt die Bremse jetzt in mehr Orten" },
    { datum: "2026-07-09", ebene: "bund", n: "Mietrechtsreform (Möblierung, Indexmiete, Kurzzeit) in 1. Lesung", l: "Der Bundestag berät neue Regeln" },
    { datum: "2026-10-15", ebene: "stadt", n: "Ausschuss: neuer Mietspiegel 2027 soll beauftragt werden", l: "Ingolstadt plant einen neuen Mietspiegel" },
    { datum: "2027-10-31", ebene: "stadt", n: "Aktueller Mietspiegel läuft aus", l: "Der jetzige Mietspiegel endet" },
    { datum: "2029-12-31", ebene: "bund", n: "Mietpreisbremse läuft aus, wenn nicht verlängert", l: "Die Bremse endet, wenn nichts passiert" }
  ],

  /* Wie viele Wohnungen fallen aus der Bremse? Eine direkte Zahl gibt es
     nicht; das sind die besten Naeherungen. */
  ausnahmen_zahlen: {
    ingolstadt: {
      /* Baufertigstellungen: Wohnungen in Wohn- und Nichtwohngebaeuden,
         einschl. Baumassnahmen an bestehenden Gebaeuden (Tab. 18).
         2015/2016 aus der Ausgabe 2019, 2017-2024 aus der Ausgabe 2025.
         Bestand 31.12.2024 aus Tab. 16 der Ausgabe 2025. */
      fertig: [[2015, 1208], [2016, 1477], [2017, 1050], [2018, 1373], [2019, 1020],
               [2020, 1127], [2021, 814], [2022, 931], [2023, 709], [2024, 763]],
      bestand: 73859, bestand_stand: "31.12.2024",
      quelle: "Bayerisches Landesamt für Statistik, Statistik kommunal 2025 und 2019, Kreisfreie Stadt Ingolstadt",
      url: "https://www.statistik.bayern.de/mam/produkte/statistik_kommunal/2025/09161.pdf"
    },
    muenchen: {
      jahr: 2025, moebliert: 10600, erstbezug: 3500, wiedervermietung: 16200,
      quelle: "Landeshauptstadt München, Wohnungsmarktbarometer 2025 (Auswertung der Anzeigen auf ImmoScout24)",
      url: "https://stadt.muenchen.de/dam/jcr:aad6e9c7-87b7-411e-ade8-8c83d72bc6a9/LHM_Wohnungsmarktbarometer2025_RZ-01.pdf"
    },
    befragung: {
      anteil: 2.4, befragte: 10000, jahr: 2024,
      quelle: "Finanztip über eine Befragung der LMU München (Originalbericht nicht auffindbar)",
      url: "https://www.finanztip.de/mietpreisbremse/"
    },
    bestand_moebliert: {
      anteil_max: 0.8, jahr: 2022,
      quelle: "Haus & Grund Deutschland: Studie zu möbliertem Wohnen auf Zeit",
      url: "https://www.hausundgrund-verband.de/aktuelles/einzelansicht/studie-zeigt-hoechstens-08-prozent-der-wohnungen-moebliert-auf-zeit-vermietet/"
    }
  },

  /* Wer profitiert? Bewusst knapp und mit Beleg. */
  akteure: [
    { wer: { n: "Neue Mieter", l: "Neue Mieter" }, plus: { n: "Haben einen Anspruch auf die Grenze und können zu viel Gezahltes zurückfordern.", l: "Sie können zu viel bezahltes Geld zurückholen." },
      minus: { n: "Nur wenn sie selbst rügen – meist direkt nach der Wohnungssuche, gegenüber dem neuen Vermieter. Viele trauen sich das nicht.", l: "Aber nur, wenn sie sich beschweren. Viele haben Angst davor." } },
    { wer: { n: "Mieter im laufenden Vertrag", l: "Mieter mit altem Vertrag" }, plus: { n: "Mieterhöhungen sind bis zur Vergleichsmiete und um höchstens 15 % in drei Jahren erlaubt.", l: "Die Miete darf nur langsam steigen." },
      minus: { n: "Der Mietspiegel selbst steigt – auch durch die Inflations-Fortschreibung. Damit wächst der Spielraum für Erhöhungen.", l: "Aber der Mietspiegel steigt. Dann darf auch die Miete steigen." } },
    { wer: { n: "Private Kleinvermieter", l: "Private Vermieter" }, plus: { n: "Klare Orientierung über den Mietspiegel, Rechtssicherheit bei Erhöhungen.", l: "Sie wissen, welche Miete erlaubt ist." },
      minus: { n: "Wer lange günstig vermietet hat, darf bei Neuvermietung nicht auf Marktniveau springen.", l: "Wer lange wenig Miete verlangt hat, darf nicht plötzlich viel mehr verlangen." } },
    { wer: { n: "Professionelle Anbieter", l: "Große Vermieter" }, plus: { n: "Können Ausnahmen gezielt nutzen: Neubau, umfassende Modernisierung, Möblierung, Indexmiete, Kurzzeitvermietung.", l: "Sie nutzen die Ausnahmen. Zum Beispiel: Möbel in die Wohnung stellen." },
      minus: { n: "Bei Verstößen droht bisher nur die Rückzahlung – kein Bußgeld. Eine Expertenkommission des Bundes soll bis Ende 2026 Bußgelder vorschlagen.", l: "Eine Strafe gibt es bis jetzt nicht. Das soll sich vielleicht ändern." } }
  ],

  forschung: [
    { quelle: "DIW Berlin, Wochenbericht 22/2016", n: "Ein Jahr nach dem Start keine bremsende Wirkung messbar; Hinweise, dass Vermieter Mieten vor dem Start noch angehoben haben.",
      l: "Im ersten Jahr hat die Bremse kaum gewirkt.",
      url: "https://www.diw.de/de/diw_01.c.535255.de/publikationen/wochenberichte/2016_22_1/die_mietpreisbremse_wirkt_bisher_nicht.html" },
    { quelle: "DIW Berlin, Wochenbericht 7/2018", n: "Die Bremse dämpft Mieten moderat – aber nur dort, wo die Neuvertragsmieten vorher um mehr als 3,9 % im Jahr gestiegen sind.",
      l: "Die Bremse hilft ein bisschen. Aber nur da, wo Mieten vorher sehr schnell gestiegen sind.",
      url: "https://www.diw.de/de/diw_01.c.578099.de/publikationen/wochenberichte/2018_07_1/mietpreisbremse_ist_besser_als_ihr_ruf__aber_nicht_die_loesung_des_wohnungsmarktproblems.html" },
    { quelle: "Deutscher Mieterbund, 2025", n: "Begrüßt die Verlängerung, kritisiert die vielen Ausnahmen und fehlende Sanktionen: Vermieter müssten höchstens zurückzahlen, was sie zu viel verlangt haben.",
      l: "Der Mieter-Verein sagt: Es gibt zu viele Ausnahmen und keine Strafen.",
      url: "https://mieterbund.de/aktuelles/meldungen/bundesrat-beschliesst-verlaengerung-der-mietpreisbremse-bis-2029/" },
    { quelle: "Haus & Grund, 2025", n: "Hält die Bremse für überflüssig: Sie helfe nicht, sondern schrecke Vermieter ab.",
      l: "Der Vermieter-Verein sagt: Die Bremse hilft nicht. Sie schreckt Vermieter ab.",
      url: "https://www.zdfheute.de/politik/deutschland/mietpreisbremse-verlaengerung-bundestag-100.html" }
  ],

  /* Stadtratsvorgaenge zum Thema (aus data/feed.json, Stand 13.10.2026 + 15.10.2026). */
  stadtrat: [
    { ref: "stadt:13544#Ö1", datum: "2026-10-15", gremium: "Stadtentwicklungsausschuss",
      n: "Neuer Mietspiegel 2027 soll beauftragt werden (60.000 €, Befragung voraussichtlich 2. Quartal 2027, Auskunftspflicht)",
      l: "Die Stadt will einen neuen Mietspiegel machen lassen. Er kostet 60.000 Euro.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22926" },
    { ref: "stadt:11853#Ö 29", datum: "2025-10-30", gremium: "Stadtrat",
      n: "Fortschreibung des Mietspiegels anerkannt – gilt ab 1. November 2025 (mit allen Stimmen)",
      l: "Der Stadtrat sagt Ja zum neuen Mietspiegel. Alle stimmen dafür.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=20349" },
    { ref: "stadt:13534#Ö 7", datum: "2026-07-14", gremium: "Stadtentwicklungsausschuss",
      n: "Linke beantragt Zweckentfremdungssatzung – Verwaltung sieht Voraussetzungen nicht erfüllt",
      l: "Die Linke will verbieten, dass Wohnungen leer stehen oder Ferien-Wohnungen werden. Die Verwaltung sagt: Das geht nicht.",
      url: "https://www.ingolstadt.de/sessionnet/si0056.php?__ksinr=13534" },
    { ref: "stadt:11853#Ö18", datum: "2025-10-30", gremium: "Stadtrat",
      n: "Verwaltung verwirft eine neue, rein städtische Wohnungsgesellschaft",
      l: "Es gibt keine neue Wohnungs-Firma der Stadt.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22382" },
    { ref: "stadt:13538#Ö 8", datum: "2026-07-29", gremium: "Stadtrat",
      n: "Städtische GWG: 4,87 Mio. € Jahresüberschuss 2025, bleibt vollständig im Unternehmen",
      l: "Die Wohnungs-Firma der Stadt hat 4,87 Millionen Euro Gewinn gemacht. Das Geld bleibt in der Firma.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23126" },
    { ref: "stadt:11844#Ö 33", datum: "2025-07-29", gremium: "Stadtrat",
      n: "Jobcenter: Obergrenze für Untermietzimmer 400 € bruttokalt",
      l: "Das Jobcenter zahlt für ein Zimmer höchstens 400 Euro.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=20112" },
    { ref: "stadt:antrag:23234", datum: "2026-07-21", gremium: "Antrag",
      n: "Grüne: leerstehende Büro- und Ladenflächen in der Altstadt zu Wohnungen machen",
      l: "Die Grünen wollen leere Büros zu Wohnungen machen.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23234" },
    { ref: "stadt:antrag:23141", datum: "2026-07-01", gremium: "Antrag",
      n: "SPD: Wohnungsbaugipfel zum „Bauturbo“ des Bundes",
      l: "Die SPD will ein Treffen zum schnelleren Bauen.",
      url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23141" }
  ],

  fehlt: [
    { n: "Angebotsmieten", l: "Preise in Wohnungs-Anzeigen",
      d: { n: "Was neue Wohnungen in Inseraten tatsächlich kosten, erheben nur private Portale. Ihre Zahlen sind nicht offen und widersprechen sich.",
        l: "Diese Zahlen haben nur Internet-Seiten für Wohnungen. Sie sind nicht öffentlich." } },
    { n: "Wie oft die Bremse überschritten wird", l: "Wie oft die Miete zu hoch ist",
      d: { n: "Niemand zählt Rügen oder Verfahren. Ohne Angebotsdaten lässt sich der Anteil der Verstöße nicht schätzen.",
        l: "Niemand zählt, wie oft Mieter sich beschweren." } },
    { n: "Anteil möblierter und befristeter Wohnungen", l: "Wie viele Wohnungen mit Möbeln vermietet werden",
      d: { n: "Gerade in einer Stadt mit vielen Pendlern und Projektbeschäftigten wäre das wichtig – Daten dazu gibt es nicht.",
        l: "Dazu gibt es keine Zahlen." } },
    { n: "Rohdaten des Mietspiegels", l: "Die Antworten aus der Befragung",
      d: { n: "Der Methodenbericht beschreibt das Verfahren, die anonymisierten Einzelangaben sind aber nicht veröffentlicht.",
        l: "Die Antworten selbst sind nicht öffentlich." } }
  ],

  quellen: [
    { text: "Stadt Ingolstadt: Qualifizierter Mietspiegel (Broschüre, Fortschreibung 2025, Methodenbericht, Straßen- und Wohnlagenverzeichnis)", url: "https://www.ingolstadt.de/mietspiegel" },
    { text: "Stadt Ingolstadt: Qualifizierter Mietspiegel für nicht preisgebundenen Wohnraum, November 2025 (Broschüre, Tabellen 1 und 2)", url: "https://www.ingolstadt.de/output/download.php?fid=3052.9046.1.PDF" },
    { text: "DOMUS Consult: Fortschreibung 2025 des qualifizierten Mietspiegels 2023, Bericht vom 06.05.2025", url: "https://www.ingolstadt.de/output/download.php?fid=3052.9049.1.PDF" },
    { text: "Bayerische Mieterschutzverordnung (MiSchuV) vom 16.12.2025", url: "https://www.gesetze-bayern.de/Content/Document/BayMiSchuV2025/true" },
    { text: "Bürgerliches Gesetzbuch §§ 556d–556g (Mietpreisbremse), § 558 (Mieterhöhung, Kappungsgrenze), §§ 558c–558d (Mietspiegel)", url: "https://www.gesetze-im-internet.de/bgb/__556d.html" },
    { text: "LTO: Bundestag verlängert Mietpreisbremse bis 2029 (26.06.2025)", url: "https://www.lto.de/recht/nachrichten/n/bundestag-verlaengert-mietpreisbremse-bis-2029" },
    { text: "BMJV: Gesetzentwurf zur Reform des Wohnraummietrechts (2026)", url: "https://www.bmjv.de/SharedDocs/Pressemitteilungen/DE/2026/0208_Miete_II.html" },
    { text: "Deutscher Mieterbund: Mietrechtsreform zur 1. Lesung im Bundestag", url: "https://mieterbund.de/aktuelles/meldungen/mietrechtsreform-zur-1-lesung-im-bundestag/" },
    { text: "Ratsinformationssystem der Stadt Ingolstadt (Vorlagen und Sitzungen, siehe Liste oben)", url: "https://www.ingolstadt.de/sessionnet/" }
  ]
};
