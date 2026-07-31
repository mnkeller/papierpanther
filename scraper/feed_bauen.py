#!/usr/bin/env python3
"""
Fuehrt rohdaten.json (aus den Ratsinfoportalen) und kuration.json (Klartext,
Schlagworte) zu data/feed.json zusammen und setzt die Daten in index.html ein.

Verwendung:
    python3 feed_bauen.py

Leitet zusaetzlich den Bearbeitungsstand aus dem Beratungsweg ab. Wichtig:
Die Rolle einer Station in vo0053.php ist die *geplante* Rolle. "Entscheidung"
an einem vergangenen Datum belegt NICHT, dass der Beschluss gefasst wurde — er
kann vertagt worden sein. Deshalb heisst der Stand "Entscheidung angesetzt" und
nicht "entschieden".
"""

import collections
import json
import os
import re
import sys
from datetime import date

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

# Reihenfolge bestimmt die Sortierung der Filterachse "Stand"
STAND_REIHENFOLGE = [
    "Entscheidung geplant",
    "Wird noch beraten",
    "Entscheidung angesetzt",
    "Bekanntgabe",
    "Ohne Vorlage",
]


def lade(dateiname):
    pfad = os.path.join(DATEN_VZ, dateiname)
    if not os.path.exists(pfad):
        sys.exit(f"Fehlt: {pfad}\nZuerst ris_ingolstadt.py laufen lassen.")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def thema_schluessel(quelle, top):
    """
    Ein Thema, nicht ein Tagesordnungspunkt.

    Dieselbe Vorlage steht nacheinander in mehreren Gremien auf der
    Tagesordnung — der Schulcampus Nord-Ost etwa sechsmal: vier Ausschuesse
    zur Vorberatung, der Finanzausschuss, zuletzt der Stadtrat zur
    Entscheidung. Ueber zwei Jahre sind 1.079 Punkte nur 698 Themen.

    Deshalb gruppiert der Feed nach Vorlagennummer. Wer keine hat — alle
    BZA-Punkte und die muendlichen Berichte — bleibt fuer sich.
    """
    kvonr = re.search(r"__kvonr=(\d+)", top.get("vorlage_url") or "")
    if kvonr:
        return f"{quelle}:vorlage:{kvonr.group(1)}"
    return None


def leitstation(auftritte):
    """
    Welcher Auftritt vertritt das Thema?

    Die Entscheidungssitzung, wenn es eine gibt — dort faellt die Sache.
    Sonst der spaeteste Auftritt, weil der den aktuellen Stand zeigt.
    """
    mit_entscheidung = [
        (s, t) for s, t in auftritte
        if any(b["rolle"].startswith("Entscheidung") for b in t.get("beratungen") or [])
    ]
    kandidaten = mit_entscheidung or auftritte
    return max(kandidaten, key=lambda st: st[0]["datum"] or "")


def stand_ableiten(top, heute_iso):
    """Liefert (stand, datum_der_station) aus dem Beratungsweg."""
    beratungen = top.get("beratungen") or []

    if not top.get("vorlage"):
        # Muendliche Berichte und alle BZA-Punkte haben keine Vorlage.
        return "Ohne Vorlage", ""

    entscheidungen = [s for s in beratungen if "Entscheidung" in s["rolle"]]
    if entscheidungen:
        letzte = max(entscheidungen, key=lambda s: s["datum"])
        stand = (
            "Entscheidung angesetzt"
            if letzte["datum"] <= heute_iso
            else "Entscheidung geplant"
        )
        return stand, letzte["datum_anzeige"]

    vorberatungen = [s for s in beratungen if "Vorberatung" in s["rolle"]]
    if vorberatungen:
        return "Wird noch beraten", max(
            vorberatungen, key=lambda s: s["datum"]
        )["datum_anzeige"]

    bekanntgaben = [s for s in beratungen if "Bekanntgabe" in s["rolle"]]
    if bekanntgaben:
        return "Bekanntgabe", max(
            bekanntgaben, key=lambda s: s["datum"]
        )["datum_anzeige"]

    if beratungen:
        # Unbekannte Rolle (etwa "Anhoerung"): unveraendert durchreichen,
        # damit sie sichtbar wird statt als "Ohne Vorlage" zu verschwinden.
        letzte = max(beratungen, key=lambda s: s["datum"])
        return letzte["rolle"], letzte["datum_anzeige"]

    # Vorlage vorhanden, aber kein Beratungsweg gelesen (--ohne-beratungen)
    return "Ohne Vorlage", ""


