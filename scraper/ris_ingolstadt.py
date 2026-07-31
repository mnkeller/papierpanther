#!/usr/bin/env python3
"""
Liest die Ratsinfoportale der Stadt Ingolstadt aus (SessionNet / Somacos "Session").

Zwei Quellen, gleiche Software, deshalb derselbe Parser:
  stadt  — Stadtrat, Ausschuesse, Aufsichts- und Verwaltungsraete  (/sessionnet)
  bza    — die 12 Bezirksausschuesse                              (/sessionnetbza)

Nur oeffentlich zugaengliche Seiten, keine Anmeldung, kein Verwaltungszugang.
robots.txt der Stadt Ingolstadt sperrt weder /sessionnet/ noch /sessionnetbza/
(geprueft 2026-07-29).

Verwendung:
    python3 ris_ingolstadt.py                        # beide Quellen, letzte 3 Monate
    python3 ris_ingolstadt.py --von 2026-01 --bis 2026-07
    python3 ris_ingolstadt.py --quelle bza           # nur Bezirksausschuesse
    python3 ris_ingolstadt.py --ohne-beratungen      # Beratungsweg nicht laden
    python3 ris_ingolstadt.py --no-cache             # Cache ignorieren

Ergebnis: ../data/rohdaten.json
"""

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date

QUELLEN = {
    "stadt": {
        "name": "Ratsinfoportal der Stadt Ingolstadt — Stadtrat und Ausschuesse",
        "software": "Session (Somacos GmbH & Co. KG)",
        "basis_url": "https://www.ingolstadt.de/sessionnet",
    },
    "bza": {
        "name": "Ratsinfoportal der Bezirksausschuesse der Stadt Ingolstadt",
        "software": "Session (Somacos GmbH & Co. KG)",
        "basis_url": "https://www.ingolstadt.de/sessionnetbza",
    },
}

USER_AGENT = "MeinBezirk-Ingolstadt-Prototyp/0.1 (Buergerinformation; Kontakt via Repo)"
PAUSE_SEKUNDEN = 1.2  # hoeflich bleiben

HIER = os.path.dirname(os.path.abspath(__file__))
CACHE_VZ = os.path.join(HIER, ".cache")
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

MONATSNAMEN = {
    1: "Januar", 2: "Februar", 3: "Maerz", 4: "April", 5: "Mai", 6: "Juni",
    7: "Juli", 8: "August", 9: "September", 10: "Oktober", 11: "November",
    12: "Dezember",
}

# Tagesordnungspunkte, die reine Sitzungsroutine sind. Sie bleiben in den
# Rohdaten, werden aber als "verfahren" markiert und nicht aufbereitet.
# Vor allem die BZA-Tagesordnungen bestehen zur Haelfte daraus.
VERFAHREN_MUSTER = [
    r"^Er(ö|oe)ffnung",
    r"^Begr(ü|ue)ßung",
    r"Feststellung der Beschlussf(ä|ae)higkeit",
    r"Genehmigung des letzten Sitzungsprotokolls",
    r"Genehmigung der Niederschrift",
    r"(Best(ä|ae)tigung|Erg(ä|ae)nzung).{0,30}letzten Protokolls",
    r"^Wahlen?\b.{0,40}Sprecher",
    r"Beschluss der Tagesordnung",
    r"^Verschiedenes",
    r"^W(ü|ue)nsche",
    r"^Anfragen$",
    r"Offene Anfragen und Antr(ä|ae)ge",
    r"Weitere Anliegen der B(ü|ue)rgerschaft",
    # reine Sammelueberschriften; die Unterpunkte darunter sind der Inhalt
    r"^Antr(ä|ae)ge an die Verwaltung",
    r"^Anfragen aus dem Stadtteil$",
    r"Informationen zu den Bezirksaussch(ü|ue)ssen",
    r"^Allgemeine Aufgaben$",
    r"^Rechtliche Grundlagen$",
    r"^Ratsinformationssystem$",
    r"^Abl(ä|ae)ufe bei Antr(ä|ae)gen$",
    r"^Informationen und Unterrichtung",
    r"^Mitteilungen der (Stadt|Verwaltung)",
    r"^Stellungnahmen der (Stadt|Verwaltung|Stadtverwaltung)",
    r"^B(ü|ue)rgeranliegen und Antr(ä|ae)ge",
    r"^Antr(ä|ae)ge der (B(ü|ue)rger|BZA|Bezirksaussch)",
    r"^B(ü|ue)rgerantr(ä|ae)ge$",
    r"^Umgesetzte Ma(ß|ss)nahmen$",
    # Sitzungsformalien und Aemterbesetzung im Bezirksausschuss
    r"Feststellung der ordnungsgem(ä|ae)(ß|ss)en Ladung",
    r"^Genehmigung des Protokolls",
    # Stadtratsformalien, erst beim Zwei-Jahres-Lauf aufgefallen
    r"^Fragestunde",
    r"^Dringlichkeitsantr(ä|ae)ge$",
    r"^Genehmigung von Sitzungsniederschriften",
    r"^Bekanntgaben?$",
    r"^Sonstiges$",
    r"^Niederschrift(en)?$",
    r"^Antr(ä|ae)ge$",
    r"^Protokolle der BZA-Sitzungen",
    r"^Nicht (ö|oe)ffentliche Beratung",
    r"^Termin n(ä|ae)chste",
    r"^Weitere Positionen im Bezirksausschuss",
    r"^Behindertenbeauftragt",
    r"\(je \d+ Person",
]


