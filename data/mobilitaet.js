/* Von Hand gepflegt: Daten fuer mobilitaet.html (Themenseite "Mobilitaetsplan").

   Quelle: Beschlussvorlage V0690/26 der Stadt Ingolstadt (Amt fuer
   Verkehrsmanagement und Geoinformation, 21.10.2026) mit drei Anlagen:
     Anlage 1: Mobilitaet in Deutschland 2023, Regionalbericht Stadt Ingolstadt
               (infas, DLR, IVT, infas 360 im Auftrag des BMV, Mai 2026)
     Anlage 2: Analysebericht zum Mobilitaetsplan Ingolstadt 2040+
               (Planersocietaet Frehn Steinberg Partner, Dortmund)
     Anlage 3: Zielkonzept
   Abgerufen am 24.11.2026. Hinter jeder Zahl steht in "s" die Seite der
   jeweiligen Anlage. Zahlen aus Grafiken und Tabellen (Bezirke, Teilraeume,
   Ziele, Wuensche) sind am Seitenbild gegengelesen, der Rest steht im Fliesstext.

   Erklaeren statt fordern: Die Seite gibt wieder, was in den Berichten steht,
   und sagt dazu, wo Angaben nicht zusammenpassen. Sie bewertet den Plan nicht.

   Fortschreiben: wenn der Stadtrat entschieden hat (beratung[].ergebnis), wenn
   der Foerderbescheid da ist, und 2027 mit der Massnahmenphase. */
