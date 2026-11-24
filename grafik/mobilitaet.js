/* Mobilitätsplan: oben eine schematische Karte der Stadtbezirke, eingefärbt nach
   einem Verkehrsmittel; daneben die „Straße“ des gewählten Bezirks. Jede Spur ist
   so breit wie der Anteil des Verkehrsmittels an allen Wegen, darauf sind 100
   Figuren unterwegs. Die Karte zeigt, WOMIT die Menschen eines Bezirks unterwegs
   sind, nicht wohin: Ziele hat die Befragung je Bezirk nicht ausgewiesen.
   Daten: data/mobilitaet.js (lädt die Seite selbst) und data/bezirke.js (Umrisse). */
(function (el, NF, bewegungAus) {
  'use strict';
GRAFIK.szene({
  id: 'mobilitaet', reiter: 'Mobilität', form: 'Karte und Straße', farbe: '#1f7480', seite: 'mobilitaet.html',
  titel: 'Eine Straße für jeden Bezirk',
  idee: 'Wählen Sie auf der Karte einen Stadtbezirk. Rechts entsteht seine Straße: Gehweg, Radweg, Fahrbahn und Busspur sind so breit wie ihr Anteil an allen Wegen der Menschen, die dort wohnen. 100 Figuren sind darauf unterwegs.',
  notizen: [
    ['Bedienung', 'Bezirk auf der Karte anklicken oder oben wählen. „Karte zeigt“ färbt die Karte nach einem Verkehrsmittel ein: je dunkler, desto höher der Anteil. Ein Klick auf eine Spur wechselt ebenfalls die Einfärbung.'],
    ['Wow-Moment', 'In Mailing wird der Gehweg zur Promenade, in Südwest nimmt die Fahrbahn mehr als die halbe Straße ein.'],
    ['Mobil', 'Die Karte steht über der Straße.'],
    ['Daten', 'Befragung „Mobilität in Deutschland“ 2023, je Bezirk aus dem Analysebericht zum Mobilitätsplan (S. 18). Die Spurbreite zeigt den Anteil an den Wegen, nicht den Platz auf einer echten Straße. Für den Bezirk Süd nennt der Bericht keine Werte; in Bezirken mit * wurden weniger als 100 Fälle ausgewertet. Umrisse: Stadt Ingolstadt, Stadtbezirke (CC BY 3.0 DE), vereinfacht.']
  ],
  init: function (api) {
    var D = window.MOBILITAET_DATEN, BEZ = window.BEZIRKE;
    var MITTEL = [
      { id: 'fuss', n: 'Zu Fuß', spur: 'Gehweg', farbe: '#1f7480', grund: '#e6e1d6', tempo: 14 },
      { id: 'rad', n: 'Fahrrad', spur: 'Radweg', farbe: '#4d7a2a', grund: '#d9e3cd', tempo: 42 },
      { id: 'auto', n: 'Auto und Motorrad', spur: 'Fahrbahn', farbe: '#96551f', grund: '#8d9296', tempo: 78 },
      { id: 'oev', n: 'Bus und Bahn', spur: 'Busspur', farbe: '#7a3b69', grund: '#a79aa6', tempo: 52 }
    ];
    var stadt = D.modal.reihen[0];
    var ORTE = [{ n: 'Ingolstadt gesamt', kurz: 'Ganze Stadt', w: { fuss: stadt.fuss, rad: stadt.rad, auto: stadt.auto, oev: stadt.oev } }]
      .concat(D.bezirke.map(function (b) {
        return { n: b.n, kurz: b.n.replace('Friedrichshofen-Hollerstauden', 'Friedrichsh.-Hollerst.'), faelle: b.faelle,
          w: { fuss: b.fuss, rad: b.rad, auto: b.fahrer + b.mitfahrer, oev: b.oev } };
      }));
    var nachName = {};
    ORTE.forEach(function (o) { nachName[o.n] = o; });

    /* Maße. Schmal: Karte oben, Straße darunter. */
    var schmal = !!(window.matchMedia && matchMedia('(max-width: 640px)').matches);
    var W = schmal ? 620 : 1200;
    var KARTE = schmal ? { x: 40, y: 120, w: 540, h: 330 } : { x: 30, y: 130, w: 420, h: 400 };
    var STR = schmal ? { x: 170, y: 540, w: 430, h: 420 } : { x: 640, y: 130, w: 530, h: 430 };
    var RAND = schmal ? 20 : 468;            // linke Kante der Spur-Beschriftung
    var H = schmal ? 1030 : 730;      // unten Platz für den Panther, damit er die Legende nicht verdeckt
    var MASS = schmal ? .85 : 1;             // Figurengröße

    api.szene.innerHTML =
      '<div class="leiste" id="mo-orte"><span class="etikett">Wo</span></div>' +
      '<div class="leiste" id="mo-modus"><span class="etikett">Karte zeigt</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Karte der Stadtbezirke und eine Straße, deren Spuren so breit sind wie die Anteile der Verkehrsmittel"></svg>';
    var svg = api.szene.querySelector('svg');
    var defs = el('defs', {}, svg);
    var muster = el('pattern', { id: 'mo-schraffur', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 7, height: 7, fill: '#efece5' }, muster);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: '#b9b2a5', 'stroke-width': 2 }, muster);
    var clip = el('clipPath', { id: 'mo-clip' }, defs);
    el('rect', { x: STR.x, y: STR.y, width: STR.w, height: STR.h, rx: 6 }, clip);
    el('rect', { width: W, height: H, fill: '#f7f5f0' }, svg);

    var SERIF = '"Source Serif 4", Georgia, serif';
    var titel = el('text', { x: KARTE.x, y: 58, 'font-size': schmal ? 32 : 38, 'font-weight': 900, 'font-family': SERIF, fill: '#00263a' }, svg);
    var unter = el('text', { x: KARTE.x + 1, y: 88, 'font-size': 16, fill: '#566a74' }, svg);

    /* ---------- Karte ---------- */
    var ringe = [];
    BEZ.features.forEach(function (f) {
      var polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      ringe.push({ name: f.properties.bezname, polys: polys });
    });
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, KOS = Math.cos(48.76 * Math.PI / 180);
    ringe.forEach(function (r) { r.polys.forEach(function (p) { p[0].forEach(function (c) {
      x0 = Math.min(x0, c[0] * KOS); x1 = Math.max(x1, c[0] * KOS); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]);
    }); }); });
    var fak = Math.min(KARTE.w / (x1 - x0), KARTE.h / (y1 - y0));
    var offX = KARTE.x + (KARTE.w - (x1 - x0) * fak) / 2, offY = KARTE.y + (KARTE.h - (y1 - y0) * fak) / 2;
    function px(c) { return [offX + (c[0] * KOS - x0) * fak, offY + (y1 - c[1]) * fak]; }
    var gKarte = el('g', {}, svg), gZahl = el('g', { 'pointer-events': 'none' }, svg);
    var flaechen = [];
    ringe.forEach(function (r) {
      var d = '', sx = 0, sy = 0, n = 0;
      r.polys.forEach(function (p) {
        p.forEach(function (ring, ri) {
          ring.forEach(function (c, i) {
            var q = px(c); d += (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
            if (ri === 0) { sx += q[0]; sy += q[1]; n++; }
          });
          d += 'Z';
        });
      });
      /* Die Umrissdatei kürzt „Friedrichshofen-Hollerst.“ ab. */
      var ort = nachName[r.name] || ORTE.filter(function (o) { return r.name.slice(-1) === '.' && o.n.indexOf(r.name.slice(0, -1)) === 0; })[0] || null;
      var pfad = el('path', { d: d, 'fill-rule': 'evenodd', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linejoin': 'round',
        tabindex: 0, role: 'button', style: 'cursor:pointer' }, gKarte);
      pfad.style.transition = bewegungAus ? 'none' : 'fill .45s ease';
      var tip = el('title', {}, pfad);
      var zahl = el('text', { x: sx / n, y: sy / n + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#fff',
        stroke: 'rgba(0,38,58,.55)', 'stroke-width': 3, 'paint-order': 'stroke' }, gZahl);
      var fl = { name: r.name, ort: ort, pfad: pfad, zahl: zahl, tip: tip };
      function wahl() {
        if (!ort) { api.sag('Für den Bezirk ' + NF.esc(r.name) + ' nennt der Bericht keine Zahlen. Warum, steht dort nicht.'); return; }
        waehle(ort);
      }
      pfad.addEventListener('click', wahl);
      pfad.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wahl(); } });
      flaechen.push(fl);
    });
    var rahmen = el('path', { fill: 'none', stroke: '#00263a', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'pointer-events': 'none' }, svg);
    var legY = KARTE.y + KARTE.h + 26;
    var legBalken = el('rect', { x: KARTE.x, y: legY - 11, width: 110, height: 12, rx: 2 }, svg);
    var gradient = el('linearGradient', { id: 'mo-verlauf' }, defs);
    var stopA = el('stop', { offset: 0 }, gradient), stopB = el('stop', { offset: 1 }, gradient);
    legBalken.setAttribute('fill', 'url(#mo-verlauf)');
    var legText = el('text', { x: KARTE.x + 120, y: legY, 'font-size': 13, fill: '#566a74' }, svg);
    var legText2 = el('text', { x: KARTE.x, y: legY + 22, 'font-size': 13, fill: '#566a74' }, svg);
    legText2.textContent = '* unter 100 Fälle · schraffiert: keine Daten';

    function mische(hex, t) {     // von hellem Papier (t = 0) zur Farbe (t = 1)
      var a = [239, 236, 229], b = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
      return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')';
    }

    /* ---------- Straße ---------- */
    el('rect', { x: STR.x, y: STR.y, width: STR.w, height: STR.h, rx: 6, fill: '#ddd8cc' }, svg);
    var gSpur = el('g', { 'clip-path': 'url(#mo-clip)' }, svg);
    var gFig = el('g', { 'clip-path': 'url(#mo-clip)', 'pointer-events': 'none' }, svg);
    var gBesch = el('g', {}, svg);
    var spuren = MITTEL.map(function (m) {
      var r = el('rect', { x: STR.x, width: STR.w, fill: m.grund, style: 'cursor:pointer' }, gSpur);
      var linie = m.id === 'auto' ? el('line', { x1: STR.x, x2: STR.x + STR.w, stroke: '#fff', 'stroke-width': 2.5, 'stroke-dasharray': '22 18', opacity: .85 }, gSpur)
        : m.id === 'rad' ? el('line', { x1: STR.x, x2: STR.x + STR.w, stroke: '#fff', 'stroke-width': 1.5, 'stroke-dasharray': '6 10', opacity: .8 }, gSpur) : null;
      var kante = el('line', { x1: STR.x, x2: STR.x + STR.w, stroke: '#fff', 'stroke-width': 2 }, gSpur);
      var g = el('g', { tabindex: 0, role: 'button', style: 'cursor:pointer' }, gBesch);
      var z = el('text', { x: RAND, 'font-size': 30, 'font-weight': 900, 'font-family': SERIF, fill: m.farbe }, g);
      var nm = el('text', { x: RAND + 48, 'font-size': 15, 'font-weight': 600, fill: '#16232b' }, g);
      nm.textContent = m.spur;
      var sub = el('text', { x: RAND + 48, 'font-size': 12, fill: '#566a74' }, g);
      sub.textContent = m.n;
      function klick() { setzeModus(m.id); }
      r.addEventListener('click', klick); g.addEventListener('click', klick);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klick(); } });
      return { m: m, r: r, linie: linie, kante: kante, g: g, z: z, nm: nm, sub: sub, top: STR.y, h: STR.h / 4, zTop: STR.y, zH: STR.h / 4 };
    });
    var hinweis = el('text', { x: STR.x, y: STR.y + STR.h + 24, 'font-size': 13, fill: '#566a74' }, svg);
    hinweis.textContent = schmal ? 'Spurbreite = Anteil an allen Wegen.' : 'Spurbreite = Anteil an allen Wegen, nicht der Platz auf einer echten Straße.';

    /* 100 Figuren. Jede hat vier Gestalten, sichtbar ist die ihres Verkehrsmittels. */
    var figuren = [];
    for (var i = 0; i < 100; i++) {
      var g = el('g', {}, gFig), formen = {};
      formen.fuss = el('g', {}, g);
      el('ellipse', { cx: 1.5, cy: 2, rx: 6, ry: 3.5, fill: 'rgba(0,0,0,.18)' }, formen.fuss);
      el('circle', { r: 5, fill: '#1f7480', stroke: '#fff', 'stroke-width': 1.2 }, formen.fuss);
      formen.rad = el('g', {}, g);
      el('rect', { x: -9, y: -1.2, width: 18, height: 2.4, rx: 1.2, fill: '#2b3a22' }, formen.rad);
      el('circle', { r: 4.6, fill: '#4d7a2a', stroke: '#fff', 'stroke-width': 1.2 }, formen.rad);
      formen.auto = el('g', {}, g);
      el('rect', { x: -13, y: -6.5, width: 26, height: 13, rx: 4, fill: '#96551f', stroke: '#fff', 'stroke-width': 1 }, formen.auto);
      el('rect', { x: 1, y: -4.5, width: 6, height: 9, rx: 1.5, fill: '#e9d7c2' }, formen.auto);
      formen.oev = el('g', {}, g);
      el('rect', { x: -24, y: -6.5, width: 48, height: 13, rx: 3, fill: '#7a3b69', stroke: '#fff', 'stroke-width': 1 }, formen.oev);
      el('rect', { x: 14, y: -4.5, width: 6, height: 9, rx: 1, fill: '#ead9e6' }, formen.oev);
      el('rect', { x: -19, y: -4.5, width: 28, height: 2, fill: '#ead9e6', opacity: .8 }, formen.oev);
      figuren.push({ g: g, formen: formen, x: Math.random() * STR.w, lage: (i * .6180339887) % 1, streu: .8 + Math.random() * .4, mittel: null, spur: null });
    }

    var aktuell = ORTE[0], modus = 'fuss';

    function verteile() {
      var summe = MITTEL.reduce(function (s, m) { return s + aktuell.w[m.id]; }, 0), y = STR.y, k = 0;
      spuren.forEach(function (s) {
        s.zH = aktuell.w[s.m.id] / summe * STR.h; s.zTop = y; y += s.zH;
        s.z.textContent = aktuell.w[s.m.id];
        s.g.setAttribute('aria-label', s.m.spur + ': ' + aktuell.w[s.m.id] + ' von 100 Wegen ' + s.m.n + '. Karte danach einfärben.');
        /* Bus und Bahn brauchen Platz: weniger, dafür erkennbare Busse (einer je vier Wege). */
        var anzahl = s.m.id === 'oev' ? Math.max(1, Math.round(aktuell.w.oev / 4)) : aktuell.w[s.m.id];
        var belegt = aktuell.w[s.m.id];
        for (var j = 0; j < belegt && k < 100; j++, k++) {
          var f = figuren[k];
          f.mittel = s.m.id; f.spur = s; f.sichtbar = j < anzahl; f.nr = j; f.von = anzahl;
        }
      });
      for (; k < 100; k++) { figuren[k].mittel = null; figuren[k].sichtbar = false; }
      figuren.forEach(function (f) {
        MITTEL.forEach(function (m) { f.formen[m.id].style.display = f.sichtbar && f.mittel === m.id ? '' : 'none'; });
      });
    }

    function lege(sofort) {
      spuren.forEach(function (s) {
        if (sofort) { s.top = s.zTop; s.h = s.zH; }
        else { s.top += (s.zTop - s.top) * .12; s.h += (s.zH - s.h) * .12; }
        s.r.setAttribute('y', s.top); s.r.setAttribute('height', Math.max(0, s.h));
        s.kante.setAttribute('y1', s.top); s.kante.setAttribute('y2', s.top);
        if (s.linie) { s.linie.setAttribute('y1', s.top + s.h / 2); s.linie.setAttribute('y2', s.top + s.h / 2); }
        var mitte = s.top + s.h / 2, eng = s.h < 34;
        s.z.setAttribute('y', mitte + 10); s.nm.setAttribute('y', eng ? mitte + 5 : mitte - 2); s.sub.setAttribute('y', mitte + 14);
        s.z.setAttribute('font-size', eng ? 22 : 30);
        s.sub.style.display = eng || schmal ? 'none' : '';   // schmal: der Zusatz liefe in die Straße
      });
      figuren.forEach(function (f) {
        if (!f.sichtbar) return;
        var s = f.spur, rand = Math.min(9, s.h * .3);
        /* Obere Hälfte fährt nach rechts, untere nach links; Fußgänger gehen durcheinander. */
        var anteil = (f.nr + .5) / f.von, hin = f.mittel === 'fuss' ? f.nr % 2 === 0 : anteil < .5;
        var y = s.top + rand + (f.mittel === 'fuss' ? f.lage : anteil) * (s.h - 2 * rand);
        f.hin = hin;
        f.g.setAttribute('transform', 'translate(' + (STR.x + f.x).toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (hin ? MASS : -MASS) + ' ' + MASS + ')');
      });
    }

    var zuletzt = 0, laeuft = false, rahmenId = 0;
    function schritt(t) {
      if (!laeuft) return;
      var dt = Math.min(.05, (t - zuletzt) / 1000 || 0); zuletzt = t;
      figuren.forEach(function (f) {
        if (!f.sichtbar) return;
        var v = MITTEL.filter(function (m) { return m.id === f.mittel; })[0].tempo * f.streu;
        f.x += (f.hin ? 1 : -1) * v * dt;
        if (f.x > STR.w + 30) f.x = -30; else if (f.x < -30) f.x = STR.w + 30;
      });
      lege(false);
      rahmenId = requestAnimationFrame(schritt);
    }
    function los() { if (bewegungAus || laeuft) return; laeuft = true; zuletzt = performance.now(); rahmenId = requestAnimationFrame(schritt); }
    function halt() { laeuft = false; cancelAnimationFrame(rahmenId); }
    this.pause = halt; this.weiter = los;

    function faerbe() {
      var m = MITTEL.filter(function (x) { return x.id === modus; })[0];
      var werte = ORTE.slice(1).map(function (o) { return o.w[modus]; });
      var min = Math.min.apply(null, werte), max = Math.max.apply(null, werte);
      flaechen.forEach(function (fl) {
        if (!fl.ort) {
          fl.pfad.style.fill = 'url(#mo-schraffur)'; fl.zahl.textContent = fl.name;
          fl.zahl.setAttribute('fill', '#566a74'); fl.zahl.setAttribute('stroke', '#f7f5f0'); fl.zahl.setAttribute('font-size', 13);
          fl.tip.textContent = fl.name + ': keine Daten im Bericht';
          fl.pfad.setAttribute('aria-label', fl.name + ': keine Daten im Bericht');
          return;
        }
        var w = fl.ort.w[modus], t = max > min ? (w - min) / (max - min) : .5;
        fl.pfad.style.fill = mische(m.farbe, .22 + .78 * t);
        fl.zahl.textContent = w + (fl.ort.faelle < 100 ? '*' : '');
        fl.tip.textContent = fl.name + ': ' + w + ' von 100 Wegen ' + m.n;
        fl.pfad.setAttribute('aria-label', fl.name + ': ' + w + ' von 100 Wegen ' + m.n + (fl.ort === aktuell ? ', ausgewählt' : ''));
      });
      stopA.setAttribute('stop-color', mische(m.farbe, .22)); stopB.setAttribute('stop-color', m.farbe);
      legText.textContent = m.n + ': ' + min + ' bis ' + max + ' von 100 Wegen';
      var gewaehlt = flaechen.filter(function (fl) { return fl.ort === aktuell; })[0];
      rahmen.setAttribute('d', gewaehlt ? gewaehlt.pfad.getAttribute('d') : '');
      spuren.forEach(function (s) { s.nm.setAttribute('text-decoration', s.m.id === modus ? 'underline' : 'none'); });
      titel.textContent = aktuell.n;
      unter.textContent = aktuell.w[modus] + ' von 100 Wegen ' + (modus === 'fuss' ? 'zu Fuß' : modus === 'rad' ? 'mit dem Rad' : modus === 'auto' ? 'mit Auto oder Motorrad' : 'mit Bus und Bahn') +
        (aktuell.faelle ? ' · Fallzahl ' + NF.zahl(aktuell.faelle) : ' · Befragung 2023');
    }

    var leisteOrt = api.szene.querySelector('#mo-orte'), leisteModus = api.szene.querySelector('#mo-modus');
    function chips(leiste, gewaehlt) {
      leiste.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.wert === gewaehlt ? 'true' : 'false'); });
    }
    function setzeModus(id) { modus = id; chips(leisteModus, id); faerbe(); }
    function waehle(o) {
      aktuell = o; chips(leisteOrt, o);
      verteile(); faerbe();
      if (bewegungAus) lege(true);
      if (o === ORTE[0]) api.sag('Die Straße der ganzen Stadt: knapp die Hälfte Fahrbahn, gut ein Viertel Gehweg. Klicken Sie auf Ihren Bezirk.');
      else if (o.faelle < 100) api.sag(NF.esc(o.n) + ': Hier wurden nur ' + o.faelle + ' Fälle ausgewertet. Die Spuren sind deshalb nur ungefähr so breit.');
      else {
        var st = ORTE[0].w, groesste = MITTEL.slice().sort(function (a, b) { return Math.abs(o.w[b.id] - st[b.id]) - Math.abs(o.w[a.id] - st[a.id]); })[0];
        var diff = o.w[groesste.id] - st[groesste.id];
        api.sag(NF.esc(o.n) + ': ' + (diff === 0 ? 'fast wie die ganze Stadt.' : NF.esc(groesste.spur) + ' ' + Math.abs(diff) + ' Punkte ' + (diff > 0 ? 'breiter' : 'schmaler') + ' als in der ganzen Stadt.'));
      }
    }
    ORTE.forEach(function (o) {
      var b = document.createElement('button'); b.className = 'gf-chip'; b.type = 'button'; b.textContent = o.kurz + (o.faelle < 100 ? ' *' : ''); b.wert = o;
      b.addEventListener('click', function () { waehle(o); });
      leisteOrt.appendChild(b);
    });
    MITTEL.forEach(function (m) {
      var b = document.createElement('button'); b.className = 'gf-chip'; b.type = 'button'; b.textContent = m.n; b.wert = m.id;
      b.addEventListener('click', function () { setzeModus(m.id); });
      leisteModus.appendChild(b);
    });

    chips(leisteOrt, aktuell); chips(leisteModus, modus);
    verteile(); faerbe(); lege(true); los();
    api.sag('Jede Spur ist so breit wie ihr Anteil an den Wegen. Klicken Sie auf der Karte auf Ihren Bezirk.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus);