# ---------------------------------------------------------------- HTTP + Cache

def hole(pfad, basis, cache=True):
    """Laedt eine Seite relativ zu `basis`, mit Dateicache und Pause."""
    os.makedirs(CACHE_VZ, exist_ok=True)
    # Die Quelle muss in den Cache-Schluessel, sonst ueberschreiben sich
    # gleichnamige Seiten der beiden Instanzen gegenseitig.
    kennung = basis.rstrip("/").rsplit("/", 1)[-1]
    schluessel = kennung + "_" + re.sub(r"[^A-Za-z0-9_.-]", "_", pfad)[:140] + ".html"
    cache_datei = os.path.join(CACHE_VZ, schluessel)

    if cache and os.path.exists(cache_datei):
        with open(cache_datei, encoding="utf-8") as f:
            return f.read()

    url = f"{basis}/{pfad}"
    anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(anfrage, timeout=30) as antwort:
            rohdaten = antwort.read()
    except urllib.error.URLError as fehler:
        print(f"  ! Fehler bei {url}: {fehler}", file=sys.stderr)
        return ""

    text = rohdaten.decode("utf-8", errors="replace")
    with open(cache_datei, "w", encoding="utf-8") as f:
        f.write(text)
    time.sleep(PAUSE_SEKUNDEN)
    return text


# ------------------------------------------------------------------- Hilfsteil

def sauber(rohtext):
    """HTML-Fragment zu lesbarem Text."""
    text = re.sub(r"<br\s*/?>", " — ", rohtext)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def absolut(url, basis):
    if url.startswith("http"):
        return url
    return f"{basis}/{url.lstrip('/')}"


def ist_verfahren(titel):
    return any(re.search(m, titel, re.I) for m in VERFAHREN_MUSTER)


def dokumente_aus(fragment, basis):
    """Extrahiert Dokumentlinks (getfile.php / externe Links) aus einem Block."""
    gefunden = []
    gesehen = set()
    muster = r'<div class="smc-el-h[^"]*">\s*<a href="([^"]+)"[^>]*>(.*?)</a>'
    for url, titel in re.findall(muster, fragment, re.S):
        titel = sauber(titel)
        url = absolut(html.unescape(url), basis)
        if not titel or url in gesehen:
            continue
        gesehen.add(url)
        gefunden.append({"titel": titel, "url": url})
    return gefunden


# ------------------------------------------------------------------- Parser

def parse_kalender(seite):
    """Liefert Sitzungs-IDs aus einer Monatsansicht (si0040.php)."""
    ids = []
    for treffer in re.findall(r"si0056\.php\?__ksinr=(\d+)", seite):
        if treffer not in ids:
            ids.append(treffer)
    return ids


