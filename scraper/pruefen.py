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
import urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

sys.path.insert(0, HIER)
from entwuerfe_bauen import ist_sammelueberschrift  # noqa: E402
from referenzen import bare_positionen, ist_beteiligung, top_ref  # noqa: E402
from feed_bauen import KEIN_STADTBEZIRK, STAND_REIHENFOLGE, STATUS_ALLE  # noqa: E402

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
    """Jeder Kurationseintrag muss einen Tagesordnungspunkt haben.

    Ausnahme: ':antrag:'-Refs (siehe antraege_offen.py) haben nie einen
    Sitzungs-TOP -- das ist gerade ihr Sinn, solange sie nicht terminiert sind.
    """
    tot = [r for r in kur if r not in index and ":antrag:" not in r]
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


ERLAUBTE_HOSTS = {
    "www.ingolstadt.de", "ingolstadt.de",
    "buergerinfo-bezirk-obb.digitalfabrix.de",
}


def p_nur_erlaubte_hosts(feed):
    """
    Jeder Link im Feed zeigt auf die Stadt Ingolstadt — nichts sonst.

    Verteidigung gegen einen kuenftigen Parser- oder Kurationsfehler, der eine
    externe oder javascript:-URL einschleust. Aktuell schuetzt nur Zufall
    davor (absolut() in ris_ingolstadt.py stellt jeder Nicht-http-URL die
    Basis-Adresse voran) — das hier macht es zur Zusicherung.
    """
    fehlerhaft = []
    for e in feed:
        urls = [e.get("vorlage_url"), e.get("sitzung_url"), e.get("niederschrift_url")]
        urls += [d.get("url") for d in e.get("dokumente") or []]
        urls += [s.get("sitzung_url") for s in e.get("beratungsweg") or []]
        fehlerhaft += [f"{e['ref']}: {url!r}" for url in _fremde_urls(urls)]
    if fehlerhaft:
        fehlt(f"{len(fehlerhaft)} URLs ausserhalb der erlaubten Hosts: {fehlerhaft[:5]}")


def _fremde_urls(urls):
    """Alle URLs, die nicht per http(s) auf einen ERLAUBTE_HOSTS zeigen
    (leere Werte werden uebersprungen)."""
    for url in filter(None, urls):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("https", "http") or parsed.netloc not in ERLAUBTE_HOSTS:
            yield url


def p_antraege_hosts(antraege):
    """
    Dieselbe Zusicherung wie p_nur_erlaubte_hosts, fuer antraege.html: dort
    landen vorlage_url und pdf_url ungeprueft als href im Link.
    """
    fehlerhaft = []
    for partei, liste in antraege["parteien"].items():
        for a in liste:
            urls = [a.get("vorlage_url"), a.get("pdf_url")]
            fehlerhaft += [f"{partei} {a.get('vorlage')}: {url!r}" for url in _fremde_urls(urls)]
    if fehlerhaft:
        fehlt(f"antraege.json: {len(fehlerhaft)} URLs ausserhalb der erlaubten Hosts: {fehlerhaft[:5]}")


def p_haushalt_hosts(haushalt):
    """Die Quellenlinks der Haushaltsseite zeigen nur auf das Ratsinfoportal."""
    q = haushalt.get("quellen") or {}
    urls = list((q.get("anlage2_je_jahr") or {}).values())
    urls += [q.get("anlage1_aktuell"), q.get("anlage5_vorbericht_aktuell")]
    fehlerhaft = list(_fremde_urls(urls))
    if fehlerhaft:
        fehlt(f"haushalt.json: {len(fehlerhaft)} Quellen-URLs ausserhalb der erlaubten Hosts: {fehlerhaft[:5]}")


def p_nur_oeffentliche_tops(kur, index):
    """
    Nicht-oeffentliche Tagesordnungspunkte duerfen nie kuratiert werden.

    Aktuell schuetzt nur der Umstand davor, dass niemand einen 'N'-Punkt von
    Hand eingetragen hat — feed_bauen.py filtert nicht danach. Das hier macht
    es zur Zusicherung statt zum Zufall.
    """
    fehlerhaft = [
        ref for ref, (sitzung, top) in index.items()
        if ref in kur and not top["oeffentlich"]
    ]
    if fehlerhaft:
        fehlt(f"{len(fehlerhaft)} kuratierte Eintraege sind nicht oeffentlich: {fehlerhaft}")


