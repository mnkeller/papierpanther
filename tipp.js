/* Sofort-Hinweise beim Ueberfahren der Diagramme.

   Die Diagramme tragen ihre Erklaerung als SVG-<title> (und ein paar HTML-
   Elemente als title-Attribut). Der Browser zeigt die erst nach etwa einer
   Sekunde und grau auf grau. Dieses Skript zeigt denselben Text sofort in
   einer weissen Einblendung am Mauszeiger.

   Damit der Browser nicht zusaetzlich seinen eigenen Hinweis zeigt, wird der
   Text beim ersten Ueberfahren verschoben: <title> wird zu <desc>, das
   title-Attribut zu data-tipp. Fuer Screenreader bleibt er als Beschreibung
   erhalten. Die Diagramme werden teils neu gezeichnet, deshalb hoert das
   Skript auf der ganzen Seite zu statt an einzelnen Elementen.

   Nur fuer Maus und Stift. Auf dem Touchscreen bleibt alles wie bisher. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var css = document.createElement('style');
  css.textContent = [
    '.tipp { position: fixed; z-index: 200; max-width: min(320px, calc(100vw - 16px)); pointer-events: none;',
    '  background: #fff; color: var(--text, #16232b); border: 1px solid var(--border-strong, #8f8779);',
    '  border-radius: 6px; padding: .45rem .65rem; font: 400 .82rem/1.4 var(--font-body, system-ui, sans-serif);',
    '  box-shadow: 0 4px 14px rgba(22,35,43,.18); white-space: pre-line; overflow-wrap: anywhere; }',
    '.tipp[hidden] { display: none; }'
  ].join('\n');
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.className = 'tipp';
  box.setAttribute('role', 'tooltip');
  box.hidden = true;
  document.body.appendChild(box);

  var aktuell = null;

  function hide() {
    box.hidden = true;
    aktuell = null;
  }

  function kinderText(n) {
    for (var k = n.firstElementChild; k; k = k.nextElementSibling) {
      if (k.namespaceURI !== SVG_NS) continue;
      var name = k.localName;
      if (name === 'desc' && k.getAttribute('class') === 'tipp-text') return k.textContent;
      if (name === 'title') {
        var text = k.textContent;
        var desc = document.createElementNS(SVG_NS, 'desc');
        desc.setAttribute('class', 'tipp-text');
        desc.textContent = text;
        n.replaceChild(desc, k);
        return text;
      }
    }
    return '';
  }

  /* Vom Element unter der Maus nach oben, bis ein Hinweistext auftaucht. */
  function finde(ziel) {
    for (var n = ziel; n && n.nodeType === 1; n = n.parentElement) {
      if (n.localName === 'main' || n.localName === 'body') return null;
      var text = n.getAttribute('data-tipp');
      if (!text) {
        var attr = n.getAttribute('title');
        if (attr) {
          n.removeAttribute('title');
          n.setAttribute('data-tipp', attr);
          n.setAttribute('aria-description', attr);
          text = attr;
        }
      }
      if (!text && n.namespaceURI === SVG_NS) text = kinderText(n);
      if (text && text.trim()) return { el: n, text: text.trim() };
    }
    return null;
  }

  function setze(ev) {
    var w = box.offsetWidth, h = box.offsetHeight;
    var x = ev.clientX + 14, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
    box.style.left = Math.max(8, x) + 'px';
    box.style.top = Math.max(8, y) + 'px';
  }

  function bewegt(ev) {
    if (ev.pointerType === 'touch') return;
    var fund = finde(ev.target);
    if (!fund) { if (aktuell) hide(); return; }
    if (fund.el !== aktuell) {
      aktuell = fund.el;
      box.textContent = fund.text;
      box.hidden = false;
    }
    setze(ev);
  }

  document.addEventListener('pointermove', bewegt);
  document.addEventListener('pointerover', bewegt);
  document.addEventListener('pointerleave', hide);
  document.addEventListener('mouseout', function (ev) { if (!ev.relatedTarget) hide(); });
  document.addEventListener('click', hide);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hide(); });
  window.addEventListener('blur', hide);
})();
