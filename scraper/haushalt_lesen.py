#!/usr/bin/env python3
"""
Liest die von haushalt_holen.py gecachten Gruppierungsuebersichten
(Anlage 2) sowie Anlage 1 (Festsetzungen) und Anlage 5 (Vorbericht) des
aktuellsten Jahrgangs, prueft sie gegen harte Summenproben und schreibt
data/haushalt.json + data/haushalt.js.

    python3 haushalt_lesen.py

Jede Anlage 2 ist eine box-drawing-Tabelle mit fester Struktur:
Hauptgruppen (0-9) auf einer Uebersichtsseite mit Vorjahresvergleich in
Prozent, danach Gruppen/Untergruppen auf Detailseiten mit "Summe Gr."-
Zwischensummen. Die Seiten sind ueber Jahrgaenge hinweg nicht einheitlich
geschnitten (mal eigenstaendiges 10-Seiten-PDF, 2025 eingebettet in einem
1046-seitigen Gesamtplan) - deshalb wird nach der Kopfzeile "3.
Gruppierungsuebersicht" gefiltert statt nach Seitenzahlen.

Die Entwurfs-PDFs tragen ein "Entwurf"-Wasserzeichen, das pdfplumber als
verstreute Einzelbuchstaben mitten im Text ausgibt. Deshalb: nur Zahlen
verwenden, die sich gegen eine gedruckte Summenzeile aufaddieren - bei
Abweichung bricht das Skript ab, statt eine unsichere Zahl zu schreiben.
"""

import json
import os
import re
import sys
from decimal import Decimal, InvalidOperation

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")

sys.path.insert(0, HIER)
from haushalt_holen import (  # noqa: E402
    ANLAGE2_JE_JAHR, ANLAGE1_AKTUELL, ANLAGE5_AKTUELL, AKTUELLES_JAHR, BASIS, hole,
)

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber fehlt:  python3 -m pip install pdfplumber")

try:
    import pypdf
except ImportError:
    sys.exit("pypdf fehlt:  python3 -m pip install pypdf")

# Negative Betraege stehen manchmal mit fuehrendem, manchmal mit
# nachgestelltem Minus ("3.168.944,20-" statt "-3.168.944,20").
ZAHL = r"-|-?[\d.]+,\d{2}-?"
PROZENT = r"[+-][\d.,]+\s*%"

HAUPTGRUPPE_ZEILE = re.compile(
    rf"^([0-9])\s+(.*?)\s+({ZAHL})\s+({PROZENT})\s+({ZAHL})\s+({PROZENT})\s+({ZAHL})$"
)
SUMME_ZEILE = re.compile(
    rf"^Summe (Einnahmen|Ausgaben)\s+({ZAHL})\s+({PROZENT})\s+({ZAHL})\s+({PROZENT})\s+({ZAHL})$"
)

# Fast immer "<Code> <Text> <Zahl> <Zahl> <Zahl>". Eine Ausnahme: mehrere
# Gruppen mit wenig Substanz werden manchmal als Bereich zusammengefasst,
# z.B. "57-63weit.Verw.u.Betriebsausgab." — ohne Leerzeichen zwischen dem
# Bereich und dem Text.
LEAF_ZEILE = re.compile(rf"^(\d{{2,3}}(?:-\d{{2,3}})?)\s*(.*?)\s+({ZAHL})\s+({ZAHL})\s+({ZAHL})$")
HG_SCHLIESSEN = re.compile(rf"^Summe Hauptgruppe\s+([0-9])\s+({ZAHL})\s+({ZAHL})\s+({ZAHL})$")
HG_OEFFNEN = re.compile(r"^([0-9])\s+[A-ZÄÖÜ]")
HG_KOMBI_OEFFNEN = re.compile(r"^5/6\s+[A-ZÄÖÜ]")
# Eine zweistellige Gruppe ohne Zahlen (z.B. "37 Einnahmen aus Krediten und
# inneren Darlehen") eroeffnet den Kontext fuer die folgenden dreistelligen
# Untergruppen. Muss nach LEAF_ZEILE geprueft werden, sonst wuerde eine
# zweistellige Gruppe MIT Werten (z.B. "02 Andere Steuern 300.000,00 ...")
# hier ebenfalls anschlagen.
GRUPPE_OEFFNEN = re.compile(r"^(\d{2})\s+(.+)$")

# Amtliche Bezeichnungen der zweistelligen Gruppen, aus: Anlage 2 zu Nr. 2.1
# VVKommHSyst-Kameralistik "Gruppierungsplan fuer die Haushalte der
# Gemeinden und Gemeindeverbaende" (KommGrPl), Bayerisches Staatsministerium
# des Innern. Ersetzt die oft stark abgekuerzte Bezeichnung aus Ingolstadts
# eigenem PDF (z.B. "Aufgabenbez.Leist.beteiligg" -> voller Name), sofern
# die Gruppe hier bekannt ist; sonst bleibt die Bezeichnung aus der Quelle.
GRUPPEN_NAMEN_AMTLICH = {
    "00": "Realsteuern",
    "01": "Gemeindeanteile an Gemeinschaftsteuern",
    "02": "Andere Steuern",
    "03": "Steuerähnliche Einnahmen",
    "04": "Schlüsselzuweisungen",
    "05": "Bedarfszuweisungen (einschl. Stabilisierungshilfen)",
    "06": "Sonstige allgemeine Zuweisungen",
    "07": "Allgemeine Umlagen",
    "08": "Allgemeine Zuweisungen aus besonderen Abrechnungsverfahren",
    "10": "Verwaltungsgebühren",
    "11": "Benutzungsgebühren und ähnliche Entgelte",
    "12": "Zweckgebundene Abgaben",
    "13": "Einnahmen aus Verkauf",
    "14": "Mieten und Pachten",
    "15": "Sonstige Verwaltungs- und Betriebseinnahmen",
    "16": "Erstattungen von Ausgaben des Verwaltungshaushalts",
    "17": "Zuweisungen und Zuschüsse für laufende Zwecke",
    "19": "Aufgabenbezogene Leistungsbeteiligung des Bundes",
    "20": "Zinseinnahmen",
    "21": "Gewinnanteile von wirtschaftlichen Unternehmen und aus Beteiligungen",
    "22": "Konzessionsabgaben",
    "23": "Schuldendiensthilfen",
    "24": "Ersatz von sozialen Leistungen außerhalb von Einrichtungen",
    "25": "Ersatz von sozialen Leistungen in Einrichtungen",
    "26": "Weitere Finanzeinnahmen",
    "27": "Kalkulatorische Einnahmen",
    "28": "Zuführung vom Vermögenshaushalt",
    "29": "Übertragungs- und Abschlussbuchungen",
    "30": "Zuführung vom Verwaltungshaushalt",
    "31": "Entnahmen aus Rücklagen",
    "32": "Rückflüsse von Darlehen",
    "33": "Einnahmen aus der Veräußerung von Beteiligungen und Rückflüsse von Kapitaleinlagen",
    "34": "Einnahmen aus der Veräußerung von Sachen des Anlagevermögens",
    "35": "Beiträge und ähnliche Entgelte",
    "36": "Zuweisungen und Zuschüsse für Investitionen und Investitionsförderungsmaßnahmen",
    "37": "Einnahmen aus Krediten und inneren Darlehen",
    "39": "Übertragungs- und Abschlussbuchungen",
    "40": "Aufwendungen für ehrenamtliche Tätigkeit",
    "41": "Dienstbezüge u. dgl.",
    "42": "Versorgungsbezüge u. dgl.",
    "43": "Beiträge zu Versorgungskassen",
    "44": "Beiträge zur gesetzlichen Sozialversicherung",
    "45": "Beihilfen, Unterstützungen u. dgl.",
    "46": "Personal-Nebenausgaben",
    "47": "Deckungsreserve für Personalausgaben",
    "50": "Unterhalt der Grundstücke und baulichen Anlagen",
    "51": "Unterhalt des sonstigen unbeweglichen Vermögens",
    "52": "Geräte, Ausstattungs- und Ausrüstungsgegenstände, sonstige Gebrauchsgegenstände",
    "53": "Mieten und Pachten",
    "54": "Bewirtschaftung der Grundstücke, baulichen Anlagen usw.",
    "55": "Haltung von Fahrzeugen",
    "56": "Besondere Aufwendungen für Bedienstete",
    "64": "Steuern, Versicherungen, Schadensfälle",
    "65": "Geschäftsausgaben",
    "66": "Weitere allgemeine sächliche Ausgaben",
    "67": "Erstattungen von Ausgaben des Verwaltungshaushalts",
    "68": "Kalkulatorische Kosten",
    "69": "Aufgabenbezogene Leistungsbeteiligung",
    "70": "Zuschüsse für laufende Zwecke an soziale oder ähnliche Einrichtungen",
    "71": "Zuweisungen und sonstige Zuschüsse für laufende Zwecke",
    "72": "Schuldendiensthilfen",
    "73": "Leistungen der Sozialhilfe einschl. Grundsicherung im Alter und bei Erwerbsminderung an natürliche Personen außerhalb von Einrichtungen",
    "74": "Leistungen der Sozialhilfe einschl. Grundsicherung im Alter an natürliche Personen in Einrichtungen",
    "75": "Leistungen an Kriegsopfer und ähnliche Berechtigte",
    "76": "Leistungen der Jugendhilfe an natürliche Personen außerhalb von Einrichtungen",
    "77": "Leistungen der Jugendhilfe an natürliche Personen in Einrichtungen",
    "78": "Sonstige soziale Leistungen",
    "79": "Leistungen nach dem Asylbewerberleistungsgesetz",
    "80": "Zinsausgaben",
    "81": "Steuerbeteiligungen",
    "82": "Allgemeine Zuweisungen",
    "83": "Allgemeine Umlagen",
    "84": "Weitere Finanzausgaben",
    "85": "Deckungsreserve",
    "86": "Zuführung zum Vermögenshaushalt",
    "89": "Übertragungs- und Abschlussbuchungen",
    "90": "Zuführung zum Verwaltungshaushalt",
    "91": "Zuführungen an Rücklagen",
    "92": "Gewährung von Darlehen",
    "93": "Ausgaben für den Erwerb von Sachen des Anlagevermögens (ohne Baumaßnahmen)",
    "97": "Tilgung von Krediten, Rückzahlung von inneren Darlehen",
    "98": "Zuweisungen und Zuschüsse für Investitionen",
    "99": "Sonstiges",
}

