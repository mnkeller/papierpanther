/* Grafische Fassung der Seiten.

   Unter der Hauptüberschrift sitzt der Schalter „Text | Schaubild“. „Schaubild“
   blendet den Inhalt der Seite aus und zeigt stattdessen interaktive Grafiken
   mit denselben Daten. Der Schalter bleibt in beiden Fassungen sichtbar. Die
   Grafiken und ihre Daten werden erst beim ersten Umschalten geladen, damit die
   normale Seite nicht langsamer wird. Die Wahl bleibt für alle Seiten gespeichert;
   „#grafisch“ in der Adresse öffnet die Seite direkt grafisch.

   Jede Szene liegt in grafik/<name>.js und meldet sich mit GRAFIK.szene({...}).
   Sie bekommt eine Bühne mit Detailkarte und dem PapierPanther als Erzähler. */
(function () {
  'use strict';

  var SEITEN = {
    'index.html': ['start', 'orte', 'themen'],
    'themen.html': ['themen'],
    'antraege.html': ['antraege'],
    'haushalt.html': ['haushalt'],
    'hsk.html': ['sparplan'],
    'klima.html': ['klima', 'sonne'],
    'waerme.html': ['waerme'],
    'wohnen.html': ['wohnen'],
    'beteiligungen.html': ['waage'],
    'miete.html': ['miete'],
    'plaene.html': ['plaene'],
    'beteiligen.html': ['beteiligen'],
    'wege.html': ['wege', 'wege-apotheke'],
    'mobilitaet.html': ['mobilitaet']
  };
  // Zusätzliche Daten je Szene; data/wohnen.js, data/miete.js und data/mobilitaet.js laden die Seiten selbst
  var EXTRA = { mobilitaet: ['data/bezirke.js'], klima: ['data/altstadt.js'], waage: ['data/beteiligungen.js'],
    orte: ['data/unfaelle.js', 'data/baustellen.js', 'data/bezirke.js', 'vendor/pmtiles/pmtiles.js', 'vendor/protomaps/basemaps.js'],
    waerme: ['data/bezirke.js', 'data/baublock.js', 'vendor/pmtiles/pmtiles.js', 'vendor/protomaps/basemaps.js'],
    plaene: ['data/plangebiete.js', 'data/bezirke.js', 'vendor/pmtiles/pmtiles.js', 'vendor/protomaps/basemaps.js'] };
  // Szenen, die in der Datei einer anderen Szene stehen
  var DATEI = { 'wege-apotheke': 'wege' };
  var KEY = 'papierpanther-grafisch';

  var seite = location.pathname.split('/').pop() || 'index.html';
  var liste = SEITEN[seite];
  var btnLeicht = document.getElementById('btn-leicht');
  var main = document.querySelector('main');
  if (!liste || !btnLeicht || !main) return;

  var bewegungAus = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var NF = {
    zahl: function (n, d) { return Number(n).toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); },
    mio: function (euro, d) { return NF.zahl(euro / 1e6, d === undefined ? 1 : d) + ' Mio. €'; },
    teurMio: function (teur, d) { return NF.zahl(teur / 1000, d === undefined ? 1 : d) + ' Mio. €'; },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  };
  function el(tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var szenen = {};
  window.GRAFIK = { NF: NF, el: el, bewegungAus: bewegungAus, szene: function (def) { szenen[def.id] = def; } };

  /* Aussehen wie die übrigen Diagramme: weiße Fläche, Linie oben, keine farbigen Rahmen.
     Alle Klassen tragen „gf-“, damit sie nicht mit denen der Seiten kollidieren. */
  var css = document.createElement('style');
  css.textContent = [
    'body.grafisch-an main > :not(.grafik):not(.ansicht-schalter) { display: none !important; }',
    '.grafik { --tinte: #16232b; --grau: #566a74; --linie: #e4e0d8; --linie-stark: #8f8779; --papier-warm: #f1efe9; --navy-dark: #00263a;',
    '  --font-display: "Source Serif 4", "Iowan Old Style", Georgia, serif; --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;',
    '  max-width: 1280px; margin: 0 auto; padding: 1.75rem 1.5rem 1rem; color: var(--tinte); font-family: var(--font-body); font-size: 15px; line-height: 1.5; }',
    '.grafik button { font: inherit; color: inherit; }',
    '.grafik :focus-visible { outline: 3px solid #e8b730; outline-offset: 2px; }',
    '.gf-szene { margin-bottom: 3rem; }',
    '.gf-kopf h2 { font-family: var(--font-display); font-weight: 800; font-size: clamp(1.5rem, 3vw, 2.15rem); line-height: 1.15; margin: 0 0 .4rem; color: var(--navy-dark); text-wrap: balance; }',
    '.gf-kopf p { margin: 0 0 1rem; color: var(--grau); max-width: 68ch; }',
    '.gf-buehne { position: relative; background: #fff; border-top: 2px solid var(--tinte); overflow: hidden; overflow: clip; }',
    '.gf-szene-inhalt { position: relative; }',
    '.gf-szene-inhalt svg { display: block; width: 100%; height: auto; }',
    '.gf-karte { position: absolute; top: 18px; right: 18px; width: min(360px, calc(100% - 36px)); max-height: calc(100% - 36px); overflow: auto;',
    '  background: #fff; border: 1px solid var(--linie-stark); border-radius: 6px; box-shadow: 0 4px 14px rgba(22,35,43,.18); padding: 16px 18px 18px; z-index: 20;',
    '  opacity: 0; transform: translateY(10px); visibility: hidden; pointer-events: none; transition: opacity .25s, transform .3s cubic-bezier(.2,.8,.2,1), visibility 0s .3s; }',
    '.gf-karte.offen { opacity: 1; transform: none; visibility: visible; pointer-events: auto; transition: opacity .25s, transform .3s cubic-bezier(.2,.8,.2,1); }',
    '.gf-karte h3 { font-family: var(--font-display); font-size: 1.2rem; line-height: 1.25; margin: 0 28px 8px 0; color: var(--navy-dark); text-wrap: balance; }',
    '.gf-karte .zu { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border: 0; border-radius: 50%; background: var(--papier-warm); cursor: pointer; font-size: 1.1rem; line-height: 1; }',
    '.gf-karte p { margin: 0 0 10px; }',
    '.gf-karte .meta { font-size: .8rem; color: var(--grau); }',
    '.gf-karte .zahl { font-family: var(--font-display); font-weight: 900; font-size: 2rem; color: var(--farbe); line-height: 1.05; font-variant-numeric: tabular-nums; }',
    '.gf-karte dl { display: grid; grid-template-columns: auto auto; gap: 4px 14px; margin: 8px 0 12px; font-size: .88rem; }',
    '.gf-karte dt { color: var(--grau); }',
    '.gf-karte dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }',
    '.gf-karte a { color: var(--farbe); font-weight: 600; }',
    '.gf-karte .gf-quelle { font-size: .74rem; color: var(--grau); border-top: 1px solid var(--linie); padding-top: 8px; margin-top: 12px; }',
    '.gf-panther { position: absolute; left: 14px; bottom: 14px; display: flex; align-items: flex-end; gap: 8px; z-index: 15; pointer-events: none; max-width: min(430px, calc(100% - 28px)); }',
    '.gf-panther svg { width: 58px; height: 58px; flex: none; transform-origin: 50% 100%; }',
    '.gf-panther.spricht svg { animation: gf-nicken .6s ease; }',
    '.gf-blase { background: var(--navy-dark); color: #fff; font-size: .86rem; line-height: 1.4; padding: 9px 13px; border-radius: 14px 14px 14px 3px; margin-bottom: 30px; transition: opacity .6s; }',
    '.gf-blase:empty { display: none; }',
    '.gf-panther.leise .gf-blase { opacity: 0; }',
    '@keyframes gf-nicken { 0%,100% { transform: rotate(0); } 30% { transform: rotate(-8deg); } 60% { transform: rotate(5deg); } }',
    '.grafik .leiste { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--linie); background: #fff; }',
    '.grafik .etikett { font-size: .74rem; text-transform: uppercase; letter-spacing: .06em; color: var(--grau); margin-right: 4px; }',
    '.grafik .gf-chip { border: 1px solid var(--linie); background: #fff; border-radius: 999px; padding: 5px 12px; font-size: .84rem; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }',
    '.grafik .gf-chip:hover { border-color: var(--farbe); }',
    '.grafik .gf-chip[aria-pressed="true"] { background: var(--farbe); border-color: var(--farbe); color: #fff; }',
    '.grafik .gf-chip.klein { padding: 3px 9px; font-size: .76rem; }',
    '.grafik .tooltip { position: absolute; pointer-events: none; background: #fff; color: var(--tinte); border: 1px solid var(--linie-stark); box-shadow: 0 4px 14px rgba(22,35,43,.18);',
    '  font-size: .8rem; line-height: 1.4; padding: 6px 10px; border-radius: 6px; max-width: 280px; z-index: 18; opacity: 0; transition: opacity .15s; }',
    '.grafik .tooltip.an { opacity: 1; }',
    '.grafik .augenbraue { font-size: .74rem; letter-spacing: .08em; text-transform: uppercase; color: var(--farbe); font-weight: 700; }',
    '.gf-fuss { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px 28px; margin-top: 14px; font-size: .84rem; color: var(--grau); }',
    '.gf-fuss p { margin: 0; border-top: 1px solid var(--linie-stark); padding-top: 8px; }',
    '.gf-fuss strong { color: var(--tinte); }',
    '.gf-laden { padding: 3rem 0; color: var(--grau); }',
    /* Sichtbarer Fokus fuer anklickbare Teile in den Schaubildern. Das
       Schlagwort-Netz hatte den Rahmen abgeschaltet; wer mit der Tastatur
       unterwegs war, sah nicht, wo er steht (WCAG 2.4.7). */
    '.grafik svg [tabindex]:focus { outline: none; }',
    '.grafik svg [tabindex]:focus-visible { outline: 2px solid #b00e2b; outline-offset: 3px; border-radius: 4px; }',
    '.grafik svg [tabindex]:focus-visible .ring { opacity: 1; }',
    /* Schalter „Text | Schaubild“: zwei Knöpfe, einer ist gedrückt. */
    '.ansicht-schalter { display: flex; margin: .9rem 0 1.1rem; }',
    'main > .ansicht-schalter { max-width: 1100px; margin: 1rem auto 0; padding: 0 1.25rem; }',
    '.ansicht-schalter .gruppe { display: inline-flex; border: 1px solid #003e59; border-radius: 999px; overflow: hidden; background: #fff; }',
    '.ansicht-schalter button { font: inherit; font-size: .9rem; line-height: 1.2; min-height: 2.25rem; padding: .4rem 1rem; border: 0; background: transparent; color: #003e59; cursor: pointer; }',
    '.ansicht-schalter button + button { border-left: 1px solid #003e59; }',
    '.ansicht-schalter button:hover { background: #e8f0f4; }',
    '.ansicht-schalter button[aria-pressed="true"] { background: #003e59; color: #fff; font-weight: 600; }',
    '.ansicht-schalter button:focus-visible { outline: 2px solid #b00e2b; outline-offset: -3px; }',
    '.ansicht-schalter svg { width: 15px; height: 15px; vertical-align: -2px; margin-right: 6px; }',
    '@media (max-width: 640px) {',
    '  .grafik { padding: 1.25rem .9rem .5rem; }',
    '  .grafik .leiste { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }',
    '  .grafik .leiste > * { flex: none; }',
    '  .gf-fuss { grid-template-columns: minmax(0, 1fr); }',
    '  .gf-karte { position: relative; top: auto; right: auto; width: auto; max-height: none; margin: 0 12px 12px; transform: none; display: none; box-shadow: none; visibility: visible; }',
    '  .gf-karte.offen { display: block; }',
    '  .gf-panther { position: relative; left: auto; bottom: auto; padding: 0 12px 12px; max-width: none; }',
    '  .gf-blase { margin-bottom: 18px; }',
    '  .gf-panther.leise .gf-blase { opacity: 1; }',
    '}',
    '@media (prefers-reduced-motion: reduce) { .grafik *, .grafik *::before, .grafik *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }'
  ].join('\n');
  document.head.appendChild(css);

  // Der Panther der Startseite als Erzähler
  var sym = document.createElement('div');
  sym.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="gf-panther" viewBox="0 0 120 120">' +
    '<path d="M84 73c11 1 22 9 24 23-2-1-16-19-24-23z" fill="#B00E2B"/><ellipse cx="58" cy="80" rx="34" ry="29" fill="#003E59"/>' +
    '<rect x="34" y="88" width="46" height="30" rx="4" fill="#f1efe9"/><line x1="41" y1="97" x2="73" y2="97" stroke="#cfc9be" stroke-width="2.5"/>' +
    '<line x1="41" y1="104" x2="73" y2="104" stroke="#cfc9be" stroke-width="2.5"/><line x1="41" y1="111" x2="63" y2="111" stroke="#cfc9be" stroke-width="2.5"/>' +
    '<ellipse cx="34" cy="98" rx="8" ry="6" fill="#003E59"/><ellipse cx="82" cy="98" rx="8" ry="6" fill="#003E59"/><circle cx="58" cy="42" r="27" fill="#003E59"/>' +
    '<path d="M38 24 L31 9 L48 20 Z" fill="#003E59"/><path d="M78 24 L85 9 L68 20 Z" fill="#003E59"/><ellipse cx="58" cy="52" rx="14" ry="10" fill="#f1efe9"/>' +
    '<ellipse cx="46" cy="40" rx="5.5" ry="6.5" fill="#f1efe9"/><ellipse cx="70" cy="40" rx="5.5" ry="6.5" fill="#f1efe9"/>' +
    '<circle cx="47" cy="41" r="2.6" fill="#003E59"/><circle cx="69" cy="41" r="2.6" fill="#003E59"/><path d="M55 51l3 4 3-4z" fill="#B00E2B"/></symbol></svg>';
  document.body.appendChild(sym.firstChild);

  /* Schalter „Text | Schaubild“. In der Textfassung steht er direkt unter der
     Hauptüberschrift. In der grafischen Fassung ist deren Abschnitt ausgeblendet,
     dann rückt er an den Anfang von <main>. Der zweite Knopf behält die Kennung
     btn-grafisch, weil einzelne Seiten ihn von sich aus auslösen. */
  var schalter = document.createElement('div');
  schalter.className = 'ansicht-schalter';
  var gruppe = document.createElement('div');
  gruppe.className = 'gruppe'; gruppe.setAttribute('role', 'group'); gruppe.setAttribute('aria-label', 'Darstellung der Seite');
  var btnText = document.createElement('button');
  btnText.type = 'button'; btnText.id = 'btn-text'; btnText.textContent = 'Text';
  btnText.setAttribute('aria-pressed', 'true');
  var btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'btn-grafisch';
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor"/><rect x="6.5" y="4" width="3" height="11" rx="1" fill="currentColor"/><rect x="12" y="1" width="3" height="14" rx="1" fill="currentColor"/></svg>Schaubild';
  gruppe.appendChild(btnText); gruppe.appendChild(btn); schalter.appendChild(gruppe);
  var h1Seite = main.querySelector('h1');
  function setzeSchalter(oben) {
    var fokus = schalter.contains(document.activeElement) ? document.activeElement : null;
    if (oben || !h1Seite) main.insertBefore(schalter, main.firstChild);
    else h1Seite.parentNode.insertBefore(schalter, h1Seite.nextSibling);
    if (fokus) fokus.focus();
  }
  setzeSchalter(false);

  var bereich = null, geladen = null, aktiv = false, beobachter = null, offeneKarten = [];

  /* Die Karte erscheint im sichtbaren Teil der Bühne, unter der Kopfzeile und unter allem, was in der
     Szene oben klebt (data-gf-frei). Mit „neben“ steht sie auf Höhe des Elements, auf der Seite mit Platz. */
  function platziere(karte, buehne, neben) {
    karte.style.top = karte.style.left = karte.style.right = karte.style.maxHeight = '';
    if (getComputedStyle(karte).position !== 'absolute') return;
    var b = buehne.getBoundingClientRect(), w = karte.offsetWidth, rand = 18;
    var oben = 12, kopf = document.querySelector('.site-header');
    if (kopf) oben = Math.max(oben, kopf.getBoundingClientRect().bottom + 12);
    buehne.querySelectorAll('[data-gf-frei]').forEach(function (f) { var r = f.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) oben = Math.max(oben, r.bottom + 12); });
    var y = oben, links = b.width - w - rand;
    if (neben) {
      var n = neben.getBoundingClientRect();
      y = Math.max(oben, n.top);
      if (b.right - n.right >= w + 2 * rand) links = n.right - b.left + rand;
      else if (n.left - b.left >= w + 2 * rand) links = n.left - b.left - w - rand;
      else links = (n.left + n.right) / 2 - b.left > b.width / 2 ? rand : b.width - w - rand;
    }
    var hoch = Math.max(220, innerHeight - oben - 16);
    karte.style.maxHeight = Math.min(hoch, b.height - 2 * rand) + 'px';
    var h = Math.min(karte.offsetHeight, hoch);
    if (y + h > innerHeight - 16) y = Math.max(oben, innerHeight - 16 - h);
    var top = Math.max(rand, Math.min(y - b.top, b.height - h - rand));
    karte.style.top = top + 'px'; karte.style.left = Math.max(rand, links) + 'px'; karte.style.right = 'auto';
  }
  // Jeder Klick außerhalb einer offenen Karte schließt sie. Öffnet derselbe Klick eine neue, geht sie gleich wieder auf.
  document.addEventListener('click', function (ev) {
    offeneKarten.forEach(function (k) { if (k.classList.contains('offen') && !k.contains(ev.target)) k.classList.remove('offen'); });
  }, true);
  function ladeSkript(src) {
    return new Promise(function (ok, fehler) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { fehler(new Error(src)); };
      document.head.appendChild(s);
    });
  }
  function ladeAlles() {
    if (geladen) return geladen;
    var dateien = ['vendor/d3/d3.min.js', 'data/grafik.js'];
    liste.forEach(function (id) {
      (EXTRA[id] || []).forEach(function (f) { dateien.push(f); });
      var f = 'grafik/' + (DATEI[id] || id) + '.js';
      if (dateien.indexOf(f) === -1) dateien.push(f);
    });
    geladen = dateien.reduce(function (kette, f) { return kette.then(function () { return ladeSkript(f); }); }, Promise.resolve());
    return geladen;
  }

  function baue() {
    bereich.innerHTML = '';
    /* Die grafische Fassung blendet den Seiteninhalt samt Hauptueberschrift
       aus. Fuer Screenreader bleibt eine <h1>, sonst hat die Seite keine. */
    var h1alt = document.querySelector('main h1');
    var h1 = document.createElement('h1');
    h1.className = 'sr-only';
    h1.textContent = (h1alt ? h1alt.textContent.replace(/\s+/g, ' ').trim() : document.title) + ' – grafische Fassung';
    bereich.appendChild(h1);
    liste.forEach(function (id) {
      var d = szenen[id]; if (!d) return;
      var s = document.createElement('section');
      s.className = 'gf-szene'; s.style.setProperty('--farbe', d.farbe);
      s.setAttribute('aria-labelledby', 'gf-titel-' + id);
      var hinweis = (d.notizen.filter(function (n) { return n[0] === 'Bedienung'; })[0] || [])[1] || '';
      var daten = (d.notizen.filter(function (n) { return n[0] === 'Daten'; })[0] || [])[1] || '';
      s.innerHTML = '<div class="gf-kopf"><h2 id="gf-titel-' + id + '">' + d.titel + '</h2><p>' + d.idee + '</p></div>' +
        '<div class="gf-buehne"><div class="gf-szene-inhalt"></div>' +
        '<aside class="gf-karte" aria-live="polite"><button class="zu" type="button" aria-label="Karte schließen">×</button><div class="gf-karten-inhalt"></div></aside>' +
        '<div class="gf-panther"><svg viewBox="0 0 120 120" aria-hidden="true"><use href="#gf-panther"></use></svg><div class="gf-blase" aria-live="polite"></div></div></div>' +
        '<div class="gf-fuss"><p><strong>So geht’s:</strong> ' + hinweis + '</p><p><strong>Daten:</strong> ' + daten + '</p></div>';
      bereich.appendChild(s);
      var karte = s.querySelector('.gf-karte'), panther = s.querySelector('.gf-panther'), buehne = s.querySelector('.gf-buehne');
      karte.querySelector('.zu').addEventListener('click', function () { karte.classList.remove('offen'); });
      offeneKarten.push(karte);
      var api = {
        szene: s.querySelector('.gf-szene-inhalt'), buehne: buehne, farbe: d.farbe,
        // neben: das angeklickte Element; die Karte legt sich daneben statt darüber
        karte: function (html, neben) { karte.querySelector('.gf-karten-inhalt').innerHTML = html; platziere(karte, buehne, neben); karte.classList.add('offen'); },
        karteZu: function () { karte.classList.remove('offen'); },
        sag: function (text) {
          panther.querySelector('.gf-blase').innerHTML = text || '';
          panther.classList.remove('spricht', 'leise'); void panther.offsetWidth; panther.classList.add('spricht');
          // Die Sprechblase tritt nach einer Weile zurück, damit sie nichts in der Szene verdeckt
          clearTimeout(panther.leiseTimer);
          panther.leiseTimer = setTimeout(function () { panther.classList.add('leise'); }, 9000);
        }
      };
      d.sektion = s;
      try { d.init(api); } catch (fehler) { api.szene.innerHTML = '<p class="gf-laden">Diese Grafik ließ sich nicht aufbauen.</p>'; if (window.console) console.error(fehler); }
    });
    // Szenen außerhalb des Bildes halten an
    if ('IntersectionObserver' in window) {
      beobachter = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          var d = liste.map(function (id) { return szenen[id]; }).filter(function (x) { return x && x.sektion === e.target; })[0];
          if (!d || !aktiv) return;
          if (e.isIntersecting) { if (d.angehalten && d.weiter) d.weiter(); d.angehalten = false; }
          else { if (d.pause) d.pause(); d.angehalten = true; }
        });
      }, { rootMargin: '100px' });
      liste.forEach(function (id) { if (szenen[id] && szenen[id].sektion) beobachter.observe(szenen[id].sektion); });
    }
  }

  function an(speichern) {
    if (aktiv) return;
    aktiv = true;
    btn.setAttribute('aria-pressed', 'true'); btnText.setAttribute('aria-pressed', 'false');
    document.body.classList.add('grafisch-an');
    setzeSchalter(true);
    if (speichern) try { localStorage.setItem(KEY, '1'); } catch (e) { /* Storage kann gesperrt sein */ }
    if (!bereich) {
      bereich = document.createElement('div'); bereich.className = 'grafik'; bereich.id = 'grafik';
      bereich.innerHTML = '<p class="gf-laden">Grafiken werden geladen …</p>';
      main.insertBefore(bereich, schalter.nextSibling);
      ladeAlles().then(baue, function () { bereich.innerHTML = '<p class="gf-laden">Die Grafiken ließen sich nicht laden. Bitte die Seite neu laden.</p>'; });
    } else {
      bereich.hidden = false;
      liste.forEach(function (id) { var d = szenen[id]; if (d && d.angehalten && d.weiter) { d.weiter(); d.angehalten = false; } });
    }
  }
  function aus(speichern) {
    if (!aktiv) return;
    aktiv = false;
    btn.setAttribute('aria-pressed', 'false'); btnText.setAttribute('aria-pressed', 'true');
    document.body.classList.remove('grafisch-an');
    setzeSchalter(false);
    if (bereich) bereich.hidden = true;
    liste.forEach(function (id) { var d = szenen[id]; if (d && d.pause) { d.pause(); d.angehalten = true; } });
    if (speichern) try { localStorage.setItem(KEY, '0'); } catch (e) { /* Storage kann gesperrt sein */ }
  }
  btn.addEventListener('click', function () { if (!aktiv) { an(true); window.scrollTo(0, 0); } });
  btnText.addEventListener('click', function () { if (aktiv) { aus(true); window.scrollTo(0, 0); } });
  // Einfache Sprache gibt es nur als Text: Wer sie wählt, verlässt die grafische Fassung
  btnLeicht.addEventListener('click', function () { if (aktiv) aus(true); });

  var gespeichert = false;
  try { gespeichert = localStorage.getItem(KEY) === '1'; } catch (e) { /* Storage kann gesperrt sein */ }
  if (location.hash === '#grafisch' || /[?&]ansicht=grafisch\b/.test(location.search)) an(true);
  else if (gespeichert && btnLeicht.getAttribute('aria-pressed') !== 'true') an(false);
})();
