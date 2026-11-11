/* Deine 15 Minuten — Erreichbarkeitskarte (wege.html), Blick 1 „Mein Punkt“.

   Die Wegsuche laeuft hier im Browser auf data/wege-netz.js: Jede Person hat
   eigene Kantengewichte, die bei jedem Umschalten neu berechnet werden.
   Nichts verlaesst das Geraet: Klickpunkt, Adresse und Standort bleiben im
   Browser, die Karte kommt aus karten/ingolstadt.pmtiles von derselben Domain.
   Plan und Herkunft der Werte: WEGE-KARTE-PLAN.md, Abschnitt 4. */
import * as maplibregl from './vendor/maplibre-gl/maplibre-gl.mjs';

/* ------------------------------------------------------------- Konstanten
   Startwerte, auf der Seite unter „So rechnet die Karte“ offengelegt. */
const PERSONEN = {
  erwachsene: { name: 'Erwachsene', name_l: 'Erwachsene', kmh: 5.0, ampel_s: 30, treppe_s: 0, bank_s: 0 },
  aeltere: { name: 'Ältere Person', name_l: 'Ältere Menschen', kmh: 3.2, ampel_s: 30, treppe_s: 60, bank_s: 30 },
};
const BANK_ABSTAND_M = 300;   // Ältere: alle 300 m ohne Bank +bank_s Sekunden
const BANK_NAEHE_M = 40;      // eine Bank so nah an der Kante zählt als Rastplatz
const STUFEN_MIN = [5, 10, 15];
const PUFFER_M = 40;          // erreichbare Fläche: so weit links und rechts des Wegs
const RASTER_M = 12;          // Zellgröße der Fläche
const EINRASTEN_M = 300;      // weiter weg vom nächsten Weg rechnet die Karte nicht
const START = { lat: 48.76338, lon: 11.42514, name: 'Rathausplatz' };
const LISTE = ['supermarkt', 'baecker', 'apotheke', 'hausarzt', 'grundschule', 'kita', 'spielplatz',
  'park', 'haltestelle', 'bank_post', 'buecherei', 'toilette'];
const NAMEN_LEICHT = {
  supermarkt: 'Supermarkt', baecker: 'Bäcker', apotheke: 'Apotheke', hausarzt: 'Haus-Arzt',
  grundschule: 'Grund-Schule', kita: 'Kita', spielplatz: 'Spiel-Platz', park: 'Park',
  haltestelle: 'Halte-Stelle', bank_post: 'Bank oder Post', buecherei: 'Bücherei', toilette: 'Toilette',
};
const FARBEN = [[0, 95, 130, 118], [40, 140, 175, 84], [120, 190, 215, 72]];   // 5, 10, 15 Minuten (RGBA)
const UMRISS = '#b00e2b';

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
const FELD = (name) => NETZ.kanten_felder.indexOf(name);
const istTreppe = NETZ.kanten_typen.map((tt) => tt[FELD('treppe')] === 1);
const istGesperrt = NETZ.kanten_typen.map((tt) => tt[FELD('gesperrt')] === 1);
const AMPEL = NETZ.codes.querung.indexOf('ampel');
const ampel = new Uint8Array(nK);
for (let i = 0, k = 0; i < NETZ.knoten_merkmale.length; i += 2) {
  k += NETZ.knoten_merkmale[i];
  ampel[k] = NETZ.knoten_typen[NETZ.knoten_merkmale[i + 1]][0] === AMPEL ? 1 : 0;
}
// Nachbarschaft als kompakte Liste (CSR): je Knoten die Kanten, die ihn beruehren
const adjStart = new Int32Array(nK + 1), adjKante = new Int32Array(2 * nE);
for (let e = 0; e < nE; e++) { adjStart[von[e] + 1]++; adjStart[nach[e] + 1]++; }
for (let i = 0; i < nK; i++) adjStart[i + 1] += adjStart[i];
{
  const pos = adjStart.slice(0, nK);
  for (let e = 0; e < nE; e++) { adjKante[pos[von[e]]++] = e; adjKante[pos[nach[e]]++] = e; }
}

