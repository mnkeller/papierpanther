#!/usr/bin/env python3
"""
Liest die Anträge der Stadtratsfraktionen aus vo0040.php (RIS Stadt Ingolstadt).

Eine Anfrage je Fraktion (__zvovanr), keine Paginierung nötig — die größten
Fraktionen liegen bei rund 70 Anträgen der laufenden Wahlperiode, alles auf
einer Seite. Titel, Vorlagen-Nummer, Antragsdatum, Antragsteller-Zeile und
PDF-Link stehen direkt in der HTML-Tabelle, kein PDF-Parsing nötig.

Status-Abgleich ohne zusätzliche Netzzugriffe: dieselbe kvonr taucht auf,
sobald der Antrag als Tagesordnungspunkt läuft (geprüft: V0490/26, kvonr
23245, Stadtrat 29.07.2026 — identisch in rohdaten.json). Ein Antrag gilt
also als "in Beratung", sobald seine kvonr in rohdaten.json auftaucht, und
übernimmt dessen Stand/Beschluss aus feed.json, sobald er dort kuratiert ist.

Verwendung:
    python3 antraege_holen_lesen.py
    python3 antraege_holen_lesen.py --no-cache

Ergebnis: ../data/antraege.json + ../data/antraege.js
"""

import argparse
import html
import json
import os
import re
import sys
from datetime import date

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

sys.path.insert(0, HIER)
from ris_ingolstadt import hole, sauber  # noqa: E402

BASIS = "https://www.ingolstadt.de/sessionnet"
ENDUNG = "php"

# Fraktions-IDs (__zvovanr) aus der Live-Navigation von vo0040.php, Stand
# 2026-09-17 — von Hand recherchiert, es gibt keine Übersichtsseite dafür.
FRAKTIONEN = {
    "17": "CSU",
    "21": "SPD",
    "22": "BÜNDNIS 90/DIE GRÜNEN",
    "19": "Freie Wähler",
    "77": "AfD",
    "80": "UWG",
    "48": "BGI",
    "73": "UDI",
    "24": "Die Linke",
    "20": "ÖDP",
    "18": "FDP",
    "81": "Junge Union",
    "78": "FDP/JU",
    "79": "Die Linke/ÖDP",
    "76": "Gemeinschaftsanträge",
}

# Die Zusatzzeile unter dem Titel ist in 15 Fraktionen seit 2020 nicht
# einheitlich getippt worden: die Parteibezeichnung steht mal vor, mal nach
# "Stadtratsfraktion" ("Antrag der CSU-Stadtratsfraktion" vs. "Antrag der
# Stadtratsfraktion BÜNDNIS 90/DIE GRÜNEN"), dazu reale Tippfehler im Portal
# selbst ("Stadtratrsfraktion", "Antarg", "09.047.2024", "15.09.206"). Die
# Partei brauchen wir davon ohnehin nicht zu erraten — wir kennen sie schon
# aus der abgefragten Fraktions-ID. Nur zwei Dinge werden hier extrahiert,
# beide mit Fallback auf "unbekannt" statt Raten:
#   1. die Antragsart (Praefix-Woerterliste)
#   2. das Datum ("vom DD.MM.YYYY", mit Bereichspruefung gegen Tippfehler)
ANTRAGSARTEN = [
    "Dringlichkeitsantrag", "Änderungsantrag", "Ergänzungsantrag",
    "Prüfantrag", "Gemeinschaftsantrag", "Zusatzantrag", "Stadtratsantrag",
    "Antrag",
]
ANTRAGSART_MUSTER = re.compile(
    r"^-*\s*(" + "|".join(ANTRAGSARTEN) + r")\b", re.I
)
# "vom" ist der Normalfall, "am" kommt vor, wenn stattdessen der Sitzungstermin
# genannt wird ("zur Sitzung des Stadtrates am 29.02.2024") statt des
# Antragsdatums — als Naeherung besser als gar kein Datum.
DATUM_MUSTER = re.compile(r"\b(?:vom|am)\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})")


def _datum_pruefen(tag, monat, jahr):
    """Nur ein plausibles Datum liefern — ein Tippfehler im Portal (siehe
    oben) soll leer bleiben statt ein falsches Datum vorzutaeuschen."""
    try:
        tag, monat, jahr = int(tag), int(monat), int(jahr)
        if len(str(jahr)) != 4 or not (1 <= tag <= 31) or not (1 <= monat <= 12):
            return "", ""
        date(jahr, monat, tag)  # wirft bei z.B. 31.02. einen Fehler
    except ValueError:
        return "", ""
    return f"{jahr:04d}-{monat:02d}-{tag:02d}", f"{tag:02d}.{monat:02d}.{jahr:04d}"


def parse_seite(seite):
    """Liefert Liste von Antraegen aus einer vo0040.php-Seite einer Fraktion."""
    if "<tbody>" not in seite:
        return []
    body = seite.split("<tbody>", 1)[1].split("</tbody>", 1)[0]
    zeilen = re.split(r'(?=<tr class="smc-t-r-l">)', body)[1:]

    ergebnis = []
    for zeile in zeilen:
        link = re.search(
            r'<a href="vo0050\.php\?__kvonr=(\d+)"[^>]*>(.*?)</a>', zeile, re.S
        )
        if not link:
            continue
        nummer = re.search(r"<strong>Nummer:</strong>\s*([^<]+)</p>", zeile)
        pdf = re.search(r'href="(getfile\.php\?id=\d+&type=do)"', zeile)

        kvonr = link.group(1)
        teile = re.split(r"<br\s*/?>", link.group(2))
        titel = sauber(teile[0])
        zusatzzeile = sauber(teile[1]) if len(teile) > 1 else ""

        art_treffer = ANTRAGSART_MUSTER.search(zusatzzeile)
        datum_treffer = DATUM_MUSTER.search(zusatzzeile)
        datum_iso, datum_de = (
            _datum_pruefen(*datum_treffer.groups()) if datum_treffer else ("", "")
        )

        ergebnis.append(
            {
                "kvonr": kvonr,
                "titel": titel,
                "antragsart": art_treffer.group(1) if art_treffer else "",
                "zusatzzeile": zusatzzeile,
                "datum": datum_iso,
                "datum_anzeige": datum_de,
                "vorlage": sauber(nummer.group(1)) if nummer else "",
                "vorlage_url": f"{BASIS}/vo0050.{ENDUNG}?__kvonr={kvonr}",
                "pdf_url": f"{BASIS}/{html.unescape(pdf.group(1))}" if pdf else "",
            }
        )
    return ergebnis