# Diese Untergruppen tauchen in Fliesstext/Diagramm auf; alle anderen
# Detailzeilen werden geparst, aber nicht weiterverwendet.
INTERESSANTE_CODES = {
    "003": "Gewerbesteuer (brutto)",
    "001": "Grundsteuer B",
    "010": "Einkommensteuer",
    "280": "Zufuehrung vom Vermoegenshaushalt (Einnahmenseite)",
    "31": "Entnahmen aus Ruecklagen",
    "37": "Einnahmen aus Krediten",
}

# Einzelposten, die auf der Seite als eigene Zeitreihe waehlbar sind (neben
# den Hauptgruppen). Die Codes sind in allen Jahrgaengen 2023-2026 gleich.
ZEITREIHE_POSTEN = {
    "003": "Gewerbesteuer (brutto)",
    "010": "Anteil an der Einkommensteuer",
    "012": "Anteil an der Umsatzsteuer",
    "001": "Grundsteuer B",
}


def _zahl(tok):
    tok = tok.strip()
    if tok == "-" or tok == "":
        return Decimal("0")
    negativ = tok.endswith("-")
    if negativ:
        tok = tok[:-1]
    try:
        wert = Decimal(tok.replace(".", "").replace(",", "."))
    except InvalidOperation:
        raise ValueError(f"unlesbare Zahl: {tok!r}")
    return -wert if negativ else wert


def _bereinigte_zeilen(seiten_text):
    for roh in seiten_text.split("\n"):
        z = roh.strip().strip("│").strip()
        if not z:
            continue
        if re.fullmatch(r"[─═├┤┌┐└┘\-=]+", z):
            continue
        if re.fullmatch(r"[A-Za-zÄÖÜäöü]", z):  # einzelnes Wasserzeichen-Zeichen
            continue
        if re.fullmatch(r"-\s*\d+\s*-", z):  # Seitenzahl-Fusszeile, z.B. "- 4 -"
            continue
        yield z


def _seiten_art(text):
    kopf = text[:500]
    if "Hauptgruppen und prozentuale" in kopf:
        return "hauptgruppen"
    if "Gruppierungsübersicht" in kopf:
        return "detail"
    return None


def parse_hauptgruppen_seite(text):
    zeilen = list(_bereinigte_zeilen(text))
    hauptgruppen = {}
    summen = {}
    i = 0
    while i < len(zeilen):
        z = zeilen[i]
        m = HAUPTGRUPPE_ZEILE.match(z)
        if m:
            code, label = m.group(1), m.group(2).strip()
            werte = (_zahl(m.group(3)), _zahl(m.group(5)), _zahl(m.group(7)))
            # Zweizeiliger Titel ("...und\nBetrieb")? Naechste Zeile ist dann
            # reiner Text ohne fuehrende Ziffer und ohne eigene Zahlenspalten.
            if i + 1 < len(zeilen):
                folge = zeilen[i + 1]
                if (not HAUPTGRUPPE_ZEILE.match(folge) and not SUMME_ZEILE.match(folge)
                        and not re.match(r"^\d", folge) and len(folge) < 40):
                    if label.endswith("-"):
                        # Trennstrich vom Zeilenumbruch, kein echter Bindestrich
                        # ("Vermögens-" + "Haushalts" -> "Vermögenshaushalts").
                        label = label[:-1] + folge[:1].lower() + folge[1:]
                    else:
                        label = f"{label} {folge}".strip()
                    i += 1
            # Wasserzeichen-Einzelbuchstabe am Zeilenende entfernen (z.B.
            # "haushalts t" statt "haushalts") — echte Bezeichnungen enden
            # nie auf ein einzelnes Buchstaben-Token.
            label = re.sub(r"\s+[A-Za-zÄÖÜäöü]$", "", label)
            hauptgruppen[code] = {"bezeichnung": label, "werte": werte}
            i += 1
            continue
        m = SUMME_ZEILE.match(z)
        if m:
            summen[m.group(1)] = (_zahl(m.group(2)), _zahl(m.group(4)), _zahl(m.group(6)))
        i += 1
    return hauptgruppen, summen


