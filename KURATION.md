# Wie die Kurztexte entstehen

Verbindliche Anleitung für jeden Durchlauf, der `data/kuration.json` füllt —
egal ob von Hand, per Skript oder mit einem Sprachmodell.

**Grundregel:** Jeder Eintrag bekommt seine Texte in **zwei Fassungen**, und
beide entstehen **im selben Arbeitsgang**. Die Leichte Sprache nachträglich zu
ergänzen hieße, alle Vorlagen ein zweites Mal zu lesen — also den Aufwand
verdoppeln, ohne dass etwas besser wird.

---

## Die Felder je Eintrag

Schlüssel ist `<quelle>:<sitzungs-id>#<top-nr>`, z. B. `stadt:13534#Ö 2`.

```json
{
  "klartext_titel": "Wie viele Kita-Plätze Ingolstadt in den nächsten Jahren braucht",
  "klartext": "Die Stadt schreibt ihre Bedarfsplanung für Kindertageseinrichtungen fort. Dazu liegen Zahlen zum stadtweiten Bedarf und zu den geplanten Plätzen vor.",

  "klartext_titel_leicht": "Ingolstadt plant neue Kita-Plätze",
  "klartext_leicht": "Kitas sind Häuser für kleine Kinder. Die Stadt hat gezählt: So viele Plätze braucht Ingolstadt in den nächsten Jahren. Der Stadt-Rat hat den Plan besprochen.",

  "lebenslage": ["Eltern & Kinder"],
  "bezirk": ["stadtweit"],
  "ort": [],
  "anlass": ["Kinderbetreuung", "Konzept & Planung"]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `klartext_titel` | ja | Überschrift in normaler Sprache |
| `klartext` | ja¹ | 1–3 Sätze, was der Punkt bedeutet |
| `klartext_titel_leicht` | ja | Überschrift in Leichter Sprache |
| `klartext_leicht` | ja¹ | dasselbe in Leichter Sprache |
| `lebenslage`, `bezirk`, `anlass` | ja | Filterachsen, nur Werte aus `_achsen` |
| `ort` | nein | freier Ortsvermerk, nur Anzeige, kein Filter |
| `entwurf` | nein | `true` = maschinell vorgeschlagen, ungeprüft |

¹ Bei maschinellen Entwürfen (`entwurf: true`) bleiben `klartext` und
`klartext_leicht` **absichtlich leer**. Lieber nur ein geputzter Titel als ein
erfundener Satz. Leere Leicht-Felder sind erlaubt; die Oberfläche fällt dann
sichtbar auf die normale Fassung zurück.

---

## Regeln für die normale Fassung

- **1 bis 3 Sätze.** Wer mehr braucht, hat den Punkt nicht verstanden.
- **Sagen, was es für Leute bedeutet**, nicht das Amtsdeutsch umstellen.
  Nicht „Fortschreibung der Bedarfsplanung", sondern „Wie viele Kita-Plätze die
  Stadt in den nächsten Jahren braucht".
- **Nichts erfinden.** Steht ein Betrag, ein Ort oder ein Datum nicht in der
  Vorlage, darf er auch nicht im Text stehen. Im Zweifel weglassen.
- **Keine Wertung.** Nicht „endlich", nicht „nur", nicht „immerhin".
- **Kein Ergebnis behaupten.** Beraten ist nicht entschieden. Also „Der Stadtrat
  hat beraten" oder „soll entscheiden", nie „hat beschlossen", solange das nicht
  aus der Quelle hervorgeht.

---

## Regeln für die Leichte Sprache

Orientierung: Netzwerk Leichte Sprache, Zielniveau etwa A1/A2. Die Fassung ist
**keine Kurzform der normalen Fassung**, sondern eine eigenständige Übersetzung.

**Sätze**

- Ein Gedanke pro Satz. Höchstens etwa 12 Wörter.
- Aktiv statt Passiv: „Der Stadt-Rat entscheidet", nicht „Es wird entschieden".
- Kein Konjunktiv, kein Genitiv. Statt „wegen des Umbaus" → „weil die Stadt
  umbaut".
- Keine Nebensatz-Ketten. Zwei kurze Sätze sind besser als ein langer.

**Wörter**

- Alltagswörter. Fachwort nur, wenn es sein muss — dann im Satz davor erklären.
  „Eine Satzung ist eine Regel von der Stadt. Die Stadt ändert jetzt eine Satzung."
- Zusammengesetzte Wörter mit Bindestrich trennen: `Stadt-Rat`,
  `Bezirks-Ausschuss`, `Kita-Platz`, `Bau-Arbeiten`, `Rad-Weg`.
  Ausnahme: eingeführte kurze Wörter wie `Kita`, `Bus`, `Schule`.
- Keine Abkürzungen. `BZA` → `Bezirks-Ausschuss`. `ca.` → `ungefähr`.
- Keine Fremdwörter, keine Metaphern, keine Ironie.
- Immer dasselbe Wort für dieselbe Sache. Nicht abwechselnd „Sitzung",
  „Versammlung", „Treffen".

**Zahlen und Daten**

- Ziffern statt Zahlwörtern: `5` statt „fünf".
- Datum ausschreiben: „am 3. Juli 2026".
- Große Zahlen runden und einordnen: „ungefähr 1.000 Euro".
  Keine Prozentangaben ohne Erklärung.

**Ansprache**

- „Sie" für die Leserin und den Leser, wie im Rest der Seite.
- Konkret werden: nicht „Anwohnende", sondern „Menschen, die dort wohnen".

**Länge**

- 2 bis 4 Sätze. Darf länger sein als die normale Fassung — Leichte Sprache
  braucht mehr Sätze für denselben Inhalt. Das ist richtig so.

**Titel in Leichter Sprache**

- Höchstens etwa 8 Wörter, ein Aussagesatz ohne Nebensatz.
- Nicht die normale Überschrift kopieren.

---

## Was die Leichte Sprache nicht darf

- **Nicht mehr behaupten als die normale Fassung.** Vereinfachen heißt weglassen,
  nicht ergänzen. Wenn unklar ist, wer etwas entscheidet, dann steht das auch in
  der leichten Fassung nicht drin.
- **Nicht bevormunden.** Keine Handlungsempfehlungen („Da sollten Sie hingehen"),
  keine Bewertung, ob etwas gut oder schlecht ist.
- **Nicht das Original ersetzen.** Auch die leichte Fassung verlinkt die Quelle,
  und der Hinweis auf mögliche Fehler gilt genauso.

---

## Prüfliste vor dem Speichern

- [ ] Beide Fassungen vorhanden, oder beide bewusst leer (Entwurf)?
- [ ] Steht jede Tatsachenangabe so in der Quelle?
- [ ] Leichte Fassung: längster Satz unter etwa 12 Wörtern?
- [ ] Leichte Fassung: alle Fachwörter erklärt oder ersetzt?
- [ ] Zusammengesetzte Wörter mit Bindestrich getrennt?
- [ ] Kein behauptetes Beschlussergebnis?
- [ ] Schlagworte nur aus den erlaubten Achsenwerten?

---

## Offen: der Umschalter für die ganze Seite

**Entschieden:** Ein Schalter stellt die **komplette Seite** auf Leichte Sprache
um — nicht nur die Kartentexte. Kein Filter, der Einträge ausblendet: wer Leichte
Sprache braucht, will nicht weniger Einträge sehen, sondern dieselben in anderer
Form. Für Einträge ohne leichte Fassung bleibt die normale stehen, mit Vermerk.

Das betrifft mehr als `kuration.json`. Zwei Fassungen brauchen auch:

| Bereich | Beispiel normal | Beispiel leicht |
|---|---|---|
| Überschrift | „Der Stadtrat entscheidet ständig etwas." | „Der Stadt-Rat entscheidet viel." |
| Hinweisbalken | „Kein offizielles Angebot der Stadt Ingolstadt." | „Diese Seite ist nicht von der Stadt." |
| Filter-Überschriften | „Was betrifft Sie?" | „Was ist für Sie wichtig?" |
| Achsennamen | „Lebenslage", „Anlass" | „Ihr Leben", „Das Thema" |
| Achsenwerte | „Bauleitplanung", „Wohnen & Miete" | „Bau-Planung", „Wohnen und Miete" |
| Stand | „Entscheidung angesetzt" | „Der Stadt-Rat wollte entscheiden." |
| Knöpfe | „Im Ratsinfoportal prüfen" | „Beim Stadt-Rat nachlesen" |
| Fußtext | „Wie das hier funktioniert" | „So arbeitet diese Seite." |

Damit das nicht im Markup verstreut liegt, gehören diese Paare in ein
**Textverzeichnis** im Seitenkopf (ein Objekt mit beiden Fassungen), aus dem die
Oberfläche sich bedient. Der Schalter tauscht dann eine Variable, nicht dreißig
einzelne Stellen.

Weitere Anforderungen an den Schalter:

- **Oben und sofort sichtbar.** Wer Leichte Sprache braucht, darf nicht erst
  schwere Sprache lesen müssen, um den Schalter zu finden.
- **Auswahl merken** (`localStorage`), damit sie beim nächsten Besuch steht.
- **`lang`-Auszeichnung** bleibt `de`; Leichte Sprache ist keine eigene Sprache.
  Der Schalter selbst braucht ein `aria-pressed`.
- Die Texte der Seite werden ohnehin noch überarbeitet — die leichte Fassung
  entsteht sinnvollerweise erst danach, sonst zweimal.
