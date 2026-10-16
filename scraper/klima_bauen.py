#!/usr/bin/env python3
"""
Baut die Daten fuer klima.html aus offenen Quellen.

    python3 klima_bauen.py          # Downloads aus dem Cache, wenn vorhanden
    python3 klima_bauen.py --neu    # alles frisch holen

Quellen (alle frei abrufbar, keine Zugangsdaten):

- Deutscher Wetterdienst, Climate Data Center: Tageswerte der Station
  Koesching (02700, seit 1961), historisch + aktuell. Dieselbe Station und
  dieselbe Referenzperiode wie im Fortschrittsbericht 2025 der Stadt, damit
  die Zahlen dort und hier zusammenpassen.
- Marktstammdatenregister (Bundesnetzagentur): alle Solaranlagen und
  Stromspeicher mit Gemeindeschluessel 09161000.
- Ladesaeulenregister (Bundesnetzagentur): oeffentliche Ladepunkte in der
  kreisfreien Stadt Ingolstadt.
- data/klima_bericht.json: von Hand gepflegte Werte aus den
  Fortschrittsberichten der Stabsstelle Klima (THG-Bilanz, Ziele).

Gespeichert werden nur Summen je Jahr. Das Marktstammdatenregister liefert
auch (maskierte) Betreiberangaben einzelner Anlagen, die landen weder im
Cache-Ergebnis noch in data/.

Ergebnis: data/klima.json und data/klima.js (window.KLIMA_DATEN).
"""

import argparse
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile

HIER = os.path.dirname(os.path.abspath(__file__))
DATEN_VZ = os.path.join(os.path.dirname(HIER), "data")
CACHE = os.path.join(HIER, ".cache", "klima")

sys.path.insert(0, HIER)
from ris_ingolstadt import USER_AGENT, PAUSE_SEKUNDEN  # noqa: E402

GEMEINDESCHLUESSEL = "09161000"

DWD_STATION = "02700"
DWD_STATION_NAME = "Kösching"
DWD_BASIS = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl"
# Wie im Fortschrittsbericht 2025 (dort: 8,2 °C Jahresmittel 1971-2000).
REFERENZ = (1971, 2000)

MASTR_URL = (
    "https://www.marktstammdatenregister.de/MaStR/Einheit/EinheitJson/"
    "GetErweiterteOeffentlicheEinheitStromerzeugung"
    "?sort=&page={seite}&pageSize={groesse}&group="
    "&filter=Gemeindeschl%C3%BCssel~eq~%27{ags}%27~and~Energietr%C3%A4ger~eq~%27{traeger}%27"
)
MASTR_SOLAR, MASTR_SPEICHER = 2495, 2496
MASTR_SEITE = 2000

LADE_SEITE = "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/Ladesaeulenkarte/start.html"
LADE_KREIS = "Kreisfreie Stadt Ingolstadt"


def lade(url, cache_name, neu, timeout=180):
    """Laedt url nach .cache/klima/cache_name, ausser es liegt schon dort."""
    os.makedirs(CACHE, exist_ok=True)
    pfad = os.path.join(CACHE, cache_name)
    if os.path.exists(pfad) and not neu:
        print(f"  (Cache) {cache_name}")
        with open(pfad, "rb") as f:
            return f.read()
    anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(anfrage, timeout=timeout) as antwort:
            roh = antwort.read()
    except (urllib.error.URLError, TimeoutError) as fehler:
        sys.exit(f"Fehler beim Laden von {url}: {fehler}")
    with open(pfad, "wb") as f:
        f.write(roh)
    print(f"  {len(roh) // 1024:>7} KB  {cache_name}")
    time.sleep(PAUSE_SEKUNDEN)
    return roh


# ---------------------------------------------------------------- DWD

