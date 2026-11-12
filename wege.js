/* Deine 15 Minuten — Erreichbarkeitskarte (wege.html), Blick 1 „Mein Punkt“.

   Die Wegsuche laeuft hier im Browser auf data/wege-netz.js: Jede Person hat
   eigene Kantengewichte, die bei jedem Umschalten neu berechnet werden.
   Nichts verlaesst das Geraet: Klickpunkt, Adresse und Standort bleiben im
   Browser, die Karte kommt aus karten/ingolstadt.pmtiles von derselben Domain.
   Plan und Herkunft der Werte: WEGE-KARTE-PLAN.md, Abschnitt 4. */
import * as maplibregl from './vendor/maplibre-gl/maplibre-gl.mjs';

/* ------------------------------------------------------------- Konstanten
   Werte je Person und Bedingung stehen in data/wege-personen.json (von Hand
   gepflegt); scraper/wege_bauen.py rechnet mit derselben Datei die Minuten je
   Zensus-Zelle und legt sie als data/wege-personen.js bei. Auf der Seite unter
   „So rechnet die Karte“ als Tabelle offengelegt. */
const WP = window.WEGE_PERSONEN || { personen: {}, reihe: [], bedingungen: {}, allgemein: {} };
const PERSONEN = WP.personen, REIHE = WP.reihe, BEDINGUNGEN = WP.bedingungen;
const BANK_ABSTAND_M = WP.allgemein.bank_abstand_m;   // Ältere: alle 300 m ohne Bank +bank_s Sekunden
const BANK_NAEHE_M = WP.allgemein.bank_naehe_m;       // eine Bank so nah an der Kante zählt als Rastplatz
const STUFEN_MIN = WP.allgemein.stufen_min;
const EINRASTEN_M = WP.allgemein.einrasten_m;         // weiter weg vom nächsten Weg rechnet die Karte nicht
const PUFFER_M = 40;          // erreichbare Fläche: so weit links und rechts des Wegs
const RASTER_M = 12;          // Zellgröße der Fläche
const GLAETTEN_M = 70;        // Rand mit runden Ecken: Flächen werden um so viel geschlossen
const LOCH_MIN_M2 = 40000;    // kleinere Löcher füllen
const INSEL_MIN_M2 = 10000;   // kleinere Inseln weglassen
const START = { lat: 48.76338, lon: 11.42514, name: 'Rathausplatz' };
const NAMEN_LEICHT = {
  supermarkt: 'Supermarkt', baecker: 'Bäcker', apotheke: 'Apotheke', hausarzt: 'Haus-Arzt',
  grundschule: 'Grund-Schule', kita: 'Kita', spielplatz: 'Spiel-Platz', park: 'Park',
  haltestelle: 'Halte-Stelle', bank_post: 'Bank oder Post', buecherei: 'Bücherei', toilette: 'Toilette',
  bolzplatz: 'Bolz-Platz', eis: 'Eis-Diele', kirche: 'Kirche', bahnhof: 'Bahnhof', touristinfo: 'Touristen-Info',
  cafe: 'Café', sehenswuerdigkeit: 'Sehens-Wertes', hotel: 'Hotel', trinkwasser: 'Trink-Wasser', treff: 'Treff-Punkt',
};
const ALPHA_STUFEN = [0.3, 0.2, 0.22];    // Einzelansicht: 5, 10, 15 Minuten, liegen uebereinander
const ALPHA_SCHICHT = 0.36;               // Schichtbild: Fläche (die oberste Schicht deckt)
const ALPHA_RAND = 0.9;                   // Schichtbild: Rand jeder Fläche in ihrer Farbe
const BUS_STUFEN_MIN = [10, 20, 30];      // Mit Bus: Ringe
const BUS_WARTEN_MAX_MIN = 10;            // Warten an der Haltestelle: halber Takt, höchstens so viel
const BUS_FARBE = '#8a5a00';
const BUS_RASTER_M = 24, BUS_RASTER_MAX = 700;

/* ------------------------------------------------------- Leichte Sprache */
const LS_KEY_LEICHT = 'papierpanther-leichte-sprache';
let leicht = false;
try { leicht = localStorage.getItem(LS_KEY_LEICHT) === '1'; } catch (err) { /* Storage kann gesperrt sein */ }
const t = (normal, l) => (leicht ? l : normal);

const NETZ = window.WEGE_NETZ, ORTE = window.WEGE_ORTE, BEZ = window.BEZIRKE, ADR = window.WEGE_ADRESSEN;
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------- Ortsnahe Meter
   Wie in scraper/wege_bauen.py: x nach Osten, y nach Norden. */
const LAT0 = 48.7630, LON0 = 11.4250;
const P0 = LAT0 * Math.PI / 180;
const MY = 111132.92 - 559.82 * Math.cos(2 * P0) + 1.175 * Math.cos(4 * P0);
const MX = 111412.84 * Math.cos(P0) - 93.5 * Math.cos(3 * P0);
const zuXY = (lat, lon) => [(lon - LON0) * MX, (lat - LAT0) * MY];
const zuGeo = (x, y) => [LON0 + x / MX, LAT0 + y / MY];   // [lon, lat] wie GeoJSON

/* ------------------------------------------------------------ Netz lesen */
const nK = NETZ.knoten_anzahl, nE = NETZ.kanten_anzahl;
const kx = new Float64Array(nK), ky = new Float64Array(nK);
{
  let a = 0, b = 0;
  for (let i = 0; i < nK; i++) {
    a += NETZ.lat[i]; b += NETZ.lon[i];
    const p = zuXY(a / 1e5, b / 1e5);
    kx[i] = p[0]; ky[i] = p[1];
  }
}
const von = new Int32Array(nE), nach = new Int32Array(nE), laenge = new Float32Array(nE), typ = new Uint16Array(nE);
{
  let v = 0;
  for (let e = 0; e < nE; e++) {
    v += NETZ.von[e];
    von[e] = v; nach[e] = v + NETZ.nach[e]; laenge[e] = NETZ.laenge[e]; typ[e] = NETZ.typ[e];
  }
}

/* Merkmale je Kantentyp (wenige hundert Typen) als Zahlenfelder, damit die
   Gewichte je Person in einem Durchlauf entstehen. */
const C = NETZ.codes;
const code = (feld, wert) => C[feld].indexOf(wert);
const wert = (tt, feld) => tt[NETZ.kanten_felder.indexOf(feld)];
const KLASSE = (k) => code('klasse', k);
const HAUPT = new Set([KLASSE('sammelstrasse'), KLASSE('hauptstrasse')]);
const PFADE = new Set([KLASSE('fussweg'), KLASSE('pfad'), KLASSE('feldweg')]);
const DUNKEL_OHNE_TAG = new Set([KLASSE('pfad'), KLASSE('feldweg')]);
const GESICHERT = new Set([code('querung', 'ampel'), code('querung', 'zebrastreifen')]);
const TYPEN = NETZ.kanten_typen.map((tt) => {
  const klasse = wert(tt, 'klasse'), lit = wert(tt, 'lit'), benannt = wert(tt, 'benannt') === 1;
  return {
    gesperrt: wert(tt, 'gesperrt') === 1,
    treppe: wert(tt, 'treppe') === 1,
    haupt: HAUPT.has(klasse),
    ohneGehweg: HAUPT.has(klasse) && [code('gehweg', 'nein'), code('gehweg', 'separat')].includes(wert(tt, 'gehweg')),
    gesicherteQuerung: GESICHERT.has(wert(tt, 'querung')),
    dunkel: lit === code('lit', 'nein') || (lit === code('lit', 'unbekannt') && DUNKEL_OHNE_TAG.has(klasse)),
    schatten: wert(tt, 'schatten') === 1,
    rollstuhlNein: wert(tt, 'rollstuhl') === code('rollstuhl', 'nein'),
    unbefestigt: wert(tt, 'oberflaeche') === code('oberflaeche', 'unbefestigt'),
    pflaster: wert(tt, 'oberflaeche') === code('oberflaeche', 'pflaster_grob'),
    unbenannterPfad: PFADE.has(klasse) && !benannt,
    unbenannteZufahrt: klasse === KLASSE('erschliessung') && !benannt,
  };
});

const KN = (feld) => NETZ.knoten_felder.indexOf(feld);
const querungKnoten = new Uint8Array(nK), bordsteinHoch = new Uint8Array(nK), barriere = new Uint8Array(nK);
for (let i = 0, k = 0; i < NETZ.knoten_merkmale.length; i += 2) {
  k += NETZ.knoten_merkmale[i];
  const tt = NETZ.knoten_typen[NETZ.knoten_merkmale[i + 1]];
  querungKnoten[k] = tt[KN('querung')];
  bordsteinHoch[k] = tt[KN('bordstein')] === code('bordstein', 'hoch') ? 1 : 0;
  barriere[k] = tt[KN('barriere')];
}
const AMPEL = code('querung', 'ampel');

// Nachbarschaft als kompakte Liste (CSR): je Knoten die Kanten, die ihn beruehren
const adjStart = new Int32Array(nK + 1), adjKante = new Int32Array(2 * nE);
for (let e = 0; e < nE; e++) { adjStart[von[e] + 1]++; adjStart[nach[e] + 1]++; }
for (let i = 0; i < nK; i++) adjStart[i + 1] += adjStart[i];
{
  const pos = adjStart.slice(0, nK);
  for (let e = 0; e < nE; e++) { adjKante[pos[von[e]]++] = e; adjKante[pos[nach[e]]++] = e; }
}
// Je Knoten: wie viele Haupt-/Sammelstrassen-Kanten ihn beruehren, eine davon als Bezugsrichtung
const hauptGrad = new Uint8Array(nK), hauptBezug = new Int32Array(nK).fill(-1);
for (let k = 0; k < nK; k++) {
  for (let i = adjStart[k]; i < adjStart[k + 1]; i++) {
    const e = adjKante[i];
    if (TYPEN[typ[e]].haupt) { hauptGrad[k]++; if (hauptBezug[k] < 0) hauptBezug[k] = e; }
  }
}
const anderes = (e, k) => (von[e] === k ? nach[e] : von[e]);
// Seite des Punktes q, von a in Richtung b gesehen: 0 links, 1 rechts
const seite = (a, b, qx, qy) => ((kx[b] - kx[a]) * (qy - ky[a]) - (ky[b] - ky[a]) * (qx - kx[a]) > 0 ? 0 : 1);

/* Gitter fuer „naechster Punkt“: Kanten (zum Einrasten) und Baenke */
const MASCHE = 50;
const schluessel = (i, j) => i * 100003 + j;
const kantenGitter = new Map();
for (let e = 0; e < nE; e++) {
  if (TYPEN[typ[e]].gesperrt) continue;
  const a = von[e], b = nach[e];
  for (let i = Math.floor(Math.min(kx[a], kx[b]) / MASCHE); i <= Math.floor(Math.max(kx[a], kx[b]) / MASCHE); i++) {
    for (let j = Math.floor(Math.min(ky[a], ky[b]) / MASCHE); j <= Math.floor(Math.max(ky[a], ky[b]) / MASCHE); j++) {
      const s = schluessel(i, j);
      if (!kantenGitter.has(s)) kantenGitter.set(s, []);
      kantenGitter.get(s).push(e);
    }
  }
}

/* Naechste Kante, die fuer diese Person begehbar ist (endliche Kosten). */
function naechsteKante(x, y, kosten) {
  const ci = Math.floor(x / MASCHE), cj = Math.floor(y / MASCHE);
  let best = { d: EINRASTEN_M, e: -1, f: 0 };
  for (let r = 0; r <= EINRASTEN_M / MASCHE + 1; r++) {
    if (best.e >= 0 && best.d < (r - 1) * MASCHE) break;
    for (let i = ci - r; i <= ci + r; i++) {
      for (let j = cj - r; j <= cj + r; j++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        for (const e of kantenGitter.get(schluessel(i, j)) || []) {
          if (kosten && kosten[e] === Infinity) continue;
          const a = von[e], b = nach[e];
          const dx = kx[b] - kx[a], dy = ky[b] - ky[a], q = dx * dx + dy * dy;
          const f = q === 0 ? 0 : Math.max(0, Math.min(1, ((x - kx[a]) * dx + (y - ky[a]) * dy) / q));
          const d = Math.hypot(kx[a] + f * dx - x, ky[a] + f * dy - y);
          if (d < best.d) best = { d, e, f };
        }
      }
    }
  }
  return best.e >= 0 ? best : null;
}

// Kanten ohne Bank in der Naehe (fuer die aeltere Person)
const ohneBank = new Uint8Array(nE).fill(1);
{
  const SITZ = ORTE.kategorien.findIndex((k) => k.id === 'sitzbank');
  const g = new Map();
  for (const o of ORTE.orte) {
    if (o[0] !== SITZ) continue;
    const p = zuXY(o[2], o[3]);
    const s = schluessel(Math.floor(p[0] / MASCHE), Math.floor(p[1] / MASCHE));
    if (!g.has(s)) g.set(s, []);
    g.get(s).push(p);
  }
  const nahe = (x, y) => {
    const ci = Math.floor(x / MASCHE), cj = Math.floor(y / MASCHE);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      for (const p of g.get(schluessel(i, j)) || []) if (Math.hypot(p[0] - x, p[1] - y) <= BANK_NAEHE_M) return true;
    }
    return false;
  };
  for (let e = 0; e < nE; e++) {
    const a = von[e], b = nach[e];
    if (nahe(kx[a], ky[a]) || nahe(kx[b], ky[b]) || nahe((kx[a] + kx[b]) / 2, (ky[a] + ky[b]) / 2)) ohneBank[e] = 0;
  }
}

