/* Miete: eine aufgeschnittene Wohnung in Iso-Ansicht. Jede Ausstattung lässt sich an- und abschalten,
   der Mietzeiger daneben zeigt sofort, was der Mietspiegel als übliche Miete nennt. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'miete', reiter: 'Miete', form: 'Puppenhaus', farbe: '#96551f', seite: 'miete.html',
  titel: 'Das Puppenhaus',
  idee: 'Eine Wohnung im Erdgeschoss, aufgeschnitten wie ein Puppenhaus. Schalten Sie Ausstattung an oder ab: Küche, Bad, Heizung, Aufzug, Garten. Der Zeiger rechts zeigt sofort, was der Mietspiegel dafür als übliche Miete nennt.',
  notizen: [
    ['Bedienung', 'In der Wohnung oder in der Liste rechts klicken. Maus über einen Eintrag der Liste zeigt, wo er in der Wohnung ist. Fläche, Baujahr, Lage und Haustyp stehen über der Liste.'],
    ['Wow-Moment', 'Die Wohnung verwandelt sich: Aus der Wanne wird eine bodengleiche Dusche, die Heizkörper weichen einem Einzelofen, die Dämmung legt sich auf die Mauern, der Aufzug fährt. Der Zeiger schwingt jedes Mal mit.'],
    ['Mobil', 'Wohnung oben als Bild zum Antippen, Zeiger und Liste darunter. Der Rechenweg ist derselbe wie im heutigen Rechner.'],
    ['Daten', 'data/miete.js: Basismiete nach Fläche, Zu- und Abschläge (Mietspiegel 2025–2027), Spanne −21 % bis +20 %, Mietpreisbremse +10 %. Gleiche Formel wie auf miete.html. Stellplatz und Garten zählen wie dort nur im Mehrfamilienhaus.']
  ],
  init: function (api) {
    var MS = MIETE_DATEN.mietspiegel, BR = MIETE_DATEN.bremse;
    var M = {}; MS.merkmale.forEach(function (m) { M[m.id] = m; });
    var KURZ = { stellplatz: 'Stellplatz', garten: 'Garten', daemmung: 'Dämmung', elektro: 'Neue Elektrik', sanitaer: 'Neues Bad', ebk: 'Einbauküche', aufzug: 'Aufzug', dusche: 'Dusche ohne Stufe', keineheizung: 'Nur Einzelofen', durchgang: 'Durchgangszimmer', aufputz: 'Leitungen über Putz' };
    var zustand = { flaeche: 65, baujahr: 'b1980', lage: 'normal', haus: 'mfh', an: { ebk: true, garten: true } };

    var css = document.createElement('style');
    css.textContent = [
      '.mi{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:8px 28px;padding:10px 18px 88px;align-items:start}',
      '.mi-bild svg{display:block;width:100%;height:auto}',
      '.mi-teil{cursor:pointer;transition:filter .2s}',
      '.mi-teil:hover,.mi-teil.zeigen{filter:drop-shadow(0 0 5px rgba(242,181,44,.95)) drop-shadow(0 0 2px rgba(242,181,44,.9))}',
      '.mi-seite{display:grid;gap:12px;padding-top:6px}',
      '.mi-zahl{text-align:center;margin-top:-14px}',
      '.mi-zeiger-kopf{text-align:center;font-size:.82rem;font-weight:700;color:#00263a;margin-bottom:-8px}',
      '.mi-zeiger-kopf span{color:#b00e2b}',
      '.mi-zahl strong{display:block;font-family:var(--font-display);font-weight:900;font-size:2.5rem;line-height:1;color:#96551f;font-variant-numeric:tabular-nums}',
      '.mi-zahl span{display:block;margin-top:6px;font-size:1.1rem;font-weight:700;color:#00263a}',
      '.mi-zahl span b{color:#96551f}',
      '.mi-zahl small{display:block;font-size:.78rem;color:var(--grau);margin-top:2px}',
      '.mi-feld{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;align-items:center;font-size:.86rem;border-top:1px solid var(--linie);padding-top:10px}',
      '.mi-feld label{font-weight:600}',
      '.mi-fl-zeile{display:flex;align-items:center;gap:12px}',
      '.mi-fl-wert{flex:none;min-width:4.4rem;text-align:right;font-family:var(--font-display);font-weight:900;font-size:1.3rem;line-height:1;color:#96551f;font-variant-numeric:tabular-nums}',
      '.mi-feld .reihe{display:flex;gap:5px;flex-wrap:wrap}',
      '.mi-liste{border-top:1px solid var(--linie);padding-top:10px;display:grid;gap:6px}',
      '.mi-liste h4{margin:4px 0 0;font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:var(--grau)}',
      '.mi-liste .reihe{display:flex;gap:5px;flex-wrap:wrap}',
      '.mi-chip{border:1px solid var(--linie);background:#fff;border-radius:999px;padding:4px 10px;font-size:.8rem;cursor:pointer;display:inline-flex;gap:6px;align-items:baseline}',
      '.mi-chip b{font-variant-numeric:tabular-nums}',
      '.mi-chip[aria-pressed="true"].plus{background:#2e7d4f;border-color:#2e7d4f;color:#fff}',
      '.mi-chip[aria-pressed="true"].minus{background:#b00e2b;border-color:#b00e2b;color:#fff}',
      '.mi-chip:disabled{opacity:.4;cursor:not-allowed}',
      '@media (max-width:820px){.mi{grid-template-columns:minmax(0,1fr)}}'
    ].join('\n');
    document.head.appendChild(css);

    api.szene.innerHTML = '<div class="mi"><div class="mi-bild"><svg viewBox="0 0 720 540" role="img" aria-label="Aufgeschnittene Wohnung mit schaltbarer Ausstattung"></svg></div>' +
      '<div class="mi-seite"><div><div class="mi-zeiger-kopf">Übliche Miete laut Mietspiegel, netto kalt je m²<br><span>Rote Marke: Grenze der Mietpreisbremse</span></div><svg class="mi-zeiger" viewBox="-30 -20 440 234" aria-hidden="true"></svg></div>' +
      '<div class="mi-zahl" aria-live="polite"><strong id="mi-ovm"></strong><span id="mi-monat"></span><small id="mi-spanne"></small></div>' +
      '<div class="mi-feld"><label for="mi-fl">Fläche</label><div class="mi-fl-zeile"><input id="mi-fl" type="range" min="' + MS.flaeche_min + '" max="' + MS.flaeche_max + '" value="65" style="flex:1;min-width:0;accent-color:#96551f"><output id="mi-fl-wert" class="mi-fl-wert" for="mi-fl" aria-live="off">65 m²</output></div>' +
      '<label for="mi-bj">Baujahr</label><select id="mi-bj" style="font:inherit;padding:4px 8px;border:1px solid var(--linie-stark);border-radius:6px;background:#fff">' +
      MS.baujahr.map(function (b) { return '<option value="' + b.id + '"' + (b.id === zustand.baujahr ? ' selected' : '') + '>' + b.n + ' (' + (b.wert > 0 ? '+' : b.wert < 0 ? '−' : '±') + Math.abs(b.wert) + ' %)</option>'; }).join('') + '</select>' +
      '<label>Lage</label><div class="reihe">' + MS.lage.map(function (l) { return '<button type="button" class="gf-chip klein" data-lage="' + l.id + '" aria-pressed="' + (l.id === 'normal') + '">' + l.l.replace(' Lage', '') + '</button>'; }).join('') + '</div>' +
      '<label>Haus</label><div class="reihe">' + MS.haustyp.map(function (h) { return '<button type="button" class="gf-chip klein" data-haus="' + h.id + '" aria-pressed="' + (h.id === 'mfh') + '">' + (h.id === 'mfh' ? 'Mehrfamilienhaus' : 'Ein-/Zweifamilienhaus') + '</button>'; }).join('') + '</div></div>' +
      '<div class="mi-liste"><h4>Macht die Wohnung teurer</h4><div class="reihe" id="mi-plus"></div><h4>Macht sie billiger</h4><div class="reihe" id="mi-minus"></div></div>' +
      '</div></div>';

    var svg = api.szene.querySelector('.mi-bild svg');
    var u = 31, ox = 338, oy = 112;
    function iso(x, y, z) { return [ox + (x - y) * .866 * u, oy + (x + y) * .5 * u - z * u]; }
    function pts(liste) { return liste.map(function (p) { var q = iso(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
    function flach(g, liste, attrs) { attrs = attrs || {}; attrs.points = pts(liste); return el('polygon', attrs, g); }
    /* Quader: Deckel, Seite zur y-Front, Seite zur x-Front */
    function quader(g, x, y, z, dx, dy, dz, f, extra) {
      var a = extra || {};
      flach(g, [[x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], Object.assign({ fill: f[1] }, a));
      flach(g, [[x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz]], Object.assign({ fill: f[2] }, a));
      flach(g, [[x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], Object.assign({ fill: f[0] }, a));
    }
    function geist(g, liste) { return flach(g, liste, { fill: 'rgba(255,255,255,.35)', stroke: '#8f8779', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }); }
    function linie(g, a, b, attrs) { var p = iso(a[0], a[1], a[2]), q = iso(b[0], b[1], b[2]); attrs = attrs || {}; attrs.x1 = p[0]; attrs.y1 = p[1]; attrs.x2 = q[0]; attrs.y2 = q[1]; return el('line', attrs, g); }

    var defs = el('defs', {}, svg);
    var glow = el('radialGradient', { id: 'mi-glow' }, defs);
    el('stop', { offset: 0, 'stop-color': '#ffe08a', 'stop-opacity': .95 }, glow); el('stop', { offset: 1, 'stop-color': '#ffe08a', 'stop-opacity': 0 }, glow);
    el('rect', { width: 720, height: 540, fill: '#fff' }, svg);

    var WAND = ['#cdbb9c', '#f7f0e4', '#efe5d3'], H = 2.6, HI = 1.1;
    var teile = {};
    function teil(id, malen) {
      var g = el('g', { class: 'mi-teil' }, svg), an = el('g', {}, g), aus = el('g', {}, g);
      malen(an, aus);
      g.addEventListener('click', function (ev) { schalte(id, ev); });
      g.addEventListener('mouseenter', function () { tipZeigen(id); });
      g.addEventListener('mouseleave', function () { tipZeigen(null); });
      teile[id] = { g: g, an: an, aus: aus };
    }

    /* Grund: Gelände, Garten, Stellplatz, Bodenplatte */
    flach(svg, [[-1.6, -1.6, -.35], [14.6, -1.6, -.35], [14.6, 11.8, -.35], [-1.6, 11.8, -.35]], { fill: '#f1ede5' });
    teil('garten', function (an, aus) {
      flach(an, [[0, 8.5, -.3], [6.6, 8.5, -.3], [6.6, 11.4, -.3], [0, 11.4, -.3]], { fill: '#a9cf8f' });
      for (var i = 0; i < 7; i++) quader(an, .2 + i * .9, 11.0, -.3, .75, .35, .55, ['#6fa35a', '#5e9150', '#4f8045']);
      [[1.2, 9.6], [4.9, 10.1]].forEach(function (b) {
        var s = iso(b[0], b[1], -.3), k = iso(b[0], b[1], 1.3);
        el('line', { x1: s[0], y1: s[1], x2: k[0], y2: k[1], stroke: '#8b6b4a', 'stroke-width': 4 }, an);
        el('circle', { cx: k[0], cy: k[1] - 10, r: 22, fill: '#6fa35a' }, an); el('circle', { cx: k[0] - 7, cy: k[1] - 17, r: 10, fill: '#8cbf73' }, an);
      });
      quader(an, 2.6, 9.2, -.3, 1.2, .5, .45, ['#c99b6b', '#a97c4f', '#8e6640']);
      geist(aus, [[0, 8.5, -.3], [6.6, 8.5, -.3], [6.6, 11.4, -.3], [0, 11.4, -.3]]);
    });
    teil('stellplatz', function (an, aus) {
      flach(an, [[8.0, 8.5, -.3], [12.2, 8.5, -.3], [12.2, 11.4, -.3], [8.0, 11.4, -.3]], { fill: '#b9bfc3' });
      [8.1, 12.1].forEach(function (x) { linie(an, [x, 8.6, -.3], [x, 11.3, -.3], { stroke: '#fff', 'stroke-width': 2 }); });
      quader(an, 8.7, 9.0, -.3, 2.9, 1.6, .65, ['#4f87a0', '#3d6f86', '#2f5a6e']);
      quader(an, 9.3, 9.15, .35, 1.7, 1.3, .5, ['#9cc3d6', '#7aa6bb', '#5f8aa0']);
      geist(aus, [[8.0, 8.5, -.3], [12.2, 8.5, -.3], [12.2, 11.4, -.3], [8.0, 11.4, -.3]]);
    });
    // Bodenplatte mit Kante
    quader(svg, -.25, -.25, -.35, 12.5, 8.45, .35, ['#e8cfa4', '#c9b089', '#b39a73']);
    flach(svg, [[0, 4.1, .002], [4, 4.1, .002], [4, 8, .002], [0, 8, .002]], { fill: '#e3ecef' });
    flach(svg, [[0, 0, .002], [4, 0, .002], [4, 4, .002], [0, 4, .002]], { fill: '#eee3cf' });
    for (var d = 4.6; d < 12; d += .6) linie(svg, [d, 0, .003], [d, 8, .003], { stroke: 'rgba(160,120,70,.18)' });
    flach(svg, [[5.0, 3.2, .004], [8.3, 3.2, .004], [8.3, 6.8, .004], [5.0, 6.8, .004]], { fill: '#d9c6e0', opacity: .7 });

    /* Dämmung außen auf den Mauern */
    teil('daemmung', function (an, aus) {
      quader(an, -.62, -.62, 0, .36, 8.62, H, ['#f2a94e', '#e0913a', '#c97a28']);
      quader(an, -.62, -.62, 0, 12.62, .36, H, ['#f2a94e', '#e0913a', '#c97a28']);
      geist(aus, [[-.62, -.62, H], [12, -.62, H], [12, -.26, H], [-.26, -.26, H], [-.26, 8, H], [-.62, 8, H]]);
    });
    // Außenmauern hinten
    quader(svg, -.26, -.26, 0, .26, 8.26, H, WAND);
    quader(svg, -.26, -.26, 0, 12.26, .26, H, WAND);
    // Fenster in der Rückwand
    [[5.3, 7.7], [9.9, 11.4]].forEach(function (f) {
      flach(svg, [[f[0], 0, 1.0], [f[1], 0, 1.0], [f[1], 0, 2.2], [f[0], 0, 2.2]], { fill: '#cfe6f2', stroke: '#b69f7f', 'stroke-width': 1.5 });
      linie(svg, [(f[0] + f[1]) / 2, 0, 1.0], [(f[0] + f[1]) / 2, 0, 2.2], { stroke: '#b69f7f', 'stroke-width': 1.5 });
    });

    /* Leitungen über Putz an der Rückwand */
    teil('aufputz', function (an, aus) {
      linie(an, [.1, .06, 2.32], [9, .06, 2.32], { stroke: '#8a8a8a', 'stroke-width': 3.2, 'stroke-linecap': 'round' });
      linie(an, [.1, .1, 2.18], [9, .1, 2.18], { stroke: '#a3a3a3', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
      linie(an, [3.6, .06, 2.32], [3.6, .06, .4], { stroke: '#8a8a8a', 'stroke-width': 3.2 });
      linie(an, [8.6, .06, 2.32], [8.6, .06, .4], { stroke: '#8a8a8a', 'stroke-width': 3.2 });
      [3.6, 8.6].forEach(function (x) { flach(an, [[x - .15, .05, .3], [x + .15, .05, .3], [x + .15, .05, .55], [x - .15, .05, .55]], { fill: '#d8d8d8', stroke: '#8a8a8a' }); });
      linie(aus, [.1, .06, 2.3], [9, .06, 2.3], { stroke: '#8f8779', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' });
      // Die Leitungen sind nur ein paar Pixel dick: eine breite, unsichtbare Fläche fängt den Klick
      var treffer = { stroke: 'transparent', 'stroke-width': 22, 'stroke-linecap': 'round', 'pointer-events': 'stroke' };
      [[[.1, .08, 2.25], [9, .08, 2.25]], [[3.6, .06, 2.32], [3.6, .06, .3]], [[8.6, .06, 2.32], [8.6, .06, .3]]].forEach(function (l) { linie(an.parentNode, l[0], l[1], Object.assign({}, treffer)); });
    });

    /* Küche */
    teil('ebk', function (an, aus) {
      quader(an, 0, .3, 0, .62, 2.8, .9, ['#dcd6cb', '#6f8792', '#5c727d']);
      quader(an, 0, 3.1, 0, .66, .78, 1.95, ['#e9eef0', '#c9d3d8', '#b2bec4']);
      quader(an, 0, .5, 1.55, .36, 2.4, .62, ['#dcd6cb', '#7f96a0', '#6a818b']);
      flach(an, [[.1, .7, .905], [.5, .7, .905], [.5, 1.3, .905], [.1, 1.3, .905]], { fill: '#a9b6bc' });
      [[.3, 2.0], [.3, 2.5]].forEach(function (p) { var q = iso(p[0], p[1], .91); el('ellipse', { cx: q[0], cy: q[1], rx: 7, ry: 3.6, fill: '#2b2b2b' }, an); });
      geist(aus, [[0, .3, .9], [.62, .3, .9], [.62, 3.88, .9], [0, 3.88, .9]]);
      quader(aus, 0, 3.0, 0, .55, .55, .85, ['#f3f1ec', '#d9d5cc', '#c7c2b7']);
    });
    /* Bad: Fliesen, Waschbecken, Wanne oder bodengleiche Dusche */
    teil('sanitaer', function (an, aus) {
      for (var yy = 4.15; yy < 7.95; yy += .32) for (var zz = 0; zz < 1.9; zz += .32)
        flach(an, [[.002, yy, zz], [.002, yy + .3, zz], [.002, yy + .3, zz + .3], [.002, yy, zz + .3]], { fill: ((yy * 3 + zz * 3) | 0) % 2 ? '#cfe7ef' : '#b9dce8' });
      quader(an, 0, 4.6, .75, .5, .7, .12, ['#ffffff', '#e3e9ec', '#d3dbdf']);
      quader(an, 0, 5.55, 0, .62, .45, .45, ['#ffffff', '#e8eef1', '#d6dfe3']);
      flach(aus, [[.002, 4.2, 0], [.002, 7.9, 0], [.002, 7.9, 1.6], [.002, 4.2, 1.6]], { fill: '#e8dcc0' });
      quader(aus, 0, 4.6, .7, .45, .65, .16, ['#efe6cf', '#d8ccae', '#c6b996']);
    });
    teil('dusche', function (an, aus) {
      flach(an, [[.05, 6.5, .006], [1.35, 6.5, .006], [1.35, 7.95, .006], [.05, 7.95, .006]], { fill: '#9fc7d8' });
      flach(an, [[1.35, 6.5, 0], [1.35, 7.95, 0], [1.35, 7.95, 2.0], [1.35, 6.5, 2.0]], { fill: 'rgba(160,205,225,.35)', stroke: '#7aaec4', 'stroke-width': 1.2 });
      linie(an, [.05, 7.2, 2.1], [.4, 7.2, 1.95], { stroke: '#8a8a8a', 'stroke-width': 3, 'stroke-linecap': 'round' });
      for (var i = 0; i < 5; i++) linie(an, [.4, 7.0 + i * .1, 1.85], [.5, 7.0 + i * .1, .3], { stroke: '#7aaec4', 'stroke-width': 1, 'stroke-dasharray': '2 5' });
      quader(aus, 0, 6.1, 0, .85, 1.85, .58, ['#ffffff', '#e3e9ec', '#d3dbdf']);
      flach(aus, [[.12, 6.25, .585], [.72, 6.25, .585], [.72, 7.8, .585], [.12, 7.8, .585]], { fill: '#bcd9e5' });
    });

    // Innenwände, halbhoch geschnitten
    [[4, 0, 2.4], [4, 3.4, 5.9], [4, 6.9, 8]].forEach(function (w) { quader(svg, w[0], w[1], 0, .12, w[2] - w[1], HI, WAND); });
    quader(svg, 0, 4, 0, 4, .12, HI, WAND);
    [[9, 0, 3], [9, 4, 8]].forEach(function (w) { quader(svg, w[0], w[1], 0, .12, w[2] - w[1], HI, WAND); });

    /* Heizung: Heizkörper oder Einzelofen */
    teil('keineheizung', function (an, aus) {
      quader(an, 4.25, .2, 0, .85, .85, 1.75, ['#c96a50', '#b5533b', '#9b4430']);
      var q = iso(4.7, 1.05, .7); el('rect', { x: q[0] - 9, y: q[1] - 14, width: 18, height: 14, rx: 2, fill: '#f6b24a' }, an);
      linie(an, [4.67, .62, 1.75], [4.67, .62, 2.6], { stroke: '#6b6b6b', 'stroke-width': 4 });
      [[5.6, 7.4], [10.1, 11.2]].forEach(function (r) {
        quader(aus, r[0], .02, .22, r[1] - r[0], .14, .62, ['#ffffff', '#eef0f1', '#dfe3e5']);
        for (var x = r[0] + .15; x < r[1]; x += .18) linie(aus, [x, .165, .26], [x, .165, .8], { stroke: '#cfd5d8', 'stroke-width': 1 });
      });
    });

    // Möbel
    quader(svg, 4.5, 4.4, 0, .9, 2.8, .45, ['#7d9aa8', '#5f7d8b', '#4e6a77']);
    quader(svg, 4.5, 4.4, .45, .32, 2.8, .42, ['#8aa8b6', '#6b8997', '#59747f']);
    quader(svg, 6.4, 4.6, 0, 1.1, 1.6, .42, ['#d0a879', '#b48d5f', '#9c784e']);
    quader(svg, 9.6, 4.4, 0, 2.1, 3.0, .5, ['#f4efe6', '#ddd2bf', '#c9bca6']);
    quader(svg, 9.6, 4.4, .5, .5, 3.0, .35, ['#c9a77f', '#b28e66', '#9a7854']);
    quader(svg, 9.8, 4.7, .5, .45, 1.1, .16, ['#ffffff', '#e8e2d6', '#d8d0c0']);
    quader(svg, 9.8, 6.0, .5, .45, 1.1, .16, ['#ffffff', '#e8e2d6', '#d8d0c0']);
    quader(svg, 10.2, 4.4, .5, 1.5, 3.0, .08, ['#e6b85c', '#d0a043', '#b98a2e']);

    /* Elektrik: Lampen und Steckdosen */
    teil('elektro', function (an, aus) {
      [[7.0, 5.4], [10.6, 2.0], [2.0, 2.0]].forEach(function (l) {
        var top = iso(l[0], l[1], H), lam = iso(l[0], l[1], 2.0), boden = iso(l[0], l[1], 0);
        el('ellipse', { cx: boden[0], cy: boden[1], rx: 60, ry: 30, fill: 'url(#mi-glow)' }, an);
        el('line', { x1: top[0], y1: top[1], x2: lam[0], y2: lam[1], stroke: '#4d4d4d', 'stroke-width': 1 }, an);
        el('path', { d: 'M' + (lam[0] - 9) + ',' + (lam[1] + 6) + ' Q' + lam[0] + ',' + (lam[1] - 8) + ' ' + (lam[0] + 9) + ',' + (lam[1] + 6) + ' Z', fill: '#f2b52c' }, an);
        el('circle', { cx: lam[0], cy: lam[1] + 7, r: 3.5, fill: '#fff6cf' }, an);
      });
      [[6.2, .3], [11.8, .3]].forEach(function (s) { flach(an, [[s[0], .03, s[1]], [s[0] + .35, .03, s[1]], [s[0] + .35, .03, s[1] + .2], [s[0], .03, s[1] + .2]], { fill: '#fff', stroke: '#16232b', 'stroke-width': .8 }); });
      [[7.0, 5.4], [10.6, 2.0], [2.0, 2.0]].forEach(function (l) {
        var top = iso(l[0], l[1], H), lam = iso(l[0], l[1], 2.0);
        el('line', { x1: top[0], y1: top[1], x2: lam[0], y2: lam[1], stroke: '#8f8779', 'stroke-width': 1, 'stroke-dasharray': '2 2' }, aus);
        el('circle', { cx: lam[0], cy: lam[1] + 4, r: 5, fill: '#e1ddd5' }, aus);
      });
    });

    /* Durchgangszimmer: Weg ins Schlafzimmer nur durchs Wohnzimmer */
    teil('durchgang', function (an, aus) {
      var weg = [[6.5, 8.3, .05], [6.5, 3.5, .05], [10.6, 3.5, .05], [10.6, 4.2, .05]].map(function (p) { return iso(p[0], p[1], p[2]); });
      el('polyline', { points: weg.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#b00e2b', 'stroke-width': 3, 'stroke-dasharray': '8 5', 'stroke-linejoin': 'round' }, an);
      var e = weg[weg.length - 1]; el('circle', { cx: e[0], cy: e[1], r: 5, fill: '#b00e2b' }, an);
      var a = weg[0]; el('circle', { cx: a[0], cy: a[1], r: 5, fill: '#fff', stroke: '#b00e2b', 'stroke-width': 2 }, an);
      el('polyline', { points: weg.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#8f8779', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, aus);
    });

    /* Aufzug im Schacht neben der Wohnung */
    var kabine;
    teil('aufzug', function (an, aus) {
      var x = 12.45, y = .1, w = 1.5, dd = 1.5, z0 = -.35, z1 = 5.4;
      flach(an, [[x, y + dd, z0], [x + w, y + dd, z0], [x + w, y + dd, z1], [x, y + dd, z1]], { fill: 'rgba(170,205,222,.35)', stroke: '#5f7d91', 'stroke-width': 1.2 });
      flach(an, [[x + w, y, z0], [x + w, y + dd, z0], [x + w, y + dd, z1], [x + w, y, z1]], { fill: 'rgba(150,190,210,.4)', stroke: '#5f7d91', 'stroke-width': 1.2 });
      flach(an, [[x, y, z1], [x + w, y, z1], [x + w, y + dd, z1], [x, y + dd, z1]], { fill: '#5f7d91' });
      kabine = el('g', {}, an);
      quader(kabine, x + .1, y + .1, 0, w - .2, dd - .2, 1.9, ['#e6edf1', '#9cb6c4', '#86a2b2']);
      linie(an, [x + w / 2, y + dd / 2, z1], [x + w / 2, y + dd / 2, 1.95], { stroke: '#3d5566', 'stroke-width': 1 });
      geist(aus, [[x, y + dd, z0], [x + w, y + dd, z0], [x + w, y + dd, z1], [x, y + dd, z1]]);
      geist(aus, [[x + w, y, z0], [x + w, y + dd, z0], [x + w, y + dd, z1], [x + w, y, z1]]);
    });

    // Raumnamen
    [['Küche', 2, 2.1], ['Bad', 2.2, 6.2], ['Wohnen', 6.6, 1.6], ['Schlafen', 11.3, 1.9]].forEach(function (r) {
      var q = iso(r[1], r[2], 0); var t = el('text', { x: q[0], y: q[1] + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: 'rgba(22,35,43,.45)', 'letter-spacing': '.06em', 'pointer-events': 'none' }, svg); t.textContent = r[0].toUpperCase();
    });
    var tip = el('g', { 'pointer-events': 'none', opacity: 0 }, svg);
    var tipBg = el('rect', { rx: 6, height: 26, fill: '#fff', stroke: '#8f8779' }, tip);
    var tipT = el('text', { 'font-size': 13, 'font-weight': 600, fill: '#16232b' }, tip);
    var TIPPLATZ = { garten: [3, 10.5, 1.6], stellplatz: [10, 10, 1.6], daemmung: [3, -.6, 3.2], aufputz: [6.5, 0, 2.8], ebk: [.3, 2, 2.6], sanitaer: [0, 5.5, 2.3], dusche: [.6, 7.2, 2.4], keineheizung: [4.6, .6, 2.3], elektro: [7, 5.4, 2.7], durchgang: [8.5, 3.5, .8], aufzug: [13.2, .8, 5.9] };
    function tipZeigen(id) {
      api.szene.querySelectorAll('.mi-chip').forEach(function (c) { c.style.outline = c.dataset.id === id ? '2px solid #f2b52c' : ''; });
      if (!id) { tip.setAttribute('opacity', 0); return; }
      var m = M[id], p = iso.apply(null, TIPPLATZ[id]), txt = KURZ[id] + '  ' + (m.wert > 0 ? '+' : '−') + Math.abs(m.wert) + ' %' + (zaehlt(id) ? '' : ' (zählt nur im Mehrfamilienhaus)');
      tipT.textContent = txt; var w = txt.length * 7.1 + 20;
      tipBg.setAttribute('width', w); tipBg.setAttribute('x', p[0] - w / 2); tipBg.setAttribute('y', p[1] - 30);
      tipT.setAttribute('x', p[0] - w / 2 + 10); tipT.setAttribute('y', p[1] - 12);
      tip.setAttribute('opacity', 1);
    }

    /* Liste rechts */
    function zaehlt(id) { return !(M[id].gruppe === 'mfh' && zustand.haus !== 'mfh'); }
    var plus = api.szene.querySelector('#mi-plus'), minus = api.szene.querySelector('#mi-minus');
    MS.merkmale.forEach(function (m) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mi-chip ' + (m.wert > 0 ? 'plus' : 'minus'); b.dataset.id = m.id;
      b.title = m.n;
      b.innerHTML = KURZ[m.id] + ' <b>' + (m.wert > 0 ? '+' : '−') + Math.abs(m.wert) + ' %</b>';
      b.addEventListener('click', function (ev) { schalte(m.id, ev); });
      b.addEventListener('mouseenter', function () { teile[m.id].g.classList.add('zeigen'); tipZeigen(m.id); });
      b.addEventListener('mouseleave', function () { teile[m.id].g.classList.remove('zeigen'); tipZeigen(null); });
      (m.wert > 0 ? plus : minus).appendChild(b);
    });

    function zeigeAlle() {
      Object.keys(teile).forEach(function (id) {
        var on = !!zustand.an[id], t = teile[id];
        t.an.style.display = on ? '' : 'none'; t.aus.style.display = on ? 'none' : '';
        t.g.style.opacity = zaehlt(id) ? 1 : .45;
        var c = api.szene.querySelector('.mi-chip[data-id="' + id + '"]');
        c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.disabled = !zaehlt(id);
      });
    }
    function schalte(id, ev) {
      if (!zaehlt(id)) { api.sag(KURZ[id] + ' zählt im Mietspiegel nur im Mehrfamilienhaus.'); return; }
      zustand.an[id] = !zustand.an[id]; zeigeAlle();
      var r = rechne(), m = M[id], an = zustand.an[id], w = an ? m.wert : -m.wert;
      if (!bewegungAus && id === 'aufzug' && an && kabine) {
        kabine.style.transition = 'none'; kabine.style.transform = 'translateY(' + (3 * u) + 'px)';
        requestAnimationFrame(function () { requestAnimationFrame(function () { kabine.style.transition = 'transform 1.2s cubic-bezier(.4,0,.2,1)'; kabine.style.transform = 'translateY(0)'; }); });
      }
      if (!bewegungAus) {
        var p = iso.apply(null, TIPPLATZ[id]);
        var f = el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 900, fill: w > 0 ? '#2e7d4f' : '#b00e2b', 'pointer-events': 'none', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4 }, svg);
        f.textContent = (w > 0 ? '+' : '−') + Math.abs(w) + ' %';
        f.style.transition = 'transform 1.1s ease-out, opacity 1.1s'; void f.getBBox();
        f.style.transform = 'translateY(-46px)'; f.style.opacity = 0; setTimeout(function () { f.remove(); }, 1150);
      }
      api.sag(KURZ[id] + (an ? ' an: ' : ' aus: ') + (w > 0 ? '+' : '−') + Math.abs(w) + ' %. Übliche Miete jetzt ' + NF.zahl(r.ovm, 2) + ' € je m². Bei einer neuen Vermietung sind in der Regel höchstens ' + NF.zahl(r.grenze, 2) + ' € erlaubt.');
    }

    /* Mietzeiger */
    var gz = el('g', { transform: 'translate(190,182)' }, api.szene.querySelector('.mi-zeiger'));
    var lo = 4, hi = 20, R = 140;
    function winkel(v) { return Math.PI + Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * Math.PI; }
    function bogen(a, b, r) { var p0 = [Math.cos(a) * r, Math.sin(a) * r], p1 = [Math.cos(b) * r, Math.sin(b) * r]; return 'M' + p0 + ' A' + r + ',' + r + ' 0 ' + (b - a > Math.PI ? 1 : 0) + ' 1 ' + p1; }
    el('path', { d: bogen(Math.PI, 2 * Math.PI, R), fill: 'none', stroke: '#efe7da', 'stroke-width': 22 }, gz);
    var spanne = el('path', { fill: 'none', stroke: '#e8c59a', 'stroke-width': 22 }, gz);
    var bremse = el('line', { stroke: '#b00e2b', 'stroke-width': 3 }, gz);
    var bremseT = el('text', { 'font-size': 11, fill: '#b00e2b', 'font-weight': 700, 'text-anchor': 'middle' }, gz);
    var bremseT1 = el('tspan', {}, bremseT), bremseT2 = el('tspan', { 'font-size': 12.5, 'font-weight': 900 }, bremseT);
    bremseT1.textContent = 'Bremse';
    for (var v = lo; v <= hi; v += 4) { var a = winkel(v); var t = el('text', { x: Math.cos(a) * (R - 30), y: Math.sin(a) * (R - 30) + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#8f8779' }, gz); t.textContent = v + ' €'; }
    var nadel = el('g', {}, gz);
    el('polygon', { points: '0,-4.5 ' + (R - 6) + ',0 0,4.5', fill: '#00263a' }, nadel); el('circle', { r: 9, fill: '#00263a' }, gz);
    nadel.style.transition = bewegungAus ? '' : 'transform .9s cubic-bezier(.3,1.6,.5,1)';

    function basismiete(fl) { var f = Math.floor(fl); for (var i = 0; i < MS.basismiete.length; i++) { var b = MS.basismiete[i]; if (f >= b[0] && f <= b[1]) return b[2]; } return null; }
    function rechne() {
      var bj = MS.baujahr.find(function (b) { return b.id === zustand.baujahr; }), lg = MS.lage.find(function (l) { return l.id === zustand.lage; }), hs = MS.haustyp.find(function (h) { return h.id === zustand.haus; });
      var summe = bj.wert + lg.wert + hs.wert;
      Object.keys(zustand.an).forEach(function (id) { if (zustand.an[id] && zaehlt(id)) summe += M[id].wert; });
      var ovm = Math.round(basismiete(zustand.flaeche) * (1 + summe / 100) * 100) / 100;
      var u0 = ovm * (1 + MS.spanne.unten / 100), o0 = ovm * (1 + MS.spanne.oben / 100), grenze = ovm * (1 + BR.aufschlag / 100);
      spanne.setAttribute('d', bogen(winkel(u0), winkel(o0), R));
      var ga = winkel(grenze);
      bremse.setAttribute('x1', Math.cos(ga) * (R - 14)); bremse.setAttribute('y1', Math.sin(ga) * (R - 14)); bremse.setAttribute('x2', Math.cos(ga) * (R + 14)); bremse.setAttribute('y2', Math.sin(ga) * (R + 14));
      var bx = Math.cos(ga) * (R + 34), by = Math.sin(ga) * (R + 30);
      bremseT1.setAttribute('x', bx); bremseT1.setAttribute('y', by - 3); bremseT2.setAttribute('x', bx); bremseT2.setAttribute('y', by + 11);
      bremseT2.textContent = NF.zahl(grenze, 2) + ' €';
      nadel.style.transform = 'rotate(' + (winkel(ovm) * 180 / Math.PI) + 'deg)';
      api.szene.querySelector('#mi-ovm').textContent = NF.zahl(ovm, 2) + ' € je m²';
      api.szene.querySelector('#mi-fl-wert').textContent = zustand.flaeche + ' m²';
      api.szene.querySelector('#mi-monat').innerHTML = 'rund <b>' + NF.zahl(ovm * zustand.flaeche) + ' €</b> im Monat für ' + zustand.flaeche + ' m²';
      api.szene.querySelector('#mi-spanne').textContent = 'Spanne ' + NF.zahl(u0, 2) + ' bis ' + NF.zahl(o0, 2) + ' € · Zu- und Abschläge zusammen ' + (summe >= 0 ? '+' : '−') + Math.abs(summe) + ' % · Mietpreisbremse: höchstens ' + NF.zahl(grenze, 2) + ' € je m²';
      return { ovm: ovm, grenze: grenze };
    }
    var fl = api.szene.querySelector('#mi-fl');
    fl.addEventListener('input', function () { zustand.flaeche = +fl.value; rechne(); });
    api.szene.querySelector('#mi-bj').addEventListener('change', function () { zustand.baujahr = this.value; rechne(); });
    api.szene.querySelectorAll('[data-lage]').forEach(function (b) { b.addEventListener('click', function () { zustand.lage = b.dataset.lage; api.szene.querySelectorAll('[data-lage]').forEach(function (c) { c.setAttribute('aria-pressed', c === b); }); rechne(); }); });
    api.szene.querySelectorAll('[data-haus]').forEach(function (b) { b.addEventListener('click', function () { zustand.haus = b.dataset.haus; api.szene.querySelectorAll('[data-haus]').forEach(function (c) { c.setAttribute('aria-pressed', c === b); }); zeigeAlle(); rechne(); }); });
    zeigeAlle(); rechne();
    api.sag('Ihre Wohnung: 65 m², Baujahr 1970 bis 1980, mit Einbauküche und Garten. Klicken Sie auf die Wanne oder den Heizkörper.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
