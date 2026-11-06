/* Haushalt: isometrische Mini-Stadt aus den fünf Ausgaben-Hauptgruppen (wie das erste Diagramm
   der Haushaltsseite) und ein Geldfluss durch Verwaltungs- und Vermögenshaushalt. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'haushalt', reiter: 'Haushalt', form: 'Isometrische Stadt', farbe: '#003e59', seite: 'haushalt.html',
  titel: 'Ihre 6.515 Euro',
  idee: 'So viel gibt die Stadt 2026 rechnerisch für jede Einwohnerin und jeden Einwohner aus. Die Münze teilt sich auf fünf Häuser auf, eines je Hauptgruppe des Haushalts. Der Rauminhalt jedes Hauses entspricht dem Geld.',
  notizen: [
    ['Bedienung', 'Maus über ein Haus: Die Fenster gehen an. Klick: Karte mit Betrag, Anteil pro Kopf und den größten Posten darin. „Woher das Geld kommt“ zeigt den Geldfluss, Maus über einen Strom hebt ihn hervor.'],
    ['Wow-Moment', 'Die Münze teilt sich, die Häuser wachsen, der Kran auf der Baustelle dreht sich. Im Geldfluss rollen Münzen von den Einnahmen durch die Kasse in die Ausgaben. Nur ein Strom bleibt leer: die Lücke von 66,1 Mio. €.'],
    ['Mobil', 'Die Stadt als stehendes Bild mit Zahlen an den Häusern. Der Geldfluss wird hochkant: Einnahmen oben, Ausgaben unten.'],
    ['Daten', 'data/haushalt.json, Haushalt 2026: Hauptgruppen der Gruppierungsübersicht (4, 5+6, 7, 8, 9 wie auf haushalt.html), Verwaltungs- und Vermögenshaushalt aus der Haushaltssatzung, Einwohner 2024. Die fünf Häuser ergeben zusammen die Ausgaben des ganzen Haushalts.']
  ],
  init: function (api) {
    var HH = SK.haushalt, EW = HH.einwohner, SUM = HH.summe_ausgaben, VWH = HH.vwh;
    var W = 1200, H = 650, u = 30, ox = 600, oy = 306;
    var css = document.createElement('style');
    css.textContent = '@keyframes hhpuls{50%{opacity:.45}}.hh-luecke{animation:hhpuls 1.6s ease-in-out infinite}';
    document.head.appendChild(css);

    /* Fünf Häuser. s = Tiefe, t = links/rechts auf dem Plan. Farben: Dach, linke Wand, rechte Wand */
    var HAUS = [
      { i: 0, kurz: 'Personal', was: 'Gehälter, Versorgung, Sozialversicherung', form: 'buero', w: 3, d: 3, s: 0, t: -4.6, f: ['#7fb0c8', '#2a6684', '#164e6a'] },
      { i: 2, kurz: 'Zuschüsse und Sozialleistungen', was: 'Hilfe für Menschen, Zuschüsse an Träger und Verbände', form: 'sozial', w: 3, d: 3, s: 0, t: 4.6, f: ['#9fcdc5', '#3a8a80', '#24685f'] },
      { i: 1, kurz: 'Sachen und Betrieb', was: 'Gebäude unterhalten, Energie, Mieten, Geräte', form: 'halle', w: 4, d: 3, s: 8.4, t: -9.2, f: ['#c3ccd1', '#7b8d96', '#5b6c75'] },
      { i: 3, kurz: 'Umlagen und Zinsen', was: 'vor allem die Bezirksumlage an Oberbayern', form: 'bank', w: 3, d: 2, s: 8.4, t: 0, f: ['#ead9b3', '#c2a268', '#9d7f45'] },
      { i: 4, kurz: 'Bauprojekte und Investitionen', was: 'Hochbau, Tiefbau, Grundstücke, Fahrzeuge', form: 'baustelle', w: 3, d: 3, s: 8.4, t: 9.2, f: ['#f6dfae', '#e3b45a', '#c48d2c'] }
    ];
    var K = 7 / (HH.ausgaben_hg[0].euro / 1e6 / 9);
    HAUS.forEach(function (b) {
      var g = HH.ausgaben_hg[b.i];
      b.g0 = g; b.euro = g.euro; b.x = (b.s + b.t) / 2; b.y = (b.s - b.t) / 2;
      b.h = g.euro / 1e6 / (b.w * b.d) * K; b.jetzt = 0;
    });

    function iso(x, y, z) { return [ox + (x - y) * .866 * u, oy + (x + y) * .5 * u - z * u]; }
    function poly(pts) { return pts.map(function (p) { var q = iso(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
    function quad(parent, pts, attrs) { attrs = attrs || {}; attrs.points = poly(pts); return el('polygon', attrs, parent); }

    api.szene.innerHTML = '<div class="leiste"><span class="etikett">Ansicht</span><button class="gf-chip" type="button" aria-pressed="true" id="hh-stadt">Wofür das Geld ausgegeben wird</button><button class="gf-chip" type="button" aria-pressed="false" id="hh-fluss">Woher das Geld kommt</button></div>' +
      '<div style="position:relative"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Isometrische Stadt aus den Hauptgruppen des Haushalts"></svg><div class="tooltip" id="hh-tip"></div></div>';
    var svg = api.szene.querySelector('svg'), tip = api.szene.querySelector('#hh-tip');
    var defs = el('defs', {}, svg);
    var lg = el('linearGradient', { id: 'hh-himmel', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#eef4f7' }, lg); el('stop', { offset: 1, 'stop-color': '#ffffff' }, lg);
    var schraffur = el('pattern', { id: 'hh-schraffur', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 8, height: 8, fill: '#fbeef1' }, schraffur); el('rect', { width: 3.5, height: 8, fill: '#e9a5b2' }, schraffur);
    el('rect', { width: W, height: H, fill: 'url(#hh-himmel)' }, svg);

    /* ---------- Stadt ---------- */
    var gStadt = el('g', {}, svg);
    function flaeche(s0, s1, t0, t1, farbe) {
      var p = [[s0, t0], [s0, t1], [s1, t1], [s1, t0]].map(function (q) { return [(q[0] + q[1]) / 2, (q[0] - q[1]) / 2, 0]; });
      quad(gStadt, p, { fill: farbe });
    }
    flaeche(-3.5, 15.5, -16.5, 16.5, '#ece8df');
    flaeche(5.6, 7.4, -16.5, 16.5, '#d9d3c6');
    [-4.6, 4.6].forEach(function (t) { flaeche(7.4, 15.5, t - .45, t + .45, '#e1dbcf'); });
    // Bäume als Kugeln auf Stämmen
    [[-2.6, -10], [-2.6, 0], [-2.6, 10], [4.2, -13.5], [4.2, 13.5], [14.3, -4.6], [14.3, 4.6], [-2.6, 14.6], [-2.6, -14.6]].forEach(function (q) {
      var x = (q[0] + q[1]) / 2, y = (q[0] - q[1]) / 2, a = iso(x, y, 0), b = iso(x, y, .9);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#8b6b4a', 'stroke-width': 3 }, gStadt);
      el('circle', { cx: b[0], cy: b[1] - 8, r: 13, fill: '#7fae6a' }, gStadt);
      el('circle', { cx: b[0] - 4, cy: b[1] - 12, r: 6, fill: '#97c182' }, gStadt);
    });
    var gB = el('g', {}, gStadt), gL = el('g', { 'pointer-events': 'none' }, gStadt);

    HAUS.slice().sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); }).forEach(function (b) {
      b.el = el('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': b.kurz + ', ' + NF.mio(b.euro) }, gB);
      b.el.addEventListener('mouseenter', function () { b.an = true; zeichneHaus(b); });
      b.el.addEventListener('mouseleave', function () { b.an = false; zeichneHaus(b); });
      b.el.addEventListener('click', function () { karteHaus(b); });
      b.el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') karteHaus(b); });
      b.schild = el('g', {}, gL);
      var oben = b.s < 4;
      b.t1 = el('text', { 'text-anchor': 'middle', 'font-size': 14.5, 'font-weight': 700, 'font-family': '"Source Serif 4", Georgia, serif', fill: '#00263a', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' }, b.schild);
      b.t2 = el('text', { 'text-anchor': 'middle', 'font-size': 12.5, fill: '#405560', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' }, b.schild);
      b.t1.textContent = b.kurz;
      b.t2.textContent = NF.mio(b.euro) + ' · ' + NF.zahl(b.euro / EW) + ' € pro Kopf';
      b.oben = oben;
    });

    function zeichneHaus(b) {
      var x = b.x, y = b.y, w = b.w, d = b.d, h = b.jetzt, g = b.el, f = b.f;
      g.innerHTML = '';
      if (h <= .02) { b.schild.style.opacity = 0; return; }
      var bau = b.form === 'baustelle';
      // Wände
      quad(g, [[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], { fill: f[1], opacity: bau ? .55 : 1 });
      quad(g, [[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], { fill: f[2], opacity: bau ? .55 : 1 });
      if (b.form === 'sozial') {
        // Satteldach über der Fläche, First in Richtung x
        var r = 1.3;
        quad(g, [[x, y, h], [x + w, y, h], [x + w, y + d / 2, h + r], [x, y + d / 2, h + r]], { fill: f[0] });
        quad(g, [[x, y + d / 2, h + r], [x + w, y + d / 2, h + r], [x + w, y + d, h], [x, y + d, h]], { fill: '#8cbfb6' });
        quad(g, [[x + w, y, h], [x + w, y + d, h], [x + w, y + d / 2, h + r]], { fill: f[2] });
      } else if (b.form === 'halle') {
        quad(g, [[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], { fill: f[0] });
        for (var z0 = 0; z0 < w; z0 += 1) {
          quad(g, [[x + z0, y, h], [x + z0, y + d, h], [x + z0 + .2, y + d, h + .8], [x + z0 + .2, y, h + .8]], { fill: '#dfe6ea' });
          quad(g, [[x + z0 + .2, y, h + .8], [x + z0 + .2, y + d, h + .8], [x + z0 + 1, y + d, h], [x + z0 + 1, y, h]], { fill: '#9fb0b8' });
          quad(g, [[x + z0 + .2, y + d, h + .8], [x + z0 + 1, y + d, h], [x + z0, y + d, h]], { fill: f[1] });
        }
        // Rolltore
        [.4, 2.3].forEach(function (a) { quad(g, [[x + a, y + d, 0], [x + a + 1.3, y + d, 0], [x + a + 1.3, y + d, Math.min(h - .3, 1.6)], [x + a, y + d, Math.min(h - .3, 1.6)]], { fill: '#e7ecee', stroke: '#93a3ab', 'stroke-width': .6 }); });
      } else if (b.form === 'bank') {
        quad(g, [[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], { fill: f[0] });
        // Giebel auf der linken Front, Säulen davor
        quad(g, [[x - .1, y + d + .05, h], [x + w + .1, y + d + .05, h], [x + w / 2, y + d + .05, h + 1.1]], { fill: '#f3e7cb', stroke: f[2], 'stroke-width': .8 });
        for (var c = .3; c < w - .1; c += .6) quad(g, [[x + c, y + d + .05, .25], [x + c + .26, y + d + .05, .25], [x + c + .26, y + d + .05, h - .15], [x + c, y + d + .05, h - .15]], { fill: '#f7efdc' });
        quad(g, [[x - .3, y + d, 0], [x + w + .3, y + d, 0], [x + w + .3, y + d + .5, 0], [x - .3, y + d + .5, 0]], { fill: '#d8c8a3' });
      } else {
        quad(g, [[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], { fill: f[0], opacity: bau ? .7 : 1 });
      }
      // Fenster
      if (b.form === 'buero' || b.form === 'sozial') {
        for (var z = .45; z < h - .3; z += .62) {
          for (var i = .3; i < w - .2; i += .5) quad(g, [[x + i, y + d, z], [x + i + .26, y + d, z], [x + i + .26, y + d, z + .32], [x + i, y + d, z + .32]], { fill: b.an ? '#ffd86b' : 'rgba(255,255,255,.22)' });
          for (var j = .3; j < d - .2; j += .5) quad(g, [[x + w, y + j, z], [x + w, y + j + .26, z], [x + w, y + j + .26, z + .32], [x + w, y + j, z + .32]], { fill: b.an ? '#f3c74e' : 'rgba(255,255,255,.14)' });
        }
        if (b.form === 'buero') { var m = iso(x + w / 2, y + d / 2, h), m2 = iso(x + w / 2, y + d / 2, h + 1.4); el('line', { x1: m[0], y1: m[1], x2: m2[0], y2: m2[1], stroke: '#00263a', 'stroke-width': 2 }, g); el('path', { d: 'M' + m2[0] + ',' + m2[1] + ' l22,6 l-22,6 z', fill: '#b00e2b' }, g); }
      }
      if (b.form === 'halle' && b.an) quad(g, [[x + w, y + .5, 1.2], [x + w, y + d - .5, 1.2], [x + w, y + d - .5, 1.6], [x + w, y + .5, 1.6]], { fill: '#ffd86b' });
      if (bau) {
        // Gerüst: Raster auf beiden Fronten
        for (var zz = 0; zz <= h + .01; zz += .9) {
          var a1 = iso(x, y + d, zz), a2 = iso(x + w, y + d, zz), a3 = iso(x + w, y, zz);
          el('polyline', { points: a1 + ' ' + a2 + ' ' + a3, fill: 'none', stroke: '#8a5d14', 'stroke-width': .9 }, g);
        }
        for (var k = 0; k <= w; k += 1) { var p1 = iso(x + k, y + d, 0), p2 = iso(x + k, y + d, h); el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: '#8a5d14', 'stroke-width': .9 }, g); }
        for (var k2 = 0; k2 < d; k2 += 1) { var q1 = iso(x + w, y + k2, 0), q2 = iso(x + w, y + k2, h); el('line', { x1: q1[0], y1: q1[1], x2: q2[0], y2: q2[1], stroke: '#8a5d14', 'stroke-width': .9 }, g); }
        // Kran
        var fuss = iso(x - .6, y - .6, 0), spitze = iso(x - .6, y - .6, h + 3.2);
        el('line', { x1: fuss[0], y1: fuss[1], x2: spitze[0], y2: spitze[1], stroke: '#d39b21', 'stroke-width': 5 }, g);
        var wk = b.kranWinkel || 0, len = 4.2;
        var ausleger = iso(x - .6 + Math.cos(wk) * len, y - .6 + Math.sin(wk) * len, h + 3.2), gegen = iso(x - .6 - Math.cos(wk) * 1.4, y - .6 - Math.sin(wk) * 1.4, h + 3.2);
        el('line', { x1: gegen[0], y1: gegen[1], x2: ausleger[0], y2: ausleger[1], stroke: '#d39b21', 'stroke-width': 4 }, g);
        el('rect', { x: gegen[0] - 6, y: gegen[1] - 3, width: 12, height: 9, fill: '#6b6b6b' }, g);
        var haken = iso(x - .6 + Math.cos(wk) * len * .8, y - .6 + Math.sin(wk) * len * .8, h + 3.2);
        el('line', { x1: haken[0], y1: haken[1], x2: haken[0], y2: haken[1] + 34, stroke: '#4d4d4d', 'stroke-width': 1 }, g);
        el('rect', { x: haken[0] - 9, y: haken[1] + 34, width: 18, height: 9, fill: b.an ? '#b00e2b' : '#a7b4bb' }, g);
      }
      // Schild
      var top = b.oben ? iso(x + w / 2, y + d / 2, h + (b.form === 'sozial' ? 1.3 : 0) + (b.form === 'buero' ? 1.5 : 0)) : iso(x + w, y + d, 0);
      if (b.oben) { b.t1.setAttribute('x', top[0]); b.t1.setAttribute('y', top[1] - 30); b.t2.setAttribute('x', top[0]); b.t2.setAttribute('y', top[1] - 14); }
      else { b.t1.setAttribute('x', top[0]); b.t1.setAttribute('y', top[1] + 30); b.t2.setAttribute('x', top[0]); b.t2.setAttribute('y', top[1] + 46); }
      b.schild.style.opacity = h > .3 ? 1 : 0;
    }
    function karteHaus(b) {
      var g = b.g0, proKopf = b.euro / EW, max = g.unter.length ? g.unter[0][1] : 1, delta = g.euro - g.vorjahr;
      api.karte('<div class="meta">Hauptgruppe ' + g.codes.join(' und ') + ' · Haushalt 2026</div><h3>' + NF.esc(b.kurz) + '</h3>' +
        '<div class="zahl">' + NF.zahl(proKopf) + ' €</div><p class="meta">pro Einwohnerin und Einwohner im Jahr · ' + NF.esc(b.was) + '</p>' +
        '<dl><dt>Ausgaben 2026</dt><dd>' + NF.mio(g.euro) + '</dd><dt>Anteil am Haushalt</dt><dd>' + NF.zahl(g.euro / SUM * 100, 1) + ' %</dd>' +
        '<dt>Gegenüber 2025</dt><dd>' + (delta >= 0 ? '+' : '−') + NF.mio(Math.abs(delta)) + '</dd></dl>' +
        '<p style="margin:10px 0 6px;font-weight:600">Die größten Posten</p><div style="display:grid;gap:6px">' + g.unter.slice(0, 5).map(function (x) {
          return '<div style="font-size:.84rem"><div style="display:flex;justify-content:space-between;gap:10px"><span>' + NF.esc(x[0].length > 60 ? x[0].slice(0, 58) + '…' : x[0]) + '</span><b style="white-space:nowrap">' + NF.mio(x[1]) + '</b></div>' +
            '<div style="height:5px;border-radius:3px;background:#ece8df;margin-top:3px"><div style="height:5px;border-radius:3px;background:' + b.f[2] + ';width:' + (x[1] / max * 100) + '%"></div></div></div>';
        }).join('') + '</div>' +
        '<p class="gf-quelle">Gruppierungsübersicht Haushalt 2026 (data/haushalt.json), dieselben Gruppen wie im ersten Diagramm auf haushalt.html. ' + NF.zahl(EW) + ' Einwohner (2024).</p>');
    }

    /* Münze, die sich auf die Häuser verteilt */
    var gM = el('g', {}, gStadt), stuecke = el('g', { 'pointer-events': 'none' }, gStadt);
    var mx = 1080, my = 92;
    el('circle', { cx: mx, cy: my, r: 62, fill: '#e3b341', stroke: '#b98a1d', 'stroke-width': 4 }, gM);
    el('circle', { cx: mx, cy: my, r: 50, fill: 'none', stroke: '#f6d77d', 'stroke-width': 2 }, gM);
    var mt = el('text', { x: mx, y: my + 8, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, 'font-family': '"Source Serif 4", Georgia, serif', fill: '#5a3f00' }, gM);
    mt.textContent = NF.zahl(SUM / EW) + ' €';
    var mu = el('text', { x: mx, y: my + 27, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#5a3f00' }, gM); mu.textContent = 'pro Kopf · 2026';
    var gesamt = el('text', { x: mx, y: my + 86, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#405560' }, gStadt);
    gesamt.textContent = NF.mio(SUM) + ' ÷ ' + NF.zahl(EW) + ' Einwohner';

    function muenze() {
      if (bewegungAus) { HAUS.forEach(function (b) { b.jetzt = b.h; zeichneHaus(b); }); return; }
      var t0 = performance.now() + 600;
      var flug = HAUS.map(function (b, i) {
        var z = iso(b.x + b.w / 2, b.y + b.d / 2, 0);
        var c = el('g', { opacity: 0 }, stuecke);
        el('circle', { r: 10 + Math.sqrt(b.euro / 1e6) * .9, fill: '#e3b341', stroke: '#b98a1d', 'stroke-width': 1.5 }, c);
        var t = el('text', { 'text-anchor': 'middle', y: 4, 'font-size': 10.5, 'font-weight': 800, fill: '#5a3f00' }, c); t.textContent = NF.zahl(b.euro / EW) + ' €';
        return { b: b, c: c, z: z, start: t0 + i * 160 };
      });
      gM.style.transformOrigin = mx + 'px ' + my + 'px';
      function schritt(now) {
        var fertig = true;
        var km = Math.max(0, Math.min(1, (now - t0 + 250) / 350));
        gM.style.transform = 'scale(' + (1 - km * .35) + ')';
        flug.forEach(function (f) {
          var t = (now - f.start) / 900;
          if (t < 1.6) fertig = false;
          if (t < 0) return;
          var tt = Math.min(1, t), e = 1 - Math.pow(1 - tt, 2);
          var x = mx + (f.z[0] - mx) * e, y = my + (f.z[1] - my) * e - Math.sin(Math.PI * tt) * 140;
          f.c.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + (1 - tt * .5) + ')');
          f.c.setAttribute('opacity', tt < 1 ? 1 : Math.max(0, 1 - (t - 1) * 3));
          var tb = Math.max(0, Math.min(1, (now - f.start - 820) / 1000));
          if (tb < 1) fertig = false;
          f.b.jetzt = f.b.h * (1 - Math.pow(1 - tb, 3));
          zeichneHaus(f.b);
        });
        if (!fertig) requestAnimationFrame(schritt); else { stuecke.innerHTML = ''; kran(); }
      }
      requestAnimationFrame(schritt);
    }
    var kranAn = false;
    function kran() {
      if (bewegungAus || kranAn) return; kranAn = true;
      var b = HAUS[4], t0 = performance.now();
      (function dreh(now) {
        if (!kranAn) return;
        b.kranWinkel = .6 + Math.sin((now - t0) / 2600) * .9;
        if (gStadt.style.display !== 'none') zeichneHaus(b);
        requestAnimationFrame(dreh);
      })(t0);
    }

    /* ---------- Geldfluss ---------- */
    var gF = el('g', { style: 'display:none' }, svg);
    var EU = HH.einnahmen_unter, EH = HH.einnahmen_hg;
    var quellen = [
      { name: 'Anteil an der Einkommensteuer', euro: EU['0']['010'], teil: 0, f: '#1d5874' },
      { name: 'Gewerbesteuer', euro: EU['0']['003'], teil: 0, f: '#1d5874' },
      { name: 'Schlüsselzuweisungen vom Land', euro: EU['0']['041'], teil: 0, f: '#1d5874' },
      { name: 'Weitere Steuern und Zuweisungen', sub: 'Umsatzsteuer, Grundsteuer und andere', euro: EH[0].euro - EU['0']['010'] - EU['0']['003'] - EU['0']['041'], teil: 0, f: '#1d5874' },
      { name: 'Gebühren, Erstattungen, Zuschüsse', sub: EH[1].name, euro: EH[1].euro, teil: 0, f: '#3a8a80' },
      { name: 'Sonstige Finanzeinnahmen', sub: 'Zuführung, Konzessionen, Zinsen', euro: EH[2].euro, teil: 0, f: '#6d7f88' },
      { name: 'Nicht gedeckt', sub: 'Zuschussbedarf, dafür gibt es kein Geld', euro: VWH.zuschussbedarf, teil: 0, luecke: true, f: '#b00e2b' },
      { name: 'Neue Kredite', euro: EU['3']['377'], teil: 1, f: '#b00e2b' },
      { name: 'Weitere Mittel für Investitionen', sub: 'Rücklagen, Zuschüsse, Verkäufe', euro: EH[3].euro - EU['3']['377'], teil: 1, f: '#c48d2c' }
    ];
    var ziele = [HAUS[0], HAUS[2], HAUS[1], HAUS[3], HAUS[4]].map(function (b) { return { name: b.kurz, euro: b.euro, teil: b.form === 'baustelle' ? 1 : 0, f: b.f[2], b: b }; });
    var S = .46, LX = 372, MX0 = 604, MX1 = 648, RX = 900, BAR = 12, oben0 = 62;
    function stapel(liste, lueckeTeil, luecke) {
      var y = oben0, vorher = null;
      liste.forEach(function (q) { if (vorher !== null && q.teil !== vorher) y += lueckeTeil; q.y0 = y; q.y1 = y + q.euro / 1e6 * S; y = q.y1 + luecke; vorher = q.teil; });
    }
    stapel(quellen, 30, 9); stapel(ziele, 30, 16);
    // Kassen: Verwaltungshaushalt oben, Vermögenshaushalt unten
    var kasse = [{ name: 'Laufender Betrieb', sub: 'Verwaltungshaushalt', euro: VWH.verwaltungshaushalt_ausgaben }, { name: 'Investitionen', sub: 'Vermögenshaushalt', euro: VWH.vermoegenshaushalt_ausgaben }];
    var hoehe = (SUM / 1e6) * S + 30, mo = (oben0 + Math.max(quellen[quellen.length - 1].y1, ziele[ziele.length - 1].y1)) / 2 - hoehe / 2;
    kasse[0].y0 = mo; kasse[0].y1 = mo + kasse[0].euro / 1e6 * S; kasse[1].y0 = kasse[0].y1 + 30; kasse[1].y1 = kasse[1].y0 + kasse[1].euro / 1e6 * S;
    // Plätze in der Kasse
    [0, 1].forEach(function (teil) {
      var y = kasse[teil].y0; quellen.filter(function (q) { return q.teil === teil; }).forEach(function (q) { q.k0 = y; y += q.euro / 1e6 * S; q.k1 = y; });
      y = kasse[teil].y0; ziele.filter(function (z) { return z.teil === teil; }).forEach(function (z) { z.k0 = y; y += z.euro / 1e6 * S; z.k1 = y; });
    });
    function band(x0, a0, a1, x1, b0, b1) {
      var xm = (x0 + x1) / 2;
      return 'M' + x0 + ',' + a0 + ' C' + xm + ',' + a0 + ' ' + xm + ',' + b0 + ' ' + x1 + ',' + b0 + ' L' + x1 + ',' + b1 + ' C' + xm + ',' + b1 + ' ' + xm + ',' + a1 + ' ' + x0 + ',' + a1 + ' Z';
    }
    function bez(p0, p1, p2, p3, t) { var m = 1 - t; return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3; }
    var gBand = el('g', {}, gF), gMuenzen = el('g', { 'pointer-events': 'none' }, gF), gEt = el('g', {}, gF);
    quellen.forEach(function (q) {
      q.pfad = el('path', { d: band(LX + BAR, q.y0, q.y1, MX0, q.k0, q.k1), fill: q.luecke ? 'url(#hh-schraffur)' : q.f, 'fill-opacity': q.luecke ? 1 : .2, class: q.luecke ? 'hh-luecke' : '', style: 'cursor:pointer;transition:fill-opacity .25s' }, gBand);
      q.balken = el('rect', { x: LX, y: q.y0, width: BAR, height: q.y1 - q.y0, fill: q.luecke ? 'url(#hh-schraffur)' : q.f, stroke: q.luecke ? '#b00e2b' : 'none', 'stroke-dasharray': '3 2' }, gEt);
      var t = el('text', { x: LX - 10, y: (q.y0 + q.y1) / 2 + (q.sub ? -2 : 4), 'text-anchor': 'end', 'font-size': 13, 'font-weight': 600, fill: q.luecke ? '#b00e2b' : '#16232b' }, gEt);
      t.textContent = q.name + '  ' + NF.mio(q.euro);
      if (q.sub) { var t2 = el('text', { x: LX - 10, y: (q.y0 + q.y1) / 2 + 12, 'text-anchor': 'end', 'font-size': 11, fill: '#566a74' }, gEt); t2.textContent = q.sub; }
      [q.pfad, q.balken].forEach(function (e) { e.addEventListener('mouseenter', function (ev) { hebe(q, ev); }); e.addEventListener('mousemove', zeigTip); e.addEventListener('mouseleave', function () { hebe(null); }); });
    });
    ziele.forEach(function (z) {
      z.pfad = el('path', { d: band(MX1, z.k0, z.k1, RX, z.y0, z.y1), fill: z.f, 'fill-opacity': .2, style: 'cursor:pointer;transition:fill-opacity .25s' }, gBand);
      z.balken = el('rect', { x: RX, y: z.y0, width: BAR, height: z.y1 - z.y0, fill: z.f }, gEt);
      var t = el('text', { x: RX + BAR + 10, y: (z.y0 + z.y1) / 2 - 2, 'font-size': 13, 'font-weight': 600, fill: '#16232b' }, gEt); t.textContent = z.name;
      var t2 = el('text', { x: RX + BAR + 10, y: (z.y0 + z.y1) / 2 + 14, 'font-size': 12, fill: '#566a74' }, gEt); t2.textContent = NF.mio(z.euro) + ' · ' + NF.zahl(z.euro / EW) + ' € pro Kopf';
      [z.pfad, z.balken].forEach(function (e) { e.addEventListener('mouseenter', function (ev) { hebe(z, ev); }); e.addEventListener('mousemove', zeigTip); e.addEventListener('mouseleave', function () { hebe(null); }); e.addEventListener('click', function () { karteHaus(z.b); }); });
    });
    kasse.forEach(function (k, i) {
      el('rect', { x: MX0, y: k.y0, width: MX1 - MX0, height: k.y1 - k.y0, rx: 4, fill: i ? '#f6e6c2' : '#dbe7ee' }, gEt);
      var ty = i ? k.y1 + 20 : k.y0 - 26;
      var a = el('text', { x: (MX0 + MX1) / 2, y: ty, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, 'font-family': '"Source Serif 4", Georgia, serif', fill: '#00263a' }, gEt); a.textContent = k.name + ' · ' + NF.mio(k.euro);
      var b = el('text', { x: (MX0 + MX1) / 2, y: ty + 15, 'text-anchor': 'middle', 'font-size': 11, fill: '#566a74' }, gEt); b.textContent = k.sub;
    });
    // Das Loch in der Kasse
    var lq = quellen[6];
    el('rect', { x: MX0, y: lq.k0, width: MX1 - MX0, height: lq.k1 - lq.k0, fill: 'url(#hh-schraffur)', stroke: '#b00e2b', 'stroke-dasharray': '3 2', class: 'hh-luecke' }, gEt);

    function hebe(o, ev) {
      quellen.concat(ziele).forEach(function (x) { if (!x.luecke) x.pfad.setAttribute('fill-opacity', !o ? .2 : (x === o ? .55 : .07)); });
      muenzFilter = o;
      if (!o) { tip.classList.remove('an'); return; }
      tip.innerHTML = '<b>' + NF.esc(o.name) + '</b><br>' + NF.mio(o.euro) + ' · ' + NF.zahl(o.euro / SUM * 100, 1) + ' % des Haushalts' + (o.luecke ? '<br>Für diesen Teil der laufenden Ausgaben gibt es 2026 keine Einnahmen.' : '');
      tip.classList.add('an'); zeigTip(ev);
      if (o.luecke) api.sag('Hier rollt nichts: Für ' + NF.mio(o.euro) + ' laufende Ausgaben fehlen 2026 die Einnahmen. Das ist der Zuschussbedarf im Verwaltungshaushalt.');
      else if (o.name === 'Neue Kredite') api.sag('Kredite dürfen nur Investitionen bezahlen. Deshalb fließen sie allein in den Vermögenshaushalt.');
    }
    function zeigTip(ev) {
      var r = svg.getBoundingClientRect(), x = ev.clientX - r.left + 14; if (x > r.width - 290) x -= 300;
      tip.style.left = x + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px';
    }

    /* Münzen: von einer Einnahme durch die Kasse in eine Ausgabe derselben Kasse */
    var muenzen = [], muenzFilter = null, flussAn = false, letzte = 0;
    function waehle(liste) { var s = liste.reduce(function (a, x) { return a + x.euro; }, 0), r = Math.random() * s; for (var i = 0; i < liste.length; i++) { r -= liste[i].euro; if (r <= 0) return liste[i]; } return liste[liste.length - 1]; }
    function neueMuenze() {
      var q = waehle(quellen.filter(function (x) { return !x.luecke; })), z = waehle(ziele.filter(function (x) { return x.teil === q.teil; }));
      var c = el('g', {}, gMuenzen);
      el('circle', { r: 3.6, fill: '#e3b341', stroke: '#a77b14', 'stroke-width': .8 }, c);
      el('circle', { r: 1.3, cx: -1, cy: -1, fill: '#f8e3a0' }, c);
      muenzen.push({ q: q, z: z, f1: .1 + Math.random() * .8, f2: .1 + Math.random() * .8, t: 0, v: .00030 + Math.random() * .00012, c: c });
    }
    function lauf(now) {
      if (!flussAn) return;
      var dt = Math.min(50, now - (letzte || now)); letzte = now;
      if (muenzen.length < 170 && Math.random() < .55) neueMuenze();
      muenzen = muenzen.filter(function (m) {
        m.t += m.v * dt;
        var x, y, t = m.t;
        if (t < 1) {
          var a = m.q.y0 + (m.q.y1 - m.q.y0) * m.f1, b = m.q.k0 + (m.q.k1 - m.q.k0) * m.f1, x0 = LX + BAR, x1 = MX0, xm = (x0 + x1) / 2;
          x = bez(x0, xm, xm, x1, t); y = bez(a, a, b, b, t);
        } else if (t < 1.35) {
          var s = (t - 1) / .35, e = s * s * (3 - 2 * s), yi = m.q.k0 + (m.q.k1 - m.q.k0) * m.f1, yo = m.z.k0 + (m.z.k1 - m.z.k0) * m.f2;
          x = MX0 + (MX1 - MX0) * s; y = yi + (yo - yi) * e;
        } else if (t < 2.35) {
          var u2 = t - 1.35, c0 = m.z.k0 + (m.z.k1 - m.z.k0) * m.f2, c1 = m.z.y0 + (m.z.y1 - m.z.y0) * m.f2, xa = MX1, xb = RX, xn = (xa + xb) / 2;
          x = bez(xa, xn, xn, xb, u2); y = bez(c0, c0, c1, c1, u2);
        } else { m.c.remove(); return false; }
        m.c.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
        m.c.setAttribute('opacity', !muenzFilter || muenzFilter === m.q || muenzFilter === m.z ? 1 : .12);
        return true;
      });
      requestAnimationFrame(lauf);
    }

    var bStadt = api.szene.querySelector('#hh-stadt'), bFluss = api.szene.querySelector('#hh-fluss');
    function ansicht(f) {
      bStadt.setAttribute('aria-pressed', f ? 'false' : 'true'); bFluss.setAttribute('aria-pressed', f ? 'true' : 'false');
      gStadt.style.display = f ? 'none' : ''; gF.style.display = f ? '' : 'none';
      svg.setAttribute('aria-label', f ? 'Geldfluss von den Einnahmen durch Verwaltungs- und Vermögenshaushalt in die Ausgaben' : 'Isometrische Stadt aus den Hauptgruppen des Haushalts');
      api.karteZu();
      if (f) {
        if (!flussAn && !bewegungAus) { flussAn = true; letzte = 0; for (var i = 0; i < 90; i++) { neueMuenze(); muenzen[muenzen.length - 1].t = Math.random() * 2.3; } requestAnimationFrame(lauf); }
        api.sag('Jede Münze kommt aus einer Einnahme und rollt durch die Kasse in eine Ausgabe. Der rot schraffierte Strom bleibt leer: ' + NF.mio(VWH.zuschussbedarf) + ' sind nicht gedeckt.');
      } else {
        flussAn = false;
        api.sag('Personal und Zuschüsse sind die beiden größten Häuser. Klicken Sie eines an.');
      }
    }
    bStadt.addEventListener('click', function () { ansicht(false); });
    bFluss.addEventListener('click', function () { ansicht(true); });
    HAUS.forEach(zeichneHaus);
    muenze();
    api.sag('Das ist Ihr Anteil am Haushalt 2026. Die Münze teilt sich gleich auf fünf Häuser auf.');
    setTimeout(function () { if (gF.style.display === 'none') api.sag('Personal und Zuschüsse sind die beiden größten Häuser. Klicken Sie eines an.'); }, 4200);
    this.pause = function () { flussAn = false; kranAn = false; };
    this.weiter = function () { if (gF.style.display !== 'none') ansicht(true); else kran(); };
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
