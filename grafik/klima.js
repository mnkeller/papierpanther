/* Klima: der CO₂-Ausstoß als Gaswürfel in echter Größe neben Mensch, Haus und Stadt.
   Die Kamera zoomt vom eigenen Würfel bis zum Jahreswürfel der ganzen Stadt. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'klima', reiter: 'Klima', form: 'CO₂-Würfel', farbe: '#2e7d4f', seite: 'klima.html',
  titel: 'Wie groß ist eine Tonne CO₂?',
  idee: 'Treibhausgas sieht man nicht. Hier wird es sichtbar: als Würfel aus reinem CO₂, so groß, wie das Gas bei 15 Grad wirklich wäre. Erst Ihr Anteil, dann die ganze Stadt an einem Tag, dann ein ganzes Jahr, und zuletzt die Frage, ob es bis 2035 reicht.',
  notizen: [
    ['Bedienung', 'Oben die vier Schritte anklicken. Die Kamera fährt zurück, der Würfel füllt sich neu. „Anteil Industrie“ teilt den Würfel. Maus über den Würfel zeigt Maße und Tonnen, ein Klick öffnet die Karte.'],
    ['Wow-Moment', 'Der Zoom über der echten Altstadt: Erst steht der eigene Würfel neben dem Münster. Der Tageswürfel überragt dessen Türme fast um das Doppelte. Dann fährt die Kamera zurück, und der Jahreswürfel deckt fast die ganze Altstadt zu.'],
    ['Mobil', 'Gleiche Szene, Schritte als Wischleiste. Der Zoom funktioniert ohne Maus, die Karte steht unter dem Bild.'],
    ['Daten', 'data/klima.json, Fortschrittsberichte der Stabsstelle Klima: 1.476.925 t CO₂ im Jahr 2021 (BISKO), nötige und erreichte Minderung je Jahr (Bilanzjahr 2023), Anteil Industrie 2021. Umrechnung 1 t CO₂ = 537 m³ bei 15 °C und Normaldruck. Pro Kopf mit 141.185 Einwohnern (2024). Altstadt aus OpenStreetMap (ODbL): Grundrisse echt, Höhen aus OSM oder geschätzt (11 m). Münster: Türme rund 62 und 69 m, Schiff 28 m.']
  ],
  init: function (api) {
    var K = SK.klima, T = K.thg, EW = SK.haushalt.einwohner;
    var M3 = 1 / 1.861;                                   // m³ je kg CO₂ bei 15 °C, 1013 hPa
    var JAHR = T.werte.filter(function (w) { return w.jahr === 2021; })[0].t_co2;
    function kante(t) { return Math.cbrt(t * 1000 * M3); }
    var SCHRITTE = {
      // Würfel neben dem Münster (kopf, tag), über der Altstadt (jahr, ziel); x, y = hintere Ecke
      kopf: { name: 'Ihr Anteil im Jahr', t: JAHR / EW, zoom: 2.8, fx: -320, fy: -100, x: -340, y: -124 },
      tag: { name: 'Die Stadt an einem Tag', t: JAHR / 365, zoom: 1.15, fx: -230, fy: -150, x: -279, y: -339 },
      jahr: { name: 'Die Stadt in einem Jahr', t: JAHR, zoom: .3, fx: -210, fy: 50, x: -610, y: -580 },
      ziel: { name: 'Reicht es bis 2035?', t: T.reduktion_erforderlich_t_pro_jahr, innen: T.reduktion_erreicht_t_pro_jahr, zoom: .5, fx: -150, fy: -70, x: -480, y: -400 }
    };
    var W = 1200, H = 640;
    api.szene.innerHTML = '<div class="leiste" id="kl-schritte"><span class="etikett">Schritt</span></div>' +
      '<div class="leiste"><button type="button" class="gf-chip klein" id="kl-ind" aria-pressed="false">Anteil Industrie zeigen</button><span class="etikett" style="margin-left:10px" id="kl-mass"></span></div>' +
      '<div style="position:relative"><canvas id="kl-c" style="display:block;width:100%;cursor:pointer"></canvas><div class="tooltip" id="kl-tip"></div></div>';
    var cv = api.szene.querySelector('#kl-c'), ctx = cv.getContext('2d'), tip = api.szene.querySelector('#kl-tip');
    var dpr = Math.min(window.devicePixelRatio || 1, 2), skala = 1;
    function groesse() { var b = cv.parentNode.clientWidth || 1000; skala = b / W; cv.width = b * dpr; cv.height = H * skala * dpr; cv.style.height = H * skala + 'px'; if (window.ALTSTADT) { lager.schluessel = ''; male(); } }

    /* Welt in Metern: echte Altstadt aus OpenStreetMap, x nach Osten, y nach Süden */
    var AS = window.ALTSTADT;
    function ring(f) { var r = []; for (var i = 1; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; }
    function ringFlach(f) { var r = []; for (var i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; }
    function bau(pts, h, farbe) {
      var fl = 0; pts.forEach(function (p, i) { var q = pts[(i + 1) % pts.length]; fl += p[0] * q[1] - q[0] * p[1]; });
      var cx = 0, cy = 0; pts.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
      var waende = [];
      pts.forEach(function (p, i) {
        var q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dy = q[1] - p[1], nx = dy, ny = -dx;
        if (fl < 0) { nx = -nx; ny = -ny; }
        if (nx + ny <= 0) return;                          // zeigt vom Betrachter weg
        waende.push({ a: p, b: q, t: (p[0] + q[0] + p[1] + q[1]) / 2, hell: ny > nx });
      });
      waende.sort(function (a, b) { return a.t - b.t; });
      return { pts: pts, h: h, cx: cx, cy: cy, waende: waende, f: farbe };
    }
    var BAUTEN = AS.b.map(function (a) { return bau(ring(a), a[0], a[0] >= 40 ? 'turm' : null); });
    var MUE = bau(ringFlach(AS.muenster), 28, 'muenster');
    function raute(cx, cy, r) { return [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]; }
    var TUERME = [bau(raute(-380.5, -160, 8), 62, 'muenster'), bau(raute(-376, -127, 8), 69, 'muenster')];
    BAUTEN.push(MUE); BAUTEN = BAUTEN.concat(TUERME);
    BAUTEN.sort(function (a, b) { return (a.cx + a.cy) - (b.cx + b.cy); });
    var WASSER = AS.wasser.map(ringFlach), GRUEN = AS.gruen.map(ringFlach);
    var STRASSEN = AS.strassen.map(function (s) { return { w: s[0], pts: ring(s) }; });
    var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

    var kam = { k: 11, fx: 4, fy: 4 }, wuerfel = { e: 0, voll: 0, x: 0, y: 0 }, industrie = false, modus = 'kopf';
    function P(x, y, z) { return [W / 2 + 60 + ((x - kam.fx) - (y - kam.fy)) * .866 * kam.k, H / 2 + 70 + ((x - kam.fx) + (y - kam.fy)) * .5 * kam.k - z * kam.k]; }
    function pfad(pts, c) { c = c || ctx; c.beginPath(); pts.forEach(function (p, i) { var q = P(p[0], p[1], p[2] || 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath(); }
    function sichtbar(x, y, rand) { var q = P(x, y, 0); return q[0] > -rand && q[0] < W + rand && q[1] > -rand - 300 && q[1] < H + rand; }
    function zeichneBau(c, b) {
      var k = kam.k, h = b.h, ki = b.f === 'muenster';
      if (k < 1.1) {
        c.fillStyle = ki ? '#a8907a' : '#cbbfae'; pfad(b.pts, c); c.fill();
        c.fillStyle = ki ? '#c9b49c' : (b.f === 'turm' ? '#d8c9b2' : '#e4d9c7'); pfad(b.pts.map(function (p) { return [p[0], p[1], h]; }), c); c.fill();
        return;
      }
      b.waende.forEach(function (w) {
        c.fillStyle = ki ? (w.hell ? '#ebe2d2' : '#d3c6b0') : (w.hell ? '#f1ebe0' : '#dcd1bf');
        pfad([[w.a[0], w.a[1], 0], [w.b[0], w.b[1], 0], [w.b[0], w.b[1], h], [w.a[0], w.a[1], h]], c); c.fill();
      });
      c.fillStyle = ki ? '#a0705a' : '#cf9e86'; pfad(b.pts.map(function (p) { return [p[0], p[1], h]; }), c); c.fill();
      c.strokeStyle = 'rgba(120,96,70,.25)'; c.lineWidth = .6; c.stroke();
    }
    function boden(c) {
      c.fillStyle = '#eef0e6'; pfad([[-2400, -2400], [2600, -2400], [2600, 2600], [-2400, 2600]], c); c.fill();
      c.fillStyle = '#dde9cf'; GRUEN.forEach(function (g) { pfad(g, c); c.fill(); });
      c.fillStyle = '#bcd9e5'; WASSER.forEach(function (g) { pfad(g, c); c.fill(); });
      c.strokeStyle = '#faf8f3'; c.lineCap = 'round'; c.lineJoin = 'round';
      STRASSEN.forEach(function (s) { c.lineWidth = Math.max(.8, s.w * kam.k); pfad(s.pts, c); c.beginPath(); s.pts.forEach(function (p, i) { var q = P(p[0], p[1], 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke(); });
    }
    /* Vor dem Würfel steht, was in Blickrichtung davor liegt; alles andere wird vom Gas überdeckt */
    function vorDemWuerfel(b, x0, y0, e) { return (b.cx > x0 + e || b.cy > y0 + e) && (b.cx + b.cy > x0 + y0 + e); }
    var lager = { schluessel: '', hinten: null, vorne: null };
    function ebene() { var c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; var x = c.getContext('2d'); x.setTransform(dpr * skala, 0, 0, dpr * skala, 0, 0); return c; }
    function stadt(teil, x0, y0, e) {
      var schl = [kam.k.toFixed(4), kam.fx.toFixed(1), kam.fy.toFixed(1), x0, y0, e.toFixed(1), cv.width].join('|');
      var ruhig = !anim;
      if (ruhig && lager.schluessel === schl) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lager[teil], 0, 0); ctx.restore(); return; }
      if (ruhig && teil === 'hinten') {
        lager.schluessel = schl; lager.hinten = ebene(); lager.vorne = ebene();
        var ch = lager.hinten.getContext('2d'), cvn = lager.vorne.getContext('2d');
        boden(ch);
        BAUTEN.forEach(function (b) { if (!sichtbar(b.cx, b.cy, 120)) return; zeichneBau(vorDemWuerfel(b, x0, y0, e) ? cvn : ch, b); });
        stadt(teil, x0, y0, e); return;
      }
      if (teil === 'hinten') boden(ctx);
      BAUTEN.forEach(function (b) { if (!sichtbar(b.cx, b.cy, 120)) return; if (vorDemWuerfel(b, x0, y0, e) === (teil === 'vorne')) zeichneBau(ctx, b); });
    }
    function kubus(x0, y0, e, hoch, farbe, rand, z0) {
      var h = hoch, z = z0 || 0;
      ctx.fillStyle = farbe[1]; pfad([[x0, y0 + e, z], [x0 + e, y0 + e, z], [x0 + e, y0 + e, h], [x0, y0 + e, h]]); ctx.fill();
      ctx.fillStyle = farbe[2]; pfad([[x0 + e, y0, z], [x0 + e, y0 + e, z], [x0 + e, y0 + e, h], [x0 + e, y0, h]]); ctx.fill();
      ctx.fillStyle = farbe[0]; pfad([[x0, y0, h], [x0 + e, y0, h], [x0 + e, y0 + e, h], [x0, y0 + e, h]]); ctx.fill();
      if (rand) {
        ctx.strokeStyle = rand; ctx.lineWidth = 1.3;
        pfad([[x0, y0, h], [x0 + e, y0, h], [x0 + e, y0 + e, h], [x0, y0 + e, h]]); ctx.stroke();
        [[x0, y0 + e], [x0 + e, y0 + e], [x0 + e, y0]].forEach(function (c) { var a = P(c[0], c[1], z), b = P(c[0], c[1], h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      }
    }
    function drahtwuerfel(x0, y0, e, farbe) {
      ctx.strokeStyle = farbe; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      var ecken = [[0, 0], [e, 0], [e, e], [0, e]];
      [0, e].forEach(function (z) { pfad(ecken.map(function (c) { return [x0 + c[0], y0 + c[1], z]; })); ctx.stroke(); });
      ecken.forEach(function (c) { var a = P(x0 + c[0], y0 + c[1], 0), b = P(x0 + c[0], y0 + c[1], e); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    var GAS = ['rgba(150,170,184,.5)', 'rgba(92,116,133,.5)', 'rgba(64,86,102,.55)'];
    var GRUENG = ['rgba(127,174,106,.65)', 'rgba(66,128,80,.65)', 'rgba(46,105,64,.7)'];
    var ROT = ['rgba(232,165,178,.75)', 'rgba(196,72,92,.75)', 'rgba(160,30,52,.8)'];
    var blasen = []; for (var i = 0; i < 46; i++) blasen.push({ a: rnd(), b: rnd(), z: rnd(), v: .0015 + rnd() * .003, r: .5 + rnd() });

    function etikett(x, y, z, zeilen, ausrichtung, dx, dy) {
      var q = P(x, y, z); q[0] += dx || 0; q[1] += dy || 0; ctx.textAlign = ausrichtung || 'left';
      zeilen.forEach(function (t, i) {
        ctx.font = (i ? '500 13px system-ui, sans-serif' : '700 16px "Source Serif 4", Georgia, serif');
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 5; ctx.strokeText(t, q[0], q[1] + i * 17);
        ctx.fillStyle = i ? '#405560' : '#00263a'; ctx.fillText(t, q[0], q[1] + i * 17);
      });
    }
    function zeiger(x, y, z, laenge) {
      var a = P(x, y, z); ctx.strokeStyle = '#405560'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0], a[1] - laenge); ctx.stroke();
      return [a[0], a[1] - laenge];
    }
    function masstab() {
      var stufen = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000], ziel = 130 / kam.k, m = stufen[0];
      stufen.forEach(function (s) { if (s <= ziel) m = s; });
      var px = m * kam.k, x = W - 40 - px, y = H - 28;
      ctx.strokeStyle = '#16232b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y); ctx.lineTo(x + px, y); ctx.lineTo(x + px, y - 5); ctx.stroke();
      ctx.fillStyle = '#16232b'; ctx.font = '600 12.5px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', x + px / 2, y - 9);
      ctx.textAlign = 'right'; ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#566a74';
      ctx.fillText('Karte: © OpenStreetMap-Mitwirkende · Gebäudehöhen teils geschätzt', W - 16, 18);
    }

    function male() {
      ctx.setTransform(dpr * skala, 0, 0, dpr * skala, 0, 0);
      ctx.fillStyle = '#f4f6f3'; ctx.fillRect(0, 0, W, H);
      var e = wuerfel.e, h = e * wuerfel.voll, x0 = wuerfel.x, y0 = wuerfel.y, ziel = modus === 'ziel', e2 = ziel ? kante(SCHRITTE.ziel.innen) : 0;
      var eg = ziel ? kante(SCHRITTE.ziel.t - SCHRITTE.ziel.innen) : 0, xg = x0 + e + 160;
      stadt('hinten', x0, y0, ziel ? e + 160 + eg : e);
      if (ziel) {
        kubus(x0, y0, e2 * wuerfel.voll, e2 * wuerfel.voll, GRUENG, 'rgba(30,80,50,.6)');
        drahtwuerfel(x0, y0, e * Math.min(1, wuerfel.voll * 1.05), '#b00e2b');
        kubus(xg, y0, eg * wuerfel.voll, eg * wuerfel.voll, ROT, 'rgba(120,10,30,.7)');
      } else if (e > 0) {
        if (industrie) {
          var hi = Math.min(h, e * T.anteil_industrie_2021 / 100);
          kubus(x0, y0, e, hi, ['rgba(176,112,64,.6)', 'rgba(150,85,31,.6)', 'rgba(120,64,20,.65)'], 'rgba(90,50,10,.5)');
          if (h > hi) kubus(x0, y0, e, h, GAS, 'rgba(40,60,75,.45)', hi);
        } else kubus(x0, y0, e, h, GAS, 'rgba(40,60,75,.45)');
        blasen.forEach(function (b) {
          var z = b.z * h; if (z > h - .5) return;
          var q = P(x0 + b.a * e, y0 + e, z), q2 = P(x0 + e, y0 + b.b * e, z);
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.2, b.r * Math.min(4, e * kam.k / 60)), 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.arc(q2[0], q2[1], Math.max(1, b.r * Math.min(3.5, e * kam.k / 70)), 0, 6.283); ctx.fill();
        });
      }
      stadt('vorne', x0, y0, ziel ? e + 160 + eg : e);
      if (wuerfel.voll > .95) {
        // Wahrzeichen zum Vergleich
        if (kam.k > .9) {
          var m = zeiger(-376, -127, 69, modus === 'kopf' ? 26 : 18);
          etikett(-376, -127, 69, ['Liebfrauenmünster', 'Türme rund 62 und 69 m'], 'center', 0, -(modus === 'kopf' ? 26 : 18) - 22);
          var pf = zeiger(-27, -55, 63, 14);
          etikett(-27, -55, 63, ['Pfeifturm', '63 m'], 'center', 0, -36);
        } else if (modus === 'jahr') {
          etikett(-376, -127, 0, ['Münster'], 'center', 0, 16);
        }
        if (ziel) {
          etikett(x0, y0, e, ['Müsste jedes Jahr wegfallen', NF.zahl(SCHRITTE.ziel.t) + ' t · gestrichelt, ' + NF.zahl(e) + ' m Kante'], 'center', 0, -34);
          etikett(x0, y0 + e, 0, ['Fällt im Schnitt weg', NF.zahl(SCHRITTE.ziel.innen) + ' t · grün, ' + NF.zahl(e2) + ' m Kante'], 'right', -14, 8);
          etikett(xg + eg, y0, eg * .7, ['Bleibt jedes Jahr zu viel', NF.zahl(SCHRITTE.ziel.t - SCHRITTE.ziel.innen) + ' t · ' + NF.zahl(eg) + ' m Kante'], 'left', 16, 0);
        } else if (e > 0) {
          var s = SCHRITTE[modus];
          etikett(x0 + e, y0 + e / 2, e, [NF.zahl(s.t, s.t >= 100 ? 0 : 1) + ' t CO₂', 'Würfel mit ' + NF.zahl(e, e < 100 ? 1 : 0) + ' m Kante'], 'left', 14, -10);
          if (industrie) etikett(x0, y0 + e, e * T.anteil_industrie_2021 / 200, ['Industrie ' + T.anteil_industrie_2021 + ' %', 'Stand 2021'], 'right', -12, 0);
        }
      }
      masstab();
    }

    /* Übergang: Kamera logarithmisch, Würfel füllt sich neu */
    var anim = null, laeuft = false;
    function geheZu(m) {
      var s = SCHRITTE[m], von = { k: kam.k, fx: kam.fx, fy: kam.fy, e: wuerfel.e };
      modus = m; api.karteZu();
      api.szene.querySelector('#kl-ind').style.visibility = m === 'ziel' ? 'hidden' : 'visible';
      anim = { t0: performance.now(), von: von, nach: { k: s.zoom, fx: s.fx, fy: s.fy, e: kante(s.t), x: s.x, y: s.y } };
      wuerfel.voll = 0;
      api.szene.querySelector('#kl-mass').textContent = s.name;
      sagFuer(m);
      starte();
    }
    function starte() { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } }
    function schritt(now) {
      var weiter = true;
      if (anim) {
        var t = bewegungAus ? 1 : Math.min(1, (now - anim.t0) / 1800), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        kam.k = Math.exp(Math.log(anim.von.k) + (Math.log(anim.nach.k) - Math.log(anim.von.k)) * e);
        kam.fx = anim.von.fx + (anim.nach.fx - anim.von.fx) * e; kam.fy = anim.von.fy + (anim.nach.fy - anim.von.fy) * e;
        wuerfel.e = anim.nach.e; wuerfel.x = anim.nach.x; wuerfel.y = anim.nach.y;
        var tf = bewegungAus ? 1 : Math.max(0, Math.min(1, (now - anim.t0 - 900) / 1500));
        wuerfel.voll = 1 - Math.pow(1 - tf, 3);
        if (t >= 1 && tf >= 1) { anim = null; lager.schluessel = ''; }
      }
      blasen.forEach(function (b) { b.z += b.v; if (b.z > 1) { b.z = 0; b.a = rnd(); b.b = rnd(); } });
      male();
      if (!aktiv) weiter = false;
      if (weiter && !bewegungAus) requestAnimationFrame(schritt); else laeuft = false;
    }
    var aktiv = true;

    var TEXT = {
      kopf: 'Das ist Ihr Anteil: rund ' + NF.zahl(JAHR / EW, 1) + ' t CO₂ im Jahr. Als Gas wäre das ein Würfel mit ' + NF.zahl(kante(JAHR / EW), 1) + ' m Kante, direkt neben dem Münster, etwa so hoch wie ein sechsstöckiges Haus.',
      tag: 'Ganz Ingolstadt an einem einzigen Tag: ' + NF.zahl(JAHR / 365) + ' t. Der Würfel hat ' + NF.zahl(kante(JAHR / 365)) + ' m Kante, fast doppelt so hoch wie die Türme des Münsters.',
      jahr: 'Ein ganzes Jahr: ' + NF.zahl(JAHR / 1e6, 2) + ' Mio. t. Der Würfel hätte ' + NF.zahl(kante(JAHR)) + ' m Kante und würde fast die ganze Altstadt zudecken, rund dreizehnmal so hoch wie das Münster.',
      ziel: 'Für 2035 müsste jedes Jahr ein Würfel mit ' + NF.zahl(kante(T.reduktion_erforderlich_t_pro_jahr)) + ' m Kante verschwinden. Geschafft wird im Schnitt einer mit ' + NF.zahl(kante(T.reduktion_erreicht_t_pro_jahr)) + ' m. Was fehlt, ist jedes Jahr der rote Würfel.'
    };
    function sagFuer(m) { api.sag(TEXT[m]); }

    var leiste = api.szene.querySelector('#kl-schritte');
    Object.keys(SCHRITTE).forEach(function (m, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gf-chip'; b.textContent = (i + 1) + ' · ' + SCHRITTE[m].name;
      b.setAttribute('aria-pressed', m === 'kopf' ? 'true' : 'false');
      b.addEventListener('click', function () { leiste.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); geheZu(m); });
      leiste.appendChild(b);
    });
    var bInd = api.szene.querySelector('#kl-ind');
    bInd.addEventListener('click', function () {
      industrie = !industrie; bInd.setAttribute('aria-pressed', industrie ? 'true' : 'false'); male();
      if (industrie) api.sag('Fast die Hälfte, ' + T.anteil_industrie_2021 + ' %, stammt 2021 aus der Industrie. Der Rest kommt aus Wohnen, Gewerbe, Verkehr und der Stadt selbst.');
    });

    function imWuerfel(ev) {
      var r = cv.getBoundingClientRect(), mx = (ev.clientX - r.left) / skala, my = (ev.clientY - r.top) / skala, e = wuerfel.e, x0 = wuerfel.x, y0 = wuerfel.y;
      if (!e || wuerfel.voll < .9) return false;
      var pts = [P(x0, y0, e), P(x0 + e, y0, e), P(x0 + e, y0, 0), P(x0 + e, y0 + e, 0), P(x0, y0 + e, 0), P(x0, y0 + e, e)];
      var drin = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if (((yi > my) !== (yj > my)) && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi)) drin = !drin; }
      return drin;
    }
    cv.addEventListener('mousemove', function (ev) {
      if (imWuerfel(ev)) {
        var s = SCHRITTE[modus], e = wuerfel.e, r = cv.getBoundingClientRect();
        tip.innerHTML = '<b>' + s.name + '</b><br>' + NF.zahl(s.t, s.t < 100 ? 1 : 0) + ' t CO₂ = ' + NF.zahl(s.t * 1000 * M3) + ' m³<br>' + NF.zahl(e, 1) + ' × ' + NF.zahl(e, 1) + ' × ' + NF.zahl(e, 1) + ' m';
        var x = ev.clientX - r.left + 14; if (x > r.width - 290) x -= 300;
        tip.style.left = x + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px'; tip.classList.add('an');
      } else tip.classList.remove('an');
    });
    cv.addEventListener('mouseleave', function () { tip.classList.remove('an'); });
    cv.addEventListener('click', function (ev) {
      if (!imWuerfel(ev)) return;
      var s = SCHRITTE[modus];
      api.karte('<div class="meta">Treibhausgase Ingolstadt</div><h3>' + s.name + '</h3><div class="zahl">' + NF.zahl(s.t, s.t < 100 ? 1 : 0) + ' t</div><p class="meta">CO₂-Äquivalente' + (modus === 'ziel' ? ' Minderung pro Jahr, die für 2035 nötig wäre' : '') + '</p>' +
        '<dl><dt>Als Gas bei 15 °C</dt><dd>' + NF.zahl(s.t * 1000 * M3) + ' m³</dd><dt>Würfelkante</dt><dd>' + NF.zahl(kante(s.t), 1) + ' m</dd>' +
        (modus === 'ziel' ? '<dt>Erreicht pro Jahr</dt><dd>' + NF.zahl(s.innen) + ' t</dd><dt>Fehlt pro Jahr</dt><dd>' + NF.zahl(s.t - s.innen) + ' t</dd>' : '<dt>Ganz Ingolstadt 2021</dt><dd>' + NF.zahl(JAHR) + ' t</dd><dt>davon Industrie</dt><dd>' + T.anteil_industrie_2021 + ' %</dd>') + '</dl>' +
        '<p>Ziel des Stadtrats: Ingolstadt soll bis ' + K.ziele.klimaneutral_stadt + ' klimaneutral sein, die Verwaltung schon bis ' + K.ziele.klimaneutral_verwaltung + '.</p>' +
        '<p class="gf-quelle">Fortschrittsberichte 2023 und 2025 der Stabsstelle Klima (data/klima.json), Bilanz nach BISKO. Umrechnung: 1 t CO₂ ≈ 537 m³ bei 15 °C.</p>');
    });

    window.addEventListener('resize', groesse);
    groesse();
    kam.k = 9; kam.fx = -280; kam.fy = -150;
    geheZu('kopf');
    this.pause = function () { aktiv = false; };
    this.weiter = function () { aktiv = true; groesse(); starte(); };
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
