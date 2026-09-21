#!/usr/bin/env python3
"""
Liest noch nicht terminierte Stadtratsantraege aus dem Ratsinfoportal.

Ergaenzt ris_ingolstadt.py: dort werden Tagesordnungspunkte ausschliesslich
ueber den Sitzungskalender gefunden (si0056.php). Ein frisch eingereichter
Antrag hat aber oft noch keine Sitzung, in der er behandelt wird — er taucht
nur in der separaten Liste "Aktuelle Stadtratsantraege" auf. Ohne diesen
Schritt bleibt so ein Antrag fuer Papierpanther unsichtbar, bis irgendwann
ein Sitzungstermin dafuer feststeht.

Nur fuer die Quelle "stadt": die Bezirksausschuesse und der Bezirk
Oberbayern fuehren keine vergleichbare offene Antragsliste im Portal.

Verwendung:
    python3 antraege_offen.py
    python3 antraege_offen.py --no-cache

Ergebnis: ../data/offene_antraege.json
"""

import argparse
import json
import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ris_ingolstadt import hole, sauber, absolut, dokumente_aus  # noqa: E402

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

BASIS = "https://www.ingolstadt.de/sessionnet"
ENDUNG = "php"

# Diese URL listet alle aktuell offenen Stadtratsantraege ueber alle
# Fraktionen und Gemeinschaftsantraege hinweg. "__ivovanr=..." ist die vom
# Portal selbst unter "Aktuelle Stadtratsantraege" verlinkte Kombination
# aller Fraktions-IDs der laufenden Wahlperiode (geprueft 2026-09-21) — falls
# das Portal die IDs je Wahlperiode neu vergibt, muss die Liste hier
# nachgezogen werden.
LISTE_PFAD = (
    "vo0040.php?__ivovanr=3,17,21,22,19,77,80,48,73,24,20,18,81,78,79,76"
    "&__caktuell=2&__ovocdat=d"
)

# Der Betreff hat immer zwei Zeilen: Titel, dann (per <br/>) die Herkunft.
# "-Gemeinschaftsantrag der SPD und FW vom 24.02.2026-", manchmal ohne
# Fraktionsangabe ("- Gemeinschaftsantrag vom 16.09.2025 -"), manchmal ohne
# "Gemeinschafts-"/"Ergaenzungs-"-Praefix, mal mit, mal ohne Leerzeichen vor
# dem Trennstrich.
BETREFF_FUSS = re.compile(
    r"^\s*[-–—]\s*(?:Gemeinschafts|Ergänzungs)?[Aa]ntrag(?:e)?"
    r"(?:\s+(?:der|des)\s+(?P<antragsteller>.+?))?"
    r"\s+vom\s+(?P<datum>\d{2}\.\d{2}\.\d{4})\s*[-–—]?\s*$"
)


def bekannte_kvonr(rohdaten):
    """Vorlagen-Nummern, die schon ueber eine terminierte Sitzung bekannt sind."""
    bekannt = set()
    for s in rohdaten.get("sitzungen", []):
        if s.get("quelle", "stadt") != "stadt":
            continue
        for t in s["tops"]:
            m = re.search(r"__kvonr=(\d+)", t.get("vorlage_url") or "")
            if m:
                bekannt.add(m.group(1))
    return bekannt


def hat_termin(beratungsseite):
    """
    True, wenn vo0053.php schon einen echten Beratungstermin zeigt.

    Die Seite traegt IMMER einen Zeitstempel "Letzte Aenderung: TT.MM.JJJJ
    HH:MM:SS" — das ist kein Sitzungstermin, sondern nur der Aktualisierungs-
    stempel des Datensatzes. Ein echter Termin ist ein Datum OHNE
    unmittelbar folgende Uhrzeit.
    """
    start = beratungsseite.find('id="smcaccordion"')
    if start == -1:
        return False
    ende = beratungsseite.find("Letzte", start)
    fragment = beratungsseite[start:ende] if ende != -1 else beratungsseite[start:start + 3000]
    return bool(re.search(r"\d\d\.\d\d\.\d{4}(?!\s*\d\d:\d\d:\d\d)", fragment))


def ziel_gremium(beratungsseite):
    """Zielgremium aus dem Beratungsweg-Header, z. B. 'Stadtrat' aus
    'Stadtrat oeffentlich - Entscheidung'."""
    start = beratungsseite.find('id="smcaccordion"')
    if start == -1:
        return ""
    start = beratungsseite.find(">", start) + 1  # hinter das öffnende Tag springen
    ende = beratungsseite.find("Letzte", start)
    fragment = sauber(beratungsseite[start:ende] if ende != -1 else beratungsseite[start:start + 2000])
    treffer = re.search(r"^\s*(.+?)\s+öffentlich\s*-\s*Entscheidung", fragment)
    return treffer.group(1).strip() if treffer else ""