def _vwh_vmh_abschluss(z):
    """
    Erkennt die Abschluss-Zeilen "Einnahmen/Ausgaben Verwaltungshaushalt/
    Vermoegenshaushalt <3 Zahlen>". Sucht per Teilstring statt exaktem Text,
    weil das Wasserzeichen genau hier zusaetzliche Buchstaben einstreut
    ("Vernwaltungshaushalt", "Venrmögenshaushalt" o.ae. wurden beobachtet).
    Die gleichlautende Zeile OHNE Zahlen (blosse Abschnitts-Ueberschrift)
    liefert bewusst kein Ergebnis.
    """
    if not (z.startswith("Einnahmen ") or z.startswith("Ausgaben ")):
        return None
    m = re.search(rf"({ZAHL})\s+({ZAHL})\s+({ZAHL})$", z)
    if not m:
        return None
    if "waltung" in z:
        teil = "vwh"
    elif "mögen" in z:
        teil = "vmh"
    else:
        return None
    art = "Einnahmen" if z.startswith("Einnahmen") else "Ausgaben"
    return art, teil, (_zahl(m.group(1)), _zahl(m.group(2)), _zahl(m.group(3)))


def parse_detail_abschnitte(alle_zeilen, hauptgruppen):
    """
    Ordnet Untergruppen ihrer Hauptgruppe zu, ueber alle Detailseiten eines
    Dokuments hinweg (Reihenfolge zaehlt: eine Hauptgruppe kann ueber eine
    Seitengrenze laufen).

    Die meisten Hauptgruppen haben eine eigene Abschluss-Zeile ("Summe
    Hauptgruppe N" oder, fuer 3/9, "Einnahmen/Ausgaben Vermoegenshaushalt").
    Hauptgruppen 5 und 6 ("Sächlicher Verwaltungs- und Betriebsaufwand")
    teilen sich im Originaldokument einen einzigen Abschnitt "5/6" ohne
    eigene Abschluss-Zeile fuer 5 oder 6 einzeln — der Abschnitt endet erst,
    wenn die naechste Hauptgruppe beginnt. Deren Summe wird deshalb gegen
    die bereits geparste Uebersichtsseite geprueft (hg[5]+hg[6]), nicht
    gegen eine Zeile im Detailteil.
    """
    untergruppen = {}
    puffer = []
    aktuell = None
    gruppen_kontext = None  # zweistellige Gruppe, der die naechsten Untergruppen angehoeren

    def schliessen(gruppe, erwartet):
        # Alle drei Spalten pruefen (Ansatz, Vorjahr, Vorvorjahr-Ergebnis):
        # die Zeitreihen einzelner Posten (ZEITREIHE_POSTEN) lesen auch die
        # beiden hinteren Spalten.
        for spalte in range(3):
            summe = sum(z["werte"][spalte] for z in puffer)
            if summe != erwartet[spalte]:
                sys.exit(
                    f"Hauptgruppe {gruppe} (Spalte {spalte}): Untergruppen summieren zu "
                    f"{summe}, aber die Abschluss-Zeile nennt {erwartet[spalte]} — "
                    f"Pruefsumme fehlgeschlagen, moeglicherweise Wasserzeichen-Fehler."
                )
        untergruppen[gruppe] = list(puffer)

    def _ist_fortsetzung(z):
        """Reiner Text ohne fuehrende Ziffer, kein Steuerzeichen — vermutlich
        eine weitere Zeile einer umgebrochenen Bezeichnung. "Summe Gr./
        Hauptgruppe"-Zeilen sind keine Fortsetzung, auch wenn direkt danach
        (Leerzeilen dazwischen sind schon herausgefiltert)."""
        return (len(z) < 45 and not re.match(r"^\d", z) and not z.startswith("Summe")
                and not LEAF_ZEILE.match(z) and not HG_SCHLIESSEN.match(z)
                and not HG_KOMBI_OEFFNEN.match(z) and not HG_OEFFNEN.match(z)
                and not _vwh_vmh_abschluss(z))

    def _mit_fortsetzungen(bezeichnung, i):
        """Haengt so lange weitere Zeilen an, wie sie wie eine Fortsetzung
        aussehen (manche Bezeichnungen brechen ueber drei Zeilen um, z.B.
        "Zuweisungen und Zuschüsse / für Investitionen und /
        Investitionsfördermaßnahmen"). Gibt (Bezeichnung, neues i) zurueck."""
        while i + 1 < len(alle_zeilen) and _ist_fortsetzung(alle_zeilen[i + 1]):
            folge = alle_zeilen[i + 1]
            if bezeichnung.endswith("-"):
                bezeichnung = bezeichnung[:-1] + folge[:1].lower() + folge[1:]
            else:
                bezeichnung = f"{bezeichnung} {folge}"
            i += 1
        # Wasserzeichen-Einzelbuchstabe am Zeilenende entfernen (z.B.
        # "an Arbeitssuchende t" statt "an Arbeitssuchende") — echte
        # Bezeichnungen enden nie auf ein einzelnes Buchstaben-Token.
        bezeichnung = re.sub(r"\s+[A-Za-zÄÖÜäöü]$", "", bezeichnung)
        return bezeichnung, i

    i = 0
    while i < len(alle_zeilen):
        z = alle_zeilen[i]

        m = LEAF_ZEILE.match(z)
        if m:
            code = m.group(1)
            bezeichnung, i = _mit_fortsetzungen(m.group(2).strip(), i)
            eintrag = {
                "code": code, "bezeichnung": bezeichnung,
                "werte": (_zahl(m.group(3)), _zahl(m.group(4)), _zahl(m.group(5))),
            }
            if len(code) == 2:
                # Diese Gruppe hat selbst schon Werte, keine Untergruppen
                # darunter — trotzdem als Kontext merken, falls doch welche
                # folgen (kommt in der Praxis nicht vor, schadet aber nicht).
                eintrag["bezeichnung"] = GRUPPEN_NAMEN_AMTLICH.get(code, bezeichnung)
                gruppen_kontext = {"code": code, "bezeichnung": eintrag["bezeichnung"]}
            else:
                eintrag["gruppe"] = gruppen_kontext
            puffer.append(eintrag)
            i += 1
            continue

        m = HG_SCHLIESSEN.match(z)
        if m:
            schliessen(m.group(1), (_zahl(m.group(2)), _zahl(m.group(3)), _zahl(m.group(4))))
            puffer, aktuell, gruppen_kontext = [], None, None
            i += 1
            continue

        abschluss = _vwh_vmh_abschluss(z)
        if abschluss:
            _art, teil, werte = abschluss
            if teil == "vmh":
                gruppe = "3" if _art == "Einnahmen" else "9"
                schliessen(gruppe, werte)
                puffer, aktuell, gruppen_kontext = [], None, None
            # die vwh-Zeilen sind nur Kontrollsummen ueber mehrere
            # Hauptgruppen hinweg, keine eigene Hauptgruppe zum Schliessen.
            i += 1
            continue

        if HG_KOMBI_OEFFNEN.match(z):
            puffer, aktuell, gruppen_kontext = [], "5_6", None
            i += 1
            continue

        m = HG_OEFFNEN.match(z)
        if m:
            if aktuell == "5_6":
                erwartet = tuple(hauptgruppen["5"]["werte"][s] + hauptgruppen["6"]["werte"][s]
                                 for s in range(3))
                schliessen("5_6", erwartet)
            puffer, aktuell, gruppen_kontext = [], m.group(1), None
            i += 1
            continue

        m = GRUPPE_OEFFNEN.match(z)
        if m:
            code = m.group(1)
            bezeichnung, i = _mit_fortsetzungen(m.group(2).strip(), i)
            gruppen_kontext = {"code": code, "bezeichnung": GRUPPEN_NAMEN_AMTLICH.get(code, bezeichnung)}
            i += 1
            continue
        # alles andere (Zwischenueberschriften, Wasserzeichen-Reste) ignorieren
        i += 1

    return untergruppen


