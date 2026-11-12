/* Deine 15 Minuten: fünf Menschen am selben Startpunkt und die Apotheke je Bezirk.
   Alle Zahlen kommen fertig aus data/grafik.js (scraper/grafik_bauen.py), hier wird nur gezeichnet. */
(function (el, NF, bewegungAus, GD) {
  'use strict';
  var W = GD.wege;

  function text(parent, attrs, inhalt) { var t = el('text', attrs, parent); t.textContent = inhalt; return t; }

GRAFIK.szene({
  id: 'wege', reiter: 'Wege', form: 'Balken je Person', farbe: '#1d6a6f', seite: 'wege.html',
  titel: 'Fünf Menschen, ein Startpunkt',
  idee: 'Alle starten am ' + W.start + ' und gehen 15 Minuten. Wie viele Alltagsorte – Läden, Ärzte, Spielplätze, Cafés – liegen für wen in Reichweite? Dieselbe Viertelstunde, fünf verschiedene Städte.',
  notizen: [
    ['Bedienung', 'Auf einen Balken klicken: Die Karte nennt Tempo, Ziele der eigenen Liste und Haltestellen. Die Karte zum Selbst-Ausprobieren steht auf der Seite „Deine 15 Minuten“.'],
    ['Daten', 'Fußwegenetz und Orte aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL), gerechnet von scraper/wege_bauen.py mit den Werten aus data/wege-personen.json, bei Tag. Gezählt sind verschiedene Orte ohne Bänke und Haltestellen.']
  ],
  init: function (api) {
    var P = W.personen, BW = 1200, ZEILE = 92, OBEN = 70, H = OBEN + P.length * ZEILE + 200;   // unten Platz fuer die Sprechblase
    var max = Math.max.apply(null, P.map(function (p) { return p.orte; }));
    var X0 = 330, BREITE = 760;
    api.szene.innerHTML = '<svg viewBox="0 0 ' + BW + ' ' + H + '" role="img" aria-label="Erreichbare Orte in 15 Minuten je Person"></svg>';
    var svg = api.szene.querySelector('svg');
    text(svg, { x: X0, y: 40, 'font-size': 14, fill: '#566a74' }, 'Alltagsorte in 15 Minuten zu Fuß ab ' + W.start);
    P.forEach(function (p, i) {
      var y = OBEN + i * ZEILE, w = BREITE * p.orte / max;
      var g = el('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': p.name + ': ' + p.orte + ' Orte' }, svg);
      text(g, { x: X0 - 18, y: y + 24, 'font-size': 18, 'font-weight': 700, 'text-anchor': 'end', fill: '#16232b' }, p.name.replace(/ \(.*\)$/, ''));
      text(g, { x: X0 - 18, y: y + 46, 'font-size': 13, 'text-anchor': 'end', fill: '#566a74' }, NF.zahl(p.kmh, 1) + ' km/h');
      el('rect', { x: X0, y: y + 6, width: BREITE, height: 46, rx: 4, fill: '#f1efe9' }, g);
      var balken = el('rect', { x: X0, y: y + 6, width: bewegungAus ? w : 0, height: 46, rx: 4, fill: p.farbe }, g);
      if (!bewegungAus) setTimeout(function () { balken.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)'; balken.setAttribute('width', w); }, 120 + i * 140);
      text(g, { x: X0 + w - 12, y: y + 36, 'font-size': 20, 'font-weight': 800, 'text-anchor': 'end', fill: '#fff' }, NF.zahl(p.orte));
      text(g, { x: X0 + BREITE + 12, y: y + 28, 'font-size': 13, fill: '#16232b' }, p.ziele_erreicht + ' von ' + p.ziele_gesamt);
      text(g, { x: X0 + BREITE + 12, y: y + 45, 'font-size': 12, fill: '#566a74' }, 'eigene Ziele');
      function zeige() {
        api.karte('<div class="meta">Ab ' + NF.esc(W.start) + ', 15 Minuten</div><h3>' + NF.esc(p.name) + '</h3>' +
          '<div class="zahl" style="color:' + p.farbe + '">' + NF.zahl(p.orte) + '</div><p class="meta">Alltagsorte in Reichweite</p>' +
          '<dl><dt>Tempo</dt><dd>' + NF.zahl(p.kmh, 1) + ' km/h</dd><dt>Ziele der eigenen Liste</dt><dd>' + p.ziele_erreicht + ' von ' + p.ziele_gesamt +
          '</dd><dt>Haltestellen</dt><dd>' + NF.zahl(p.haltestellen) + '</dd></dl><p>' + NF.esc(p.warum) + '.</p>' +
          '<p><a href="wege.html">Selbst ausprobieren auf der Karte →</a></p><p class="gf-quelle">OpenStreetMap-Mitwirkende (ODbL); eigene Rechnung</p>', g);
        api.sag(NF.esc(p.name.replace(/ \(.*\)$/, '')) + ': ' + NF.zahl(p.orte) + ' Orte. ' + NF.esc(p.warum) + '.');
      }
      g.addEventListener('click', zeige);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zeige(); } });
    });
    var erw = P[0], klein = P.slice().sort(function (a, b) { return a.orte - b.orte; })[0];
    api.sag('Erwachsene erreichen ' + NF.zahl(erw.orte) + ' Orte. ' + NF.esc(klein.name.replace(/ \(.*\)$/, '')) + ' nur ' + NF.zahl(klein.orte) +
      ' – rund ' + NF.zahl(100 - klein.orte / erw.orte * 100) + ' % weniger, in derselben Viertelstunde.');
  }
});

