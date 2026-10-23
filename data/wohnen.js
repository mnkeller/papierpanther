/* Von Hand gepflegt: Daten fuer wohnen.html (Dachseite "Wohnen"; die
   Mieteseite miete.html bleibt eigenstaendig und wird verlinkt).

   Geplante Gliederung der Seite:
     0 Auf einen Blick · 1 Mieten oder besitzen? · 2 Wem gehoeren die Wohnungen?
     3 Leerstand · 4 Was die Stadt tun kann und was nicht (festes Raster: Was ist
     das? / Wer entscheidet? / Gibt es das in Ingolstadt? / Stand im Stadtrat;
     nur Werkzeuge, die im Stadtrat Thema waren) · 5 Wohnen im Haushalt
     (Einnahmen, Ausgaben, Vermoegen; Bogen zu hsk.html/haushalt.html)
     6 Wenn die Wohnung fehlt · 7 Im Stadtrat · 8 Was fehlt · 9 Quellen
   Erklaeren statt fordern: Bewertungen gehoeren in den Podcast, nicht hierher.

   Quelle der Zahlen: Zensus 2022, Gebaeude- und Wohnungszaehlung, Stichtag
   15.05.2022 (Vergleich: Zensus 2011, Stichtag 09.05.2011), Zensusdatenbank
   https://ergebnisse.zensus2022.de/datenbank/online/ — Tabellen 4000W-1001,
   4000W-1011, 4000W-2002, 4000W-0018, 4000W-0026, 4000W-0006, 5000H-1017,
   jeweils Kreisebene (Ingolstadt = 09161), abgerufen am 23.10.2026.
   © Statistische Aemter des Bundes und der Laender, Deutschland, 2026.
   Datenlizenz Deutschland – Namensnennung – Version 2.0.
   Die Zensuszahlen aendern sich nicht mehr; der naechste Zensus ist fuer 2031
   geplant. Neuere Wohnungszahlen gibt es nur aus der Fortschreibung. */