/* Gitter fuer „naechster Punkt“: Kanten (zum Einrasten) und Baenke */
const MASCHE = 50;
const schluessel = (i, j) => i * 100003 + j;
function gitterKanten() {
  const g = new Map();
  for (let e = 0; e < nE; e++) {
    if (istGesperrt[typ[e]]) continue;
    const a = von[e], b = nach[e];
    for (let i = Math.floor(Math.min(kx[a], kx[b]) / MASCHE); i <= Math.floor(Math.max(kx[a], kx[b]) / MASCHE); i++) {
      for (let j = Math.floor(Math.min(ky[a], ky[b]) / MASCHE); j <= Math.floor(Math.max(ky[a], ky[b]) / MASCHE); j++) {
        const s = schluessel(i, j);
        if (!g.has(s)) g.set(s, []);
        g.get(s).push(e);
      }
    }
  }
  return g;
}
const kantenGitter = gitterKanten();

function naechsteKante(x, y) {
  const ci = Math.floor(x / MASCHE), cj = Math.floor(y / MASCHE);
  let best = { d: EINRASTEN_M, e: -1, f: 0 };
  for (let r = 0; r <= EINRASTEN_M / MASCHE + 1; r++) {
    if (best.e >= 0 && best.d < (r - 1) * MASCHE) break;
    for (let i = ci - r; i <= ci + r; i++) {
      for (let j = cj - r; j <= cj + r; j++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        for (const e of kantenGitter.get(schluessel(i, j)) || []) {
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
ORTE.orte.forEach((o, i) => { const k = ORTE.kategorien[o[0]].id; KAT[k].orte.push(i); });

/* ----------------------------------------------------------- Wegsuche */
function gewichte(person) {
  const p = PERSONEN[person], v = p.kmh / 3.6;
  const kante = new Float32Array(nE), knoten = new Float32Array(nK);
  for (let e = 0; e < nE; e++) {
    const tt = typ[e];
    if (istGesperrt[tt]) { kante[e] = Infinity; continue; }
    let s = laenge[e] / v;
    if (istTreppe[tt]) s += p.treppe_s;
    if (p.bank_s && ohneBank[e]) s += laenge[e] / BANK_ABSTAND_M * p.bank_s;
    kante[e] = s;
  }
  for (let i = 0; i < nK; i++) knoten[i] = ampel[i] ? p.ampel_s : 0;
  return { v, kante, knoten };
}

class Haufen {   // Minimum-Heap fuer (Zeit, Knoten)
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

function suche(g, start, grenze) {
  const zeit = new Float64Array(nK).fill(Infinity);
  const h = new Haufen();
  const e = start.e, a = von[e], b = nach[e], weg = start.d / g.v;
  zeit[a] = weg + start.f * g.kante[e];
  zeit[b] = weg + (1 - start.f) * g.kante[e];
  h.rein(zeit[a], a); h.rein(zeit[b], b);
  while (!h.leer) {
    const z = h.raus(), k = h.zuletzt;
    if (z > zeit[k]) continue;
    for (let i = adjStart[k]; i < adjStart[k + 1]; i++) {
      const kante = adjKante[i], m = von[kante] === k ? nach[kante] : von[kante];
      const nz = z + g.kante[kante] + g.knoten[m];
      if (nz < zeit[m] && nz <= grenze) { zeit[m] = nz; h.rein(nz, m); }
    }
  }
  return zeit;
}

function naechsteOrte(g, zeit) {
  const aus = {};
  for (const kat of LISTE) {
    let best = null;
    for (const oi of KAT[kat].orte) {
      const o = ORTE.orte[oi];
      for (let j = 0; j < o[5].length; j++) {
        const z = zeit[o[5][j]] + o[6][j] / g.v;
        if (z <= STUFEN_MIN[2] * 60 && (!best || z < best.z)) best = { z, oi };
      }
    }
    aus[kat] = best;
  }
  return aus;
}

/* Erreichbare Flaeche: Kanten alle 10 m abtasten, jede Probe faerbt die Zellen
   bis PUFFER_M daneben, mit dem Fussweg dorthin als Zuschlag. */
function flaeche(g, zeit, sx, sy) {
  const grenze = STUFEN_MIN[2] * 60;
  const R = g.v * grenze + PUFFER_M + 2 * RASTER_M;
  const x0 = sx - R, y1 = sy + R, n = Math.ceil(2 * R / RASTER_M);
  const z = new Float32Array(n * n).fill(Infinity);
  const r = Math.ceil(PUFFER_M / RASTER_M);
  const tupfe = (x, y, t0) => {
    const ci = Math.floor((x - x0) / RASTER_M), cj = Math.floor((y1 - y) / RASTER_M);
    for (let j = Math.max(0, cj - r); j <= Math.min(n - 1, cj + r); j++) {
      const cy = y1 - (j + 0.5) * RASTER_M;
      for (let i = Math.max(0, ci - r); i <= Math.min(n - 1, ci + r); i++) {
        const d = Math.hypot(x0 + (i + 0.5) * RASTER_M - x, cy - y);
        if (d > PUFFER_M) continue;
        const tt = t0 + d / g.v, c = j * n + i;
        if (tt < z[c]) z[c] = tt;
      }
    }
  };
  for (let e = 0; e < nE; e++) {
    const a = von[e], b = nach[e], za = zeit[a], zb = zeit[b];
    if ((za > grenze && zb > grenze) || g.kante[e] === Infinity) continue;
    const ce = g.kante[e], schritte = Math.max(1, Math.ceil(Math.hypot(kx[b] - kx[a], ky[b] - ky[a]) / 10));
    for (let s = 0; s <= schritte; s++) {
      const f = s / schritte, tt = Math.min(za + f * ce, zb + (1 - f) * ce);
      if (tt <= grenze) tupfe(kx[a] + f * (kx[b] - kx[a]), ky[a] + f * (ky[b] - ky[a]), tt);
    }
  }
  tupfe(sx, sy, 0);
  return { z, n, x0, y1 };
}

function zeichne(fl, leinwand) {
  leinwand.width = fl.n; leinwand.height = fl.n;
  const ctx = leinwand.getContext('2d'), bild = ctx.createImageData(fl.n, fl.n), d = bild.data;
  for (let c = 0; c < fl.z.length; c++) {
    const m = fl.z[c] / 60;
    const st = m <= STUFEN_MIN[0] ? 0 : m <= STUFEN_MIN[1] ? 1 : m <= STUFEN_MIN[2] ? 2 : -1;
    if (st < 0) continue;
    d.set(FARBEN[st], c * 4);
  }
  ctx.putImageData(bild, 0, 0);
}

function ecken(fl) {
  const x1 = fl.x0 + fl.n * RASTER_M, y0 = fl.y1 - fl.n * RASTER_M;
  return [zuGeo(fl.x0, fl.y1), zuGeo(x1, fl.y1), zuGeo(x1, y0), zuGeo(fl.x0, y0)];
}

/* Umriss einer Stufe: Marching Squares auf den Zellmitten, als lose Linienstuecke. */
function umriss(fl, grenzeS) {
  const { z, n, x0, y1 } = fl, linien = [];
  const w = (i, j) => Math.min(z[j * n + i], grenzeS * 3);
  const pt = (i, j) => zuGeo(x0 + (i + 0.5) * RASTER_M, y1 - (j + 0.5) * RASTER_M);
  const zw = (i1, j1, i2, j2) => {
    const a = w(i1, j1), b = w(i2, j2), f = a === b ? 0.5 : (grenzeS - a) / (b - a);
    const p = pt(i1, j1), q = pt(i2, j2);
    return [p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])];
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const fall = (w(i, j) <= grenzeS ? 8 : 0) | (w(i + 1, j) <= grenzeS ? 4 : 0)
        | (w(i + 1, j + 1) <= grenzeS ? 2 : 0) | (w(i, j + 1) <= grenzeS ? 1 : 0);
      if (fall === 0 || fall === 15) continue;
      const oben = () => zw(i, j, i + 1, j), rechts = () => zw(i + 1, j, i + 1, j + 1);
      const unten = () => zw(i, j + 1, i + 1, j + 1), links = () => zw(i, j, i, j + 1);
      switch (fall) {
        case 1: case 14: linien.push([links(), unten()]); break;
        case 2: case 13: linien.push([unten(), rechts()]); break;
        case 3: case 12: linien.push([links(), rechts()]); break;
        case 4: case 11: linien.push([oben(), rechts()]); break;
        case 6: case 9: linien.push([oben(), unten()]); break;
        case 7: case 8: linien.push([links(), oben()]); break;
        case 5: linien.push([links(), oben()], [unten(), rechts()]); break;
        case 10: linien.push([oben(), rechts()], [links(), unten()]); break;
        default: break;
      }
    }
  }
  return { type: 'Feature', properties: { minuten: grenzeS / 60 }, geometry: { type: 'MultiLineString', coordinates: linien } };
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
const zustand = { start: { lat: START.lat, lon: START.lon, name: START.name }, person: 'erwachsene', vergleich: false };
let karte = null, kartenBereit = false, letztes = null;

function rechne() {
  const t0 = performance.now();
  const { lat, lon } = zustand.start;
  const [sx, sy] = zuXY(lat, lon);
  const einstieg = naechsteKante(sx, sy);
  const bez = bezirkVon(lat, lon);
  if (!einstieg) {
    letztes = { fehler: true, bez };
    zeigeListe();
    zeichneKarte(null, null);
    return;
  }
  const grenze = STUFEN_MIN[2] * 60 + 1;
  const ergebnis = {};
  const personen = zustand.vergleich && zustand.person !== 'erwachsene' ? [zustand.person, 'erwachsene'] : [zustand.person];
  for (const p of personen) {
    const g = gewichte(p), zeit = suche(g, einstieg, grenze);
    ergebnis[p] = { orte: naechsteOrte(g, zeit), flaeche: flaeche(g, zeit, sx, sy) };
  }
  letztes = { ergebnis, personen, bez };
  zeigeListe();
  zeichneKarte(ergebnis[zustand.person].flaeche, personen[1] ? ergebnis[personen[1]].flaeche : null);
  const ms = Math.round(performance.now() - t0);
  $('panel').dataset.rechenzeitMs = String(ms);
}

const minText = (z) => Math.max(1, Math.ceil(z / 60 - 1e-9)) + ' Min';

function zeigeListe() {
  const ul = $('ziele');
  ul.innerHTML = '';
  const r = letztes;
  $('start-ort').textContent = zustand.start.name || t('Gewählter Punkt', 'Ihr Punkt');
  $('start-bezirk').textContent = r.bez
    ? t('Bezirk ' + r.bez.bezname, 'Stadt-Bezirk ' + r.bez.bezname)
    : t('außerhalb der Stadtbezirke', 'nicht in Ingolstadt');
  if (r.fehler) {
    const li = document.createElement('li');
    li.className = 'ziel-fehler';
    li.textContent = t('Hier ist kein Fußweg in der Nähe. Bitte einen Punkt näher an einer Straße wählen.',
      'Hier ist kein Weg. Bitte tippen Sie näher an eine Straße.');
    ul.appendChild(li);
    $('ziele-kopf').hidden = true;
    return;
  }
  const [p1, p2] = r.personen;
  $('ziele-kopf').hidden = !p2;
  if (p2) {
    $('ziele-kopf-1').textContent = t(PERSONEN[p1].name, PERSONEN[p1].name_l);
    $('ziele-kopf-2').textContent = t(PERSONEN[p2].name, PERSONEN[p2].name_l);
  }
  let erreicht = 0;
  for (const kat of LISTE) {
    const a = r.ergebnis[p1].orte[kat], b = p2 ? r.ergebnis[p2].orte[kat] : null;
    if (a) erreicht++;
    const li = document.createElement('li');
    li.className = a ? 'ziel' : 'ziel ziel-fehlt';
    const name = document.createElement('span');
    name.className = 'ziel-kat';
    name.textContent = leicht ? NAMEN_LEICHT[kat] : KAT[kat].name;
    const was = document.createElement('span');
    was.className = 'ziel-was';
    was.textContent = a ? (ORTE.orte[a.oi][1] || (leicht ? NAMEN_LEICHT[kat] : KAT[kat].name)) : t('nicht in 15 Min', 'nicht in 15 Minuten');
    const min = document.createElement('span');
    min.className = 'ziel-min';
    min.textContent = a ? minText(a.z) : '–';
    li.append(name, was, min);
    if (p2) {
      const m2 = document.createElement('span');
      m2.className = 'ziel-min ziel-min-2';
      m2.textContent = b ? minText(b.z) : '–';
      li.appendChild(m2);
    }
    ul.appendChild(li);
  }
  $('ziele-summe').textContent = t(
    erreicht + ' von ' + LISTE.length + ' Alltagszielen liegen in 15 Minuten (' + PERSONEN[p1].name + ').',
    erreicht + ' von ' + LISTE.length + ' Zielen sind nah. Nah heißt: in 15 Minuten zu Fuß.');
}

/* --------------------------------------------------------------- Karte */
const leinwand = document.createElement('canvas');
leinwand.width = leinwand.height = 1;

function zeichneKarte(fl, vergleich) {
  if (!kartenBereit) return;
  const startPunkt = { type: 'Feature', geometry: { type: 'Point', coordinates: [zustand.start.lon, zustand.start.lat] }, properties: {} };
  karte.getSource('start').setData({ type: 'FeatureCollection', features: [startPunkt] });
  const orte = [];
  if (letztes && letztes.ergebnis) {
    const r = letztes.ergebnis[zustand.person].orte;
    for (const kat of LISTE) {
      if (!r[kat]) continue;
      const o = ORTE.orte[r[kat].oi];
      orte.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [o[3], o[2]] },
        properties: { name: (leicht ? NAMEN_LEICHT[kat] : KAT[kat].name) + (o[1] ? ': ' + o[1] : '') } });
    }
  }
  karte.getSource('ziele').setData({ type: 'FeatureCollection', features: orte });
  karte.getSource('umriss').setData({ type: 'FeatureCollection',
    features: vergleich ? STUFEN_MIN.map((m) => umriss(vergleich, m * 60)) : [] });
  const quelle = karte.getSource('flaeche');
  if (!fl) { karte.setLayoutProperty('flaeche', 'visibility', 'none'); return; }
  zeichne(fl, leinwand);
  karte.setLayoutProperty('flaeche', 'visibility', 'visible');
  quelle.setCoordinates(ecken(fl));
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
    karte.addSource('bezirke', { type: 'geojson', data: BEZ });
    karte.addLayer({ id: 'bezirke-flaeche', type: 'fill', source: 'bezirke', paint: { 'fill-color': '#000', 'fill-opacity': 0 } }, vor);
    karte.addLayer({ id: 'bezirke-linie', type: 'line', source: 'bezirke',
      paint: { 'line-color': '#3d4f59', 'line-width': 1, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } }, vor);
    karte.addSource('umriss', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'umriss', type: 'line', source: 'umriss', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': UMRISS, 'line-width': ['match', ['get', 'minuten'], 15, 2.6, 1.4],
        'line-dasharray': ['match', ['get', 'minuten'], 15, ['literal', [1, 0]], ['literal', [2, 1.5]]] } });
    karte.addSource('ziele', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'ziele', type: 'circle', source: 'ziele',
      paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#00263a', 'circle-stroke-width': 2 } });
    karte.addSource('start', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    karte.addLayer({ id: 'start', type: 'circle', source: 'start',
      paint: { 'circle-radius': 8, 'circle-color': UMRISS, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });

    const tipp = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'karten-tipp', offset: 12 });
    karte.on('mousemove', (e) => {
      const z = karte.queryRenderedFeatures(e.point, { layers: ['ziele'] })[0];
      const b = z ? null : karte.queryRenderedFeatures(e.point, { layers: ['bezirke-flaeche'] })[0];
      const text = z ? z.properties.name : b ? t('Bezirk ' + b.properties.bezname, 'Stadt-Bezirk ' + b.properties.bezname) : '';
      if (text) tipp.setLngLat(e.lngLat).setText(text).addTo(karte); else tipp.remove();
    });
    karte.getCanvas().addEventListener('mouseleave', () => tipp.remove());
    karte.on('click', (e) => setzeStart(e.lngLat.lat, e.lngLat.lng, null));
    kartenBereit = true;
    rechne();
  });
}