def dwd_tageswerte(neu):
    """Alle Tageswerte der Station als {datum: (tmk, txk, tnk, rsk)}."""
    tage = {}
    for teil in ("historical", "recent"):
        listing = lade(f"{DWD_BASIS}/{teil}/", f"dwd_{teil}.html", neu).decode("latin1")
        treffer = re.findall(rf'tageswerte_KL_{DWD_STATION}_[^"]+?\.zip', listing)
        if not treffer:
            sys.exit(f"DWD: keine Datei fuer Station {DWD_STATION} in {teil}")
        name = sorted(set(treffer))[-1]
        roh = lade(f"{DWD_BASIS}/{teil}/{name}", name, neu)
        with zipfile.ZipFile(io.BytesIO(roh)) as z:
            produkt = [n for n in z.namelist() if n.startswith("produkt_klima_tag")][0]
            text = z.read(produkt).decode("latin1")
        zeilen = csv.reader(io.StringIO(text), delimiter=";")
        kopf = [k.strip() for k in next(zeilen)]
        idx = {k: kopf.index(k) for k in ("MESS_DATUM", "TMK", "TXK", "TNK", "RSK")}
        for z in zeilen:
            if len(z) < len(kopf):
                continue
            def wert(k):
                w = float(z[idx[k]])
                return None if w == -999 else w
            # "recent" ueberschreibt "historical" fuer ueberlappende Tage.
            tage[z[idx["MESS_DATUM"]].strip()] = (wert("TMK"), wert("TXK"), wert("TNK"), wert("RSK"))
    return tage


def dwd_jahre(tage):
    jahre = {}
    for datum, (tmk, txk, tnk, rsk) in tage.items():
        j = jahre.setdefault(int(datum[:4]), {
            "tage": 0, "tmk": [], "heisse_tage": 0, "sommertage": 0,
            "tropennaechte": 0, "frosttage": 0, "eistage": 0, "niederschlag": 0.0,
            "letzter_tag": datum,
        })
        j["tage"] += 1
        j["letzter_tag"] = max(j["letzter_tag"], datum)
        if tmk is not None:
            j["tmk"].append(tmk)
        if txk is not None:
            j["heisse_tage"] += txk >= 30
            j["sommertage"] += txk >= 25
            j["eistage"] += txk < 0
        if tnk is not None:
            j["tropennaechte"] += tnk >= 20
            j["frosttage"] += tnk < 0
        if rsk is not None:
            j["niederschlag"] += rsk

    reihe = []
    for jahr in sorted(jahre):
        j = jahre[jahr]
        # Ein Jahr gilt als vollstaendig, wenn hoechstens 10 Tagesmittel fehlen.
        vollstaendig = len(j["tmk"]) >= 355
        reihe.append({
            "jahr": jahr,
            "vollstaendig": vollstaendig,
            "bis": f"{j['letzter_tag'][6:8]}.{j['letzter_tag'][4:6]}.{j['letzter_tag'][:4]}",
            "mitteltemperatur": round(sum(j["tmk"]) / len(j["tmk"]), 2) if vollstaendig else None,
            "heisse_tage": j["heisse_tage"],
            "sommertage": j["sommertage"],
            "tropennaechte": j["tropennaechte"],
            "frosttage": j["frosttage"],
            "eistage": j["eistage"],
            "niederschlag_mm": round(j["niederschlag"]),
        })

    ref = [z for z in reihe if REFERENZ[0] <= z["jahr"] <= REFERENZ[1] and z["mitteltemperatur"] is not None]
    if len(ref) < 25:
        sys.exit(f"DWD: nur {len(ref)} vollstaendige Jahre in der Referenzperiode")
    def mittel(feld):
        return round(sum(z[feld] for z in ref) / len(ref), 2)
    referenz = {
        "von": REFERENZ[0], "bis": REFERENZ[1],
        "mitteltemperatur": mittel("mitteltemperatur"),
        "heisse_tage": mittel("heisse_tage"),
        "sommertage": mittel("sommertage"),
        "tropennaechte": mittel("tropennaechte"),
        "frosttage": mittel("frosttage"),
    }
    for z in reihe:
        z["abweichung"] = (round(z["mitteltemperatur"] - referenz["mitteltemperatur"], 2)
                           if z["mitteltemperatur"] is not None else None)
    return reihe, referenz


# ---------------------------------------------------------------- MaStR

def mastr_datum(wert):
    """'/Date(1513641600000)/' -> date, oder None."""
    if not wert:
        return None
    m = re.search(r"-?\d+", wert)
    return dt.datetime.fromtimestamp(int(m.group()) / 1000, dt.timezone.utc).date() if m else None


