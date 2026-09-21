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

sys.path.insert(0, HIER)
from entwuerfe_bauen import ist_sammelueberschrift  # noqa: E402
from referenzen import bare_positionen, ist_beteiligung, top_ref  # noqa: E402

# Reihenfolge bestimmt die Sortierung der Filterachse "Stand"
STAND_REIHENFOLGE = [
    "Noch nicht terminiert",  # siehe antraege_offen.py — noch keiner Sitzung zugeteilt
    "Entscheidung geplant",
    "Wird noch beraten",
    "Entscheidung angesetzt",
    "Beschlossen",   # aus scraper/niederschriften_lesen.py::beschluesse.json
    "Abgelehnt",     # — der Nachfolgezustand von "Entscheidung angesetzt"
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

    # Mechanisch aus Niederschriften extrahiert (scraper/niederschriften_lesen.py),
    # bewusst getrennt von kuration.json — siehe pruefen.py::
    # p_kein_behaupteter_beschluss. Optional: die Datei existiert erst, wenn
    # niederschriften_lesen.py einmal gelaufen ist.
    beschluesse_pfad = os.path.join(DATEN_VZ, "beschluesse.json")
    beschluesse = {}
    if os.path.exists(beschluesse_pfad):
        with open(beschluesse_pfad, encoding="utf-8") as f:
            beschluesse = json.load(f)

    # Index ueber alle Tagesordnungspunkte, Schluessel mit Quellen-Praefix.
    # top_ref() loest dabei blosse "Ö"-TOPs (Aenderungsantraege, "hierzu"-
    # Stellungnahmen) ueber ihre Position auf, siehe referenzen.py — sonst
    # ueberschreiben sich mehrere davon in derselben Sitzung gegenseitig.
    index = {}
    for sitzung in roh["sitzungen"]:
        quelle = sitzung.get("quelle", "stadt")
        bare_pos = bare_positionen(sitzung)
        for top in sitzung["tops"]:
            index[top_ref(quelle, sitzung, top, bare_pos)] = (sitzung, top)

    # Alle Auftritte je Thema sammeln — auch die, die niemand kuratiert hat.
    # Sonst kennt die Karte nur die eine Sitzung, in der jemand zufaellig
    # kuratiert hat, statt den ganzen Weg der Vorlage.
    # Niederschriften je Sitzung. Sie sind der einzige oeffentliche Beleg
    # dafuer, wie tatsaechlich entschieden wurde — die Tagesordnung sagt nur,
    # worueber beraten werden sollte. Sie erscheinen erst nach Genehmigung in
    # der Folgesitzung, also mit rund 4 bis 8 Wochen Verzug.
    niederschrift_je_sitzung = {}
    for sitzung in roh["sitzungen"]:
        for dokument in sitzung.get("dokumente", []):
            if re.search(r"niederschrift", dokument["titel"], re.I):
                niederschrift_je_sitzung[sitzung["url"]] = dokument["url"]
                break

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
        if ":antrag:" in ref:
            continue  # eigener Pfad weiter unten — hat keinen Sitzungs-TOP
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

        # Liegt ein aus der Niederschrift extrahierter Beschluss zu genau
        # dieser Station vor, ersetzt er den abgeleiteten Stand — er ist die
        # eigentliche Beobachtung, "Entscheidung angesetzt" nur die Vermutung
        # aus dem Beratungsweg davor.
        beschluss_ref = top_ref(
            sitzung.get("quelle", "stadt"), sitzung, top, bare_positionen(sitzung)
        )
        beschluss = beschluesse.get(beschluss_ref)
        if beschluss:
            stand = "Beschlossen" if beschluss["ergebnis"] == "beschlossen" else "Abgelehnt"
            stand_datum = sitzung["datum_anzeige"]

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

        # Beleg fuer das Ergebnis: die Niederschrift der Sitzung, in der die
        # Entscheidung angesetzt war. Fehlt sie, ist das keine Luecke im
        # Datensatz, sondern der uebliche Verzug — die Oberflaeche sagt das.
        niederschrift = niederschrift_je_sitzung.get(sitzung["url"], "")

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
                "niederschrift_url": niederschrift,
                # Wörtlicher Beschlusstext, nur wenn beschluss_ref oben einen
                # Treffer hatte — siehe niederschriften_lesen.py.
                "beschluss": (
                    {"formel": beschluss["formel"], "text": beschluss["text"]}
                    if beschluss else None
                ),
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

    # Offene Stadtratsantraege ohne Sitzungstermin (siehe antraege_offen.py).
    # Eigener, einfacherer Pfad statt durch thema_schluessel()/leitstation():
    # ohne Sitzung gibt es weder einen Beratungsweg zum Gruppieren noch eine
    # "Leitstation", von der sich Datum oder Gremium ableiten liessen.
    offene_antraege_pfad = os.path.join(DATEN_VZ, "offene_antraege.json")
    if os.path.exists(offene_antraege_pfad):
        with open(offene_antraege_pfad, encoding="utf-8") as f:
            offene_antraege = json.load(f)["antraege"]
    else:
        offene_antraege = []

    bekannte_kvonr = {
        m.group(1)
        for sitzung in roh["sitzungen"]
        for top in sitzung["tops"]
        for m in [re.search(r"__kvonr=(\d+)", top.get("vorlage_url") or "")]
        if m
    }
    for antrag in offene_antraege:
        if antrag["kvonr"] in bekannte_kvonr:
            continue  # inzwischen terminiert, antraege_offen.py nur noch nicht neu gelaufen
        ref = f"{antrag['quelle']}:antrag:{antrag['kvonr']}"
        kur = eintraege_kuration.get(ref)
        if not kur:
            continue  # noch nicht mal ein Entwurf -- entwuerfe_bauen.py erst laufen lassen
        gremium = (
            f"Antrag an {antrag['ziel_gremium']}" if antrag["ziel_gremium"]
            else "Antrag, Gremium noch offen"
        )
        feed.append(
            {
                "ref": ref,
                "thema": ref,
                "auftritte": [],
                "klartext_titel": kur["klartext_titel"],
                "klartext": kur["klartext"],
                "klartext_titel_leicht": kur.get("klartext_titel_leicht", ""),
                "klartext_leicht": kur.get("klartext_leicht", ""),
                "lebenslage": kur.get("lebenslage", []),
                "bezirk": kur.get("bezirk", []),
                "anlass": kur.get("anlass", []),
                "ort": kur.get("ort", []),
                "entwurf": kur.get("entwurf", False),
                # --- abgeleitet ---
                "stand": "Noch nicht terminiert",
                "stand_datum": "",
                "niederschrift_url": "",
                "beschluss": None,
                # --- unveraenderte Angaben aus der Quelle ---
                "quelle": antrag["quelle"],
                "amtlicher_titel": antrag["titel"],
                "top_nr": "",
                "vorlage": antrag["vorlage"],
                "vorlage_url": antrag["vorlage_url"],
                "antragsteller": antrag["antragsteller"],
                "gremium": gremium,
                "sitzung_kennung": "",
                "datum": antrag["antragsdatum"],
                "datum_anzeige": antrag["antragsdatum_anzeige"],
                # Ohne Sitzung ist die Vorlage selbst die Quelle.
                "sitzung_url": antrag["vorlage_url"],
                "dokumente": antrag["dokumente"],
                "beratungsweg": [],
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

    # Abdeckung ehrlich ausweisen: "1712 Themen" ist nicht dieselbe Zahl wie
    # "1712 Tagesordnungspunkte" — dieselbe Vorlage laeuft oft durch mehrere
    # Gremien (siehe thema_schluessel oben). Die Fusszeile soll die tatsaechliche
    # TOP-Abdeckung nennen, nicht die kleinere Themenzahl, und alle Gruende fuer
    # die Luecke nennen statt nur "Sitzungsroutine" — siehe pruefen.py::p_abdeckung,
    # dieselbe Zaehlung (TOP-fuer-TOP ueber die Rohdaten, nicht ueber die
    # "auftritte"-Listen: mehrere TOPs koennen sich denselben bloßen "Ö"-Nummer
    # teilen und dann als Duplikat verschwinden, wenn man stattdessen die
    # Listenlaengen aufsummiert).
    im_feed_themen = set(je_thema.keys())
    im_feed_refs = {e["ref"] for e in feed}
    gruende = collections.Counter()
    # Jahre mit noch offenem Rueckstand vs. bereits durcharbeiteten Jahren —
    # die Fusszeile soll ehrlich sagen, fuer welchen Zeitraum "aufbereitet"
    # tatsaechlich (fast) vollstaendig ist, statt den Gesamt-Zeitraum
    # foelschlich als gleichmaessig bearbeitet erscheinen zu lassen.
    alle_jahre = set()
    offene_jahre = collections.Counter()
    for sitzung in roh["sitzungen"]:
        q = sitzung.get("quelle", "stadt")
        jahr = (sitzung["datum"] or "")[:4]
        if jahr:
            alle_jahre.add(jahr)
        bare_pos = bare_positionen(sitzung)
        for top in sitzung["tops"]:
            ref = top_ref(q, sitzung, top, bare_pos)
            schluessel = thema_schluessel(q, top) or ref
            if ref in im_feed_refs or schluessel in im_feed_themen:
                gruende["abgedeckt"] += 1
            elif not top["oeffentlich"]:
                gruende["nicht_oeffentlich"] += 1
            elif top["verfahren"]:
                gruende["sitzungsroutine"] += 1
            elif ist_beteiligung(sitzung["gremium"]):
                gruende["beteiligung"] += 1
            elif len(top["titel"]) < 12 or ist_sammelueberschrift(top["titel"]):
                gruende["sonstige"] += 1
            else:
                gruende["offen"] += 1
                if jahr:
                    offene_jahre[jahr] += 1
    tops_abgedeckt = gruende["abgedeckt"]
    jahre_vollstaendig = sorted(alle_jahre - set(offene_jahre))
    jahre_rueckstand = sorted(offene_jahre)

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
            "tops_kuratiert": len(feed),          # Themen — nach Vorlage entdoppelt
            "tops_abgedeckt": tops_abgedeckt,      # tatsaechliche TOP-Abdeckung
            # Die folgenden vier plus tops_abgedeckt ergeben zusammen genau
            # tops_ausgelesen — anders als tops_verfahren oben (das zaehlt ALLE
            # Sitzungsroutine-TOPs, auch die drei, die zufaellig trotzdem in
            # einem kuratierten Thema mitlaufen).
            "tops_sitzungsroutine_offen": gruende["sitzungsroutine"],
            "tops_beteiligung": gruende["beteiligung"],
            "tops_sonstige": gruende["sonstige"],
            "tops_nicht_oeffentlich": gruende["nicht_oeffentlich"],
            "tops_offen": gruende["offen"],        # noch nicht kuratiert
            "jahre_vollstaendig": jahre_vollstaendig,  # kein Rueckstand mehr
            "jahre_rueckstand": jahre_rueckstand,      # noch offene TOPs
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
        # Sitzungstermine ohne veroeffentlichte Tagesordnung — reine Fakten
        # ohne Inhalt, deshalb ungekuratiert direkt durchgereicht (siehe
        # ris_ingolstadt.py::kommende_termine_auslesen).
        "kommende_termine": roh.get("kommende_termine", []),
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
        f"  Vollstaendig kuratiert: {', '.join(st['jahre_vollstaendig']) or '(keine)'} "
        f"· Rueckstand: {', '.join(st['jahre_rueckstand']) or '(keiner)'}"
    )
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

    # Die Bezirk-Stadtteile-Achse gilt nur fuer stadt/bza — beim Bezirk
    # Oberbayern ist "kein Stadtteil" der korrekte, gewollte Zustand, keine
    # Kuratierungsluecke.
    ohne_bezirk = [
        e["ref"] for e in feed if not e["bezirk"] and e["quelle"] != "bezirk_obb"
    ]
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
