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
  css.textContent = [
    '.kacheln { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }',
    '@media (max-width: 900px) { .kacheln { grid-template-columns: repeat(2, 1fr); } }',
    '@media (max-width: 520px) { .kacheln { grid-template-columns: 1fr; } }',
    '.kachel { display: flex; flex-direction: column; background: var(--card); border-radius: var(--radius);',
    '  box-shadow: var(--shadow); padding: 1rem 1.15rem 1.05rem; text-decoration: none; color: var(--text);',
    '  border-left: 4px solid var(--primary); transition: box-shadow .15s, transform .15s; }',
    '.kachel:hover, .kachel:focus-visible { box-shadow: 0 6px 20px rgba(22,35,43,.12); transform: translateY(-1px); }',
    '.kachel-titel { font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; color: var(--text-faint); font-weight: 600; }',
    '.kachel-zahl { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--primary-dark); line-height: 1.2; margin: .25rem 0 .2rem; }',
    '.kachel-text { font-size: .88rem; color: var(--text-muted); flex: 1; }',
    '.kachel-weiter { margin-top: .6rem; font-size: .84rem; font-weight: 600; color: var(--accent); }',
    '.kacheln.kompakt .kachel { padding: .85rem 1rem .9rem; }',
    '.kacheln.kompakt .kachel-zahl { font-size: 1.4rem; }',
    '.kacheln.kompakt .kachel-text { font-size: .82rem; }',
    '@media (max-width: 520px) {',
    '  .kacheln.kompakt { grid-template-columns: 1fr 1fr; gap: .6rem; }',
    '  .kacheln.kompakt .kachel { padding: .7rem .75rem; }',
    '  .kacheln.kompakt .kachel-zahl { font-size: 1.05rem; }',
    '  .kacheln.kompakt .kachel-text, .kacheln.kompakt .kachel-weiter { display: none; }',
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
        if (k.farbe) a.style.borderLeftColor = k.farbe;
        [['kachel-titel', l ? k.titel_l : k.titel],
         ['kachel-zahl', k.zahl],
         ['kachel-text', l ? k.text_l : k.text],
         ['kachel-weiter', l ? 'Mehr lesen →' : 'Zur Seite →']].forEach(function (p) {
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