def main():
    roh = lade("rohdaten.json")
    kuration = lade("kuration.json")
    eintraege_kuration = kuration["eintraege"]
    heute_iso = date.today().isoformat()

    # Index ueber alle Tagesordnungspunkte, Schluessel mit Quellen-Praefix
    index = {}
    for sitzung in roh["sitzungen"]:
        quelle = sitzung.get("quelle", "stadt")
        for top in sitzung["tops"]:
            index[f'{quelle}:{sitzung["id"]}#{top["nr"]}'] = (sitzung, top)

    # Alle Auftritte je Thema sammeln — auch die, die niemand kuratiert hat.
    # Sonst kennt die Karte nur die eine Sitzung, in der jemand zufaellig
    # kuratiert hat, statt den ganzen Weg der Vorlage.
    auftritte_je_thema = collections.defaultdict(list)
    for sitzung in roh["sitzungen"]:
        quelle = sitzung.get("quelle", "stadt")
        for top in sitzung["tops"]:
            schluessel = thema_schluessel(quelle, top)
            if schluessel:
                auftritte_je_thema[schluessel].append((sitzung, top))

    # Kuratierte Eintraege nach Thema buendeln. Sind mehrere Auftritte
    # derselben Vorlage kuratiert, gewinnt die vollstaendigere Fassung —
    # nicht die zufaellig zuerst eingetragene. Sonst verschwindet stillschweigend
    # eine Leichte-Sprache-Fassung, nur weil ein anderer Auftritt frueher
    # in der Datei steht.
    def guete(kur):
        return (
            0 if kur.get("entwurf", False) else 1,
            1 if kur.get("klartext_leicht") else 0,
            1 if kur.get("klartext") else 0,
            len(kur.get("lebenslage", [])) + len(kur.get("anlass", [])),
        )

    je_thema = collections.OrderedDict()
    fehlend = []
    doppelt = []
    for ref, kur in eintraege_kuration.items():
        if ref not in index:
            fehlend.append(ref)
            continue
        sitzung, top = index[ref]
        schluessel = thema_schluessel(sitzung.get("quelle", "stadt"), top) or ref
        if schluessel in je_thema:
            alt_ref, alt_kur = je_thema[schluessel]
            if guete(kur) <= guete(alt_kur):
                doppelt.append((schluessel, ref))
                continue
            doppelt.append((schluessel, alt_ref))
        je_thema[schluessel] = (ref, kur)

    feed = []
    for schluessel, (ref, kur) in je_thema.items():
        sitzung, top = index[ref]
        # Die Karte haengt an der Leitstation, nicht an der kuratierten Sitzung
        alle = auftritte_je_thema.get(schluessel) or [(sitzung, top)]
        sitzung, top = leitstation(alle)
        stand, stand_datum = stand_ableiten(top, heute_iso)

        stationen = sorted(
            (
                {
                    "datum": s["datum"],
                    "datum_anzeige": s["datum_anzeige"],
                    "gremium": s["gremium"],
                    "top_nr": t["nr"],
                    "sitzung_url": s["url"],
                }
                for s, t in alle
            ),
            key=lambda x: x["datum"] or "",
        )

        feed.append(
            {
                "ref": ref,
                "thema": schluessel,
                "auftritte": stationen,
                "klartext_titel": kur["klartext_titel"],
                "klartext": kur["klartext"],
                # Leichte Sprache, optional. Leer heisst: fuer diesen Eintrag
                # liegt noch keine Fassung vor — die Oberflaeche faellt dann
                # sichtbar auf die normale Fassung zurueck, statt zu raten.
                "klartext_titel_leicht": kur.get("klartext_titel_leicht", ""),
                "klartext_leicht": kur.get("klartext_leicht", ""),
                "lebenslage": kur.get("lebenslage", []),
                "bezirk": kur.get("bezirk", []),
                "anlass": kur.get("anlass", []),
                "ort": kur.get("ort", []),          # freier Vermerk, kein Filter
                "entwurf": kur.get("entwurf", False),
                # --- abgeleitet ---
                "stand": stand,
                "stand_datum": stand_datum,
                # --- unveraenderte Angaben aus der Quelle ---
                "quelle": sitzung.get("quelle", "stadt"),
                "amtlicher_titel": top["titel"],
                "top_nr": top["nr"],
                "vorlage": top["vorlage"],
                "vorlage_url": top["vorlage_url"],
                "antragsteller": top.get("antragsteller", ""),
                "gremium": sitzung["gremium"],
                "sitzung_kennung": sitzung["kennung"],
                "datum": sitzung["datum"],
                "datum_anzeige": sitzung["datum_anzeige"],
                "sitzung_url": sitzung["url"],
                "dokumente": top["dokumente"],
                "beratungsweg": top.get("beratungen") or [],
            }
        )

    feed.sort(key=lambda e: e["datum"], reverse=True)

    def achse(name):
        werte = []
        for eintrag in feed:
            for wert in eintrag[name]:
                if wert not in werte:
                    werte.append(wert)
        return sorted(werte)

    # Bezirksachse in amtlicher Reihenfolge, nicht alphabetisch
    bezirk_ordnung = kuration.get("_achsen", {}).get("bezirk", [])
    vorhanden = {w for e in feed for w in e["bezirk"]}
    bezirke = [b for b in bezirk_ordnung if b in vorhanden]
    bezirke += sorted(vorhanden - set(bezirke))

    staende = [s for s in STAND_REIHENFOLGE if any(e["stand"] == s for e in feed)]

    stand_verteilung = {}
    for e in feed:
        stand_verteilung[e["stand"]] = stand_verteilung.get(e["stand"], 0) + 1

    ausgabe = {
        "stadt": "Ingolstadt",
        "quellen": roh["quellen"],
        "hinweis": roh.get("hinweis", ""),
        "daten_abgerufen_am": roh["abgerufen_am"],
        "feed_gebaut_am": date.today().isoformat(),
        "zeitraum": roh["zeitraum"],
        "statistik": {
            "sitzungen_ausgelesen": roh["anzahl_sitzungen"],
            "tops_ausgelesen": roh["anzahl_tops"],
            "tops_verfahren": roh.get("anzahl_verfahren", 0),
            "tops_kuratiert": len(feed),
            "entwuerfe": sum(1 for e in feed if e["entwurf"]),
            "leichte_sprache": sum(1 for e in feed if e["klartext_leicht"]),
            "je_quelle": {
                k: sum(1 for e in feed if e["quelle"] == k) for k in roh["quellen"]
            },
            "stand": stand_verteilung,
        },
        "achsen": {
            "lebenslage": achse("lebenslage"),
            "bezirk": bezirke,
            "anlass": achse("anlass"),
            "stand": staende,
        },
        "eintraege": feed,
    }

    ziel = os.path.join(DATEN_VZ, "feed.json")
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(ausgabe, f, ensure_ascii=False, indent=2)
    print(f"Geschrieben: {ziel}")

    # Die Daten liegen als eigene Skriptdatei neben der Seite, nicht mehr in ihr.
    # Bewusst .js mit window.FEED statt .json per fetch(): ein klassisches
    # <script src> laedt auch ueber file://, fetch() nicht. Damit laesst sich
    # index.html weiterhin per Doppelklick oeffnen, ohne Webserver.
    js_pfad = os.path.join(DATEN_VZ, "feed.js")
    with open(js_pfad, "w", encoding="utf-8") as f:
        f.write("/* Automatisch erzeugt von scraper/feed_bauen.py — nicht haendisch aendern. */\n")
        f.write("window.FEED = " + json.dumps(ausgabe, ensure_ascii=False) + ";\n")
    print(f"Geschrieben: {js_pfad} ({os.path.getsize(js_pfad) // 1024} KB)")

    st = ausgabe["statistik"]
    print(
        f"  {st['tops_kuratiert']} aufbereitete Eintraege "
        f"von {st['tops_ausgelesen']} TOPs "
        f"({st['tops_verfahren']} davon Sitzungsroutine), "
        f"{st['entwuerfe']} noch Entwurf"
    )
    print(f"  je Quelle: {st['je_quelle']}")
    print(f"  Stand:     {st['stand']}")
    print(
        f"  Achsen: {len(ausgabe['achsen']['lebenslage'])} Lebenslagen, "
        f"{len(ausgabe['achsen']['bezirk'])} Bezirke, "
        f"{len(ausgabe['achsen']['anlass'])} Anlaesse, "
        f"{len(ausgabe['achsen']['stand'])} Staende"
    )

    mehrfach = sum(1 for e in feed if len(e["auftritte"]) > 1)
    print(
        f"  Themen: {len(feed)} Karten aus {len(eintraege_kuration)} "
        f"Kurationseintraegen; {mehrfach} Themen liefen durch mehrere Gremien"
    )

    if fehlend:
        print(f"\n  ! {len(fehlend)} Kurationseintraege ohne Rohdaten-TOP:")
        for ref in fehlend:
            print(f"    - {ref}")

    if doppelt:
        print(
            f"\n  {len(doppelt)} Kurationseintraege betreffen ein bereits "
            f"erfasstes Thema und wurden zusammengefasst:"
        )
        for schluessel, verworfen in doppelt:
            print(f"    - {verworfen}  ({schluessel})")

    ohne_bezirk = [e["ref"] for e in feed if not e["bezirk"]]
    if ohne_bezirk:
        print(
            f"\n  {len(ohne_bezirk)} Eintraege ohne Stadtbezirk "
            f"(von Hand zuordnen in kuration.json):"
        )
        for ref in ohne_bezirk:
            print(f"    - {ref}")

    unkuratiert = [
        ref
        for ref, (_, top) in index.items()
        if ref not in eintraege_kuration and top["oeffentlich"] and not top["verfahren"]
    ]
    print(
        f"\n  {len(unkuratiert)} oeffentliche TOPs sind noch nicht aufbereitet "
        f"— 'python3 entwuerfe_bauen.py' erzeugt Vorschlaege dafuer."
    )


if __name__ == "__main__":
    main()