/* Orte je Kategorie */
const KAT = {};
ORTE.kategorien.forEach((k, i) => { KAT[k.id] = { ...k, nr: i, orte: [] }; });
ORTE.orte.forEach((o, i) => { KAT[ORTE.kategorien[o[0]].id].orte.push(i); });
const HBF = (() => {
  const o = KAT.bahnhof.orte.map((i) => ORTE.orte[i]).find((x) => /hbf|hauptbahnhof/i.test(x[1]));
  return o ? { lat: o[2], lon: o[3] } : { lat: 48.74439, lon: 11.43741 };
})();

/* ----------------------------------------------------------- Wegsuche */
function gewichte(person, bed) {
  const p = PERSONEN[person], v = p.kmh / 3.6;
  const kante = new Float32Array(nE), knoten = new Float32Array(nK);
  for (let e = 0; e < nE; e++) {
    const m = TYPEN[typ[e]];
    if (m.gesperrt || (m.treppe && p.treppe_s === null) || (p.hindernisse_gesperrt && m.rollstuhlNein)
      || (p.gehweg_noetig && m.ohneGehweg) || (bed.nacht && m.dunkel && p.nachts_gesperrt)) { kante[e] = Infinity; continue; }
    let s = laenge[e] / v;
    if (p.faktor_unbefestigt && m.unbefestigt) s *= p.faktor_unbefestigt;
    if (p.faktor_pflaster && m.pflaster) s *= p.faktor_pflaster;
    if (p.faktor_unbenannt && m.unbenannterPfad) s *= p.faktor_unbenannt;
    if (p.faktor_unbenannt_zufahrt && m.unbenannteZufahrt) s *= p.faktor_unbenannt_zufahrt;
    if (bed.nacht && m.dunkel) s *= BEDINGUNGEN.nacht.faktor_unbeleuchtet;
    if (bed.hitze && !m.schatten) s *= BEDINGUNGEN.hitze.faktor_ohne_schatten;
    if (m.treppe && p.treppe_s) s += p.treppe_s;
    if (p.bank_s && ohneBank[e]) s += laenge[e] / BANK_ABSTAND_M * p.bank_s;
    kante[e] = s;
  }
  for (let i = 0; i < nK; i++) {
    knoten[i] = (p.hindernisse_gesperrt && (bordsteinHoch[i] || barriere[i])) ? Infinity
      : querungKnoten[i] === AMPEL ? p.ampel_s : 0;
  }
  return { v, kante, knoten, abbiegen: !!p.nur_gesichert_queren };
}

class Haufen {   // Minimum-Heap fuer (Zeit, Nummer)
  constructor() { this.z = []; this.k = []; }
  get leer() { return this.z.length === 0; }
  rein(z, k) {
    const Z = this.z, K = this.k;
    let i = Z.length; Z.push(z); K.push(k);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (Z[p] <= z) break;
      Z[i] = Z[p]; K[i] = K[p]; i = p;
    }
    Z[i] = z; K[i] = k;
  }
  raus() {
    const Z = this.z, K = this.k, z0 = Z[0], k0 = K[0], z = Z.pop(), k = K.pop(), n = Z.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && Z[c + 1] < Z[c]) c++;
        if (Z[c] >= z) break;
        Z[i] = Z[c]; K[i] = K[c]; i = c;
      }
      Z[i] = z; K[i] = k;
    }
    this.zuletzt = k0;
    return z0;
  }
}

/* Startpunkte der Wegsuche: {e, f, d, t0, sx, sy} liegt auf Kante e (Anteil f ab von[e],
   d Meter neben dem Weg), {k, t0} beginnt an Knoten k. t0: Sekunden, die schon vergangen sind. */

/* Dijkstra ueber Knoten (alle Personen ohne Abbiegeregel). */
function sucheKnoten(g, starts, grenze) {
  const zeit = new Float64Array(nK).fill(Infinity), besucht = [];
  const h = new Haufen();
  const setze = (k, z) => { if (z < zeit[k] && z <= grenze) { zeit[k] = z; h.rein(z, k); } };
  for (const st of starts) {
    if (st.k !== undefined) { setze(st.k, st.t0); continue; }
    const e = st.e, weg = (st.t0 || 0) + st.d / g.v;
    setze(von[e], weg + st.f * g.kante[e]);
    setze(nach[e], weg + (1 - st.f) * g.kante[e]);
  }
  while (!h.leer) {
    const z = h.raus(), k = h.zuletzt;
    if (z > zeit[k]) continue;
    besucht.push(k);
    for (let i = adjStart[k]; i < adjStart[k + 1]; i++) {
      const kante = adjKante[i], m = von[kante] === k ? nach[kante] : von[kante];
      const nz = z + g.kante[kante] + g.knoten[m];
      if (nz < zeit[m] && nz <= grenze) { zeit[m] = nz; h.rein(nz, m); }
    }
  }
  return { zeit, besucht };
}

/* Dijkstra ueber gerichtete Kanten mit Strassenseite (Kind). Haupt- und
   Sammelstrassen sind oft nur als Mittellinie eingetragen; wer auf ihr
   entlanggeht, ist auf einer Seite (links/rechts der Laufrichtung). Auf die
   andere Seite wechseln — also die Strasse queren — darf das Kind nur an einem
   Knoten mit Ampel oder Zebrastreifen; danach ist die Seite frei waehlbar.
   Zustand: (Kante, Richtung, Seite), Seite 0 links, 1 rechts, 2 frei/abseits.
   Ein Start an einem Knoten (Haltestelle) laeuft mit freier Seite los. */
function sucheKanten(g, starts, grenze) {
  const zs = new Float64Array(6 * nE).fill(Infinity);
  const zeit = new Float64Array(nK).fill(Infinity), besucht = [];
  const h = new Haufen();
  const rein = (e, rueck, sei, z) => {   // rueck 0: bei nach[e] angekommen, 1: bei von[e]
    const s = (2 * e + rueck) * 3 + sei;
    if (z < zs[s] && z <= grenze) { zs[s] = z; h.rein(z, s); }
  };
  for (const st of starts) {
    if (st.k !== undefined) {
      const n = st.k;
      if (st.t0 > grenze) continue;
      if (st.t0 < zeit[n]) { if (zeit[n] === Infinity) besucht.push(n); zeit[n] = st.t0; }
      for (let i = adjStart[n]; i < adjStart[n + 1]; i++) {
        const f = adjKante[i], m = anderes(f, n);
        if (g.kante[f] !== Infinity) rein(f, von[f] === n ? 0 : 1, 2, st.t0 + g.kante[f] + g.knoten[m]);
      }
      continue;
    }
    const e0 = st.e, weg = (st.t0 || 0) + st.d / g.v;
    const s0 = TYPEN[typ[e0]].haupt ? seite(von[e0], nach[e0], st.sx, st.sy) : 2;
    rein(e0, 0, s0, weg + (1 - st.f) * g.kante[e0]);
    rein(e0, 1, s0 === 2 ? 2 : 1 - s0, weg + st.f * g.kante[e0]);
  }
  while (!h.leer) {
    const z = h.raus(), s = h.zuletzt;
    if (z > zs[s]) continue;
    const sei = s % 3, ed = (s - sei) / 3, e = ed >> 1, n = ed & 1 ? von[e] : nach[e], vor = anderes(e, n);
    if (z < zeit[n]) { if (zeit[n] === Infinity) besucht.push(n); zeit[n] = z; }
    const te = TYPEN[typ[e]], knotenFrei = GESICHERT.has(querungKnoten[n]);
    for (let i = adjStart[n]; i < adjStart[n + 1]; i++) {
      const f = adjKante[i];
      if (f === e) continue;
      const nz = z + g.kante[f], m = anderes(f, n);
      if (nz === Infinity) continue;
      const tf = TYPEN[typ[f]], frei = knotenFrei || te.gesicherteQuerung || tf.gesicherteQuerung;
      let neu = 2;
      if (!te.haupt && !tf.haupt) {
        // ueber einen Strassenknoten hinweg: nur auf derselben Seite der Strasse
        if (hauptGrad[n] && !frei) {
          const r = hauptBezug[n], b = anderes(r, n);
          if (seite(n, b, kx[vor], ky[vor]) !== seite(n, b, kx[m], ky[m])) continue;
        }
      } else if (!te.haupt && tf.haupt) {
        neu = frei ? 2 : seite(n, m, kx[vor], ky[vor]);           // von der Seite, aus der man kommt
      } else if (te.haupt && tf.haupt) {
        neu = frei || sei === 2 ? 2 : hauptGrad[n] === 2 ? sei : seite(n, m, kx[vor], ky[vor]);
      } else if (!frei && sei !== 2 && seite(vor, n, kx[m], ky[m]) !== sei) {
        continue;                                                  // Abbiegen auf die andere Strassenseite
      }
      rein(f, von[f] === n ? 0 : 1, neu, nz + g.knoten[m]);
    }
  }
  return { zeit, besucht };
}

function naechsteOrte(g, zeit, ziele, ohne, grenze = STUFEN_MIN[2] * 60) {
  const aus = {};
  for (const kat of ziele) {
    let best = null;
    for (const oi of KAT[kat].orte) {
      if (oi === ohne) continue;
      const o = ORTE.orte[oi];
      for (let j = 0; j < o[5].length; j++) {
        const z = zeit[o[5][j]] + o[6][j] / g.v;
        if (z <= grenze && (!best || z < best.z)) best = { z, oi };
      }
    }
    aus[kat] = best;
  }
  return aus;
}

/* ------------------------------------------------------------ Flaechen
   Zu Fuss: ein gemeinsames quadratisches Raster um den Startpunkt, gross genug
   fuer die schnellste Person samt Puffer und Glaettung. Mit Bus: ein Raster
   ueber alles, was in 30 Minuten erreicht wird. Raster: {z, x0, y1, n, m}
   mit n x n Zellen zu m Metern, x0/y1 linke obere Ecke. */
const R_MAX = 5.0 / 3.6 * STUFEN_MIN[2] * 60 + PUFFER_M + GLAETTEN_M + 4 * RASTER_M;
const N = Math.ceil(2 * R_MAX / RASTER_M);
const _punkte = {};
function punkteFuer(m) {   // Zellversatz im Puffer mit Abstand, je Zellweite
  if (!_punkte[m]) {
    const r = Math.ceil(PUFFER_M / m), aus = [];
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const d = Math.hypot(di, dj) * m;
      if (d <= PUFFER_M) aus.push([di, dj, d]);
    }
    _punkte[m] = aus;
  }
  return _punkte[m];
}
const rasterNeu = (x0, y1, n, m) => ({ z: new Float32Array(n * n).fill(Infinity), x0, y1, n, m });
const zelleVon = (r, x, y) => Math.floor((r.y1 - y) / r.m) * r.n + Math.floor((x - r.x0) / r.m);

function tupfe(r, g, x, y, t0) {
  const ci = Math.floor((x - r.x0) / r.m), cj = Math.floor((r.y1 - y) / r.m), n = r.n;
  for (const [di, dj, d] of punkteFuer(r.m)) {
    const i = ci + di, j = cj + dj;
    if (i < 0 || j < 0 || i >= n || j >= n) continue;
    const tt = t0 + d / g.v, c = j * n + i;
    if (tt < r.z[c]) r.z[c] = tt;
  }
}
function tupfeWege(r, g, zeit, besucht, grenze) {
  const fertig = new Uint8Array(nE);
  for (const k of besucht) {
    for (let i = adjStart[k]; i < adjStart[k + 1]; i++) {
      const e = adjKante[i];
      if (fertig[e]) continue;
      fertig[e] = 1;
      const ce = g.kante[e];
      if (ce === Infinity) continue;
      const a = von[e], b = nach[e], za = zeit[a], zb = zeit[b];
      const schritte = Math.max(1, Math.ceil(Math.hypot(kx[b] - kx[a], ky[b] - ky[a]) / r.m));
      for (let s = 0; s <= schritte; s++) {
        const f = s / schritte, tt = Math.min(za + f * ce, zb + (1 - f) * ce);
        if (tt <= grenze) tupfe(r, g, kx[a] + f * (kx[b] - kx[a]), ky[a] + f * (ky[b] - ky[a]), tt);
      }
    }
  }
}
function zeitRaster(g, such, sx, sy) {
  const r = rasterNeu(sx - R_MAX, sy + R_MAX, N, RASTER_M);
  tupfeWege(r, g, such.zeit, such.besucht, STUFEN_MIN[2] * 60);
  tupfe(r, g, sx, sy, 0);
  return r;
}

/* Quadrierter Abstand jeder Zelle zur naechsten Zelle mit maske == 1
   (Felzenszwalb/Huttenlocher, zwei Durchlaeufe zu je einer Dimension). */
