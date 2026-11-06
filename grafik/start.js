/* Startseite: 3.874 Tagesordnungspunkte als Punkteschwarm, der sich neu sortiert. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'start', reiter: 'Start', form: 'Punkteschwarm', farbe: '#003e59', seite: 'index.html',
  titel: 'Die Stadt in Punkten',
  idee: 'Jeder Punkt ist ein Tagesordnungspunkt aus Stadtrat, Ausschüssen und Bezirksausschüssen. Ein Klick sortiert alle Punkte neu: nach Stadtbezirk, Lebenslage oder Stand.',
  notizen: [
    ['Bedienung', 'Oben die Sortierung wählen. Eine Lebenslage hebt ihre Punkte hervor, der Rest wird blass. Maus über einen Punkt zeigt den Titel, ein Klick öffnet die Karte.'],
    ['Wow-Moment', 'Beim ersten Laden fliegen alle Punkte aus der Mitte in den Kreis. Jeder Wechsel der Sortierung ist eine Flugbewegung von 3.874 Punkten. Nach Lebenslage ballen sie sich zu Blasen, deren Größe man sofort vergleicht.'],
    ['Mobil', 'Gleiche Szene, kleiner skaliert. Tippen statt Darüberfahren. Die Waben-Karte bleibt lesbar, weil sie keine echten Grenzen braucht.'],
    ['Daten', 'data/feed.json: Bezirk, Lebenslage, Status und Klartext-Titel je Eintrag. Die Waben sind eine stilisierte Lage der 12 Stadtbezirke, keine Karte.']
  ],
  init: function (api) {
    var D = SK.start, A = D.achsen, E = D.e, N = E.length;
    var W = 1200, H = 780;
    var FARBE = ['#2e7d4f', '#3d8fb0', '#b00e2b', '#b9c6cc'];
    var STATUS_KURZ = ['Entschieden', 'Ergebnis im Protokoll', 'Noch offen', 'Nur zur Information'];

    api.szene.innerHTML =
      '<div class="leiste" id="st-modi"><span class="etikett">Sortieren</span></div>' +
      '<div class="leiste" id="st-ll"><span class="etikett">Lebenslage</span></div>' +
      '<div style="position:relative"><canvas id="st-c" style="display:block;width:100%;cursor:pointer"></canvas><div class="tooltip" id="st-tip"></div></div>';
    var cv = api.szene.querySelector('#st-c'), ctx = cv.getContext('2d'), tip = api.szene.querySelector('#st-tip');
    var skala = 1, verst = 1, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function groesse() {
      var b = cv.parentNode.clientWidth || 1000;
      skala = b / W; verst = b < 700 ? 1.8 : 1; cv.width = b * dpr; cv.height = H * skala * dpr; cv.style.height = (H * skala) + 'px';
      zeichne();
    }

    /* Punkte: aktueller Ort, Ziel, Startzeit */
    var P = E.map(function (e, i) { return { e: e, i: i, x: W / 2, y: H / 2, fx: W / 2, fy: H / 2, tx: W / 2, ty: H / 2, t0: 0, r: 3.6, tr: 3.6, fr: 3.6 }; });
    var modus = 'alle', filter = -1, etiketten = [];

    function phyllo(liste, cx, cy, c) {
      liste.forEach(function (p, k) {
        var r = c * Math.sqrt(k + .5), a = k * 2.39996;
        p.tx = cx + r * Math.cos(a); p.ty = cy + r * Math.sin(a);
      });
    }
    function balken(gruppen, x0, y0, zeile, spalteH, abstand) {
      gruppen.forEach(function (g, gi) {
        g.punkte.forEach(function (p, k) {
          p.tx = x0 + Math.floor(k / spalteH) * abstand;
          p.ty = y0 + gi * zeile + (k % spalteH) * abstand;
        });
        etiketten.push({ x: x0 - 12, y: y0 + gi * zeile + (spalteH - 1) * abstand / 2 + 4, t: g.name, n: g.punkte.length, rechts: true });
      });
    }
    /* Jede Gruppe ein Kreis, dicht gepackt; Fläche entspricht der Zahl der Punkte */
    function blasen(gruppen, c) {
      var kreise = gruppen.map(function (g) { return { g: g, r: c * Math.sqrt(g.punkte.length + 1) + 18 }; });
      d3.packSiblings(kreise);
      var x0 = d3.min(kreise, function (k) { return k.x - k.r; }), x1 = d3.max(kreise, function (k) { return k.x + k.r; });
      var y0 = d3.min(kreise, function (k) { return k.y - k.r; }), y1 = d3.max(kreise, function (k) { return k.y + k.r; });
      var dx = W / 2 + 40 - (x0 + x1) / 2, dy = H / 2 - 14 - (y0 + y1) / 2;
      kreise.forEach(function (k) {
        var cx = k.x + dx, cy = k.y + dy;
        phyllo(k.g.punkte, cx, cy - 6, c);
        etiketten.push({ x: cx, y: cy + k.r - 6, t: k.g.name, n: k.g.punkte.length, mitte: true, halo: true, klein: k.r < 70 });
      });
    }
    function bitErst(m) { for (var b = 0; b < 13; b++) if (m & (1 << b)) return b; return -1; }

    /* Stilisierte Lage der Stadtbezirke (Waben, Zeile/Spalte) */
    var WABEN = { 'VII-Etting': [1, 0], 'VIII-Oberhaunstadt': [2, 0], 'XI-Friedrichshofen/Hollerstauden': [0, 1], 'II-Nordwest': [1, 1], 'III-Nordost': [2, 1],
      'VI-West': [0, 2], 'I-Mitte': [1, 2], 'IX-Mailing/Feldkirchen': [2, 2], 'V-Südwest': [0, 3], 'X-Süd': [1, 3], 'IV-Südost': [2, 3], 'XII-Münchener Straße': [1, 4] };
    var R = 84, WB = Math.sqrt(3) * R;
    function wabenMitte(name) {
      var cr = WABEN[name], col = cr[0], row = cr[1];
      return [452 + col * WB + (row % 2 ? WB / 2 : 0), 92 + row * 1.5 * R];
    }
    var waben = [];

    function layout() {
      etiketten = []; waben = [];
      P.forEach(function (p) { p.tr = 3.6; });
      if (modus === 'alle') {
        var s = P.slice().sort(function (a, b) { return a.e[3] - b.e[3] || a.i - b.i; });
        phyllo(s, W / 2, 408, 5.35);
        var z = [0, 0, 0, 0]; P.forEach(function (p) { z[p.e[3]]++; });
        etiketten.push({ x: W / 2, y: 26, t: NF.zahl(N) + ' Tagesordnungspunkte aus ' + NF.zahl(D.sitzungen) + ' Sitzungen', mitte: true, gross: true });
      } else if (modus === 'bezirk') {
        var g = {}; P.forEach(function (p) { var k = p.e[0]; (g[k] = g[k] || []).push(p); });
        Object.keys(WABEN).forEach(function (name) {
          var idx = A.bezirk.indexOf(name), m = wabenMitte(name), liste = g[idx] || [];
          phyllo(liste, m[0], m[1] - 12, 3.35);
          waben.push({ x: m[0], y: m[1], name: name, n: liste.length });
        });
        P.forEach(function (p) { p.tr = 2.8; });
        phyllo(g[0] || [], 196, 380, 3.55);
        etiketten.push({ x: 196, y: 380 + 3.55 * Math.sqrt((g[0] || []).length) + 26, t: 'Ganze Stadt', n: (g[0] || []).length, mitte: true });
        phyllo(g[-1] || [], 1030, 380, 3.55);
        etiketten.push({ x: 1030, y: 380 + 3.55 * Math.sqrt((g[-1] || []).length) + 26, t: 'Ohne Ortsbezug (u. a. Bezirk Oberbayern)', n: (g[-1] || []).length, mitte: true });
      } else if (modus === 'lebenslage') {
        var gr = A.lebenslage.map(function (n) { return { name: n, punkte: [] }; }); var ohne = { name: 'Ohne Lebenslage', punkte: [] };
        P.forEach(function (p) { var b = bitErst(p.e[1]); (b < 0 ? ohne : gr[b]).punkte.push(p); });
        gr.sort(function (a, b) { return b.punkte.length - a.punkte.length; }); gr.push(ohne);
        P.forEach(function (p) { p.tr = 3.5; });
        blasen(gr, 4.7);
      } else if (modus === 'stand') {
        var gs = STATUS_KURZ.map(function (n) { return { name: n, punkte: [] }; });
        P.forEach(function (p) { gs[p.e[3]].punkte.push(p); });
        P.forEach(function (p) { p.tr = 2.7; });
        balken(gs, 250, 52, 172, 22, 6.2);
      }
      var jetzt = performance.now();
      P.forEach(function (p) {
        p.fx = p.x; p.fy = p.y; p.fr = p.r;
        p.t0 = jetzt + (bewegungAus ? 0 : Math.random() * 450);
      });
      laufe();
    }

    var DAUER = bewegungAus ? 1 : 1000, laeuft = false;
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function laufe() { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } }
    function schritt(now) {
      var fertig = true;
      P.forEach(function (p) {
        var t = Math.max(0, Math.min(1, (now - p.t0) / DAUER));
        if (t < 1) fertig = false;
        var k = ease(t);
        // leichter Bogen beim Flug
        var bog = Math.sin(Math.PI * k) * 40 * ((p.i % 7) - 3) / 3;
        p.x = p.fx + (p.tx - p.fx) * k + bog * .3;
        p.y = p.fy + (p.ty - p.fy) * k - Math.abs(bog) * .4;
        p.r = p.fr + (p.tr - p.fr) * k;
      });
      zeichne();
      if (!fertig) requestAnimationFrame(schritt); else laeuft = false;
    }

    function passt(p) { return filter < 0 || (p.e[1] & (1 << filter)); }
    var hover = null;
    function zeichne() {
      ctx.setTransform(dpr * skala, 0, 0, dpr * skala, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Waben
      waben.forEach(function (w) {
        ctx.beginPath();
        for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k + Math.PI / 6; ctx.lineTo(w.x + (R - 2) * Math.cos(a), w.y + (R - 2) * Math.sin(a)); }
        ctx.closePath(); ctx.fillStyle = '#f1f5f7'; ctx.fill(); ctx.strokeStyle = '#d5e0e5'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // Punkte, gefilterte zuerst blass
      for (var pass = 0; pass < 2; pass++) {
        P.forEach(function (p) {
          var an = passt(p);
          if ((pass === 0) === an) return;
          ctx.globalAlpha = an ? 1 : .13;
          ctx.fillStyle = FARBE[p.e[3]];
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * verst, 0, 6.2832); ctx.fill();
        });
      }
      ctx.globalAlpha = 1;
      if (hover) { ctx.strokeStyle = '#00263a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hover.x, hover.y, hover.r + 3, 0, 6.2832); ctx.stroke(); }
      // Beschriftung
      ctx.fillStyle = '#16232b';
      waben.forEach(function (w) {
        var teile = w.name.split('-'); var nr = teile[0], nm = teile.slice(1).join('-').replace('Friedrichshofen/Hollerstauden', 'Friedrichshofen').replace('Mailing/Feldkirchen', 'Mailing');
        var n = P.filter(function (p) { return A.bezirk[p.e[0]] === w.name && passt(p); }).length;
        ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3.5;
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.strokeText(nm, w.x, w.y + R - 26); ctx.fillStyle = '#16232b'; ctx.fillText(nm, w.x, w.y + R - 26);
        ctx.font = '700 13px "Source Serif 4", Georgia, serif';
        ctx.strokeText(nr + ' · ' + NF.zahl(n), w.x, w.y + R - 11); ctx.fillStyle = '#00263a'; ctx.fillText(nr + ' · ' + NF.zahl(n), w.x, w.y + R - 11);
      });
      etiketten.forEach(function (l) {
        ctx.textAlign = l.mitte ? 'center' : (l.rechts ? 'right' : 'left');
        ctx.font = (l.gross ? '700 18px' : (l.klein ? '600 11.5px' : '600 13.5px')) + ' "Source Serif 4", Georgia, serif';
        var t = l.t; if (l.n !== undefined) t += '  ' + NF.zahl(l.n);
        if (l.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4; ctx.strokeText(t, l.x, l.y); }
        ctx.fillStyle = '#00263a';
        ctx.fillText(t, l.x, l.y);
      });
      if (modus === 'alle') legende();
    }
    function legende() {
      var z = [0, 0, 0, 0]; P.forEach(function (p) { if (passt(p)) z[p.e[3]]++; });
      var x = W - 236, y = H - 128;
      ctx.textAlign = 'left';
      STATUS_KURZ.forEach(function (s, k) {
        ctx.fillStyle = FARBE[k]; ctx.beginPath(); ctx.arc(x, y + k * 26, 7, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#16232b'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(s + '  ' + NF.zahl(z[k]), x + 16, y + k * 26 + 5);
      });
    }

    function finde(ev) {
      var r = cv.getBoundingClientRect(), mx = (ev.clientX - r.left) / skala, my = (ev.clientY - r.top) / skala, best = null, bd = 100;
      P.forEach(function (p) { if (!passt(p)) return; var d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    cv.addEventListener('mousemove', function (ev) {
      var p = finde(ev);
      if (p !== hover) { hover = p; zeichne(); }
      if (p) {
        tip.textContent = p.e[4]; tip.classList.add('an');
        var r = cv.getBoundingClientRect();
        var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        if (x > r.width - 290) x -= 300;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      } else tip.classList.remove('an');
    });
    cv.addEventListener('mouseleave', function () { hover = null; tip.classList.remove('an'); zeichne(); });
    cv.addEventListener('click', function (ev) {
      var p = finde(ev); if (!p) return;
      var e = p.e, ll = A.lebenslage.filter(function (n, b) { return e[1] & (1 << b); });
      var an = A.anlass.filter(function (n, b) { return e[2] & (1 << b); });
      api.karte('<div class="meta">' + NF.esc(e[6]) + ' · ' + NF.esc(e[5]) + '</div><h3>' + NF.esc(e[4]) + '</h3>' +
        '<dl><dt>Stand</dt><dd style="color:' + FARBE[e[3]] + '">' + A.status[e[3]] + '</dd>' +
        '<dt>Ort</dt><dd>' + (e[0] >= 0 ? A.bezirk[e[0]] : 'ohne Ortsbezug') + '</dd>' +
        (ll.length ? '<dt>Lebenslage</dt><dd>' + ll.join(', ') + '</dd>' : '') +
        (an.length ? '<dt>Anlass</dt><dd>' + an.join(', ') + '</dd>' : '') + '</dl>');
    });

    /* Bedienleisten */
    var modi = [['alle', 'Alles'], ['bezirk', 'Nach Stadtbezirk'], ['lebenslage', 'Nach Lebenslage'], ['stand', 'Nach Stand']];
    var leiste = api.szene.querySelector('#st-modi');
    var SAGEN = {
      alle: NF.zahl(N) + ' Punkte, jeder ist ein Tagesordnungspunkt. Die meisten sind nur zur Information. Rot ist, was noch offen ist.',
      bezirk: 'Mitte hat die meisten eigenen Punkte. Viele Themen betreffen aber die ganze Stadt.',
      lebenslage: '„Unterwegs“ liegt weit vorn: Verkehr ist das Thema, das am häufigsten auf der Tagesordnung steht.',
      stand: 'Nur ein kleiner Teil wird wirklich entschieden. Das meiste wird vorgestellt und zur Kenntnis genommen.'
    };
    modi.forEach(function (m) {
      var b = document.createElement('button'); b.className = 'gf-chip'; b.type = 'button'; b.textContent = m[1];
      b.setAttribute('aria-pressed', m[0] === modus ? 'true' : 'false');
      b.addEventListener('click', function () {
        modus = m[0]; leiste.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
        api.sag(SAGEN[modus]); layout();
      });
      leiste.appendChild(b);
    });
    var ll = api.szene.querySelector('#st-ll');
    A.lebenslage.forEach(function (n, k) {
      var b = document.createElement('button'); b.className = 'gf-chip klein'; b.type = 'button'; b.textContent = n; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        filter = filter === k ? -1 : k;
        ll.querySelectorAll('.gf-chip').forEach(function (c, j) { c.setAttribute('aria-pressed', j === filter ? 'true' : 'false'); });
        var z = P.filter(passt).length;
        api.sag(filter < 0 ? SAGEN[modus] : NF.zahl(z) + ' Punkte betreffen „' + n + '“.');
        zeichne();
      });
      ll.appendChild(b);
    });

    window.addEventListener('resize', groesse);
    groesse();
    // Auftakt: alle Punkte starten in der Mitte und fliegen in den Kreis
    P.forEach(function (p) { var a = Math.random() * 6.28, r = Math.random() * 12; p.x = W / 2 + r * Math.cos(a); p.y = H / 2 + r * Math.sin(a); });
    layout();
    api.sag(SAGEN.alle);
    this.weiter = groesse;
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
