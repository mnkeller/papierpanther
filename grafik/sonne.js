/* Klima, zweite Grafik: ein Tag Strom in Ingolstadt. Bedarf der Stadt gegen Sonnenstrom,
   mit Reglern für den Solarausbau und die Batteriespeicher. Modellrechnung mit Standardprofilen. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'sonne', reiter: 'Klima II', form: 'Sonnentag', farbe: '#2e7d4f', seite: 'klima.html',
  titel: 'Ein Tag Sonnenstrom',
  idee: 'Die dunkle Linie ist der Strombedarf der ganzen Stadt an einem Tag, Gelb ist der Strom von allen Solaranlagen. Bauen Sie Solar und Speicher aus und sehen Sie, wie viel vom Tag die Sonne schafft, im Juni und im Dezember.',
  notizen: [
    ['Bedienung', 'Regler oder Knöpfe für Solar und Speicher, oben Juni oder Dezember. Der Zeiger läuft durch den Tag, die Batterie rechts füllt sich mittags und leert sich abends. Maus über die Kurve zeigt die Werte zur Uhrzeit.'],
    ['Wow-Moment', 'Mit dem Ziel 2035 wächst mittags ein großer gelber Berg über den Bedarf. Erst mit mehr Speicher wird daraus Strom für den Abend. Und im Dezember bleibt die Sonne auch mit dem Ziel klein, das macht die Grenzen ehrlich sichtbar.'],
    ['Mobil', 'Diagramm volle Breite, Batterie und Kennzahlen darunter. Regler bleiben Regler, die Knöpfe sind die bequeme Abkürzung.'],
    ['Daten', 'Modell, keine Messung: Bedarf 1.000 GWh im Jahr (Fortschrittsbericht 2025, einschließlich Industrie) auf ein typisches Tagesprofil verteilt. Solar: Bestand und Zubau aus dem Marktstammdatenregister, Ertrag rund 4,6 kWh je kWp an einem Junitag und 0,75 im Dezember (zusammen etwa 1.000 kWh im Jahr). Speicher: Bestand aus dem Marktstammdatenregister, Leistung zwei Drittel der Kapazität, 90 % Wirkungsgrad. Das Ziel 2035 ist aus einem Diagramm des Fortschrittsberichts abgelesen.']
  ],
  init: function (api) {
    var K = SK.klima, ST = K.strom;
    var heuteKw = K.solar_zubau[K.solar_zubau.length - 1].bestand, heuteJahr = K.solar_zubau[K.solar_zubau.length - 1].jahr;
    var voll = K.solar_zubau.filter(function (r) { return r.jahr < heuteJahr && r.jahr >= heuteJahr - 2; });
    var tempo = voll.reduce(function (s, r) { return s + r.kw; }, 0) / voll.length / 1000;            // MWp je Jahr
    var HEUTE = Math.round(heuteKw / 1000), ZIEL = Math.round((ST.pv_ziel_2035_dach_kwp + ST.pv_ziel_2035_freiflaeche_kwp) / 1000);
    var TEMPO2035 = Math.round(HEUTE + tempo * (2035 - heuteJahr));
    var SP = K.speicher[K.speicher.length - 1], SPEICHER = Math.round(SP.kwh / 1000);
    var STROM = (K.endenergie.gwh.filter(function (s) { return s.sektor === 'Strom'; })[0] || { gwh: 1000 }).gwh;
    var MITTEL = STROM * 1000 / 8760;                                                                     // MW im Schnitt

    var JZ = {
      juni: { name: 'Ein Tag im Juni', auf: 5.25, unter: 21.25, ertrag: 4.6, bedarf: .94 },
      dez: { name: 'Ein Tag im Dezember', auf: 8.0, unter: 16.3, ertrag: .75, bedarf: 1.08 }
    };
    var z = { mwp: HEUTE, mwh: SPEICHER, jz: 'juni' };
    var DT = .25, N = 96;

    function glatt(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    var form = []; for (var i = 0; i < N; i++) { var h = (i + .5) * DT; form.push(.8 + .3 * glatt(5.5, 8, h) * (1 - glatt(19, 22.5, h)) + .07 * Math.exp(-Math.pow((h - 18.5) / 1.3, 2))); }
    var fm = d3.mean(form); form = form.map(function (v) { return v / fm; });

    function rechne() {
      var j = JZ[z.jz], bed = form.map(function (v) { return v * MITTEL * j.bedarf; });
      var sonne = []; for (var i = 0; i < N; i++) { var h = (i + .5) * DT; sonne.push(h > j.auf && h < j.unter ? Math.pow(Math.sin(Math.PI * (h - j.auf) / (j.unter - j.auf)), 1.4) : 0); }
      var ss = d3.sum(sonne) * DT; sonne = sonne.map(function (v) { return v / ss * j.ertrag * z.mwp; });   // MW
      var E = z.mwh, PM = E * .67, soc = 0, r;
      for (var tag = 0; tag < 3; tag++) {
        r = [];
        for (var i2 = 0; i2 < N; i2++) {
          var d = bed[i2], p = sonne[i2], direkt = Math.min(d, p), ueber = p - direkt, fehlt = d - direkt;
          var laden = Math.min(ueber, PM, (E - soc) / .9 / DT); soc += laden * .9 * DT;
          var entl = Math.min(fehlt, PM, soc / DT); soc -= entl * DT;
          r.push({ h: i2 * DT, bed: d, sonne: p, direkt: direkt, laden: laden, entl: entl, netz: fehlt - entl, rest: ueber - laden, soc: soc });
        }
      }
      return r;
    }

    var W = 1200, H = 540, X0 = 70, X1 = 880, Y0 = 92, Y1 = 470;
    api.szene.innerHTML =
      '<div class="leiste" id="so-jz"><span class="etikett">Tag</span></div>' +
      '<div class="leiste" style="gap:6px 14px">' +
      '<label for="so-pv" style="font-weight:600;font-size:.88rem">Solar</label><input id="so-pv" type="range" min="0" max="1000" step="5" style="width:200px;accent-color:#d39b21"><output id="so-pv-w" style="font-weight:700;min-width:70px"></output>' +
      '<button type="button" class="gf-chip klein" data-pv="' + HEUTE + '">Heute ' + HEUTE + ' MWp</button>' +
      '<button type="button" class="gf-chip klein" data-pv="' + TEMPO2035 + '">2035 im heutigen Tempo ' + TEMPO2035 + '</button>' +
      '<button type="button" class="gf-chip klein" data-pv="' + ZIEL + '">Ziel 2035: ' + ZIEL + '</button></div>' +
      '<div class="leiste" style="gap:6px 14px">' +
      '<label for="so-sp" style="font-weight:600;font-size:.88rem">Speicher</label><input id="so-sp" type="range" min="0" max="3000" step="10" style="width:200px;accent-color:#2e7d4f"><output id="so-sp-w" style="font-weight:700;min-width:70px"></output>' +
      '<button type="button" class="gf-chip klein" data-sp="' + SPEICHER + '">Heute ' + SPEICHER + ' MWh</button>' +
      '<button type="button" class="gf-chip klein" data-sp="500">500 MWh</button>' +
      '<button type="button" class="gf-chip klein" data-sp="2000">2.000 MWh</button></div>' +
      '<div style="position:relative"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Strombedarf und Sonnenstrom über einen Tag"></svg><div class="tooltip" id="so-tip"></div></div>' +
      '<div id="so-zahlen" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 24px;padding:6px 18px 96px"></div>';
    var svg = d3.select(api.szene.querySelector('svg')), tip = api.szene.querySelector('#so-tip');
    var defs = svg.append('defs');
    var himmel = defs.append('linearGradient').attr('id', 'so-himmel').attr('x1', 0).attr('x2', 1);
    var schr = defs.append('pattern').attr('id', 'so-schr').attr('width', 7).attr('height', 7).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    schr.append('rect').attr('width', 7).attr('height', 7).attr('fill', '#fbefc4'); schr.append('rect').attr('width', 2.5).attr('height', 7).attr('fill', '#f0cf6b');
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#fff');

    var x = d3.scaleLinear().domain([0, 24]).range([X0, X1]), y = d3.scaleLinear().range([Y1, Y0]);
    var himmelBand = svg.append('rect').attr('x', X0).attr('y', 22).attr('width', X1 - X0).attr('height', 46).attr('rx', 6).attr('fill', 'url(#so-himmel)');
    var gAchse = svg.append('g'), gFl = svg.append('g'), gLin = svg.append('g'), gZeiger = svg.append('g').attr('pointer-events', 'none');
    var EBENEN = [
      ['direkt', '#f2b52c', function (d) { return 0; }, function (d) { return d.direkt; }],
      ['entl', '#2e7d4f', function (d) { return d.direkt; }, function (d) { return d.direkt + d.entl; }],
      ['netz', '#d5d9dc', function (d) { return d.direkt + d.entl; }, function (d) { return d.bed; }],
      ['laden', '#9fd1a8', function (d) { return d.bed; }, function (d) { return d.bed + d.laden; }],
      ['rest', 'url(#so-schr)', function (d) { return d.bed + d.laden; }, function (d) { return d.sonne > d.bed ? d.sonne : d.bed + d.laden; }]
    ];
    var flaechen = {};
    EBENEN.forEach(function (e) { flaechen[e[0]] = gFl.append('path').attr('fill', e[1]); });
    var linieBed = gLin.append('path').attr('fill', 'none').attr('stroke', '#00263a').attr('stroke-width', 2.5);
    var linieSonne = gLin.append('path').attr('fill', 'none').attr('stroke', '#c48d2c').attr('stroke-width', 1.5);

    // Legende unter dem Diagramm
    var lg = svg.append('g').attr('transform', 'translate(' + X0 + ',' + (H - 26) + ')');
    [['#f2b52c', 'Sonne direkt'], ['#9fd1a8', 'lädt den Speicher'], ['#2e7d4f', 'aus dem Speicher'], ['url(#so-schr)', 'Überschuss, nicht genutzt'], ['#d5d9dc', 'anderer Strom (Netz)']].forEach(function (l, i) {
      var g = lg.append('g').attr('transform', 'translate(' + (i * 162) + ',0)');
      g.append('rect').attr('width', 14).attr('height', 14).attr('y', -11).attr('rx', 3).attr('fill', l[0]);
      g.append('text').attr('x', 20).attr('font-size', 12).attr('fill', '#16232b').text(l[1]);
    });
    lg.append('line').attr('x1', 812).attr('x2', 840).attr('y1', -4).attr('y2', -4).attr('stroke', '#00263a').attr('stroke-width', 2.5);
    lg.append('text').attr('x', 846).attr('font-size', 12).attr('fill', '#16232b').text('Bedarf der Stadt');

    // Batterie
    var BX = 965, BY = 140, BW = 120, BH = 260;
    var gB = svg.append('g');
    gB.append('text').attr('x', BX + BW / 2).attr('y', BY - 44).attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', 700).attr('font-family', '"Source Serif 4", Georgia, serif').attr('fill', '#00263a').text('Alle Speicher der Stadt');
    gB.append('rect').attr('x', BX + BW / 2 - 22).attr('y', BY - 14).attr('width', 44).attr('height', 16).attr('rx', 4).attr('fill', '#8f8779');
    gB.append('rect').attr('x', BX).attr('y', BY).attr('width', BW).attr('height', BH).attr('rx', 14).attr('fill', '#f4f2ee').attr('stroke', '#8f8779').attr('stroke-width', 3);
    var fuell = gB.append('rect').attr('x', BX + 7).attr('width', BW - 14).attr('rx', 8).attr('fill', '#2e7d4f');
    var bText = gB.append('text').attr('x', BX + BW / 2).attr('y', BY + BH + 30).attr('text-anchor', 'middle').attr('font-size', 22).attr('font-weight', 900).attr('font-family', '"Source Serif 4", Georgia, serif').attr('fill', '#2e7d4f');
    var bText2 = gB.append('text').attr('x', BX + BW / 2).attr('y', BY + BH + 50).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#566a74');
    var bText3 = gB.append('text').attr('x', BX + BW / 2).attr('y', BY + BH + 68).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#566a74');

    var R = [], uhr = 9;
    function zeichne(anim) {
      R = rechne();
      var j = JZ[z.jz];
      var max = Math.max(d3.max(R, function (d) { return Math.max(d.sonne, d.bed); }) * 1.08, 180);
      y.domain([0, max]).nice();
      var dauer = anim && !bewegungAus ? 600 : 0;
      gAchse.selectAll('*').remove();
      y.ticks(5).forEach(function (v) {
        gAchse.append('line').attr('x1', X0).attr('x2', X1).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', v ? '#ece8df' : '#8f8779');
        gAchse.append('text').attr('x', X0 - 8).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', '#566a74').text(NF.zahl(v) + (v === y.ticks(5).slice(-1)[0] ? ' MW' : ''));
      });
      [0, 3, 6, 9, 12, 15, 18, 21, 24].forEach(function (h) { gAchse.append('text').attr('x', x(h)).attr('y', Y1 + 18).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#566a74').text(h + ' Uhr'); });
      var pkt = [Object.assign({}, R[0], { h: 0 })].concat(R.map(function (d) { return Object.assign({}, d, { h: d.h + DT / 2 }); }), [Object.assign({}, R[N - 1], { h: 24 })]);
      EBENEN.forEach(function (e) {
        var a = d3.area().x(function (d) { return x(d.h); }).y0(function (d) { return y(e[2](d)); }).y1(function (d) { return y(e[3](d)); }).curve(d3.curveMonotoneX);
        flaechen[e[0]].transition().duration(dauer).attr('d', a(pkt));
      });
      linieBed.transition().duration(dauer).attr('d', d3.line().x(function (d) { return x(d.h); }).y(function (d) { return y(d.bed); }).curve(d3.curveMonotoneX)(pkt));
      linieSonne.transition().duration(dauer).attr('d', d3.line().x(function (d) { return x(d.h); }).y(function (d) { return y(d.sonne); }).curve(d3.curveMonotoneX)(pkt));
      // Himmel: Nacht, Dämmerung, Tag
      himmel.selectAll('stop').remove();
      [[0, '#1b2d45'], [j.auf - 1, '#1b2d45'], [j.auf + .5, '#f6c38a'], [j.auf + 2, '#bfe0f2'], [j.unter - 2, '#bfe0f2'], [j.unter - .5, '#f2a873'], [j.unter + 1, '#1b2d45'], [24, '#1b2d45']].forEach(function (s) {
        himmel.append('stop').attr('offset', Math.max(0, Math.min(1, s[0] / 24))).attr('stop-color', s[1]);
      });
      zahlen();
      zeigeUhr();
    }
    function hm(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
    function zahlen() {
      var sum = function (k) { return d3.sum(R, function (d) { return d[k]; }) * DT; };
      var bed = sum('bed'), dir = sum('direkt'), ent = sum('entl'), rest = sum('rest'), sonne = sum('sonne');
      var voll = R.find(function (d) { return z.mwh > 0 && d.soc >= z.mwh * .995; });
      var nachts = R.filter(function (d) { return d.h > 12 && d.soc <= .001 && d.bed > d.sonne; })[0];
      var html = [
        ['Sonne deckt', NF.zahl((dir + ent) / bed * 100) + ' %', 'des Tagesbedarfs von ' + NF.zahl(bed) + ' MWh'],
        ['davon über Speicher', NF.zahl(ent / bed * 100, 1) + ' %', NF.zahl(ent) + ' MWh am Abend und in der Nacht'],
        ['Überschuss nicht genutzt', NF.zahl(rest) + ' MWh', sonne ? NF.zahl(rest / sonne * 100) + ' % des Sonnenstroms, geht ins Netz oder wird abgeregelt' : 'kein Sonnenstrom'],
        ['Speicher', !z.mwh ? 'keiner' : (d3.max(R, function (d) { return d.soc; }) < .01 ? 'bleibt leer' : (voll ? 'voll um ' + hm(voll.h) : 'wird nicht voll')),
          !z.mwh ? '' : (d3.max(R, function (d) { return d.soc; }) < .01 ? 'mittags gibt es keinen Überschuss zum Laden' : (nachts ? 'leer um ' + hm(nachts.h) + ' Uhr' : 'reicht durch die Nacht'))]
      ];
      api.szene.querySelector('#so-zahlen').innerHTML = html.map(function (h) {
        return '<div style="border-top:1px solid var(--linie-stark);padding-top:8px"><div style="font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:var(--grau)">' + h[0] + '</div><div style="font-family:var(--font-display);font-weight:900;font-size:1.7rem;line-height:1.1;color:#00263a">' + h[1] + '</div><div style="font-size:.82rem;color:var(--grau)">' + h[2] + '</div></div>';
      }).join('');
      var min = z.mwh / MITTEL * 60;
      bText2.text(z.mwh ? 'reicht für ' + (min < 120 ? NF.zahl(min) + ' Minuten' : NF.zahl(min / 60, 1) + ' Stunden') : 'kein Speicher');
      bText3.text('Durchschnittsbedarf der Stadt');
    }
    function zeigeUhr() {
      if (!R.length) return;
      var i = Math.min(N - 1, Math.floor(uhr / DT)), d = R[i], j = JZ[z.jz];
      gZeiger.selectAll('*').remove();
      gZeiger.append('line').attr('x1', x(uhr)).attr('x2', x(uhr)).attr('y1', 22).attr('y2', Y1).attr('stroke', '#00263a').attr('stroke-opacity', .35).attr('stroke-dasharray', '3 3');
      var tag = uhr > j.auf && uhr < j.unter;
      if (tag) { var hoch = Math.sin(Math.PI * (uhr - j.auf) / (j.unter - j.auf)); gZeiger.append('circle').attr('cx', x(uhr)).attr('cy', 62 - hoch * 30).attr('r', 9 + hoch * 3).attr('fill', '#ffd24d').attr('stroke', '#f2a400').attr('stroke-width', 2); }
      else gZeiger.append('path').attr('d', 'M' + (x(uhr) + 4) + ',36 a10,10 0 1,0 0,18 a7,7 0 1,1 0,-18 z').attr('fill', '#f4f1e6');
      gZeiger.append('circle').attr('cx', x(uhr)).attr('cy', y(d.bed)).attr('r', 4.5).attr('fill', '#00263a');
      gZeiger.append('text').attr('x', x(uhr) + (uhr > 19 ? -8 : 8)).attr('y', Y0 - 6).attr('text-anchor', uhr > 19 ? 'end' : 'start').attr('font-size', 12.5).attr('font-weight', 700).attr('fill', '#00263a').text(hm(uhr) + ' Uhr');
      var anteil = z.mwh ? d.soc / z.mwh : 0, hF = (BH - 14) * anteil;
      fuell.attr('y', BY + 7 + (BH - 14) - hF).attr('height', hF).attr('fill', d.laden > 0 ? '#5fae6f' : '#2e7d4f');
      bText.text(z.mwh ? NF.zahl(d.soc) + ' von ' + NF.zahl(z.mwh) + ' MWh' : '0 MWh');
    }
    var laeuft = true, t0 = null;
    function lauf(now) {
      if (!laeuft) return;
      if (t0 === null) t0 = now - uhr / 24 * 16000;
      uhr = ((now - t0) / 16000 * 24) % 24;
      zeigeUhr(); requestAnimationFrame(lauf);
    }

    // Maus: Werte zur Uhrzeit, Zeiger hält an
    svg.append('rect').attr('x', X0).attr('y', Y0 - 20).attr('width', X1 - X0).attr('height', Y1 - Y0 + 20).attr('fill', 'transparent')
      .on('mousemove', function (ev) {
        laeuft = false; var p = d3.pointer(ev); uhr = Math.max(0, Math.min(23.99, x.invert(p[0]))); zeigeUhr();
        var d = R[Math.floor(uhr / DT)], r = api.szene.querySelector('svg').getBoundingClientRect();
        tip.innerHTML = '<b>' + hm(uhr) + ' Uhr</b><br>Bedarf ' + NF.zahl(d.bed) + ' MW<br>Sonne ' + NF.zahl(d.sonne) + ' MW' + (d.laden ? '<br>lädt Speicher ' + NF.zahl(d.laden) + ' MW' : '') + (d.entl ? '<br>aus dem Speicher ' + NF.zahl(d.entl) + ' MW' : '');
        var tx = ev.clientX - r.left + 14; if (tx > r.width - 220) tx -= 230;
        tip.style.left = tx + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px'; tip.classList.add('an');
      })
      .on('mouseleave', function () { tip.classList.remove('an'); if (!bewegungAus) { laeuft = true; t0 = null; requestAnimationFrame(lauf); } });

    /* Bedienung */
    var pv = api.szene.querySelector('#so-pv'), sp = api.szene.querySelector('#so-sp');
    function setzePv(v, mitText) {
      z.mwp = +v; pv.value = v; api.szene.querySelector('#so-pv-w').textContent = NF.zahl(z.mwp) + ' MWp';
      api.szene.querySelectorAll('[data-pv]').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.pv === z.mwp ? 'true' : 'false'); });
      zeichne(true);
      if (mitText) {
        if (z.mwp === ZIEL) api.sag('Mit dem Ziel für 2035 wächst mittags ein großer Überschuss. Ohne Speicher geht der meiste davon ins Netz. Schieben Sie jetzt den Speicher hoch.');
        else if (z.mwp === TEMPO2035) api.sag('Wenn es so weitergeht wie zuletzt, rund ' + NF.zahl(tempo) + ' MWp im Jahr, stehen 2035 etwa ' + TEMPO2035 + ' MWp auf den Dächern. Das Ziel sind ' + ZIEL + '.');
        else if (z.mwp === HEUTE) api.sag('Heute: ' + HEUTE + ' MWp Solar. An einem guten Junitag reicht das mittags für einen Teil des Bedarfs, nachts für nichts.');
      }
    }
    function setzeSp(v, mitText) {
      z.mwh = +v; sp.value = v; api.szene.querySelector('#so-sp-w').textContent = NF.zahl(z.mwh) + ' MWh';
      api.szene.querySelectorAll('[data-sp]').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.sp === z.mwh ? 'true' : 'false'); });
      zeichne(true);
      if (mitText && z.mwh === SPEICHER) api.sag('Heute gibt es ' + NF.zahl(SP.n) + ' Batteriespeicher mit zusammen ' + SPEICHER + ' MWh, meist im Keller neben der Solaranlage. Für die ganze Stadt reicht das ' + NF.zahl(SPEICHER / MITTEL * 60) + ' Minuten.');
    }
    pv.addEventListener('input', function () { setzePv(pv.value); });
    sp.addEventListener('input', function () { setzeSp(sp.value); });
    api.szene.querySelectorAll('[data-pv]').forEach(function (b) { b.addEventListener('click', function () { setzePv(b.dataset.pv, true); }); });
    api.szene.querySelectorAll('[data-sp]').forEach(function (b) { b.addEventListener('click', function () { setzeSp(b.dataset.sp, true); }); });
    var lj = api.szene.querySelector('#so-jz');
    Object.keys(JZ).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gf-chip'; b.textContent = JZ[k].name; b.setAttribute('aria-pressed', k === z.jz ? 'true' : 'false');
      b.addEventListener('click', function () {
        z.jz = k; lj.querySelectorAll('.gf-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); zeichne(true);
        api.sag(k === 'dez' ? 'Im Dezember scheint die Sonne kurz und flach. Selbst mit dem Ziel 2035 bleibt nur ein kleiner Hügel, und Speicher helfen kaum, weil es nichts zu speichern gibt.' : 'Im Juni ist die Sonne von morgens um fünf bis abends um neun da. Mittags gibt es dann mehr Strom, als die Stadt braucht.');
      });
      lj.appendChild(b);
    });
    setzePv(HEUTE); setzeSp(SPEICHER);
    api.sag('So sieht ein Junitag heute aus. Probieren Sie „Ziel 2035“ beim Solar.');
    if (!bewegungAus) requestAnimationFrame(lauf);
    this.pause = function () { laeuft = false; };
    this.weiter = function () { if (!bewegungAus) { laeuft = true; t0 = null; requestAnimationFrame(lauf); } };
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
