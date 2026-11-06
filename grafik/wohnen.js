/* Wohnen: eine nächtliche Häuserzeile, jedes Fenster steht für 100 Wohnungen. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'wohnen', reiter: 'Wohnen', form: 'Fenster-Fassade', farbe: '#4d5a1f', seite: 'wohnen.html',
  titel: '718 Fenster für 71.751 Wohnungen',
  idee: 'Jedes Fenster steht für 100 Wohnungen in Ingolstadt. Je nach Frage färben sich die Fenster um: Wer wohnt drin, wem gehört das Haus, wo brennt kein Licht, und was ist seit 2011 dazugekommen?',
  notizen: [
    ['Bedienung', 'Oben die Frage wählen. Bei „Wem gehört’s?“ hebt ein Klick auf die Legende eine Gruppe hervor und öffnet ihre Karte mit Leerstand und Miete.'],
    ['Wow-Moment', 'Zum Start brennt in allen Fenstern Licht. Dann gehen 28 Fenster flackernd aus: so viele Wohnungen standen 2022 leer, rund 2.800.'],
    ['Mobil', 'Weniger, dafür größere Häuser übereinander. Die Fenster bleiben bei 100 Wohnungen je Fenster.'],
    ['Daten', 'data/wohnen.js: Zensus 2022 und 2011 (Nutzung, Eigentumsform, Leerstand, Miete), Vergleich der bayerischen Großstädte. Ein Fenster = 100 Wohnungen, gerundet.']
  ],
  init: function (api) {
    var Z = WOHNEN_DATEN.zensus, N22 = Z.nutzung[2022], N11 = Z.nutzung[2011];
    var W = 1200, H = 640, BODEN = 590;
    var HAEUSER = [[8, 14], [10, 16], [7, 11], [12, 18], [9, 9], [8, 9]];
    api.szene.innerHTML = '<div class="leiste" id="wo-modi"><span class="etikett">Frage</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Häuserzeile mit 718 Fenstern"></svg><div style="height:70px;background:#0e2233"></div>';
    var svg = api.szene.querySelector('svg');
    var defs = el('defs', {}, svg);
    var gr = el('linearGradient', { id: 'wo-nacht', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#0b1d2c' }, gr); el('stop', { offset: 1, 'stop-color': '#24465e' }, gr);
    var glow = el('filter', { id: 'wo-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: 2.2, result: 'b' }, glow);
    var m = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    el('rect', { width: W, height: H, fill: 'url(#wo-nacht)' }, svg);
    for (var s = 0; s < 80; s++) el('circle', { cx: Math.random() * W, cy: Math.random() * 230, r: Math.random() * 1.3 + .3, fill: '#fff', opacity: Math.random() * .6 + .2 }, svg);
    el('circle', { cx: 470, cy: 150, r: 22, fill: '#f4ecd0' }, svg); el('circle', { cx: 480, cy: 143, r: 20, fill: '#132e46' }, svg);

    var fenster = [], x = 50;
    var gH = el('g', {}, svg), gF = el('g', { filter: 'url(#wo-glow)' }, svg);
    HAEUSER.forEach(function (h, hi) {
      var bw = h[0] * 17 + 14, bh = h[1] * 20 + 22, y = BODEN - bh;
      el('rect', { x: x, y: y, width: bw, height: bh, fill: ['#1f3546', '#263f52', '#1b3040'][hi % 3] }, gH);
      el('rect', { x: x - 4, y: y - 6, width: bw + 8, height: 8, fill: '#16293a' }, gH);
      if (hi === 2) el('polygon', { points: (x - 4) + ',' + (y - 6) + ' ' + (x + bw / 2) + ',' + (y - 46) + ' ' + (x + bw + 4) + ',' + (y - 6), fill: '#16293a' }, gH);
      for (var r = 0; r < h[1]; r++) for (var c = 0; c < h[0]; c++) {
        var fx = x + 10 + c * 17, fy = y + 14 + r * 20;
        var f = el('rect', { x: fx, y: fy, width: 11, height: 13, rx: 1.5 }, gF);
        f.style.fill = '#ffd987'; f.style.transition = 'fill .6s ease';
        fenster.push({ el: f, x: fx, y: fy, haus: hi });
      }
      x += bw + 22;
    });
    el('rect', { x: 0, y: BODEN, width: W, height: H - BODEN, fill: '#0e2233' }, svg);
    var gT = el('g', {}, svg);
    var titel = el('text', { x: 50, y: 62, 'font-size': 44, 'font-weight': 900, 'font-family': '"Source Serif 4", Georgia, serif', fill: '#ffffff' }, gT);
    var unter = el('text', { x: 52, y: 90, 'font-size': 15, fill: '#cfe0ea' }, gT);
    var gLeg = el('g', {}, svg), gVgl = el('g', {}, svg);
    var nachX = fenster.slice().sort(function (a, b) { return a.x - b.x || b.y - a.y; });
    var nachY = fenster.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    function anzahl(n) { return Math.round(n / 100); }
    var timer = [];
    function leeren() { timer.forEach(clearTimeout); timer = []; gLeg.innerHTML = ''; gVgl.innerHTML = ''; api.karteZu(); fenster.forEach(function (f) { f.el.style.opacity = 1; f.el.style.animation = ''; }); }
    function baender(gruppen, mitLegende) {
      var i = 0;
      gruppen.forEach(function (g) {
        g.fenster = nachX.slice(i, i + g.n); i += g.n;
        g.fenster.forEach(function (f) { f.el.style.transitionDelay = (f.x / W * .9) + 's'; f.el.style.fill = g.farbe; f.gruppe = g; });
      });
      nachX.slice(i).forEach(function (f) { f.el.style.fill = '#ffd987'; });
      if (mitLegende) legende(gruppen);
    }
    function legende(gruppen, klick) {
      gLeg.innerHTML = '';
      var lx = 610, ly = 30;
      gruppen.forEach(function (g, k) {
        var gx = lx + (k % 2) * 290, gy = ly + Math.floor(k / 2) * 22;
        var it = el('g', { style: 'cursor:' + (klick ? 'pointer' : 'default') }, gLeg);
        el('rect', { x: gx, y: gy, width: 12, height: 13, rx: 2, fill: g.farbe }, it);
        var t = el('text', { x: gx + 18, y: gy + 11, 'font-size': 12, fill: '#e8f0f4' }, it);
        t.textContent = g.name + ' · ' + NF.zahl(g.wohnungen);
        if (klick) it.addEventListener('click', function () { klick(g); });
      });
    }

    var MODI = {
      leer: { n: 'Wo brennt kein Licht?', los: function () {
        titel.textContent = NF.zahl(N22.leer) + ' leere Wohnungen';
        unter.textContent = NF.zahl(N22.leer / N22.gesamt * 100, 1) + ' % aller Wohnungen standen beim Zensus 2022 leer. 2011 waren es ' + NF.zahl(N11.leer) + '.';
        fenster.forEach(function (f) { f.el.style.transitionDelay = '0s'; f.el.style.fill = '#ffd987'; });
        var leer = fenster.slice().sort(function () { return Math.random() - .5; }).slice(0, anzahl(N22.leer));
        leer.forEach(function (f, k) {
          timer.push(setTimeout(function () {
            f.el.style.animation = 'woflacker .7s steps(1) 1';
            timer.push(setTimeout(function () { f.el.style.animation = ''; f.el.style.fill = '#0f1f2b'; }, 700));
          }, bewegungAus ? 0 : 700 + k * 140));
        });
        api.sag('Achten Sie auf die Fenster: ' + leer.length + ' gehen gleich aus. Jedes steht für 100 leere Wohnungen.');
      } },
      wer: { n: 'Wer wohnt drin?', los: function () {
        titel.textContent = NF.zahl(Z.haushalte[2022].miete / Z.haushalte[2022].gesamt * 100, 1) + ' % wohnen zur Miete';
        unter.textContent = 'Wohnungen nach Nutzung, Zensus 2022';
        baender([
          { name: 'Selbst bewohnt', n: anzahl(N22.eigentuemer), wohnungen: N22.eigentuemer, farbe: '#f4b740' },
          { name: 'Vermietet', n: anzahl(N22.vermietet), wohnungen: N22.vermietet, farbe: '#bfe0f2' },
          { name: 'Ferienwohnung', n: anzahl(N22.ferien), wohnungen: N22.ferien, farbe: '#c79be0' },
          { name: 'Leer', n: anzahl(N22.leer), wohnungen: N22.leer, farbe: '#0f1f2b' }
        ], true);
        vergleich();
        api.sag('Gelb wohnt im Eigentum, hellblau zur Miete. Unter den bayerischen Großstädten hat Ingolstadt den höchsten Anteil an Eigentum.');
      } },
      wem: { n: 'Wem gehört’s?', los: function () {
        titel.textContent = 'Wem die Wohnungen gehören';
        unter.textContent = 'Nach Eigentumsform des Gebäudes, Zensus 2022';
        var FARBEN = ['#f4b740', '#e98a4a', '#6fd0a0', '#8fb6e8', '#b9c6cc', '#c79be0', '#f28fb0', '#ffffff'];
        var gruppen = Z.eigentum.map(function (e, k) { return { name: e.l, lang: e.n, n: Math.max(1, anzahl(e.wohnungen)), wohnungen: e.wohnungen, farbe: FARBEN[k], e: e }; });
        baender(gruppen, false);
        legende(gruppen, function (g) {
          fenster.forEach(function (f) { f.el.style.transitionDelay = '0s'; f.el.style.opacity = f.gruppe === g ? 1 : .15; });
          api.karte('<div class="meta">Eigentümer</div><h3>' + NF.esc(g.lang) + '</h3><div class="zahl">' + NF.zahl(g.wohnungen) + '</div><p class="meta">Wohnungen, ' + NF.zahl(g.wohnungen / N22.gesamt * 100, 1) + ' % aller Wohnungen</p>' +
            '<dl><dt>Leer</dt><dd>' + NF.zahl(g.e.leer) + ' (' + NF.zahl(g.e.leer_quote, 1) + ' %)</dd><dt>Davon am Markt verfügbar</dt><dd>' + NF.zahl(g.e.leer_marktaktiv, 1) + ' %</dd><dt>Nettokaltmiete im Schnitt</dt><dd>' + NF.zahl(g.e.miete, 2) + ' €/m²</dd></dl>' +
            '<p class="gf-quelle">Zensus 2022, Gebäude- und Wohnungszählung</p>');
          api.sag(g.e.id === 'kommunal' ? 'Die Stadt und die GWG vermieten am günstigsten unter den großen Gruppen: ' + NF.zahl(g.e.miete, 2) + ' €/m².' : NF.esc(g.name) + ': ' + NF.zahl(g.wohnungen) + ' Wohnungen, im Schnitt ' + NF.zahl(g.e.miete, 2) + ' €/m².');
        });
        api.sag('Die meisten Wohnungen gehören einzelnen Menschen. Klicken Sie auf eine Gruppe in der Legende.');
      } },
      neu: { n: '2011 → 2022', los: function () {
        var alt = anzahl(N11.gesamt), alle = fenster.length;
        var neu = nachY.slice(0, alle - alt);
        fenster.forEach(function (f) { f.el.style.transitionDelay = '0s'; f.el.style.fill = '#ffd987'; });
        neu.forEach(function (f) { f.el.style.fill = '#2b4558'; });
        titel.textContent = NF.zahl(N11.gesamt) + ' Wohnungen';
        unter.textContent = 'So viele gab es beim Zensus 2011. Die dunklen Fenster kommen bis 2022 dazu.';
        var reihe = neu.slice().reverse();
        reihe.forEach(function (f, k) {
          timer.push(setTimeout(function () {
            f.el.style.fill = '#9ff0c4';
            var stand = Math.round(N11.gesamt + (N22.gesamt - N11.gesamt) * (k + 1) / reihe.length);
            titel.textContent = NF.zahl(stand) + ' Wohnungen';
            if (k === reihe.length - 1) { unter.textContent = '+' + NF.zahl(N22.gesamt - N11.gesamt) + ' Wohnungen in elf Jahren. Laut Verwaltung 2025 rund ' + NF.zahl(WOHNEN_DATEN.fortschreibung.wohnungen_2025) + '.'; api.sag('Grün: die Wohnungen, die zwischen 2011 und 2022 neu dazukamen.'); }
          }, bewegungAus ? 0 : 800 + k * 45));
        });
        api.sag('2011 gab es ' + NF.zahl(N11.gesamt) + ' Wohnungen. Schauen Sie, was dazukommt.');
      } }
    };
    function vergleich() {
      gVgl.innerHTML = '';
      var v = Z.vergleich.slice().sort(function (a, b) { return b.haushalte_eigentum - a.haushalte_eigentum; });
      var x0 = 1000, y0 = 142;
      var t = el('text', { x: x0 - 8, y: y0 - 14, 'font-size': 11.5, fill: '#cfe0ea', 'text-anchor': 'end' }, gVgl); t.textContent = 'Haushalte im Eigentum, 2022';
      v.forEach(function (c, k) {
        var y = y0 + k * 15, w = c.haushalte_eigentum * 3.6;
        var n = el('text', { x: x0 - 8, y: y + 9, 'font-size': 11, 'text-anchor': 'end', fill: c.stadt === 'Ingolstadt' ? '#f4b740' : '#cfe0ea', 'font-weight': c.stadt === 'Ingolstadt' ? 700 : 400 }, gVgl); n.textContent = c.stadt;
        el('rect', { x: x0, y: y, width: w, height: 10, rx: 2, fill: c.stadt === 'Ingolstadt' ? '#f4b740' : '#5f7d91' }, gVgl);
        var p = el('text', { x: x0 + w + 5, y: y + 9, 'font-size': 10.5, fill: '#cfe0ea' }, gVgl); p.textContent = NF.zahl(c.haushalte_eigentum, 1) + ' %';
      });
    }
    var st = document.createElement('style');
    st.textContent = '@keyframes woflacker{0%{fill:#0f1f2b}15%{fill:#ffd987}30%{fill:#0f1f2b}45%{fill:#ffd987}70%{fill:#0f1f2b}85%{fill:#ffd987}100%{fill:#0f1f2b}}';
    document.head.appendChild(st);
    var leiste = api.szene.querySelector('#wo-modi');
    Object.keys(MODI).forEach(function (k, i) {
      var b = document.createElement('button'); b.className = 'gf-chip'; b.type = 'button'; b.textContent = MODI[k].n; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { leiste.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); leeren(); MODI[k].los(); });
      leiste.appendChild(b);
    });
    MODI.leer.los();
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