def _relevante_seitenindizes(pfad):
    """
    Schneller Vorlauf mit pypdf (leichtgewichtig) statt pdfplumber
    (baut pro Seite ein volles Layout-Objekt auf) ueber ALLE Seiten zu
    laufen — bei der 1046-seitigen Fassung von 2025 sonst 4+ GB RAM und
    mehrere Minuten fuer neun tatsaechlich gebrauchte Seiten.
    """
    reader = pypdf.PdfReader(pfad)
    return [i for i, seite in enumerate(reader.pages)
            if "3. Gruppierungsübersicht" in (seite.extract_text() or "")[:600]]


def lies_anlage2(pfad, jahr):
    hauptgruppen, summen = {}, {}
    detail_zeilen = []
    indizes = _relevante_seitenindizes(pfad)
    if not indizes:
        sys.exit(f"{jahr}: keine Gruppierungsuebersicht-Seiten gefunden in {pfad}")
    with pdfplumber.open(pfad) as pdf:
        for i in indizes:
            text = pdf.pages[i].extract_text() or ""
            art = _seiten_art(text)
            if art == "hauptgruppen":
                hg, su = parse_hauptgruppen_seite(text)
                hauptgruppen.update(hg)
                summen.update(su)
            elif art == "detail":
                detail_zeilen.extend(_bereinigte_zeilen(text))

    if len(hauptgruppen) != 10:
        sys.exit(f"{jahr}: nur {len(hauptgruppen)}/10 Hauptgruppen gefunden in {pfad}")
    if "Einnahmen" not in summen or "Ausgaben" not in summen:
        sys.exit(f"{jahr}: Summe Einnahmen/Ausgaben nicht gefunden in {pfad}")

    # Harte Pruefsumme: Hauptgruppen 0-3 = Summe Einnahmen, 4-9 = Summe Ausgaben.
    # Fuer alle drei Spalten (aktuelles Jahr, Vorjahr, Vorvorjahr-Ergebnis).
    for spalte, name in enumerate(["aktuell", "vorjahr", "vorvorjahr_ergebnis"]):
        summe_e = sum(hauptgruppen[c]["werte"][spalte] for c in "0123")
        summe_a = sum(hauptgruppen[c]["werte"][spalte] for c in "456789")
        if summe_e != summen["Einnahmen"][spalte]:
            sys.exit(
                f"{jahr} ({name}): Summe Hauptgruppen 0-3 = {summe_e}, "
                f"aber PDF nennt Summe Einnahmen = {summen['Einnahmen'][spalte]} "
                f"— Pruefsumme fehlgeschlagen, moeglicherweise Wasserzeichen-Fehler."
            )
        if summe_a != summen["Ausgaben"][spalte]:
            sys.exit(
                f"{jahr} ({name}): Summe Hauptgruppen 4-9 = {summe_a}, "
                f"aber PDF nennt Summe Ausgaben = {summen['Ausgaben'][spalte]} "
                f"— Pruefsumme fehlgeschlagen, moeglicherweise Wasserzeichen-Fehler."
            )

    untergruppen = parse_detail_abschnitte(detail_zeilen, hauptgruppen)
    leaves = {u["code"]: u for gruppe in untergruppen.values() for u in gruppe}

    return hauptgruppen, summen, leaves, untergruppen


# Amtliche Namen der Referate, von der staedtischen Website
# (ingolstadt.de/Rathaus/Verwaltung-Beteiligung/Aemter-Referate/,
# Stand 01.09.2026). "VIII" ist dort nicht als eigenes Referat gelistet —
# bleibt deshalb ohne Namenszusatz statt geraten.
REFERAT_NAMEN = {
    "VL": "Verwaltungsleitung (Oberbürgermeister)",
    "I": "Personal-, Organisations- und IT-Management",
    "II": "Finanzen und Liegenschaften",
    "III": "Recht, Sicherheit und Ordnung",
    "IV": "Kultur und Bildung",
    "V": "Soziales, Jugend und Gesundheit",
    "VI": "Hoch- und Tiefbau",
    "VII": "Stadtentwicklung und Baurecht",
    "VIII": None,
}
REFERAT_ZEILE = re.compile(
    r"^(VL|VIII|VII|VI|V|IV|III|II|I)\s+([\d.]+)\s+([\d.]+)\s+(-?[\d.]+-?)$"
)


def lies_anlage1(pfad):
    """Verwaltungshaushalt-/Vermoegenshaushalt-Festsetzung und die
    Referats-Budgets aus dem Fliesstext."""
    with pdfplumber.open(pfad) as pdf:
        text = "\n".join((s.extract_text() or "") for s in pdf.pages)

    def _find(muster):
        m = re.search(muster, text)
        if not m:
            sys.exit(f"Anlage 1: Muster nicht gefunden: {muster!r}")
        return _zahl(m.group(1).replace(" ", ""))

    vwh_einnahmen = _find(r"Einnahmen mit\s+([\d.]+)\s*Euro")
    vwh_ausgaben = _find(r"Ausgaben mit\s+([\d.]+)\s*Euro")
    vmh = _find(r"Vermögenshaushalt\s+in den Einnahmen\s+und Ausgaben mit\s+([\d.]+)\s*Euro")
    kredit = _find(r"Kreditaufnahmen für Investitionen[^\d]+?([\d.]+)\s*Euro")

    # "Gesamt" steht zweimal im Dokument (Verwaltungshaushalt insgesamt UND
    # die Referats-Budgets) — nur die Zeilen ab "2. Budgets" durchsuchen,
    # sonst matcht die falsche (fruehere) Gesamt-Zeile zuerst.
    ab_budgets = list(_bereinigte_zeilen(text[text.index("2. Budgets"):]))
    referate = []
    summe_gedruckt = None
    for z in ab_budgets:
        m = REFERAT_ZEILE.match(z)
        if m:
            referate.append({"code": m.group(1), "einnahmen": _zahl(m.group(2)), "ausgaben": _zahl(m.group(3))})
            continue
        m = re.match(r"^Gesamt\s+([\d.]+)\s+([\d.]+)\s+-?[\d.]+-?$", z)
        if m and summe_gedruckt is None:
            summe_gedruckt = (_zahl(m.group(1)), _zahl(m.group(2)))

    if len(referate) != 9:
        sys.exit(f"Anlage 1: {len(referate)}/9 Referate gefunden (erwartet: VL, I-VIII)")
    if summe_gedruckt is None:
        sys.exit("Anlage 1: Gesamt-Zeile der Referats-Budgets nicht gefunden")
    summe_e = sum(r["einnahmen"] for r in referate)
    summe_a = sum(r["ausgaben"] for r in referate)
    if (summe_e, summe_a) != summe_gedruckt:
        sys.exit(
            f"Anlage 1: Referate summieren zu ({summe_e}, {summe_a}), "
            f"aber die Gesamt-Zeile nennt {summe_gedruckt} — Pruefsumme fehlgeschlagen."
        )

    return {
        "verwaltungshaushalt_einnahmen": vwh_einnahmen,
        "verwaltungshaushalt_ausgaben": vwh_ausgaben,
        "vermoegenshaushalt_einnahmen": vmh,
        "vermoegenshaushalt_ausgaben": vmh,
        "zuschussbedarf": vwh_ausgaben - vwh_einnahmen,
        "kreditaufnahme_investitionen": kredit,
    }, referate


