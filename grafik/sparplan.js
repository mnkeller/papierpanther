/* Sparplan: ein Spar-Puzzle. Karten in die Lücke ziehen oder anklicken, Steuern per Regler. */
(function (el, NF, bewegungAus, SK) {
  'use strict';
GRAFIK.szene({
  id: 'sparplan', reiter: 'Sparplan', form: 'Spar-Puzzle', farbe: '#b00e2b', seite: 'hsk.html',
  titel: 'Sie sind Kämmerin oder Kämmerer',
  idee: 'Der Stadt fehlen 2026 bis 2029 im Schnitt 79 Millionen Euro im Jahr. Schließen Sie die Lücke: mit den Maßnahmen aus dem Sparplan, mit Kürzungen bei freiwilligen Leistungen oder mit höheren Steuern.',
  notizen: [
    ['Bedienung', 'Karte anklicken: Sie fliegt in den Balken, die Lücke wird kleiner. Noch einmal klicken nimmt sie zurück. Freiwillige Leistungen klappen auf: erst die Warnung, was wegfällt, dann einzelne Posten oder den ganzen Bereich streichen. Die Regler erhöhen die Hebesätze.'],
    ['Wow-Moment', '„Was die Stadt gewählt hat“ legt alle Karten aus dem Katalog nacheinander hinein, und man sieht, wie viel danach noch fehlt. Wer selbst streicht, sieht unter dem Balken, was der Stadt dann fehlt: Stadttheater, Musikschule, Badeseen, durchgestrichen.'],
    ['Mobil', 'Balken oben fest, die drei Stapel als Reiter untereinander. Antippen statt Ziehen.'],
    ['Daten', 'data/hsk.json: Konsolidierungsziel (Seite 18), Maßnahmenkatalog Anlage 1 (Mittel 2026–2029), freiwillige Leistungen Anlage 5 (2026), Hebesätze und Aufkommen. Der Ertrag je Hebesatzpunkt ist vereinfacht aus dem Planansatz 2026 gerechnet. Die Achtung-Sätze fassen die größten Posten je Bereich zusammen.']
  ],
  init: function (api) {
    var SP = SK.sparplan, L = SP.luecke_teur, EW = SP.einwohner;
    var FARBE = { steuern: '#003e59', personal: '#5b4b8a', bildung: '#2e7d4f', soziales: '#96551f', verwaltung: '#3d6f86', strasse: '#6b6b6b', einmalig: '#a86b00', sonstiges: '#8f8779', freiwillig: '#b00e2b', hebesatz: '#00263a' };
    var NAME = { steuern: 'Steuern', personal: 'Personal', bildung: 'Bildung', soziales: 'Soziales', verwaltung: 'Verwaltung', strasse: 'Straßen', einmalig: 'Einmalig', sonstiges: 'Sonstiges' };
    var css = document.createElement('style');
    css.textContent = [
      '.sp{padding:18px 20px 96px;background:#fff}',
      '.sp-luecke{background:#fff;padding:4px 0 14px;border-bottom:1px solid var(--linie);position:sticky;top:70px;z-index:5}',
      '.sp-kopf{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}',
      '.sp-offen{font-family:var(--font-display);font-weight:900;font-size:clamp(1.8rem,4vw,2.8rem);color:#b00e2b;line-height:1;font-variant-numeric:tabular-nums}',
      '.sp-offen small{font-size:.9rem;font-weight:600;color:var(--grau);font-family:var(--font-body)}',
      '.sp-geschafft{font-size:.9rem;color:var(--grau);text-align:right}',
      '.sp-geschafft strong{font-family:var(--font-display);font-size:1.6rem;color:#2e7d4f;display:block;line-height:1}',
      '.sp-balken{position:relative;height:46px;border-radius:4px;margin-top:12px;background:repeating-linear-gradient(-45deg,#f6dde2 0 10px,#fbeef1 10px 20px);overflow:hidden;display:flex}',
      '.sp-fehlt{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:10px;font-size:.8rem;color:var(--grau);min-height:0}',
      '.sp-fehlt:empty{display:none}',
      '.sp-fehlt b{color:#b00e2b;font-weight:700;margin-right:2px}',
      '.sp-fehlt s{text-decoration-color:#b00e2b;text-decoration-thickness:2px;color:var(--tinte);animation:spweg .5s ease}',
      '@keyframes spweg{from{opacity:0;transform:translateY(-6px)}}',
      '.sp-seg{height:100%;transition:width .5s cubic-bezier(.2,.8,.2,1);border-right:1.5px solid #fff;min-width:0}',
      '.sp-ziel{position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:.78rem;font-weight:700;color:#b00e2b}',
      '.sp-skala{display:flex;justify-content:space-between;font-size:.72rem;color:var(--grau);margin-top:4px;font-variant-numeric:tabular-nums}',
      '.sp-knoepfe{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
      '.sp-stapel{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:16px;margin-top:16px}',
      '.sp-spalte{min-width:0}',
      '.sp-spalte h3{font-family:var(--font-display);font-size:1.1rem;margin:0 0 2px;color:#00263a}',
      '.sp-spalte>p{margin:0 0 10px;font-size:.82rem;color:var(--grau)}',
      '.sp-liste{display:grid;gap:8px;max-height:470px;overflow:auto;padding-right:4px}',
      '.sp-karte{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;text-align:left;background:#fff;border:1px solid var(--linie);border-radius:6px;padding:9px 11px;cursor:pointer;transition:transform .15s,border-color .15s,opacity .3s}',
      '.sp-karte:hover{transform:translateY(-2px);border-color:var(--linie-stark)}',
      '.sp-karte small::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--k);margin-right:6px;vertical-align:0}',
      '.sp-karte b{font-size:.88rem;line-height:1.3}',
      '.sp-karte .betrag{font-family:var(--font-display);font-weight:900;color:var(--k);white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.sp-karte small{font-size:.72rem;color:var(--grau);grid-column:1/-1}',
      '.sp-karte[aria-pressed="true"]{opacity:.45;border-style:dashed}',
      '.sp-karte[aria-expanded="true"]{border-color:#b00e2b;border-bottom-left-radius:0;border-bottom-right-radius:0}',
      '.sp-auf{border:1px solid #b00e2b;border-top:0;border-radius:0 0 6px 6px;margin-top:-9px;padding:12px 12px 12px;background:#fff;display:grid;gap:8px;animation:spweg .3s ease}',
      '.sp-achtung{background:#fbeef1;color:#7d0a1f;border-radius:4px;padding:9px 11px;font-size:.84rem;line-height:1.4}',
      '.sp-achtung strong{display:block;font-size:.95rem;margin-bottom:2px}',
      '.sp-posten{display:grid;gap:4px;max-height:220px;overflow:auto}',
      '.sp-posten button{all:unset;cursor:pointer;display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;align-items:baseline;font-size:.8rem;padding:3px 2px;border-radius:3px}',
      '.sp-posten button:hover{background:#f6f3ec}',
      '.sp-posten button::before{content:"";width:12px;height:12px;border:1.5px solid var(--linie-stark);border-radius:3px;transform:translateY(2px)}',
      '.sp-posten button[aria-pressed="true"]::before{background:#b00e2b;border-color:#b00e2b}',
      '.sp-posten button[aria-pressed="true"] span{text-decoration:line-through;text-decoration-color:#b00e2b}',
      '.sp-posten b{font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.sp-auf-knoepfe{display:flex;gap:6px;flex-wrap:wrap}',
      '.sp-karte[aria-pressed="true"] .betrag::before{content:"✓ "}',
      '.sp-regler{border-top:1px solid var(--linie-stark);padding:10px 0 14px}',
      '.sp-regler label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;gap:8px}',
      '.sp-regler input{width:100%;accent-color:#00263a;margin:8px 0 2px}',
      '.sp-regler small{display:block;font-size:.76rem;color:var(--grau)}',
      '.sp-regler output{font-family:var(--font-display);font-weight:900;font-size:1.1rem;color:#00263a}',
      '.sp-flug{position:fixed;z-index:80;pointer-events:none;border-radius:7px;background:var(--k);opacity:.9;transition:all .65s cubic-bezier(.5,0,.3,1)}',
      '@media (max-width:900px){.sp-stapel{grid-template-columns:minmax(0,1fr)}.sp-luecke{top:64px}}'
    ].join('\n');
    document.head.appendChild(css);

    var karten = SP.massnahmen.filter(function (m) { return m.teur > 0; }).sort(function (a, b) { return b.teur - a.teur; })
      .map(function (m, i) { return { id: 'm' + i, t: m.t, x: m.x, teur: m.teur, art: m.bereich in NAME ? m.bereich : 'sonstiges', status: m.status, katalog: true }; });
    /* Was wegfällt, wenn ein ganzer Bereich gestrichen wird: von Hand aus den größten Posten der Anlage 5 */
    var ACHTUNG = {
      '0': 'keine Integrationsbeauftragte, keinen Inklusionsrat, keine Stadtteilzeitungen und keinen Livestream aus dem Stadtrat',
      '1': 'keine Verkehrsüberwachung und keinen Jahreszuschuss für die Freiwilligen Feuerwehren',
      '2': 'keine Mittagsbetreuung an den Grundschulen und keine Technikerschule',
      '3': 'kein Stadttheater, keine Sing- und Musikschule, kein Stadtmuseum, kein Museum für Konkrete Kunst und keine Stadtbücherei',
      '4': 'keine Zuschüsse für freie Träger, kein Bürgerhaus, keine Stadtteiltreffs und keine Jugendherberge',
      '5': 'keinen Vereinssport auf den fünf Bezirkssportanlagen, keine Pflege von Wegen, Plätzen und Wiesen, keine Badeseen und keine neuen Bänke',
      '6': 'keine Betreuung der Städtebauförderung, kein Verkehrsmodell und weniger Antworten auf Anliegen aus der Bürgerschaft',
      '7': 'keine Wirtschaftsförderung, keine Volksfeste und keinen Wochenmarkt',
      '8': 'keinen städtischen Zuschuss für die Busse und keinen Zuschuss für Bäder und Eishallen'
    };
    var frei = SP.freiwillig.map(function (f) { return { id: 'f' + f.ep, ep: f.ep, t: f.name, teur: f.teur, art: 'freiwillig', posten: f.posten, x: 'Freiwillige Leistungen dieses Bereichs aus Anlage 5 des Sparplans, Stand 2026.' }; })
      .sort(function (a, b) { return b.teur - a.teur; });
    var wahl = {}; frei.forEach(function (f) { wahl[f.id] = {}; });
    function wert(id) {
      var k = nachId[id];
      if (k.art !== 'freiwillig') return k.teur;
      return Object.keys(wahl[id]).reduce(function (s, i) { return s + k.posten[i][1]; }, 0);
    }
    var gewaehlt = {}, gew = SP.gewst.hebesatz, gst = SP.grundst.hebesatz;
    var proPunktG = SP.gewst.plan_teur / SP.gewst.hebesatz, proPunktB = SP.grundst.aufkommen_teur / SP.grundst.hebesatz;

    function karteHtml(k) {
      var fw = k.art === 'freiwillig';
      return '<button type="button" class="sp-karte" ' + (fw ? 'aria-expanded="false"' : 'aria-pressed="false"') + ' data-id="' + k.id + '" style="--k:' + FARBE[k.art] + '"><b>' + NF.esc(k.t) + '</b><span class="betrag">' + NF.teurMio(k.teur) + '</span><small>' + (fw ? k.posten.length + ' Posten · aufklappen' : NAME[k.art]) + (k.status ? ' · ' + k.status : '') + '</small></button>';
    }
    api.szene.innerHTML = '<div class="sp">' +
      '<div class="sp-luecke" data-gf-frei><div class="sp-kopf"><div><div class="augenbraue">Noch offen pro Jahr</div><div class="sp-offen" id="sp-offen">' + NF.teurMio(L) + '</div><small id="sp-kopf" style="color:var(--grau)"></small></div>' +
      '<div class="sp-geschafft"><strong id="sp-prozent">0 %</strong>der Lücke geschlossen</div></div>' +
      '<div class="sp-balken" id="sp-balken"><span class="sp-ziel">Ziel: ' + NF.teurMio(L) + '</span></div>' +
      '<div class="sp-skala"><span>0</span><span>20 Mio.</span><span>40 Mio.</span><span>60 Mio.</span><span>79 Mio. €</span></div>' +
      '<div class="sp-fehlt" id="sp-fehlt"></div>' +
      '<div class="sp-knoepfe"><button type="button" class="gf-chip" id="sp-stadt">Was die Stadt gewählt hat</button><button type="button" class="gf-chip" id="sp-null">Alles zurück</button></div></div>' +
      '<div class="sp-stapel">' +
      '<div class="sp-spalte"><h3>Maßnahmen aus dem Sparplan</h3><p>' + karten.length + ' Karten aus dem Maßnahmenkatalog, Mittelwert 2026–2029</p><div class="sp-liste">' + karten.map(karteHtml).join('') + '</div></div>' +
      '<div class="sp-spalte"><h3>Freiwillige Leistungen</h3><p>Aufklappen, lesen, was wegfällt, dann streichen. Hier merkt man es sofort.</p><div class="sp-liste">' + frei.map(karteHtml).join('') + '</div></div>' +
      '<div class="sp-spalte"><h3>Steuern</h3><p>Mehr Einnahmen statt Kürzungen</p>' +
      '<div class="sp-regler"><label for="sp-gew">Gewerbesteuer-Hebesatz <output id="sp-gew-w">' + gew + '</output></label><input type="range" id="sp-gew" min="' + gew + '" max="500" step="5" value="' + gew + '"><small>Heute ' + SP.gewst.hebesatz + ', Durchschnitt laut Sparplan ' + SP.gewst.schnitt + '. Pro Punkt rund ' + NF.zahl(proPunktG) + ' Tsd. €.</small></div>' +
      '<div class="sp-regler"><label for="sp-gst">Grundsteuer B <output id="sp-gst-w">' + gst + '</output></label><input type="range" id="sp-gst" min="' + gst + '" max="800" step="10" value="' + gst + '"><small>2026 schon von 475 auf ' + gst + ' erhöht. Durchschnitt ' + SP.grundst.schnitt + '. Trifft über die Nebenkosten auch alle Mieter.</small></div>' +
      '</div></div></div>';

    var balken = api.szene.querySelector('#sp-balken');
    var alleKarten = karten.concat(frei), nachId = {};
    alleKarten.forEach(function (k) { nachId[k.id] = k; });
    var reihe = [];

    function summe() {
      var s = reihe.reduce(function (a, id) { return a + wert(id); }, 0);
      s += (gew - SP.gewst.hebesatz) * proPunktG + (gst - SP.grundst.hebesatz) * proPunktB;
      return s;
    }
    function zeichne() {
      var segs = reihe.map(function (id) { return { w: wert(id), f: FARBE[nachId[id].art], id: id }; });
      var gs = (gew - SP.gewst.hebesatz) * proPunktG, bs = (gst - SP.grundst.hebesatz) * proPunktB;
      if (gs > 0) segs.push({ w: gs, f: FARBE.hebesatz, id: 'gew' });
      if (bs > 0) segs.push({ w: bs, f: '#3d6f86', id: 'gst' });
      var vorhanden = {};
      balken.querySelectorAll('.sp-seg').forEach(function (d) { vorhanden[d.dataset.id] = d; });
      segs.forEach(function (sg) {
        var d = vorhanden[sg.id];
        if (!d) { d = document.createElement('div'); d.className = 'sp-seg'; d.dataset.id = sg.id; d.style.width = '0'; balken.insertBefore(d, balken.querySelector('.sp-ziel')); void d.offsetWidth; }
        d.style.background = sg.f; d.style.width = Math.min(100, sg.w / L * 100) + '%';
        delete vorhanden[sg.id];
      });
      Object.keys(vorhanden).forEach(function (id) { var d = vorhanden[id]; d.style.width = '0'; setTimeout(function () { d.remove(); }, 500); });
      var s = summe(), offen = Math.max(0, L - s);
      api.szene.querySelector('#sp-offen').textContent = offen > 0 ? NF.teurMio(offen) : 'Geschafft!';
      api.szene.querySelector('#sp-prozent').textContent = NF.zahl(Math.min(100, s / L * 100)) + ' %';
      api.szene.querySelector('#sp-kopf').textContent = 'Das sind ' + NF.zahl(offen * 1000 / EW) + ' € pro Kopf und Jahr';
      // Was der Stadt dann fehlt
      var weg = [];
      frei.forEach(function (f) { Object.keys(wahl[f.id]).sort(function (a, b) { return a - b; }).forEach(function (i) { weg.push(f.posten[i][0]); }); });
      var fehlt = api.szene.querySelector('#sp-fehlt');
      fehlt.innerHTML = weg.length ? '<b>Dann fehlt:</b>' + weg.slice(0, 16).map(function (n) { return '<s>' + NF.esc(n.length > 46 ? n.slice(0, 44) + '…' : n) + '</s>'; }).join('') + (weg.length > 16 ? '<span>und ' + (weg.length - 16) + ' weitere</span>' : '') : '';
    }
    function flieg(knopf) {
      if (bewegungAus) return;
      var r = knopf.getBoundingClientRect(), z = balken.getBoundingClientRect();
      var f = document.createElement('div'); f.className = 'sp-flug'; f.style.setProperty('--k', getComputedStyle(knopf).getPropertyValue('--k'));
      f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
      document.body.appendChild(f); void f.offsetWidth;
      var x = z.left + Math.min(z.width - 40, z.width * summe() / L);
      f.style.left = x + 'px'; f.style.top = (z.top + 4) + 'px'; f.style.width = '30px'; f.style.height = (z.height - 8) + 'px'; f.style.opacity = '.2';
      setTimeout(function () { f.remove(); }, 700);
    }
    function schalte(id, an, mitFlug) {
      var k = api.szene.querySelector('.sp-karte[data-id="' + id + '"]');
      var ist = reihe.indexOf(id) >= 0;
      if (an === undefined) an = !ist;
      if (an === ist) return;
      if (an) { if (mitFlug !== false) flieg(k); reihe.push(id); } else reihe.splice(reihe.indexOf(id), 1);
      k.setAttribute('aria-pressed', an ? 'true' : 'false');
      setTimeout(zeichne, mitFlug === false ? 0 : 450);
    }
    /* Freiwillige Leistungen aufklappen: Warnung, Posten einzeln oder alle */
    function klappe(knopf) {
      var f = nachId[knopf.dataset.id], offen = knopf.getAttribute('aria-expanded') === 'true';
      api.szene.querySelectorAll('.sp-auf').forEach(function (d) { d.remove(); });
      api.szene.querySelectorAll('[aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (offen) return;
      knopf.setAttribute('aria-expanded', 'true');
      var d = document.createElement('div'); d.className = 'sp-auf';
      d.innerHTML = '<div class="sp-achtung"><strong>Achtung!</strong>Wer hier alles streicht, sagt: Dann gibt es ' + ACHTUNG[f.ep] + '.</div>' +
        '<div class="sp-posten">' + f.posten.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (wahl[f.id][i] ? 'true' : 'false') + '"><span>' + NF.esc(p[0]) + '</span><b>' + NF.zahl(p[1]) + ' Tsd. €</b></button>'; }).join('') + '</div>' +
        '<div class="sp-auf-knoepfe"><button type="button" class="gf-chip klein" data-alle>Ganzen Bereich streichen</button><button type="button" class="gf-chip klein" data-keine>Nichts streichen</button></div>';
      knopf.after(d);
      function nachWahl(mitFlug) {
        var an = Object.keys(wahl[f.id]).length > 0, ist = reihe.indexOf(f.id) >= 0;
        if (an && !ist) { if (mitFlug) flieg(knopf); reihe.push(f.id); }
        if (!an && ist) reihe.splice(reihe.indexOf(f.id), 1);
        d.querySelectorAll('[data-i]').forEach(function (b) { b.setAttribute('aria-pressed', wahl[f.id][b.dataset.i] ? 'true' : 'false'); });
        knopf.querySelector('.betrag').textContent = an ? '− ' + NF.teurMio(wert(f.id)) : NF.teurMio(f.teur);
        setTimeout(zeichne, mitFlug ? 450 : 0);
      }
      d.querySelectorAll('[data-i]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = b.dataset.i; if (wahl[f.id][i]) delete wahl[f.id][i]; else wahl[f.id][i] = true;
          nachWahl(false);
          if (wahl[f.id][i]) api.sag('Gestrichen: ' + f.posten[i][0] + '. Das bringt ' + NF.zahl(f.posten[i][1]) + ' Tsd. € im Jahr.');
        });
      });
      d.querySelector('[data-alle]').addEventListener('click', function () {
        f.posten.forEach(function (p, i) { wahl[f.id][i] = true; }); nachWahl(true);
        api.sag('Ganzer Bereich gestrichen: ' + NF.teurMio(wert(f.id)) + '. Unter dem Balken steht, was der Stadt dann fehlt.');
      });
      d.querySelector('[data-keine]').addEventListener('click', function () { wahl[f.id] = {}; nachWahl(false); });
      api.sag('Achtung: Bei „' + f.t + '“ hängen ' + f.posten.length + ' Angebote dran. Streichen Sie einzelne oder alle.');
    }
    api.szene.querySelectorAll('.sp-karte').forEach(function (k) {
      k.addEventListener('click', function () {
        var m = nachId[k.dataset.id];
        if (m.art === 'freiwillig') { klappe(k); return; }
        schalte(k.dataset.id);
        // Zurückgenommen: keine Karte, die Maßnahme ist wieder frei
        if (k.getAttribute('aria-pressed') !== 'true') { api.karteZu(); return; }
        api.karte('<div class="meta">' + (m.art === 'freiwillig' ? 'Freiwillige Leistungen' : 'Maßnahme · ' + NAME[m.art]) + '</div><h3>' + NF.esc(m.t) + '</h3><div class="zahl">' + NF.teurMio(m.teur) + '</div><p class="meta">im Jahr, Mittel 2026–2029</p><p>' + NF.esc(m.x) + '</p><p class="gf-quelle">Haushaltssicherungskonzept, Vorlage V0652/26</p>', k);
      });
    });
    var reglerG = api.szene.querySelector('#sp-gew'), reglerB = api.szene.querySelector('#sp-gst');
    reglerG.addEventListener('input', function () { gew = +reglerG.value; api.szene.querySelector('#sp-gew-w').textContent = gew; zeichne(); });
    reglerB.addEventListener('input', function () { gst = +reglerB.value; api.szene.querySelector('#sp-gst-w').textContent = gst; zeichne(); });
    reglerG.addEventListener('change', function () { api.sag('Gewerbesteuer auf ' + gew + ': rund ' + NF.teurMio((gew - SP.gewst.hebesatz) * proPunktG) + ' mehr im Jahr. Eine Erhöhung auf 420 wurde im März 2026 abgelehnt.'); });

    var timer = [];
    api.szene.querySelector('#sp-stadt').addEventListener('click', function () {
      timer.forEach(clearTimeout); timer = [];
      reihe.slice().forEach(function (id) { if (nachId[id].art === 'freiwillig') reihe.splice(reihe.indexOf(id), 1); else schalte(id, false, false); });
      frei.forEach(function (f) { wahl[f.id] = {}; var b = api.szene.querySelector('.sp-karte[data-id="' + f.id + '"] .betrag'); if (b) b.textContent = NF.teurMio(f.teur); });
      api.szene.querySelectorAll('.sp-auf').forEach(function (d) { d.remove(); });
      api.szene.querySelectorAll('[aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      gew = SP.gewst.hebesatz; gst = SP.grundst.hebesatz; reglerG.value = gew; reglerB.value = gst;
      api.szene.querySelector('#sp-gew-w').textContent = gew; api.szene.querySelector('#sp-gst-w').textContent = gst;
      karten.forEach(function (k, i) { timer.push(setTimeout(function () { schalte(k.id, true, i < 14); }, bewegungAus ? 0 : 120 * i)); });
      var s = karten.reduce(function (a, k) { return a + k.teur; }, 0);
      timer.push(setTimeout(function () {
        api.sag('Alle Karten aus dem Katalog bringen im Schnitt ' + NF.teurMio(s) + ' im Jahr. Das sind ' + NF.zahl(s / L * 100) + ' % der Lücke. Wie der Rest geschlossen wird, steht im Konzepttext.');
      }, bewegungAus ? 0 : 120 * karten.length + 500));
    });
    api.szene.querySelector('#sp-null').addEventListener('click', function () {
      timer.forEach(clearTimeout); timer = [];
      reihe.slice().forEach(function (id) { if (nachId[id].art === 'freiwillig') reihe.splice(reihe.indexOf(id), 1); else schalte(id, false, false); });
      frei.forEach(function (f) { wahl[f.id] = {}; var b = api.szene.querySelector('.sp-karte[data-id="' + f.id + '"] .betrag'); if (b) b.textContent = NF.teurMio(f.teur); });
      api.szene.querySelectorAll('.sp-auf').forEach(function (d) { d.remove(); });
      api.szene.querySelectorAll('[aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      gew = SP.gewst.hebesatz; gst = SP.grundst.hebesatz; reglerG.value = gew; reglerB.value = gst;
      api.szene.querySelector('#sp-gew-w').textContent = gew; api.szene.querySelector('#sp-gst-w').textContent = gst;
      zeichne(); api.karteZu(); api.sag('Alles zurück. Die Lücke ist wieder ' + NF.teurMio(L) + ' groß.');
    });
    zeichne();
    api.sag('Die rote Fläche ist die Lücke: ' + NF.teurMio(L) + ' pro Jahr. Klicken Sie Karten an, um sie zu schließen.');
  }
});
})(GRAFIK.el, GRAFIK.NF, GRAFIK.bewegungAus, window.GRAFIK_DATEN);
