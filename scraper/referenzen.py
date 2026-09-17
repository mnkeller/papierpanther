#!/usr/bin/env python3
"""
Der eindeutige Schluessel eines Tagesordnungspunkts — an einer Stelle
definiert, damit alle Skripte denselben Punkt meinen.

Normalfall: "<quelle>:<sitzungs-id>#<top-nr>", z. B. "stadt:13534#Ö 2".

Sonderfall: Aenderungsantraege, "hierzu"-Stellungnahmen der Verwaltung und
manche reinen Berichtspunkte tragen im Portal keine eigene Ö-Nummer, nur die
blosse Zeichenkette "Ö". Mehrere solche TOPs pro Sitzung sind haeufig (bis zu
28 in einer einzigen Stadtratssitzung). Wer daraus einen Ref baut, ohne die
Position zu beruecksichtigen, bekommt "<quelle>:<id>#Ö" fuer alle gleichzeitig
— in jedem ref-gekeyten Dict ueberschreiben sie sich dann gegenseitig, und nur
der zuletzt verarbeitete TOP bleibt erreichbar. Das ist genau so passiert
(siehe git-Historie): 295 Stadtratspunkte — darunter echte Fraktionsantraege
mit eigenem Beschluss — waren dadurch weder kuratierbar noch als offen
erkennbar.

Deshalb bekommt jeder blosse "Ö"-TOP hier stattdessen seine Position
innerhalb der Sitzung als Kennung, z. B. "Ö3" fuer den dritten. Das Format
(kein Leerzeichen zwischen Buchstabe und Zahl) kann nie mit einer echten
Portal-Nummer kollidieren — die hat immer ein Leerzeichen ("Ö 5", "Ö 35.1").
"""

import re


def bare_positionen(sitzung):
    """{id(top): laufende Nummer} fuer TOPs mit blosser 'Ö'-Nummer, in der
    Reihenfolge ihres Auftretens in der Tagesordnung (1-basiert)."""
    positionen = {}
    n = 0
    for top in sitzung["tops"]:
        if top["nr"].strip() == "Ö":
            n += 1
            positionen[id(top)] = n
    return positionen


def top_ref(quelle, sitzung, top, bare_pos=None):
    """Eindeutiger Ref-String fuer einen TOP. bare_pos optional vorab per
    bare_positionen(sitzung) berechnen, wenn viele TOPs derselben Sitzung
    hintereinander verarbeitet werden — sonst wird es hier je Aufruf neu
    bestimmt (kostet eine Traversierung der Tagesordnung)."""
    nr = top["nr"]
    if nr.strip() == "Ö":
        if bare_pos is None:
            bare_pos = bare_positionen(sitzung)
        nr = f"Ö{bare_pos[id(top)]}"
    return f'{quelle}:{sitzung["id"]}#{nr}'


# Gremien, die keine Buergerinformation im Sinne dieser Seite sind: Aufsichts-
# und Verwaltungsraete staedtischer Gesellschaften, Zweckverbaende, Beiraete.
# Ihre Tagesordnungen sind formal oeffentlich, aber inhaltlich Unternehmens-
# steuerung — Jahresabschluesse, Beteiligungsberichte, Gremienbesetzungen.
#
# Lebt hier statt in entwuerfe_bauen.py, weil auch ris_ingolstadt.py sie
# braucht (Filter fuer kommende Termine ohne Tagesordnung) — und die unterste
# Schicht darf nicht von einem hoeheren Skript importieren.
BETEILIGUNG_MUSTER = re.compile(
    r"Aufsichtsrat|Verwaltungsrat|\bAöR\b|GmbH|Zweckverband|Verbandsversammlung|"
    r"Beirat|Kommission|Gesellschafterversammlung",
    re.I,
)


def ist_beteiligung(gremium):
    return bool(BETEILIGUNG_MUSTER.search(gremium or ""))