const GROSS = 1e20;
let _f, _d, _v, _zz, _platz = 0;
function abstand1(n) {
  let k = 0; _v[0] = 0; _zz[0] = -GROSS; _zz[1] = GROSS;
  for (let q = 1; q < n; q++) {
    let s = ((_f[q] + q * q) - (_f[_v[k]] + _v[k] * _v[k])) / (2 * q - 2 * _v[k]);
    while (s <= _zz[k]) { k--; s = ((_f[q] + q * q) - (_f[_v[k]] + _v[k] * _v[k])) / (2 * q - 2 * _v[k]); }
    k++; _v[k] = q; _zz[k] = s; _zz[k + 1] = GROSS;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (_zz[k + 1] < q) k++;
    _d[q] = (q - _v[k]) * (q - _v[k]) + _f[_v[k]];
  }
}
function abstand2(maske, n) {
  if (n > _platz) { _platz = n; _f = new Float64Array(n); _d = new Float64Array(n); _v = new Int32Array(n); _zz = new Float64Array(n + 1); }
  const d = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) _f[j] = maske[j * n + i] ? 0 : GROSS;
    abstand1(n);
    for (let j = 0; j < n; j++) d[j * n + i] = _d[j];
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) _f[i] = d[j * n + i];
    abstand1(n);
    for (let i = 0; i < n; i++) d[j * n + i] = _d[i];
  }
  return d;
}

/* Zusammenhaengende Gebiete (4er-Nachbarschaft) mit wert: zu kleine umschalten.
   Bei Loechern zaehlen nur Gebiete, die den Rand nicht beruehren. */
let _schlange = new Int32Array(0);
function kleineGebiete(maske, wert, minZellen, behalte, n) {
  if (_schlange.length < n * n) _schlange = new Int32Array(n * n);
  const gesehen = new Uint8Array(n * n);
  for (let s = 0; s < n * n; s++) {
    if (gesehen[s] || maske[s] !== wert) continue;
    let kopf = 0, ende = 0, rand = false, haltet = false;
    _schlange[ende++] = s; gesehen[s] = 1;
    while (kopf < ende) {
      const c = _schlange[kopf++], i = c % n, j = (c / n) | 0;
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) rand = true;
      if (c === behalte) haltet = true;
      if (i > 0 && !gesehen[c - 1] && maske[c - 1] === wert) { gesehen[c - 1] = 1; _schlange[ende++] = c - 1; }
      if (i < n - 1 && !gesehen[c + 1] && maske[c + 1] === wert) { gesehen[c + 1] = 1; _schlange[ende++] = c + 1; }
      if (j > 0 && !gesehen[c - n] && maske[c - n] === wert) { gesehen[c - n] = 1; _schlange[ende++] = c - n; }
      if (j < n - 1 && !gesehen[c + n] && maske[c + n] === wert) { gesehen[c + n] = 1; _schlange[ende++] = c + n; }
    }
    if (ende < minZellen && !rand && !haltet) for (let k = 0; k < ende; k++) maske[_schlange[k]] = 1 - wert;
  }
}

/* Maske glaetten: schliessen (Rand mit runden Ecken), kleine Loecher fuellen,
   kleine Inseln weglassen. Die Insel mit dem Startpunkt bleibt immer; mit Bus
   bleiben auch die Inseln um die Haltestellen (behalte = -1: keine). */
function glaette(maske, startZelle, n, m, inselnLassen) {
  const r2 = (GLAETTEN_M / m) ** 2;
  const zu = abstand2(maske, n), dil = new Uint8Array(n * n);
  for (let c = 0; c < n * n; c++) dil[c] = zu[c] <= r2 ? 0 : 1;   // dil = 1 heisst: ausserhalb der Erweiterung
  const weg = abstand2(dil, n), aus = new Uint8Array(n * n);
  for (let c = 0; c < n * n; c++) aus[c] = weg[c] > r2 ? 1 : 0;
  const zelle = m * m;
  kleineGebiete(aus, 0, LOCH_MIN_M2 / zelle, -1, n);
  if (!inselnLassen) kleineGebiete(aus, 1, INSEL_MIN_M2 / zelle, startZelle, n);
  return aus;
}

function stufenMasken(raster, grenzenS, startZelle, inselnLassen) {
  const n = raster.n;
  if (startZelle === undefined) startZelle = Math.floor(n / 2) * n + Math.floor(n / 2);
  const masken = grenzenS.map((g) => {
    const m = new Uint8Array(n * n);
    for (let c = 0; c < n * n; c++) m[c] = raster.z[c] <= g ? 1 : 0;
    return glaette(m, startZelle, n, raster.m, inselnLassen);
  });
  for (let k = masken.length - 2; k >= 0; k--) {   // innere Stufe liegt immer in der aeusseren
    for (let c = 0; c < n * n; c++) masken[k][c] &= masken[k + 1][c];
  }
  return masken;
}

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* Bild im Rastermass auf die Kartenleinwand: vergroessert und weich gezeichnet,
   damit der Rand nicht in Zellstufen erscheint. Grosse Raster (Bus) nur doppelt. */
const ROH = document.createElement('canvas');
function aufLeinwand(leinwand, bild, n) {
  const faktor = n > 400 ? 2 : 3;
  ROH.width = n; ROH.height = n;
  ROH.getContext('2d').putImageData(bild, 0, 0);
  leinwand.width = n * faktor; leinwand.height = n * faktor;
  const ctx = leinwand.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'blur(' + faktor * 0.6 + 'px)';
  ctx.drawImage(ROH, 0, 0, leinwand.width, leinwand.height);
  ctx.filter = 'none';
}

/* Schichten von unten nach oben ueber einander legen (Alpha-Mischung). */
function male(leinwand, schichten, n) {
  const bild = new ImageData(n, n), d = bild.data;
  const r = new Float32Array(n * n), gg = new Float32Array(n * n), b = new Float32Array(n * n), a = new Float32Array(n * n);
  for (const s of schichten) {
    const [cr, cg, cb] = hexRGB(s.farbe), al = s.alpha;
    for (let c = 0; c < n * n; c++) {
      if (!s.maske[c]) continue;
      const neu = al + a[c] * (1 - al);
      r[c] = (cr * al + r[c] * a[c] * (1 - al)) / neu;
      gg[c] = (cg * al + gg[c] * a[c] * (1 - al)) / neu;
      b[c] = (cb * al + b[c] * a[c] * (1 - al)) / neu;
      a[c] = neu;
    }
  }
  for (let c = 0; c < n * n; c++) {
    if (!a[c]) continue;
    d[4 * c] = r[c]; d[4 * c + 1] = gg[c]; d[4 * c + 2] = b[c]; d[4 * c + 3] = Math.round(a[c] * 255);
  }
  aufLeinwand(leinwand, bild, n);
}

/* Schichtbild: Jede Zelle zeigt die oberste (kleinste) Flaeche, die sie
   bedeckt; jede Flaeche bekommt einen schmalen Rand in ihrer Farbe. So bleibt
   die Mitte hell und jede Person auch dort sichtbar, wo Flaechen sich kreuzen. */
function maleSchichten(leinwand, schichten, n) {
  const bild = new ImageData(n, n), d = bild.data;
  const setze = (c, rgb, al) => { d[4 * c] = rgb[0]; d[4 * c + 1] = rgb[1]; d[4 * c + 2] = rgb[2]; d[4 * c + 3] = Math.round(al * 255); };
  for (const s of schichten) {
    const rgb = hexRGB(s.farbe);
    for (let c = 0; c < n * n; c++) if (s.maske[c]) setze(c, rgb, ALPHA_SCHICHT);
  }
  for (const s of schichten) {
    const rgb = hexRGB(s.farbe), m = s.maske;
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const c = j * n + i;
      if (m[c] && (!m[c - 1] || !m[c + 1] || !m[c - n] || !m[c + n])) setze(c, rgb, ALPHA_RAND);
    }
  }
  aufLeinwand(leinwand, bild, n);
}

function ecken(raster) {
  const x1 = raster.x0 + raster.n * raster.m, y0 = raster.y1 - raster.n * raster.m;
  return [zuGeo(raster.x0, raster.y1), zuGeo(x1, raster.y1), zuGeo(x1, y0), zuGeo(raster.x0, y0)];
}

/* ------------------------------------------------------------ Mit Bus
   Fussweg zur Haltestelle + Warten (halber Takt, hoechstens 10 Minuten) +
   Fahrt (mit 5 Minuten je Umstieg, aus scraper/oepnv_bauen.py) + Fussweg vom
   Ziel-Halt. Grenze 30 Minuten. Fahrplan: VGI/INVG, CC BY-SA 3.0 DE. */
function rechneBus(person, sx, sy) {
  const B = window.WEGE_BUS, fid = zustand.bus.fenster;
  const g = gewichte(person, zustand.bed);
  const einstieg = naechsteKante(sx, sy, g.kante);
  if (!einstieg) return null;
  const grenze = BUS_STUFEN_MIN[2] * 60 + 1, suche = g.abbiegen ? sucheKanten : sucheKnoten;
  const fuss = suche(g, [{ ...einstieg, t0: 0, sx, sy }], grenze);
  const H = B.haltestellen, takt = B.takt[fid], ziele = B.ziele[fid];
  const an = new Float64Array(H.length).fill(Infinity);
  let genutzt = 0;
  H.forEach((h, o) => {
    if (takt[o] === 255 || !h[3].length) return;
    const hin = Math.min(...h[3].map((k, j) => fuss.zeit[k] + h[4][j] / g.v));
    if (hin > grenze) return;
    genutzt++;
    const ab = hin + Math.min(takt[o] / 2, BUS_WARTEN_MAX_MIN) * 60;
    let d = 0;
    for (const v of ziele[o]) {
      d += Math.floor(v / 32);
      const t = ab + (v % 32) * 60;
      if (t < an[d]) an[d] = t;
    }
  });
  const starts = [];
  H.forEach((h, d) => { if (an[d] < grenze) h[3].forEach((k, j) => starts.push({ k, t0: an[d] + h[4][j] / g.v })); });
  const weiter = starts.length ? suche(g, starts, grenze) : { zeit: new Float64Array(nK).fill(Infinity), besucht: [] };
  const zeit = new Float64Array(nK);
  for (let k = 0; k < nK; k++) zeit[k] = Math.min(fuss.zeit[k], weiter.zeit[k]);
  const besucht = Array.from(new Set(fuss.besucht.concat(weiter.besucht)));
  let x0 = sx, x1 = sx, y0 = sy, y1 = sy;
  for (const k of besucht) {
    if (zeit[k] > grenze) continue;
    if (kx[k] < x0) x0 = kx[k]; if (kx[k] > x1) x1 = kx[k];
    if (ky[k] < y0) y0 = ky[k]; if (ky[k] > y1) y1 = ky[k];
  }
  const rand = PUFFER_M + GLAETTEN_M + 3 * BUS_RASTER_M, laenge = Math.max(x1 - x0, y1 - y0) + 2 * rand;
  const n = Math.min(BUS_RASTER_MAX, Math.ceil(laenge / BUS_RASTER_M)), m = laenge / n;
  const raster = rasterNeu(x0 - rand, y1 + rand, n, m);
  tupfeWege(raster, g, zeit, besucht, BUS_STUFEN_MIN[2] * 60);
  tupfe(raster, g, sx, sy, 0);
  return { g, fuss: fuss.zeit, zeit, raster, startZelle: zelleVon(raster, sx, sy), genutzt, angefahren: starts.length / 2 };
}

/* -------------------------------------------------------------- Bezirke */
function imRing(lon, lat, ring) {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}
function bezirkVon(lat, lon) {
  for (const f of BEZ.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) {
      if (imRing(lon, lat, p[0]) && !p.slice(1).some((loch) => imRing(lon, lat, loch))) return f.properties;
    }
  }
  return null;
}

/* ------------------------------------------------------------ Adressen */
const norm = (s) => s.toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/str\.?(?=\s|$)/g, 'strasse').replace(/[^a-z0-9]+/g, ' ').trim();
const STRASSEN = ADR.strassen.map((s) => {
  const nummern = s[1].split('|'), lat = [], lon = [];
  let a = 0, b = 0;
  for (let i = 0; i < nummern.length; i++) { a += s[2][i]; b += s[3][i]; lat.push(a / 1e5); lon.push(b / 1e5); }
  return { name: s[0], schl: norm(s[0]), nummern, nkey: nummern.map((x) => norm(x).replace(/ /g, '')), lat, lon };
});

