/* Themen-Kacheln: je Themenseite eine Kernzahl, aus
   data/themen.js (window.THEMEN_DATEN, von scraper/themen_bauen.py
   aus den Datendateien berechnet). Rendert in jedes Element mit [data-themen-kacheln]. */
(function () {
  'use strict';
  var daten = window.THEMEN_DATEN;
  var ziele = document.querySelectorAll('[data-themen-kacheln]');
  if (!daten || !ziele.length) return;

  function leicht() {
    var b = document.getElementById('btn-leicht');
    return !!(b && b.getAttribute('aria-pressed') === 'true');
  }

  var css = document.createElement('style');
  /* Register statt Karten: Linien wie im Inhaltsverzeichnis einer Zeitung,
     Thema links, Kernzahl und Erklaerung rechts. Die Reihenfolge Titel-Zahl-Text
     bleibt, weil der Text den Satz der Zahl fortsetzt (Designrunde 2026-10-26). */
  css.textContent = [
    '.kacheln { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2.2rem;',
    '  border-top: 2px solid var(--text); }',
    '@media (max-width: 760px) { .kacheln { grid-template-columns: minmax(0, 1fr); } }',
    '.kachel { display: grid; grid-template-columns: 8.5rem minmax(0, 1fr); gap: .1rem 1.1rem; align-items: baseline;',
    '  padding: .95rem 0 1rem; border-bottom: 1px solid var(--border); text-decoration: none; color: var(--text); }',
    '.kachel-titel { grid-row: 1 / span 2; align-self: start; padding-top: .45rem; }',
    '.kachel-zahl { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700;',
    '  color: var(--primary); line-height: 1.15; }',
    '.kachel-titel { font-size: .9rem; font-weight: 650; color: var(--text); line-height: 1.3; }',
    '.kachel-text { grid-column: 2; font-size: .87rem; color: var(--text-muted); line-height: 1.45; }',
    '.kachel:hover .kachel-titel, .kachel:focus-visible .kachel-titel { color: var(--accent); text-decoration: underline;',
    '  text-underline-offset: .18em; }',
    '.kachel:hover .kachel-zahl, .kachel:focus-visible .kachel-zahl { color: var(--accent); }',
    '.kachel:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }',
    '.kacheln.kompakt .kachel { padding: .75rem 0 .8rem; }',
    '.kacheln.kompakt .kachel-zahl { font-size: 1.4rem; }',
    '.kacheln.kompakt .kachel-text { font-size: .84rem; }',
    '@media (max-width: 520px) {',
    '  .kachel { grid-template-columns: minmax(0, 1fr); gap: .15rem; }',
    '  .kachel-titel { grid-row: auto; padding-top: 0; }',
    '  .kachel-text { grid-column: auto; }',
    '  .kachel-zahl { font-size: 1.4rem; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  function zeichne() {
    var l = leicht();
    ziele.forEach(function (ziel) {
      ziel.textContent = '';
      ziel.classList.add('kacheln');
      daten.forEach(function (k) {
        var a = document.createElement('a');
        a.className = 'kachel';
        a.href = k.href;
        [['kachel-titel', l ? k.titel_l : k.titel],
         ['kachel-zahl', k.zahl],
         ['kachel-text', l ? k.text_l : k.text]].forEach(function (p) {
          var s = document.createElement('span');
          s.className = p[0];
          s.textContent = p[1];
          a.appendChild(s);
        });
        ziel.appendChild(a);
      });
    });
  }
  zeichne();
  var btn = document.getElementById('btn-leicht');
  if (btn) new MutationObserver(zeichne).observe(btn, { attributes: true, attributeFilter: ['aria-pressed'] });
})();
