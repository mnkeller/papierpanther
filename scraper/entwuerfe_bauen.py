#!/usr/bin/env python3
"""
Erzeugt Kurations-Entwuerfe fuer noch nicht aufbereitete Tagesordnungspunkte und
schreibt sie nach data/kuration.json mit "entwurf": true.

Bestehende Eintraege werden NIE ueberschrieben — auch dann nicht, wenn sie selbst
noch Entwurf sind. Wer einen Entwurf verwerfen will, loescht ihn von Hand.

Die Entwuerfe entstehen regelbasiert und ohne Netzzugriff:
  - Klartext-Titel: amtlicher Titel geputzt (Rechtsnormzitate, Behoerdenpraefixe)
  - Schlagworte:    Stichwortzuordnung auf die Achsen aus kuration.json
  - Bezirk:         bei BZA-Sitzungen automatisch aus dem Gremiennamen,
                    bei Stadtrat/Ausschuessen bewusst leer (nicht geraten)

Verwendung:
    python3 entwuerfe_bauen.py                 # alle offenen TOPs
    python3 entwuerfe_bauen.py --quelle bza    # nur eine Quelle
    python3 entwuerfe_bauen.py --max 40        # hoechstens 40 Entwuerfe
    python3 entwuerfe_bauen.py --probelauf     # nichts schreiben, nur zeigen
    python3 entwuerfe_bauen.py --prompt-bundle entwuerfe.md
                                               # Textbuendel zur sprachlichen
                                               # Nachbearbeitung mit einem LLM
"""

import argparse
import collections
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

# Stichwort -> Lebenslage. Mehrere Treffer sind erlaubt.
#
# Wortstaemme sind bewusst eng gefasst. Ein zu breiter Stamm erzeugt falsche
# Zuordnungen, und die sind schaedlicher als eine fehlende: "markt" trifft
# "Viktualienmarkt", "pflege" trifft "Schwenkweiherpflege", "see" trifft
# "Museen". Deshalb Wortgrenzen (\b) und zusammengesetzte Begriffe.
LEBENSLAGE_STICHWORTE = [
    (r"kita|kinderbetreuung|kindertages|krippe|grundschul|\bschul|schulweg|"
     r"musikschule|eltern|ganztag|spielplatz|spielger(ä|ae)t|kinder", "Eltern & Kinder"),
    (r"jugend|jupa|jugendparlament|jugendarbeit|stadtjugendring|"
     r"skate|bolzplatz|basketball", "Jugend"),
    (r"senior|pflegeheim|altenpflege|altenhilfe|rollator|generationen|"
     r"altenheim|ruhestand", "Senior:innen"),
    # Barrierefreiheit und Pflege betreffen nicht nur Aeltere, deshalb eigene Achse
    (r"gesundheit|\bpflege\b|pflegebericht|klinik|krankenhaus|(ä|ae)rzt|"
     r"selbsthilfe|sucht|psychiatr|psychosozial|hospiz|impf|seuchen|"
     r"barrierefrei|behinder|inklusion|teilhabe", "Gesundheit & Pflege"),
    (r"arbeitsmarkt|arbeitsplat|arbeitslos|besch(ä|ae)ftig|stellenabbau|"
     r"qualifizier|umschul|jobcenter|fachkr(ä|ae)fte|ausbildungsplat|"
     r"tvo(ö|oe)d|tarifbesch(ä|ae)ftig|arbeitszeit|stellenplan|personalamt",
     "Arbeit & Beruf"),
    (r"sozialleistung|zuschuss f(ü|ue)r|f(ö|oe)rderrichtlinie|armut|wohngeld|"
     r"grundsicherung|\btafel\b|obdachlos|wohnungslos|sozialpass|"
     r"hilfe zur pflege|bildungspaket", "Geld & Soziales"),
    (r"asyl|gefl(ü|ue)chtet|fl(ü|ue)chtling|migration|integration|zuwander|"
     r"ukrain|sprachkurs", "Zuwanderung & Integration"),
    (r"verein|ehrenamt|f(ö|oe)rderverein|freiwillige|b(ü|ue)rgerschaftliches|"
     r"brauchtum|sch(ü|ue)tzen|feuerwehrverein", "Ehrenamt & Vereine"),
    (r"wohn|\bmiet|bebauungsplan|fl(ä|ae)chennutzung|grundst(ü|ue)ck|"
     r"kanalsanierung|kanalnetz|abwasser|"
     r"abfall|m(ü|ue)ll|geb(ü|ue)hrensatzung|zweitwohnung|nachbarschaft",
     "Wohnen & Miete"),
    (r"gewerbe|gastro|au(ß|ss)enbestuhlung|christkindlmarkt|wochenmarkt|"
     r"marktgeb|standgeb|volksfest|b(ü|ue)rgerfest|laden|wirtschaft|"
     r"einzelhandel", "Gewerbe & Gastro"),
    (r"verkehr|radweg|radverkehr|fahrrad|radl|\bbus\b|bush(ä|ae)us|"
     r"(ö|oe)pnv|stadtbus|parkplatz|parken|parkbucht|parkhaus|parkgeb|"
     r"tempo|30-?er|stra(ß|ss)e|str\.|gehweg|fu(ß|ss)weg|br(ü|ue)cke|ampel|"
     r"fu(ß|ss)g(ä|ae)nger|verkehrsz|zebrastreifen|taktzeit|fahrplan|"
     r"geschwindigkeit|\bb ?16\b|ausbau der b",
     "Unterwegs"),
    (r"sport|\bbad\b|hallenbad|therme|freibad|\bsee\b|baggersee|weiher|"
     r"\bpark\b|piuspark|gr(ü|ue)nanlage|freizeit|kultur|bibliothek|theater|"
     r"\bfest\b|schachtisch|spielplatz|"
     r"cricket|bolzplatz|spielfeld",
     "Freizeit & Sport"),
    (r"studier|hochschule|\bthi\b|universit", "Studierende"),
]