function adressVorschlaege(eingabe) {
  const m = eingabe.trim().match(/^(.*?)[\s,]*(\d+\s*[a-zA-Z]?(?:\s*-\s*\d+)?)?$/);
  const strasse = norm(m ? m[1] : eingabe), nr = m && m[2] ? norm(m[2]).replace(/ /g, '') : '';
  if (strasse.length < 3) return [];
  const treffer = STRASSEN.filter((s) => s.schl.includes(strasse))
    .sort((a, b) => (b.schl.startsWith(strasse) - a.schl.startsWith(strasse)) || a.name.localeCompare(b.name, 'de'))
    .slice(0, 8);
  return treffer.map((s) => {
    let i = nr ? s.nkey.indexOf(nr) : -1;
    if (nr && i < 0) {   // naechstliegende Hausnummer
      const z = parseInt(nr, 10);
      i = s.nummern.reduce((best, x, k) => (Math.abs(parseInt(x, 10) - z) < Math.abs(parseInt(s.nummern[best], 10) - z) ? k : best), 0);
    }
    if (i < 0) i = Math.floor(s.nummern.length / 2);
    return { text: s.name + (nr ? ' ' + s.nummern[i] : ''), lat: s.lat[i], lon: s.lon[i] };
  });
}

/* ------------------------------------------------------------- Zustand */
const zustand = {
  start: { lat: START.lat, lon: START.lon, name: START.name },
  ansicht: 'eine', person: 'erwachsene', bed: { nacht: false, hitze: false },
  bezirk: { person: 'aeltere', kat: 'apotheke', luecken: false, nr: null },
  bus: { an: false, fenster: 'mo_frueh' },
  wenn: null,   // Ort (Index), dessen Schliessung in der Einzelansicht durchgespielt wird
};
let karte = null, kartenBereit = false, letztes = null;
const leinwand = document.createElement('canvas');
leinwand.width = leinwand.height = 1;

function rechnePerson(person, sx, sy) {
  const g = gewichte(person, zustand.bed);
  const einstieg = naechsteKante(sx, sy, g.kante);
  if (!einstieg) return null;
  const grenze = STUFEN_MIN[2] * 60 + 1;
  const such = (g.abbiegen ? sucheKanten : sucheKnoten)(g, [{ ...einstieg, t0: 0, sx, sy }], grenze);
  return { g, such, raster: zeitRaster(g, such, sx, sy) };
}

function zieleVon(person) {
  return PERSONEN[person].ziele.concat(zustand.bed.hitze ? ['trinkwasser'] : []);
}

function rechne() {
  const t0 = performance.now();
  const { lat, lon } = zustand.start;
  const [sx, sy] = zuXY(lat, lon);
  const bez = bezirkVon(lat, lon);
  if (zustand.ansicht === 'bezirk') {
    letztes = { bez, bezirk: true };
    zeigePanel();
    zeichneKarte();
    rechneBezirke();
    return;
  }
  if (zustand.ansicht === 'eine') {
    const r = rechnePerson(zustand.person, sx, sy);
    if (!r) {
      letztes = { fehler: true, bez };
    } else if (zustand.bus.an && window.WEGE_BUS) {
      const rb = rechneBus(zustand.person, sx, sy), ziele = zieleVon(zustand.person);
      const masken = stufenMasken(rb.raster, BUS_STUFEN_MIN.map((m) => m * 60), rb.startZelle, true);
      male(leinwand, masken.slice().reverse().map((m, k) => ({ maske: m, farbe: BUS_FARBE, alpha: ALPHA_STUFEN[2 - k] })), rb.raster.n);
      const ziel = (zeit, o) => Math.min(...o[3].map((k, j) => zeit[k] + o[4][j] / rb.g.v));
      letztes = { bez, raster: rb.raster, g: r.g, zeit: r.such.zeit, orte: naechsteOrte(r.g, r.such.zeit, ziele),
        bus: { orte: naechsteOrte(rb.g, rb.zeit, ziele, undefined, BUS_STUFEN_MIN[2] * 60), genutzt: rb.genutzt,
          grosse: (ORTE.grosse_ziele || []).map((o) => ({ name: o[0], fuss: ziel(rb.fuss, o), bus: ziel(rb.zeit, o) })) } };
    } else {
      const masken = stufenMasken(r.raster, STUFEN_MIN.map((m) => m * 60));
      const farbe = PERSONEN[zustand.person].farbe;
      male(leinwand, masken.slice().reverse().map((m, k) => ({ maske: m, farbe, alpha: ALPHA_STUFEN[2 - k] })), N);
      letztes = { bez, raster: r.raster, g: r.g, zeit: r.such.zeit, orte: naechsteOrte(r.g, r.such.zeit, zieleVon(zustand.person)) };
    }
  } else {
    const schichten = [];
    for (const p of REIHE) {
      const r = rechnePerson(p, sx, sy);
      if (!r) continue;
      const maske = stufenMasken(r.raster, [STUFEN_MIN[2] * 60])[0];
      let zellen = 0;
      for (let c = 0; c < N * N; c++) zellen += maske[c];
      schichten.push({ person: p, maske, farbe: PERSONEN[p].farbe, alpha: ALPHA_SCHICHT, km2: zellen * RASTER_M * RASTER_M / 1e6, raster: r.raster });
    }
    schichten.sort((a, b) => b.km2 - a.km2);   // groesste Flaeche unten
    if (schichten.length) maleSchichten(leinwand, schichten, N);
    letztes = schichten.length ? { bez, raster: schichten[0].raster, schichten } : { fehler: true, bez };
  }
  zeigePanel();
  zeichneKarte();
  $('panel').dataset.rechenzeitMs = String(Math.round(performance.now() - t0));
}

const minText = (z) => Math.max(1, Math.ceil(z / 60 - 1e-9)) + ' Min';
const katName = (kat) => (leicht ? NAMEN_LEICHT[kat] : KAT[kat].name);
const personName = (p) => t(PERSONEN[p].name, PERSONEN[p].name_l);