function setzeStart(lat, lon, name) {
  zustand.start = { lat, lon, name };
  rechne();
}

/* ------------------------------------------------------- Bedienelemente */
function baueBedienung() {
  document.querySelectorAll('input[name="person"]').forEach((r) => {
    r.checked = r.value === zustand.person;
    r.addEventListener('change', () => {
      zustand.person = r.value;
      $('vergleich').disabled = zustand.person === 'erwachsene';
      if (zustand.person === 'erwachsene') { $('vergleich').checked = false; zustand.vergleich = false; }
      rechne();
    });
  });
  $('vergleich').disabled = true;
  $('vergleich').addEventListener('change', (e) => { zustand.vergleich = e.target.checked; rechne(); });

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
    n: 'Was erreichen Sie von Ihrer Haustür aus zu Fuß in 5, 10 und 15 Minuten? Und was erreicht jemand, der langsamer geht und öfter rasten muss? Klicken Sie auf die Karte, suchen Sie eine Adresse oder nehmen Sie Ihren Standort.',
    l: 'Wie weit kommen Sie zu Fuß? In 5 Minuten, in 10 Minuten, in 15 Minuten. Das zeigt die Karte. Tippen Sie auf die Karte. Oder suchen Sie Ihre Adresse.',
  },
  'start-h': { n: 'Startpunkt', l: 'Wo starten Sie?' },
  'adresse-label': { n: 'Adresse suchen', l: 'Ihre Adresse' },
  standort: { n: 'Mein Standort', l: 'Mein Standort' },
  'start-tipp': { n: 'Oder auf die Karte klicken bzw. tippen.', l: 'Oder tippen Sie auf die Karte.' },
  'person-h': { n: 'Wer geht?', l: 'Wer geht zu Fuß?' },
  'person-erwachsene': { n: 'Erwachsene (5 km/h)', l: 'Erwachsene' },
  'person-aeltere': { n: 'Ältere Person (3,2 km/h, mit Pausen)', l: 'Ältere Menschen. Sie gehen langsamer.' },
  'vergleich-label': { n: 'Mit Erwachsenen vergleichen', l: 'Mit Erwachsenen vergleichen' },
  'legende-5': { n: '5 Min', l: '5 Minuten' },
  'legende-10': { n: '10 Min', l: '10 Minuten' },
  'legende-15': { n: '15 Min', l: '15 Minuten' },
  'legende-umriss': { n: 'Erwachsene (Vergleich)', l: 'So weit kommen Erwachsene' },
  'ziele-h': { n: 'Was liegt in Reichweite?', l: 'Was ist in der Nähe?' },
  'ziele-fuss': {
    n: 'Gehminuten zum nächsten Ort, aufgerundet. Der Weg vom Startpunkt bis zum nächsten Weg zählt mit.',
    l: 'So viele Minuten gehen Sie bis dorthin.',
  },
  'wie-h2': { n: 'So rechnet die Karte', l: 'So rechnet die Karte' },
  'wie-p1': {
    n: 'Grundlage ist das Fußwegenetz aus OpenStreetMap: Gehwege, Pfade, Treppen und alle Straßen außer Autobahnen und Kraftfahrstraßen. Ihr Browser sucht von Ihrem Startpunkt aus die kürzesten Wege, wie ein Navigationsgerät, nur rückwärts in alle Richtungen. Wege, auf denen Fußgänger ausdrücklich nicht gehen dürfen, bleiben gesperrt.',
    l: 'Die Karte kennt alle Fuß-Wege in Ingolstadt. Ihr Handy oder Computer rechnet: Wie lange dauert der kürzeste Weg? Das passiert nur auf Ihrem Gerät.',
  },
  'wie-p2': {
    n: 'Jede Person bekommt eigene Werte. Die Tabelle zeigt sie; es sind Startwerte, die sich an Fachliteratur zu Gehgeschwindigkeiten orientieren und keine Messung in Ingolstadt.',
    l: 'Menschen gehen verschieden schnell. Das steht in der Tabelle.',
  },
  'wie-p3': {
    n: 'Die farbige Fläche reicht bis 40 Meter neben den erreichten Wegen: so weit, wie man von einem Weg bis zu einer Haustür ungefähr geht.',
    l: 'Die Farbe zeigt: Bis hier kommen Sie.',
  },
  'luecken-h2': { n: 'Was die Karte nicht weiß', l: 'Was die Karte nicht weiß' },
  'luecken-liste': {
    n: '<li><strong>Fehlende Orte:</strong> Nur was in OpenStreetMap steht, kommt vor. Von den Ingolstädter Grundschulen sind dort nur 14 als solche erkennbar, viele Arztpraxen ohne Fachrichtung; Praxen ohne Angabe zählen hier als Hausarzt.</li>' +
      '<li><strong>Stadtgrenze:</strong> Orte in Nachbargemeinden, etwa ein Supermarkt in Gaimersheim, fehlen. Am Stadtrand sieht die Lage deshalb schlechter aus, als sie ist.</li>' +
      '<li><strong>Öffnungszeiten:</strong> Die Karte rechnet, als hätte alles offen.</li>' +
      '<li><strong>Bänke und Ampeln:</strong> Sitzbänke sind in OpenStreetMap lückenhaft; wo keine eingetragen ist, rechnet die Karte für ältere Menschen mit Pausen. Ampeln zählen, wo sie eingetragen sind.</li>' +
      '<li><strong>Steigungen und Wetter:</strong> Ingolstadt ist flach; Brückenrampen, Dunkelheit und Hitze kommen in einer späteren Ausbaustufe dazu.</li>',
    l: '<li>Manche Orte fehlen auf der Karte. Zum Beispiel Schulen oder Ärzte.</li>' +
      '<li>Orte außerhalb von Ingolstadt fehlen.</li>' +
      '<li>Die Karte weiß nicht, wann ein Geschäft offen ist.</li>' +
      '<li>Manche Bänke fehlen auf der Karte.</li>',
  },
  'mithelfen': {
    n: 'Fehlt etwas? Orte und Wege lassen sich in <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> selbst eintragen; nach dem nächsten Daten-Update erscheinen sie hier. Mehr zum Mitmachen auf der Seite <a href="beteiligen.html">Beteiligen</a>.',
    l: 'Fehlt etwas? Sie können es bei <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> eintragen. Mehr dazu auf der Seite <a href="beteiligen.html">Mitmachen</a>.',
  },
};