def parse_beratungen(seite, basis):
    """
    Liest den Beratungsweg einer Vorlage (vo0053.php).

    Jede Station ist eine Karte, deren Kopfzeile so aussieht:
        01.07.2026 Ausschuss fuer Sport ... TOP 3 oeffentlich - Vorberatung
    Die Rolle ("Vorberatung", "Entscheidung", "Bekanntgabe", ...) wird als
    Rohstring uebernommen — unbekannte Rollen sollen nicht verlorengehen.
    """
    if not seite:
        return []

    kopf_muster = re.compile(
        r'aria-controls="smcacchead\d+"\s*>\s*'
        r"(\d{2}\.\d{2}\.\d{4})\s+(.*?)\s+TOP\s+([\w.]+)\s+"
        r"(nicht öffentlich|öffentlich)\s*-\s*([^<\n]+?)\s*(?:<|$)",
        re.S,
    )

    stationen = []
    for block in re.split(r'<div id="smcpanel', html.unescape(seite))[1:]:
        treffer = kopf_muster.search(block)
        if not treffer:
            continue
        datum_de, gremium, top_nr, sichtbarkeit, rolle = treffer.groups()
        tag, monat, jahr = datum_de.split(".")

        sitzung_url = ""
        link = re.search(r'href="(si0056\.php\?__ksinr=\d+[^"]*)"', block)
        if link:
            sitzung_url = absolut(link.group(1), basis)

        stationen.append(
            {
                "datum": f"{jahr}-{monat}-{tag}",
                "datum_anzeige": datum_de,
                "gremium": re.sub(r"\s+", " ", gremium).strip(),
                "top_nr": top_nr,
                "oeffentlich": sichtbarkeit == "öffentlich",
                "rolle": re.sub(r"\s+", " ", rolle).strip(),
                "sitzung_url": sitzung_url,
            }
        )

    stationen.sort(key=lambda s: s["datum"])
    return stationen


def parse_sitzung(sitzungs_id, seite, basis):
    """Baut ein Sitzungsobjekt inkl. Tagesordnungspunkten."""
    if not seite:
        return None

    def feld(css_klasse):
        treffer = re.search(
            rf'<div class="smc-table-cell {css_klasse}">(.*?)</div>', seite, re.S
        )
        return sauber(treffer.group(1)) if treffer else ""

    datum_de = feld("sidat")
    datum_iso = ""
    if re.match(r"\d{2}\.\d{2}\.\d{4}$", datum_de):
        tag, monat, jahr = datum_de.split(".")
        datum_iso = f"{jahr}-{monat}-{tag}"

    sitzung = {
        "id": sitzungs_id,
        "kennung": feld("siname"),
        "gremium": feld("sigrname"),
        "raum": feld("siort"),
        "datum": datum_iso,
        "datum_anzeige": datum_de,
        "zeit": feld("yytime"),
        "url": f"{basis}/si0056.php?__ksinr={sitzungs_id}",
        "dokumente": [],
        "tops": [],
    }

    # Sitzungsdokumente (Bekanntmachung, Livestream ...) liegen vor dem Accordion
    kopf = seite.split('id="smcaccordion"')[0]
    dokumentblock = re.search(r'<div class="smc-dg-c-1-10 smc-documents.*', kopf, re.S)
    if dokumentblock:
        sitzung["dokumente"] = dokumente_aus(dokumentblock.group(0), basis)

    # Tagesordnungspunkte: jede .card im Accordion mit badge + Titel
    accordion = seite.split('id="smcaccordion"')
    if len(accordion) < 2:
        return sitzung
    accordion = accordion[1]

    karten = re.split(r'<div class="card card-light', accordion)
    for karte in karten[1:]:
        badge = re.search(r'<span class="badge">(.*?)</span>', karte, re.S)
        titel_treffer = re.search(
            r'<div class="smc-card-text-title">(.*?)</div>', karte, re.S
        )
        if not badge or not titel_treffer:
            continue

        nummer = sauber(badge.group(1))
        volltitel = sauber(titel_treffer.group(1))

        # "Ö 1.7 Nachtrag: 28.07.2026" -> Nummer und Nachtragsdatum trennen
        nachtrag = ""
        nachtrag_treffer = re.search(r"\s*Nachtrag:\s*(.*)$", nummer)
        if nachtrag_treffer:
            nachtrag = nachtrag_treffer.group(1).strip()
            nummer = nummer[: nachtrag_treffer.start()].strip()

        # Klammerzusatz (Referent / Berichtsform) abtrennen
        titel, zusatz = volltitel, ""
        zusatz_treffer = re.search(r"—\s*\((.*?)\)\s*$", volltitel)
        if zusatz_treffer:
            zusatz = zusatz_treffer.group(1).strip()
            titel = volltitel[: zusatz_treffer.start()].strip(" — ").strip()

        # Antragsteller-Zeile nach dem <br/> ("— - Antrag der Fraktion ...")
        antragsteller = ""
        antrag_treffer = re.search(r"—\s*-?\s*(Antrag[^—]*)$", titel)
        if antrag_treffer:
            antragsteller = antrag_treffer.group(1).strip()
            titel = titel[: antrag_treffer.start()].strip()
        titel = re.sub(r"\s*—\s*-?\s*$", "", titel).strip()

        vorlage = re.search(
            r'href="(vo0050\.php\?__kvonr=\d+)"[^>]*>\s*(?:<[^>]+>\s*)*([^<]+?)\s*<',
            karte,
            re.S,
        )

        top = {
            "nr": nummer,
            "titel": titel,
            "zusatz": zusatz,
            "antragsteller": antragsteller,
            "nachtrag": nachtrag,
            "oeffentlich": nummer.startswith("Ö"),
            "verfahren": ist_verfahren(titel),
            "vorlage": sauber(vorlage.group(2)) if vorlage else "",
            "vorlage_url": absolut(vorlage.group(1), basis) if vorlage else "",
            "dokumente": dokumente_aus(karte, basis),
            "beratungen": [],
        }
        sitzung["tops"].append(top)

    return sitzung