def mastr_einheiten(traeger, neu):
    einheiten, seite = [], 1
    while True:
        url = MASTR_URL.format(seite=seite, groesse=MASTR_SEITE, ags=GEMEINDESCHLUESSEL, traeger=traeger)
        roh = lade(url, f"mastr_{traeger}_{seite}.json", neu)
        daten = json.loads(roh)
        # Nur die Felder behalten, die fuer Summen gebraucht werden.
        for e in daten["Data"]:
            einheiten.append({
                "status": e.get("BetriebsStatusName"),
                "inbetrieb": mastr_datum(e.get("InbetriebnahmeDatum")),
                "stillgelegt": mastr_datum(e.get("EndgueltigeStilllegungDatum")),
                "kw": e.get("Bruttoleistung") or 0,
                "kwh": e.get("NutzbareSpeicherkapazitaet") or 0,
                "art": e.get("ArtDerSolaranlageBezeichnung") or "",
            })
        if seite * MASTR_SEITE >= daten["Total"]:
            break
        seite += 1
    if len(einheiten) != daten["Total"]:
        sys.exit(f"MaStR {traeger}: {len(einheiten)} geladen, {daten['Total']} gemeldet")
    return einheiten


def solar_kategorie(art):
    a = art.lower()
    if "stecker" in a:
        return "stecker"
    if "frei" in a:
        return "freiflaeche"
    return "dach"  # Gebaeude, Gebaeude + sonstige bauliche Anlagen, Laermschutzwand ...


def mastr_reihe(einheiten, mit_kategorie):
    """Zubau je Inbetriebnahmejahr und Bestand am Jahresende."""
    aktiv = [e for e in einheiten if e["inbetrieb"] and e["status"] != "In Planung"]
    jahre = range(min(e["inbetrieb"].year for e in aktiv), dt.date.today().year + 1)
    reihe = []
    for jahr in jahre:
        ende = dt.date(jahr, 12, 31)
        bestand = [e for e in aktiv if e["inbetrieb"] <= ende and not (e["stillgelegt"] and e["stillgelegt"] <= ende)]
        zubau = [e for e in aktiv if e["inbetrieb"].year == jahr]
        z = {
            "jahr": jahr,
            "zubau_anzahl": len(zubau),
            "zubau_kw": round(sum(e["kw"] for e in zubau)),
            "bestand_anzahl": len(bestand),
            "bestand_kw": round(sum(e["kw"] for e in bestand)),
            "bestand_kwh": round(sum(e["kwh"] for e in bestand)),
        }
        if mit_kategorie:
            for kat in ("dach", "freiflaeche", "stecker"):
                z[f"zubau_kw_{kat}"] = round(sum(e["kw"] for e in zubau if solar_kategorie(e["art"]) == kat))
                z[f"bestand_kw_{kat}"] = round(sum(e["kw"] for e in bestand if solar_kategorie(e["art"]) == kat))
                z[f"zubau_anzahl_{kat}"] = sum(1 for e in zubau if solar_kategorie(e["art"]) == kat)
        reihe.append(z)
    return reihe


# ---------------------------------------------------------------- Ladesaeulen

