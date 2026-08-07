#!/usr/bin/env python3
"""
Prueft die Daten auf Zusagen, die die Seite gegenueber Leserinnen macht.

Kein Testrahmen, keine Abhaengigkeiten: ein Lauf, eine Liste, ein Exit-Code.

    python3 pruefen.py            # alles pruefen
    python3 pruefen.py --streng   # Warnungen wie Fehler behandeln

Hintergrund: Die teuersten Fehler in diesem Projekt waren keine Abstuerze,
sondern stilles Verschwinden. Ein Filter, der mehr weglaesst als gedacht.
Eine Zusammenfassung, die die bessere Fassung verwirft. Beides faellt beim
Draufschauen nicht auf, weil das Ergebnis plausibel aussieht — es ist nur
unvollstaendig. Dagegen helfen Zusicherungen, die nachrechnen.
"""

import argparse
import collections
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

sys.path.insert(0, HIER)
from entwuerfe_bauen import ist_beteiligung, ist_sammelueberschrift  # noqa: E402

fehler, warnungen = [], []


def fehlt(text):
    fehler.append(text)


def warnt(text):
    warnungen.append(text)


def lade(name):
    with open(os.path.join(DATEN_VZ, name), encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------- Zusicherungen

def p_referenzen(kur, index):
    """Jeder Kurationseintrag muss einen Tagesordnungspunkt haben."""
    tot = [r for r in kur if r not in index]
    if tot:
        fehlt(f"{len(tot)} Kurationseintraege zeigen ins Leere: {tot[:5]}")


def p_kein_verlust(kur, feed):
    """
    Kein ausgearbeiteter Text darf aus dem Feed verschwinden.

    Genau das ist passiert, als die Themen-Buendelung die zuerst eingetragene
    Fassung behielt: Die Leichte-Sprache-Fassung war weg, ohne Meldung.
    """
    im_feed = {e["ref"] for e in feed}
    themen = {e["thema"] for e in feed}
    for ref, k in kur.items():
        if ref in im_feed or not k.get("klartext_leicht"):
            continue
        # Darf fehlen, wenn das Thema durch einen anderen Eintrag vertreten ist
        # UND dieser ebenfalls Leichte Sprache hat.
        vertreter = [e for e in feed if e["ref"] != ref and e["thema"] in themen
                     and e.get("klartext_leicht")]
        if not vertreter:
            fehlt(f"Leichte-Sprache-Fassung verschwunden: {ref}")


def p_keine_doppelten_themen(feed):
    """Ein Thema, eine Karte."""
    zaehler = collections.Counter(e["thema"] for e in feed)
    mehrfach = [t for t, n in zaehler.items() if n > 1]
    if mehrfach:
        fehlt(f"{len(mehrfach)} Themen erscheinen mehrfach: {mehrfach[:5]}")


def p_achsenwerte(kur, achsen):
    """Nur Werte, die die Oberflaeche auch als Filter anbietet."""
    for achse in ("lebenslage", "bezirk", "anlass"):
        erlaubt = set(achsen[achse])
        for ref, k in kur.items():
            unbekannt = set(k.get(achse, [])) - erlaubt
            if unbekannt:
                fehlt(f"{ref}: unbekannte {achse}-Werte {sorted(unbekannt)}")


def p_pflichtfelder(kur):
    for ref, k in kur.items():
        if not k.get("klartext_titel", "").strip():
            fehlt(f"{ref}: klartext_titel ist leer")
        if k.get("klartext_leicht") and not k.get("klartext_titel_leicht"):
            warnt(f"{ref}: leichter Text ohne leichten Titel")


BEHAUPTET_BESCHLUSS = re.compile(
    r"\b(hat beschlossen|wurde beschlossen|ist beschlossen|"
    r"hat entschieden|wurde entschieden|beschloss)\b", re.I
)


def p_kein_behaupteter_beschluss(kur):
    """
    Die Quelle belegt nur, dass beraten wurde — nicht, wie entschieden wurde.
    Ein Text, der ein Ergebnis behauptet, geht ueber die Daten hinaus.
    """
    for ref, k in kur.items():
        for feld in ("klartext", "klartext_leicht"):
            treffer = BEHAUPTET_BESCHLUSS.search(k.get(feld) or "")
            if treffer:
                fehlt(f"{ref}: {feld} behauptet ein Ergebnis ({treffer.group(0)!r})")


def p_leichte_sprache(kur, grenze=14):
    """Satzlaenge ist das eine Merkmal, das sich maschinell pruefen laesst."""
    for ref, k in kur.items():
        text = k.get("klartext_leicht") or ""
        for satz in filter(None, (s.strip() for s in re.split(r"[.!?]", text))):
            n = len(satz.split())
            if n > grenze:
                warnt(f"{ref}: Satz mit {n} Woertern (Leichte Sprache) — {satz[:52]}…")


def p_abdeckung(roh, feed):
    """
    Jeder Sachpunkt ist entweder im Feed oder aus einem benannten Grund
    nicht drin. 'Faellt einfach weg' darf es nicht geben.
    """
    gruende = collections.Counter()
    im_feed_refs = {e["ref"] for e in feed}
    im_feed_themen = {e["thema"] for e in feed}
    sys.path.insert(0, HIER)
    from feed_bauen import thema_schluessel

    for s in roh["sitzungen"]:
        q = s.get("quelle", "stadt")
        for t in s["tops"]:
            ref = f'{q}:{s["id"]}#{t["nr"]}'
            schluessel = thema_schluessel(q, t) or ref
            if ref in im_feed_refs or schluessel in im_feed_themen:
                gruende["im Feed"] += 1
            elif not t["oeffentlich"]:
                gruende["nicht oeffentlich"] += 1
            elif t["verfahren"]:
                gruende["Sitzungsroutine"] += 1
            elif ist_beteiligung(s["gremium"]):
                gruende["Aufsichtsrat/Zweckverband"] += 1
            elif len(t["titel"]) < 12:
                gruende["Titel zu kurz"] += 1
            elif ist_sammelueberschrift(t["titel"]):
                gruende["Sammelueberschrift"] += 1
            else:
                gruende["NOCH NICHT AUFBEREITET"] += 1
    return gruende


# ------------------------------------------------------------------- Ablauf

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--streng", action="store_true",
                    help="Warnungen wie Fehler behandeln")
    args = ap.parse_args()

    roh = lade("rohdaten.json")
    kuration = lade("kuration.json")
    feed = lade("feed.json")
    kur = kuration["eintraege"]

    index = {}
    for s in roh["sitzungen"]:
        q = s.get("quelle", "stadt")
        for t in s["tops"]:
            index[f'{q}:{s["id"]}#{t["nr"]}'] = (s, t)

    p_referenzen(kur, index)
    p_kein_verlust(kur, feed["eintraege"])
    p_keine_doppelten_themen(feed["eintraege"])
    p_achsenwerte(kur, kuration["_achsen"])
    p_pflichtfelder(kur)
    p_kein_behaupteter_beschluss(kur)
    p_leichte_sprache(kur)
    gruende = p_abdeckung(roh, feed["eintraege"])

    print("Abdeckung aller Tagesordnungspunkte")
    for grund, n in gruende.most_common():
        print(f"  {n:5}  {grund}")
    print(f"  {sum(gruende.values()):5}  gesamt\n")

    for w in warnungen:
        print(f"  warnung: {w}")
    for f in fehler:
        print(f"  FEHLER : {f}")

    print()
    if fehler:
        print(f"{len(fehler)} Fehler, {len(warnungen)} Warnungen — nicht in Ordnung.")
        return 1
    if warnungen and args.streng:
        print(f"{len(warnungen)} Warnungen, --streng — nicht in Ordnung.")
        return 1
    print(f"Alles in Ordnung ({len(warnungen)} Warnungen).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