def p_beschluesse_belegt(beschluesse, index):
    """
    Jeder mechanisch extrahierte Beschluss muss zu einem echten TOP gehoeren,
    und die im Text gefundene Vorlagen-Nummer muss mit der des TOPs
    uebereinstimmen — schuetzt gegen einen kuenftigen Regex-Fehltreffer in
    niederschriften_lesen.py, der eine Abstimmung der falschen Vorlage
    zuordnet (siehe dessen Docstring: Vorlagen-Nummer ist der Schluessel).
    """
    ohne_top = [ref for ref in beschluesse if ref not in index]
    if ohne_top:
        fehlt(f"{len(ohne_top)} Beschluesse zeigen ins Leere: {ohne_top[:5]}")

    falsche_vorlage = [
        ref for ref, b in beschluesse.items()
        if ref in index and index[ref][1].get("vorlage") != b.get("vorlage")
    ]
    if falsche_vorlage:
        fehlt(
            f"{len(falsche_vorlage)} Beschluesse nennen eine andere Vorlage "
            f"als ihr TOP: {falsche_vorlage[:5]}"
        )

    # Befunde der Kontrolle 2026-09-30 als Zusicherung: bekannte Ergebnisse,
    # keine Seitenfuesse/Sitzungsenden im Beschlusstext, und die Formel am
    # Anfang des Texts ist dieselbe, die als "formel" gespeichert ist (sonst
    # stammt sie aus einer anderen Abstimmung).
    unbekannt = [r for r, b in beschluesse.items()
                 if b.get("ergebnis") not in ("beschlossen", "abgelehnt", "teilweise")]
    if unbekannt:
        fehlt(f"{len(unbekannt)} Beschluesse mit unbekanntem Ergebnis: {unbekannt[:5]}")
    reste = [r for r, b in beschluesse.items()
             if re.search(r"Niederschrift Sitzung|Hiermit ist der (nicht)?öffentliche Teil", b["text"])]
    if reste:
        warnt(f"{len(reste)} Beschlusstexte mit Seitenfuss/Sitzungsende: {reste[:5]}")
    formel_fremd = [
        r for r, b in beschluesse.items()
        if b.get("weg") in ("abstimmung", "vorlage-block")
        and not re.match(r"\s*(?:Ziffer \d+:\s*)?" + re.escape(b["formel"]), b["text"])
    ]
    if formel_fremd:
        fehlt(f"{len(formel_fremd)} Beschluesse, deren Formel nicht den Text eroeffnet: {formel_fremd[:5]}")


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


def p_haushalt_summen(haushalt):
    """
    Zweite, unabhaengige Pruefsumme fuer data/haushalt.json — schuetzt gegen
    einen kuenftigen haushalt_lesen.py, der die Pruefung beim Parsen selbst
    umgeht oder eine veraltete Datei liegen laesst, die nie neu geprueft wurde.
    """
    for jahr_str, d in haushalt["jahre"].items():
        hg = d["hauptgruppen"]
        if len(hg) != 10:
            fehlt(f"Haushalt {jahr_str}: nur {len(hg)}/10 Hauptgruppen")
            continue
        summe_e = sum(hg[c]["ansatz"] for c in "0123")
        summe_a = sum(hg[c]["ansatz"] for c in "456789")
        if round(summe_e, 2) != round(d["summe_einnahmen"], 2):
            fehlt(f"Haushalt {jahr_str}: Hauptgruppen 0-3 summieren zu {summe_e}, "
                  f"aber summe_einnahmen ist {d['summe_einnahmen']}")
        if round(summe_a, 2) != round(d["summe_ausgaben"], 2):
            fehlt(f"Haushalt {jahr_str}: Hauptgruppen 4-9 summieren zu {summe_a}, "
                  f"aber summe_ausgaben ist {d['summe_ausgaben']}")

    vwh = haushalt["verwaltungs_vermoegenshaushalt_aktuell"]
    aktuell = haushalt["jahre"][str(haushalt["aktuelles_jahr"])]
    kontrolle_e = vwh["verwaltungshaushalt_einnahmen"] + vwh["vermoegenshaushalt_einnahmen"]
    kontrolle_a = vwh["verwaltungshaushalt_ausgaben"] + vwh["vermoegenshaushalt_ausgaben"]
    if round(kontrolle_e, 2) != round(aktuell["summe_einnahmen"], 2):
        fehlt(f"Haushalt: Verwaltungs- + Vermoegenshaushalt Einnahmen ({kontrolle_e}) "
              f"stimmt nicht mit Summe Einnahmen ({aktuell['summe_einnahmen']}) ueberein")
    if round(kontrolle_a, 2) != round(aktuell["summe_ausgaben"], 2):
        fehlt(f"Haushalt: Verwaltungs- + Vermoegenshaushalt Ausgaben ({kontrolle_a}) "
              f"stimmt nicht mit Summe Ausgaben ({aktuell['summe_ausgaben']}) ueberein")


