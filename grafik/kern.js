/* Grafische Fassung der Seiten.

   Neben „Leichte Sprache“ sitzt ein Knopf „Grafisch“. Er blendet den Inhalt der
   Seite aus und zeigt stattdessen interaktive Grafiken mit denselben Daten. Die
   Grafiken und ihre Daten werden erst beim ersten Umschalten geladen, damit die
   normale Seite nicht langsamer wird. Die Wahl bleibt für alle Seiten gespeichert;
   „#grafisch“ in der Adresse öffnet die Seite direkt grafisch.

   Jede Szene liegt in grafik/<name>.js und meldet sich mit GRAFIK.szene({...}).
   Sie bekommt eine Bühne mit Detailkarte und dem PapierPanther als Erzähler. */
(function () {
  'use strict';

  var SEITEN = {
    'index.html': ['start', 'themen'],
    'themen.html': ['themen'],
    'antraege.html': ['antraege'],
    'haushalt.html': ['haushalt'],
    'hsk.html': ['sparplan'],
    'klima.html': ['klima', 'sonne'],
    'wohnen.html': ['wohnen'],
    'miete.html': ['miete'],
    'beteiligen.html': ['beteiligen']
  };
  // Zusätzliche Daten je Szene; data/wohnen.js und data/miete.js laden die Seiten selbst
  var EXTRA = { klima: ['data/altstadt.js'] };
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
    'body.grafisch-an main > :not(.grafik) { display: none !important; }',
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
    '.btn-grafisch svg { width: 15px; height: 15px; vertical-align: -2px; margin-right: 5px; }',
    '@media (max-width: 760px) { .btn-grafisch .gf-wort { display: none; } .btn-grafisch svg { margin-right: 0; } }',
    // Auf schmalen Handys passt die Kopfzeile mit dem zusätzlichen Knopf sonst nicht ganz
    '@media (max-width: 420px) {',
    '  .site-header .container { gap: .3rem !important; }',
    '  .site-header .wordmark { font-size: .9rem !important; }',
    '  .site-header .btn-leicht { padding: .26rem .5rem !important; }',
    '}',
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
    '<path d="M85 106 C100 106 107 95 104 79 L109 77 C114 97 104 113 85 112 Z" fill="#B00E2B"/>' +
    '<path d="M30 118 L27 93 L39 64 H77 L89 93 L86 118 Z" fill="#003E59"/>' +
    '<path d="M34 88 H72 L80 96 V118 H34 Z" fill="#f1efe9"/>' +
    '<path d="M72 88 V96 H80 Z" fill="#B00E2B"/>' +
    '<line x1="41" y1="102" x2="73" y2="102" stroke="#cfc9be" stroke-width="2.5"/>' +
    '<line x1="41" y1="109" x2="65" y2="109" stroke="#cfc9be" stroke-width="2.5"/>' +
    '<path d="M26 97 L34 91 L42 95 L40 103 L29 103 Z" fill="#003E59"/>' +
    '<path d="M90 97 L82 91 L74 95 L76 103 L87 103 Z" fill="#003E59"/>' +
    '<g transform="translate(16 -3.5) scale(2.1)"><path d="M7.5 5.5 L15 12 H25 L32.5 5.5 L31.5 19.5 L27.5 29 L20 34.5 L12.5 29 L8.5 19.5 Z" fill="#003E59"/><path d="M10 9.2 L13.2 12.4 L10.6 15 Z M30 9.2 L26.8 12.4 L29.4 15 Z" fill="#f1efe9" opacity=".4"/><path d="M11.8 17.6 L18.2 19.6 L13.4 20.8 Z M28.2 17.6 L21.8 19.6 L26.6 20.8 Z" fill="#f1efe9"/><path d="M18.3 24.2 H21.7 L20 26.4 Z" fill="#B00E2B"/><path d="M20 26.4 V28.6 M17.2 29.4 L20 28.6 L22.8 29.4" stroke="#f1efe9" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
    '</symbol><symbol id="panther-kopf" viewBox="0 0 40 40">' +
    '<path d="M7.5 5.5 L15 12 H25 L32.5 5.5 L31.5 19.5 L27.5 29 L20 34.5 L12.5 29 L8.5 19.5 Z" fill="#003E59"/><path d="M10 9.2 L13.2 12.4 L10.6 15 Z M30 9.2 L26.8 12.4 L29.4 15 Z" fill="#f1efe9" opacity=".4"/><path d="M11.8 17.6 L18.2 19.6 L13.4 20.8 Z M28.2 17.6 L21.8 19.6 L26.6 20.8 Z" fill="#f1efe9"/><path d="M18.3 24.2 H21.7 L20 26.4 Z" fill="#B00E2B"/><path d="M20 26.4 V28.6 M17.2 29.4 L20 28.6 L22.8 29.4" stroke="#f1efe9" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</symbol></svg>';
  document.body.appendChild(sym.firstChild);

  /* Knopf in der Kopfzeile, direkt vor „Leichte Sprache“ */
  var btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'btn-grafisch'; btn.className = 'btn-leicht btn-grafisch';
  btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Grafische Fassung');
  btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor"/><rect x="6.5" y="4" width="3" height="11" rx="1" fill="currentColor"/><rect x="12" y="1" width="3" height="14" rx="1" fill="currentColor"/></svg><span class="gf-wort">Grafisch</span>';
  btnLeicht.parentNode.insertBefore(btn, btnLeicht);

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
    liste.forEach(function (id) { (EXTRA[id] || []).forEach(function (f) { dateien.push(f); }); dateien.push('grafik/' + id + '.js'); });
    geladen = dateien.reduce(function (kette, f) { return kette.then(function () { return ladeSkript(f); }); }, Promise.resolve());
    return geladen;
  }

  function baue() {
    bereich.innerHTML = '';
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
    btn.setAttribute('aria-pressed', 'true');
    document.body.classList.add('grafisch-an');
    if (speichern) try { localStorage.setItem(KEY, '1'); } catch (e) { /* Storage kann gesperrt sein */ }
    if (!bereich) {
      bereich = document.createElement('div'); bereich.className = 'grafik'; bereich.id = 'grafik';
      bereich.innerHTML = '<p class="gf-laden">Grafiken werden geladen …</p>';
      main.insertBefore(bereich, main.firstChild);
      ladeAlles().then(baue, function () { bereich.innerHTML = '<p class="gf-laden">Die Grafiken ließen sich nicht laden. Bitte die Seite neu laden.</p>'; });
    } else {
      bereich.hidden = false;
      liste.forEach(function (id) { var d = szenen[id]; if (d && d.angehalten && d.weiter) { d.weiter(); d.angehalten = false; } });
    }
  }
  function aus(speichern) {
    if (!aktiv) return;
    aktiv = false;
    btn.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('grafisch-an');
    if (bereich) bereich.hidden = true;
    liste.forEach(function (id) { var d = szenen[id]; if (d && d.pause) { d.pause(); d.angehalten = true; } });
    if (speichern) try { localStorage.setItem(KEY, '0'); } catch (e) { /* Storage kann gesperrt sein */ }
  }
  btn.addEventListener('click', function () { if (aktiv) aus(true); else { an(true); window.scrollTo(0, 0); } });
  // Leichte Sprache gibt es nur als Text: Wer sie wählt, verlässt die grafische Fassung
  btnLeicht.addEventListener('click', function () { if (aktiv) aus(true); });

  var gespeichert = false;
  try { gespeichert = localStorage.getItem(KEY) === '1'; } catch (e) { /* Storage kann gesperrt sein */ }
  if (location.hash === '#grafisch' || /[?&]ansicht=grafisch\b/.test(location.search)) an(true);
  else if (gespeichert && btnLeicht.getAttribute('aria-pressed') !== 'true') an(false);
})();
