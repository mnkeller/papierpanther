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

Drei Wege, in dieser Reihenfolge (Ausbau 2026-09-30 — vorher fand nur Weg 1
Treffer, 60 von rund 1.800 Vorlagen):

1. "Abstimmung über ... V0143/26/1:" — wie oben.
2. SessionNet-Niederschriften ohne Abstimmungszeile: der TOP-Block beginnt
   mit "Vorlage: V0219/26" und endet an der naechsten TOP-Ueberschrift. Steht
   darin genau EINE Abstimmungsformel ("Mit allen Stimmen:"), ist das der
   Beschluss. Mehrere Formeln ohne Vorlagen-Nummer: uebersprungen.
3. Bezirk Oberbayern (anderes Protokollformat, ohne Vorlagen-Nummer im Text):
   "TOP 3 <Titel> ... Beschluss: ... angenommen Ja 13 Nein 0". Zuordnung
   ueber TOP-Nummer UND Titelanfang, sonst uebersprungen.

Das Portal haengt manchmal das Protokoll der VORHERIGEN Sitzung an (zur
Genehmigung in der Folgesitzung) — bei 7 Sitzungen des Bezirks Oberbayern
gefunden. Deshalb wird jedes Protokoll ueber Datum/Nummer im PDF seiner
wirklichen Sitzung zugeordnet; das Ergebnis steht zusaetzlich in
../data/niederschriften.json (Sitzung -> Protokoll), das feed_bauen.py fuer
den Link "Beschluss in der Niederschrift nachlesen" nutzt.

Verwendung:
    python3 niederschriften_lesen.py
    python3 niederschriften_lesen.py --no-cache