# ------------------------------------------------------------------- Ablauf

def monate(von, bis):
    """Liste von (Jahr, Monat) inklusive Grenzen. Format 'YYYY-MM'."""
    vj, vm = (int(x) for x in von.split("-"))
    bj, bm = (int(x) for x in bis.split("-"))
    ergebnis = []
    jahr, monat = vj, vm
    while (jahr, monat) <= (bj, bm):
        ergebnis.append((jahr, monat))
        monat += 1
        if monat > 12:
            monat, jahr = 1, jahr + 1
    return ergebnis


def quelle_auslesen(kuerzel, zeitraum, cache, mit_beratungen):
    """Liest eine komplette Instanz aus und liefert die Sitzungsliste."""
    basis = QUELLEN[kuerzel]["basis_url"]
    print(f"\n=== Quelle '{kuerzel}' ({basis}) ===")

    sitzungs_ids = []
    for jahr, monat in zeitraum:
        pfad = f"si0040.php?__cjahr={jahr}&__cmonat={monat}&__canz=1&__cselect=0"
        print(f"  Kalender {MONATSNAMEN[monat]} {jahr} ...", end=" ", flush=True)
        seite = hole(pfad, basis, cache=cache)
        neu = [i for i in parse_kalender(seite) if i not in sitzungs_ids]
        sitzungs_ids.extend(neu)
        print(f"{len(neu)} Sitzungen")

    print(f"  {len(sitzungs_ids)} Sitzungen, lade Tagesordnungen ...")
    sitzungen = []
    for nummer, sitzungs_id in enumerate(sitzungs_ids, 1):
        seite = hole(f"si0056.php?__ksinr={sitzungs_id}", basis, cache=cache)
        sitzung = parse_sitzung(sitzungs_id, seite, basis)
        if not sitzung:
            continue
        sitzung["quelle"] = kuerzel
        sitzungen.append(sitzung)
        oeff = sum(1 for t in sitzung["tops"] if t["oeffentlich"])
        print(
            f"    [{nummer}/{len(sitzungs_ids)}] {sitzung['datum_anzeige']} "
            f"{sitzung['gremium'][:44]:44} {oeff} oeff. TOPs"
        )

    if mit_beratungen:
        vorlagen = [
            t
            for s in sitzungen
            for t in s["tops"]
            if t["vorlage_url"] and not t["verfahren"]
        ]
        print(f"  Beratungswege zu {len(vorlagen)} Vorlagen ...", end=" ", flush=True)
        for top in vorlagen:
            kvonr = re.search(r"__kvonr=(\d+)", top["vorlage_url"])
            if not kvonr:
                continue
            seite = hole(f"vo0053.php?__kvonr={kvonr.group(1)}", basis, cache=cache)
            top["beratungen"] = parse_beratungen(seite, basis)
        stationen = sum(len(t["beratungen"]) for t in vorlagen)
        print(f"{stationen} Stationen")

    return sitzungen


