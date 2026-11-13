/* Die Waage: Gewinne aus Strom, Gas und Wärme gegen die Verluste von Bussen, Bädern und Eishallen.
   Was fehlt, legt der Haushalt der Stadt als Gewicht dazu. */
(function (el, NF, bewegungAus, BD) {
  'use strict';
  var halt = null;
GRAFIK.szene({
  id: 'waage', reiter: 'Die Waage', form: 'Balkenwaage', farbe: '#b00e2b', seite: 'beteiligungen.html',
  titel: 'Wer bezahlt Bus und Hallenbad?',
  idee: 'Busse, Bäder und Eishallen kosten mehr, als Tickets und Eintritt einbringen. Einen Teil gleichen die Gewinne der Stadtwerke aus Strom, Gas und Wärme aus. Was dann noch fehlt, kommt aus dem Haushalt der Stadt.',
  notizen: [
    ['Bedienung', 'Ein Jahr antippen: Die Waage kippt erst, dann legt der Haushalt sein Gewicht dazu. „Abspielen“ zeigt alle Jahre nacheinander. Die drei Regler rechnen mit der Prognose für 2025/26. Ein Klick auf ein Gewicht öffnet die Zahlen mit Seitenangabe.'],
    ['Wow-Moment', 'Der Zuschuss schwankt von Jahr zu Jahr zwischen 8 und 20 Millionen Euro. Und: Selbst wenn alle Bäder und Eishallen schließen, bleiben Zins und Abschreibung.'],
    ['Mobil', 'Die Waage wird schmaler, Jahre und Regler stehen darunter. Antippen statt Ziehen.'],
    ['Daten', 'Beteiligungsbericht 2026 der Stadt Ingolstadt, Stadtwerke Ingolstadt Beteiligungen GmbH (Seiten 55 bis 57), Freizeitanlagen (Seite 270). Die Regler rechnen vereinfacht: Jeder Euro weniger Verlust oder mehr Gewinn senkt den Zuschuss um einen Euro, das Busangebot wirkt gleichmäßig auf den Verlust. Zins und Abschreibung der Bäder und Eishallen sind mit dem Wert von 2024/25 angesetzt.']
  ],
  pause: function () { if (halt) halt(); },
  init: function (api) {
    var WG = BD.waage, JAHRE = WG.jahre, P = JAHRE[JAHRE.length - 1];
    var FEST = WG.freizeit_fest.abschreibungen + WG.freizeit_fest.zinsen;
    var F = { energie: '#2f7080', haushalt: '#b00e2b', verlust: '#96551f', bus: '#96551f', freizeit: '#cf9a55' };
    var mio = function (t) { return NF.teurMio(t, 1); };

    var css = document.createElement('style');
    css.textContent = [
      '.wg{background:#fff}',
      '.wg-kopf{display:flex;justify-content:space-between;align-items:flex-end;gap:12px 24px;flex-wrap:wrap;padding:16px 20px 4px}',
      '.wg-zahl{font-family:var(--font-display);font-weight:900;font-size:clamp(1.9rem,4.4vw,3rem);color:#b00e2b;line-height:1;font-variant-numeric:tabular-nums}',
      '.wg-zahl.gut{color:#2e7d4f}',
      '.wg-kopf small{display:block;font-size:.8rem;color:var(--grau);margin-bottom:4px}',
      '.wg-neben{font-size:.86rem;color:var(--grau);max-width:46ch;text-align:right}',
      '.wg-neben b{color:var(--tinte)}',
      '.wg svg text{font-family:var(--font-body)}',
      '.wg svg text.wg-hell{paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round}',
      '.wg-block{cursor:pointer}',
      '.wg-block:hover rect,.wg-block:focus-visible rect{stroke:var(--tinte);stroke-width:2}',
      '.wg-regler{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 26px;padding:14px 20px 18px;border-top:1px solid var(--linie);background:var(--papier-warm)}',
      '.wg-regler h3{grid-column:1/-1;font-family:var(--font-display);font-size:1.05rem;margin:0;color:var(--navy-dark);display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}',
      '.wg-regler h3 small{font-family:var(--font-body);font-weight:400;font-size:.8rem;color:var(--grau)}',
      '.wg-regler label{display:block;font-size:.86rem;font-weight:600}',
      '.wg-regler output{float:right;font-variant-numeric:tabular-nums;color:var(--farbe);font-weight:700}',
      '.wg-regler input[type=range]{width:100%;margin:6px 0 2px;accent-color:#b00e2b}',
      '.wg-regler p{margin:0;font-size:.78rem;color:var(--grau);line-height:1.35}',
      '@media (max-width:760px){.wg-regler{grid-template-columns:minmax(0,1fr)}.wg-neben{text-align:left}}'
    ].join('\n');
    document.head.appendChild(css);

    api.szene.innerHTML = '<div class="wg">' +
      '<div class="leiste" id="wg-jahre"><span class="etikett">Geschäftsjahr</span></div>' +
      '<div class="wg-kopf"><div><small id="wg-zahl-text">Aus dem Haushalt</small><div class="wg-zahl" id="wg-zahl" aria-live="polite"></div></div><p class="wg-neben" id="wg-neben"></p></div>' +
      '<svg role="img" aria-label="Balkenwaage: links Gewinne der Stadtwerke und der Zuschuss aus dem Haushalt, rechts die Verluste von Bussen, Bädern und Eishallen"></svg>' +
      '<div class="wg-regler"><h3>Was wäre, wenn? <small>Rechnet mit der Prognose für 2025/26</small></h3>' +
      '<div><label for="wg-bus">Busangebot <output id="wg-bus-o"></output></label><input type="range" id="wg-bus" min="-30" max="10" step="5" value="0"><p>Weniger Fahrten, weniger Verlust. Vereinfacht gerechnet.</p></div>' +
      '<div><label for="wg-fz">Bäder und Eishallen <output id="wg-fz-o"></output></label><input type="range" id="wg-fz" min="0" max="100" step="10" value="100"><p>Bei null Betrieb bleiben ' + mio(FEST) + ' für Zins und Abschreibung.</p></div>' +
      '<div><label for="wg-en">Gewinn aus Energie <output id="wg-en-o"></output></label><input type="range" id="wg-en" min="-40" max="20" step="5" value="0"><p>Der Gewinn hängt an Wetter, Preisen und Netzentgelten.</p></div>' +
      '</div><div style="height:132px"></div></div>';

    var svg = api.szene.querySelector('svg'), leiste = api.szene.querySelector('#wg-jahre');
    var zahl = api.szene.querySelector('#wg-zahl'), zahlText = api.szene.querySelector('#wg-zahl-text'), neben = api.szene.querySelector('#wg-neben');
    var rBus = api.szene.querySelector('#wg-bus'), rFz = api.szene.querySelector('#wg-fz'), rEn = api.szene.querySelector('#wg-en');

    /* Zustand: was auf den Schalen liegt (TEUR) und wie weit der Haushalt sein Gewicht schon aufgelegt hat */
    var wahl = JAHRE.length - 2, ist = null, ziel = null, anim = null, spiel = null, tiltTimer = null;

    function lage(i) {
      var j = JAHRE[i], rest = j.rest;
      if (!j.prognose) return { j: j, links: j.energie - rest, einlage: j.einlage, rechts: [{ id: 'verlust', v: j.verlust, name: 'Busse, Bäder, Eishallen', kurz: 'Verluste', farbe: F.verlust }], rest: rest, energie: j.energie, verlust: j.verlust };
      var b = +rBus.value, f = +rFz.value, e = +rEn.value;
      var bus = j.bus * (1 + b / 100), fz = Math.min(j.freizeit, FEST) + Math.max(0, j.freizeit - FEST) * f / 100;
      var energie = j.energie * (1 + e / 100), sonst = j.verlust - j.bus - j.freizeit;
      var verlust = bus + fz + sonst, einlage = verlust - (energie - rest);
      return { j: j, links: energie - rest, einlage: einlage, rest: rest, energie: energie, verlust: verlust, geaendert: b !== 0 || f !== 100 || e !== 0,
        rechts: [{ id: 'bus', v: bus + sonst, zeig: bus, name: 'Busse', farbe: F.bus }, { id: 'freizeit', v: fz, name: 'Bäder, Eishallen', farbe: F.freizeit }] };
    }

    function zeichne(z) {
      var schmal = api.szene.clientWidth < 640, W = schmal ? 420 : 1000, H = 470;
      var arm = schmal ? 128 : 300, pw = schmal ? 132 : 230, seil = 230, px = W / 2, py = 62, fs = schmal ? 12 : 14;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var defs = el('defs', {}, svg), pat = el('pattern', { id: 'wg-schraffur', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('rect', { width: 8, height: 8, fill: '#f6dfe3' }, pat); el('rect', { width: 4, height: 8, fill: F.haushalt }, pat);
      // Ständer
      el('rect', { x: px - 5, y: py, width: 10, height: H - py - 34, fill: '#8f8779' }, svg);
      el('path', { d: 'M' + (px - 70) + ',' + (H - 22) + ' L' + px + ',' + (H - 64) + ' L' + (px + 70) + ',' + (H - 22) + ' Z', fill: '#8f8779' }, svg);
      el('line', { x1: schmal ? 10 : 60, y1: H - 22, x2: W - (schmal ? 10 : 60), y2: H - 22, stroke: '#e4e0d8', 'stroke-width': 2 }, svg);
      var t = z.theta * Math.PI / 180, dx = arm * Math.cos(t), dy = arm * Math.sin(t);
      var L = [px - dx, py - dy], R = [px + dx, py + dy];
      el('line', { x1: L[0], y1: L[1], x2: R[0], y2: R[1], stroke: '#16232b', 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: px, cy: py, r: 9, fill: '#16232b' }, svg);
      var gesamt = Math.max(z.links + Math.max(0, z.einlage), z.rechts.reduce(function (s, r) { return s + r.v; }, 0), 1);
      var mass = Math.min(4.6, (seil - 44) / (gesamt / 1000));
      function schale(p, teile, seite) {
        var y = p[1] + seil;
        el('path', { d: 'M' + p[0] + ',' + p[1] + ' L' + (p[0] - pw / 2) + ',' + y + ' M' + p[0] + ',' + p[1] + ' L' + (p[0] + pw / 2) + ',' + y, stroke: '#8f8779', 'stroke-width': 1.5, fill: 'none' }, svg);
        el('rect', { x: p[0] - pw / 2 - 8, y: y, width: pw + 16, height: 7, rx: 3, fill: '#16232b' }, svg);
        var oben = y;
        teile.forEach(function (b) {
          var h = b.v / 1000 * mass * (b.anteil === undefined ? 1 : b.anteil); if (h < 0.5) return;
          oben -= h;
          var g = el('g', { 'class': 'wg-block', 'data-id': b.id, tabindex: 0, role: 'button', 'aria-label': b.name + ': ' + mio(b.zeig === undefined ? b.v : b.zeig) }, svg);
          el('rect', { x: p[0] - pw / 2 + 6, y: oben, width: pw - 12, height: Math.max(1, h - 2), rx: 3, fill: b.fill || b.farbe, stroke: b.rand || 'none' }, g);
          var wert = mio(b.zeig === undefined ? b.v : b.zeig);
          if (h >= 40) {
            var a = el('text', { x: p[0], y: oben + h / 2 - 3, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: b.schrift || '#fff', 'class': b.schrift ? 'wg-hell' : '' }, g); a.textContent = (schmal && b.kurz) || b.name;
            var c = el('text', { x: p[0], y: oben + h / 2 + fs + 1, 'text-anchor': 'middle', 'font-size': fs, fill: b.schrift || '#fff', 'class': b.schrift ? 'wg-hell' : '' }, g); c.textContent = wert;
          } else if (h >= 17) {
            var e1 = el('text', { x: p[0], y: oben + h / 2 + fs / 3, 'text-anchor': 'middle', 'font-size': fs - 1, 'font-weight': 600, fill: b.schrift || '#fff', 'class': b.schrift ? 'wg-hell' : '' }, g); e1.textContent = (schmal ? '' : b.name + ' · ') + wert;
          }
        });
        var u = el('text', { x: p[0], y: y + 28, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: '#16232b' }, svg); u.textContent = seite;
      }
      var linksTeile = [{ id: 'energie', v: z.links, name: schmal ? 'Energie' : 'Gewinn aus Energie', farbe: F.energie }];
      if (z.einlage > 0) linksTeile.push({ id: 'haushalt', v: z.einlage, anteil: z.auflage, name: schmal ? 'Haushalt' : 'Aus dem Haushalt', fill: 'url(#wg-schraffur)', rand: F.haushalt, schrift: '#16232b' });
      schale(L, linksTeile, 'Das kommt herein');
      schale(R, z.rechts, 'Das fehlt');
    }

    function mischen(a, b, k) {
      var r = { theta: a.theta + (b.theta - a.theta) * k, auflage: a.auflage + (b.auflage - a.auflage) * k, links: a.links + (b.links - a.links) * k, einlage: a.einlage + (b.einlage - a.einlage) * k };
      r.rechts = b.rechts.map(function (x, i) { var alt = a.rechts.length === b.rechts.length ? a.rechts[i].v : a.rechts.reduce(function (s, y) { return s + y.v; }, 0) * x.v / (b.rechts.reduce(function (s, y) { return s + y.v; }, 0) || 1);
        var n = {}; for (var key in x) n[key] = x[key]; n.v = alt + (x.v - alt) * k; if (x.zeig !== undefined) n.zeig = x.zeig; return n; });
      return r;
    }
    /* Läuft die Animation nicht (Fenster im Hintergrund, requestAnimationFrame pausiert), stellt ein Timer den Endzustand her */
    var sicher = null;
    function gehe(neu, dauer, fertig) {
      if (anim) cancelAnimationFrame(anim);
      clearTimeout(sicher);
      if (bewegungAus || document.hidden || !ist || !dauer) { ist = neu; zeichne(ist); if (fertig) fertig(); return; }
      var von = ist, start = null, erledigt = false;
      function ende() { if (erledigt) return; erledigt = true; clearTimeout(sicher); if (anim) cancelAnimationFrame(anim); anim = null; ist = neu; zeichne(ist); if (fertig) fertig(); }
      sicher = setTimeout(ende, dauer + 250);
      (function schritt(ts) {
        if (erledigt) return;
        if (start === null) start = ts;
        var k = Math.min(1, (ts - start) / dauer); k = 1 - Math.pow(1 - k, 3);
        if (k >= 1) { ende(); return; }
        ist = mischen(von, neu, k); zeichne(ist);
        anim = requestAnimationFrame(schritt);
      })(performance.now());
    }
    function schraeg(l) { // Lage der Waage ohne (oder mit überschüssigem) Gewicht
      var d = l.einlage / 1000;
      return Math.max(-13, Math.min(13, d * 0.75));
    }

    function kopf(l) {
      var j = l.j, ueber = l.einlage < 0;
      zahlText.textContent = ueber ? 'Es bleibt übrig' : (j.prognose ? (l.geaendert ? 'Aus dem Haushalt, mit Ihren Annahmen' : 'Aus dem Haushalt, Prognose 2025/26') : 'Aus dem Haushalt, ' + j.jahr);
      zahl.textContent = mio(Math.abs(l.einlage)); zahl.classList.toggle('gut', ueber);
      neben.innerHTML = 'Gewinn aus Energie <b>' + mio(l.energie) + '</b>, davon gehen <b>' + mio(l.rest) + '</b> an Mitgesellschafter und Steuern. Verluste <b>' + mio(l.verlust) + '</b>.';
    }
    function sprich(l) {
      var j = l.j;
      if (!j.prognose) { api.sag(j.jahr + ': Die Energie brachte ' + mio(l.links) + ' für Busse, Bäder und Eishallen. Die kosteten ' + mio(j.verlust) + '. ' + mio(j.einlage) + ' kamen aus dem Haushalt dazu.'); return; }
      if (!l.geaendert) { api.sag('Für 2025/26 rechnen die Stadtwerke mit ' + mio(j.einlage) + ' aus dem Haushalt. Schieben Sie die Regler und sehen Sie, was sich ändert.'); return; }
      var d = l.einlage - j.einlage, text = l.einlage < 0 ? 'Mit diesen Annahmen bliebe sogar etwas übrig.' : 'Mit diesen Annahmen braucht es ' + mio(l.einlage) + ' aus dem Haushalt, ' + mio(Math.abs(d)) + (d < 0 ? ' weniger' : ' mehr') + ' als geplant.';
      if (+rFz.value === 0) text += ' Auch ohne Betrieb bleiben bei Bädern und Eishallen ' + mio(FEST) + ' für Zins und Abschreibung.';
      api.sag(text);
    }
    function ausgaben() {
      var b = +rBus.value, e = +rEn.value;
      api.szene.querySelector('#wg-bus-o').textContent = (b > 0 ? '+' : b < 0 ? '−' : '') + Math.abs(b) + ' %';
      api.szene.querySelector('#wg-fz-o').textContent = rFz.value + ' % Betrieb';
      api.szene.querySelector('#wg-en-o').textContent = (e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e) + ' %';
    }
    function chips() { leiste.querySelectorAll('[data-i]').forEach(function (c) { c.setAttribute('aria-pressed', String(+c.dataset.i === wahl)); }); }

    /* Jahr zeigen: erst kippt die Waage (Haushalt fehlt noch), dann legt der Haushalt sein Gewicht auf */
    function zeige(i, kippen) {
      clearTimeout(tiltTimer); clearTimeout(sicher);
      wahl = i; chips(); api.karteZu();
      var l = lage(i); ziel = l; kopf(l); sprich(l);
      var fertig = { theta: l.einlage < 0 ? schraeg(l) : 0, auflage: 1, links: l.links, einlage: l.einlage, rechts: l.rechts };
      if (!kippen || bewegungAus || l.einlage <= 0) { gehe(fertig, kippen ? 500 : 250); return; }
      gehe({ theta: schraeg(l), auflage: 0, links: l.links, einlage: l.einlage, rechts: l.rechts }, 600, function () {
        tiltTimer = setTimeout(function () { gehe(fertig, 700); }, 650);
      });
    }

    JAHRE.forEach(function (j, i) {
      var c = document.createElement('button'); c.type = 'button'; c.className = 'gf-chip'; c.dataset.i = i; c.setAttribute('aria-pressed', 'false');
      c.textContent = j.prognose ? 'Prognose ' + j.jahr : j.jahr;
      c.addEventListener('click', function () { stopp(); zeige(i, true); });
      leiste.appendChild(c);
    });
    var play = document.createElement('button'); play.type = 'button'; play.className = 'gf-chip'; play.id = 'wg-play'; play.setAttribute('aria-pressed', 'false'); play.textContent = '▶ Abspielen';
    leiste.appendChild(play);
    function stopp() { if (spiel) { clearInterval(spiel); spiel = null; } play.setAttribute('aria-pressed', 'false'); play.textContent = '▶ Abspielen'; }
    halt = stopp;
    play.addEventListener('click', function () {
      if (spiel) { stopp(); return; }
      play.setAttribute('aria-pressed', 'true'); play.textContent = '■ Anhalten';
      var i = 0; zeige(0, true);
      spiel = setInterval(function () { i += 1; if (i >= JAHRE.length) { stopp(); return; } zeige(i, true); }, 3200);
    });
    [rBus, rFz, rEn].forEach(function (r) {
      r.addEventListener('input', function () { stopp(); ausgaben(); zeige(JAHRE.length - 1, false); });
    });

    function karteFuer(id) {
      var l = ziel, j = l.j, q = '<p class="gf-quelle">Quelle: ' + NF.esc(BD.quelle.titel) + ', ', html = '';
      if (id === 'energie') {
        html = '<p class="augenbraue">Stadtwerke</p><h3>Gewinn aus Strom, Gas, Wärme und Netzen</h3><p class="zahl">' + mio(l.energie) + '</p><dl>' +
          '<dt>an Mitgesellschafter und Steuern</dt><dd>' + mio(l.rest) + '</dd><dt>bleibt für Busse, Bäder, Eishallen</dt><dd>' + mio(l.links) + '</dd></dl>' +
          '<p>Der Stadt gehören über ihre Kommunalbetriebe 70 % der Stadtwerke. Die beiden Mitgesellschafter N-ERGIE und Thüga bekommen ihren Anteil vorab' +
          (j.ueberleitung ? ', ' + j.jahr + ' zusammen ' + mio(j.ueberleitung.mitgesellschafter) : '') + '. Der Rest wird mit den Verlusten verrechnet, das spart Steuern.</p>' +
          q + 'Seiten 52 und 55 bis 57.' + (j.prognose && l.geaendert ? ' Mit Ihren Annahmen gerechnet.' : '') + '</p>';
      } else if (id === 'haushalt') {
        html = '<p class="augenbraue">Haushalt der Stadt</p><h3>Was die Gewinne nicht decken</h3><p class="zahl">' + mio(l.einlage) + '</p>' +
          '<p>Diesen Betrag müssen die Kommunalbetriebe bei den Stadtwerken einlegen. Dafür brauchen sie Geld aus dem Haushalt der Stadt.</p>' +
          (j.stadt_hinweis ? '<p>' + NF.esc(j.stadt_hinweis) + '</p>' : (j.stadt !== undefined ? '<dl><dt>Verlustausgleich der Stadt im selben Jahr</dt><dd>' + mio(j.stadt) + '</dd></dl><p class="meta">Die Zahlung der Stadt folgt dem Verlust oft mit einem Jahr Abstand, deshalb weichen die Beträge ab.</p>' : '')) +
          q + 'Seiten 33, 46 und 57.' + (j.prognose && l.geaendert ? ' Mit Ihren Annahmen gerechnet.' : '') + '</p>';
      } else {
        var kopfzeile = id === 'bus' ? 'Busse' : id === 'freizeit' ? 'Bäder und Eishallen' : 'Busse, Bäder und Eishallen';
        var wert = id === 'verlust' ? j.verlust : l.rechts.filter(function (r) { return r.id === id; })[0];
        html = '<p class="augenbraue">Was Tickets und Eintritt nicht decken</p><h3>' + kopfzeile + '</h3><p class="zahl">' + mio(id === 'verlust' ? wert : (wert.zeig === undefined ? wert.v : wert.zeig)) + '</p>';
        if (id === 'verlust') {
          html += '<dl><dt>Jahresverlust Busse</dt><dd>' + mio(j.bus) + '</dd><dt>Jahresverlust Bäder, Eishallen</dt><dd>' + mio(j.freizeit) + '</dd></dl>';
          if (j.verlust_teile) html += '<p>Die Stadtwerke hatten im Vorjahr ' + mio(-j.verlust_teile.bus_vorjahr - j.verlust_teile.freizeit_vorjahr) + ' zu viel zurückgelegt. Das entlastet dieses Jahr einmalig.</p>';
          else html += '<p class="meta">Die beiden Jahresverluste ergeben nicht genau den Betrag auf der Waage, weil die Stadtwerke Verluste vorab schätzen und im Folgejahr abrechnen.</p>';
          if (j.freizeit_hinweis) html += '<p class="meta">' + NF.esc(j.freizeit_hinweis) + '</p>';
          html += q + 'Seiten 55, 57, 241 und 271.</p>';
        } else if (id === 'bus') {
          html += '<p>Die Stadtwerke erwarten für 2025/26 nicht gedeckte Kosten von ' + mio(j.bus) + ' im Busverkehr. Ein Sparpaket von 5,3 Mio. € ist schon umgesetzt.</p><p class="meta">Der Regler rechnet vereinfacht: 10 % weniger Angebot gleich 10 % weniger Verlust. Fahrzeuge und Personal lassen sich nicht so gleichmäßig abbauen.</p>' + q + 'Seiten 57, 241 und 242.</p>';
        } else {
          html += '<dl><dt>Zins und Abschreibung (2024/25)</dt><dd>' + mio(FEST) + '</dd><dt>Kredite der Freizeitanlagen</dt><dd>86,3 Mio. €</dd></dl><p>Freibad, Sportbad, Donautherme, Saturn-Arena und zweite Eishalle. Zins und Abschreibung laufen weiter, auch wenn nichts mehr geöffnet ist.</p>' + q + 'Seiten 57, 270 und 271.</p>';
        }
      }
      return html;
    }
    function klick(ev) { var g = ev.target.closest ? ev.target.closest('.wg-block') : null; if (!g) return; api.karte(karteFuer(g.getAttribute('data-id')), g); }
    svg.addEventListener('click', klick);
    svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); klick(ev); } });

    var breite = api.szene.clientWidth < 640;
    window.addEventListener('resize', function () { var b = api.szene.clientWidth < 640; if (b !== breite) { breite = b; if (ist) zeichne(ist); } });

    ausgaben();
    zeige(wahl, true);
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.BETEILIGUNGEN_DATEN);