Ergebnis: ../data/beschluesse.json — GETRENNT von kuration.json, weil
mechanisch/wörtlich aus der Quelle extrahiert statt redaktionell verfasst.
"""

import argparse
import collections
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


# Stimmenzahlen stehen mal als Ziffer, mal als Wort ("Gegen vier Stimmen"),
# und bei einer Gegenstimme in der Einzahl ("Gegen 1 Stimme") — beides
# uebersah die erste Fassung, und dann griff der Parser zur naechsten
# Formel im Text, die zu einer ANDEREN Abstimmung gehoerte (Kontrolle
# 2026-09-30, V0943/23/1: genehmigt, aber als abgelehnt gelesen).
ZAHL = r"(?:\d+|eine[rm]?|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)"
FORMEL = (
    r"Mit allen Stimmen|Mit " + ZAHL + r"\s*:\s*" + ZAHL + r" Stimmen"
    r"|Gegen " + ZAHL + r" Stimmen?(?:\s*\([^)]*\))?"
)
FORMEL_MUSTER = re.compile(FORMEL)

# Kein Beschluss, obwohl eine Formel dasteht: vertagt, verwiesen, oder die
# Abstimmung steht bei einer anderen Vorlage ("Beschlussfassung siehe
# V0965/24").
KEIN_BESCHLUSS = re.compile(
    r"\bvertagt\b|\bverweist\b|\bverwiesen\b|zur (weiteren )?Beratung in die"
    r"|von der Tagesordnung abgesetzt|Beschlussfassung siehe|siehe V\d{4}",
    re.I,
)
JA_WORTE = re.compile(
    r"genehmigt|beschlossen|zugestimmt|\bstimmt\b[^.]{0,200}?\bzu\b|freigegeben|beauftragt",
    re.I,
)


def ergebnis_von(text):
    """beschlossen / abgelehnt / teilweise ("Ziffer 1 wird abgelehnt.
    Ziffer 2 wird ... genehmigt.")."""
    anfang = text[:600]
    nein = re.search(r"\babgelehnt\b", anfang)
    if nein and JA_WORTE.search(anfang):
        return "teilweise"
    return "abgelehnt" if nein else "beschlossen"


def ist_empfehlung(text):
    """Ein vorberatendes Gremium empfiehlt nur. Zitiert der Beschluss eine
    Empfehlung und beschliesst dann selbst, ist es keine."""
    return bool(EMPFEHLUNG.search(text)) and not re.search(r"\bbeschließt\b", text)


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
        r"(.*?)(?=\n\s*(?:Getrennte\s+)?Abstimmung\b|\n\s*\d+(?:\.\d+)?\s+\.\s+\S|"
        r"\n\s*(?:Beratend|Entscheidend|Beschließend|Bekanntgabe)\s*(?:\n|$)|"
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
    voll = SITZUNGSENDE.sub("", treffer[0].group(1)).strip()
    block = voll[:1500]
    gekappt = len(voll) > 1500
    if gekappt:
        satzende = max(block.rfind(". "), block.rfind(".\n"))
        if satzende > 200:  # nicht auf Kosten eines brauchbaren Beschlusstexts kappen
            block = block[: satzende + 1]

    # Die Formel muss die Antwort ERÖFFNEN ("Mit allen Stimmen: ..." oder
    # "Ziffer 1: Mit allen Stimmen: ..."). Irgendeine Formel weiter unten
    # gehoert zu einer anderen Abstimmung.
    formel_treffer = re.match(r"\s*(?:Ziffer \d+:\s*)?(" + FORMEL + r")", block)
    if not formel_treffer:
        return None
    if KEIN_BESCHLUSS.search(block):
        return None

    formel = sauber(formel_treffer.group(1))
    text = sauber(block) + (" […]" if gekappt else "")
    return {"formel": formel, "ergebnis": ergebnis_von(block), "text": text, "vorlage": vorlage_nr}


STAND_WEG = re.compile(r"\b(vertagt|zurückgestellt|abgesetzt|zur weiteren Beratung)\b", re.I)
FORMEL_ZEILE = re.compile(r"^\s*(" + FORMEL + r")\s*:", re.M)
# Seitenfuesse der SessionNet-Niederschriften, rund ein Dutzend Varianten:
# eine Zeile ("Niederschrift Sitzung des Stadtrates am 29.07.2025 - 51 -"),
# auf zwei Zeilen verteilt ("... am" / "- 6 -"), oder von pdfplumber mitten
# in einen Satz geschoben ("werden Niederschrift Sitzung - 6 - des
# Ausschusses ... am 17.03.2026 genehmigt").
SEITENFUSS_IM_SATZ = re.compile(
    r"Niederschrift Sitzung\s*-\s*\d+\s*-\s*(?:des|der)\s[^\n]{0,160}?am\s+\d\d\.\d\d\.\d{4}[ \t]?"
)
SEITENFUSS_ZEILE = re.compile(
    r"^[ \t]*Niederschrift Sitzung\b[^\n]*\n"
    r"(?:[ \t]*(?:am[ \t]*)?(?:\d\d\.\d\d\.\d{4}[ \t]*)?-[ \t]*\d+[ \t]*-[ \t]*\n)?",
    re.M,
)


class _Seitenfuss:
    """Verhaelt sich wie ein kompiliertes Muster (nur .sub), damit die
    Aufrufstellen unveraendert bleiben."""

    @staticmethod
    def sub(ersatz, text):
        text = SEITENFUSS_IM_SATZ.sub("", text)
        return SEITENFUSS_ZEILE.sub(ersatz or "", text)


SEITENFUSS = _Seitenfuss()

# Nach dem letzten oeffentlichen TOP: "- Hiermit ist der oeffentliche Teil der
# Sitzung beendet. -" samt Seitenfuss — gehoert zu keinem Beschluss.
SITZUNGSENDE = re.compile(r"\s*-?\s*Hiermit ist der (?:nicht)?öffentliche Teil.*", re.S)
# Kopfzeile jeder Seite im Protokoll des Bezirks: "10.07.2025 Bezirksausschuss ö 7"
OBB_KOPFZEILE = re.compile(r"\s*\d\d\.\d\d\.\d{4} [^\n]{1,80} ö \d+\s*\n")
TOP_UEBERSCHRIFT = re.compile(r"^\s*\d+(?:\.\d+)?\s+\.\s+\S", re.M)
# Ein Ausschuss, der nur vorberaet, "empfiehlt" dem Stadtrat — das ist kein
# Beschluss. feed_bauen.py verwendet solche Treffer nicht fuer den Stand.
EMPFEHLUNG = re.compile(
    # "befuerwortet" nur in der Ausschuss-Formel — "Der Stadtrat befuerwortet
    # ..." ist eine Entscheidung (Kontrolle 2026-09-30, V0657/25).
    r"Antrag befürwortet|\bempfiehlt\b|wird empfohlen|an den Stadtrat"
    r"|dem Stadtrat (wird )?empfohlen|Empfehlung an",
    re.I,
)
# Abschnittsueberschriften der Niederschrift ("Beratend", "Entscheidend")
# stehen zwischen zwei TOPs und gehoeren zu keinem Beschlusstext.
ABSCHNITT = re.compile(
    r"^\s*(Beratend|Entscheidend|Beschließend|Bekanntgabe|Öffentliche Sitzung|Nichtöffentliche Sitzung)\s*$", re.M
)


def ergebnis_aus_block(block, vorlage_nr):
    """Weg 2: ein TOP-Block mit genau einer Abstimmungsformel.

    Steht im Block eine "Abstimmung ueber ..."-Zeile, gab es mehrere
    Abstimmungen (Aenderungsantraege, Ziffern) — dann ist Weg 1 zustaendig,
    und findet der nichts, wird nicht geraten."""
    if re.search(r"\bAbstimmung\b", block) or KEIN_BESCHLUSS.search(block):
        return None
    formeln = list(FORMEL_ZEILE.finditer(block))
    if len(formeln) != 1:
        return None
    rest = SITZUNGSENDE.sub("", block[formeln[0].start():]).strip()
    voll = rest
    rest = rest[:1500]
    gekappt = len(voll) > 1500
    if gekappt:
        satzende = max(rest.rfind(". "), rest.rfind(".\n"))
        if satzende > 200:
            rest = rest[: satzende + 1]
    ergebnis = ergebnis_von(rest)
    return {
        "formel": sauber(formeln[0].group(1)),
        "ergebnis": ergebnis,
        "text": sauber(rest) + (" […]" if gekappt else ""),
        "vorlage": vorlage_nr,
        "empfehlung": ist_empfehlung(rest),
        "weg": "vorlage-block",
    }


def bloecke_nach_vorlage(volltext):
    """{Vorlagen-Nummer: [Block, ...]} fuer SessionNet-Niederschriften."""
    text = SEITENFUSS.sub("", volltext)
    anfaenge = [(m.start(), m.group(1)) for m in
                re.finditer(r"^Vorlage:\s*(V\d{4}/\d{2}(?:/\d+)?)\s*$", text, re.M)]
    grenzen = sorted(
        [m.start() for m in TOP_UEBERSCHRIFT.finditer(text)]
        + [m.start() for m in ABSCHNITT.finditer(text)]
        + [a for a, _ in anfaenge]
    )
    ergebnis = {}
    for start, nr in anfaenge:
        ende = next((g for g in grenzen if g > start), len(text))
        ergebnis.setdefault(nr, []).append(text[start:ende])
    return ergebnis


def normtitel(t):
    return re.sub(r"[^a-z0-9äöüß]", "", (t or "").lower())


OBB_ERGEBNIS = re.compile(
    r"^(?:Beschluss:\s*)?(angenommen|abgelehnt)\s+Ja\s+(\d+)\s+Nein\s+(\d+)", re.M
)


def obb_beschluesse(volltext, sitzung):
    """Weg 3: Protokolle des Bezirks Oberbayern, Zuordnung ueber TOP-Nummer
    plus Titelanfang (die ersten 15 Zeichen, ohne Satzzeichen)."""
    koepfe = list(re.finditer(r"^TOP (\d+(?:\.\d+)?) (.*)$", volltext, re.M))
    # Die Tagesordnung am Anfang listet dieselben TOP-Zeilen — der Inhalt
    # steht beim jeweils letzten Vorkommen einer Nummer.
    letzte = {}
    for i, m in enumerate(koepfe):
        letzte[m.group(1)] = i
    ergebnis = {}
    for top in sitzung["tops"]:
        # "Ö 3.1" -> "3.1" (nicht "31", wie ein blosses Ziffern-Filtern ergaebe)
        m_nr = re.search(r"\d+(?:\.\d+)?", top.get("nr") or "")
        nr = m_nr.group(0) if m_nr else ""
        if not nr or nr not in letzte or not top.get("vorlage"):
            continue
        i = letzte[nr]
        kopf = koepfe[i]
        if normtitel(top["titel"])[:15] not in normtitel(kopf.group(2) + volltext[kopf.end():kopf.end() + 200]):
            continue
        ende = koepfe[i + 1].start() if i + 1 < len(koepfe) else len(volltext)
        block = volltext[kopf.end():ende]
        treffer = list(OBB_ERGEBNIS.finditer(block))
        if len(treffer) != 1:
            continue
        t = treffer[0]
        b = block.find("Beschluss:")
        text = block[b + len("Beschluss:"):t.start()].strip() if 0 <= b < t.start() else ""
        text = text[:1500]
        if KEIN_BESCHLUSS.search(text):
            continue
        ergebnis[top["nr"]] = {
            "formel": f"Ja {t.group(2)}, Nein {t.group(3)}",
            "ergebnis": "beschlossen" if t.group(1) == "angenommen" else "abgelehnt",
            "text": sauber(text) or sauber(t.group(0)),
            "vorlage": top["vorlage"],
            "empfehlung": ist_empfehlung(text),
            "weg": "obb-top",
        }
    return ergebnis


def protokoll_kennung(volltext, quelle):
    """Datum (und beim Bezirk die Sitzungsnummer), die im PDF selbst stehen."""
    if quelle == "bezirk_obb":
        nummer = re.search(r"^Nummer (\S+)", volltext, re.M)
        datum = re.search(r"^Datum \w+, (\d\d\.\d\d\.\d{4})", volltext, re.M)
        return (nummer.group(1) if nummer else None, datum.group(1) if datum else None)
    # SessionNet-Kopf: "Sitzung-Nr.: ... PLA/1/2026" und "Sitzungsdatum: ...
    # Dienstag, 27.01.2026". Eindeutig, deshalb zuerst.
    kopf = volltext[:1500]
    nummer = re.search(r"Sitzung-Nr\.:[^\n]*\n[^\n]*?(\S+/\d+/\d{4})\s*$", kopf, re.M)
    datum = re.search(r"Sitzungsdatum:[^\n]*\n\s*\w+, (\d\d\.\d\d\.\d{4})", kopf)
    if datum:
        return (nummer.group(1) if nummer else None, datum.group(1))
    # Sonst die Seitenfuesse. Nur ein eindeutiges Datum zaehlt — bei
    # mehreren gleich haeufigen wird nicht geraten (vorher entschied dort
    # die Mengen-Reihenfolge, also der Zufall).
    daten = re.findall(r"Niederschrift Sitzung .{0,120}? am (\d\d\.\d\d\.\d{4})", volltext)
    if not daten:
        return (nummer.group(1) if nummer else None, None)
    zaehlung = collections.Counter(daten).most_common()
    if len(zaehlung) > 1 and zaehlung[0][1] == zaehlung[1][1]:
        return (None, "mehrdeutig")
    return (nummer.group(1) if nummer else None, zaehlung[0][0])


def volltext_lesen(pfad):
    """pdfplumber braucht fuer 170 Protokolle rund drei Minuten — der Text
    wird deshalb neben dem PDF zwischengespeichert."""
    txt = pfad[:-4] + ".txt"
    if os.path.exists(txt) and os.path.getmtime(txt) >= os.path.getmtime(pfad):
        with open(txt, encoding="utf-8") as f:
            return f.read()
    with pdfplumber.open(pfad) as pdf:
        volltext = "\n".join((seite.extract_text() or "") for seite in pdf.pages)
    with open(txt, "w", encoding="utf-8") as f:
        f.write(volltext)
    return volltext


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
    zuordnung = {}          # Sitzungs-URL -> Protokoll-URL (geprueft)
    zaehler = {"weg1": 0, "weg2": 0, "weg3": 0, "mehrdeutig": 0, "keine_formel": 0,
               "vertagt": 0, "falsche_sitzung": 0, "umgehaengt": 0}
    pdfs_gelesen = 0

    je_kennung = {
        (s.get("quelle", "stadt"), s["kennung"]): s for s in roh["sitzungen"]
    }

    for angehaengt_an in roh["sitzungen"]:
        url = niederschrift_url(angehaengt_an)
        if not url:
            continue
        quelle = angehaengt_an.get("quelle", "stadt")

        pfad = hole_pdf(url, f"{angehaengt_an['kennung']} {angehaengt_an['datum_anzeige']}", cache=cache)
        if not pfad:
            continue
        pdfs_gelesen += 1
        volltext = volltext_lesen(pfad)

        # Zu welcher Sitzung gehoert das Protokoll wirklich? (Vor dem
        # Entfernen der Seitenfuesse — dort steht das Datum.)
        nummer, datum = protokoll_kennung(volltext, quelle)
        if quelle == "bezirk_obb":
            volltext = OBB_KOPFZEILE.sub("\n", volltext)
        else:
            # Seitenfuesse mitten im Beschlusstext ("Niederschrift Sitzung des
            # Stadtrates am ... - 51 -") raus, bevor gesucht wird.
            volltext = SEITENFUSS.sub("", volltext)
        sitzung = angehaengt_an
        if nummer and nummer != angehaengt_an["kennung"]:
            sitzung = je_kennung.get((quelle, nummer))
            zaehler["umgehaengt"] += 1
            if not sitzung:
                continue   # die richtige Sitzung liegt nicht in den Rohdaten
        if datum and datum != sitzung["datum_anzeige"]:
            zaehler["falsche_sitzung"] += 1
            continue       # nicht zuordenbar — lieber kein Link als ein falscher
        zuordnung[sitzung["url"]] = url

        bare_pos = bare_positionen(sitzung)
        kandidaten = [
            t for t in sitzung["tops"]
            if t["oeffentlich"] and not t["verfahren"] and t.get("vorlage")
        ]
        if not kandidaten:
            continue

        if quelle == "bezirk_obb":
            for nr, ergebnis in obb_beschluesse(volltext, sitzung).items():
                top = next(t for t in kandidaten if t["nr"] == nr) if any(t["nr"] == nr for t in kandidaten) else None
                if top:
                    beschluesse[top_ref(quelle, sitzung, top, bare_pos)] = ergebnis
                    zaehler["weg3"] += 1
            continue

        bloecke = bloecke_nach_vorlage(volltext)
        for top in kandidaten:
            ergebnis = beschluss_aus_text(volltext, top["vorlage"])
            if ergebnis is not None:
                ergebnis["weg"] = "abstimmung"
                ergebnis["empfehlung"] = ist_empfehlung(ergebnis["text"])
                zaehler["weg1"] += 1
            else:
                eigene = bloecke.get(top["vorlage"], [])
                if len(eigene) != 1:
                    zaehler["mehrdeutig"] += 1
                    continue
                if STAND_WEG.search(eigene[0]) and not FORMEL_ZEILE.search(eigene[0]):
                    zaehler["vertagt"] += 1
                    continue
                ergebnis = ergebnis_aus_block(eigene[0], top["vorlage"])
                if ergebnis is None:
                    zaehler["keine_formel"] += 1
                    continue
                zaehler["weg2"] += 1
            beschluesse[top_ref(quelle, sitzung, top, bare_pos)] = ergebnis

    print(f"\n{pdfs_gelesen} Niederschriften gelesen")
    print(f"  {len(beschluesse)} Beschlüsse gefunden "
          f"(Abstimmungszeile {zaehler['weg1']}, Vorlage-Block {zaehler['weg2']}, "
          f"Bezirk Oberbayern {zaehler['weg3']})")
    print(f"  davon Empfehlungen an den Stadtrat: "
          f"{sum(1 for b in beschluesse.values() if b.get('empfehlung'))}")
    print(f"  {zaehler['mehrdeutig']} Vorlagen ohne eindeutigen Block (übersprungen)")
    print(f"  {zaehler['keine_formel']} mit Block, aber ohne genau eine Abstimmungsformel")
    print(f"  {zaehler['vertagt']} vertagt/abgesetzt")
    print(f"  {zaehler['umgehaengt']} Protokolle hingen an der falschen Sitzung (umgehängt), "
          f"{zaehler['falsche_sitzung']} nicht zuordenbar (Datum passt nicht)")

    ziel = os.path.join(DATEN_VZ, "niederschriften.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(zuordnung, f, ensure_ascii=False, indent=2)
    print(f"Geschrieben: {ziel}")

    ziel = os.path.join(DATEN_VZ, "beschluesse.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(beschluesse, f, ensure_ascii=False, indent=2)
    print(f"\nGeschrieben: {ziel}")


if __name__ == "__main__":
    main()