function zeigePanel() {
  const r = letztes;
  $('start-ort').textContent = zustand.start.name || t('Gewählter Punkt', 'Ihr Punkt');
  $('start-bezirk').textContent = r.bez
    ? t('Bezirk ' + r.bez.bezname, 'Stadt-Bezirk ' + r.bez.bezname)
    : t('außerhalb der Stadtbezirke', 'nicht in Ingolstadt');
  const ans = zustand.ansicht;
  $('einzel').hidden = ans !== 'eine';
  $('schicht').hidden = ans !== 'alle';
  $('bezirk-ansicht').hidden = ans !== 'bezirk';
  $('start-block').hidden = ans === 'bezirk';
  $('bed-block').hidden = ans === 'bezirk';
  document.querySelectorAll('[data-ansicht]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ansicht === ans ? 'true' : 'false'));
  if (ans === 'eine') zeigeListe(); else if (ans === 'alle') zeigeSchichten();
  $('hinweis-bed').innerHTML = [
    zustand.bed.nacht ? t('Nacht: Ob ein Weg beleuchtet ist, steht nur an etwa 3.200 von 17.000 Wegen. Pfade und Feldwege ohne Angabe gelten als dunkel.',
      'Nachts: Die Karte weiß oft nicht, ob ein Weg Licht hat.') : '',
    zustand.bed.hitze ? t('Hitze: Schatten ist aus Bäumen, Wald und Parks geschätzt; viele Straßenbäume fehlen in OpenStreetMap.',
      'Hitze: Die Karte schätzt, wo Schatten ist.') : '',
  ].filter(Boolean).join(' ');
}

function zeigeListe() {
  const ul = $('ziele');
  ul.innerHTML = '';
  const r = letztes;
  // Legende: so dunkel wie die uebereinanderliegenden Stufen auf der Karte
  const bus = r.bus, stufen = bus ? BUS_STUFEN_MIN : STUFEN_MIN;
  const [cr, cg, cb] = hexRGB(bus ? BUS_FARBE : PERSONEN[zustand.person].farbe);
  let a = 0;
  for (let k = 2; k >= 0; k--) {
    a = ALPHA_STUFEN[k] + a * (1 - ALPHA_STUFEN[k]);
    $('leg-' + STUFEN_MIN[k]).style.background = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + a.toFixed(2) + ')';
    $('txt-legende-' + STUFEN_MIN[k]).textContent = stufen[k] + t(' Min', ' Minuten');
  }
  zeigeBus();
  if (r.fehler) {
    const li = document.createElement('li');
    li.className = 'ziel-fehler';
    li.textContent = t('Hier ist kein begehbarer Weg in der Nähe. Bitte einen Punkt näher an einer Straße wählen.',
      'Hier ist kein Weg. Bitte tippen Sie näher an eine Straße.');
    ul.appendChild(li);
    $('ziele-summe').textContent = '';
    return;
  }
  const ziele = zieleVon(zustand.person);
  let erreicht = 0;
  for (const kat of ziele) {
    const a = r.orte[kat];
    if (a) erreicht++;
    const li = document.createElement('li');
    li.className = a ? 'ziel' : 'ziel ziel-fehlt';
    const name = document.createElement('span');
    name.className = 'ziel-kat';
    name.textContent = katName(kat);
    const was = document.createElement('span');
    was.className = 'ziel-was';
    was.textContent = a ? (ORTE.orte[a.oi][1] || katName(kat)) : t('nicht in 15 Min', 'nicht in 15 Minuten');
    const min = document.createElement('span');
    min.className = 'ziel-min';
    min.textContent = a ? minText(a.z) : '–';
    li.append(name, was, min);
    if (bus) {
      const b = bus.orte[kat], m2 = document.createElement('span');
      m2.className = 'ziel-min ziel-min-2';
      m2.textContent = b ? minText(b.z) : '–';
      m2.title = b ? t('mit Bus: ', 'mit Bus: ') + (ORTE.orte[b.oi][1] || katName(kat)) : '';
      li.appendChild(m2);
    }
    if (a && kat !== 'trinkwasser') {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'wenn-knopf';
      knopf.textContent = zustand.wenn === a.oi ? t('Zurück', 'Zurück') : t('Wenn dieser Ort schließt', 'Was ist, wenn er zu macht?');
      knopf.setAttribute('aria-pressed', zustand.wenn === a.oi ? 'true' : 'false');
      knopf.addEventListener('click', () => { zustand.wenn = zustand.wenn === a.oi ? null : a.oi; zeigeListe(); });
      li.appendChild(knopf);
      if (zustand.wenn === a.oi) li.appendChild(wennZeile(kat, a));
    }
    ul.appendChild(li);
  }
  $('ziele-summe').textContent = t(
    erreicht + ' von ' + ziele.length + ' Zielen liegen in 15 Minuten (' + personName(zustand.person) + ').',
    erreicht + ' von ' + ziele.length + ' Zielen sind nah. Nah heißt: in 15 Minuten zu Fuß.');
}

function zeigeBus() {
  const r = letztes, bus = r && r.bus, B = window.WEGE_BUS;
  $('ziele-kopf').hidden = !bus;
  $('grosse-block').hidden = !bus;
  $('hinweis-bus').innerHTML = '';
  if (!bus) return;
  const f = B.fenster.find((x) => x.id === zustand.bus.fenster);
  $('hinweis-bus').innerHTML = t(
    'Mit Bus (' + f.name + ', Fahrplan vom ' + f.stichtag.slice(6) + '.' + f.stichtag.slice(4, 6) + '.' + f.stichtag.slice(0, 4) + '): Weg zur Haltestelle, ' +
    'Warten (halber Takt, höchstens ' + BUS_WARTEN_MAX_MIN + ' Min), Fahrt mit 5 Min je Umstieg, Weg vom Ziel-Halt. ' + bus.genutzt +
    ' Haltestellen liegen zu Fuß in Reichweite.',
    'Mit Bus: Sie gehen zur Halte-Stelle. Sie warten. Sie fahren. Dann gehen Sie weiter. Alles zusammen höchstens 30 Minuten.');
  $('grosse').innerHTML = bus.grosse.map((g) => '<li><span class="ziel-kat">' + g.name + '</span><span class="ziel-min">' +
    (g.fuss <= BUS_STUFEN_MIN[2] * 60 ? minText(g.fuss) : t('über 30', 'weit')) + '</span><span class="ziel-min ziel-min-2">' +
    (g.bus <= BUS_STUFEN_MIN[2] * 60 ? minText(g.bus) : t('über 30', 'weit')) + '</span></li>').join('');
}

function zeigeSchichten() {
  const ul = $('schichten');
  ul.innerHTML = '';
  const r = letztes;
  if (r.fehler) {
    ul.innerHTML = '<li class="ziel-fehler">' + t('Hier ist kein begehbarer Weg in der Nähe.', 'Hier ist kein Weg.') + '</li>';
    return;
  }
  const flaeche = Object.fromEntries(r.schichten.map((s) => [s.person, s.km2]));
  for (const p of REIHE) {
    const li = document.createElement('li');
    const farbe = document.createElement('i');
    farbe.style.background = PERSONEN[p].farbe;
    const text = document.createElement('span');
    text.innerHTML = '<strong>' + personName(p) + '</strong> ' + t(PERSONEN[p].warum, PERSONEN[p].warum_l);
    const km = document.createElement('span');
    km.className = 'schicht-km';
    km.textContent = flaeche[p] !== undefined ? flaeche[p].toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' km²' : '–';
    li.append(farbe, text, km);
    ul.appendChild(li);
  }
}

/* ------------------------------------------------------ Daten nachladen
   Die Minuten je Zensus-Zelle liegen je Person in einer eigenen Datei und
   kommen erst, wenn eine Ansicht sie braucht; der Feed nur fuer die
   Beschluesse eines angeklickten Bezirks. */
const geladen = {};
function ladeSkript(pfad) {
  if (!geladen[pfad]) {
    geladen[pfad] = new Promise((ok, fehler) => {
      const el = document.createElement('script');
      el.src = pfad;
      el.onload = ok;
      el.onerror = () => { delete geladen[pfad]; fehler(new Error(pfad)); };
      document.head.appendChild(el);
    });
  }
  return geladen[pfad];
}
const zellDaten = (person) => window['WEGE_ZELLEN_' + person.toUpperCase()];
async function ladeZellen(person) {
  await ladeSkript('data/wege-zellen.js');
  await ladeSkript('data/wege-zellen-' + person + '.js');
  return zellDaten(person);
}
const _dekodiert = {};
function zellFeld(person, kat, feld) {   // n1/n2: Minuten (Uint8), ort1/ort2: Ortsindex (Uint16)
  const k = person + '|' + kat + '|' + feld;
  if (!_dekodiert[k]) {
    const roh = atob(zellDaten(person).kategorien[kat][feld]), b = new Uint8Array(roh.length);
    for (let i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
    _dekodiert[k] = feld.startsWith('ort') ? new Uint16Array(b.buffer) : b;
  }
  return _dekodiert[k];
}
/* Gewicht je Zelle: Einwohner, beim Kind die unter 18-Jaehrigen, bei der
   aelteren Person die ab 65-Jaehrigen (geheim gehaltene Anteile: Stadtmittel). */
const _gewicht = {};
function zellGewicht(art) {
  if (!_gewicht[art]) {
    const Z = window.WEGE_ZELLEN;
    if (art === 'einwohner') {
      _gewicht[art] = Z.einwohner.slice();
    } else {
      let summe = 0, n = 0;
      Z[art].forEach((a, i) => { if (a !== 255) { summe += a * Z.einwohner[i]; n += Z.einwohner[i]; } });
      const mittel = summe / n;
      _gewicht[art] = Z.einwohner.map((e, i) => e * (Z[art][i] === 255 ? mittel : Z[art][i]) / 100);
    }
  }
  return _gewicht[art];
}
const zahlRund = (x) => Math.round(x).toLocaleString('de-DE');
const gewichtWort = (art) => ({
  einwohner: t('Einwohner', 'Menschen'),
  ue65: t('Menschen ab 65', 'ältere Menschen'),
  u18: t('Kinder und Jugendliche unter 18', 'Kinder'),
})[art];

/* ---------------------------------------------------------- Was-waere-wenn
   Vor Ort: dieselbe Wegsuche ohne den Ort. Stadtweit: jede Zelle kennt den
   naechsten und zweitnaechsten Ort; wer diesen Ort als naechsten hat, muesste
   zum zweitnaechsten. Gerechnet bei Tag, ohne Nacht und Hitze. */
function wennStadt(person, kat, oi) {
  const n1 = zellFeld(person, kat, 'n1'), n2 = zellFeld(person, kat, 'n2'), o1 = zellFeld(person, kat, 'ort1');
  const ew = window.WEGE_ZELLEN.einwohner, ab65 = zellGewicht('ue65');
  let N = 0, M = 0, mehr = 0, mitErsatz = 0, raus = 0;
  for (let i = 0; i < o1.length; i++) {
    if (o1[i] !== oi) continue;
    N += ew[i]; M += ab65[i];
    if (n2[i] !== 255) { mehr += ew[i] * (n2[i] - n1[i]); mitErsatz += ew[i]; }
    if (n1[i] <= 15 && n2[i] > 15) raus += ew[i];
  }
  return { N, M, raus, mehr: mitErsatz ? mehr / mitErsatz : null, ohneErsatz: N - mitErsatz };
}

function wennZeile(kat, a) {
  const box = document.createElement('div');
  box.className = 'wenn';
  const neu = naechsteOrte(letztes.g, letztes.zeit, [kat], a.oi)[kat];
  const alt = ORTE.orte[a.oi][1] || katName(kat);
  const vorOrt = document.createElement('p');
  vorOrt.innerHTML = neu
    ? (minText(neu.z) === minText(a.z)
      ? t('Ohne <strong>' + alt + '</strong>: ' + (ORTE.orte[neu.oi][1] || katName(kat)) + ', ebenfalls <strong>' + minText(neu.z) + '</strong>.',
        'Ohne ' + alt + ': ' + (ORTE.orte[neu.oi][1] || katName(kat)) + '. Das ist genauso nah.')
      : t('Ohne <strong>' + alt + '</strong>: ' + (ORTE.orte[neu.oi][1] || katName(kat)) + ', <strong>' + minText(neu.z) + '</strong> statt ' + minText(a.z) + '.',
        'Ohne ' + alt + ': ' + minText(neu.z) + ' statt ' + minText(a.z) + '.'))
    : t('Ohne <strong>' + alt + '</strong> liegt kein solcher Ort mehr in 15 Minuten.', 'Ohne ' + alt + ' ist nichts mehr in der Nähe.');
  const stadt = document.createElement('p');
  stadt.className = 'klein';
  stadt.textContent = t('Rechne stadtweit …', 'Bitte warten …');
  box.append(vorOrt, stadt);
  const person = zustand.person;
  ladeZellen(person).then((P) => {
    if (!P.kategorien[kat]) { stadt.textContent = ''; return; }
    const w = wennStadt(person, kat, a.oi);
    if (!w.N) { stadt.textContent = t('Für keine bewohnte Zelle ist dies der nächste Ort.', 'Für niemanden ist das der nächste Ort.'); return; }
    stadt.innerHTML = t(
      'Stadtweit ist dieser Ort für <strong>' + zahlRund(w.N) + ' Menschen</strong> der nächste (davon ' + zahlRund(w.M) + ' ab 65). ' +
      (w.mehr !== null ? 'Ohne ihn wäre ihr Weg im Mittel <strong>' + w.mehr.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Minuten</strong> länger' : 'Ohne ihn') +
      (w.raus ? '; <strong>' + zahlRund(w.raus) + '</strong> erreichten keinen in 15 Minuten mehr.' : '.') +
      (w.ohneErsatz ? ' ' + zahlRund(w.ohneErsatz) + ' fänden in 60 Minuten keinen anderen.' : '') +
      ' Gerechnet für „' + PERSONEN[person].name + '“ bei Tag.',
      zahlRund(w.N) + ' Menschen haben diesen Ort am nächsten. ' +
      (w.raus ? zahlRund(w.raus) + ' Menschen hätten dann keinen in der Nähe.' : 'Sie hätten dann einen etwas weiteren Weg.'));
  }).catch(() => { stadt.textContent = t('Die Stadtdaten konnten nicht geladen werden.', 'Das geht gerade nicht.'); });
  return box;
}

/* ------------------------------------------------------------ Mein Bezirk */
const ROEMISCH = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
// hell = gut versorgt, dunkel = schlecht; eine Farbe, fuenf Helligkeiten (auch ohne Farbsehen lesbar)
const STUFEN_ANTEIL = [[90, '#eef4f5'], [75, '#cfe1e7'], [60, '#a6c6d3'], [45, '#78a5b8'], [30, '#4a7e97'], [0, '#1e4d64']];
const STUFEN_LUECKE = [[40, '#9c3f28'], [15, '#c9733a'], [5, '#e3ad66'], [0.5, '#f2dfb5']];
const stufenAusdruck = (feld, stufen) => ['step', ['get', feld]].concat(
  stufen.slice().reverse().flatMap(([g, f], k) => (k === 0 ? [f] : [g, f])));
let bezirkWerte = null;

async function rechneBezirke() {
  const b = zustand.bezirk;
  $('bz-status').textContent = t('Lade Daten …', 'Bitte warten …');
  try { await ladeZellen(b.person); } catch (err) {
    $('bz-status').textContent = t('Die Daten konnten nicht geladen werden.', 'Das geht gerade nicht.');
    return;
  }
  $('bz-status').textContent = '';
  if (zustand.ansicht !== 'bezirk') return;
  const t0 = performance.now();
  const P = zellDaten(b.person), Z = window.WEGE_ZELLEN;
  if (!P.kategorien[b.kat]) b.kat = PERSONEN[b.person].ziele.find((k) => P.kategorien[k]);
  const w = zellGewicht(PERSONEN[b.person].gewicht), n1 = zellFeld(b.person, b.kat, 'n1');
  const je = {};
  for (const f of BEZ.features) je[+f.properties.beznr] = { name: f.properties.bezname, summe: 0, gut: 0, betroffen: 0, einwohner: 0 };
  for (let i = 0; i < Z.anzahl; i++) {
    const x = je[Z.bezirk[i]];
    if (!x) continue;
    x.summe += w[i]; x.einwohner += Z.einwohner[i];
    if (n1[i] <= 15) x.gut += w[i]; else x.betroffen += w[i];
  }
  for (const x of Object.values(je)) x.anteil = x.summe ? 100 * x.gut / x.summe : 0;
  bezirkWerte = je;
  zeigeBezirke();
  zeichneBezirke();
  $('panel').dataset.rechenzeitMs = String(Math.round(performance.now() - t0));
}

function baueBezirkWahl() {
  const b = zustand.bezirk;
  $('bz-person').innerHTML = REIHE.map((p) => '<option value="' + p + '"' + (p === b.person ? ' selected' : '') + '>' + personName(p) + '</option>').join('');
  $('bz-kat').innerHTML = PERSONEN[b.person].ziele.map((k) => '<option value="' + k + '"' + (k === b.kat ? ' selected' : '') + '>' + katName(k) + '</option>').join('');
  $('bz-luecken').checked = b.luecken;
}

function zeigeBezirke() {
  const b = zustand.bezirk, je = bezirkWerte;
  baueBezirkWahl();
  if (!je) return;
  const art = PERSONEN[b.person].gewicht;
  $('bz-legende').innerHTML = b.luecken
    ? '<span class="leg-titel">' + t('Betroffene je Zelle (100 × 100 m)', 'So viele Menschen trifft es') + '</span>' +
      STUFEN_LUECKE.slice().reverse().map(([g, f], k, arr) => '<span><i style="background:' + f + '"></i>' +
        (k < arr.length - 1 ? Math.max(1, g) + '–' + (arr[k + 1][0] - 1) : 'ab ' + g) + '</span>').join('')
    : '<span class="leg-titel">' + t('Anteil, der es in 15 Minuten erreicht', 'So viele kommen in 15 Minuten hin') + '</span>' +
      STUFEN_ANTEIL.map(([g, f], k) => '<span><i style="background:' + f + '"></i>' +
        (k === 0 ? 'ab ' + g + ' %' : g + '–' + STUFEN_ANTEIL[k - 1][0] + ' %') + '</span>').join('');
  const reihe = Object.entries(je).sort((x, y) => (b.luecken ? y[1].betroffen - x[1].betroffen : y[1].anteil - x[1].anteil));
  const max = Math.max(...reihe.map(([, x]) => x.betroffen), 1);
  $('bz-rang').innerHTML = reihe.map(([nr, x]) => {
    const wert = b.luecken ? zahlRund(x.betroffen) : Math.round(x.anteil) + ' %';
    const breite = b.luecken ? 100 * x.betroffen / max : x.anteil;
    return '<li><button type="button" data-nr="' + nr + '" aria-pressed="' + (+nr === b.nr ? 'true' : 'false') + '">' +
      '<span class="rang-name">' + x.name + '</span><span class="rang-balken"><i style="width:' + breite.toFixed(1) + '%"></i></span>' +
      '<span class="rang-wert">' + wert + '</span></button></li>';
  }).join('');
  $('bz-rang').querySelectorAll('button').forEach((k) => k.addEventListener('click', () => waehleBezirk(+k.dataset.nr)));
  $('txt-bz-fuss').innerHTML = t(
    'Gezählt: ' + gewichtWort(art) + ' in bewohnten 100-m-Zellen (Zensus 2022), mit Tempo und Regeln der Person „' +
    PERSONEN[b.person].name + '“, bei Tag. ' + (b.luecken ? 'Betroffen: wer das Ziel nicht in 15 Minuten erreicht.' : ''),
    'Die Zahlen kommen aus der Volks-Zählung 2022.');
  zeigeBezirkDetail();
}

function zeigeBezirkDetail() {
  const b = zustand.bezirk, box = $('bz-detail');
  if (!b.nr || !bezirkWerte) {
    box.innerHTML = '<p class="klein">' + t('Klicken Sie auf einen Bezirk in der Karte oder in der Rangliste.', 'Tippen Sie auf einen Stadt-Bezirk.') + '</p>';
    return;
  }
  const x = bezirkWerte[b.nr], art = PERSONEN[b.person].gewicht, Z = window.WEGE_ZELLEN;
  const w = zellGewicht(art), P = zellDaten(b.person);
  const zeilen = PERSONEN[b.person].ziele.filter((k) => P.kategorien[k]).map((k) => {
    const n1 = zellFeld(b.person, k, 'n1');
    let gut = 0;
    for (let i = 0; i < Z.anzahl; i++) if (Z.bezirk[i] === b.nr && n1[i] <= 15) gut += w[i];
    const anteil = x.summe ? 100 * gut / x.summe : 0;
    return '<li' + (k === b.kat ? ' class="aktiv"' : '') + '><span class="rang-name">' + katName(k) + '</span><span class="rang-balken"><i style="width:' +
      anteil.toFixed(1) + '%"></i></span><span class="rang-wert">' + Math.round(anteil) + ' %</span></li>';
  }).join('');
  box.innerHTML = '<h3>' + t('Bezirk ', 'Stadt-Bezirk ') + x.name + '</h3>' +
    '<p class="klein">' + zahlRund(x.einwohner) + ' ' + t('Einwohner', 'Menschen') +
    (art !== 'einwohner' ? ', ' + t('davon etwa ', 'davon etwa ') + zahlRund(x.summe) + ' ' + gewichtWort(art) : '') + '. ' +
    (b.luecken ? t('Betroffen bei „' + katName(b.kat) + '“: ', 'Ohne ' + katName(b.kat) + ' in der Nähe: ') + '<strong>' + zahlRund(x.betroffen) + '</strong>.' : '') + '</p>' +
    '<ul class="bz-kats">' + zeilen + '</ul>' +
    '<h3>' + t('Zuletzt im Bezirksausschuss', 'Neues aus dem Bezirks-Ausschuss') + '</h3><ul class="bz-feed" id="bz-feed"><li class="klein">' + t('Lade …', 'Bitte warten …') + '</li></ul>' +
    '<p class="klein"><a href="index.html?bezirk=' + ROEMISCH[b.nr] + '">' + t('Alle Einträge des Bezirks auf der Startseite', 'Mehr zu diesem Stadt-Bezirk') + ' →</a></p>';
  zeigeBeschluesse(b.nr);
}

async function zeigeBeschluesse(nr) {
  try { await ladeSkript('data/feed.js'); } catch (err) { if ($('bz-feed')) $('bz-feed').innerHTML = ''; return; }
  if (zustand.bezirk.nr !== nr || !$('bz-feed')) return;
  const kennung = ROEMISCH[nr] + '-';
  const liste = ((window.FEED && window.FEED.eintraege) || [])
    .filter((e) => (e.bezirk || []).some((b) => b.startsWith(kennung)) && /^Bezirksausschuss/.test(e.gremium || ''))
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || '')).slice(0, 5);
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('bz-feed').innerHTML = liste.length ? liste.map((e) => '<li><span class="feed-datum">' + esc(e.datum_anzeige || e.datum || '') + '</span> ' +
    esc((leicht && e.klartext_titel_leicht) || e.klartext_titel || e.amtlicher_titel || '') + '</li>').join('')
    : '<li class="klein">' + t('Keine Einträge gefunden.', 'Keine Einträge.') + '</li>';
}

function waehleBezirk(nr) {
  zustand.bezirk.nr = nr;
  zeigeBezirke();
  zeichneBezirke();
}

function zeichneBezirke() {
  if (!kartenBereit || !bezirkWerte) return;
  const b = zustand.bezirk;
  karte.getSource('bezirke-werte').setData({ type: 'FeatureCollection', features: BEZ.features.map((f) => ({
    type: 'Feature', geometry: f.geometry,
    properties: { nr: +f.properties.beznr, name: f.properties.bezname, anteil: bezirkWerte[+f.properties.beznr].anteil } })) });
  karte.setFilter('bezirk-auswahl', ['==', ['get', 'nr'], b.nr || -1]);
  const zellen = [];
  if (b.luecken) {
    const Z = window.WEGE_ZELLEN, w = zellGewicht(PERSONEN[b.person].gewicht), n1 = zellFeld(b.person, b.kat, 'n1');
    for (let i = 0; i < Z.anzahl; i++) {
      if (n1[i] <= 15 || w[i] < 0.5) continue;
      const ring = Z.ecken.map(([dla, dlo]) => [Z.lon[i] + dlo, Z.lat[i] + dla]);
      zellen.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring.concat([ring[0]])] }, properties: { wert: w[i] } });
    }
  }
  karte.getSource('zellen').setData({ type: 'FeatureCollection', features: zellen });
  karte.setLayoutProperty('bezirke-farbe', 'visibility', b.luecken ? 'none' : 'visible');
  karte.setLayoutProperty('zellen', 'visibility', b.luecken ? 'visible' : 'none');
}