# Stichwort -> Anlass
ANLASS_STICHWORTE = [
    (r"geb(ü|ue)hr|tarif|preis|entgelt|beitrag|steuer|kosten|haushalt|\bbhh\b",
     "Gebühren & Preise"),
    (r"kita|kindertages|kinderbetreuung|ganztag|krippe", "Kinderbetreuung"),
    (r"schulbau|schulcampus|schulentwicklung|schulraum|neubau der .*schule",
     "Schulbau"),
    (r"bebauungsplan|fl(ä|ae)chennutzungsplan|gr(ü|ue)nordnungsplan|"
     r"satzungsbeschluss|bauleitplan", "Bauleitplanung"),
    (r"verkehr|radweg|fahrplan|(ö|oe)pnv|tempo|30-?er|parken|parkbucht|"
     r"verkehrlich|taktzeit|ampel|zebrastreifen|fahrradstra(ß|ss)e",
     "Verkehrsplanung"),
    (r"sicherheit|gutachten|gefahr|gef(ä|ae)hrlich|(ü|ue)berschwemmung|"
     r"hochwasser|brand|vandalismus|besch(ä|ae)digung|beleuchtung",
     "Sicherheit"),
    (r"satzung|verordnung|allgemeinverf(ü|ue)gung|richtlinie|"
     r"gesch(ä|ae)ftsordnung", "Satzung & Regeln"),
    (r"konzept|planung|bedarfsplan|strategie|bericht|analyse|befragung",
     "Konzept & Planung"),
    (r"sanierung|baustelle|umbau|instandsetzung|erneuerung", "Baustelle"),
    (r"klima|energie|solar|photovolt|windkraft|w(ä|ae)rmeplan|w(ä|ae)rmenetz|"
     r"nachhaltig|umweltschutz|luftrein|l(ä|ae)rm|artenschutz|biodivers|"
     r"starkregen|hitze", "Klima & Umwelt"),
    (r"kultur|museum|theater|bibliothek|stadtb(ü|ue)cherei|musikschule|"
     r"volkshochschule|\bvhs\b|denkmal|archiv|konzert|ausstellung|"
     r"stadttheater|kunst", "Kultur & Bildung"),
    # Traegt vor allem die BZA-Punkte: Baeume, Gruen, Sauberkeit, Moebliar
    (r"baum|b(ä|ae)ume|baumf(ä|ae)ll|baumpflanz|gr(ü|ue)n|hecke|wiese|"
     r"m(ü|ue)lleimer|verm(ü|ue)ll|sauberkeit|hundekot|papierkorb|"
     r"trinkbrunnen|sitzbank|bank\b|pflege\b|unkraut|abpflaster|entsiegel",
     "Grün & Sauberkeit"),
]

# Praefixe und Zitate, die im Klartext-Titel nichts verloren haben
PUTZ_MUSTER = [
    r"^Vollzug des Bayerischen Stra(ß|ss)en-\s*und Wegegesetzes\s*[—-]*\s*",
    r"^Vollzug\s+(?:des|der)\s+[^—]{5,60}?\s*[—-]+\s*",
    r"\s*gem(ä|ae)?(ß|ss)?\.?\s*(Art\.|§)\s*[\w\s.,/§-]{2,60}",
    r"\s*\(\s*Art\.\s*[^)]{2,40}\)",
    r"\s*nach\s+dem\s+Baugesetzbuch",
    r"^\s*•\s*",
]