window.MOBILITAET_DATEN = {
  stand: "2026-11-24",

  vorlage: {
    nr: "V0690/26",
    titel: "Zwischenbericht zum Mobilitätsplan Ingolstadt 2040+ und Endbericht zur Erhebung „Mobilität in Deutschland – MiD 2023“",
    url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23451",
    datum: "2026-10-21",
    vorgaenger: "V0244/2026",
    beratung: [
      { gremium: "Ausschuss für Stadtentwicklung, Bau, Umwelt und Nachhaltigkeit", l: "Ausschuss für Stadt-Entwicklung",
        datum: "2026-06-11", art: "Erste Beratung (V0244/2026), zurück in die Fraktionen", art_l: "Erste Beratung. Noch keine Entscheidung." },
      { gremium: "Workshop mit Stadtrat und Ortssprechern (nicht öffentlich)", l: "Arbeits-Treffen vom Stadtrat (nicht öffentlich)",
        datum: "2026-09-22", art: "Zielkonzept überarbeitet", art_l: "Die Ziele wurden überarbeitet." },
      { gremium: "Ausschuss für Stadtentwicklung, Bau, Umwelt und Nachhaltigkeit", l: "Ausschuss für Stadt-Entwicklung",
        datum: "2026-11-26", art: "Vorberatung", art_l: "Beratung" },
      { gremium: "Stadtrat", l: "Stadtrat", datum: "2026-12-10", art: "Entscheidung", art_l: "Entscheidung" }
    ],
    anlagen: [
      { n: "Beschlussvorlage", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254770&type=do" },
      { n: "Anlage 1: MiD 2023, Regionalbericht Stadt Ingolstadt", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254780&type=do" },
      { n: "Anlage 2: Analysebericht zum Mobilitätsplan Ingolstadt 2040+", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254781&type=do" },
      { n: "Anlage 3: Zielkonzept", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254782&type=do" }
    ],
    frist_eu: "2027-12-31",
    knoten_deutschland: 78,
    endbericht: "Ende 2027",
    buero: "Planersocietät Frehn Steinberg Partner GmbH, Dortmund"
  },

  /* Zielkonzept (Anlage 3): vier Oberziele, fuenf Teilraeume, 20 Unterziele. */
  ziele: {
    leitbild: "Mobilität, die verbindet – für Menschen, Vielfalt und Teilhabe",
    ober: [
      { k: "A", n: "Erreichbarkeit sichern", l: "Alle sollen gut ans Ziel kommen" },
      { k: "B", n: "Vorbild für nachhaltige Mobilität werden", l: "Vorbild sein für umwelt-freundlichen Verkehr" },
      { k: "C", n: "Aufenthaltsqualität und Klimaanpassung verbinden", l: "Schöne Straßen und Plätze, die auch bei Hitze gut sind" },
      { k: "D", n: "Wirtschafts- und Innovationsstandort stärken", l: "Gut für Firmen und neue Technik" }
    ],
    raeume: [
      { n: "Gesamtstadt", l: "Die ganze Stadt",
        u: ["Barrierefreie Mobilitätsangebote und sichere Straßenräume", "Starker Umweltverbund", "Resiliente Gestaltung des öffentlichen Straßenraums", "Nahtlose Mobilität durch Digitalisierung"] },
      { n: "Altstadt", l: "Die Altstadt",
        u: ["Vorrang für ÖPNV, Rad- und Fußverkehr", "Aktive Mobilität", "Lebendige Altstadt", "Innovationsraum Altstadt"] },
      { n: "Starke Zentren", l: "Die Stadt-Teile",
        u: ["Nahmobilität und Vernetzung der Verkehrsträger", "Leistungsstarke Achsen für alle Verkehrsmittel", "Lebenswerte Quartiere", "Starke Gewerbestandorte"] },
      { n: "Ortsteile", l: "Die Orts-Teile am Rand",
        u: ["Teilhabe für alle", "Mobility on Demand", "15-Minuten-Stadt und zukunftsfähige Mobilität", "Kleinräumiger Lieferverkehr"] },
      { n: "Region", l: "Das Umland",
        u: ["Überregionale Anbindung", "Regionale Kooperationen", "Stadt-Umland-Verflechtung", "Logistikdrehscheibe"] }
    ]
  },

  /* Modal Split: Anteil an allen Wegen in Prozent (MiD, Anlage 1 S. 7, 10, 12).
     "staedte" = bundesweite Regiopolen und Grossstaedte (der Raumtyp, zu dem
     Ingolstadt zaehlt). Summen weichen durch Rundung von 100 ab. */
  modal: {
    reihen: [
      { id: "in23", n: "Ingolstadt 2023", l: "Ingolstadt 2023", fuss: 26, rad: 19, auto: 48, oev: 8 },
      { id: "in17", n: "Ingolstadt 2017", l: "Ingolstadt 2017", fuss: 20, rad: 22, auto: 49, oev: 9 },
      { id: "staedte", n: "Vergleichbare Großstädte 2023", l: "Ähnlich große Städte 2023", fuss: 29, rad: 15, auto: 43, oev: 13 }
    ],
    auto_bund: 53, auto_bayern: 56, rad_bund: 11,
    fahrer: 34, mitfahrer: 14,
    wege_tag: 400000, pkm_tag_mio: 5.6,
    km_anteil: { auto: 71, oev: 20, rad: 5, fuss: 3 },
    stichprobe: { haushalte: 2196, personen: 4224, wege: 10728, zeitraum: "April 2023 bis Juli 2024" }
  },

  /* Anlage 2, S. 18, Abbildung 9. Anteile in Prozent der Wege. n und
     "ungewichtet" wie in der Grafik angegeben. Der Bezirk Sued fehlt dort.
     fahrer/mitfahrer stehen so in der Grafik; stadtweit ist das Verhaeltnis
     umgekehrt (34 zu 14), deshalb zeigt die Seite nur die Summe. */
  bezirke: [
    { n: "Mitte", fuss: 26, rad: 22, fahrer: 12, mitfahrer: 32, oev: 8, faelle: 212, ungewichtet: 1133 },
    { n: "Nordwest", fuss: 24, rad: 23, fahrer: 10, mitfahrer: 39, oev: 4, faelle: 88, ungewichtet: 432 },
    { n: "Nordost", fuss: 31, rad: 13, fahrer: 13, mitfahrer: 36, oev: 7, faelle: 179, ungewichtet: 920 },
    { n: "Südost", fuss: 19, rad: 21, fahrer: 15, mitfahrer: 36, oev: 9, faelle: 220, ungewichtet: 1467 },
    { n: "Südwest", fuss: 17, rad: 22, fahrer: 14, mitfahrer: 41, oev: 6, faelle: 236, ungewichtet: 1403 },
    { n: "West", fuss: 28, rad: 12, fahrer: 21, mitfahrer: 31, oev: 9, faelle: 115, ungewichtet: 772 },
    { n: "Etting", fuss: 21, rad: 14, fahrer: 20, mitfahrer: 39, oev: 5, faelle: 68, ungewichtet: 418 },
    { n: "Oberhaunstadt", fuss: 25, rad: 18, fahrer: 5, mitfahrer: 41, oev: 10, faelle: 69, ungewichtet: 479 },
    { n: "Mailing", fuss: 61, rad: 8, fahrer: 9, mitfahrer: 16, oev: 6, faelle: 112, ungewichtet: 421 },
    { n: "Friedrichshofen-Hollerstauden", fuss: 27, rad: 22, fahrer: 14, mitfahrer: 32, oev: 5, faelle: 145, ungewichtet: 884 },
    { n: "Münchener Straße", fuss: 28, rad: 26, fahrer: 11, mitfahrer: 25, oev: 10, faelle: 182, ungewichtet: 1121 }
  ],
  bezirk_fehlt: "Süd",

  /* Anteil "sehr gut" oder "gut" in Prozent (Anlage 1, S. 14). */
  zufriedenheit: [
    { id: "fuss", n: "Zu Fuß gehen", l: "Zu Fuß gehen", in: 83, bund: 67, staedte: 70 },
    { id: "auto", n: "Autoverkehr", l: "Auto fahren", in: 71, bund: 69, staedte: 58 },
    { id: "rad", n: "Radverkehr", l: "Rad fahren", in: 68, bund: 44, staedte: 40 },
    { id: "oev", n: "Bus und Bahn", l: "Bus und Bahn", in: 37, bund: 36, staedte: 44 }
  ],

  oev: {
    /* Was haelt Sie von Bus und Bahn ab? Prozent der Befragten (Anlage 2, S. 20). */
    hindernisse: [
      { n: "Keine oder schlechte Verbindungen", l: "Keine gute Verbindung", w: 47 },
      { n: "Zu hohe Preise", l: "Zu teuer", w: 43 },
      { n: "Zu lange Reisezeit", l: "Dauert zu lange", w: 41 },
      { n: "Unzuverlässige Verbindungen", l: "Kommt nicht pünktlich", w: 34 },
      { n: "Unangenehme Nähe zu anderen Personen", l: "Zu eng", w: 16 },
      { n: "Zu wenig Komfort", l: "Nicht bequem", w: 16 },
      { n: "Zu unübersichtlicher Tarif", l: "Preise schwer zu verstehen", w: 14 },
      { n: "Zu wenig Informationen", l: "Zu wenig Auskunft", w: 6 },
      { n: "Zu wenig Sicherheit oder schlechtes Erscheinungsbild", l: "Fühle mich nicht sicher", w: 5 }
    ],
    preise_bund: 36,
    /* Bewertung des OEPNV vor Ort nach Teilraum (Anlage 1, S. 29 und S. 9).
       klein = geringe Fallzahl laut Bericht (unter 100 Personen). */
    teilraeume: [
      { n: "Innenstadt", bezirke: "Mitte", note: 3.3, gut: 26, schlecht: 23, klein: true },
      { n: "Stadtteile nördlich der Donau", bezirke: "Friedrichshofen-Hollerstauden, Nordwest, Nordost", note: 3.3, gut: 32, schlecht: 17 },
      { n: "Stadtteile südlich der Donau", bezirke: "Südwest, Münchener Straße, Südost", note: 2.8, gut: 46, schlecht: 10 },
      { n: "Ortsteile West und Süd", bezirke: "West, Süd", note: 3.1, gut: 39, schlecht: 17 },
      { n: "Ortsteile Etting, Oberhaunstadt, Mailing", bezirke: "Etting, Oberhaunstadt, Mailing", note: 3.3, gut: 30, schlecht: 24, klein: true }
    ],
    note: 3.1, note_bund: 3.3, nie: 42, woechentlich: 16, woechentlich_bund: 23,
    haltestellen: 302, haltepunkte: 721, haltepunkte_barrierefrei: 263, barrierefrei_prozent: 36,
    nachtlinien_seit: "2026-03-30", klinikum_hbf_bis: "2026-03-30",
    studie: { tram_mio: 670, busway_mio: 380, tram_fahrgaeste: 38000, busway_fahrgaeste: 30000 },
    schwach: ["Achse Irgertsheim–Kernstadt", "Gewerbegebiet Südost", "Niederfeld", "Weiherfeld", "Winden", "Raffineriebezirk"]
  },

  fuss_rad: {
    ohne_nahversorgung: ["Pettenhofen", "Mühlhausen", "Niederfeld", "Hagau", "Winden", "Rothenturm"],
    schmale_gehwege: ["Ortsdurchfahrten Irgertsheim, Dünzlau, Hagau und Mühlhausen", "Eichenwaldstraße und Barthlgasserstraße in Gerolfing",
      "Seeweg in Zuchering", "Münchener Straße (B 13) in Unsernherrn", "Schwanthalerstraße, Osnabrücker Straße, Römerstraße", "Unterer Graben"],
    querung_abstand_ist: 500, querung_abstand_soll: 250,
    nur_ebike: ["Dünzlau", "Mühlhausen", "Pettenhofen", "Irgertsheim", "Hagau", "Winden"],
    radnetz_km: 274, radnetz_gemeinsam_km: 169, radnetz_eigen_km: 89,
    klimatest: { jahr: 2024, note: 3.7, note_bund: 3.92, platz: 7, von: 42, verleih: 4.9 },
    rad_woche: 50, rad_woche_bund: 34, rad_woche_ortsteile: 39
  },

  auto: {
    pkw_je_1000: 737, pkw_bayern: 635, pkw_bund: 590, gewerblich_prozent: 35,
    haushalte_mit_pkw: 86, haushalte_mit_pkw_staedte: 73, haushalte_mit_rad: 86,
    bruecke_dtv: 40000, einpendler: 62000, auspendler: 24500
  },

  /* Polizeiliche Unfallstatistik (Anlage 2, S. 127 und 131). */
  unfaelle: {
    2024: { unfaelle: 4749, verletzte: 912, schwer: 91, tote: 0 },
    2023: { unfaelle: 4762, verletzte: 877, schwer: 92, tote: 4 },
    rad_scooter_anteil_verletzte: 49, rad_unfaelle: 415, scooter_unfaelle: 68
  },

  /* Ziele aus aelteren Beschluessen und der Stand laut MiD 2023 (Anlage 2,
     S. 52, 55, 141 und 142). Anteile an allen Wegen in Prozent. */
  alte_ziele: [
    { n: "Radverkehr", l: "Rad", ist: 19, ziel: "25 bis 27", bis: 2025, quelle: "Verkehrsentwicklungsplan 2025 und Radkonzept 2016" },
    { n: "Radverkehr", l: "Rad", ist: 19, ziel: "32,6", bis: 2035, quelle: "Klimaschutzkonzept 2022" },
    { n: "Bus und Bahn", l: "Bus und Bahn", ist: 8, ziel: "14,8", bis: 2035, quelle: "Klimaschutzkonzept 2022" },
    { n: "Auto und Motorrad", l: "Auto", ist: 48, ziel: "40", bis: 2035, quelle: "Klimaschutzkonzept 2022" }
  ],

  /* Online-Befragung 01.07. bis 21.09.2025 (Anlage 2, S. 169 bis 180).
     Frage 4: Was muesste sich aendern? n = 835, Mehrfachnennung. */
  beteiligung: {
    teilnehmende: 841, kartenhinweise: 61, von_ausserhalb: 211, ab70_prozent: 3, n_frage: 835,
    wuensche: [
      { n: "Höhere Taktung des ÖPNV", l: "Busse sollen öfter fahren", w: 464 },
      { n: "Bessere Anbindung an den ÖPNV", l: "Bus und Bahn sollen näher sein", w: 458 },
      { n: "Günstigere Preise im ÖPNV", l: "Bus und Bahn sollen billiger sein", w: 421 },
      { n: "Schnellere Verbindungen des ÖPNV", l: "Bus und Bahn sollen schneller sein", w: 382 },
      { n: "Besser ausgebautes Radwegenetz", l: "Bessere Rad-Wege", w: 326 },
      { n: "Höhere Zuverlässigkeit des ÖPNV (Bus)", l: "Busse sollen pünktlich sein", w: 325 },
      { n: "Bessere Trennung von Kfz- und Radverkehr", l: "Autos und Räder trennen", w: 324 },
      { n: "Bessere Trennung von Fuß- und Radverkehr", l: "Fuß-Wege und Rad-Wege trennen", w: 215 },
      { n: "Bessere Barrierefreiheit", l: "Weniger Hindernisse", w: 66 },
      { n: "Besser ausgebautes Gehwegenetz", l: "Bessere Fuß-Wege", w: 57 }
    ]
  },

  fehlt: [
    { n: "Messbare Ziele", d: "Das Zielkonzept nennt 20 Unterziele, aber keine Zahlen und keine Jahre. Woran die Stadt den Erfolg misst, soll das Evaluationskonzept am Ende des Verfahrens festlegen.",
      ln: "Zahlen für die Ziele", ld: "In den Zielen stehen keine Zahlen. Man kann also noch nicht nachmessen." },
    { n: "Der Bezirk Süd", d: "In der Auswertung nach Stadtbezirken stehen elf von zwölf Bezirken. Warum Süd fehlt, sagt der Bericht nicht.",
      ln: "Der Bezirk Süd", ld: "Für den Bezirk Süd gibt es keine Zahlen. Der Bericht sagt nicht, warum." },
    { n: "Menschen, die einpendeln", d: "Die Befragung erfasst nur, wer in Ingolstadt wohnt. Die rund 62.000 Einpendler fehlen. Mit ihnen wären die Anteile von Auto sowie Bus und Bahn höher, schreibt infas.",
      ln: "Menschen von außerhalb", ld: "Viele Menschen kommen zum Arbeiten nach Ingolstadt. Sie wurden nicht befragt." },
    { n: "Unfallschwerpunkte", d: "Der Bericht nennt Unfallzahlen für die ganze Stadt, aber keine Kreuzungen oder Straßen, an denen sich Unfälle häufen.",
      ln: "Gefährliche Stellen", ld: "Der Bericht sagt nicht, wo die meisten Unfälle passieren." },
    { n: "Maßnahmen und Kosten", d: "Was gebaut oder geändert wird, steht noch nicht fest. Die Maßnahmen sollen 2027 mit Beteiligung entstehen.",
      ln: "Was genau gemacht wird", ld: "Das steht noch nicht fest. Darüber wird 2027 gesprochen." }
  ],

  quellen: [
    { text: "Stadt Ingolstadt: Beschlussvorlage V0690/26 mit allen Anlagen (Ratsinformationssystem)", url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23451" },
    { text: "infas, DLR, IVT und infas 360 (2026): Mobilität in Deutschland – Regionalbericht Stadt Ingolstadt, im Auftrag des BMV", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254780&type=do" },
    { text: "Planersocietät: Analysebericht zum Mobilitätsplan Ingolstadt 2040+", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254781&type=do" },
    { text: "Stadt Ingolstadt: Zielkonzept zum Mobilitätsplan Ingolstadt 2040+", url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=254782&type=do" },
    { text: "Verordnung (EU) 2024/1679 über das transeuropäische Verkehrsnetz", url: "https://eur-lex.europa.eu/eli/reg/2024/1679/oj" }
  ]
};