/* ------------------------------------------------- Sparplan und Wege */
function sparplan() {
  const M = window.WEGE_MASSNAHMEN, ul = $('sparplan-liste');
  if (!M || !ul) return;
  ul.innerHTML = M.massnahmen.map((m) => {
    const z = m.zahlen, p = PERSONEN[m.person];
    const orte = m.ort_index.map((i) => ORTE.orte[i] && ORTE.orte[i][1]).filter(Boolean).join(', ');
    let zahl;
    if (m.wirkung === 'naechster') {
      zahl = t('<strong>' + zahlRund(z.in_15_min) + ' Menschen</strong> (davon ' + zahlRund(z.in_15_min_ab65) + ' ab 65 und ' +
        zahlRund(z.in_15_min_unter18) + ' unter 18) erreichen eine der beiden in 15 Minuten zu Fuß.' +
        '<br><span class="gedankenspiel">Nur als Gedankenspiel, geplant ist keine Schließung: Für ' + zahlRund(z.einwohner) +
        ' Menschen ist eine der beiden die nächste ' + katName(m.kategorie) + '. Gäbe es beide nicht, wäre ihr Weg im Mittel ' +
        z.mehr_min.toLocaleString('de-DE') + ' Minuten länger.</span>',
        zahlRund(z.in_15_min) + ' Menschen wohnen nah an einer der beiden Büchereien. Sie können zu Fuß hingehen.');
    } else if (p.gewicht === 'ue65') {
      zahl = t('<strong>' + zahlRund(z.ab65) + ' Menschen ab 65</strong> wohnen so nah, dass sie es in ihrem Tempo (' + zahlDE(p.kmh) + ' km/h) in 15 Minuten zu Fuß erreichen.',
        zahlRund(z.ab65) + ' ältere Menschen wohnen nah genug, um zu Fuß hinzugehen.');
    } else {
      zahl = t('<strong>' + zahlRund(z.einwohner) + ' Menschen</strong> (davon ' + zahlRund(z.ab65) + ' ab 65) erreichen es in 15 Minuten zu Fuß.',
        zahlRund(z.einwohner) + ' Menschen wohnen nah genug, um zu Fuß hinzugehen.');
    }
    return '<li><h3>' + t(m.titel, m.titel_leicht) + '</h3><p>' + t(m.text, m.text_leicht) + '</p><p class="sparplan-zahl">' + zahl + '</p>' +
      '<p class="klein">' + t('Ort: ', 'Ort: ') + orte + ' · ' + t('Quelle: ', 'Quelle: ') + m.quelle +
      ' · <a href="hsk.html">' + t('Zum Sparplan', 'Zum Spar-Plan') + ' →</a></p></li>';
  }).join('');
}

/* --------------------------------------------------------------- Karte */
function zeichneKarte() {
  if (!kartenBereit) return;
  const bezirk = zustand.ansicht === 'bezirk';
  for (const id of ['bezirke-farbe', 'zellen', 'bezirk-auswahl']) karte.setLayoutProperty(id, 'visibility', bezirk ? 'visible' : 'none');
  for (const id of ['start', 'ziele', 'wasser']) karte.setLayoutProperty(id, 'visibility', bezirk ? 'none' : 'visible');
  if (bezirk) { karte.setLayoutProperty('flaeche', 'visibility', 'none'); zeichneBezirke(); return; }
  karte.getSource('start').setData({ type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [zustand.start.lon, zustand.start.lat] }, properties: {} }] });
  const orte = [];
  if (letztes && letztes.orte) {
    for (const kat of zieleVon(zustand.person)) {
      const a = letztes.orte[kat];
      if (!a) continue;
      const o = ORTE.orte[a.oi];
      orte.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [o[3], o[2]] },
        properties: { name: katName(kat) + (o[1] ? ': ' + o[1] : '') } });
    }
  }
  karte.getSource('ziele').setData({ type: 'FeatureCollection', features: orte });
  const wasser = zustand.bed.hitze ? KAT.trinkwasser.orte.map((i) => ORTE.orte[i]).map((o) => ({ type: 'Feature',
    geometry: { type: 'Point', coordinates: [o[3], o[2]] }, properties: { name: katName('trinkwasser') + (o[1] ? ': ' + o[1] : '') } })) : [];
  karte.getSource('wasser').setData({ type: 'FeatureCollection', features: wasser });
  if (!letztes || letztes.fehler) { karte.setLayoutProperty('flaeche', 'visibility', 'none'); return; }
  karte.setLayoutProperty('flaeche', 'visibility', 'visible');
  const quelle = karte.getSource('flaeche');
  quelle.setCoordinates(ecken(letztes.raster));
  quelle.play(); quelle.pause();   // statische Leinwand: einmal neu einlesen
}

function baueKarte() {
  const protokoll = new window.pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', protokoll.tile);
  const basis = new URL('.', location.href).href;
  const ebenen = window.basemaps.layers('protomaps', window.basemaps.namedFlavor('light'), { lang: 'de' });
  const ersteSchrift = ebenen.find((e) => e.type === 'symbol');
  karte = new maplibregl.Map({
    container: 'karte',
    style: {
      version: 8,
      glyphs: basis + 'vendor/protomaps/fonts/{fontstack}/{range}.pbf',
      sprite: basis + 'vendor/protomaps/sprites/light',
      sources: {
        protomaps: { type: 'vector', url: 'pmtiles://' + basis + 'karten/ingolstadt.pmtiles',
          attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a> · Protomaps' },
      },
      layers: ebenen,
    },
    center: [START.lon, START.lat], zoom: 13.6, minZoom: 10, maxZoom: 18,
    maxBounds: [[11.20, 48.64], [11.62, 48.87]],
    attributionControl: { compact: true },
    // Auf dem Handy verschiebt ein Finger die Seite, zwei Finger die Karte; Tippen setzt den Startpunkt.
    cooperativeGestures: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
    locale: {
      'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern verschieben',
      'CooperativeGesturesHandler.WindowsHelpText': 'Strg + Mausrad zum Zoomen',
      'CooperativeGesturesHandler.MacHelpText': '⌘ + Mausrad zum Zoomen',
      'NavigationControl.ZoomIn': 'Vergrößern', 'NavigationControl.ZoomOut': 'Verkleinern',
      'AttributionControl.ToggleAttribution': 'Quellen anzeigen',
    },
  });
  karte.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  karte.on('load', () => {
    const vor = ersteSchrift ? ersteSchrift.id : undefined;
    karte.addSource('flaeche', { type: 'canvas', canvas: leinwand, animate: false,
      coordinates: [[START.lon, START.lat], [START.lon + 0.001, START.lat], [START.lon + 0.001, START.lat - 0.001], [START.lon, START.lat - 0.001]] });
    karte.addLayer({ id: 'flaeche', type: 'raster', source: 'flaeche', paint: { 'raster-opacity': 1, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } }, vor);
    karte.addSource('bezirke-werte', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'bezirke-farbe', type: 'fill', source: 'bezirke-werte', layout: { visibility: 'none' },
      paint: { 'fill-color': stufenAusdruck('anteil', STUFEN_ANTEIL), 'fill-opacity': 0.72 } }, vor);
    karte.addSource('zellen', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'zellen', type: 'fill', source: 'zellen', layout: { visibility: 'none' },
      paint: { 'fill-color': stufenAusdruck('wert', STUFEN_LUECKE), 'fill-opacity': 0.85 } }, vor);
    karte.addSource('bezirke', { type: 'geojson', data: BEZ });
    karte.addLayer({ id: 'bezirke-flaeche', type: 'fill', source: 'bezirke', paint: { 'fill-color': '#000', 'fill-opacity': 0 } }, vor);
    karte.addLayer({ id: 'bezirke-linie', type: 'line', source: 'bezirke',
      paint: { 'line-color': '#3d4f59', 'line-width': 1, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } }, vor);
    karte.addLayer({ id: 'bezirk-auswahl', type: 'line', source: 'bezirke-werte', layout: { visibility: 'none' },
      filter: ['==', ['get', 'nr'], -1], paint: { 'line-color': '#00263a', 'line-width': 3 } }, vor);
    karte.addSource('wasser', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'wasser', type: 'circle', source: 'wasser',
      paint: { 'circle-radius': 5, 'circle-color': '#1f8fd1', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    karte.addSource('ziele', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'ziele', type: 'circle', source: 'ziele',
      paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#00263a', 'circle-stroke-width': 2 } });
    karte.addSource('start', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'start', type: 'circle', source: 'start',
      paint: { 'circle-radius': 8, 'circle-color': '#b00e2b', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });

    const tipp = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'karten-tipp', offset: 12 });
    karte.on('mousemove', (e) => {
      const z = karte.queryRenderedFeatures(e.point, { layers: ['ziele', 'wasser'] })[0];
      const b = z ? null : karte.queryRenderedFeatures(e.point, { layers: ['bezirke-flaeche'] })[0];
      let text = z ? z.properties.name : b ? t('Bezirk ' + b.properties.bezname, 'Stadt-Bezirk ' + b.properties.bezname) : '';
      if (b && zustand.ansicht === 'bezirk' && bezirkWerte) {
        const x = bezirkWerte[+b.properties.beznr];
        if (x) text += ': ' + (zustand.bezirk.luecken ? zahlRund(x.betroffen) + ' ' + t('betroffen', 'Menschen') : Math.round(x.anteil) + ' %');
      }
      if (text) tipp.setLngLat(e.lngLat).setText(text).addTo(karte); else tipp.remove();
    });
    karte.getCanvas().addEventListener('mouseleave', () => tipp.remove());
    karte.on('click', (e) => {
      if (zustand.ansicht === 'bezirk') {
        const b = bezirkVon(e.lngLat.lat, e.lngLat.lng);
        if (b) waehleBezirk(+b.beznr);
        return;
      }
      setzeStart(e.lngLat.lat, e.lngLat.lng, null);
    });
    kartenBereit = true;
    zeichneKarte();
  });
}

