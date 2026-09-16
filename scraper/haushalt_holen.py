#!/usr/bin/env python3
"""
Holt die Gruppierungsuebersichten (Anlage 2) der Haushaltssatzungen 2023-2026
sowie Anlage 1 (Festsetzungen) und Anlage 5 (Vorbericht) des aktuellsten
Jahrgangs aus dem Ratsinfoportal.

    python3 haushalt_holen.py

Jede Anlage 2 zeigt fuer ihr Jahr drei Spalten: Ansatz aktuelles Jahr, Ansatz
Vorjahr, Ergebnis (Ist) Vorvorjahr. Vier Jahrgaenge zusammen ergeben eine
Ist-Zeitreihe 2021-2024 plus die Ansaetze 2025/2026, ohne weitere Quellen.

Die Anlage-2-Dokumente sind nicht einheitlich geschnitten: manche Jahrgaenge
veroeffentlichen sie als eigenstaendiges 10-Seiten-PDF, 2025 steckt sie als
Seiten 16-24 in einem 1046-seitigen Gesamtplan. haushalt_lesen.py filtert
deshalb beim Parsen nach der Kopfzeile "3. Gruppierungsuebersicht" statt nach
Seitenzahlen - das Herunterladen hier muss sich darum nicht kuemmern.

PDFs landen in scraper/.cache/pdf/ (wie bei vorlagen_holen.py), damit ein
zweiter Lauf das Portal nicht erneut belastet.
"""

import os
import re
import sys
import time
import urllib.error
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
PDF_CACHE = os.path.join(HIER, ".cache", "pdf")

sys.path.insert(0, HIER)
from ris_ingolstadt import USER_AGENT, PAUSE_SEKUNDEN  # noqa: E402

BASIS = "https://www.ingolstadt.de/sessionnet/getfile.php?id={id}&type=do"

# Von Hand recherchiert (vo0050.php je __kvonr) und gegen rohdaten.json
# geprueft: 2024-2026 stehen dort als Stadtrats-TOPs "Haushaltssatzung mit
# Haushaltsplan ... <Jahr>"; 2023 liegt vor dem Scraper-Zeitraum (ab
# November 2023) und wurde direkt im Ratsinfoportal nachgeschlagen.
ANLAGE2_JE_JAHR = {
    2023: 195353,
    2024: 214659,
    2025: 234517,
    2026: 246991,
}

AKTUELLES_JAHR = max(ANLAGE2_JE_JAHR)
ANLAGE1_AKTUELL = 246990  # Haushaltssatzung/Festsetzungen, fuer Zuschussbedarf
ANLAGE5_AKTUELL = 246998  # Vorbericht, Prosa-Erklaerung der Deckung


def hole(id_, bezeichnung):
    url = BASIS.format(id=id_)
    schluessel = re.sub(r"[^A-Za-z0-9]", "_", url) + ".pdf"
    pfad = os.path.join(PDF_CACHE, schluessel)
    os.makedirs(PDF_CACHE, exist_ok=True)

    if os.path.exists(pfad):
        print(f"  (Cache) {bezeichnung}")
        return pfad

    anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(anfrage, timeout=120) as antwort:
            roh = antwort.read()
    except (urllib.error.URLError, TimeoutError) as fehler:
        sys.exit(f"Fehler beim Laden von {bezeichnung} ({url}): {fehler}")

    if not roh.startswith(b"%PDF"):
        sys.exit(f"{bezeichnung}: Antwort ist kein PDF ({url})")

    with open(pfad, "wb") as f:
        f.write(roh)
    print(f"  {len(roh) // 1024:>5} KB  {bezeichnung}")
    time.sleep(PAUSE_SEKUNDEN)
    return pfad


def main():
    print("Gruppierungsuebersichten:")
    pfade = {}
    for jahr, id_ in sorted(ANLAGE2_JE_JAHR.items()):
        pfade[jahr] = hole(id_, f"Anlage 2 Gruppierungsuebersicht {jahr}")

    print(f"\nWeitere Anlagen {AKTUELLES_JAHR}:")
    pfad_anlage1 = hole(ANLAGE1_AKTUELL, f"Anlage 1 Haushaltssatzung {AKTUELLES_JAHR}")
    pfad_anlage5 = hole(ANLAGE5_AKTUELL, f"Anlage 5 Vorbericht {AKTUELLES_JAHR}")

    print("\nAlle Dokumente liegen im Cache. Weiter mit:")
    print("  python3 haushalt_lesen.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
