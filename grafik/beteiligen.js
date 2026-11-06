/* Beteiligen: ein Linienplan wie bei U-Bahn und Bus. Jede Linie ist ein Weg zum Mitreden. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'beteiligen', reiter: 'Beteiligen', form: 'Linienplan', farbe: '#14505c', seite: 'beteiligen.html',
  titel: 'Linienplan ins Rathaus',
  idee: 'Vier Linien, vier Wege zum Mitreden. Alle fahren bei Ihnen los. Wählen Sie eine Linie, und ein Zug fährt sie Halt für Halt ab.',
  notizen: [
    ['Bedienung', 'Linie anklicken: Der Zug fährt los und hält an jeder Station. Ein Klick auf eine Station öffnet die Karte mit Text und Link zum offiziellen Angebot.'],
    ['Wow-Moment', 'Aus einer Linkliste wird ein Plan, den jede und jeder lesen kann. Der Zug macht sichtbar, dass Mitreden ein Weg mit Stationen ist.'],
    ['Mobil', 'Der Plan dreht sich ins Hochformat: Die Linien laufen von oben nach unten, die Stationen stehen daneben.'],
    ['Daten', 'Texte und Links von beteiligen.html. Die Zwischenhalte beim Mängelmelder und bei den eigenen Ideen sind aus dem Seitentext abgeleitet.']
  ],
  init: function (api) {
    var W = 1200, H = 560, SIE = [120, 300];
    var LINIEN = [
      { nr: 4, name: 'Eigene Idee', farbe: '#a86b00', d: 'M120,291 L331,80 H1110', y: 80, stationen: [
        { x: 590, n: 'Idee haben', t: 'Ein Biotop im Stadtwald, ein Foodsharing-Café, eine solidarische Landwirtschaft: Viele Ideen für ein nachhaltigeres Ingolstadt kommen aus der Bürgerschaft.' },
        { x: 820, n: 'Bei den MitmacherINnen einreichen', t: 'Die Nachhaltigkeitsagenda der Stadt lebt von den „MitmacherINnen“: Bürgerinnen und Bürger reichen eigene, alltagspraktische Projektideen ein und setzen sie gemeinsam um.', url: 'https://nachhaltigkeitsagenda-ingolstadt.de/mitmacherinnen/', link: 'Zu den MitmacherINnen' },
        { x: 1040, n: 'Gemeinsam umsetzen', t: 'Projektidee einreichen oder bei einem bestehenden Projekt mitmachen und Mitstreiter:innen finden.' }] },
      { nr: 1, name: 'Gewählte ansprechen', farbe: '#003e59', d: 'M120,300 L250,170 H1110', y: 170, stationen: [
        { x: 530, n: 'Bezirksausschuss', t: 'Die zwölf Bezirksausschüsse sind am nächsten an Ihrem Alltag dran. Sagen Sie Ihrem Ausschuss, was in Ihrem Stadtteil ansteht.', url: 'https://www.ingolstadt.de/sessionnetbza/kp0041.php', link: 'Mitglieder der Bezirksausschüsse' },
        { x: 770, n: 'Stadtrat', t: 'Der Stadtrat entscheidet über die großen Linien der Stadtpolitik, vom Haushalt bis zur Bauleitplanung. Sagen Sie den Mitgliedern, was Ihnen wichtig ist.', url: 'https://www.ingolstadt.de/sessionnet/kp0040.php?__kgrnr=1', link: 'Mitglieder des Stadtrats' },
        { x: 1000, n: 'Bezirkstag Oberbayern', t: 'Der Bezirkstag Oberbayern entscheidet überregional, unter anderem über Soziales, Kultur und Krankenhäuser. Auch dort können Sie sich direkt melden.', url: 'https://buergerinfo-bezirk-obb.digitalfabrix.de/kp0040.asp?__kgrnr=1', link: 'Mitglieder des Bezirkstags' }] },
      { nr: 3, name: 'Mitmach-Projekte', farbe: '#2e7d4f', d: 'M120,300 H1110', y: 300, stationen: [
        { x: 450, n: 'ingolstadt-macht-mit.de', t: 'Alle laufenden und abgeschlossenen Beteiligungsprojekte der Stadt gibt es gesammelt auf dem Beteiligungsportal.', url: 'https://ingolstadt-macht-mit.de', link: 'Zum Beteiligungsportal' },
        { x: 650, n: 'Mobilitätsplan 2040+', t: 'Wie soll man sich 2040 in Ingolstadt fortbewegen? Der Mobilitätsplan sammelt dazu Ideen und Rückmeldungen aus der Bürgerschaft.', url: 'https://ingolstadt-macht-mit.de/mobilitaetsplan', link: 'Zum Mobilitätsplan' },
        { x: 850, n: 'Lärmaktionsplanung', t: 'Wo stört Verkehrslärm besonders? Die Lärmaktionsplanung sucht Problemstellen und schützt zugleich ruhige Gebiete vor mehr Lärm.', url: 'https://ingolstadt-macht-mit.de/group/16', link: 'Zur Lärmaktionsplanung' },
        { x: 1040, n: 'ISEK 2040+', t: 'Das Integrierte Städtebauliche Entwicklungskonzept bündelt, wie sich die Stadtteile langfristig entwickeln sollen, mit eigenen Beteiligungsterminen.', url: 'https://ingolstadt-macht-mit.de/ISEK2040', link: 'Zu ISEK 2040+' }] },
      { nr: 2, name: 'Mängelmelder', farbe: '#b00e2b', d: 'M120,300 L290,470 H1110', y: 470, stationen: [
        { x: 530, n: 'Schaden entdecken', t: 'Schlagloch, kaputte Straßenbeleuchtung, beschädigter Spielplatz oder wilder Müll.' },
        { x: 770, n: 'Mit Ort und Foto melden', t: 'Über den Mängelmelder der Stadt melden Sie das Problem mit Ort und Foto, ohne selbst herauszufinden, wer zuständig ist.', url: 'https://www.ingolstadt.de/maengelmelder/', link: 'Zum Mängelmelder' },
        { x: 980, n: 'Bürgerbüro und Fachstelle', t: 'Ihr Anliegen geht direkt an das Bürgerbüro des Oberbürgermeisters und an die zuständige Fachstelle.' }] }
    ];
    api.szene.innerHTML = '<div class="leiste" id="be-linien"><span class="etikett">Linie wählen</span></div><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Linienplan der Beteiligungswege"></svg><div style="height:70px"></div>';
    var svg = api.szene.querySelector('svg');
    el('rect', { width: W, height: H, fill: '#fbfaf7' }, svg);
    for (var gx = 0; gx < W; gx += 40) el('line', { x1: gx, y1: 0, x2: gx, y2: H, stroke: '#f0ede6' }, svg);
    for (var gy = 0; gy < H; gy += 40) el('line', { x1: 0, y1: gy, x2: W, y2: gy, stroke: '#f0ede6' }, svg);
    var gLin = el('g', {}, svg), gSt = el('g', {}, svg), gZug = el('g', {}, svg);
    LINIEN.forEach(function (l) {
      l.pfad = el('path', { d: l.d, fill: 'none', stroke: l.farbe, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gLin);
      l.pfad.style.transition = 'opacity .3s';
      var ende = el('g', {}, gSt);
      el('rect', { x: 1110 - 6, y: l.y - 16, width: 12, height: 32, rx: 3, fill: l.farbe }, ende);
      var pill = el('g', { style: 'cursor:pointer', transform: 'translate(' + (l.nr === 3 ? 160 : (l.nr === 2 ? 300 : (l.nr === 4 ? 345 : 262))) + ',' + (l.y - 34) + ')' }, gSt);
      var txt = l.nr + ' · ' + l.name;
      el('rect', { width: txt.length * 7.2 + 34, height: 22, rx: 11, fill: l.farbe }, pill);
      var t = el('text', { x: 12, y: 15, 'font-size': 12.5, 'font-weight': 700, fill: '#fff' }, pill); t.textContent = txt + '  ▶';
      pill.addEventListener('click', function () { fahre(l); });
      l.stationen.forEach(function (s, i) {
        var g = el('g', { style: 'cursor:pointer' }, gSt);
        s.kreis = el('circle', { cx: s.x, cy: l.y, r: 11, fill: '#fff', stroke: l.farbe, 'stroke-width': 4.5 }, g);
        s.kreis.style.transition = 'r .25s, fill .25s';
        var unten = i % 2 === 1;
        var lt = el('text', { x: s.x, y: l.y + (unten ? 32 : -22), 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, fill: '#16232b', 'paint-order': 'stroke', stroke: '#fbfaf7', 'stroke-width': 5 }, g);
        lt.textContent = s.n;
        if (s.url) { var lk = el('text', { x: s.x, y: l.y + (unten ? 48 : -38) + (unten ? 0 : 0), 'text-anchor': 'middle', 'font-size': 10.5, fill: l.farbe }, g); lk.textContent = '↗ offizielles Angebot'; if (!unten) lk.setAttribute('y', l.y + 30); }
        g.addEventListener('click', function () { karte(l, s); });
      });
    });
    // Startpunkt „Sie“
    var sie = el('g', {}, gSt);
    el('circle', { cx: SIE[0], cy: SIE[1], r: 34, fill: '#fff', stroke: '#16232b', 'stroke-width': 5 }, sie);
    el('use', { href: '#panther-kopf', x: SIE[0] - 22, y: SIE[1] - 24, width: 44, height: 44 }, sie);
    var st = el('text', { x: SIE[0], y: SIE[1] + 56, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, 'font-family': '"Source Serif 4", Georgia, serif', fill: '#16232b' }, sie); st.textContent = 'Sie';

    var zug = el('g', { opacity: 0 }, gZug);
    var zugK = el('rect', { x: -22, y: -11, width: 44, height: 22, rx: 8, stroke: '#fff', 'stroke-width': 2.5 }, zug);
    el('rect', { x: -14, y: -6, width: 10, height: 7, rx: 1.5, fill: 'rgba(255,255,255,.85)' }, zug); el('rect', { x: 2, y: -6, width: 10, height: 7, rx: 1.5, fill: 'rgba(255,255,255,.85)' }, zug);

    function karte(l, s) {
      api.karte('<div class="meta">Linie ' + l.nr + ' · ' + l.name + '</div><h3>' + NF.esc(s.n) + '</h3><p>' + NF.esc(s.t) + '</p>' +
        (s.url ? '<p><a href="' + s.url + '" target="_blank" rel="noopener">' + NF.esc(s.link) + '</a></p>' : '') +
        '<p class="gf-quelle">PapierPanther ist kein Angebot der Stadt Ingolstadt. Die Links führen zu den offiziellen Seiten.</p>');
    }
    var lauf = 0;
    function fahre(l) {
      var meinLauf = ++lauf;
      LINIEN.forEach(function (o) { o.pfad.style.opacity = o === l ? 1 : .22; o.stationen.forEach(function (s) { s.kreis.setAttribute('r', 11); s.kreis.setAttribute('fill', '#fff'); }); });
      leiste.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.nr == l.nr ? 'true' : 'false'); });
      zugK.setAttribute('fill', l.farbe); zug.setAttribute('opacity', 1);
      var len = l.pfad.getTotalLength();
      // Halte: Länge entlang des Pfads, an der die Station liegt
      var halte = l.stationen.map(function (s) {
        var lo = 0, hi = len;
        for (var k = 0; k < 30; k++) { var mid = (lo + hi) / 2; if (l.pfad.getPointAtLength(mid).x < s.x) lo = mid; else hi = mid; }
        return { s: s, at: lo };
      });
      api.sag('Linie ' + l.nr + ' · ' + l.name + ': ' + l.stationen.length + ' Halte. Klicken Sie unterwegs auf eine Station.');
      var pos = 0, h = 0, v = bewegungAus ? len : 4.2, warte = 0, letzte = performance.now();
      function schritt(now) {
        if (meinLauf !== lauf) return;
        var dt = Math.min(50, now - letzte); letzte = now;
        if (warte > 0) { warte -= dt; } else {
          pos = Math.min(len, pos + v * dt / 16);
          if (h < halte.length && pos >= halte[h].at) {
            pos = halte[h].at; warte = bewegungAus ? 0 : 900;
            var s = halte[h].s; s.kreis.setAttribute('r', 15); s.kreis.setAttribute('fill', l.farbe);
            h++;
          }
        }
        var p = l.pfad.getPointAtLength(pos), q = l.pfad.getPointAtLength(Math.min(len, pos + 1));
        var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
        zug.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ') rotate(' + ang + ')');
        if (pos < len || warte > 0) requestAnimationFrame(schritt);
        else api.sag('Endstation. Jede Station führt zu einem offiziellen Angebot. Probieren Sie eine andere Linie.');
      }
      requestAnimationFrame(schritt);
    }
    var leiste = api.szene.querySelector('#be-linien');
    LINIEN.slice().sort(function (a, b) { return a.nr - b.nr; }).forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gf-chip'; b.dataset.nr = l.nr; b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--farbe', l.farbe); b.textContent = l.nr + ' · ' + l.name;
      b.addEventListener('click', function () { fahre(l); });
      leiste.appendChild(b);
    });
    api.sag('Vier Wege zum Mitreden, alle fahren bei Ihnen los. Wählen Sie eine Linie.');
    var erste = LINIEN[1];
    setTimeout(function () { if (!lauf) fahre(erste); }, 900);
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