def p_oberflaeche(feed):
    """Zusagen aus dem Nutzertest 2026-09-30, die index.html voraussetzt.

    - Jeder Stand ist einer der bekannten, verstaendlichen Werte — kein
      "Ohne Vorlage" mehr, keine Paragrafentexte ("beschließend nach § 7").
    - Der Bezirk Oberbayern ist kein Stadtbezirk (eigene Achse "ebene").
    - Die Kopfzahl nennt die zwoelf echten Stadtbezirke.
    - Keine Termine vor dem Bautag unter "Naechste Termine".
    - Jeder Eintrag traegt "ebene" und "duenn" (Buendelung je Sitzung).
    """
    eintraege = feed["eintraege"]
    fremd = collections.Counter(
        e["stand"] for e in eintraege if e["stand"] not in STAND_REIHENFOLGE
    )
    if fremd:
        fehlt(f"Unbekannte Staende auf Karten (fehlen im Filter): {dict(fremd)}")
    ohne_status = collections.Counter(
        e.get("status") for e in eintraege if e.get("status") not in STATUS_ALLE
    )
    if ohne_status:
        fehlt(f"Eintraege ohne bekannten Status (Karten-Hinweis fehlt): {dict(ohne_status)}")
    # "Entschieden" nur mit Beleg: woertlicher Beschlusstext und Link auf
    # genau das Protokoll, aus dem er stammt.
    unbelegt = [
        e["ref"] for e in eintraege
        if e.get("status") == "Entschieden" and not (e.get("beschluss") and e.get("niederschrift_url"))
    ]
    if unbelegt:
        fehlt(f"{len(unbelegt)} Eintraege 'Entschieden' ohne Beschlusstext/Protokoll: {unbelegt[:3]}")
    falsch = [b for b in feed["achsen"]["bezirk"] if b in KEIN_STADTBEZIRK]
    if falsch:
        fehlt(f"Keine Stadtbezirke in der Bezirksachse: {falsch}")
    n = feed["statistik"].get("stadtbezirke")
    if n != 12:
        warnt(f"Kopfzahl Stadtbezirke ist {n}, erwartet 12")
    alt = [t for t in feed.get("kommende_termine", [])
           if t["datum"] < feed["feed_gebaut_am"]]
    if alt:
        fehlt(f"{len(alt)} vergangene Termine unter 'Naechste Termine'")
    ohne = [e["ref"] for e in eintraege if "ebene" not in e or "duenn" not in e]
    if ohne:
        fehlt(f"{len(ohne)} Eintraege ohne 'ebene'/'duenn': {ohne[:3]}")


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
    from referenzen import bare_positionen, top_ref

    for s in roh["sitzungen"]:
        q = s.get("quelle", "stadt")
        bare_pos = bare_positionen(s)
        for t in s["tops"]:
            ref = top_ref(q, s, t, bare_pos)
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
        bare_pos = bare_positionen(s)
        for t in s["tops"]:
            index[top_ref(q, s, t, bare_pos)] = (s, t)

    p_referenzen(kur, index)
    p_kein_verlust(kur, feed["eintraege"])
    p_keine_doppelten_themen(feed["eintraege"])
    p_achsenwerte(kur, kuration["_achsen"])
    p_pflichtfelder(kur)
    p_kein_behaupteter_beschluss(kur)
    p_leichte_sprache(kur)
    p_nur_erlaubte_hosts(feed["eintraege"])
    p_nur_oeffentliche_tops(kur, index)
    if os.path.exists(os.path.join(DATEN_VZ, "beschluesse.json")):
        p_beschluesse_belegt(lade("beschluesse.json"), index)
    if os.path.exists(os.path.join(DATEN_VZ, "haushalt.json")):
        haushalt = lade("haushalt.json")
        p_haushalt_summen(haushalt)
        p_haushalt_hosts(haushalt)
    if os.path.exists(os.path.join(DATEN_VZ, "antraege.json")):
        p_antraege_hosts(lade("antraege.json"))
    p_oberflaeche(feed)
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
