#!/usr/bin/env python3
"""
Baut die Daten fuer hsk.html aus dem Haushaltssicherungskonzept (HSK).

    python3 hsk_lesen.py

Quelle ist die Beschlussvorlage V0652/26 "Haushaltssicherungskonzept (HSK)"
(Finanzausschuss 22.10.2026, Stadtrat 29.10.2026) mit zwei PDFs:

- "Haushaltssicherungskonzept 2026" (71 Seiten Text). Die Zahlen daraus
  (Konsolidierungsziel, Schuldenszenarien, Ausgabenstruktur ...) stehen von
  Hand gepflegt in data/hsk_bericht.json, jeweils mit Seitenangabe. Dieses
  Skript rechnet sie nach, soweit das Dokument selbst Summen druckt.
- "Anlagen" (19 Seiten). Daraus liest das Skript maschinell:
    Anlage 1, Blatt 1  Massnahmen mit Wirkung auf den Verwaltungshaushalt
    Anlage 1, Blatt 2  Personalkosten-Einzelmassnahmen (nachrichtlich)
    Anlage 1, Blatt 3  Massnahmen im Vermoegenshaushalt
    Anlage 5           Aufstellung der freiwilligen Leistungen
  und prueft jede Tabelle gegen die gedruckte Summenzeile. Weicht etwas ab,
  bricht das Skript ab, statt eine falsche Datei zu schreiben.

Die Klartexte zu den Massnahmen (normal + Leichte Sprache) stehen ebenfalls
in data/hsk_bericht.json. Neue Massnahmen in einer Fortschreibung des HSK
fallen hier als Warnung auf und brauchen dort einen Eintrag.

Ergebnis: data/hsk.json und data/hsk.js (window.HSK_DATEN).
"""

import datetime as dt
import json
import logging
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(HIER, "..", "data")

sys.path.insert(0, HIER)
from haushalt_holen import hole  # noqa: E402  (Cache in .cache/pdf, IPv4 zuerst)

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber fehlt:  python3 -m pip install pdfplumber")

logging.getLogger("pdfminer").setLevel(logging.ERROR)

BASIS = "https://www.ingolstadt.de/sessionnet/"
VORLAGE_URL = BASIS + "vo0050.php?__kvonr=23409"
DOK_IDS = {
    "vorlage": 254276,
    "konzept": 254467,
    "anlagen": 254468,
}

# Einzelplaene der Kameralistik; erste Ziffer der Gliederungsnummer.
# Manche Zeilen der Anlage 5 tragen statt einer Gliederung die Amtsnummer
# (58 Gartenamt, 59 Seen, 31 Wissenschaft, 79 Wirtschaft, FB 29).
EINZELPLAN = {
    "0": "Allgemeine Verwaltung",
    "1": "Sicherheit und Ordnung",
    "2": "Schulen",
    "3": "Kultur und Wissenschaft",
    "4": "Soziales und Jugend",
    "5": "Sport, Grün und Erholung",
    "6": "Bauen, Planen, Verkehr",
    "7": "Öffentliche Einrichtungen, Wirtschaft",
    "8": "Städtische Unternehmen",
}
AMT_ZU_EINZELPLAN = {"58": "5", "59": "5", "31": "3", "79": "7", "FB 29": "0"}


def fehler(text):
    sys.exit("FEHLER: " + text)


def zahl(zelle):
    """'10.500,0' -> 10500.0, '' -> None. Deutsche Schreibweise, TEUR oder Euro."""
    s = (zelle or "").strip().replace(" ", "")
    if not s:
        return None
    if not re.fullmatch(r"-?[\d.]+(,\d+)?", s):
        return None
    return float(s.replace(".", "").replace(",", "."))


def flach(zelle):
    return re.sub(r"\s+", " ", (zelle or "").replace("\n", " ")).strip()


def url(id_):
    return f"{BASIS}getfile.php?id={id_}&type=do"


# ------------------------------------------------------------- Anlage 1

JAHRE = ["2026", "2027", "2028", "2029"]


def massnahmen_zeilen(seiten):
    """Zeilen mit lfd. Nr. aus den Tabellen der Anlage 1, plus die Summenzeile."""
    zeilen, summe = [], None
    for seite in seiten:
        for tabelle in seite.extract_tables():
            for z in tabelle:
                kopf = flach(z[0])
                if re.fullmatch(r"V?\.?\d{3,4}(\.\d+)?", kopf):
                    zeilen.append(z)
                elif kopf.startswith("SUMME"):
                    summe = z
    return zeilen, summe


