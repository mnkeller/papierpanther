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
