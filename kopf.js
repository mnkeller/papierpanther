/* Gemeinsame Kopfzeile fuer alle Seiten.
   Ersetzt die bisherigen Einzel-Links bzw. "Zurueck"-Knoepfe durch eine
   einheitliche Navigation: Start · Themen ▾ · So funktioniert's, auf dem
   Handy als ein einziges "Menue" (Nutzerfeedback 2026-10-22). Der Leichte-Sprache-Knopf der jeweiligen
   Seite bleibt, wo er ist; die Beschriftungen hier folgen seinem Zustand. */
(function () {
  'use strict';

  var THEMEN = [
    ['antraege.html', 'Anträge der Parteien', 'Was die Fraktionen beantragen', 'Anträge der Parteien', 'Was die Parteien wollen'],
    ['haushalt.html', 'Haushalt', 'Woher das Geld kommt und wohin es geht', 'Das Geld der Stadt', 'Wie viel Geld die Stadt hat'],
    ['hsk.html', 'Sparplan', 'Wo die Stadt sparen will', 'Spar-Plan', 'Wo die Stadt sparen will'],
    ['klima.html', 'Klima', 'Wetter, Solarstrom, Ladepunkte', 'Klima', 'Wetter und Strom aus Sonne'],
    ['wohnen.html', 'Wohnen', 'Mieten oder besitzen, Eigentümer, Leerstand', 'Wohnen', 'Wem gehören die Wohnungen?'],
    ['miete.html', 'Miete', 'Mietspiegel-Rechner, Mietpreisbremse', 'Miete', 'Wie viel Miete ist üblich?'],
    ['beteiligen.html', 'Beteiligen', 'Wie Sie mitreden können', 'Mitmachen', 'So können Sie mitreden']
  ];
  var TEXT = {
    start: ['Start', 'Start'],
    themen: ['Themen', 'Themen'],
    wie: ['So funktioniert’s', 'So geht diese Seite'],
    menue: ['Menü', 'Menü']
  };

  var kopf = document.querySelector('.site-header .container');
  if (!kopf) return;
  var seite = (location.pathname.split('/').pop() || 'index.html');
  var istStart = seite === 'index.html' || seite === '';

  var css = document.createElement('style');
  css.textContent = [
    '.kopf-nav { display: flex; align-items: center; gap: 1.1rem; margin-left: auto; font-size: .88rem; }',
    '.kopf-nav > a, .kopf-nav summary { color: #dce9ef; text-decoration: none; cursor: pointer; }',
    '.kopf-nav > a:hover, .kopf-nav summary:hover { color: #fff; text-decoration: underline; }',
    '.kopf-nav a[aria-current="page"] { color: #fff; font-weight: 600; }',
    '.kopf-nav details { position: relative; }',
    '.kopf-nav summary { list-style: none; }',
    '.kopf-nav summary::-webkit-details-marker { display: none; }',
    '.kopf-nav summary::after { content: " ▾"; font-size: .8em; }',
    '.kopf-panel { position: absolute; right: 0; top: calc(100% + .7rem); background: #fff; color: var(--text);',
    '  border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.18); padding: .5rem; min-width: 300px; z-index: 60; }',
    '.kopf-panel a { display: block; padding: .55rem .7rem; border-radius: 7px; text-decoration: none; color: var(--text); }',
    '.kopf-panel a:hover, .kopf-panel a:focus-visible { background: var(--bg-warm); }',
    '.kopf-panel a strong { display: block; font-size: .95rem; color: var(--primary-dark); }',
    '.kopf-panel a span { display: block; font-size: .8rem; color: var(--text-faint); }',
    '.kopf-panel a[aria-current="page"] strong { color: var(--accent); }',
    '.kopf-panel hr { border: 0; border-top: 1px solid var(--border); margin: .35rem .4rem; }',
    '.kopf-menue { display: none; margin-left: auto; }',
    '.site-header .btn-leicht { order: 5; }',
    '@media (max-width: 760px) {',
    '  .site-header { position: relative !important; padding: .6rem 0 !important; }',
    '  .site-header .container { flex-wrap: nowrap !important; gap: .45rem !important; padding: 0 .9rem !important; }',
    '  .site-header .logo-mark { width: 28px; height: 28px; }',
    '  .site-header .wordmark, .site-header .brand { font-size: .98rem !important; white-space: nowrap; }',
    '  .site-header .wordmark span, .site-header .brand span { display: none; }',
    '  .kopf-nav { display: none; }',
    '  .kopf-menue { display: block; position: static; }',
    '  .kopf-menue summary { list-style: none; color: #fff; cursor: pointer; font-size: .9rem;',
    '    border: 1px solid rgba(255,255,255,.45); border-radius: 999px; padding: .26rem .65rem; font-size: .78rem !important; }',
    '  .kopf-menue summary::-webkit-details-marker { display: none; }',
    '  .kopf-menue .kopf-panel { min-width: 0; left: .75rem; right: .75rem; top: calc(100% + .3rem); }',
    '  .site-header .btn-leicht { font-size: .76rem !important; padding: .26rem .6rem !important; white-space: nowrap; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);


  function leicht() {
    var b = document.getElementById('btn-leicht');
    return !!(b && b.getAttribute('aria-pressed') === 'true');
  }
  function t(k) { return TEXT[k][leicht() ? 1 : 0]; }

  function panel() {
    var p = document.createElement('div');
    p.className = 'kopf-panel';
    var ue = document.createElement('a');
    ue.href = 'themen.html';
    if (seite === 'themen.html') ue.setAttribute('aria-current', 'page');
    var us = document.createElement('strong'); us.textContent = leicht() ? 'Alle Themen' : 'Alle Themen im Überblick';
    ue.appendChild(us);
    p.appendChild(ue);
    p.appendChild(document.createElement('hr'));
    THEMEN.forEach(function (th) {
      var a = document.createElement('a');
      a.href = th[0];
      if (th[0] === seite) a.setAttribute('aria-current', 'page');
      var s = document.createElement('strong'); s.textContent = leicht() ? th[3] : th[1];
      var u = document.createElement('span'); u.textContent = leicht() ? th[4] : th[2];
      a.appendChild(s); a.appendChild(u);
      p.appendChild(a);
    });
    return p;
  }

  var nav = document.createElement('nav');
  nav.className = 'kopf-nav';
  nav.setAttribute('aria-label', 'Hauptnavigation');
  var menue = document.createElement('details');
  menue.className = 'kopf-menue';

  function zeichne() {
    nav.textContent = '';
    var start = document.createElement('a');
    start.href = 'index.html'; start.textContent = t('start');
    if (istStart) start.setAttribute('aria-current', 'page');
    nav.appendChild(start);
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = t('themen');
    d.appendChild(s); d.appendChild(panel());
    nav.appendChild(d);
    var wie = document.createElement('a');
    wie.href = 'index.html#transparenz'; wie.textContent = t('wie');
    nav.appendChild(wie);

    menue.textContent = '';
    var ms = document.createElement('summary'); ms.textContent = t('menue');
    menue.appendChild(ms);
    var mp = panel();
    var hr = document.createElement('hr'); mp.insertBefore(hr, mp.firstChild);
    var ms1 = document.createElement('a'); ms1.href = 'index.html';
    ms1.innerHTML = '<strong></strong>'; ms1.firstChild.textContent = t('start');
    mp.insertBefore(ms1, hr);
    var hr2 = document.createElement('hr'); mp.appendChild(hr2);
    var mw = document.createElement('a'); mw.href = 'index.html#transparenz';
    mw.innerHTML = '<strong></strong>'; mw.firstChild.textContent = t('wie');
    mp.appendChild(mw);
    menue.appendChild(mp);
  }
  zeichne();

  var btn = document.getElementById('btn-leicht');
  if (btn) {
    kopf.insertBefore(nav, btn);
    kopf.insertBefore(menue, btn);
    new MutationObserver(zeichne).observe(btn, { attributes: true, attributeFilter: ['aria-pressed'] });
  } else {
    kopf.appendChild(nav);
    kopf.appendChild(menue);
  }

  /* KI-Hinweis ueber der Fusszeile der Themenseiten (Transparenzpflicht AI Act). */
  var fuss = document.querySelector('.site-footer');
  var istThema = THEMEN.some(function (th) { return th[0] === seite; });
  if (fuss && istThema) {
    var hinweis = document.createElement('p');
    hinweis.className = 'ki-hinweis';
    hinweis.style.cssText = 'max-width: 860px; margin: 2rem auto 0; padding: 0 1.5rem; box-sizing: border-box; font-size: .85rem; color: var(--text-faint);';
    var ki = ['<strong>Hinweis:</strong> Die Texte entstehen mit KI-Unterstützung. Ich sehe sie vor der Veröffentlichung durch, trotzdem können Fehler vorkommen. Maßgeblich sind die verlinkten Originalquellen. Fehler dürfen Sie mir gern melden, siehe <a href="impressum.html">Impressum</a>.',
      '<strong>Hinweis:</strong> Die Texte schreibt eine KI mit. Ich lese sie vor dem Veröffentlichen durch. Trotzdem kann ein Fehler drin sein. Richtig ist immer die Original-Quelle. Haben Sie einen Fehler gefunden? Schreiben Sie mir. Die Adresse steht im <a href="impressum.html">Impressum</a>.'];
    var setzeHinweis = function () { hinweis.innerHTML = ki[leicht() ? 1 : 0]; };
    setzeHinweis();
    fuss.parentNode.insertBefore(hinweis, fuss);
    if (btn) new MutationObserver(setzeHinweis).observe(btn, { attributes: true, attributeFilter: ['aria-pressed'] });
  }

  /* Aufklapper schliessen bei Klick daneben oder Escape */
  document.addEventListener('click', function (ev) {
    document.querySelectorAll('.site-header details[open]').forEach(function (d) {
      if (!d.contains(ev.target)) d.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    document.querySelectorAll('.site-header details[open]').forEach(function (d) {
      d.removeAttribute('open');
      d.querySelector('summary').focus();
    });
  });
})();
