/* Skript der Seite mobilitaet.html (Themenseite "Mobilitaetsplan").
   Alle Zahlen kommen aus data/mobilitaet.js; hier stehen nur Texte in
   normaler und Einfacher Sprache und die Diagramme. Aufbau wie seiten/wohnen.js. */
(function () {
  "use strict";
  var H = window.PP_HILFEN;
  var zahl = H.zahl, el = H.el, absatz = H.absatzHtml, datumDE = H.datum, esc = H.esc;
  var D = window.MOBILITAET_DATEN;
  if (!D) {
    document.querySelectorAll(".ladehinweis").forEach(function (e) {
      e.textContent = "Die Daten zum Mobilitätsplan konnten nicht geladen werden.";
    });
    return;
  }
  var V = D.vorlage, M = D.modal, O = D.oev, F = D.fuss_rad, A = D.auto, U = D.unfaelle, B = D.beteiligung;
  var IN23 = M.reihen[0], IN17 = M.reihen[1], ST = M.reihen[2];

  function pz(n, st) { return zahl(n, st || 0) + " %"; }
  function lnk(url, inhalt) {
    return "<a href=\"" + url + "\" rel=\"noopener noreferrer\" target=\"_blank\">" + inhalt + "</a>";
  }
  function liste(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " und " + a[a.length - 1]; }
  var HEUTE = new Date().toISOString().slice(0, 10);

  var LS_KEY_LEICHT = "papierpanther-leichte-sprache";
  var leicht = false;
  try { leicht = localStorage.getItem(LS_KEY_LEICHT) === "1"; } catch (err) { /* Storage kann gesperrt sein */ }
  function t(normal, leichtText) { return leicht ? leichtText : normal; }
  function nl(o) { return o ? (leicht ? o.l : o.n) : ""; }

  var MITTEL = [
    { id: "fuss", n: "Zu Fuß", l: "Zu Fuß" },
    { id: "rad", n: "Fahrrad", l: "Rad" },
    { id: "auto", n: "Auto und Motorrad", l: "Auto" },
    { id: "oev", n: "Bus und Bahn", l: "Bus und Bahn" }
  ];

  var entscheidung = V.beratung[V.beratung.length - 1];
  var bezMaxFuss = D.bezirke.reduce(function (m, b) { return b.fuss > m.fuss ? b : m; });
  var bezMinFuss = D.bezirke.reduce(function (m, b) { return b.fuss < m.fuss ? b : m; });
  var bezMaxRad = D.bezirke.reduce(function (m, b) { return b.rad > m.rad ? b : m; });
  var bezMinRad = D.bezirke.reduce(function (m, b) { return b.rad < m.rad ? b : m; });
  var kleine = D.bezirke.filter(function (b) { return b.faelle < 100; }).map(function (b) { return b.n; });
  var raumBest = O.teilraeume.reduce(function (m, r) { return r.schlecht < m.schlecht ? r : m; });
  var raumSchlecht = O.teilraeume.reduce(function (m, r) { return r.schlecht > m.schlecht ? r : m; });

  var TEXTE = {
    "hinweis": {
      n: "<strong>PapierPanther ist kein Angebot der Stadt Ingolstadt.</strong> " +
        "Die Zahlen stammen aus der Beschlussvorlage " + esc(V.nr) + " der Stadt und ihren Anlagen. Dies ist ein Prototyp.",
      l: "<strong>PapierPanther ist kein Angebot der Stadt Ingolstadt.</strong> " +
        "Die Zahlen kommen aus Berichten der Stadt. Die Seite ist noch ein Test.",
    },
    "h1": { n: "Mobilitätsplan: Wie Ingolstadt unterwegs ist", l: "Der Plan für den Verkehr in Ingolstadt" },
    "lede": {
      n: "Die Stadt arbeitet an einem Mobilitätsplan für die Zeit bis 2040 und darüber hinaus. Er soll festlegen, wie sich Auto, Bus und Bahn, " +
        "Rad- und Fußverkehr entwickeln. Der Stadtrat entscheidet am " + datumDE(entscheidung.datum) + " über Leitbild und Ziele. " +
        "Die Berichte dazu zeigen zum ersten Mal, wie die Menschen in den einzelnen Stadtbezirken unterwegs sind.",
      l: "Die Stadt macht einen Plan für den Verkehr. Der Plan gilt bis zum Jahr 2040 und länger. " +
        "Es geht um Autos, Busse, Fahrräder und Fuß-Wege. " +
        "Am " + datumDE(entscheidung.datum) + " entscheidet der Stadtrat über die Ziele. " +
        "Hier sehen Sie: So sind die Menschen in Ingolstadt unterwegs.",
    },
    "sprung-beschluss": { n: "Was beschlossen wird", l: "Was wird entschieden?" },
    "sprung-bezirke": { n: "Ihr Bezirk", l: "Ihr Stadt-Teil" },
    "sprung-bus": { n: "Bus und Bahn", l: "Bus und Bahn" },
    "sprung-fussrad": { n: "Zu Fuß und mit dem Rad", l: "Zu Fuß und mit dem Rad" },
    "sprung-sicherheit": { n: "Unfälle", l: "Unfälle" },
    "sprung-ziele": { n: "Frühere Ziele", l: "Alte Ziele" },
    "blick-h2": { n: "Auf einen Blick", l: "Das Wichtigste" },
    "stichtag": {
      n: "Anteil an allen Wegen der Ingolstädterinnen und Ingolstädter. Erhebung „Mobilität in Deutschland“, " + M.stichprobe.zeitraum +
        ", " + zahl(M.stichprobe.personen) + " Befragte in " + zahl(M.stichprobe.haushalte) + " Haushalten. Die Summe ergibt durch Rundung 101.",
      l: "Von 100 Wegen: So viele machen die Menschen aus Ingolstadt zu Fuß, mit dem Rad, mit dem Auto oder mit Bus und Bahn. " +
        "Dafür wurden " + zahl(M.stichprobe.personen) + " Menschen befragt.",
    },

    "beschluss-h2": { n: "Was der Stadtrat beschließen soll", l: "Was entscheidet der Stadtrat?" },
    "beschluss-p1": {
      n: "Die " + lnk(V.url, "Vorlage " + esc(V.nr)) + " hat drei Teile. Zwei Berichte werden dem Stadtrat nur bekannt gegeben: die Befragung " +
        "„Mobilität in Deutschland“ für Ingolstadt und die Bestandsanalyse des Planungsbüros. Beschlossen werden sollen das Leitbild und das Zielkonzept. " +
        "Konkrete Maßnahmen, etwa neue Buslinien, Radwege oder Parkregeln, enthält die Vorlage noch nicht.",
      l: "Der Stadtrat bekommt zwei Berichte. Darin steht: So ist der Verkehr heute. " +
        "Und der Stadtrat soll Ziele für den Verkehr beschließen. " +
        "Was genau gebaut oder geändert wird, steht noch nicht fest.",
    },
    "beschluss-p2": {
      n: "Der Plan ist Pflicht: Ingolstadt ist einer von " + V.knoten_deutschland + " „städtischen Knoten“ im europäischen Verkehrsnetz. " +
        "Nach einer EU-Verordnung von 2024 müssen diese Städte bis zum " + datumDE(V.frist_eu) + " einen nachhaltigen Mobilitätsplan aufstellen " +
        "und danach Kennzahlen an die EU melden. 2027 sollen die Maßnahmen mit Beteiligung der Öffentlichkeit erarbeitet werden; " +
        "den fertigen Plan will die Verwaltung dem Stadtrat " + esc(V.endbericht) + " vorlegen. Erstellt wird er von der " + esc(V.buero) + ".",
      l: "Die Stadt muss diesen Plan machen. Das ist eine Regel von der Europäischen Union. " +
        "Der Plan muss bis Ende 2027 fertig sein. " +
        "Im Jahr 2027 können die Menschen in Ingolstadt wieder mitreden.",
    },
    "zielkonzept-h3": { n: "Das Zielkonzept: vier Oberziele, fünf Räume", l: "Die Ziele" },
    "zielkonzept-p": {
      n: "Das Leitbild heißt „" + esc(D.ziele.leitbild) + "“. Darunter stehen vier Oberziele. Für jeden der fünf Teilräume gibt es zu jedem Oberziel " +
        "ein Unterziel, zusammen 20. Die Teilräume folgen dem Stadtentwicklungskonzept ISEK; „Gesamtstadt“ kam nach dem Workshop des Stadtrats dazu.",
      l: "Es gibt 4 große Ziele. Für jeden Teil der Stadt gibt es dazu kleinere Ziele.",
    },

    "unterwegs-h2": { n: "Wie Ingolstadt unterwegs ist", l: "So sind die Menschen unterwegs" },
    "unterwegs-p1": {
      n: "Jeden Tag legen die Ingolstädterinnen und Ingolstädter rund " + zahl(M.wege_tag) + " Wege zurück. Knapp die Hälfte davon mit Auto oder Motorrad (" +
        pz(IN23.auto) + "), gut ein Viertel zu Fuß (" + pz(IN23.fuss) + "), " + pz(IN23.rad) + " mit dem Rad und " + pz(IN23.oev) + " mit Bus und Bahn. " +
        "Gegenüber 2017 ist vor allem der Fußverkehr gewachsen, der Radanteil ist gesunken. Das Auto liegt unter dem Bundeswert (" + pz(M.auto_bund) +
        ") und dem bayerischen Wert (" + pz(M.auto_bayern) + "), aber über dem vergleichbarer Großstädte (" + pz(ST.auto) + ").",
      l: "Die Menschen aus Ingolstadt machen jeden Tag ungefähr " + zahl(M.wege_tag) + " Wege. " +
        "Fast die Hälfte davon mit dem Auto. Ungefähr jeden 4. Weg gehen sie zu Fuß. " +
        "Mit Bus und Bahn fahren sie selten.",
    },
    "unterwegs-p2": {
      n: "Gefragt wurde auch, wie die Menschen die Bedingungen vor Ort bewerten. Zu Fuß gehen, Rad fahren und Auto fahren schneiden in Ingolstadt besser ab " +
        "als im Bundesschnitt und in vergleichbaren Städten. Nur bei Bus und Bahn liegt Ingolstadt hinter den vergleichbaren Städten.",
      l: "Die Menschen wurden gefragt: Wie gut geht das in Ingolstadt? " +
        "Zu Fuß gehen, Rad fahren und Auto fahren finden die meisten gut. Bus und Bahn finden viele nicht so gut.",
    },

    "bezirke-h2": { n: "Ihr Bezirk: große Unterschiede", l: "So ist es in Ihrem Stadt-Teil" },
    "bezirke-p1": {
      n: "Die Bestandsanalyse wertet die Befragung auch nach Stadtbezirken aus. Der Anteil der Fußwege reicht von " + pz(bezMinFuss.fuss) + " in " +
        esc(bezMinFuss.n) + " bis " + pz(bezMaxFuss.fuss) + " in " + esc(bezMaxFuss.n) + ", der Radanteil von " + pz(bezMinRad.rad) + " in " + esc(bezMinRad.n) +
        " bis " + pz(bezMaxRad.rad) + " im Bezirk " + esc(bezMaxRad.n) + ". Der Bezirk " + esc(D.bezirk_fehlt) + " fehlt in der Auswertung.",
      l: "In jedem Stadt-Teil sind die Menschen anders unterwegs. " +
        "In " + esc(bezMaxFuss.n) + " gehen besonders viele zu Fuß. " +
        "Für den Stadt-Teil " + esc(D.bezirk_fehlt) + " gibt es keine Zahlen.",
    },

    "bus-h2": { n: "Bus und Bahn: das schwächste Glied", l: "Bus und Bahn" },
    "bus-p1": {
      n: "Nur " + pz(IN23.oev) + " der Wege entfallen auf Bus und Bahn, in vergleichbaren Großstädten sind es " + pz(ST.oev) + ". " +
        pz(O.nie) + " der Befragten ab 14 Jahren fahren nie oder fast nie damit, " + pz(O.woechentlich) + " mindestens einmal pro Woche (bundesweit " +
        pz(O.woechentlich_bund) + "). Als Hindernis nennen die Befragten am häufigsten schlechte Verbindungen. Die Preise stören in Ingolstadt mehr Menschen " +
        "als im Bundesschnitt (" + pz(O.preise_bund) + ").",
      l: "Nur wenige Wege machen die Menschen mit Bus und Bahn. " +
        "Viele fahren fast nie damit. Der häufigste Grund: Es gibt keine gute Verbindung. Vielen ist es auch zu teuer.",
    },
    "bus-raum-h3": { n: "Je nach Stadtteil fällt das Urteil anders aus", l: "Nicht überall gleich" },
    "bus-raum-p": {
      n: "Für die Bewertung fasst der Bericht die Stadtbezirke zu fünf Teilräumen zusammen. Im Schnitt bekommt der Nahverkehr die Schulnote " +
        zahl(O.note, 1) + " (bundesweit " + zahl(O.note_bund, 1) + "). Am besten schneidet er in den " + esc(raumBest.n.replace("Stadtteile", "Stadtteilen")) +
        " ab, am schlechtesten in den Ortsteilen Etting, Oberhaunstadt und Mailing: Dort vergibt fast jeder Vierte die Note mangelhaft oder ungenügend.",
      l: "Im Süden von der Donau finden die Menschen Bus und Bahn am besten. " +
        "In Etting, Oberhaunstadt und Mailing sind viele unzufrieden.",
    },
    "bus-stand-h3": { n: "Haltestellen, Kürzungen, Stadtbahn", l: "Was sich geändert hat" },
    "bus-stand-p1": {
      n: "Von den " + zahl(O.haltepunkte) + " Haltepunkten an " + zahl(O.haltestellen) + " Haltestellen sind " + zahl(O.haltepunkte_barrierefrei) +
        " barrierefrei ausgebaut, rund " + pz(O.barrierefrei_prozent) + ". Die Busse selbst sind alle barrierefrei. Als schwächer erschlossen nennt der Bericht unter anderem " +
        liste(O.schwach.map(esc)) + ".",
      l: "Ungefähr jede 3. Halte-Stelle hat keine Hindernisse mehr. Alle Busse sind ohne Stufen.",
    },
    "bus-stand-p2": {
      n: "Der Bericht hält auch fest, was zuletzt gestrichen wurde: Die Nachtlinien fahren seit " + datumDE(O.nachtlinien_seit) +
        " wieder im Stundentakt, wegen der Haushaltskonsolidierung. Die direkte Buslinie vom Klinikum zum Hauptbahnhof wurde zum " + datumDE(O.klinikum_hbf_bis) +
        " wegen zu geringer Nachfrage eingestellt. Eine Straßenbahn (rund " + zahl(O.studie.tram_mio) + " Mio. €) oder ein Busway auf eigener Trasse (rund " +
        zahl(O.studie.busway_mio) + " Mio. €) hat eine Studie 2024 untersucht. Mehr zum Sparen beim Nahverkehr steht auf der Seite zum <a href=\"hsk.html\">Sparplan</a>.",
      l: "Die Stadt muss sparen. Deshalb fahren die Nacht-Busse seit März 2026 nur noch 1-mal in der Stunde. " +
        "Mehr dazu steht auf der Seite zum <a href=\"hsk.html\">Spar-Plan</a>.",
    },

    "fussrad-h2": { n: "Zu Fuß und mit dem Rad", l: "Zu Fuß und mit dem Rad" },
    "fussrad-p1": {
      n: "Die Altstadt ist zu Fuß in zehn Minuten durchquert, der Weg zum Hauptbahnhof dauert über 20 Minuten. Außerhalb der Altstadt sieht der Bericht Mängel: " +
        "In " + liste(F.ohne_nahversorgung.map(esc)) + " liegen zentrale Einrichtungen nicht innerhalb von 15 Gehminuten. " +
        "Gehwege unter zwei Metern Breite nennt der Bericht hier:",
      l: "In der Altstadt kommt man zu Fuß gut überall hin. Am Rand der Stadt ist das schwerer. " +
        "In manchen Orts-Teilen gibt es keinen Laden in der Nähe. An diesen Stellen sind die Geh-Wege zu schmal:",
    },
    "fussrad-p2": {
      n: "An der Münchener und der Manchinger Straße liegen sichere Querungen teils über " + zahl(F.querung_abstand_ist) + " Meter auseinander; der Bericht nennt " +
        zahl(F.querung_abstand_soll) + " Meter als Richtwert. Ein Leitsystem für Fußgänger gibt es nicht.",
      l: "An manchen großen Straßen kann man nur selten sicher über die Straße gehen.",
    },
    "fussrad-weiter": {
      n: "Was Sie von Ihrer Adresse aus in 15 Minuten zu Fuß erreichen, zeigt die Karte <a href=\"wege.html\">Deine 15 Minuten</a>.",
      l: "Was erreichen Sie in 15 Minuten zu Fuß? Das zeigt die Seite <a href=\"wege.html\">Deine 15 Minuten</a>.",
    },
    "rad-h3": { n: "Radverkehr", l: "Rad fahren" },
    "rad-p1": {
      n: "Die Hälfte der Befragten fährt mindestens einmal pro Woche Rad (bundesweit " + pz(F.rad_woche_bund) + "), in Etting, Oberhaunstadt und Mailing sind es " +
        pz(F.rad_woche_ortsteile) + ". Das Radnetz ist rund " + zahl(F.radnetz_km) + " Kilometer lang; auf " + zahl(F.radnetz_gemeinsam_km) +
        " Kilometern teilen sich Radfahrende den Weg mit Fußgängern. Der Bericht nennt Netzlücken, abrupte Wechsel zwischen Fahrbahn und Seitenraum und Konflikte auf gemeinsamen Wegen.",
      l: "Jeder 2. fährt mindestens 1-mal in der Woche Rad. " +
        "Auf vielen Wegen fahren Räder und gehen Fußgänger zusammen. Das gibt manchmal Streit.",
    },
    "rad-p2": {
      n: "Im Fahrradklima-Test des ADFC " + F.klimatest.jahr + " bekam Ingolstadt die Note " + zahl(F.klimatest.note, 1) + " (Bundesschnitt " + zahl(F.klimatest.note_bund, 2) +
        ") und Platz " + F.klimatest.platz + " von " + F.klimatest.von + " in seiner Größenklasse. Die schlechteste Einzelnote gab es für den Fahrradverleih (" +
        zahl(F.klimatest.verleih, 1) + "): Ein öffentliches Leihradsystem hat Ingolstadt nicht. " + liste(F.nur_ebike.map(esc)) +
        " sind laut Bericht wegen der Entfernung nur mit E-Bike oder Pedelec an das Zentrum angebunden.",
      l: "Rad-Fahrer geben Ingolstadt die Schul-Note " + zahl(F.klimatest.note, 1) + ". In Ingolstadt kann man kein Fahrrad ausleihen.",
    },
    "auto-h3": { n: "Auto", l: "Auto" },
    "auto-p": {
      n: "Mit " + zahl(A.pkw_je_1000) + " Pkw je 1.000 Einwohner hat Ingolstadt die höchste Pkw-Dichte in Bayern (Landesschnitt " + zahl(A.pkw_bayern) + "). " +
        "Über " + pz(A.gewerblich_prozent) + " der Fahrzeuge sind allerdings Firmen- und Dienstwagen, viele aus dem Umfeld von Audi. Aussagekräftiger ist die Befragung: " +
        pz(A.haushalte_mit_pkw) + " der Haushalte haben mindestens ein Auto, in vergleichbaren Großstädten " + pz(A.haushalte_mit_pkw_staedte) + ". " +
        "Täglich pendeln rund " + zahl(A.einpendler) + " Beschäftigte nach Ingolstadt ein und " + zahl(A.auspendler) + " aus. Über die Theodor-Heuss-Brücke fahren mehr als " +
        zahl(A.bruecke_dtv) + " Fahrzeuge am Tag.",
      l: "In Ingolstadt gibt es sehr viele Autos. Viele davon gehören Firmen. " +
        "Fast 9 von 10 Haushalten haben ein Auto. Jeden Tag kommen ungefähr " + zahl(A.einpendler) + " Menschen zum Arbeiten in die Stadt.",
    },

    "sicherheit-h2": { n: "Unfälle", l: "Unfälle" },
    "sicherheit-p1": {
      n: "Die Polizei hat 2024 in Ingolstadt " + zahl(U[2024].unfaelle) + " Verkehrsunfälle aufgenommen. " + zahl(U[2024].verletzte) + " Menschen wurden verletzt, " +
        zahl(U[2024].schwer) + " davon schwer; getötet wurde niemand. Rund " + pz(U.rad_scooter_anteil_verletzte) + " der Verletzten waren mit dem Fahrrad oder dem E-Scooter unterwegs. " +
        "Die Zahl der E-Scooter-Unfälle hat sich gegenüber dem Vorjahr mehr als verdoppelt. Als Leitlinie nennt das Zielkonzept „Vision Zero“: keine Toten und Schwerverletzten.",
      l: "Im Jahr 2024 gab es " + zahl(U[2024].unfaelle) + " Unfälle. " + zahl(U[2024].verletzte) + " Menschen wurden verletzt. Niemand ist gestorben. " +
        "Ungefähr die Hälfte der Verletzten war mit dem Rad oder dem E-Roller unterwegs.",
    },
    "sicherheit-weiter": {
      n: "Wo sich Unfälle häufen, steht im Bericht nicht. Unfälle mit Verletzten an einzelnen Orten zeigt die <a href=\"index.html\">Startseite</a> bei den Verkehrsthemen.",
      l: "Wo passieren die Unfälle? Das zeigt die <a href=\"index.html\">Start-Seite</a>.",
    },

    "ziele-h2": { n: "Frühere Ziele und der Stand heute", l: "Alte Ziele und heute" },
    "ziele-p1": {
      n: "Das neue Zielkonzept enthält keine Zahlen. Ältere Beschlüsse der Stadt schon. Die Bestandsanalyse stellt sie dem Stand der Befragung von 2023 gegenüber:",
      l: "In den neuen Zielen stehen keine Zahlen. In älteren Plänen von der Stadt schon. Hier sehen Sie die alten Ziele und den Stand heute:",
    },
    "ziele-p2": {
      n: "Das Klimaschutzkonzept nennt außerdem 60 % für Fuß, Rad sowie Bus und Bahn zusammen (heute 53 %) und eine Verdoppelung des Anteils von Bus und Bahn bis 2026. " +
        "Für den Fußverkehr steht dort ein Ziel von 12,6 %; es beruht auf einer älteren Datengrundlage und lässt sich mit den heutigen " + pz(IN23.fuss) +
        " nicht vergleichen. Die Bestandsanalyse hält fest, dass die Anteile von Bus und Bahn sowie Rad stagnieren oder zurückgehen.",
      l: "Bus und Bahn und das Rad sollten wichtiger werden. Das hat bisher nicht geklappt.",
    },

    "wuensche-h2": { n: "Was sich die Menschen wünschen", l: "Was wünschen sich die Menschen?" },
    "wuensche-p1": {
      n: "Vom 01.07. bis 21.09.2025 konnten alle online mitmachen. " + zahl(B.teilnehmende) + " Menschen haben teilgenommen, " + zahl(B.von_ausserhalb) +
        " davon wohnen außerhalb von Ingolstadt; nur " + pz(B.ab70_prozent) + " waren 70 Jahre oder älter. Die Umfrage ist also nicht repräsentativ. " +
        "Auf einer Karte wurden " + B.kartenhinweise + " Orte markiert. Auf die Frage, was sich ändern müsste, damit sie öfter Bus, Bahn, Rad oder die eigenen Füße nutzen, antworteten die Teilnehmenden:",
      l: "Im Sommer 2025 konnten alle im Internet mitmachen. " + zahl(B.teilnehmende) + " Menschen haben mitgemacht. " +
        "Die Frage war: Was muss besser werden? Das waren die Antworten:",
    },

    "fehlt-h2": { n: "Was in den Berichten nicht steht", l: "Was fehlt?" },
    "fehlt-p": {
      n: "Diese Punkte lassen die Unterlagen offen. Das ist keine Kritik, sondern ein Hinweis darauf, wonach man fragen kann.",
      l: "Diese Dinge stehen nicht in den Berichten:",
    },
  };

  function kacheln() {
    var box = document.getElementById("kennzahlen");
    box.innerHTML = "";
    var unter = {
      fuss: t("2017: " + pz(IN17.fuss), "früher: " + IN17.fuss + " von 100"),
      rad: t("2017: " + pz(IN17.rad), "früher: " + IN17.rad + " von 100"),
      auto: t("2017: " + pz(IN17.auto) + ", bundesweit " + pz(M.auto_bund), "früher: " + IN17.auto + " von 100"),
      oev: t("2017: " + pz(IN17.oev) + ", vergleichbare Städte " + pz(ST.oev), "früher: " + IN17.oev + " von 100"),
    };
    MITTEL.forEach(function (m) {
      var d = el("div", "kachel");
      d.appendChild(absatz("kachel-label", nl(m)));
      d.appendChild(absatz("kachel-wert", leicht ? IN23[m.id] + " von 100" : pz(IN23[m.id])));
      d.appendChild(absatz("kachel-unter", unter[m.id]));
      box.appendChild(d);
    });
  }

  function legende(container, eintraege) {
    var lg = el("div", "legende");
    eintraege.forEach(function (e) {
      var s = document.createElement("span");
      var i = document.createElement("i");
      i.style.background = getComputedStyle(document.documentElement).getPropertyValue(e.farbe).trim();
      s.appendChild(i);
      s.appendChild(document.createTextNode(e.text));
      lg.appendChild(s);
    });
    container.appendChild(lg);
  }
  function mittelLegende(container) {
    legende(container, MITTEL.map(function (m) { return { farbe: "--" + m.id, text: nl(m) }; }));
  }

  /* zeilen: [{ label, betont, spuren: [{ wert, klasse, anzeige }] }] */
  function balken(container, titel, zeilen, max, leg, fuss) {
    container.innerHTML = "";
    container.appendChild(el("p", "diagramm-titel", titel));
    if (leg) legende(container, leg);
    var li = el("div", "balken");
    li.setAttribute("role", "list");
    zeilen.forEach(function (z) {
      var zeile = el("div", "b-zeile" + (z.betont ? " betont" : ""));
      zeile.setAttribute("role", "listitem");
      zeile.appendChild(el("span", "b-label", z.label));
      var spuren = el("div", "b-spuren");
      z.spuren.forEach(function (s) {
        var spur = el("div", "b-spur");
        var b = el("span", "b-balken " + (s.klasse || ""));
        b.style.width = "calc(var(--skala) * " + (s.wert / max * 100) + "%)";
        b.setAttribute("aria-hidden", "true");
        spur.appendChild(b);
        var zahlEl = el("span", "b-zahl");
        zahlEl.innerHTML = s.anzeige;
        spur.appendChild(zahlEl);
        spuren.appendChild(spur);
      });
      zeile.appendChild(spuren);
      li.appendChild(zeile);
    });
    container.appendChild(li);
    if (fuss) container.appendChild(absatz("diagramm-fuss", fuss));
  }

  /* Gestapelter Balken: zeilen: [{ label, unter, betont, werte: {fuss, rad, auto, oev} }] */
  function stapel(container, titel, zeilen, fuss) {
    container.innerHTML = "";
    container.appendChild(el("p", "diagramm-titel", titel));
    mittelLegende(container);
    var box = el("div", "stapel");
    box.setAttribute("role", "list");
    zeilen.forEach(function (z) {
      if (z.trenner) { box.appendChild(el("div", "s-trenner")); return; }
      var zeile = el("div", "s-zeile" + (z.betont ? " betont" : ""));
      zeile.setAttribute("role", "listitem");
      var lab = el("span", "s-label", z.label);
      if (z.unter) lab.appendChild(el("small", "", z.unter));
      zeile.appendChild(lab);
      var b = el("div", "s-balken");
      var summe = MITTEL.reduce(function (s, m) { return s + z.werte[m.id]; }, 0);
      b.setAttribute("role", "img");
      b.setAttribute("aria-label", MITTEL.map(function (m) { return nl(m) + " " + z.werte[m.id] + " Prozent"; }).join(", "));
      MITTEL.forEach(function (m) {
        var teil = el("span", "s-teil " + m.id, z.werte[m.id] >= 4 ? String(z.werte[m.id]) : "");
        teil.style.width = (z.werte[m.id] / summe * 100) + "%";
        teil.title = nl(m) + ": " + z.werte[m.id] + " %";
        b.appendChild(teil);
      });
      zeile.appendChild(b);
      box.appendChild(zeile);
    });
    container.appendChild(box);
    if (fuss) container.appendChild(absatz("diagramm-fuss", fuss));
  }

  function baueTermine() {
    var ul = document.getElementById("termine");
    ul.innerHTML = "";
    V.beratung.forEach(function (b) {
      var li = el("li", b.datum >= HEUTE ? "kommt" : "");
      var z = el("time", "", datumDE(b.datum));
      z.setAttribute("datetime", b.datum);
      li.appendChild(z);
      var d = el("div", "", t(b.gremium, b.l));
      d.appendChild(el("span", "", b.ergebnis ? b.ergebnis : t(b.art, b.art_l)));
      li.appendChild(d);
      ul.appendChild(li);
    });
  }

  function baueZielkonzept() {
    var box = document.getElementById("zielkonzept");
    box.innerHTML = "";
    box.appendChild(el("p", "diagramm-titel", t("Die 20 Unterziele nach Teilraum und Oberziel", "Die 4 großen Ziele")));
    if (leicht) {
      var ul = el("ul", "ortsliste");
      D.ziele.ober.forEach(function (o) { ul.appendChild(el("li", "", o.l)); });
      box.appendChild(ul);
      return;
    }
    var rahmen = el("div", "tabelle-rahmen");
    var tab = el("table", "zieltabelle");
    var kopf = document.createElement("tr");
    kopf.appendChild(el("th", "", "Teilraum"));
    D.ziele.ober.forEach(function (o) { var th = el("th", "", o.k + " · " + o.n); th.scope = "col"; kopf.appendChild(th); });
    var thead = document.createElement("thead"); thead.appendChild(kopf); tab.appendChild(thead);
    var tb = document.createElement("tbody");
    D.ziele.raeume.forEach(function (r) {
      var tr = document.createElement("tr");
      var th = el("th", "", r.n); th.scope = "row"; tr.appendChild(th);
      r.u.forEach(function (u) { tr.appendChild(el("td", "", u)); });
      tb.appendChild(tr);
    });
    tab.appendChild(tb);
    rahmen.appendChild(tab);
    box.appendChild(rahmen);
    box.appendChild(absatz("diagramm-fuss", "Quelle: Zielkonzept, Anlage 3 der Vorlage " + esc(V.nr) + ". Wortlaut der Unterziele wie dort."));
  }

  function kastenBza() {
    var box = document.getElementById("kasten-bza");
    box.innerHTML = "";
    box.appendChild(el("h3", "", t("Und die Bezirksausschüsse?", "Und die Bezirks-Ausschüsse?")));
    box.appendChild(absatz("", t(
      "Am Workshop des Stadtrats im September nahmen die Ortssprecher teil. Für die Bezirksausschüsse hat die Stadt beim Bund Fördergeld für eigene " +
      "Beteiligungsveranstaltungen beantragt, ebenso für zusätzliche Verkehrszählungen und ein Prognosemodell. Eine Antwort lag bei Abfassung der Vorlage noch nicht vor. " +
      "Wer im Bezirksausschuss für Sie sitzt, steht unter <a href=\"beteiligen.html\">Beteiligen</a>.",
      "Die Stadt möchte auch mit den Bezirks-Ausschüssen über den Plan sprechen. Dafür hat sie Geld vom Staat beantragt. " +
      "Die Antwort ist noch nicht da. Mehr dazu: <a href=\"beteiligen.html\">Mitmachen</a>.")));
  }

  function diagrammModal() {
    stapel(document.getElementById("diagramm-modal"),
      t("Anteil der Verkehrsmittel an allen Wegen, in Prozent", "Von 100 Wegen: so viele mit …"),
      M.reihen.map(function (r, i) { return { label: nl(r), betont: i === 0, werte: r }; }),
      t("Gezählt wird das Hauptverkehrsmittel je Weg; der Fußweg zur Haltestelle zählt zu Bus und Bahn. Auto und Motorrad: selbst fahren (" + pz(M.fahrer) +
        ") und mitfahren (" + pz(M.mitfahrer) + "). Die Erhebungen 2017 und 2023 sind laut Vorlage nur bedingt vergleichbar. Quelle: MiD 2023, Regionalbericht Ingolstadt, S. 7 und 12.",
        "Quelle: Befragung „Mobilität in Deutschland“ 2023."));
  }

  function diagrammZufrieden() {
    var zeilen = D.zufriedenheit.map(function (z) {
      return { label: nl(z), spuren: [
        { wert: z.in, klasse: "ingolstadt", anzeige: pz(z.in) + " <small>Ingolstadt</small>" },
        { wert: z.staedte, klasse: "", anzeige: pz(z.staedte) + " <small>" + t("vergleichbare Städte", "ähnliche Städte") + "</small>" },
      ] };
    });
    balken(document.getElementById("diagramm-zufrieden"),
      t("Anteil der Befragten, die die Bedingungen vor Ort „sehr gut“ oder „gut“ nennen", "So viele sagen: Das ist gut"),
      zeilen, 100, null,
      t("Bundesweit: zu Fuß " + pz(D.zufriedenheit[0].bund) + ", Auto " + pz(D.zufriedenheit[1].bund) + ", Rad " + pz(D.zufriedenheit[2].bund) + ", Bus und Bahn " +
        pz(D.zufriedenheit[3].bund) + ". Quelle: MiD 2023, Regionalbericht Ingolstadt, S. 14.", "Quelle: Befragung 2023."));
  }

  function diagrammBezirke() {
    var zeilen = [{ label: t("Ingolstadt gesamt", "Ganz Ingolstadt"), betont: true, werte: IN23 }, { trenner: true }];
    D.bezirke.forEach(function (b) {
      zeilen.push({ label: b.n, unter: t("n = " + zahl(b.faelle), ""),
        werte: { fuss: b.fuss, rad: b.rad, auto: b.fahrer + b.mitfahrer, oev: b.oev } });
    });
    stapel(document.getElementById("diagramm-bezirke"),
      t("Anteil der Verkehrsmittel an allen Wegen nach Stadtbezirk, in Prozent", "Von 100 Wegen in jedem Stadt-Teil"),
      zeilen,
      t("n = Fallzahl laut Grafik des Berichts. Der Bezirk " + esc(D.bezirk_fehlt) + " ist dort nicht ausgewiesen. Summen weichen durch Rundung von 100 ab. " +
        "Quelle: Analysebericht (Anlage 2), S. 18, nach Daten der MiD 2023.", "Quelle: Bericht für die Stadt, Seite 18."));
  }

  function kastenVorsicht() {
    var box = document.getElementById("kasten-vorsicht");
    box.innerHTML = "";
    box.appendChild(el("h3", "", t("Wie belastbar sind die Bezirkszahlen?", "Vorsicht bei diesen Zahlen")));
    if (leicht) {
      box.appendChild(absatz("", "In manchen Stadt-Teilen wurden nur wenige Menschen befragt. Dann sind die Zahlen ungenau. " +
        "Das gilt besonders für " + liste(kleine.map(esc)) + "."));
      return;
    }
    box.appendChild(absatz("",
      "In kleinen Bezirken beruhen die Werte auf wenigen Befragten: " + liste(kleine.map(esc)) + " liegen unter 100 Fällen. " +
      "Auch der sehr hohe Fußanteil in " + esc(bezMaxFuss.n) + " (" + pz(bezMaxFuss.fuss) + ") stützt sich auf " + zahl(bezMaxFuss.faelle) + " Fälle. " +
      "Einzelne Prozentpunkte sollte man deshalb nicht überbewerten."));
    box.appendChild(absatz("",
      "Auto und Motorrad zeigen wir hier als eine Zahl. In der Grafik des Berichts ist der Anteil der Mitfahrenden in jedem Bezirk höher als der Anteil derer, die selbst fahren " +
      "(zum Beispiel Mitte: " + D.bezirke[0].mitfahrer + " zu " + D.bezirke[0].fahrer + "). Für die ganze Stadt ist es laut Befragung umgekehrt: " + pz(M.fahrer) +
      " fahren selbst, " + pz(M.mitfahrer) + " fahren mit. Wie das zusammenpasst, erklärt der Bericht nicht; die Summe ist davon nicht betroffen."));
  }

  function diagrammHindernisse() {
    balken(document.getElementById("diagramm-hindernisse"),
      t("Was hält Sie davon ab, Bus und Bahn zu nutzen? Anteil der Befragten", "Warum fahren Sie nicht mit Bus und Bahn?"),
      O.hindernisse.map(function (h) { return { label: nl(h), spuren: [{ wert: h.w, klasse: "oev", anzeige: pz(h.w) }] }; }),
      50, null,
      t("Mehrere Antworten möglich. Nicht gezeigt: „Andere Gründe“ (21 %) und „Nichts, ich nutze Bus und Bahn häufig“ (6 %). Quelle: Analysebericht (Anlage 2), S. 20 und 21, nach Daten der MiD 2023.",
        "Man konnte mehrere Gründe nennen. Quelle: Befragung 2023."));
  }

  function diagrammTeilraeume() {
    var zeilen = O.teilraeume.map(function (r) {
      return { label: r.n + (r.klein ? " *" : ""), spuren: [
        { wert: r.gut, klasse: "ingolstadt", anzeige: pz(r.gut) + " <small>" + t("sehr gut oder gut", "gut") + "</small>" },
        { wert: r.schlecht, klasse: "auto", anzeige: pz(r.schlecht) + " <small>" + t("mangelhaft oder ungenügend", "schlecht") + "</small>" },
      ] };
    });
    balken(document.getElementById("diagramm-teilraeume"),
      t("Bewertung von Bus und Bahn vor Ort nach Teilraum", "So bewerten die Menschen Bus und Bahn"),
      zeilen, 50, null,
      t("* geringe Fallzahl (unter 100 Personen). Teilräume: " + O.teilraeume.map(function (r) { return esc(r.n) + " = " + esc(r.bezirke); }).join("; ") +
        ". Quelle: MiD 2023, Regionalbericht Ingolstadt, S. 9 und 29.", "* Hier wurden nur wenige Menschen befragt. Quelle: Befragung 2023."));
  }

  function listeGehwege() {
    var ul = document.getElementById("liste-gehwege");
    ul.innerHTML = "";
    F.schmale_gehwege.forEach(function (g) { ul.appendChild(el("li", "", g)); });
  }

  function tabelle(container, titel, kopf, zeilen, fuss) {
    container.innerHTML = "";
    container.appendChild(el("p", "diagramm-titel", titel));
    var rahmen = el("div", "tabelle-rahmen");
    var tab = el("table", "zieltabelle");
    var tr = document.createElement("tr");
    kopf.forEach(function (k, i) { var th = el("th", i > 0 && k.zahl ? "zahl" : "", k.t); th.scope = "col"; tr.appendChild(th); });
    var thead = document.createElement("thead"); thead.appendChild(tr); tab.appendChild(thead);
    var tb = document.createElement("tbody");
    zeilen.forEach(function (z) {
      var r = document.createElement("tr");
      z.forEach(function (c, i) {
        var zelle = el(i === 0 ? "th" : "td", kopf[i].zahl ? "zahl" : "", c);
        if (i === 0) zelle.scope = "row";
        r.appendChild(zelle);
      });
      tb.appendChild(r);
    });
    tab.appendChild(tb);
    rahmen.appendChild(tab);
    container.appendChild(rahmen);
    if (fuss) container.appendChild(absatz("diagramm-fuss", fuss));
  }

  function tabelleUnfaelle() {
    tabelle(document.getElementById("tabelle-unfaelle"),
      t("Verkehrsunfälle in Ingolstadt", "Unfälle in Ingolstadt"),
      [{ t: "" }, { t: "2023", zahl: true }, { t: "2024", zahl: true }],
      [
        [t("Unfälle", "Unfälle"), zahl(U[2023].unfaelle), zahl(U[2024].unfaelle)],
        [t("Verletzte", "Verletzte"), zahl(U[2023].verletzte), zahl(U[2024].verletzte)],
        [t("davon schwer verletzt", "davon schwer verletzt"), zahl(U[2023].schwer), zahl(U[2024].schwer)],
        [t("Getötete", "Tote"), zahl(U[2023].tote), zahl(U[2024].tote)],
      ],
      t("Quelle: Polizeiliche Unfallstatistik, wiedergegeben im Analysebericht (Anlage 2), S. 131.", "Quelle: Zahlen von der Polizei."));
  }

  function tabelleZiele() {
    tabelle(document.getElementById("tabelle-ziele"),
      t("Ziele aus früheren Konzepten und Stand 2023, Anteil an allen Wegen", "Alte Ziele und der Stand heute"),
      [{ t: t("Verkehrsmittel", "Womit?") }, { t: t("Stand 2023", "Heute"), zahl: true }, { t: t("Ziel", "Ziel"), zahl: true },
       { t: t("bis", "bis"), zahl: true }, { t: t("Beschlossen in", "Aus welchem Plan?") }],
      D.alte_ziele.map(function (z) { return [nl(z), pz(z.ist), z.ziel + " %", String(z.bis), z.quelle]; }),
      t("Quelle: Analysebericht (Anlage 2), S. 55, 141 und 142.", "Quelle: Bericht für die Stadt."));
  }

  function diagrammWuensche() {
    balken(document.getElementById("diagramm-wuensche"),
      t("Was müsste sich ändern? Zahl der Nennungen", "So oft wurde das genannt"),
      B.wuensche.map(function (w) { return { label: nl(w), spuren: [{ wert: w.w, klasse: "ingolstadt", anzeige: zahl(w.w) }] }; }),
      500, null,
      t("Auswahl aus 17 Antworten, " + zahl(B.n_frage) + " Teilnehmende, mehrere Antworten möglich. Quelle: Analysebericht (Anlage 2), S. 175.",
        "Man konnte mehrere Wünsche nennen. Quelle: Bericht für die Stadt."));
  }

  function baueFehlt() {
    var ul = document.getElementById("fehlt-liste");
    ul.innerHTML = "";
    D.fehlt.forEach(function (f) {
      var li = document.createElement("li");
      li.appendChild(el("strong", "", (leicht ? f.ln : f.n) + ": "));
      li.appendChild(el("span", "", leicht ? f.ld : f.d));
      ul.appendChild(li);
    });
  }

  function baueQuellen() {
    var box = document.getElementById("quellen-block");
    box.innerHTML = "";
    box.appendChild(absatz("", "<strong>" + t("Quellen", "Woher die Zahlen kommen") + "</strong>"));
    var ul = document.createElement("ul");
    D.quellen.forEach(function (q) {
      var li = document.createElement("li");
      li.innerHTML = lnk(q.url, esc(q.text));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    box.appendChild(absatz("", t(
      "Stand der Angaben: " + datumDE(D.stand) + ". Die Zahlen sind von Hand aus der Vorlage und ihren Anlagen übernommen (<code>data/mobilitaet.js</code>); " +
      "Werte aus Grafiken und Tabellen wurden am Seitenbild gegengelesen. Die Diagramme sind eigene Darstellungen. " +
      "Die Seite gibt die Berichte wieder und bewertet den Plan nicht.",
      "Stand: " + datumDE(D.stand) + ".")));
  }

  function texteAnwenden() {
    Object.keys(TEXTE).forEach(function (id) {
      var e = document.getElementById("txt-" + id);
      if (e) e.innerHTML = TEXTE[id][leicht ? "l" : "n"];
    });
    kacheln();
    baueTermine();
    baueZielkonzept();
    kastenBza();
    diagrammModal();
    diagrammZufrieden();
    diagrammBezirke();
    kastenVorsicht();
    diagrammHindernisse();
    diagrammTeilraeume();
    listeGehwege();
    tabelleUnfaelle();
    tabelleZiele();
    diagrammWuensche();
    baueFehlt();
    baueQuellen();
  }

  texteAnwenden();

  var btnLeicht = document.getElementById("btn-leicht");
  btnLeicht.setAttribute("aria-pressed", leicht ? "true" : "false");
  btnLeicht.addEventListener("click", function () {
    leicht = !leicht;
    btnLeicht.setAttribute("aria-pressed", leicht ? "true" : "false");
    try { localStorage.setItem(LS_KEY_LEICHT, leicht ? "1" : "0"); } catch (err) { /* Storage kann gesperrt sein */ }
    texteAnwenden();
  });
})();
