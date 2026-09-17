#!/usr/bin/env python3
"""
Liest Beschlüsse aus Sitzungsniederschriften (PDF) und ordnet sie den
jeweiligen Tagesordnungspunkten zu.

Bisher zeigte die Seite nur den Beratungsstand ("Entscheidung angesetzt"),
nie das tatsächliche Ergebnis — die Tagesordnung belegt nur, dass beraten
werden sollte, nicht wie entschieden wurde (siehe pruefen.py::
p_kein_behaupteter_beschluss). Niederschriften sind der einzige öffentliche
Beleg dafür und erscheinen erst 4-8 Wochen nach der Sitzung, nach
Genehmigung in der Folgesitzung.

Der Abstimmungstext einer Vorlage nennt immer deren Vorlagen-Nummer:
    Abstimmung über den Antrag der Verwaltung V0143/26/1:
    Mit 35:15 Stimmen:
    Die beigefügte Satzung ... wird beschlossen.
Das ist der zuverlässigere Schlüssel als die TOP-Nummer — geprüft an
Sitzung stadt:13519 (Stadtrat, 13.05.2026), TOP "Ö 7" mit
vorlage "V0143/26/1": exakter Treffer, inklusive Stimmenverhältnis.

Ist eine Vorlagen-Nummer im Abstimmungskontext nicht eindeutig auffindbar
(keine oder mehrere Fundstellen), wird sie übersprungen statt geraten.

Verwendung:
    python3 niederschriften_lesen.py
    python3 niederschriften_lesen.py --no-cache

Ergebnis: ../data/beschluesse.json — GETRENNT von kuration.json, weil
mechanisch/wörtlich aus der Quelle extrahiert statt redaktionell verfasst.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")
PDF_CACHE = os.path.join(HIER, ".cache", "pdf")

sys.path.insert(0, HIER)
from ris_ingolstadt import USER_AGENT, PAUSE_SEKUNDEN, sauber  # noqa: E402
from referenzen import bare_positionen, top_ref  # noqa: E402

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber fehlt:  python3 -m pip install pdfplumber")


def hole_pdf(url, bezeichnung, cache=True):
    """Wie haushalt_holen.py::hole(), aber mit voller URL statt einer an
    ingolstadt.de gebundenen id — Niederschriften kommen von drei Hosts
    (stadt/bza/bezirk_obb, siehe ris_ingolstadt.py::QUELLEN)."""
    schluessel = re.sub(r"[^A-Za-z0-9]", "_", url) + ".pdf"
    pfad = os.path.join(PDF_CACHE, schluessel)
    os.makedirs(PDF_CACHE, exist_ok=True)

    if cache and os.path.exists(pfad):
        return pfad

    anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(anfrage, timeout=60) as antwort:
            roh = antwort.read()
    except (urllib.error.URLError, TimeoutError) as fehler:
        print(f"  ! Fehler bei {bezeichnung} ({url}): {fehler}", file=sys.stderr)
        return None

    if not roh.startswith(b"%PDF"):
        print(f"  ! {bezeichnung}: Antwort ist kein PDF ({url})", file=sys.stderr)
        return None

    with open(pfad, "wb") as f:
        f.write(roh)
    print(f"  {len(roh) // 1024:>5} KB  {bezeichnung}")
    time.sleep(PAUSE_SEKUNDEN)
    return pfad


FORMEL_MUSTER = re.compile(
    r"Mit allen Stimmen|Mit \d+\s*:\s*\d+ Stimmen|Gegen \d+ Stimmen(?:\s*\([^)]*\))?"
)


def beschluss_aus_text(volltext, vorlage_nr):
    """
    Sucht die Abstimmung zu einer Vorlagen-Nummer im Niederschrift-Volltext.

    "Gegen N Stimmen" heisst NICHT automatisch abgelehnt — ein Beschluss
    kann gegen Widerstand gefasst werden ("Gegen 17 Stimmen: 1. Die
    bestehenden Geschaeftsbereiche werden ... erweitert"). Abgelehnt ist es
    nur, wenn der Text das Wort auch tatsaechlich so sagt
    ("Der Antrag wird gegen 14 Stimmen abgelehnt").
    """
    # Grenzen fuer das Textende: die naechste Abstimmung, die naechste
    # nummerierte TOP-Ueberschrift oder der Seitenfuss ("Niederschrift
    # Sitzung ... am DD.MM.YYYY - N -", ein nicht aufgeloestes Word-
    # Querverweisfeld, das pdfplumber als Fliesstext ausliest) — je nachdem,
    # was zuerst kommt. Ohne das liefen kurze Beschluesse ("Entsprechend dem
    # Antrag genehmigt.") sonst bis in den naechsten TOP oder den Seitenfuss
    # hinein. TOP-Ueberschriften haben ein Leerzeichen vor dem Schlusspunkt
    # ("18 .", "8.1 ."), nummerierte Beschlusspunkte im Fliesstext nicht
    # ("1. Die Geschaeftsordnung ...") — das unterscheidet die beiden.
    muster = re.compile(
        r"Abstimmung[^:\n]*?" + re.escape(vorlage_nr) + r"[^:\n]*:\s*\n?"
        r"(.*?)(?=\n\s*Abstimmung\b|\n\s*\d+(?:\.\d+)?\s+\.\s+[A-ZÄÖÜ]|"
        r"\n\s*Niederschrift Sitzung\b|\Z)",
        re.S,
    )
    treffer = list(muster.finditer(volltext))
    if len(treffer) != 1:
        return None  # keine oder mehrdeutige Fundstelle — nicht raten

    # Eine Abstimmungsantwort ist nie seitenlang; die Kappung faengt den
    # Fall ab, dass alle drei Grenzen oben mal fehlen (etwa eine lange
    # Wortprotokoll-Diskussion vor der eigentlichen Abstimmung). Am letzten
    # Satzende kappen statt mitten im Wort — sonst wirkt der Text wie
    # vollstaendig, obwohl er es nicht ist.
    voll = treffer[0].group(1).strip()
    block = voll[:1500]
    gekappt = len(voll) > 1500
    if gekappt:
        satzende = max(block.rfind(". "), block.rfind(".\n"))
        if satzende > 200:  # nicht auf Kosten eines brauchbaren Beschlusstexts kappen
            block = block[: satzende + 1]

    formel_treffer = FORMEL_MUSTER.search(block)
    if not formel_treffer:
        return None

    formel = sauber(formel_treffer.group(0))
    ergebnis = "abgelehnt" if re.search(r"\babgelehnt\b", block[:400]) else "beschlossen"
    text = sauber(block) + (" […]" if gekappt else "")
    return {"formel": formel, "ergebnis": ergebnis, "text": text, "vorlage": vorlage_nr}


def lade(name):
    pfad = os.path.join(DATEN_VZ, name)
    if not os.path.exists(pfad):
        sys.exit(f"Fehlt: {pfad}\nZuerst ris_ingolstadt.py laufen lassen.")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def niederschrift_url(sitzung):
    for dokument in sitzung.get("dokumente", []):
        if re.search(r"niederschrift", dokument["titel"], re.I):
            return dokument["url"]
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-cache", action="store_true", help="PDF-Cache ignorieren")
    args = parser.parse_args()
    cache = not args.no_cache

    roh = lade("rohdaten.json")

    beschluesse = {}
    gefunden = 0
    keine_formel = 0
    mehrdeutig = 0
    pdfs_gelesen = 0

    for sitzung in roh["sitzungen"]:
        url = niederschrift_url(sitzung)
        if not url:
            continue

        quelle = sitzung.get("quelle", "stadt")
        bare_pos = bare_positionen(sitzung)
        kandidaten = [
            t for t in sitzung["tops"]
            if t["oeffentlich"] and not t["verfahren"] and t.get("vorlage")
        ]
        if not kandidaten:
            continue

        pfad = hole_pdf(url, f"{sitzung['kennung']} {sitzung['datum_anzeige']}", cache=cache)
        if not pfad:
            continue
        pdfs_gelesen += 1

        with pdfplumber.open(pfad) as pdf:
            volltext = "\n".join((seite.extract_text() or "") for seite in pdf.pages)

        for top in kandidaten:
            ergebnis = beschluss_aus_text(volltext, top["vorlage"])
            if ergebnis is None:
                # Zaehlt getrennt, ob's an Mehrdeutigkeit oder Formel liegt,
                # nur zur Diagnose beim Skriptlauf — kein Fehlerfall.
                treffer = re.findall(re.escape(top["vorlage"]), volltext)
                if len(treffer) != 1:
                    mehrdeutig += 1
                else:
                    keine_formel += 1
                continue
            ref = top_ref(quelle, sitzung, top, bare_pos)
            beschluesse[ref] = ergebnis
            gefunden += 1

    print(f"\n{pdfs_gelesen} Niederschriften gelesen")
    print(f"  {gefunden} Beschlüsse gefunden")
    print(f"  {mehrdeutig} Vorlagen-Nummern mehrdeutig oder nicht im Text (übersprungen)")
    print(f"  {keine_formel} mit Vorlagen-Nummer, aber ohne erkennbare Abstimmungsformel")

    ziel = os.path.join(DATEN_VZ, "beschluesse.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(beschluesse, f, ensure_ascii=False, indent=2)
    print(f"\nGeschrieben: {ziel}")


if __name__ == "__main__":
    main()