function tabelle() {
  const zeilen = [
    [t('Gehtempo', 'So schnell'), (p) => p.kmh.toLocaleString('de-DE') + ' km/h'],
    [t('Ampel', 'Ampel'), (p) => '+' + p.ampel_s + ' s'],
    [t('Treppe', 'Treppe'), (p) => (p.treppe_s ? '+' + p.treppe_s + ' s' : '–')],
    [t('Ohne Bank', 'Keine Bank'), (p) => (p.bank_s ? '+' + p.bank_s + ' s je ' + BANK_ABSTAND_M + ' m' : '–')],
  ];
  const keys = Object.keys(PERSONEN);
  let html = '<table class="werte"><thead><tr><th></th>' + keys.map((k) => '<th>' + t(PERSONEN[k].name, PERSONEN[k].name_l) + '</th>').join('') + '</tr></thead><tbody>';
  for (const [label, f] of zeilen) html += '<tr><th>' + label + '</th>' + keys.map((k) => '<td>' + f(PERSONEN[k]) + '</td>').join('') + '</tr>';
  html += '</tbody></table>';
  $('werte').innerHTML = html + '<p class="fuss">' + t(
    '„Ohne Bank“: auf Wegstücken, an denen in ' + BANK_NAEHE_M + ' m Umkreis keine Sitzbank eingetragen ist. Ampel: an jedem Knoten mit Fußgängerampel oder Ampelkreuzung. Diese Werte stehen oben in <code>wege.js</code>.',
    'Die Werte sind geschätzt.') + '</p>';
}