def lade(dateiname):
    pfad = os.path.join(DATEN_VZ, dateiname)
    if not os.path.exists(pfad):
        sys.exit(f"Fehlt: {pfad}\nZuerst ris_ingolstadt.py laufen lassen.")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=collections.OrderedDict)


def klartext_titel(titel):
    """Amtlichen Titel zu einer lesbaren Zeile kuerzen."""
    t = titel
    for muster in PUTZ_MUSTER:
        t = re.sub(muster, " ", t, flags=re.I)

    # Mehrteilige Titel: beim ersten harten Trenner abschneiden
    for trenner in [" — ", "; ", " – "]:
        if trenner in t:
            kopf = t.split(trenner)[0].strip(" ;,–—-")
            if len(kopf) >= 25:  # nur kuerzen, wenn der Kopf allein traegt
                t = kopf
                break

    t = re.sub(r"\s+", " ", t).strip(" ;,:–—-")
    if len(t) > 110:
        schnitt = t[:110].rsplit(" ", 1)[0]
        t = schnitt + " …"
    return t


# Gremien, die keine Buergerinformation im Sinne dieser Seite sind: Aufsichts-
# und Verwaltungsraete staedtischer Gesellschaften, Zweckverbaende, Beiraete.
# Ihre Tagesordnungen sind formal oeffentlich, aber inhaltlich Unternehmens-
# steuerung — Jahresabschluesse, Beteiligungsberichte, Gremienbesetzungen.
BETEILIGUNG_MUSTER = re.compile(
    r"Aufsichtsrat|Verwaltungsrat|\bAöR\b|GmbH|Zweckverband|Verbandsversammlung|"
    r"Beirat|Kommission|Gesellschafterversammlung",
    re.I,
)


def ist_beteiligung(gremium):
    return bool(BETEILIGUNG_MUSTER.search(gremium or ""))


# Ein konkreter Punkt nennt fast immer einen Ort oder eine Sache:
# "Trinkbrunnen in der Kanalstrasse". Eine reine Sammelueberschrift nicht:
# "Jugend", "Inklusion", "Antraege". Die Unterpunkte darunter sind der Inhalt.
ORTSBEZUG = re.compile(
    r"stra(ß|ss)e|str\.|platz|weg\b|park|see\b|allee|gasse|ring\b|ufer|"
    r"br(ü|ue)cke|schule|halle|bad\b|markt|graben",
    re.I,
)


def ist_sammelueberschrift(titel):
    return len(titel) < 22 and not ORTSBEZUG.search(titel)


def ohne_personen(zusatz):
    """
    Entfernt Referenten- und Personenangaben aus dem Klammerzusatz.

    Nachnamen sind eine Fehlerquelle: 'Herr Mueller' traf das Stichwort 'muell'
    und machte aus einer Volkshochschul-Richtlinie ein Thema 'Wohnen & Miete'.
    Namen sagen nichts ueber den Inhalt, also fliegen sie vor der Suche raus.
    """
    if not zusatz:
        return ""
    ohne = re.sub(r"(Referent(en|in|innen)?|Vortrag(ende[rn]?)?|Berichterstatter(in)?)\s*:.*",
                  "", zusatz, flags=re.I | re.S)
    ohne = re.sub(r"\b(Herr|Frau|Dr\.|Prof\.)\s+\S+", "", ohne)
    return ohne.strip()


def schlagworte(text, tabelle):
    treffer = []
    for muster, wert in tabelle:
        if re.search(muster, text, re.I) and wert not in treffer:
            treffer.append(wert)
    return treffer