window.WOHNEN_DATEN = {
  stand: "2026-10-23",
  zensus: {
    stichtag: "15.05.2022",
    stichtag_vorher: "09.05.2011",

    /* Wohnungen in Gebaeuden mit Wohnraum nach Art der Nutzung (4000W-1001). */
    nutzung: {
      2022: { gesamt: 71751, eigentuemer: 25562, vermietet: 43184, ferien: 223, leer: 2785 },
      2011: { gesamt: 61419, eigentuemer: 23992, vermietet: 35931, ferien: 51, leer: 1447 }
    },

    /* Haushalte in Miet- oder selbst bewohnten Eigentumswohnungen (5000H-1017).
       Das ist die eigentliche Antwort auf "Wie viele mieten, wie viele besitzen?". */
    haushalte: {
      2022: { gesamt: 67430, eigentum: 25206, miete: 42226 },
      2011: { gesamt: 59573, eigentum: 23786, miete: 35790 }
    },

    /* Wohnungen nach Eigentumsform des Gebaeudes, 2022 (4000W-1011, 4000W-2002)
       mit Leerstand (Anzahl, 4000W-2002), Leerstandsquote (4000W-0018),
       marktaktiver Leerstandsquote bei Geschosswohnungen (4000W-0026) und
       durchschnittlicher Nettokaltmiete in €/m² (4000W-0006). */
    eigentum: [
      { id: "privat", n: "Privatpersonen", l: "Einzelne Menschen",
        wohnungen: 31953, leer: 1312, leer_quote: 4.0, leer_marktaktiv: 2.2, miete: 9.26 },
      { id: "weg", n: "Eigentümergemeinschaften", l: "Eigentums-Wohnungen",
        wohnungen: 24712, leer: 1019, leer_quote: 4.0, leer_marktaktiv: 2.4, miete: 11.08 },
      { id: "kommunal", n: "Kommune oder kommunales Wohnungsunternehmen (vor allem die GWG)", l: "Die Stadt und ihre Wohnungs-Firma",
        wohnungen: 8173, leer: 90, leer_quote: 1.1, leer_marktaktiv: 1.0, miete: 6.42 },
      { id: "unternehmen_wohnen", n: "Privatwirtschaftliche Wohnungsunternehmen", l: "Wohnungs-Firmen",
        wohnungen: 2455, leer: 202, leer_quote: 8.3, leer_marktaktiv: 5.6, miete: 8.78 },
      { id: "unternehmen_andere", n: "Andere Unternehmen", l: "Andere Firmen",
        wohnungen: 2779, leer: 72, leer_quote: 2.5, leer_marktaktiv: 1.3, miete: 7.46 },
      { id: "organisation", n: "Kirchen und andere Organisationen ohne Erwerbszweck", l: "Kirchen und Vereine",
        wohnungen: 916, leer: 46, leer_quote: 9.5, leer_marktaktiv: 7.7, miete: 8.28 },
      { id: "genossenschaft", n: "Wohnungsgenossenschaften", l: "Genossenschaften",
        wohnungen: 723, leer: 27, leer_quote: 3.7, leer_marktaktiv: 3.0, miete: 5.36 },
      { id: "bund_land", n: "Bund oder Land", l: "Bund oder Land",
        wohnungen: 43, leer: 15, leer_quote: 53.6, leer_marktaktiv: 0.0, miete: 3.94 }
    ],
    gesamt: { leer_quote: 3.8, leer_marktaktiv: 2.3, miete: 9.16 },

    /* Vergleich: die acht bayerischen Grossstaedte (ueber 100.000 Einwohner), 2022. Anteile in Prozent.
       wohnungen_selbst: Anteil vom Eigentuemer bewohnter Wohnungen (4000W-1001),
       haushalte_eigentum: Anteil der Haushalte im Eigentum (5000H-1017). */
    vergleich: [
      { stadt: "Ingolstadt", wohnungen: 71751,  wohnungen_selbst: 35.6, haushalte_eigentum: 37.4, leer: 3.9, leer_marktaktiv: 2.3, miete: 9.16 },
      { stadt: "Augsburg",   wohnungen: 162407, wohnungen_selbst: 30.0, haushalte_eigentum: 31.5, leer: 4.3, leer_marktaktiv: 2.1, miete: 8.48 },
      { stadt: "Nürnberg",   wohnungen: 283757, wohnungen_selbst: 26.9, haushalte_eigentum: 27.8, leer: 3.2, leer_marktaktiv: 1.6, miete: 8.21 },
      { stadt: "Würzburg",   wohnungen: 80200,  wohnungen_selbst: 22.8, haushalte_eigentum: 23.6, leer: 3.1, leer_marktaktiv: 1.2, miete: 8.65 },
      { stadt: "München",    wohnungen: 824103, wohnungen_selbst: 22.6, haushalte_eigentum: 23.3, leer: 2.7, leer_marktaktiv: 1.4, miete: 12.89 },
      { stadt: "Regensburg", wohnungen: 92661,  wohnungen_selbst: 21.1, haushalte_eigentum: 21.8, leer: 2.9, leer_marktaktiv: 1.4, miete: 9.38 },
      { stadt: "Fürth",      wohnungen: 67833,  wohnungen_selbst: 32.5, haushalte_eigentum: 33.8, leer: 3.5, leer_marktaktiv: 1.5, miete: 7.71 },
      { stadt: "Erlangen",   wohnungen: 68102,  wohnungen_selbst: 28.0, haushalte_eigentum: 29.8, leer: 4.9, leer_marktaktiv: 2.4, miete: 9.20 }
    ]
  },

  /* Die staedtische Wohnungsgesellschaft, fuer den Kasten in Abschnitt 2.
     Quellen: Jahresabschluss 2025 (Stadtrat 29.07.2026) und Mitteilung der
     Verwaltung zur Wohnungsgesellschaft (Stadtrat 30.10.2025). */
  gwg: {
    name: "Gemeinnützige Wohnungsbaugesellschaft Ingolstadt GmbH",
    jahr: 2025, ueberschuss_mio: 4.87, bilanzsumme_mio: 537.5,
    url_abschluss: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=23126",
    url_gesellschaft: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22382"
  },

  /* Stand der Fortschreibung laut Verwaltung (Stellungnahme zur
     Zweckentfremdungssatzung, Stadtentwicklungsausschuss 14.07.2026). */
  fortschreibung: { wohnungen_2022: 71400, wohnungen_2025: 73400,
    url: "https://www.ingolstadt.de/sessionnet/si0056.php?__ksinr=13534" },

  /* Was beim Darstellen beachtet werden muss. Gehoert (sinngemaess) auf die Seite. */
  hinweise: [
    { id: "gwg_einordnung",
      n: "2011 zählte der Zensus nur 222 Wohnungen als kommunal, 2022 sind es 8.173. Das liegt sehr wahrscheinlich an einer anderen Einordnung der GWG und nicht an Neubau – 2011 standen 4.096 Wohnungen bei privatwirtschaftlichen Wohnungsunternehmen, 2022 nur noch 2.455. Den Anstieg deshalb nicht als Wachstum zeigen." },
    { id: "leerquote_zwei_werte",
      n: "Die Kennzahl-Tabelle (4000W-0018) nennt 3,8 % Leerstand, die Zähltabelle (4000W-1001) 2.785 von 71.751 Wohnungen = 3,9 %. Warum die Werte abweichen, sagt die Datenbank nicht. Im Text 3,9 % mit der Anzahl nennen, bei Quoten nach Eigentumsform die Kennzahl-Tabelle." },
    { id: "summen",
      n: "Die Eigentumsformen summieren sich auf 71.754 statt 71.751 Wohnungen und 2.783 statt 2.785 leere. Das ist gewollt: Der Zensus verändert einzelne Werte minimal, damit sich keine Einzelfälle zurückrechnen lassen. Auf der Seite immer die Gesamtzahl aus der Tabelle nennen, nicht selbst addieren." },
    { id: "bund_land_klein",
      n: "53,6 % Leerstand bei „Bund oder Land“ sind 15 von 43 Wohnungen. Nicht als Schlagzeile verwenden." },
    { id: "marktaktiv",
      n: "„Marktaktiv“ heißt: kurzfristig vermietbar, also ohne Wohnungen, die etwa wegen Sanierung oder Abriss leer stehen; nur Geschosswohnungen (Häuser mit drei oder mehr Wohnungen). Genaue Abgrenzung vor Veröffentlichung in der Merkmalsdefinition der Zensusdatenbank nachlesen. Keine Faustregel („2–3 % sind normal“) ohne Quelle auf die Seite schreiben." },
    { id: "grundsteuer_630",
      n: "Grundsteuer B: Die Vorlage V0131/26 schlug 650 % vor, der Stadtrat hat am 26.03.2026 nach einer Sitzungspause 630 % beschlossen (40:7 Stimmen). Beleg: Beschlussauszug in der Vorlage.",
      url: "https://www.ingolstadt.de/sessionnet/getfile.php?id=248902&type=do" },
    { id: "grundsteuer_c",
      n: "Grundsteuer C (für baureife, unbebaute Grundstücke) dürfen bayerische Gemeinden nicht erheben: Das Bayerische Grundsteuergesetz sieht sie nicht vor. Stand der Recherche bis 2025 – vor Veröffentlichung prüfen." }
  ],

  /* Noch nicht gefunden oder geprueft. */
  fehlt: [
    { n: "Aktuelle Leerstandszahlen", d: "Laufend erhoben wird Leerstand nirgends; der Zensus ist die einzige amtliche Quelle." },
    { n: "Dauer und Gründe des Leerstands", d: "Im Zensus 2022 erfragt, eine Tabelle für Gemeinden haben wir nicht gefunden." },
    { n: "Zahlen nach Stadtbezirken", d: "Die Stadt hat eine eigene Statistik; gefunden haben wir nur eine Ausgabe von 2017." },
    { n: "Sozialwohnungen und auslaufende Bindungen", d: "Noch nicht geprüft." }
  ],

  quellen: [
    { text: "Zensus 2022, Zensusdatenbank (Tabellen 4000W-1001, 4000W-1011, 4000W-2002, 4000W-0018, 4000W-0026, 4000W-0006, 5000H-1017), Datenlizenz Deutschland – Namensnennung 2.0", url: "https://ergebnisse.zensus2022.de/datenbank/online/" },
    { text: "Stadt Ingolstadt, Vorlage V0131/26 (Grundsteuer B), Beschluss des Stadtrats vom 26.03.2026", url: "https://www.ingolstadt.de/sessionnet/vo0050.php?__kvonr=22875" }
  ]
};