def betreff_lesen(fragment_html):
    """Zerlegt den Betreff-Block in (Titel, Antragsteller, Datumsanzeige)."""
    teile = re.split(r"<br\s*/?>", fragment_html, maxsplit=1)
    titel = sauber(teile[0])
    fuss = sauber(teile[1]) if len(teile) > 1 else ""
    antragsteller, datum_anzeige = "", ""
    if fuss:
        m = BETREFF_FUSS.match(fuss)
        if m:
            antragsteller = (m.group("antragsteller") or "").strip()
            datum_anzeige = m.group("datum")
    return titel, antragsteller, datum_anzeige


def antrag_lesen(kvonr, cache):
    """Liest einen einzelnen Antrag, oder None wenn inzwischen terminiert
    oder die Seite nicht auswertbar ist."""
    info = hole(f"vo0050.{ENDUNG}?__kvonr={kvonr}", BASIS, cache=cache)
    beratung = hole(f"vo0053.{ENDUNG}?__kvonr={kvonr}", BASIS, cache=cache)

    if hat_termin(beratung):
        return None  # inzwischen terminiert -- gehoert in den normalen Lauf

    betreff_m = re.search(r'class="smc-table-cell vobetr">(.*?)</div>', info)
    if not betreff_m:
        return None
    titel, antragsteller, antragsdatum_anzeige = betreff_lesen(betreff_m.group(1))
    if len(titel) < 12:
        return None

    vorlage_m = re.search(r'class="smc-table-cell voname">(.*?)</div>', info)
    vorlage = sauber(vorlage_m.group(1)) if vorlage_m else ""

    antragsdatum_iso = ""
    if antragsdatum_anzeige:
        tag, monat, jahr = antragsdatum_anzeige.split(".")
        antragsdatum_iso = f"{jahr}-{monat}-{tag}"

    return {
        "quelle": "stadt",
        "kvonr": kvonr,
        "titel": titel,
        "antragsteller": antragsteller,
        "antragsdatum": antragsdatum_iso,
        "antragsdatum_anzeige": antragsdatum_anzeige,
        "vorlage": vorlage,
        "vorlage_url": absolut(f"vo0050.{ENDUNG}?__kvonr={kvonr}", BASIS),
        "ziel_gremium": ziel_gremium(beratung),
        "dokumente": dokumente_aus(info, BASIS),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--no-cache", action="store_true", help="Cache ignorieren")
    args = ap.parse_args()
    cache = not args.no_cache

    with open(os.path.join(DATEN_VZ, "rohdaten.json"), encoding="utf-8") as f:
        rohdaten = json.load(f)
    bekannt = bekannte_kvonr(rohdaten)

    print("Liste offener Stadtratsantraege wird geladen ...")
    liste_html = hole(LISTE_PFAD, BASIS, cache=cache)
    alle_kvonr = list(dict.fromkeys(re.findall(r"vo0050\.php\?__kvonr=(\d+)", liste_html)))
    neu = [k for k in alle_kvonr if k not in bekannt]
    print(f"{len(alle_kvonr)} Antraege in der Liste, {len(neu)} noch nicht in rohdaten.json")

    antraege = []
    uebersprungen = 0
    for i, kvonr in enumerate(neu, 1):
        eintrag = antrag_lesen(kvonr, cache)
        if eintrag:
            antraege.append(eintrag)
            print(f"  [{i}/{len(neu)}] {kvonr}  {eintrag['titel'][:55]}")
        else:
            uebersprungen += 1
            print(f"  [{i}/{len(neu)}] {kvonr}  uebersprungen (terminiert oder ungueltig)")

    antraege.sort(key=lambda a: a["antragsdatum"] or "", reverse=True)

    ausgabe = {
        "hinweis": (
            "Antraege ohne Sitzungstermin, aus der Liste 'Aktuelle "
            "Stadtratsantraege' im Ratsinfoportal der Stadt Ingolstadt. "
            "Sobald ein Antrag terminiert wird, verschwindet er von hier "
            "und taucht stattdessen ganz normal ueber ris_ingolstadt.py auf."
        ),
        "abgerufen_am": date.today().isoformat(),
        "antraege": antraege,
    }
    os.makedirs(DATEN_VZ, exist_ok=True)
    ziel = os.path.join(DATEN_VZ, "offene_antraege.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(ausgabe, f, ensure_ascii=False, indent=2)

    print(f"\nGeschrieben: {ziel}")
    print(f"  {len(antraege)} offene Antraege ohne Termin, {uebersprungen} uebersprungen")


if __name__ == "__main__":
    main()
