/* Themen: ruhiges Netz der Schlagworte. Ein Klick holt ein Schlagwort in die Mitte,
   seine Nachbarn ordnen sich im Kreis darum, je näher, desto öfter kommen sie zusammen vor. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'themen', reiter: 'Themen', form: 'Netzwerk', farbe: '#14505c', seite: 'themen.html',
  titel: 'Wie alles zusammenhängt',
  idee: 'Jeder Kreis ist ein Schlagwort. Eine Linie heißt: Beide Schlagworte stehen oft am selben Tagesordnungspunkt. Klicken Sie ein Schlagwort an, dann rückt es in die Mitte und zeigt, womit es zusammenhängt.',
  notizen: [
    ['Bedienung', 'Maus über einen Kreis: Seine Linien leuchten auf, mit Zahl. Klick: Das Schlagwort wandert in die Mitte, die Nachbarn ordnen sich darum. Ein Klick auf einen Nachbarn springt weiter.'],
    ['Wow-Moment', 'Der Umbau vom Netz zum Kreis. Man kann sich durch die Stadtpolitik hangeln: von Unterwegs zu Baustelle zu Grün & Sauberkeit. Die Karte zeigt dazu echte Tagesordnungspunkte.'],
    ['Mobil', 'Gleiche Szene. Antippen statt Darüberfahren, die Karte steht unter dem Bild.'],
    ['Daten', 'Schlagworte und gemeinsames Vorkommen aus data/feed.json. Im Netz nur Paare ab 12 gemeinsamen Einträgen, in der Kreisansicht alle.']
  ],
  init: function (api) {
    var W = 1200, H = 680, NZ = SK.netz, A = SK.start.achsen, E = SK.start.e;
    var FARBE = { l: ['#e3f0f2', '#14505c'], a: ['#f9efe2', '#96551f'] };

    /* Gemeinsames Vorkommen aller Paare direkt aus den Einträgen */
    var ids = A.lebenslage.map(function (n) { return 'l:' + n; }).concat(A.anlass.map(function (n) { return 'a:' + n; }));
    function tagsVon(e) {
      var t = [];
      A.lebenslage.forEach(function (n, b) { if (e[1] & (1 << b)) t.push('l:' + n); });
      A.anlass.forEach(function (n, b) { if (e[2] & (1 << b)) t.push('a:' + n); });
      return t;
    }
    var paar = {}, eintraegeVon = {};
    ids.forEach(function (id) { eintraegeVon[id] = []; });
    E.forEach(function (e) {
      var t = tagsVon(e);
      t.forEach(function (x) { eintraegeVon[x].push(e); });
      for (var i = 0; i < t.length; i++) for (var j = i + 1; j < t.length; j++) {
        var k = t[i] < t[j] ? t[i] + '|' + t[j] : t[j] + '|' + t[i]; paar[k] = (paar[k] || 0) + 1;
      }
    });
    function zusammen(a, b) { return paar[a < b ? a + '|' + b : b + '|' + a] || 0; }
    function datumWert(d) { var m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(d || ''); return m ? +m[3] * 1e4 + +m[2] * 100 + +m[1] : 0; }

    var knoten = NZ.knoten.map(function (k) { return Object.assign({}, k, { r: 9 + Math.sqrt(k.n) * 1.05 }); });
    var nachId = {}; knoten.forEach(function (k) { nachId[k.id] = k; });
    var kanten = NZ.kanten.map(function (k) { return { source: k.a, target: k.b, n: k.n }; });
    var maxN = d3.max(kanten, function (k) { return k.n; });

    /* Feste Anordnung: einmal ausrechnen, dann steht das Netz */
    var sim = d3.forceSimulation(knoten)
      .force('link', d3.forceLink(kanten).id(function (k) { return k.id; }).distance(function (k) { return 190 - 90 * k.n / maxN; }).strength(function (k) { return .08 + .4 * k.n / maxN; }))
      .force('ladung', d3.forceManyBody().strength(-900))
      .force('stoss', d3.forceCollide().radius(function (k) { return k.r + 30; }))
      .force('x', d3.forceX(W / 2).strength(.04)).force('y', d3.forceY(H / 2).strength(.1))
      .stop();
    for (var i = 0; i < 420; i++) sim.tick();
    /* Schlagworte ohne häufige Nachbarn stehen am Rand, der Rest füllt die Fläche */
    var verbunden = {}; kanten.forEach(function (l) { verbunden[l.source.id] = verbunden[l.target.id] = true; });
    var netzK = knoten.filter(function (k) { return verbunden[k.id]; });
    var bx = d3.extent(netzK, function (k) { return k.x; }), by = d3.extent(netzK, function (k) { return k.y; });
    var sx = (W - 220) / (bx[1] - bx[0]), sy = (H - 120) / (by[1] - by[0]);
    knoten.forEach(function (k, i) {
      if (verbunden[k.id]) { k.ox = W / 2 + (k.x - (bx[0] + bx[1]) / 2) * sx; k.oy = H / 2 + 4 + (k.y - (by[0] + by[1]) / 2) * sy; }
      else { k.ox = W - 60; k.oy = H - 70 - i * 0; }
      k.x = k.ox; k.y = k.oy;
    });

    api.szene.innerHTML = '<div class="leiste"><span class="etikett">Ansicht</span><button class="gf-chip" type="button" id="th-netz" aria-pressed="true">Ganzes Netz</button>' +
      '<span class="etikett" style="margin-left:14px">Springen zu</span>' +
      ['l:Unterwegs', 'l:Eltern & Kinder', 'a:Klima & Umwelt', 'l:Wohnen & Miete', 'a:Gebühren & Preise'].map(function (id) {
        return '<button class="gf-chip klein" type="button" data-zu="' + id + '">' + id.split(':')[1] + '</button>';
      }).join('') + '</div>' +
      '<div style="position:relative"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Netzwerk der Schlagworte"></svg><div class="tooltip" id="th-tip"></div></div>';
    var svg = d3.select(api.szene.querySelector('svg')), tip = api.szene.querySelector('#th-tip');
    var hinter = svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#fff');
    var gRing = svg.append('g'), gL = svg.append('g'), gE = svg.append('g'), gK = svg.append('g'), gZ = svg.append('g').attr('pointer-events', 'none');

    var linie = gL.selectAll('line').data(kanten).join('line')
      .attr('stroke', '#c9c2b5').attr('stroke-linecap', 'round')
      .attr('stroke-width', function (k) { return 1 + 7 * k.n / maxN; }).attr('stroke-opacity', .55);
    var g = gK.selectAll('g').data(knoten).join('g').style('cursor', 'pointer').style('outline', 'none').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', function (k) { return k.name + ', ' + k.n + ' Einträge'; });
    g.append('circle').attr('class', 'ring').attr('r', function (k) { return k.r + 6; }).attr('fill', 'none').attr('stroke', function (k) { return FARBE[k.art][1]; }).attr('stroke-width', 2).attr('opacity', 0);
    g.append('circle').attr('r', function (k) { return k.r; })
      .attr('fill', function (k) { return FARBE[k.art][0]; }).attr('stroke', function (k) { return FARBE[k.art][1]; }).attr('stroke-width', 1.6);
    g.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('font-size', 10.5).attr('font-weight', 700)
      .attr('fill', function (k) { return FARBE[k.art][1]; }).text(function (k) { return NF.zahl(k.n); });
    g.append('text').attr('class', 'name').attr('text-anchor', 'middle').attr('dy', function (k) { return k.r + 15; })
      .attr('font-size', 12.5).attr('font-weight', 600).attr('fill', '#16232b')
      .attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .text(function (k) { return k.name; });

    var lg = svg.append('g').attr('transform', 'translate(24,22)');
    [['l', 'Lebenslage'], ['a', 'Anlass']].forEach(function (z, i) {
      lg.append('circle').attr('cx', 8 + i * 0).attr('cy', i * 22).attr('r', 7).attr('fill', FARBE[z[0]][0]).attr('stroke', FARBE[z[0]][1]);
      lg.append('text').attr('x', 22).attr('y', i * 22 + 4).attr('font-size', 12.5).attr('fill', '#16232b').text(z[1]);
    });
    var lgL = svg.append('g').attr('transform', 'translate(130,22)');
    lgL.append('line').attr('x1', 0).attr('x2', 34).attr('y1', 0).attr('y2', 0).attr('stroke', '#c9c2b5').attr('stroke-width', 7).attr('stroke-linecap', 'round');
    lgL.append('text').attr('x', 44).attr('y', 4).attr('font-size', 12.5).attr('fill', '#16232b').text('dicke Linie = oft zusammen');

    function setze(dauer) {
      var t = d3.transition().duration(bewegungAus ? 0 : dauer).ease(d3.easeCubicInOut);
      g.transition(t).attr('transform', function (k) { return 'translate(' + k.x + ',' + k.y + ')'; });
      linie.transition(t).attr('x1', function (k) { return k.source.x; }).attr('y1', function (k) { return k.source.y; })
        .attr('x2', function (k) { return k.target.x; }).attr('y2', function (k) { return k.target.y; });
    }
    setze(0);

    /* Überfahren im Netz: Linien des Knotens mit Zahl */
    var mitte = null;
    function zeigeZahlen(paare) {
      gZ.selectAll('g').remove();
      paare.forEach(function (p) {
        var x = (p.a.x + p.b.x) / 2, y = (p.a.y + p.b.y) / 2;
        var z = gZ.append('g').attr('transform', 'translate(' + x + ',' + y + ')');
        var t = NF.zahl(p.n);
        z.append('rect').attr('x', -t.length * 3.6 - 7).attr('y', -10).attr('width', t.length * 7.2 + 14).attr('height', 19).attr('rx', 9.5).attr('fill', '#fff').attr('stroke', p.farbe).attr('stroke-width', 1.2);
        z.append('text').attr('text-anchor', 'middle').attr('y', 4).attr('font-size', 11.5).attr('font-weight', 700).attr('fill', p.farbe).text(t);
      });
    }
    function hebeHervor(k) {
      if (mitte) return;
      g.attr('opacity', function (n) { return !k || n === k || zusammen(k.id, n.id) >= 12 ? 1 : .2; });
      linie.attr('stroke', function (l) { return k && (l.source === k || l.target === k) ? FARBE[k.art][1] : '#c9c2b5'; })
        .attr('stroke-opacity', function (l) { return !k ? .55 : (l.source === k || l.target === k ? .9 : .08); });
      zeigeZahlen(k ? kanten.filter(function (l) { return l.source === k || l.target === k; }).map(function (l) { return { a: l.source, b: l.target, n: l.n, farbe: FARBE[k.art][1] }; }) : []);
    }

    /* Kreisansicht: Knoten in der Mitte, Nachbarn darum */
    var MX = 430, MY = H / 2 - 10;
    function nachbarn(k) {
      return knoten.filter(function (n) { return n !== k && zusammen(k.id, n.id) > 0; })
        .map(function (n) { return { k: n, n: zusammen(k.id, n.id) }; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, 12);
    }
    function fokus(k) {
      mitte = k; tip.classList.remove('an');
      api.szene.querySelector('#th-netz').setAttribute('aria-pressed', 'false');
      var nb = nachbarn(k), max = nb.length ? nb[0].n : 1, drin = {};
      drin[k.id] = true;
      nb.forEach(function (o, i) {
        var w = -Math.PI / 2 + i / nb.length * Math.PI * 2;
        var r = 150 + (1 - o.n / max) * 120;
        o.k.x = MX + Math.cos(w) * r * 1.15; o.k.y = MY + Math.sin(w) * r * .84;
        drin[o.k.id] = true;
      });
      k.x = MX; k.y = MY;
      knoten.forEach(function (n) { if (!drin[n.id]) { var w = Math.atan2(n.oy - MY, n.ox - MX); n.x = MX + Math.cos(w) * 520; n.y = MY + Math.sin(w) * 420; } });
      g.transition('sicht').duration(bewegungAus ? 0 : 500).attr('opacity', function (n) { return drin[n.id] ? 1 : 0; }).style('pointer-events', function (n) { return drin[n.id] ? 'auto' : 'none'; });
      g.select('.ring').attr('opacity', function (n) { return n === k ? 1 : 0; });
      linie.transition('sicht').duration(300).attr('stroke-opacity', 0);
      gZ.selectAll('g').remove(); gE.selectAll('*').remove(); gRing.selectAll('*').remove();
      setze(950);
      // Speichen mit Zahl, nach dem Umbau
      setTimeout(function () {
        if (mitte !== k) return;
        gRing.append('ellipse').attr('cx', MX).attr('cy', MY).attr('rx', 150 * 1.15).attr('ry', 150 * .84).attr('fill', 'none').attr('stroke', '#ece8df').attr('stroke-dasharray', '3 5');
        gRing.append('ellipse').attr('cx', MX).attr('cy', MY).attr('rx', 270 * 1.15).attr('ry', 270 * .84).attr('fill', 'none').attr('stroke', '#ece8df').attr('stroke-dasharray', '3 5');
        gRing.append('text').attr('x', MX + 150 * 1.15 + 4).attr('y', MY - 4).attr('font-size', 10.5).attr('fill', '#8f8779').text('oft');
        gRing.append('text').attr('x', MX + 270 * 1.15 + 4).attr('y', MY - 4).attr('font-size', 10.5).attr('fill', '#8f8779').text('seltener');
        nb.forEach(function (o) {
          var sp = gE.append('line').attr('x1', MX).attr('y1', MY).attr('x2', MX).attr('y2', MY)
            .attr('stroke', FARBE[k.art][1]).attr('stroke-opacity', .5).attr('stroke-linecap', 'round').attr('stroke-width', 1.5 + 9 * o.n / max);
          sp.transition().duration(bewegungAus ? 0 : 450).attr('x2', o.k.x).attr('y2', o.k.y);
        });
        zeigeZahlen(nb.map(function (o) { return { a: k, b: o.k, n: o.n, farbe: FARBE[k.art][1] }; }));
        gZ.attr('opacity', 0).transition().delay(bewegungAus ? 0 : 350).duration(300).attr('opacity', 1);
      }, bewegungAus ? 0 : 960);
      karteFuer(k, nb);
      api.sag(nb.length ? '„' + k.name + '“ steht am häufigsten zusammen mit „' + nb[0].k.name + '“ auf der Tagesordnung, ' + NF.zahl(nb[0].n) + '-mal. Klicken Sie einen Nachbarn an, um weiterzuspringen.'
        : '„' + k.name + '“ hat keine häufigen Nachbarn.');
    }
    function netz() {
      mitte = null; api.karteZu();
      api.szene.querySelector('#th-netz').setAttribute('aria-pressed', 'true');
      knoten.forEach(function (k) { k.x = k.ox; k.y = k.oy; });
      gE.selectAll('*').remove(); gZ.selectAll('g').remove(); gRing.selectAll('*').remove();
      g.select('.ring').attr('opacity', 0);
      g.transition('sicht').duration(bewegungAus ? 0 : 500).attr('opacity', 1).style('pointer-events', 'auto');
      linie.transition('sicht').delay(bewegungAus ? 0 : 600).duration(400).attr('stroke', '#c9c2b5').attr('stroke-opacity', .55);
      setze(900);
      api.sag('Fahren Sie über ein Schlagwort, dann sehen Sie seine Verbindungen. Ein Klick holt es in die Mitte.');
    }

    function beispiele(liste, n) {
      return liste.slice().sort(function (a, b) { return datumWert(b[5]) - datumWert(a[5]); }).slice(0, n)
        .map(function (e) { return '<li><span class="meta">' + NF.esc(e[5]) + ' · ' + NF.esc(e[6]) + '</span><br>' + NF.esc(e[4]) + '</li>'; }).join('');
    }
    function karteFuer(k, nb) {
      var max = nb.length ? nb[0].n : 1;
      api.karte('<div class="meta">' + (k.art === 'l' ? 'Lebenslage' : 'Anlass') + '</div><h3>' + NF.esc(k.name) + '</h3>' +
        '<div class="zahl">' + NF.zahl(k.n) + '</div><p class="meta">Tagesordnungspunkte mit diesem Schlagwort</p>' +
        '<p style="margin:12px 0 6px;font-weight:600">Steht oft zusammen mit</p>' +
        '<div style="display:grid;gap:5px">' + nb.slice(0, 6).map(function (o) {
          return '<button type="button" data-paar="' + NF.esc(o.k.id) + '" style="all:unset;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;font-size:.86rem">' +
            '<span>' + NF.esc(o.k.name) + '</span><b style="font-variant-numeric:tabular-nums">' + NF.zahl(o.n) + '</b>' +
            '<span style="grid-column:1/-1;height:5px;border-radius:3px;background:#ece8df"><span style="display:block;height:5px;border-radius:3px;width:' + (o.n / max * 100) + '%;background:' + FARBE[k.art][1] + '"></span></span></button>';
        }).join('') + '</div>' +
        '<p style="margin:14px 0 4px;font-weight:600" id="th-bsp-kopf">Zuletzt auf der Tagesordnung</p><ul id="th-bsp" style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:.86rem">' + beispiele(eintraegeVon[k.id], 4) + '</ul>');
      document.querySelectorAll('[data-paar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = nachId[b.dataset.paar];
          var beide = eintraegeVon[k.id].filter(function (e) { return eintraegeVon[o.id].indexOf(e) >= 0; });
          document.getElementById('th-bsp-kopf').textContent = k.name + ' und ' + o.name + ', zuletzt';
          document.getElementById('th-bsp').innerHTML = beispiele(beide, 5);
        });
      });
    }

    var pt = svg.node().createSVGPoint();
    g.on('mouseenter', function (ev, k) {
      hebeHervor(k);
      var text = k.name + ': ' + NF.zahl(k.n) + ' Einträge';
      if (mitte && k !== mitte) text = k.name + ' und ' + mitte.name + ': ' + NF.zahl(zusammen(k.id, mitte.id)) + '-mal zusammen. Klick springt hierher.';
      tip.textContent = text; tip.classList.add('an');
      pt.x = ev.clientX; pt.y = ev.clientY;
      var r = api.szene.querySelector('svg').getBoundingClientRect();
      var x = ev.clientX - r.left + 14; if (x > r.width - 290) x -= 300;
      tip.style.left = x + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px';
    })
      .on('mouseleave', function () { hebeHervor(null); tip.classList.remove('an'); })
      .on('click', function (ev, k) { ev.stopPropagation(); if (k !== mitte) fokus(k); })
      .on('keydown', function (ev, k) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fokus(k); } });
    hinter.on('click', function () { if (mitte) netz(); });
    api.szene.querySelector('#th-netz').addEventListener('click', function () { if (mitte) netz(); });
    api.szene.querySelectorAll('[data-zu]').forEach(function (b) { b.addEventListener('click', function () { fokus(nachId[b.dataset.zu]); }); });

    api.sag('Fahren Sie über ein Schlagwort, dann sehen Sie seine Verbindungen. Ein Klick holt es in die Mitte.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
