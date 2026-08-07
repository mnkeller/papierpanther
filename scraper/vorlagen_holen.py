#!/usr/bin/env python3
"""
Holt die naechste Portion Vorlagentexte zur Kuration.

    python3 vorlagen_holen.py --max 30                # Portion Stadtrat holen
    python3 vorlagen_holen.py --max 30 --quelle bza   # Portion Bezirksausschuesse holen
    python3 vorlagen_holen.py --max 30 --liste         # nur zeigen, nichts laden

Waehlt Themen aus Stadtrat und Fachausschuessen (oder, mit --quelle bza, aus
den Bezirksausschuessen), die noch keinen Klartext haben. Ein Thema ist eine
Vorlage, nicht ein Tagesordnungspunkt — dieselbe Vorlage laeuft durch mehrere
Gremien und braucht trotzdem nur einen Text.

Geladen wird ausschliesslich das Hauptdokument, keine Anlagen. Anlagen sind
Plaene, Tabellen und Gutachten; sie vervielfachen die Textmenge, ohne die
Frage zu beantworten, worum es geht.

Ergebnis: data/vorlagen_charge.json — Eingabe fuer die Kuration nach
KURATION.md. PDFs liegen in scraper/.cache/pdf/, damit ein zweiter Lauf
das Portal nicht erneut belastet.
"""

import argparse
import collections
import io
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
from entwuerfe_bauen import ist_beteiligung, ist_sammelueberschrift  # noqa: E402
from feed_bauen import thema_schluessel, leitstation  # noqa: E402
from ris_ingolstadt import USER_AGENT, PAUSE_SEKUNDEN  # noqa: E402

# Anlagen erkennt man am Titel. Alles andere ist die Vorlage selbst, ein
# Beschluss oder ein Fraktionsantrag — also das, was wir lesen wollen.
IST_ANLAGE = re.compile(
    r"^(anlage|plan\b|lageplan|karte|foto|bild|abwaegung|abw(ä|ae)gung|"
    r"schalltechn|verkehrsunters|klimaanalyse|gutachten|tabelle|"
    r"kalkulation|uebersicht|übersicht)",
    re.I,
)


def lade(name):
    with open(os.path.join(DATEN_VZ, name), encoding="utf-8") as f:
        return json.load(f)


