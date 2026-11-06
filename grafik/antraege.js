/* Anträge: die Rathaus-Zeitung. Schlagzeilen werden gesetzt, Stempel knallen aufs Papier. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'antraege', reiter: 'Anträge', form: 'Animierte Zeitung', farbe: '#5b4b8a', seite: 'antraege.html',
  titel: 'Was die Fraktionen beantragen',
  idee: 'Alle Anträge der Fraktionen als Zeitung: Jede Fraktion hat ihre Spalte, der neueste Antrag ist der Aufmacher, der Stand kommt als Stempel. Unten liegen die Anträge, die nie auf eine Tagesordnung kamen.',
  notizen: [
    ['Bedienung', 'Schlagzeile anklicken: Der Artikel klappt als Karte auf, der Stempel knallt drauf. „Neu setzen“ spielt den Aufbau noch einmal ab.'],
    ['Wow-Moment', 'Beim Laden wird die Titelseite Zeile für Zeile gesetzt. Die Rubrik „Liegt noch“ wirkt vergilbt und zählt die Tage, die ein Antrag schon wartet.'],
    ['Mobil', 'Die Spalten stehen untereinander wie in einer Zeitungs-App, der Laufband-Ticker bleibt.'],
    ['Daten', 'data/antraege.json: Klartext-Titel und -Text, Datum und Stand je Antrag. Gezeigt werden je Fraktion die sechs neuesten.']
  ],
  init: function (api) {
    var A = SK.antraege, S = A.statistik;
    var heute = new Date(2026, 10, 6);
    var css = document.createElement('style');
    css.textContent = [
      '.zt{background:#fcfbf6;padding:22px 26px 90px;font-family:var(--font-display);color:#1b1b1b;position:relative}',
      '.zt-kopf{text-align:center;border-bottom:3px double #1b1b1b;padding-bottom:8px}',
      '.zt-zeile{display:flex;justify-content:space-between;font-family:var(--font-body);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #1b1b1b;padding:4px 0;gap:12px;flex-wrap:wrap}',
      '.zt-titel{font-size:clamp(2.2rem,6vw,4.4rem);font-weight:900;letter-spacing:-.02em;line-height:1;margin:10px 0 4px}',
      '.zt-unter{font-style:italic;font-weight:700;color:#5b4b8a}',
      '.ticker{overflow:hidden;white-space:nowrap;background:#5b4b8a;color:#fff;font-family:var(--font-body);font-size:.84rem;padding:6px 0;margin:10px -26px 18px}',
      '.ticker span{display:inline-block;padding-left:100%;animation:lauf 70s linear infinite}',
      '.ticker b{color:#ffd86b;margin:0 6px 0 22px}',
      '@keyframes lauf{to{transform:translateX(-100%)}}',
      '.zt-auf{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:22px;border-bottom:1px solid #1b1b1b;padding-bottom:16px;margin-bottom:16px}',
      '.zt-auf h2{font-size:clamp(1.5rem,3vw,2.3rem);line-height:1.08;margin:4px 0 8px;font-weight:900;cursor:pointer}',
      '.zt-auf p{font-family:var(--font-display);font-size:1.02rem;line-height:1.5;margin:0;columns:2;column-gap:20px}',
      '.zt-zahlen{border-left:1px solid #1b1b1b;padding-left:20px;display:grid;gap:10px;align-content:start}',
      '.zt-zahlen div{font-family:var(--font-body);font-size:.85rem}',
      '.zt-zahlen strong{display:block;font-family:var(--font-display);font-size:2.4rem;line-height:1;font-weight:900;color:#5b4b8a;font-variant-numeric:tabular-nums}',
      '.zt-spalten{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px 0}',
      '.zt-sp{padding:0 14px 14px;border-left:1px solid #cfc9bb;min-width:0}',
      '.zt-sp:nth-child(5n+1){border-left:0;padding-left:0}',
      '.zt-ressort{font-family:var(--font-body);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;border-top:4px solid #1b1b1b;padding-top:5px;margin-bottom:8px;display:flex;justify-content:space-between}',
      '.zt-art{border-bottom:1px solid #e1dccf;padding:7px 0 9px;cursor:pointer;position:relative}',
      '.zt-art:hover h3{color:#5b4b8a}',
      '.zt-art h3{font-size:1.02rem;line-height:1.22;margin:0 0 3px;font-weight:700}',
      '.zt-art:first-of-type h3{font-size:1.25rem;font-weight:900}',
      '.zt-art small{font-family:var(--font-body);font-size:.72rem;color:#6b6b6b}',
      '.zt-art .mini{font-family:var(--font-body);font-size:.62rem;font-weight:800;letter-spacing:.06em;border:1.5px solid currentColor;padding:0 4px;border-radius:2px;margin-left:6px}',
      '.setz{visibility:hidden}',
      '.zt-liegt{margin-top:18px;padding:16px 18px;background:#efe6cc;background-image:radial-gradient(rgba(120,90,40,.12) 1px,transparent 1.2px);background-size:7px 7px;filter:sepia(.25)}',
      '.zt-liegt h2{font-size:1.4rem;margin:0 0 4px;font-weight:900}',
      '.zt-liegt .reihe{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:10px}',
      '.zt-liegt .zt-art{border-bottom:0}',
      '.zt-liegt .tage{font-family:var(--font-body);font-weight:800;color:#8a2b1a;font-size:.8rem}',
      '.stempel{display:inline-block;font-family:var(--font-body);font-weight:900;letter-spacing:.1em;font-size:1.05rem;padding:6px 12px;border:3px solid currentColor;border-radius:4px;transform:rotate(-7deg);margin:4px 0 12px;opacity:.9}',
      '.stempel.knall{animation:knall .45s cubic-bezier(.2,1.6,.4,1) both}',
      '@keyframes knall{0%{transform:scale(2.6) rotate(-16deg);opacity:0}60%{opacity:1}100%{transform:scale(1) rotate(-7deg);opacity:.9}}',
      '.zt-knopf{font-family:var(--font-body);margin-top:8px}',
      '@media (max-width:900px){.zt-spalten{grid-template-columns:repeat(2,minmax(0,1fr))}.zt-sp:nth-child(n){padding-left:14px;border-left:1px solid #cfc9bb}.zt-sp:nth-child(2n+1){border-left:0;padding-left:0}.zt-auf{grid-template-columns:minmax(0,1fr)}.zt-zahlen{border-left:0;padding-left:0;grid-template-columns:repeat(3,minmax(0,1fr))}.zt-liegt .reihe{grid-template-columns:minmax(0,1fr)}}',
      '@media (max-width:640px){.zt{padding:16px 14px 20px}.ticker{margin:10px -14px 14px}.zt-spalten{grid-template-columns:minmax(0,1fr)}.zt-sp{border-left:0;padding:0}.zt-auf p{columns:1}}'
    ].join('\n');
    document.head.appendChild(css);

    var STEMPEL = {
      'Beschlossen': ['BESCHLOSSEN', '#2e7d4f'], 'Abgelehnt': ['ABGELEHNT', '#b00e2b'], 'Teilweise beschlossen': ['TEILWEISE', '#2e7d4f'],
      'Entscheidung angesetzt': ['ENTSCHEIDUNG ANGESETZT', '#a86b00'], 'Wird noch beraten': ['IN BERATUNG', '#a86b00'],
      'Nur besprochen, nichts entschieden': ['BESPROCHEN', '#3d6f86'], 'Bekanntgabe': ['BEKANNTGABE', '#003e59'],
      'Noch auf keiner Tagesordnung': ['LIEGT NOCH', '#8a2b1a'], 'In Beratung': ['IN BERATUNG', '#a86b00']
    };
    function stempel(st) { return STEMPEL[st] || [String(st).toUpperCase(), '#3d6f86']; }
    function tage(datum) { var d = new Date(datum); return Math.round((heute - d) / 864e5); }

    var alle = [];
    A.parteien.forEach(function (p) { p.artikel.forEach(function (a) { alle.push(Object.assign({ partei: p.name }, a)); }); });
    alle.sort(function (a, b) { return b.datum < a.datum ? -1 : 1; });
    var auf = alle.filter(function (a) { return a.x; })[0] || alle[0];
    var liegen = [];
    A.parteien.forEach(function (p) { p.liegen.forEach(function (a) { liegen.push(Object.assign({ partei: p.name }, a)); }); });
    liegen.sort(function (a, b) { return a.datum < b.datum ? -1 : 1; }); liegen = liegen.slice(0, 3);
    var spalten = A.parteien.filter(function (p) { return p.n >= 20; }).sort(function (a, b) { return b.n - a.n; });

    var verzeichnis = [];
    function artikelHtml(a, ohneKopf) {
      var i = verzeichnis.push(a) - 1, s = stempel(a.stand);
      return '<div class="zt-art" data-i="' + i + '">' + (ohneKopf ? '' : '') + '<h3 class="setz">' + NF.esc(a.t) + '</h3>' +
        '<small>' + a.d + '<span class="mini" style="color:' + s[1] + '">' + s[0] + '</span></small></div>';
    }

    var html = '<div class="zt">' +
      '<div class="zt-kopf"><div class="zt-zeile"><span>Ingolstadt, ' + heute.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</span><span>Wahlperiode 2026–2032</span><span>' + S.gesamt + ' Anträge</span></div>' +
      '<div class="zt-titel">Die Rathaus-Zeitung</div><div class="zt-unter">Was die Fraktionen im Stadtrat beantragen</div><button class="gf-chip zt-knopf" type="button" id="zt-neu">Titelseite neu setzen</button></div>' +
      '<div class="ticker" aria-hidden="true"><span>' + alle.slice(0, 14).map(function (a) { return '<b>' + NF.esc(a.partei) + '</b>' + NF.esc(a.t); }).join('') + '</span></div>' +
      '<div class="zt-auf"><div><small style="font-family:var(--font-body);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:#5b4b8a;font-weight:700">Aufmacher · ' + NF.esc(auf.partei) + ' · ' + auf.d + '</small>' +
      '<h2 class="setz" data-auf="1">' + NF.esc(auf.t) + '</h2><p>' + NF.esc(auf.x) + '</p></div>' +
      '<div class="zt-zahlen"><div><strong data-zahl="' + S.gesamt + '">0</strong>Anträge in dieser Wahlperiode</div>' +
      '<div><strong data-zahl="' + S.in_beratung + '">0</strong>davon schon in einer Sitzung</div>' +
      '<div><strong data-zahl="' + S.nur_eingereicht + '" style="color:#8a2b1a">0</strong>noch auf keiner Tagesordnung</div></div></div>' +
      '<div class="zt-spalten">' + spalten.map(function (p) {
        return '<div class="zt-sp"><div class="zt-ressort"><span>' + NF.esc(p.name) + '</span><span>' + p.n + '</span></div>' + p.artikel.slice(0, 4).map(function (a) { return artikelHtml(Object.assign({ partei: p.name }, a)); }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="zt-liegt"><h2>Liegt noch</h2><div style="font-family:var(--font-body);font-size:.86rem">' + S.nur_eingereicht + ' Anträge wurden eingereicht, aber noch in keiner Sitzung behandelt. Die drei ältesten:</div><div class="reihe">' +
      liegen.map(function (a) { var i = verzeichnis.push(a) - 1; return '<div class="zt-art" data-i="' + i + '"><div class="tage">wartet seit ' + NF.zahl(tage(a.datum)) + ' Tagen</div><h3 class="setz">' + NF.esc(a.t) + '</h3><small>' + NF.esc(a.partei) + ' · eingereicht ' + a.d + '</small></div>'; }).join('') +
      '</div></div></div>';
    api.szene.innerHTML = html;
    var zt = api.szene.querySelector('.zt');
    zt.addEventListener('click', function (ev) {
      var h = ev.target.closest('[data-auf]');
      var a = h ? auf : (ev.target.closest('.zt-art') ? verzeichnis[+ev.target.closest('.zt-art').dataset.i] : null);
      if (!a) return;
      var s = stempel(a.stand);
      api.karte('<div class="meta">' + NF.esc(a.partei) + ' · ' + a.d + '</div><h3>' + NF.esc(a.t) + '</h3>' +
        '<div class="stempel knall" style="color:' + s[1] + '">' + s[0] + '</div><p>' + NF.esc(a.x || 'Für diesen Antrag gibt es noch keinen Klartext.') + '</p>' +
        (a.url ? '<p><a href="' + a.url + '" target="_blank" rel="noopener">Antrag im Ratsinfoportal</a></p>' : '') +
        '<p class="gf-quelle">Klartext: PapierPanther. Verbindlich ist das Originaldokument.</p>');
    });

    function setzen() {
      var zeilen = Array.prototype.slice.call(zt.querySelectorAll('.setz'));
      zeilen.forEach(function (z) { z.dataset.voll = z.dataset.voll || z.textContent; z.style.visibility = 'hidden'; });
      zeilen.forEach(function (z, k) {
        setTimeout(function () {
          var voll = z.dataset.voll, n = 0; z.textContent = ''; z.style.visibility = 'visible';
          if (bewegungAus) { z.textContent = voll; return; }
          var t = setInterval(function () { n += 3; z.textContent = voll.slice(0, n); if (n >= voll.length) clearInterval(t); }, 16);
        }, bewegungAus ? 0 : (z.dataset.auf ? 0 : 250 + k * 70));
      });
      zt.querySelectorAll('[data-zahl]').forEach(function (z) {
        var ziel = +z.dataset.zahl, t0 = performance.now();
        (function lauf(now) { var k = Math.min(1, (now - t0) / 1400); z.textContent = NF.zahl(Math.round(ziel * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(lauf); })(t0);
      });
    }
    zt.querySelector('#zt-neu').addEventListener('click', function (ev) { ev.stopPropagation(); setzen(); });
    setzen();
    api.sag(S.nur_eingereicht + ' von ' + S.gesamt + ' Anträgen kamen noch auf keine Tagesordnung. Klicken Sie eine Schlagzeile an.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