def massnahme(z):
    werte = {j: zahl(z[7 + i]) for i, j in enumerate(JAHRE)}
    erzielt = {j: zahl(z[11 + i]) for i, j in enumerate(JAHRE)}
    return {
        "nr": flach(z[0]),
        "punkt": flach(z[1]),
        "art": flach(z[2]),
        "erlaeuterung": flach(z[3]),
        "beschluss": flach(z[4]),
        "ab": flach(z[5]),
        "bisher_teur": flach(z[6]),
        "teur": werte,
        "erzielt_teur": {j: v for j, v in erzielt.items() if v is not None},
        "wirkungsanalyse": flach(z[15]),
        "geschaetzt": flach(z[16]) == "A",
        "verantwortlich": flach(z[17]),
    }


# Fehler in der Quelle selbst, von Hand nachgerechnet: Die gedruckte Summe
# 2027 im Personal-Blatt laesst die 87,7 TEUR der Zeile 001.7 (Abgabe von
# Schulstandorten) aus; 2026, 2028 und 2029 gehen exakt auf. Jede andere
# Abweichung bricht weiterhin ab.
BEKANNTE_ABWEICHUNGEN = {
    ("Anlage 1 Blatt 2", "2027"): 87.7,
}


def summe_pruefen(name, liste, summenzeile, spalte0):
    if not summenzeile:
        fehler(f"{name}: keine Summenzeile gefunden")
    for i, j in enumerate(JAHRE):
        gedruckt = zahl(summenzeile[spalte0 + i]) or 0.0
        gerechnet = sum((m["teur"][j] or 0.0) for m in liste)
        erlaubt = BEKANNTE_ABWEICHUNGEN.get((name, j), 0.0)
        # Gedruckt wird auf volle TEUR bzw. eine Nachkommastelle gerundet.
        if abs(gedruckt + erlaubt - gerechnet) > 1.0:
            fehler(f"{name} {j}: Summe der Zeilen {gerechnet:.1f} TEUR, "
                   f"gedruckt {gedruckt:.1f} TEUR")
    return {j: zahl(summenzeile[spalte0 + i]) for i, j in enumerate(JAHRE)}


def lies_anlage1(pdf):
    # Blatt 1 steht auf den Seiten 2-3, Blatt 2 auf Seite 4, Blatt 3 auf Seite 5.
    vwhh, s1 = massnahmen_zeilen(pdf.pages[1:3])
    personal, s2 = massnahmen_zeilen(pdf.pages[3:4])
    vmhh, s3 = massnahmen_zeilen(pdf.pages[4:5])
    vwhh = [massnahme(z) for z in vwhh]
    personal = [massnahme(z) for z in personal]
    vmhh = [massnahme(z) for z in vmhh]

    nummern = [m["nr"] for m in vwhh]
    erwartet = [f"{i:03d}" for i in range(1, len(vwhh) + 1)]
    if nummern != erwartet:
        fehler(f"Anlage 1: Nummern lueckenhaft oder doppelt: {nummern}")

    return {
        "verwaltungshaushalt": vwhh,
        "summe_verwaltungshaushalt": summe_pruefen("Anlage 1 Blatt 1", vwhh, s1, 7),
        "personal": personal,
        "summe_personal": summe_pruefen("Anlage 1 Blatt 2", personal, s2, 7),
        "vermoegenshaushalt": vmhh,
        "summe_vermoegenshaushalt": summe_pruefen("Anlage 1 Blatt 3", vmhh, s3, 7),
    }


# ------------------------------------------------------------- Anlage 5

# Zwei Bezeichnungen laufen im PDF ueber zwei Zeilen und kommen nur halb an.
# Ergaenzt aus dem Fliesstext der Seite, erkannt am Betrag 2026.
NAMEN_ERGAENZT = {
    ("610000", 1374548.0): "Städtebauförderung: technische Betreuung städtischer Projekte "
                           "inkl. Sanierung Weinzierl",
    ("610000", 114935.0): "Städtebauförderung: technische Betreuung (Altstadt)",
}


def einzelplan(gliederung):
    g = gliederung.strip()
    for amt, ep in AMT_ZU_EINZELPLAN.items():
        if g == amt:
            return ep
    erste = g.lstrip()[:1]
    return erste if erste in EINZELPLAN else None