def _abschnitt(zeilen, start, ende):
    """Zeilen zwischen der Ueberschrift `start` und `ende` (beides Regex,
    per re.match). Inhaltsverzeichnis-Zeilen ("5.1 Schuldenstand .....36")
    werden als Ueberschrift uebersprungen, sonst landete man im Verzeichnis
    statt im Text."""
    def _ist(z, muster):
        return re.match(muster, z) and "..." not in z

    try:
        i = next(n for n, z in enumerate(zeilen) if _ist(z, start))
    except StopIteration:
        sys.exit(f"Anlage 5: Abschnitt {start!r} nicht gefunden")
    j = next((n for n in range(i + 1, len(zeilen)) if _ist(zeilen[n], ende)), None)
    if j is None:
        sys.exit(f"Anlage 5: Ende von Abschnitt {start!r} ({ende!r}) nicht gefunden")
    return zeilen[i + 1:j]


def _pruefe(bedingung, meldung):
    if not bedingung:
        sys.exit(f"Anlage 5: {meldung} — Pruefung fehlgeschlagen, moeglicherweise Wasserzeichen-Fehler.")


def lies_anlage5(pfad):
    """
    Finanzlage aus dem Vorbericht (Anlage 5): Schuldenstand des
    Kernhaushalts, Schulden je Einwohner im Vergleich, allgemeine Ruecklage,
    Schulden der Kommunalunternehmen und Schuldendienst. Die Kameralistik
    selbst weist nichts davon aus (siehe haushalt.html, "Wo es hakt") — der
    Vorbericht ist die einzige Stelle im Haushaltsplan, die es tut.

    Der Vorbericht ist Fliesstext mit eingestreuten Tabellen, und das
    "Entwurf"-Wasserzeichen schiebt Einzelbuchstaben auch mitten in Woerter
    ("Krednitaufnahme", "Vnoraussichtlicher"). Jede Tabelle wird deshalb
    gegen ihre eigene Arithmetik geprueft (Anfangsstand + Zugang - Abgang =
    Endstand, Zunahme = Differenz der Staende, Schulden / Einwohner = pro
    Kopf); bei Abweichung bricht das Skript ab.
    """
    with pdfplumber.open(pfad) as pdf:
        text = "\n".join((s.extract_text() or "") for s in pdf.pages)
    zeilen = list(_bereinigte_zeilen(text))
    BETRAG = r"[\d.]+,\d{2}"
    _betrag = _zahl

    def _ganzzahl(tok):
        return Decimal(tok.replace(".", ""))

    # --- Einwohner (1.1), fuer Pro-Kopf-Werte auf der Seite ---
    einwohner = {}
    for z in _abschnitt(zeilen, r"1\.1 Bevölkerungsentwicklung", r"1\.2 Stadtgebiet"):
        m = re.match(r"^(\d{4})\b.*?(\d{2,3}\.\d{3})$", z)
        if m:
            einwohner[int(m.group(1))] = _ganzzahl(m.group(2))
    m = re.search(r"Amtlicher Einwohnerstand am 31\.12\.(\d{4}) \(aktuellster Stand\) = ([\d.]+)", text)
    _pruefe(m, "Amtlicher Einwohnerstand nicht gefunden")
    einwohner_jahr, einwohner_stichtag = int(m.group(1)), _ganzzahl(m.group(2))
    _pruefe(einwohner.get(einwohner_jahr) == einwohner_stichtag,
            f"Einwohner {einwohner_jahr}: Tabelle {einwohner.get(einwohner_jahr)} "
            f"vs. Stichtag {einwohner_stichtag}")

    # --- Schuldenstand Kernhaushalt (5.1) ---
    abschnitt = _abschnitt(zeilen, r"5\.1 Schuldenstand des Kernhaushaltes",
                           r"Schuldenstand Kernhaushalt am Jahresende")
    schulden = []
    for z in abschnitt:
        m = re.match(r"^(\d{4})\s+(\*+\))?\s*([\d.]+)\s+(?:\*+\)\s*)?([+-]?[\d.]+)$", z)
        if m:
            schulden.append({
                "jahr": int(m.group(1)),
                "stand": _ganzzahl(m.group(3)),
                "veraenderung": _ganzzahl(m.group(4)),
                # *) Rechenergebnis, **) vorlaeufiges Rechenergebnis
                "art": "vorlaeufig" if m.group(2) == "**)" else "ergebnis",
            })
    _pruefe(len(schulden) >= 2, f"nur {len(schulden)} Zeilen Schuldenstand gefunden")
    for vorher, nachher in zip(schulden, schulden[1:]):
        _pruefe(nachher["jahr"] == vorher["jahr"] + 1, f"Schuldenstand: Jahre nicht lueckenlos ({vorher['jahr']}, {nachher['jahr']})")
        _pruefe(nachher["stand"] - vorher["stand"] == nachher["veraenderung"],
                f"Schuldenstand {nachher['jahr']}: Differenz passt nicht zur Zunahme")

    def _einzeln(muster):
        treffer = [re.match(muster, z) for z in abschnitt]
        treffer = [t for t in treffer if t]
        _pruefe(len(treffer) == 1, f"{muster!r}: {len(treffer)} statt genau 1 Treffer")
        return treffer[0]

    kredit_neu = _ganzzahl(_einzeln(r"^vorgesehene Kreditaufnahme\s+\+([\d.]+)$").group(1))
    # Steht im PDF allein auf einer Zeile zwischen dem umbrochenen Text
    # "Kreditaufnahme aus noch verfuegbarer / Kreditermaechtigung <Vorjahr>".
    kredit_rest = _ganzzahl(_einzeln(r"^\+([\d.]+)$").group(1))
    tilgung = _ganzzahl(_einzeln(r"^vorgesehene Tilgung\s+-([\d.]+)$").group(1))
    m = _einzeln(r"^vorauss\. Schuldenstand Ende (\d{4})\s+([\d.]+)$")
    plan_jahr, plan_stand = int(m.group(1)), _ganzzahl(m.group(2))
    _pruefe(plan_jahr == schulden[-1]["jahr"] + 1, "Planjahr des Schuldenstands folgt nicht auf das letzte Ist-Jahr")
    _pruefe(schulden[-1]["stand"] + kredit_neu + kredit_rest - tilgung == plan_stand,
            f"Schuldenstand {plan_jahr}: Vorjahr + Kredite - Tilgung ergibt nicht {plan_stand}")
    schulden.append({"jahr": plan_jahr, "stand": plan_stand, "art": "plan"})
    for s in schulden:
        s.pop("veraenderung", None)

    # --- Schuldendienst (5.2) ---
    schuldendienst = []
    for z in _abschnitt(zeilen, r"5\.2 Entwicklung des Schuldendienstes", r"5\.3 Verschuldung"):
        m = re.match(rf"^(\d{{4}}) (Ergebnis|Haushaltsplan)\s+({BETRAG})\s+({BETRAG})\s+({BETRAG})$", z)
        if m:
            zinsen, tilg, gesamt = _betrag(m.group(3)), _betrag(m.group(4)), _betrag(m.group(5))
            _pruefe(zinsen + tilg == gesamt, f"Schuldendienst {m.group(1)}: Zinsen + Tilgung != Gesamt")
            schuldendienst.append({"jahr": int(m.group(1)),
                                   "art": "ergebnis" if m.group(2) == "Ergebnis" else "plan",
                                   "zinsen": zinsen, "tilgung": tilg})
    _pruefe(schuldendienst, "keine Zeilen zum Schuldendienst gefunden")
    sd_plan = next((s for s in schuldendienst if s["jahr"] == plan_jahr), None)
    _pruefe(sd_plan and sd_plan["tilgung"] == tilgung,
            f"Tilgung {plan_jahr}: Schuldendienst-Tabelle und Schuldenstand widersprechen sich")

    # --- Schulden je Einwohner (5.3), mit Vergleichsgruppen ---
    def _vergleich(tok):
        return None if tok == "•" else _ganzzahl(tok)

    je_einwohner = []
    for z in _abschnitt(zeilen, r"5\.3 Verschuldung des Kernhaushaltes je Einwohner",
                        r"5\.4 Verschuldung der Kommunalunternehmen"):
        m = re.match(r"^31\.12\.(\d{4})\s*(p?\*\))?\s+([\d.]+)\s+(\S+)\s+(\S+)$", z)
        if not m:
            continue
        # ohne Marke: amtliche Statistik; *) von der Stadt mit dem
        # Einwohnerstand vom Stichtag gerechnet; p*) Planung.
        art = {None: "amtlich", "*)": "berechnet", "p*)": "plan"}.get(m.group(2))
        je_einwohner.append({"jahr": int(m.group(1)), "art": art, "ingolstadt": _ganzzahl(m.group(3)),
                             "kreisfreie_staedte": _vergleich(m.group(4)),
                             "staedte_100k_200k": _vergleich(m.group(5))})
    _pruefe(len(je_einwohner) >= 5, f"nur {len(je_einwohner)} Zeilen Schulden je Einwohner gefunden")
    stand_je_jahr = {s["jahr"]: s["stand"] for s in schulden}
    for e in je_einwohner:
        if e["art"] != "amtlich" and e["jahr"] in stand_je_jahr:
            gerechnet = (stand_je_jahr[e["jahr"]] / einwohner_stichtag).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
            _pruefe(gerechnet == e["ingolstadt"],
                    f"Schulden je Einwohner {e['jahr']}: {e['ingolstadt']} gedruckt, {gerechnet} gerechnet")

    # --- Allgemeine Ruecklage (2.7 Rechnungsergebnis, 5.6 Planung) ---
    ist = _abschnitt(zeilen, r"2\.7 Stand der Allgemeinen Rücklage", r"2\.8 ")
    werte = {}
    for z in ist:
        for schluessel, muster in (("anfang", r"^Anfangsstand (\d{4})\s+(" + BETRAG + r") Euro$"),
                                   ("ende", r"^Endstand (\d{4})\s+(" + BETRAG + r") Euro$")):
            m = re.match(muster, z)
            if m:
                werte[schluessel] = (int(m.group(1)), _betrag(m.group(2)))
        m = re.match(r"^\+ Rücklagenzuführung\s+(" + BETRAG + r") Euro$", z)
        if m:
            werte["zufuehrung"] = _betrag(m.group(1))
        m = re.match(r"^- Rücklagenentnahme\s+(" + BETRAG + r") Euro$", z)
        if m:
            werte["entnahme"] = _betrag(m.group(1))
    _pruefe(len(werte) == 4, f"Ruecklage (Ist): nur {sorted(werte)} gefunden")
    _pruefe(werte["anfang"][1] + werte["zufuehrung"] - werte["entnahme"] == werte["ende"][1],
            "Ruecklage (Ist): Anfang + Zufuehrung - Entnahme != Endstand")
    ist_jahr = werte["ende"][0]
    ruecklage = [
        {"jahr": ist_jahr - 1, "stand": werte["anfang"][1], "art": "ergebnis"},
        {"jahr": ist_jahr, "stand": werte["ende"][1], "art": "ergebnis"},
    ]

    plan = _abschnitt(zeilen, r"5\.6 Allgemeine Rücklage", r"6 Finanzplanung")
    anfang, ende, zuf, entn, spaeter = {}, {}, {}, {}, []
    mindest = None
    for z in plan:
        m = re.search(r"Anfangsstand (\d{4})\s+(" + BETRAG + r") Euro$", z)
        if m:
            anfang[int(m.group(1))] = _betrag(m.group(2))
        m = re.search(r"Endstand (\d{4})\*?\s+(" + BETRAG + r") Euro$", z)
        if m:
            ende[int(m.group(1))] = _betrag(m.group(2))
        m = re.search(r"Zuführung (\d{4})\s+(" + BETRAG + r") Euro$", z)
        if m:
            zuf[int(m.group(1))] = _betrag(m.group(2))
        m = re.search(r"Entnahme (\d{4})\s+(" + BETRAG + r") Euro$", z)
        if m:
            entn[int(m.group(1))] = _betrag(m.group(2))
        m = re.match(r"^(\d{4}) Entnahme\s+(" + BETRAG + r") Euro$", z)
        if m:
            spaeter.append((int(m.group(1)), _betrag(m.group(2))))
        m = re.search(r"Mindesthöhe der Allgemeinen Rücklage\s+(" + BETRAG + r") Euro$", z)
        if m:
            mindest = _betrag(m.group(1))
    _pruefe(anfang.get(ist_jahr + 1) == werte["ende"][1],
            f"Ruecklage: Anfangsstand {ist_jahr + 1} passt nicht zum Endstand {ist_jahr}")
    planjahr_r = ist_jahr + 2
    _pruefe(planjahr_r in anfang and planjahr_r in zuf and planjahr_r in entn and planjahr_r in ende,
            f"Ruecklage {planjahr_r}: Anfang/Zufuehrung/Entnahme/Ende unvollstaendig")
    _pruefe(anfang[planjahr_r] + zuf[planjahr_r] - entn[planjahr_r] == ende[planjahr_r],
            f"Ruecklage {planjahr_r}: Anfang + Zufuehrung - Entnahme != Endstand")
    _pruefe(mindest is not None, "Mindesthoehe der Ruecklage nicht gefunden")
    ruecklage += [
        # Der voraussichtliche Anfangsstand des Planjahres ist der
        # voraussichtliche Endstand des laufenden Jahres.
        {"jahr": planjahr_r - 1, "stand": anfang[planjahr_r], "art": "vorlaeufig"},
        {"jahr": planjahr_r, "stand": ende[planjahr_r], "art": "plan"},
    ]
    if spaeter:
        letztes = max(j for j, _ in spaeter)
        _pruefe(letztes in ende, f"Ruecklage: Endstand {letztes} fehlt")
        _pruefe(ende[planjahr_r] - sum(b for _, b in spaeter) == ende[letztes],
                f"Ruecklage {letztes}: Endstand passt nicht zu den geplanten Entnahmen")
        ruecklage.append({"jahr": letztes, "stand": ende[letztes], "art": "plan"})

    # --- Schulden der Kommunalunternehmen (5.4) ---
    abschnitt = _abschnitt(zeilen, r"5\.4 Verschuldung der Kommunalunternehmen", r"5\.5 Steuerkraft")
    kommunal = []
    plan_start = None
    for n, z in enumerate(abschnitt):
        m = re.match(rf"^(\d{{4}})( \(Prognose\))?\s+({BETRAG})\s+([+-]{BETRAG})$", z)
        if m:
            kommunal.append({"jahr": int(m.group(1)), "stand": _betrag(m.group(3)),
                             "veraenderung": _zahl(m.group(4)),
                             "art": "vorlaeufig" if m.group(2) else "ergebnis"})
        if re.match(r"^\d{4} \(Plan\)$", z):
            plan_start = n
    _pruefe(len(kommunal) >= 2 and plan_start is not None, "Tabelle Kommunalunternehmen unvollstaendig")
    for vorher, nachher in zip(kommunal, kommunal[1:]):
        _pruefe(nachher["stand"] - vorher["stand"] == nachher["veraenderung"],
                f"Kommunalunternehmen {nachher['jahr']}: Differenz passt nicht zur Zu-/Abnahme")
    plan_bewegungen, plan_ende = Decimal("0"), None
    for z in abschnitt[plan_start + 1:]:
        m = re.match(rf"^vorauss\. Schuldenstand Ende (\d{{4}})\s+({BETRAG})$", z)
        if m:
            plan_ende = (int(m.group(1)), _betrag(m.group(2)))
            break
        for tok in re.findall(rf"[+-]{BETRAG}", z):
            plan_bewegungen += _zahl(tok)
    _pruefe(plan_ende is not None, "Kommunalunternehmen: geplanter Endstand nicht gefunden")
    _pruefe(kommunal[-1]["stand"] + plan_bewegungen == plan_ende[1],
            "Kommunalunternehmen: Vorjahr + Kreditaufnahme - Tilgung != geplanter Endstand")
    kommunal.append({"jahr": plan_ende[0], "stand": plan_ende[1], "art": "plan"})
    for k in kommunal:
        k.pop("veraenderung", None)

    return {
        "einwohner": {"jahr": einwohner_jahr, "anzahl": einwohner_stichtag},
        "schulden_kernhaushalt": schulden,
        "kredite_planjahr": {"jahr": plan_jahr, "neu": kredit_neu,
                             "aus_ermaechtigung_vorjahr": kredit_rest, "tilgung": tilgung},
        "schuldendienst": schuldendienst,
        "schulden_je_einwohner": je_einwohner,
        "ruecklage": ruecklage,
        "ruecklage_mindesthoehe": mindest,
        "schulden_kommunalunternehmen": kommunal,
    }