def bezirk_aus_gremium(gremium):
    """'Bezirksausschuss VII-Etting' -> 'VII-Etting'."""
    m = re.search(r"Bezirksausschuss\s+([IVX]+\s*-\s*.+)$", gremium)
    if not m:
        return []
    return [re.sub(r"\s*-\s*", "-", m.group(1)).strip()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quelle", choices=["stadt", "bza"], help="nur eine Quelle")
    parser.add_argument("--max", type=int, default=0, help="hoechstens N Entwuerfe")
    parser.add_argument("--mit-beteiligungen", action="store_true",
                        help="Aufsichtsraete, Zweckverbaende und Beiraete mitnehmen")
    parser.add_argument("--probelauf", action="store_true", help="nichts schreiben")
    parser.add_argument("--prompt-bundle", metavar="DATEI",
                        help="Entwuerfe zusaetzlich als Textbuendel schreiben")
    args = parser.parse_args()

    roh = lade("rohdaten.json")
    kur_pfad = os.path.join(DATEN_VZ, "kuration.json")
    kuration = lade("kuration.json")
    vorhanden = kuration["eintraege"]

    offen = []
    for sitzung in roh["sitzungen"]:
        quelle = sitzung.get("quelle", "stadt")
        if args.quelle and quelle != args.quelle:
            continue
        if not args.mit_beteiligungen and ist_beteiligung(sitzung["gremium"]):
            continue
        for top in sitzung["tops"]:
            ref = f'{quelle}:{sitzung["id"]}#{top["nr"]}'
            if ref in vorhanden:
                continue
            if not top["oeffentlich"] or top["verfahren"]:
                continue
            if len(top["titel"]) < 12:      # Platzhalter-TOPs ueberspringen
                continue
            if ist_sammelueberschrift(top["titel"]):
                continue
            offen.append((ref, sitzung, top))

    if args.max:
        offen = offen[: args.max]

    if not offen:
        print("Keine offenen Tagesordnungspunkte — nichts zu tun.")
        return

    neu = collections.OrderedDict()
    for ref, sitzung, top in offen:
        suchtext = " ".join(
            [top["titel"], ohne_personen(top.get("zusatz", "")), sitzung["gremium"]]
        )
        eintrag = collections.OrderedDict()
        eintrag["klartext_titel"] = klartext_titel(top["titel"])
        eintrag["klartext"] = ""        # bleibt leer: die Oberflaeche zeigt dann
                                        # nur den Titel, statt Text zu erfinden
        eintrag["lebenslage"] = schlagworte(suchtext, LEBENSLAGE_STICHWORTE)
        eintrag["bezirk"] = bezirk_aus_gremium(sitzung["gremium"])
        eintrag["ort"] = []
        eintrag["anlass"] = schlagworte(suchtext, ANLASS_STICHWORTE)
        eintrag["entwurf"] = True
        neu[ref] = eintrag

    ohne_schlagwort = [r for r, e in neu.items()
                       if not e["lebenslage"] and not e["anlass"]]
    ohne_bezirk = [r for r, e in neu.items() if not e["bezirk"]]

    print(f"{len(neu)} Entwuerfe erzeugt")
    print(f"  {len(ohne_schlagwort)} ohne jedes Schlagwort (brauchen Handarbeit)")
    print(f"  {len(ohne_bezirk)} ohne Stadtbezirk (Stadtrat/Ausschuesse)")
    print("\nStichprobe:")
    for ref, e in list(neu.items())[:12]:
        marke = ",".join(e["lebenslage"] + e["anlass"]) or "— keine Schlagworte —"
        bez = e["bezirk"][0] if e["bezirk"] else ""
        print(f"  {ref:22} {bez:22} {e['klartext_titel'][:62]}")
        print(f"  {'':22} {'':22} [{marke}]")

    if args.probelauf:
        print("\nProbelauf — nichts geschrieben.")
        return

    vorhanden.update(neu)
    with open(kur_pfad, "w", encoding="utf-8") as f:
        json.dump(kuration, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nGeschrieben: {kur_pfad} ({len(vorhanden)} Eintraege insgesamt)")

    if args.prompt_bundle:
        ziel = os.path.join(DATEN_VZ, args.prompt_bundle)
        with open(ziel, "w", encoding="utf-8") as f:
            f.write(
                "# Entwuerfe zur sprachlichen Nachbearbeitung\n\n"
                "Aufgabe: fuer jeden Punkt einen Klartext-Titel (Alltagssprache, "
                "keine erfundenen Fakten) und 1-2 Saetze Klartext schreiben. "
                "Nur umformulieren, was im amtlichen Titel steht.\n\n"
            )
            for ref, sitzung, top in offen:
                f.write(f"## {ref}\n")
                f.write(f"- Gremium: {sitzung['gremium']} ({sitzung['datum_anzeige']})\n")
                f.write(f"- Amtlicher Titel: {top['titel']}\n")
                if top.get("zusatz"):
                    f.write(f"- Zusatz: {top['zusatz']}\n")
                if top.get("vorlage"):
                    f.write(f"- Vorlage: {top['vorlage']}\n")
                f.write(f"- Entwurf-Titel: {neu[ref]['klartext_titel']}\n\n")
        print(f"Textbuendel: {ziel}")


if __name__ == "__main__":
    main()