def lies_anlage5(pdf):
    """
    Freiwillige Leistungen im Verwaltungshaushalt (Seiten 12-17 der Anlagen).
    Spalten: Gliederung, Gruppierung, Bezeichnung, 2023, 2024, 2025,
    Haushaltsreste, Plan 2026. Bei einigen Zeilen liefert pdfplumber die
    Bezeichnung nicht mit, die holt sich das Skript dann aus dem Fliesstext
    der Seite (Zeile, die mit denselben Betraegen endet).
    """
    posten, summe = [], None
    for seite in pdf.pages[11:17]:
        textzeilen = (seite.extract_text() or "").split("\n")
        for tabelle in seite.extract_tables():
            for z in tabelle:
                # Auf derselben Seite beginnt danach der Vermoegenshaushalt.
                if summe or len(z) < 8:
                    continue
                if flach(z[0]).startswith("Summe Verwaltungshaushalt"):
                    summe = z
                    continue
                betraege = [zahl(z[i]) for i in (3, 4, 5, 7)]
                if any(b is None for b in betraege):
                    continue
                gliederung = flach(z[0]).split(" ")[0] if not flach(z[0]).startswith("FB") \
                    else "FB 29"
                name = flach(z[2])
                if not name:
                    muster = " ".join(flach(z[i]) for i in (3, 4, 5))
                    for tz in textzeilen:
                        if muster in tz:
                            name = tz.split(muster)[0]
                            name = re.sub(r"^[\d\s.*]+", "", name).strip()
                            break
                name = NAMEN_ERGAENZT.get((gliederung, betraege[3]), name)
                if not name:
                    fehler(f"Anlage 5: Zeile ohne Bezeichnung: {z}")
                posten.append({
                    "gliederung": gliederung,
                    "einzelplan": einzelplan(gliederung),
                    "name": name,
                    "euro": {"2023": betraege[0], "2024": betraege[1],
                             "2025": betraege[2], "2026": betraege[3]},
                })

    if not summe:
        fehler("Anlage 5: keine Summenzeile Verwaltungshaushalt gefunden")
    for i, jahr in ((3, "2023"), (4, "2024"), (5, "2025"), (7, "2026")):
        gedruckt = zahl(summe[i])
        gerechnet = round(sum(p["euro"][jahr] for p in posten))
        # Die Zeilen sind auf volle Euro gerundet, die Summe nicht: hoechstens
        # ein halber Euro je Zeile. Eine fehlende oder doppelte Zeile faellt
        # trotzdem auf, die kleinste Zeile liegt im dreistelligen Bereich.
        if abs(gedruckt - gerechnet) > 0.5 * len(posten):
            fehler(f"Anlage 5 {jahr}: Summe der Zeilen {gerechnet} €, gedruckt {gedruckt} €")
    ohne = [p["name"] for p in posten if not p["einzelplan"]]
    if ohne:
        fehler(f"Anlage 5: kein Einzelplan fuer {ohne}")
    return posten, {j: zahl(summe[i]) for i, j in ((3, "2023"), (4, "2024"), (5, "2025"), (7, "2026"))}


# ------------------------------------------------------ Bericht nachrechnen

def pruefe_bericht(b, anlage1):
    kzv = b["konsolidierungsziel"]
    for i, j in enumerate(JAHRE):
        u = kzv["unterdeckung"][i]
        r = kzv["reserve"][i]
        k = kzv["kzv"][i]
        kl = kzv["klinikum"][i]
        ber = kzv["bereinigt"][i]
        if u + r != k:
            fehler(f"hsk_bericht.json KZV {j}: {u} + {r} != {k}")
        if k + kl != ber:
            fehler(f"hsk_bericht.json bereinigtes KZV {j}: {k} + {kl} != {ber}")
        summe = anlage1["summe_verwaltungshaushalt"][j]
        diff = kzv["differenz_gesamt"][i]
        if abs((k + summe) - diff) > 1:
            fehler(f"Differenz zum KZV {j}: {k} + {summe} != gedruckt {diff}")

    for name, sz in b["schulden"]["szenarien"].items():
        stand = sz["start_stand"]
        for jahr, neu in zip(sz["jahre"], sz["neu"]):
            stand = round(stand + neu, 2)
        if abs(stand - sz["stand_2036"]) > 0.01:
            fehler(f"Schuldenszenario {name}: aufsummiert {stand}, gedruckt {sz['stand_2036']}")

    a = b["ausgaben_2026"]
    if sum(p["teur"] for p in a["posten"]) != a["summe_teur"]:
        fehler("Ausgaben 2026: Posten ergeben nicht die gedruckte Summe")
    e = b["einnahmen_2026"]
    if sum(p["teur"] for p in e["posten"]) != e["summe_teur"]:
        fehler("Einnahmen 2026: Posten ergeben nicht die gedruckte Summe")


