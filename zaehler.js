// Zählt einen Seitenaufruf bei GoatCounter (mnkeller.goatcounter.com).
// Bewusst selbst gehostet statt count.js einzubinden: kein fremdes Skript,
// keine Cookies, kein localStorage, keine Bildschirmdaten. Übertragen werden
// nur Pfad, Seitentitel und Referrer. Zählt nur auf der echten Domain, damit
// lokale Vorschauen und Tests die Statistik nicht verfälschen.
(function () {
  if (location.hostname !== "schanzer-papierpanther.de") return;
  if (navigator.webdriver || !navigator.sendBeacon) return;
  var q = new URLSearchParams({
    p: location.pathname,
    t: document.title,
    r: document.referrer,
    rnd: Math.random().toString(36).slice(2)
  });
  navigator.sendBeacon("https://mnkeller.goatcounter.com/count?" + q);
})();
