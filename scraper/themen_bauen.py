#!/usr/bin/env python3
"""
Baut die Kennzahlen fuer die Themen-Kacheln (Startseite und themen.html).

    python3 themen_bauen.py

Je Themenseite eine Zahl, berechnet aus den Datendateien, die diese Seiten
selbst verwenden -- damit Kachel und Seite nie auseinanderlaufen. Nach jedem
Update der zugrunde liegenden Daten (antraege, haushalt, hsk, klima, miete)
neu laufen lassen; feed_bauen.py tut das nicht.

Ergebnis: ../data/themen.js (window.THEMEN_DATEN)
"""

import base64
import json
import os
import re

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")


def lade(name):
    with open(os.path.join(DATEN_VZ, name), encoding="utf-8") as f:
        return json.load(f)


def de(zahl, nachkomma=0):
    """Deutsche Schreibweise: 1.234,5"""
    return f"{zahl:,.{nachkomma}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main():
    hh = lade("haushalt.json")["verwaltungs_vermoegenshaushalt_aktuell"]
    hh_jahr = lade("haushalt.json")["aktuelles_jahr"]
    ausgaben = (hh["verwaltungshaushalt_ausgaben"] + hh["vermoegenshaushalt_ausgaben"]) / 1e6

    # Konsolidierungsziel im Schnitt der Jahre, in Tausend Euro (negativ)
    hsk = lade("hsk_bericht.json")["konsolidierungsziel"]
    sparziel = -hsk["durchschnitt_kzv"] / 1000
    hsk_von, hsk_bis = hsk["jahre"][0], hsk["jahre"][-1]

    klima = lade("klima.json")
    solar = klima["solar"]["reihe"][-1]
    ladepunkte = klima["laden"]["ladepunkte"]

    antraege = lade("antraege.json")["statistik"]

    with open(os.path.join(DATEN_VZ, "miete.js"), encoding="utf-8") as f:
        miete = f.read()
    gueltig_bis = re.search(r'gueltig_bis: "([^"]+)"', miete).group(1)

    with open(os.path.join(DATEN_VZ, "wohnen.js"), encoding="utf-8") as f:
        wohnen = f.read()
    hh = re.search(r'haushalte: \{\s*2022: \{ gesamt: (\d+), eigentum: (\d+), miete: (\d+)', wohnen)
    miet_anteil = int(hh.group(3)) / int(hh.group(1)) * 100

    # Erreichbarkeit: „Aeltere Person, Apotheke“. Warum: Der Supermarkt fuer Erwachsene (87 %)
    # klingt beruhigend und verdeckt, fuer wen die 15 Minuten nicht reichen. Aeltere gehen
    # langsamer und brauchen die Apotheke oft. Als Zahl der Stadtwert, der schwaechste Bezirk im
    # Text: Ein Bezirkswert von 0 % haengt allein daran, ob OpenStreetMap dort eine Apotheke
    # kennt, und ist als Schlagzeile zu anfaellig. Gezaehlt werden die Einwohner ab 65, wie in der
    # Bezirksansicht von wege.html (Mein Bezirk).
    zellen = lade("wege-zellen.json")
    n1 = base64.b64decode(lade("wege-zellen-aeltere.json")["kategorien"]["apotheke"]["n1"])
    bekannt = [(e, a) for e, a in zip(zellen["einwohner"], zellen["ue65"]) if a != 255]
    mittel = sum(e * a for e, a in bekannt) / sum(e for e, _ in bekannt)
    ab65 = [e * (a if a != 255 else mittel) / 100 for e, a in zip(zellen["einwohner"], zellen["ue65"])]
    namen = {int(f["properties"]["beznr"]): f["properties"]["bezname"] for f in lade("bezirke.json")["features"]}
    je_bezirk = {}
    for b, w, m in zip(zellen["bezirk"], ab65, n1):
        summe, gut = je_bezirk.get(b, (0, 0))
        je_bezirk[b] = (summe + w, gut + (w if m <= 15 else 0))
    apo_nr, (apo_summe, apo_gut) = min(je_bezirk.items(), key=lambda kv: kv[1][1] / kv[1][0])
    apo_anteil, apo_bezirk = apo_gut / apo_summe * 100, namen[apo_nr]
    apo_stadt = sum(w for w, m in zip(ab65, n1) if m <= 15) / sum(ab65) * 100

    kacheln = [
        dict(href="antraege.html", farbe="#5b4b8a",
             titel="Anträge der Parteien", titel_l="Anträge der Parteien",
             zahl=f"{de(antraege['gesamt'])} Anträge",
             text=f"der Stadtratsfraktionen in dieser Wahlperiode – {de(antraege['nur_eingereicht'])} "
                  "davon noch auf keiner Tagesordnung.",
             text_l=f"Das wollen die Parteien im Stadt-Rat. {de(antraege['nur_eingereicht'])} "
                    "Anträge sind noch nicht besprochen."),
        dict(href="haushalt.html", farbe="#003e59",
             titel="Haushalt", titel_l="Das Geld der Stadt",
             zahl=f"{de(ausgaben, 1)} Mio. €",
             text=f"will die Stadt {hh_jahr} ausgeben. Wofür – und woher das Geld kommt.",
             text_l=f"So viel Geld will die Stadt {hh_jahr} ausgeben."),
        dict(href="hsk.html", farbe="#b00e2b",
             titel="Sparplan", titel_l="Spar-Plan",
             zahl=f"{de(sparziel, 1)} Mio. €",
             text=f"muss die Stadt im Schnitt pro Jahr einsparen ({hsk_von}–{hsk_bis}). Wo, steht im Sparplan.",
             text_l="So viel Geld muss die Stadt jedes Jahr sparen."),
        dict(href="klima.html", farbe="#2e7d4f",
             titel="Klima", titel_l="Klima",
             zahl=f"{de(solar['bestand_anzahl'])} Solaranlagen",
             text=f"gibt es in Ingolstadt ({solar['jahr']}), dazu {de(ladepunkte)} öffentliche Ladepunkte. "
                  "Plus: Wetter seit 1961.",
             text_l="So viele Anlagen machen in Ingolstadt Strom aus Sonne."),
        dict(href="wohnen.html", farbe="#4d5a1f",
             titel="Wohnen", titel_l="Wohnen",
             zahl=f"{de(miet_anteil, 1)} %",
             text="der Haushalte wohnen zur Miete. Wem die Wohnungen gehören und wie viele leer stehen (Zensus 2022).",
             text_l="So viele Haushalte wohnen zur Miete. Und: Wem gehören die Wohnungen?"),
        dict(href="miete.html", farbe="#96551f",
             titel="Miete", titel_l="Miete",
             zahl=f"bis {gueltig_bis}",
             text="gilt der Mietspiegel. Rechnen Sie nach, was für Ihre Wohnung üblich ist – "
                  "und wo die Mietpreisbremse greift.",
             text_l="Wie viel Miete ist üblich? Hier können Sie es ausrechnen."),
        dict(href="wege.html", farbe="#1d6a6f",
             titel="Deine 15 Minuten", titel_l="Deine 15 Minuten",
             zahl=f"{de(apo_stadt)} %",
             text=f"der Menschen ab 65 erreichen in ihrem Tempo eine Apotheke in 15 Minuten zu Fuß, "
                  f"in {apo_bezirk} {de(apo_anteil)} %. Wie ist es bei Ihnen?",
             text_l="So viele ältere Menschen haben eine Apotheke in der Nähe. Wie ist es bei Ihnen?"),
        dict(href="beteiligen.html", farbe="#14505c",
             titel="Beteiligen", titel_l="Mitmachen",
             zahl="12 Bezirksausschüsse",
             text="vertreten die Stadtteile. Wer dort für Sie sitzt, der Mängelmelder und Projekte zum Mitmachen.",
             text_l="So können Sie in Ihrem Stadt-Teil mitreden."),
    ]

    ziel = os.path.join(DATEN_VZ, "themen.js")
    with open(ziel, "w", encoding="utf-8") as f:
        f.write("/* Erzeugt von scraper/themen_bauen.py -- nicht von Hand aendern. */\n")
        f.write("window.THEMEN_DATEN = ")
        f.write(json.dumps(kacheln, ensure_ascii=False, indent=1))
        f.write(";\n")
    print(f"Geschrieben: {ziel}")
    for k in kacheln:
        print(f"  {k['titel']:22} {k['zahl']}")


if __name__ == "__main__":
    main()