def vorlagen_links():
    """Vorlagennummer -> Link ins Ratsinfoportal, aus den bereits gelesenen Rohdaten."""
    pfad = os.path.join(DATEN_VZ, "rohdaten.json")
    if not os.path.exists(pfad):
        return {}
    with open(pfad, encoding="utf-8") as f:
        roh = json.load(f)
    links = {}
    for sitzung in roh["sitzungen"]:
        for top in sitzung["tops"]:
            if top.get("vorlage") and top.get("vorlage_url"):
                links.setdefault(top["vorlage"], top["vorlage_url"])
    return links


def main():
    pfade = {k: hole(v, f"HSK {k}") for k, v in DOK_IDS.items()}

    with pdfplumber.open(pfade["anlagen"]) as pdf:
        anlage1 = lies_anlage1(pdf)
        freiwillig, freiwillig_summe = lies_anlage5(pdf)

    with open(os.path.join(DATEN_VZ, "hsk_bericht.json"), encoding="utf-8") as f:
        bericht = json.load(f)
    pruefe_bericht(bericht, anlage1)

    texte = bericht["massnahmen_texte"]
    links = vorlagen_links()
    warnungen = []
    for liste in ("verwaltungshaushalt", "personal", "vermoegenshaushalt"):
        for m in anlage1[liste]:
            treffer = re.search(r"V\d{4}/\d{2}", m["beschluss"] + " " + m["erlaeuterung"])
            if treffer:
                m["vorlage"] = treffer.group(0)
                if treffer.group(0) in links:
                    m["vorlage_url"] = links[treffer.group(0)]
            k = texte.get(m["nr"])
            if not k:
                warnungen.append(f"Massnahme {m['nr']} ({m['art']}) hat keinen Klartext "
                                 "in data/hsk_bericht.json")
                continue
            m.update(k)
    for nr in texte:
        if not any(m["nr"] == nr for liste in ("verwaltungshaushalt", "personal",
                                               "vermoegenshaushalt") for m in anlage1[liste]):
            warnungen.append(f"Klartext fuer {nr} in hsk_bericht.json, aber keine Massnahme im PDF")

    daten = {
        "erzeugt_von": "scraper/hsk_lesen.py",
        "erzeugt_am": dt.date.today().isoformat(),
        "quellen": {
            "vorlage": VORLAGE_URL,
            "vorlage_nr": "V0652/26",
            "vorlage_pdf": url(DOK_IDS["vorlage"]),
            "konzept_pdf": url(DOK_IDS["konzept"]),
            "anlagen_pdf": url(DOK_IDS["anlagen"]),
        },
        "bericht": {k: v for k, v in bericht.items() if k != "massnahmen_texte"},
        "einzelplaene": EINZELPLAN,
        "massnahmen": anlage1,
        "freiwillige_leistungen": {
            "posten": freiwillig,
            "summe_euro": freiwillig_summe,
        },
    }

    with open(os.path.join(DATEN_VZ, "hsk.json"), "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATEN_VZ, "hsk.js"), "w", encoding="utf-8") as f:
        f.write("window.HSK_DATEN = " + json.dumps(daten, ensure_ascii=False) + ";\n")

    s = anlage1["summe_verwaltungshaushalt"]
    print(f"\nMassnahmen Verwaltungshaushalt: {len(anlage1['verwaltungshaushalt'])}, "
          f"Summe 2026-2029: {s['2026']:.0f} / {s['2027']:.0f} / {s['2028']:.0f} / {s['2029']:.0f} TEUR")
    print(f"Personal-Einzelmassnahmen: {len(anlage1['personal'])}, "
          f"Vermoegenshaushalt: {len(anlage1['vermoegenshaushalt'])}")
    print(f"Freiwillige Leistungen: {len(freiwillig)} Posten, "
          f"Plan 2026 {freiwillig_summe['2026']:,.0f} €".replace(",", "."))
    for w in warnungen:
        print("  warnung:", w)
    print("Geschrieben: data/hsk.json, data/hsk.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())