def ladepunkte(neu):
    seite = lade(LADE_SEITE, "bnetza_ladesaeulen.html", neu).decode("utf-8", "replace")
    csvs = re.findall(r'href="([^"]+Ladesaeulenregister[^"]*\.csv)"', seite)
    if not csvs:
        sys.exit("Ladesaeulenregister: kein CSV-Link auf der Seite gefunden")
    url = sorted(csvs)[-1]
    roh = lade(url, os.path.basename(url), neu, timeout=600)
    text = roh.decode("utf-8-sig", "replace")
    stand = re.search(r"Letzte Aktualisierung vom: (\d\d\.\d\d\.\d{4})", text)
    zeilen = list(csv.reader(io.StringIO(text), delimiter=";"))
    k = next(i for i, z in enumerate(zeilen) if z and z[0] == "Ladeeinrichtungs-ID")
    kopf = zeilen[k]
    ix = {n: kopf.index(n) for n in ("Kreis/kreisfreie Stadt", "Status", "Art der Ladeeinrichtung",
                                      "Anzahl Ladepunkte", "Inbetriebnahmedatum")}
    jahre = {}
    gesamt = {"einrichtungen": 0, "ladepunkte": 0, "schnell": 0}
    for z in zeilen[k + 1:]:
        if len(z) < len(kopf) or z[ix["Kreis/kreisfreie Stadt"]] != LADE_KREIS:
            continue
        if z[ix["Status"]] != "In Betrieb":
            continue
        punkte = int(z[ix["Anzahl Ladepunkte"]] or 0)
        schnell = "Schnell" in z[ix["Art der Ladeeinrichtung"]]
        gesamt["einrichtungen"] += 1
        gesamt["ladepunkte"] += punkte
        gesamt["schnell"] += punkte if schnell else 0
        jahr = int(z[ix["Inbetriebnahmedatum"]][-4:])
        jahre[jahr] = jahre.get(jahr, 0) + punkte
    if not gesamt["einrichtungen"]:
        sys.exit(f"Ladesaeulenregister: keine Zeilen fuer '{LADE_KREIS}'")
    bestand, reihe = 0, []
    for jahr in range(min(jahre), max(jahre) + 1):
        bestand += jahre.get(jahr, 0)
        reihe.append({"jahr": jahr, "zubau": jahre.get(jahr, 0), "bestand": bestand})
    return {"stand": stand.group(1) if stand else None, "quelle": url, **gesamt, "reihe": reihe}


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--neu", action="store_true", help="Cache ignorieren, alles neu laden")
    args = ap.parse_args()

    print("DWD Tageswerte:")
    klima, referenz = dwd_jahre(dwd_tageswerte(args.neu))

    print("Marktstammdatenregister:")
    solar = mastr_einheiten(MASTR_SOLAR, args.neu)
    speicher = mastr_einheiten(MASTR_SPEICHER, args.neu)

    print("Ladesaeulenregister:")
    laden = ladepunkte(args.neu)

    with open(os.path.join(DATEN_VZ, "klima_bericht.json"), encoding="utf-8") as f:
        bericht = json.load(f)

    daten = {
        "erzeugt_von": "scraper/klima_bauen.py",
        "erzeugt_am": dt.date.today().isoformat(),
        "klima": {
            "station": DWD_STATION_NAME, "station_id": DWD_STATION,
            "referenz": referenz, "jahre": klima,
            "quelle": f"{DWD_BASIS}/",
        },
        "solar": {
            "reihe": mastr_reihe(solar, True),
            "in_planung_kw": round(sum(e["kw"] for e in solar if e["status"] == "In Planung")),
            "quelle": "https://www.marktstammdatenregister.de/MaStR/Einheit/Einheiten/ErweiterteOeffentlicheEinheitenuebersicht",
        },
        "speicher": {
            "reihe": mastr_reihe(speicher, False),
            "quelle": "https://www.marktstammdatenregister.de/MaStR/Einheit/Einheiten/ErweiterteOeffentlicheEinheitenuebersicht",
        },
        "laden": laden,
        "bericht": bericht,
    }

    os.makedirs(DATEN_VZ, exist_ok=True)
    with open(os.path.join(DATEN_VZ, "klima.json"), "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATEN_VZ, "klima.js"), "w", encoding="utf-8") as f:
        f.write("window.KLIMA_DATEN = " + json.dumps(daten, ensure_ascii=False) + ";\n")

    letzte = [z for z in klima if z["vollstaendig"]][-1]
    s = daten["solar"]["reihe"][-1]
    print(f"\nKlima: {len(klima)} Jahre, zuletzt vollstaendig {letzte['jahr']} "
          f"({letzte['mitteltemperatur']} °C, {letzte['heisse_tage']} heisse Tage)")
    print(f"Solar: {s['bestand_anzahl']} Anlagen, {s['bestand_kw']} kWp")
    print(f"Ladepunkte: {laden['ladepunkte']} (Stand {laden['stand']})")
    print("Geschrieben: data/klima.json, data/klima.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())