function grenzenVon(punkte) {   // [[lon, lat], ...] -> [[west, sued], [ost, nord]]
  const lo = punkte.map((p) => p[0]), la = punkte.map((p) => p[1]);
  return [[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]];
}
const GRENZEN_STADT = grenzenVon(BEZ.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
  : f.geometry.coordinates).flatMap((p) => p[0])));

function setzeStart(lat, lon, name) {
  zustand.start = { lat, lon, name };
  zustand.wenn = null;
  rechne();
}

/* ------------------------------------------------------- Bedienelemente */
function baueBedienung() {
  const wahl = $('personen');
  for (const p of REIHE) {
    const label = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio'; r.name = 'person'; r.value = p; r.checked = p === zustand.person;
    r.addEventListener('change', () => { zustand.person = p; zustand.wenn = null; rechne(); });
    const farbe = document.createElement('i');
    farbe.className = 'punkt'; farbe.style.background = PERSONEN[p].farbe;
    const text = document.createElement('span');
    text.dataset.person = p;
    label.append(r, farbe, text);
    wahl.appendChild(label);
  }
  document.querySelectorAll('[data-ansicht]').forEach((b) => b.addEventListener('click', () => {
    const vorher = zustand.ansicht;
    zustand.ansicht = b.dataset.ansicht;
    rechne();
    if (!karte || vorher === zustand.ansicht) return;
    if (zustand.ansicht === 'bezirk') karte.fitBounds(GRENZEN_STADT, { padding: 24, duration: 600 });
    else if (vorher === 'bezirk' && letztes && letztes.raster) karte.fitBounds(grenzenVon(ecken(letztes.raster)), { padding: 12, duration: 600 });
  }));
  $('bz-person').addEventListener('change', (e) => {
    const b = zustand.bezirk;
    b.person = e.target.value;
    if (!PERSONEN[b.person].ziele.includes(b.kat)) b.kat = PERSONEN[b.person].ziele[0];
    rechneBezirke();
  });
  $('bz-kat').addEventListener('change', (e) => { zustand.bezirk.kat = e.target.value; rechneBezirke(); });
  $('bz-luecken').addEventListener('change', (e) => { zustand.bezirk.luecken = e.target.checked; rechneBezirke(); });
  const busWahl = $('bus-fenster');
  $('bus-an').addEventListener('change', (e) => {
    zustand.bus.an = e.target.checked;
    busWahl.disabled = !e.target.checked;
    if (!e.target.checked) { rechne(); return; }
    $('hinweis-bus').textContent = t('Lade Fahrplan …', 'Bitte warten …');
    ladeSkript('data/wege-bus.js').then(() => {
      if (!busWahl.options.length) {
        busWahl.innerHTML = window.WEGE_BUS.fenster.map((f) => '<option value="' + f.id + '">' + t(f.name, f.name_l) + '</option>').join('');
        busWahl.value = zustand.bus.fenster;
      }
      rechne();
    }).catch(() => { $('hinweis-bus').textContent = t('Der Fahrplan konnte nicht geladen werden.', 'Das geht gerade nicht.'); });
  });
  busWahl.addEventListener('change', () => { zustand.bus.fenster = busWahl.value; rechne(); });
  for (const k of Object.keys(zustand.bed)) {
    $('bed-' + k).addEventListener('change', (e) => { zustand.bed[k] = e.target.checked; rechne(); });
  }

  const feld = $('adresse'), vorschlag = $('vorschlaege');
  let aktuell = [];
  const waehle = (v) => {
    feld.value = v.text; vorschlag.innerHTML = ''; vorschlag.hidden = true;
    setzeStart(v.lat, v.lon, v.text);
    if (karte) karte.easeTo({ center: [v.lon, v.lat], zoom: Math.max(karte.getZoom(), 14) });
  };
  feld.addEventListener('input', () => {
    aktuell = adressVorschlaege(feld.value);
    vorschlag.innerHTML = '';
    aktuell.forEach((v) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = v.text;
      b.addEventListener('click', () => waehle(v));
      li.appendChild(b); vorschlag.appendChild(li);
    });
    vorschlag.hidden = aktuell.length === 0;
  });
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && aktuell.length) { e.preventDefault(); waehle(aktuell[0]); }
    if (e.key === 'Escape') { vorschlag.hidden = true; }
  });

  $('hbf').addEventListener('click', () => {
    setzeStart(HBF.lat, HBF.lon, t('Hauptbahnhof', 'Haupt-Bahnhof'));
    if (karte) karte.easeTo({ center: [HBF.lon, HBF.lat], zoom: Math.max(karte.getZoom(), 13.6) });
  });
  $('standort').addEventListener('click', () => {
    const meldung = $('standort-meldung');
    if (!navigator.geolocation) { meldung.textContent = t('Ihr Browser kann den Standort nicht bestimmen.', 'Das geht mit Ihrem Browser nicht.'); return; }
    meldung.textContent = t('Standort wird bestimmt …', 'Bitte warten …');
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      if (!bezirkVon(la, lo)) {
        meldung.textContent = t('Ihr Standort liegt außerhalb von Ingolstadt.', 'Sie sind nicht in Ingolstadt.');
        return;
      }
      meldung.textContent = '';
      setzeStart(la, lo, t('Mein Standort', 'Mein Standort'));
      if (karte) karte.easeTo({ center: [lo, la], zoom: Math.max(karte.getZoom(), 14) });
    }, () => {
      meldung.textContent = t('Der Standort ist nicht freigegeben. Klicken Sie stattdessen auf die Karte.',
        'Das hat nicht geklappt. Tippen Sie auf die Karte.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

/* ---------------------------------------------------------------- Texte */
const TEXTE = {
  hinweis: {
    n: '<strong>PapierPanther ist kein Angebot der Stadt Ingolstadt.</strong> Wege und Orte stammen aus OpenStreetMap und sind dort so vollständig, wie Freiwillige sie eingetragen haben. Dies ist ein Prototyp.',
    l: '<strong>PapierPanther ist kein Angebot der Stadt Ingolstadt.</strong> Die Wege kommen von einer freien Karte im Internet. Die Seite ist noch ein Test.',
  },
  h1: { n: 'Deine 15 Minuten', l: 'Deine 15 Minuten' },
  lede: {
    n: 'Dieselben 15 Minuten sind für ein Kind, eine ältere Frau, einen Vater mit Kinderwagen und eine Besucherin vier verschiedene Städte. Wählen Sie einen Punkt und sehen Sie, wie weit wer zu Fuß kommt, auch nachts oder bei Hitze.',
    l: 'Wie weit kommen Sie zu Fuß in 15 Minuten? Das ist für jeden Menschen anders. Kinder kommen weniger weit. Ältere Menschen auch. Tippen Sie auf die Karte. Oder suchen Sie Ihre Adresse.',
  },
  'start-h': { n: 'Startpunkt', l: 'Wo starten Sie?' },
  'adresse-label': { n: 'Adresse suchen', l: 'Ihre Adresse' },
  standort: { n: 'Mein Standort', l: 'Mein Standort' },
  hbf: { n: 'Ab Hauptbahnhof', l: 'Ab Haupt-Bahnhof' },
  'start-tipp': { n: 'Oder auf die Karte klicken bzw. tippen.', l: 'Oder tippen Sie auf die Karte.' },
  'ansicht-eine': { n: 'Eine Person', l: 'Eine Person' },
  'ansicht-alle': { n: 'Alle Personen', l: 'Alle Personen' },
  'ansicht-bezirk': { n: 'Mein Bezirk', l: 'Mein Bezirk' },
  'bz-h': { n: 'Wer kommt hin – je Bezirk', l: 'Wie gut ist mein Stadt-Bezirk?' },
  'bz-person-label': { n: 'Person', l: 'Wer geht?' },
  'bz-kat-label': { n: 'Ziel', l: 'Wohin?' },
  'bz-luecken-label': { n: 'Wo trifft es Menschen?', l: 'Wo fehlt etwas?' },
  'bz-rang-h': { n: 'Rangliste der Bezirke', l: 'Alle Stadt-Bezirke' },
  'sparplan-h2': { n: 'Was der Sparplan für Wege bedeutet', l: 'Was der Spar-Plan für Wege bedeutet' },
  'sparplan-p': {
    n: 'Das Haushaltssicherungskonzept der Stadt (<a href="hsk.html">Sparplan</a>) betrifft auch Orte, zu denen Menschen zu Fuß gehen. Hier die Maßnahmen, die sich eindeutig einem Ort zuordnen lassen, und wie viele Menschen in seiner Nähe wohnen. Keine dieser Maßnahmen schließt einen Ort.',
    l: 'Die Stadt muss Geld sparen. Das steht im <a href="hsk.html">Spar-Plan</a>. Manches davon betrifft Orte in der Stadt. Hier steht, wie viele Menschen in der Nähe wohnen.',
  },
  'person-h': { n: 'Wer geht?', l: 'Wer geht zu Fuß?' },
  'bed-h': { n: 'Bedingungen', l: 'Wann?' },
  'bed-nacht-label': { n: 'Nacht', l: 'In der Nacht' },
  'bed-hitze-label': { n: 'Hitze', l: 'Wenn es heiß ist' },
  'legende-5': { n: '5 Min', l: '5 Minuten' },
  'legende-10': { n: '10 Min', l: '10 Minuten' },
  'legende-15': { n: '15 Min', l: '15 Minuten' },
  'ziele-h': { n: 'Was liegt in Reichweite?', l: 'Was ist in der Nähe?' },
  'bus-label': { n: 'Mit Bus', l: 'Mit dem Bus' },
  'ziele-kopf-fuss': { n: 'zu Fuß', l: 'zu Fuß' },
  'ziele-kopf-bus': { n: 'mit Bus', l: 'mit Bus' },
  'grosse-h': { n: 'Große Ziele', l: 'Wichtige Orte in der Stadt' },
  'grosse-kopf-fuss': { n: 'zu Fuß', l: 'zu Fuß' },
  'grosse-kopf-bus': { n: 'mit Bus', l: 'mit Bus' },
  'grosse-fuss': {
    n: 'Minuten bis zum Eingang, „über 30“: nicht in 30 Minuten. Das Audi-Werk ist mit dem Audi Forum vertreten, weil in OpenStreetMap kein Haupttor eingetragen ist.',
    l: 'So viele Minuten brauchen Sie bis dorthin.',
  },
  'ziele-fuss': {
    n: 'Gehminuten zum nächsten Ort, aufgerundet. Der Weg vom Startpunkt bis zum nächsten Weg zählt mit.',
    l: 'So viele Minuten gehen Sie bis dorthin.',
  },
  'schicht-h': { n: 'Wie weit kommt wer in 15 Minuten?', l: 'Wie weit kommt wer in 15 Minuten?' },
  'schicht-fuss': {
    n: 'Jede Farbe ist die Fläche einer Person. Die größte liegt unten, die kleinste oben. km²: Größe der Fläche.',
    l: 'Jede Farbe zeigt einen Menschen. Je kleiner die Farbe, desto weniger weit kommt er.',
  },
  'wie-h2': { n: 'So rechnet die Karte', l: 'So rechnet die Karte' },
  'wie-p1': {
    n: 'Grundlage ist das Fußwegenetz aus OpenStreetMap: Gehwege, Pfade, Treppen und alle Straßen außer Autobahnen und Kraftfahrstraßen. Ihr Browser sucht von Ihrem Startpunkt aus die kürzesten Wege, wie ein Navigationsgerät, nur in alle Richtungen zugleich. Wege, auf denen Fußgänger ausdrücklich nicht gehen dürfen, bleiben für alle gesperrt.',
    l: 'Die Karte kennt alle Fuß-Wege in Ingolstadt. Ihr Handy oder Computer rechnet: Wie lange dauert der kürzeste Weg? Das passiert nur auf Ihrem Gerät.',
  },
  'wie-p2': {
    n: 'Jede Person bekommt eigene Werte. Es sind Startwerte, angelehnt an Fachliteratur zu Gehgeschwindigkeiten, keine Messung in Ingolstadt. „×1,5“ heißt: Ein solcher Weg dauert anderthalbmal so lang.',
    l: 'Menschen gehen verschieden schnell. Das steht in der Tabelle.',
  },
  'wie-p3': {
    n: 'Die Fläche reicht bis 40 Meter neben die erreichten Wege. Danach wird sie geglättet: Lücken zwischen Straßen bis etwa 140 Meter schließen sich, Ecken werden rund, Löcher unter 4 Hektar füllen sich, Inseln unter 1 Hektar fallen weg. So zeigt die Karte ein Viertel statt eines Straßenabdrucks. Die Minuten in der Liste sind davon unberührt.',
    l: 'Die Farbe zeigt: Bis hier kommen Sie.',
  },
  'wie-p4': {
    n: 'Mit Bus rechnet die Karte nach dem Soll-Fahrplan der VGI an je einem Stichtag: Fußweg zur Haltestelle, dort warten (den halben Takt aller Linien, höchstens 10 Minuten), fahren (Fahrzeit je Abschnitt als Mittelwert der Fahrten im Zeitfenster, 5 Minuten je Umstieg, auch zu einem Steig bis 200 Meter entfernt) und vom Ziel-Halt weitergehen. Grenze sind 30 Minuten, die Ringe zeigen 10, 20 und 30 Minuten.',
    l: 'Mit dem Bus rechnet die Karte so: zur Halte-Stelle gehen, warten, fahren, weiter-gehen. Alles zusammen höchstens 30 Minuten.',
  },
  'luecken-h2': { n: 'Was die Karte nicht weiß', l: 'Was die Karte nicht weiß' },
  'luecken-liste': {
    n: '<li><strong>Fehlende Orte:</strong> Nur was in OpenStreetMap steht, kommt vor. Von den Ingolstädter Grundschulen sind dort nur 14 als solche erkennbar, viele Arztpraxen ohne Fachrichtung; Praxen ohne Angabe zählen hier als Hausarzt.</li>' +
      '<li><strong>Stadtgrenze:</strong> Orte in Nachbargemeinden, etwa ein Supermarkt in Gaimersheim, fehlen. Am Stadtrand sieht die Lage deshalb schlechter aus, als sie ist.</li>' +
      '<li><strong>Kind:</strong> Haupt- und Sammelstraßen sind oft nur als Mittellinie eingetragen. Die Karte merkt sich deshalb, auf welcher Straßenseite das Kind geht, und lässt es nur an einer eingetragenen Ampel oder einem Zebrastreifen auf die andere Seite wechseln. Fehlt dort die Angabe zur Querung, sperrt die Karte zu viel; liegt ein Gehweg nur auf einer Seite, merkt sie das nicht. Ob es einen Gehweg gibt, steht nur an rund 2.000 Straßen; ohne Angabe nimmt die Karte einen an.</li>' +
      '<li><strong>Rollstuhl und Kinderwagen:</strong> Ob ein Weg befahrbar ist, steht nur an 86 Wegen, hohe Bordsteine an wenigen Stellen. Treppen sind dagegen fast vollständig eingetragen. Aufzüge an Unterführungen fehlen meist.</li>' +
      '<li><strong>Nacht:</strong> Beleuchtung steht nur an etwa 3.200 von 17.000 Wegen. Ohne Angabe gelten Straßen und Gehwege als hell, Pfade und Feldwege als dunkel.</li>' +
      '<li><strong>Hitze:</strong> Schatten ist geschätzt: Ein Weg gilt als schattig, wenn er durch Wald oder Park führt oder nah an eingetragenen Bäumen. Viele Straßenbäume fehlen in OpenStreetMap. Trinkwasserbrunnen kommen aus OpenStreetMap und dem Datensatz der Stadt (zusammen 15); Brunnen in Parks oder Schulen ohne Eintrag fehlen.</li>' +
      '<li><strong>Bus:</strong> Die Wartezeit nimmt den Takt aller Linien an einer Haltestelle zusammen; fährt die passende Linie seltener, wartet man länger. Verspätungen, Baustellen-Umleitungen und Anschlüsse, die genau passen, kennt die Karte nicht. Ein- und Aussteigen sind für Rollstuhl und Kinderwagen als möglich angenommen.</li>' +
      '<li><strong>Öffnungszeiten:</strong> Die Karte rechnet, als hätte alles offen.</li>' +
      '<li><strong>Bänke und Ampeln:</strong> Sitzbänke sind lückenhaft; wo keine eingetragen ist, rechnet die Karte für ältere Menschen mit Pausen. Ampeln zählen, wo sie eingetragen sind.</li>',
    l: '<li>Manche Orte fehlen auf der Karte. Zum Beispiel Schulen oder Ärzte.</li>' +
      '<li>Orte außerhalb von Ingolstadt fehlen.</li>' +
      '<li>Die Karte weiß nicht überall, wo Licht ist. Und wo Schatten ist.</li>' +
      '<li>Kinder gehen auf der Karte nur an der Ampel oder am Zebra-Streifen über große Straßen. Manche Ampeln fehlen auf der Karte.</li>' +
      '<li>Die Karte weiß nicht überall, wo ein Rollstuhl fahren kann.</li>' +
      '<li>Busse kommen manchmal zu spät. Das weiß die Karte nicht.</li>' +
      '<li>Die Karte weiß nicht, wann ein Geschäft offen ist.</li>',
  },
  mithelfen: {
    n: 'Fehlt etwas? Orte und Wege lassen sich in <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> selbst eintragen, auch Beleuchtung, Gehwege und Bordsteine; nach dem nächsten Daten-Update erscheinen sie hier. Welche Angaben am meisten helfen und wie das geht, steht auf der Seite <a href="beteiligen.html#wege-eintragen">Beteiligen</a>.',
    l: 'Fehlt etwas? Sie können es bei <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> eintragen. Wie das geht, steht auf der Seite <a href="beteiligen.html#wege-eintragen">Mitmachen</a>.',
  },
};

const zahlDE = (x) => x.toLocaleString('de-DE');
function tabelle() {
  const faktor = (x) => (x ? '×' + zahlDE(x) : '–');
  const zeilen = [
    [t('Gehtempo', 'So schnell'), (p) => zahlDE(p.kmh) + ' km/h'],
    [t('Ampel', 'Ampel'), (p) => '+' + p.ampel_s + ' s'],
    [t('Treppe', 'Treppe'), (p) => (p.treppe_s === null ? t('gesperrt', 'geht nicht') : p.treppe_s ? '+' + p.treppe_s + ' s' : '–')],
    [t('Ohne Bank', 'Keine Bank'), (p) => (p.bank_s ? '+' + p.bank_s + ' s je ' + BANK_ABSTAND_M + ' m' : '–')],
    [t('Haupt- und Sammelstraßen queren', 'Über große Straßen'), (p) => (p.nur_gesichert_queren ? t('nur Ampel, Zebrastreifen', 'nur Ampel, Zebra-Streifen') : t('überall', 'überall'))],
    [t('Große Straße ohne Gehweg', 'Große Straße ohne Geh-Weg'), (p) => (p.gehweg_noetig ? t('gesperrt', 'geht nicht') : '–')],
    [t('Hoher Bordstein, Drängelgitter, „nicht rollstuhlgerecht“', 'Hoher Bord-Stein'), (p) => (p.hindernisse_gesperrt ? t('gesperrt', 'geht nicht') : '–')],
    [t('Kies, Schotter, Erde', 'Kies-Weg'), (p) => faktor(p.faktor_unbefestigt)],
    [t('Kopfsteinpflaster', 'Pflaster-Steine'), (p) => faktor(p.faktor_pflaster)],
    [t('Fußweg oder Pfad ohne Namen', 'Weg ohne Namen'), (p) => faktor(p.faktor_unbenannt)],
    [t('Zufahrt ohne Namen', 'Zufahrt ohne Namen'), (p) => faktor(p.faktor_unbenannt_zufahrt)],
    [t('Nacht: unbeleuchteter Weg', 'Nachts: Weg ohne Licht'), (p) => (p.nachts_gesperrt ? t('gesperrt', 'geht nicht') : '×' + zahlDE(BEDINGUNGEN.nacht.faktor_unbeleuchtet))],
    [t('Hitze: Weg ohne Schatten', 'Hitze: Weg ohne Schatten'), () => '×' + zahlDE(BEDINGUNGEN.hitze.faktor_ohne_schatten)],
  ];
  let html = '<div class="tabelle-rahmen"><table class="werte"><thead><tr><th></th>' +
    REIHE.map((k) => '<th><i class="punkt" style="background:' + PERSONEN[k].farbe + '"></i>' + personName(k) + '</th>').join('') + '</tr></thead><tbody>';
  for (const [label, f] of zeilen) html += '<tr><th>' + label + '</th>' + REIHE.map((k) => '<td>' + f(PERSONEN[k]) + '</td>').join('') + '</tr>';
  html += '</tbody></table></div>';
  $('werte').innerHTML = html + '<p class="fuss">' + t(
    '„Ohne Bank“: auf Wegstücken, an denen in ' + BANK_NAEHE_M + ' m Umkreis keine Sitzbank eingetragen ist. Ampel: an jedem Knoten mit Fußgängerampel oder Ampelkreuzung. Die Besucherin startet vom selben Punkt wie alle; „Ab Hauptbahnhof“ setzt den Startpunkt dorthin. Diese Werte stehen oben in <code>wege.js</code>.',
    'Die Werte sind geschätzt.') + '</p>';
}

function quellen() {
  $('quellen-block').innerHTML = '<p><strong>' + t('Quellen', 'Woher die Daten kommen') + '</strong></p><ul>' +
    '<li>' + t('Wege, Orte und Grundkarte', 'Wege und Karte') + ': © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>, ODbL 1.0; ' +
    t('Kartenstil und Kacheln', 'Karten-Stil') + ': <a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">Protomaps</a></li>' +
    '<li>' + t('Stadtbezirke', 'Stadt-Bezirke') + ': Stadt Ingolstadt, CC BY 3.0 DE</li>' +
    '<li>' + t('Karte im Browser', 'Karte') + ': <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre GL JS</a> (BSD-3)</li>' +
    '<li>' + t('Fahrplan (Mit Bus)', 'Bus-Fahrplan') + ': Soll-Fahrplandaten der Ingolstädter Verkehrsgesellschaft (INVG) / ' +
    '<a href="https://www.vgi.de" target="_blank" rel="noopener noreferrer">VGI</a>, CC BY-SA 3.0 DE, ' + t('nicht kommerziell; daraus abgeleitet data/wege-bus.js unter derselben Lizenz', 'nicht für Geld') + '</li>' +
    '<li>' + t('Trinkwasserbrunnen', 'Trink-Wasser') + ': ' + t('zusätzlich', 'auch') + ' Stadt Ingolstadt, CC BY 4.0</li></ul>' +
    '<p>' + t('Stand der Wegedaten: ', 'Stand: ') + NETZ.erzeugt_am.split('-').reverse().join('.') + '. ' +
    t('Alle Berechnungen laufen in Ihrem Browser; Startpunkt, Adresse und Standort werden nicht übertragen.',
      'Alles bleibt auf Ihrem Gerät.') + '</p>';
}

function texteAnwenden() {
  for (const id of Object.keys(TEXTE)) {
    const e = $('txt-' + id);
    if (e) e.innerHTML = TEXTE[id][leicht ? 'l' : 'n'];
  }
  document.querySelectorAll('[data-person]').forEach((e) => {
    const p = PERSONEN[e.dataset.person];
    e.textContent = t(p.name + ' (' + zahlDE(p.kmh) + ' km/h)', p.name_l);
  });
  $('adresse').placeholder = t('z. B. Theresienstraße 22', 'zum Beispiel: Theresienstraße 22');
  tabelle();
  quellen();
  sparplan();
  if (letztes) { zeigePanel(); zeichneKarte(); }
  if (zustand.ansicht === 'bezirk') zeigeBezirke();
}

/* ---------------------------------------------------------------- Start */
if (!NETZ || !ORTE || !BEZ || !ADR || !window.pmtiles || !window.basemaps) {
  $('ziele').innerHTML = '<li class="ziel-fehler">' + t('Die Kartendaten konnten nicht geladen werden.', 'Die Karte geht gerade nicht.') + '</li>';
} else {
  const btn = $('btn-leicht');
  btn.setAttribute('aria-pressed', leicht ? 'true' : 'false');
  btn.addEventListener('click', () => {
    leicht = !leicht;
    btn.setAttribute('aria-pressed', leicht ? 'true' : 'false');
    try { localStorage.setItem(LS_KEY_LEICHT, leicht ? '1' : '0'); } catch (err) { /* Storage kann gesperrt sein */ }
    texteAnwenden();
  });
  baueBedienung();
  texteAnwenden();
  rechne();       // Liste sofort, die Karte zeichnet nach, sobald sie geladen ist
  baueKarte();
  window.WEGE_TEST = {   // fuer Pruefungen in der Vorschau
    setzeStart, rechne, zustand, PERSONEN, karte: () => karte,
    zeiten: (person, lat, lon) => rechnePerson(person, ...zuXY(lat, lon)).such.zeit,
    treppen: () => Array.from({ length: nE }, (_, e) => e).filter((e) => TYPEN[typ[e]].treppe).map((e) => [e, von[e], nach[e], zuGeo(kx[von[e]], ky[von[e]])]),
  };   // fuer Pruefungen in der Vorschau
}