def lade(name):
    pfad = os.path.join(DATEN_VZ, name)
    if not os.path.exists(pfad):
        sys.exit(f"Fehlt: {pfad}\nZuerst ris_ingolstadt.py und feed_bauen.py laufen lassen.")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def status_index(roh, feed):
    """
    kvonr -> Statusinformation, aus bereits gescrapten Daten — kein
    zusaetzlicher Netzzugriff noetig, siehe Modul-Docstring. Ist ein Antrag
    schon kuratiert, uebernimmt die Antraege-Seite gleich unseren eigenen
    Klartext, statt den amtlichen Titel zu wiederholen — eine Erklaerung,
    zweimal genutzt, statt zwei Redaktionsstaende zu pflegen.
    """
    index = {}
    for sitzung in roh["sitzungen"]:
        for top in sitzung["tops"]:
            m = re.search(r"__kvonr=(\d+)", top.get("vorlage_url") or "")
            if m:
                index[m.group(1)] = {"in_beratung": True, "stand": None, "ref": None}

    for eintrag in feed["eintraege"]:
        m = re.search(r"__kvonr=(\d+)", eintrag.get("vorlage_url") or "")
        if m and m.group(1) in index:
            index[m.group(1)].update(
                {
                    "stand": eintrag.get("stand"),
                    "ref": eintrag.get("ref"),
                    "klartext_titel": eintrag.get("klartext_titel"),
                    "klartext": eintrag.get("klartext"),
                    "klartext_titel_leicht": eintrag.get("klartext_titel_leicht"),
                    "klartext_leicht": eintrag.get("klartext_leicht"),
                }
            )
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-cache", action="store_true", help="Cache ignorieren")
    args = parser.parse_args()
    cache = not args.no_cache

    roh = lade("rohdaten.json")
    feed = lade("feed.json")
    status = status_index(roh, feed)

    print(f"=== Anträge der Stadtratsfraktionen ({len(FRAKTIONEN)} Fraktionen) ===")
    parteien = {}
    for zvovanr, name in FRAKTIONEN.items():
        pfad = f"vo0040.php?__zvovanr={zvovanr}&__caktuell=2&__ovocdat=d"
        print(f"  {name:24} ...", end=" ", flush=True)
        seite = hole(pfad, BASIS, cache=cache)
        antraege = parse_seite(seite)
        for a in antraege:
            info = status.get(a["kvonr"], {})
            a["in_beratung"] = bool(info.get("in_beratung"))
            a["stand"] = info.get("stand")
            a["ref"] = info.get("ref")
            a["klartext_titel"] = info.get("klartext_titel")
            a["klartext"] = info.get("klartext")
            a["klartext_titel_leicht"] = info.get("klartext_titel_leicht")
            a["klartext_leicht"] = info.get("klartext_leicht")
        parteien[name] = antraege
        print(f"{len(antraege)} Anträge")

    gesamt = sum(len(a) for a in parteien.values())
    in_beratung = sum(1 for a in parteien.values() for x in a if x["in_beratung"])
    kuratiert = sum(1 for a in parteien.values() for x in a if x["ref"])

    ausgabe = {
        "erzeugt_von": "scraper/antraege_holen_lesen.py",
        "quelle_hinweis": (
            "Anträge der Stadtratsfraktionen aus dem Ratsinfoportal der Stadt "
            "Ingolstadt, laufende Wahlperiode. Status stammt aus den bereits "
            "gescrapten Tagesordnungen und dem kuratierten Feed dieser Seite, "
            "nicht aus einer eigenen Recherche."
        ),
        "abgerufen_am": date.today().isoformat(),
        "parteien": parteien,
        "statistik": {
            "gesamt": gesamt,
            "in_beratung": in_beratung,
            "kuratiert": kuratiert,
            "nur_eingereicht": gesamt - in_beratung,
        },
    }

    os.makedirs(DATEN_VZ, exist_ok=True)
    ziel_json = os.path.join(DATEN_VZ, "antraege.json")
    with open(ziel_json, "w", encoding="utf-8") as f:
        json.dump(ausgabe, f, ensure_ascii=False, indent=2)
    print(f"\nGeschrieben: {ziel_json}")

    ziel_js = os.path.join(DATEN_VZ, "antraege.js")
    with open(ziel_js, "w", encoding="utf-8") as f:
        f.write("window.ANTRAEGE_DATEN = ")
        json.dump(ausgabe, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Geschrieben: {ziel_js}")

    print(
        f"\n  {gesamt} Anträge insgesamt, {in_beratung} bereits auf einer "
        f"Tagesordnung, {kuratiert} davon kuratiert, "
        f"{gesamt - in_beratung} nur eingereicht"
    )


if __name__ == "__main__":
    main()