def main():
    jahre_daten = {}
    leaves_je_jahr = {}
    for jahr, id_ in sorted(ANLAGE2_JE_JAHR.items()):
        pfad = hole(id_, f"Anlage 2 {jahr}")
        print(f"Lese {jahr} ({os.path.basename(pfad)}) ...")
        hauptgruppen, summen, leaves, untergruppen = lies_anlage2(pfad, jahr)
        jahre_daten[jahr] = {"hauptgruppen": hauptgruppen, "summen": summen, "untergruppen": untergruppen}
        leaves_je_jahr[jahr] = leaves
        print(f"  OK — 10 Hauptgruppen, Pruefsummen stimmen "
              f"(Einnahmen {summen['Einnahmen'][0]:,}, Ausgaben {summen['Ausgaben'][0]:,})".replace(",", "."))

    # Zeitreihe: je Jahr das aktuellste verfuegbare Ist-Ergebnis, sonst den
    # zuletzt bekannten Ansatz. Jede Anlage 2 liefert (aktuell, vorjahr,
    # vorvorjahr_ergebnis) fuer ihr eigenes Jahr.
    #
    # Ergebnis hat immer Vorrang vor Ansatz — unabhaengig davon, in welcher
    # Reihenfolge die Jahrgaenge verarbeitet werden. Sortiert nach Jahr
    # (2023 zuerst) traegt jede Anlage 2 fuer ihr eigenes Jahr zunaechst nur
    # einen Ansatz ein; das echte Ergebnis fuer dasselbe Kalenderjahr liefert
    # erst die Anlage 2 zwei Jahrgaenge spaeter (jahr-2). Ein blosses
    # setdefault() haette diesen spaeteren, besseren Wert ignoriert, weil der
    # Ansatz-Platzhalter das Jahr da schon belegt hatte — 2022-2024 waeren
    # dauerhaft als "Ansatz" haengengeblieben, obwohl ihr Ist-Ergebnis laengst
    # vorliegt. _setze() gleicht das aus: ein Ergebnis darf jeden bestehenden
    # Ansatz ueberschreiben, aber niemals umgekehrt.
    zeitreihe = {}

    def _setze(jahr_key, eintrag):
        bestehend = zeitreihe.get(jahr_key)
        if bestehend is not None and bestehend["art"] == "ergebnis" and eintrag["art"] != "ergebnis":
            return
        zeitreihe[jahr_key] = eintrag

    def _spalte(jahr_dok, spalte, kalenderjahr, art):
        """Summen, Hauptgruppen und ZEITREIHE_POSTEN eines Kalenderjahres,
        alle aus derselben Spalte desselben Dokuments — damit Gesamtwert und
        Aufschluesselung nie aus verschiedenen Fassungen stammen."""
        d = jahre_daten[jahr_dok]
        leaves = leaves_je_jahr[jahr_dok]
        return {
            "jahr": kalenderjahr, "art": art,
            "einnahmen": d["summen"]["Einnahmen"][spalte],
            "ausgaben": d["summen"]["Ausgaben"][spalte],
            "hauptgruppen": {c: v["werte"][spalte] for c, v in sorted(d["hauptgruppen"].items())},
            "posten": {code: leaves[code]["werte"][spalte] for code in ZEITREIHE_POSTEN if code in leaves},
        }

    for jahr in jahre_daten:
        _setze(jahr - 2, _spalte(jahr, 2, jahr - 2, "ergebnis"))
        _setze(jahr, _spalte(jahr, 0, jahr, "ansatz"))
        _setze(jahr - 1, _spalte(jahr, 1, jahr - 1, "ansatz"))

    # Plan gegen Ergebnis: fuer jedes Kalenderjahr, dessen Ergebnis vorliegt
    # (Anlage 2 von jahr+2) und dessen Ansatz in der Vorjahresspalte der
    # Anlage 2 von jahr+1 steht. Bewusst diese Vorjahresspalte statt des
    # Ansatzes aus dem eigenen Haushaltsplan des Jahres: sie ist fuer alle
    # Jahre gleich verfuegbar (auch 2022, dessen eigener Plan hier fehlt) und
    # zeigt den Ansatz so, wie ihn die Stadt ein Jahr spaeter ausweist.
    plan_ergebnis = []
    for jahr in range(min(jahre_daten) - 1, max(jahre_daten) - 1):
        if jahr + 1 in jahre_daten and jahr + 2 in jahre_daten:
            plan_ergebnis.append({
                "jahr": jahr,
                "plan_aus_haushalt": jahr + 1,
                "plan": _spalte(jahr + 1, 1, jahr, "ansatz"),
                "ergebnis": _spalte(jahr + 2, 2, jahr, "ergebnis"),
            })
    for eintrag in plan_ergebnis:
        for teil in ("plan", "ergebnis"):
            eintrag[teil].pop("jahr")
            eintrag[teil].pop("art")

    pfad_a1 = hole(ANLAGE1_AKTUELL, f"Anlage 1 {AKTUELLES_JAHR}")
    print(f"Lese Anlage 1 {AKTUELLES_JAHR} ...")
    anlage1, referate = lies_anlage1(pfad_a1)
    print(f"  OK — {len(referate)} Referate, Pruefsumme gegen Gesamt-Zeile stimmt")

    # Kreuzpruefung: Anlage 1 (VWH+VmH getrennt) muss zur Gruppierungsuebersicht
    # (Summe Einnahmen/Ausgaben, VWH+VmH zusammen) passen.
    su_aktuell = jahre_daten[AKTUELLES_JAHR]["summen"]
    kontrolle_e = anlage1["verwaltungshaushalt_einnahmen"] + anlage1["vermoegenshaushalt_einnahmen"]
    kontrolle_a = anlage1["verwaltungshaushalt_ausgaben"] + anlage1["vermoegenshaushalt_ausgaben"]
    if kontrolle_e != su_aktuell["Einnahmen"][0] or kontrolle_a != su_aktuell["Ausgaben"][0]:
        sys.exit(
            "Anlage 1 und Gruppierungsuebersicht widersprechen sich: "
            f"VWH+VmH Einnahmen={kontrolle_e} vs. Summe Einnahmen={su_aktuell['Einnahmen'][0]}, "
            f"VWH+VmH Ausgaben={kontrolle_a} vs. Summe Ausgaben={su_aktuell['Ausgaben'][0]}"
        )
    print(f"  OK — Anlage 1 stimmt mit Gruppierungsuebersicht ueberein "
          f"(Zuschussbedarf Verwaltungshaushalt: {anlage1['zuschussbedarf']:,} Euro)".replace(",", "."))

    pfad_a5 = hole(ANLAGE5_AKTUELL, f"Anlage 5 {AKTUELLES_JAHR}")
    print(f"Lese Anlage 5 (Vorbericht) {AKTUELLES_JAHR} ...")
    vorbericht = lies_anlage5(pfad_a5)
    kredite = vorbericht["kredite_planjahr"]
    if kredite["jahr"] != AKTUELLES_JAHR or kredite["neu"] != anlage1["kreditaufnahme_investitionen"]:
        sys.exit(
            f"Anlage 5 und Anlage 1 widersprechen sich: Kreditaufnahme {kredite['jahr']} "
            f"{kredite['neu']} vs. Festsetzung {anlage1['kreditaufnahme_investitionen']}"
        )
    print(f"  OK — Schulden, Ruecklage und Kommunalunternehmen rechnerisch stimmig, "
          f"Kreditaufnahme {AKTUELLES_JAHR} deckt sich mit Anlage 1")

    def _dez_zu_zahl(x):
        return float(x) if x != x.to_integral_value() else int(x)

    def _json_zahlen(obj):
        """Decimal -> int/float, rekursiv durch Dicts und Listen."""
        if isinstance(obj, Decimal):
            return _dez_zu_zahl(obj)
        if isinstance(obj, dict):
            return {k: _json_zahlen(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_json_zahlen(v) for v in obj]
        return obj

    def _untergr_liste(eintraege):
        ausgabe = []
        for u in eintraege:
            eintrag = {"code": u["code"], "bezeichnung": u["bezeichnung"],
                       "ansatz": _dez_zu_zahl(u["werte"][0])}
            gruppe = u.get("gruppe")
            if gruppe:
                eintrag["gruppe"] = {"code": gruppe["code"], "bezeichnung": gruppe["bezeichnung"]}
            ausgabe.append(eintrag)
        return ausgabe

    def _hg_dict(hauptgruppen, untergruppen):
        # Hauptgruppen 5 und 6 teilen sich im Originaldokument einen
        # Abschnitt (siehe parse_detail_abschnitte) — beide bekommen
        # dieselbe Untergruppen-Liste und einen Verweis aufeinander, damit
        # die Seite die zwei Balken zu einem zusammenfassen kann.
        kombi_5_6 = untergruppen.get("5_6")
        ergebnis = {}
        for c, v in hauptgruppen.items():
            eintrag = {
                "bezeichnung": v["bezeichnung"],
                "ansatz": _dez_zu_zahl(v["werte"][0]),
                "ansatz_vorjahr": _dez_zu_zahl(v["werte"][1]),
                "ergebnis_vorvorjahr": _dez_zu_zahl(v["werte"][2]),
            }
            if c in ("5", "6") and kombi_5_6 is not None:
                eintrag["untergruppen"] = _untergr_liste(kombi_5_6)
                eintrag["zusammengefasst_mit"] = "6" if c == "5" else "5"
            elif c in untergruppen:
                eintrag["untergruppen"] = _untergr_liste(untergruppen[c])
            ergebnis[c] = eintrag
        return ergebnis

    ausgabe = {
        "erzeugt_von": "scraper/haushalt_lesen.py",
        "quelle_hinweis": (
            "Gruppierungsübersichten (Anlage 2) der Haushaltssatzungen 2023 bis 2026 sowie "
            f"Haushaltssatzung (Anlage 1) und Vorbericht (Anlage 5) {AKTUELLES_JAHR}, Stadt "
            "Ingolstadt, aus dem Ratsinfoportal. Alle Zahlen wurden gegen die gedruckten "
            "Summenzeilen der Originaldokumente geprüft."
        ),
        # Direktlinks auf genau die PDFs, aus denen geparst wurde — nicht auf
        # eine Vorlagen-Uebersichtsseite, weil sich fuer 2023 (vor dem
        # Scraper-Zeitraum ab November 2023) keine kvonr ermitteln liess.
        "quellen": {
            "anlage2_je_jahr": {
                str(jahr): BASIS.format(id=id_) for jahr, id_ in sorted(ANLAGE2_JE_JAHR.items())
            },
            "anlage1_aktuell": BASIS.format(id=ANLAGE1_AKTUELL),
            "anlage5_vorbericht_aktuell": BASIS.format(id=ANLAGE5_AKTUELL),
        },
        "aktuelles_jahr": AKTUELLES_JAHR,
        "jahre": {
            str(jahr): {
                "hauptgruppen": _hg_dict(d["hauptgruppen"], d["untergruppen"]),
                "summe_einnahmen": _dez_zu_zahl(d["summen"]["Einnahmen"][0]),
                "summe_ausgaben": _dez_zu_zahl(d["summen"]["Ausgaben"][0]),
            }
            for jahr, d in jahre_daten.items()
        },
        "zeitreihe": _json_zahlen(sorted(zeitreihe.values(), key=lambda x: x["jahr"])),
        "zeitreihe_posten": ZEITREIHE_POSTEN,
        "plan_ergebnis": _json_zahlen(plan_ergebnis),
        "vorbericht_aktuell": _json_zahlen(vorbericht),
        "verwaltungs_vermoegenshaushalt_aktuell": {
            k: _dez_zu_zahl(v) for k, v in anlage1.items()
        },
        "referate_aktuell": [
            {
                "code": r["code"],
                "name": REFERAT_NAMEN.get(r["code"]),
                "einnahmen": _dez_zu_zahl(r["einnahmen"]),
                "ausgaben": _dez_zu_zahl(r["ausgaben"]),
                "zuschussbedarf": _dez_zu_zahl(r["ausgaben"] - r["einnahmen"]),
            }
            for r in referate
        ],
        "auswahl_untergruppen": {
            code: {"bezeichnung": INTERESSANTE_CODES[code],
                   "ansatz_" + str(AKTUELLES_JAHR): _dez_zu_zahl(leaves_je_jahr[AKTUELLES_JAHR][code]["werte"][0])}
            for code in INTERESSANTE_CODES
            if code in leaves_je_jahr.get(AKTUELLES_JAHR, {})
        },
    }

    os.makedirs(DATEN_VZ, exist_ok=True)
    ziel_json = os.path.join(DATEN_VZ, "haushalt.json")
    with open(ziel_json, "w", encoding="utf-8") as f:
        json.dump(ausgabe, f, ensure_ascii=False, indent=2)

    ziel_js = os.path.join(DATEN_VZ, "haushalt.js")
    with open(ziel_js, "w", encoding="utf-8") as f:
        f.write("window.HAUSHALT_DATEN = ")
        json.dump(ausgabe, f, ensure_ascii=False)
        f.write(";\n")

    print(f"\nGeschrieben: {ziel_json}")
    print(f"Geschrieben: {ziel_js}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