GRAFIK.szene({
  id: 'wege-apotheke', reiter: 'Apotheke', form: 'Hantel je Bezirk', farbe: '#2a8f7f', seite: 'wege.html',
  titel: 'Wer eine Apotheke erreicht',
  idee: 'Je Stadtbezirk der Anteil der Menschen, die eine Apotheke in 15 Minuten zu Fuß erreichen: als Erwachsene mit 5 km/h und als ältere Person mit 3,2 km/h und Pausen. Der Abstand zwischen den Punkten ist das, was Alter kostet.',
  notizen: [
    ['Bedienung', 'Auf einen Bezirk klicken: Die Karte nennt beide Anteile und wie viele Menschen ab 65 dort wohnen.'],
    ['Daten', 'Zensus 2022 (100-m-Gitter) und Gehminuten je Zelle aus scraper/wege_bauen.py; Ältere: Anteil der Menschen ab 65, Erwachsene: aller Einwohner. Apotheken aus OpenStreetMap.']
  ],
  init: function (api) {
    var A = W.apotheke, BW = 1200, ZEILE = 40, OBEN = 76, UNTEN = OBEN + A.length * ZEILE + 6, H = UNTEN + 200, X0 = 300, BREITE = 820;
    var FA = '#2a8f7f', FE = '#2f5f86';
    api.szene.innerHTML = '<svg viewBox="0 0 ' + BW + ' ' + H + '" role="img" aria-label="Anteil mit Apotheke in 15 Minuten je Bezirk"></svg>';
    var svg = api.szene.querySelector('svg');
    var x = function (v) { return X0 + BREITE * v / 100; };
    [0, 25, 50, 75, 100].forEach(function (v) {
      el('line', { x1: x(v), x2: x(v), y1: OBEN - 14, y2: UNTEN, stroke: '#e4e0d8' }, svg);
      text(svg, { x: x(v), y: UNTEN + 18, 'font-size': 12, 'text-anchor': 'middle', fill: '#566a74' }, v + ' %');
    });
    el('circle', { cx: X0 + 6, cy: 30, r: 7, fill: FA }, svg);
    text(svg, { x: X0 + 20, y: 35, 'font-size': 14, fill: '#16232b' }, 'Ältere Person (Menschen ab 65)');
    el('circle', { cx: X0 + 300, cy: 30, r: 7, fill: '#fff', stroke: FE, 'stroke-width': 3 }, svg);
    text(svg, { x: X0 + 314, y: 35, 'font-size': 14, fill: '#16232b' }, 'Erwachsene (alle Einwohner)');
    A.forEach(function (b, i) {
      var y = OBEN + i * ZEILE + 12;
      var g = el('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': b.name + ': ältere Person ' + NF.zahl(b.aeltere) + ' Prozent, Erwachsene ' + NF.zahl(b.erwachsene) + ' Prozent' }, svg);
      el('rect', { x: 0, y: y - 18, width: BW, height: ZEILE, fill: 'transparent' }, g);
      text(g, { x: X0 - 18, y: y + 5, 'font-size': 15, 'text-anchor': 'end', fill: '#16232b' }, b.name);
      el('line', { x1: x(b.aeltere), x2: x(b.erwachsene), y1: y, y2: y, stroke: '#b9c6cc', 'stroke-width': 4 }, g);
      el('circle', { cx: x(b.erwachsene), cy: y, r: 8, fill: '#fff', stroke: FE, 'stroke-width': 3 }, g);
      el('circle', { cx: x(b.aeltere), cy: y, r: 8, fill: FA }, g);
      // Prozentzahl links vom linken Punkt; liegt der Punkt nahe am Rand, rechts vom rechten Punkt, damit sie den Bezirksnamen nicht ueberdeckt.
      var links = x(Math.min(b.aeltere, b.erwachsene)) - 14 > X0 + 44;
      text(g, { x: links ? x(Math.min(b.aeltere, b.erwachsene)) - 14 : x(Math.max(b.aeltere, b.erwachsene)) + 14, y: y + 5, 'font-size': 12.5, 'text-anchor': links ? 'end' : 'start', fill: FA, 'font-weight': 700 }, NF.zahl(b.aeltere) + ' %');
      function zeige() {
        api.karte('<div class="meta">Apotheke in 15 Minuten zu Fuß</div><h3>Bezirk ' + NF.esc(b.name) + '</h3>' +
          '<div class="zahl" style="color:' + FA + '">' + NF.zahl(b.aeltere) + ' %</div><p class="meta">der etwa ' + NF.zahl(b.ab65) + ' Menschen ab 65, in ihrem Tempo</p>' +
          '<dl><dt>Erwachsene, alle Einwohner</dt><dd>' + NF.zahl(b.erwachsene) + ' %</dd><dt>Einwohner</dt><dd>' + NF.zahl(b.einwohner) + '</dd></dl>' +
          '<p><a href="wege.html">Bezirk auf der Karte ansehen →</a></p><p class="gf-quelle">Zensus 2022; Apotheken aus OpenStreetMap; eigene Rechnung</p>', g);
      }
      g.addEventListener('click', zeige);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zeige(); } });
    });
    var best = A[0], letzter = A[A.length - 1];
    api.sag('In ' + NF.esc(best.name) + ' erreichen ' + NF.zahl(best.aeltere) + ' % der Älteren eine Apotheke, in ' + NF.esc(letzter.name) + ' ' + NF.zahl(letzter.aeltere) + ' %.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