def main():
    heute = date.today()
    standard_bis = f"{heute.year:04d}-{heute.month:02d}"
    start_monat = heute.month - 2
    start_jahr = heute.year
    if start_monat < 1:
        start_monat += 12
        start_jahr -= 1
    standard_von = f"{start_jahr:04d}-{start_monat:02d}"

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--von", default=standard_von, help="Startmonat YYYY-MM")
    parser.add_argument("--bis", default=standard_bis, help="Endmonat YYYY-MM")
    parser.add_argument(
        "--quelle",
        default="beide",
        choices=["stadt", "bza", "beide"],
        help="Welche Instanz auslesen (Standard: beide)",
    )
    parser.add_argument(
        "--ohne-beratungen",
        action="store_true",
        help="Beratungsweg (vo0053.php) nicht laden",
    )
    parser.add_argument("--no-cache", action="store_true", help="Cache ignorieren")
    args = parser.parse_args()

    cache = not args.no_cache
    zeitraum = monate(args.von, args.bis)
    gewaehlt = ["stadt", "bza"] if args.quelle == "beide" else [args.quelle]
    print(f"Zeitraum: {args.von} bis {args.bis} ({len(zeitraum)} Monate)")
    print(f"Quellen:  {', '.join(gewaehlt)}")

    sitzungen = []
    for kuerzel in gewaehlt:
        sitzungen += quelle_auslesen(
            kuerzel, zeitraum, cache, not args.ohne_beratungen
        )

    sitzungen.sort(key=lambda s: (s["datum"], s["kennung"]), reverse=True)

    je_quelle = {}
    for kuerzel in gewaehlt:
        eigene = [s for s in sitzungen if s["quelle"] == kuerzel]
        je_quelle[kuerzel] = dict(
            QUELLEN[kuerzel],
            anzahl_sitzungen=len(eigene),
            anzahl_tops=sum(len(s["tops"]) for s in eigene),
        )

    ausgabe = {
        "quellen": je_quelle,
        "hinweis": "Oeffentlich zugaengliche Seiten, ohne Anmeldung abgerufen.",
        "abgerufen_am": date.today().isoformat(),
        "zeitraum": {"von": args.von, "bis": args.bis},
        "anzahl_sitzungen": len(sitzungen),
        "anzahl_tops": sum(len(s["tops"]) for s in sitzungen),
        "anzahl_verfahren": sum(
            1 for s in sitzungen for t in s["tops"] if t["verfahren"]
        ),
        "sitzungen": sitzungen,
    }

    os.makedirs(DATEN_VZ, exist_ok=True)
    ziel = os.path.join(DATEN_VZ, "rohdaten.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(ausgabe, f, ensure_ascii=False, indent=2)

    print(f"\nGeschrieben: {ziel}")
    for kuerzel, info in je_quelle.items():
        print(
            f"  {kuerzel:6} {info['anzahl_sitzungen']:3} Sitzungen, "
            f"{info['anzahl_tops']:4} TOPs"
        )
    print(
        f"  gesamt {ausgabe['anzahl_sitzungen']:3} Sitzungen, "
        f"{ausgabe['anzahl_tops']:4} TOPs "
        f"({ausgabe['anzahl_verfahren']} davon Sitzungsroutine)"
    )


if __name__ == "__main__":
    main()