def pdf_text(url):
    """(text, seiten, hinweis). Leerer Text heisst: Scan ohne Textebene."""
    os.makedirs(PDF_CACHE, exist_ok=True)
    schluessel = re.sub(r"[^A-Za-z0-9]", "_", url)[-120:] + ".pdf"
    pfad = os.path.join(PDF_CACHE, schluessel)

    if os.path.exists(pfad):
        with open(pfad, "rb") as f:
            roh = f.read()
    else:
        anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(anfrage, timeout=60) as antwort:
                roh = antwort.read()
        except (urllib.error.URLError, TimeoutError) as fehler:
            return "", 0, f"nicht ladbar: {fehler}"
        with open(pfad, "wb") as f:
            f.write(roh)
        time.sleep(PAUSE_SEKUNDEN)

    if not roh.startswith(b"%PDF"):
        return "", 0, "kein PDF"

    try:
        import pdfplumber
    except ImportError:
        sys.exit("pdfplumber fehlt:  python3 -m pip install pdfplumber")

    import logging
    logging.getLogger("pdfminer").setLevel(logging.ERROR)

    with pdfplumber.open(io.BytesIO(roh)) as pdf:
        seiten = len(pdf.pages)
        text = "\n".join((s.extract_text() or "") for s in pdf.pages[:15])
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return "", seiten, "gescannt, keine Textebene — braeuchte OCR"
    return text, seiten, ""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--max", type=int, default=25, help="wie viele Themen")
    ap.add_argument("--quelle", choices=["stadt", "bza"], default="stadt",
                     help="welche Gremienebene (Default: stadt)")
    ap.add_argument("--liste", action="store_true", help="nur zeigen")
    args = ap.parse_args()

    roh = lade("rohdaten.json")
    kur = lade("kuration.json")["eintraege"]

    # Welche Themen haben schon einen Klartext? Entwuerfe zaehlen nicht als
    # erledigt — sie tragen nur einen Titel.
    index = {}
    for s in roh["sitzungen"]:
        q = s.get("quelle", "stadt")
        for t in s["tops"]:
            index[f'{q}:{s["id"]}#{t["nr"]}'] = (s, t)

    erledigt = set()
    for ref, k in kur.items():
        if ref in index and k.get("klartext"):
            s, t = index[ref]
            erledigt.add(thema_schluessel(s.get("quelle", "stadt"), t) or ref)

    # Themen sammeln
    themen = collections.defaultdict(list)
    for s in roh["sitzungen"]:
        if s.get("quelle", "stadt") != args.quelle or ist_beteiligung(s["gremium"]):
            continue
        for t in s["tops"]:
            if not t["oeffentlich"] or t["verfahren"]:
                continue
            if len(t["titel"]) < 12 or ist_sammelueberschrift(t["titel"]):
                continue
            # TOPs ohne eigene Ö-Nummer (Aenderungsantraege, Stellungnahmen der
            # Verwaltung "hierzu") teilen sich alle denselben Ref "<quelle>:<id>#Ö"
            # und lassen sich darum nicht einzeln referenzieren; sie werden mit
            # ihrem uebergeordneten, nummerierten TOP mitkuratiert.
            if t["nr"].strip() == "Ö":
                continue
            schluessel = thema_schluessel(args.quelle, t)
            if not schluessel:
                # Ohne Vorlagennummer (BZA-Punkte, aber auch Fraktions-Anfragen
                # und Sonderbefassungen im Stadtrat) gibt es kein gemeinsames
                # Laufen durch mehrere Gremien — jeder TOP ist sein eigenes Thema.
                schluessel = f'{args.quelle}:{s["id"]}#{t["nr"]}'
            if schluessel and schluessel not in erledigt:
                themen[schluessel].append((s, t))

    # Reihenfolge: entschiedene Themen zuerst, darin die aktuellsten
    def _ord(datum):
        return int((datum or "0000-00-00").replace("-", ""))

    sortiert = sorted(
        themen.items(),
        key=lambda e: (
            0 if any(b["rolle"].startswith("Entscheidung")
                     for _, tt in e[1] for b in tt.get("beratungen") or []) else 1,
            -_ord(leitstation(e[1])[0]["datum"] or "00000000"),
        ),
    )
    gewaehlt = sortiert[: args.max]

    print(f"{len(themen)} Themen offen, {len(gewaehlt)} in dieser Portion")
    if args.liste:
        for schluessel, auftritte in gewaehlt:
            s, t = leitstation(auftritte)
            print(f"  {s['datum']}  {len(auftritte)}x  {t['titel'][:74]}")
        return 0

    charge = []
    ohne_text = 0
    for nummer, (schluessel, auftritte) in enumerate(gewaehlt, 1):
        s, t = leitstation(auftritte)
        haupt = [d for d in t["dokumente"] if not IST_ANLAGE.match(d["titel"])]
        # BZA-Dokumente heissen oft nur "<Aktenzeichen> <Ortsangabe>" — ein
        # Lageplan faellt dann nicht unter IST_ANLAGE, obwohl er einer ist.
        # Bei Fraktions-Anfragen im Stadtrat liegen oft zwei Dokumente vor:
        # die Anfrage selbst und separat die Beantwortung. Die Antwort der
        # Verwaltung steht, wenn vorhanden, immer vor der reinen Frage.
        antwort = re.compile(r"stellungnahme|beantwortung|\bantwort\b", re.I)
        nur_frage = re.compile(r"^(anfrage|frage)\b", re.I)
        antworten = [d for d in haupt if antwort.search(d["titel"])]
        fragen = [d for d in haupt if d not in antworten and nur_frage.match(d["titel"])]
        rest = [d for d in haupt if d not in antworten and d not in fragen]
        if antworten:
            haupt = antworten + rest + fragen
        eintrag = {
            "thema": schluessel,
            "ref": f'{args.quelle}:{s["id"]}#{t["nr"]}',
            "datum": s["datum"],
            "gremium": s["gremium"],
            "amtlicher_titel": t["titel"],
            "vorlage": t["vorlage"],
            "vorlage_url": t["vorlage_url"],
            "antragsteller": t.get("antragsteller", ""),
            "auftritte": [
                {"datum": ss["datum_anzeige"], "gremium": ss["gremium"]}
                for ss, _ in sorted(auftritte, key=lambda x: x[0]["datum"] or "")
            ],
            "anlagen_uebersprungen": len(t["dokumente"]) - len(haupt),
            "text": "",
            "hinweis": "kein Hauptdokument" if not haupt else "",
        }
        if haupt:
            text, seiten, hinweis = pdf_text(haupt[0]["url"])
            eintrag["dokument"] = haupt[0]["titel"]
            eintrag["seiten"] = seiten
            eintrag["text"] = text
            eintrag["hinweis"] = hinweis
        if not eintrag["text"]:
            ohne_text += 1
        print(f"  [{nummer}/{len(gewaehlt)}] {t['titel'][:56]:56} "
              f"{len(eintrag['text']):6} Zeichen {eintrag['hinweis']}")

        charge.append(eintrag)

    ziel = os.path.join(DATEN_VZ, "vorlagen_charge.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(charge, f, ensure_ascii=False, indent=2)

    zeichen = sum(len(c["text"]) for c in charge)
    print(f"\nGeschrieben: {ziel}")
    print(f"  {zeichen} Zeichen (~{zeichen // 4} Token), {ohne_text} ohne Text")
    return 0


if __name__ == "__main__":
    sys.exit(main())