function quellen() {
  $('quellen-block').innerHTML = '<p><strong>' + t('Quellen', 'Woher die Daten kommen') + '</strong></p><ul>' +
    '<li>' + t('Wege, Orte und Grundkarte', 'Wege und Karte') + ': © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>, ODbL 1.0; ' +
    t('Kartenstil und Kacheln', 'Karten-Stil') + ': <a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">Protomaps</a></li>' +
    '<li>' + t('Stadtbezirke', 'Stadt-Bezirke') + ': Stadt Ingolstadt, CC BY 3.0 DE</li>' +
    '<li>' + t('Karte im Browser', 'Karte') + ': <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre GL JS</a> (BSD-3)</li></ul>' +
    '<p>' + t('Stand der Wegedaten: ', 'Stand: ') + NETZ.erzeugt_am.split('-').reverse().join('.') + '. ' +
    t('Alle Berechnungen laufen in Ihrem Browser; Startpunkt, Adresse und Standort werden nicht übertragen.',
      'Alles bleibt auf Ihrem Gerät.') + '</p>';
}

function texteAnwenden() {
  for (const id of Object.keys(TEXTE)) {
    const e = $('txt-' + id);
    if (e) e.innerHTML = TEXTE[id][leicht ? 'l' : 'n'];
  }
  $('adresse').placeholder = t('z. B. Theresienstraße 22', 'zum Beispiel: Theresienstraße 22');
  tabelle();
  quellen();
  if (letztes) { zeigeListe(); zeichneKarte(letztes.ergebnis ? letztes.ergebnis[zustand.person].flaeche : null,
    letztes.personen && letztes.personen[1] ? letztes.ergebnis[letztes.personen[1]].flaeche : null); }
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
  texteAnwenden();
  baueBedienung();
  rechne();       // Liste sofort, die Karte zeichnet nach, sobald sie geladen ist
  baueKarte();
  window.WEGE_TEST = { setzeStart, rechne, zustand, karte: () => karte };   // fuer Pruefungen in der Vorschau
}
