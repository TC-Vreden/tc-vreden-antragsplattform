# Bedienung aktueller Prototyp

Stand: 04.05.2026

Zweck dieser Datei:

- schnelle Bedienungsanleitung fuer den aktuellen Teststand
- Nachschlagehilfe fuer das neue ChatGPT Pro Konto
- beschreibt nur den Ist-Stand, nicht den Soll-Endzustand

## 1. Oeffentliche Test-URL

- [https://antrag-tennisclub-vreden.vercel.app/anmelden](https://antrag-tennisclub-vreden.vercel.app/anmelden)

## 2. Interne Verwaltungs-URL

- [https://antrag-tennisclub-vreden.vercel.app/verwaltung](https://antrag-tennisclub-vreden.vercel.app/verwaltung)

## 3. Zugang zur Verwaltung

Die Verwaltungsseite ist per Basic Auth geschuetzt.

Es werden benoetigt:

- `INTERNAL_ACCESS_USERNAME`
- `INTERNAL_ACCESS_PASSWORD`

Diese Werte liegen in Vercel bzw. lokal in den Projekt-Umgebungen vor.

## 4. Aktueller Test-Ablauf

### Oeffentliches Formular

1. Formular oeffnen
2. Mitgliedsdaten eingeben
3. Mitgliedschaft auswaehlen
4. SEPA- und Einwilligungsbereiche ausfuellen
5. `Antrag absenden`

Aktuelles erwartetes Ergebnis:

- gruene Erfolgsmeldung
- interne Vorgangs-ID wird angezeigt

Wenn das klappt, ist der Antrag bereits in Supabase gespeichert.

### Interne Verwaltung

1. Verwaltungsseite oeffnen
2. nach unten zu `Eingegangene Antraege` scrollen
3. neuen Antrag in der Liste suchen

Direkt nach dem Speichern sollte der Antrag dort sichtbar sein.

## 5. Bedeutungen in `Eingegangene Antraege`

### `Treffer`

- genau ein passender eBuSy-Datensatz wurde gefunden

### `Kein Treffer`

- aktuell wurde kein passender Datensatz in eBuSy gefunden
- in diesem Fall kann eine neue Person in eBuSy angelegt werden
- die Mitgliedschaft selbst wird noch nicht automatisch in eBuSy angelegt

### `Mehrdeutig`

- mehrere moegliche eBuSy-Treffer wurden gefunden
- der Benutzer kann die Kandidatenliste oeffnen und den passenden Treffer verknuepfen

## 6. Buttons in der Verwaltung

### `Erneut abgleichen`

- fuehrt den eBuSy-Abgleich fuer genau diesen Antrag erneut aus

### `Treffer ansehen (n)`

- nur bei `Mehrdeutig`
- klappt die Kandidatenliste fuer diesen Antrag auf

### `Diesen Treffer verknuepfen`

- erscheint in der aufgeklappten Kandidatenliste
- verknuepft den Antrag mit der gewaehlten eBuSy-Person

### `In eBuSy anlegen`

- erscheint bei `Kein Treffer`
- fragt vor dem Schreibzugriff noch einmal nach Bestaetigung
- legt aus dem Antrag eine neue Person in eBuSy an
- speichert die neue eBuSy-ID am Antrag
- legt noch keine Mitgliedschaft in eBuSy an

### `Testeintrag loeschen`

- loescht den Testeintrag direkt wieder aus Supabase
- sinnvoll fuer wiederholte Tests mit denselben Personendaten

## 7. Direkte eBuSy-Suche

Oben in der Verwaltung gibt es zusaetzlich einen Bereich fuer die direkte Suche in eBuSy.

Aktueller Zweck:

- getrennte interne Suche gegen vorhandene eBuSy-Daten
- nicht noetig fuer den Kernprozess `Formular -> Verwaltung`

Wichtiger Hinweis:

- Fuer den aktuellen Produktfluss ist diese Suche nicht der Hauptpfad
- der Hauptpfad ist inzwischen:
  - Formular speichern
  - Antrag landet intern
  - automatischer eBuSy-Abgleich pro Antrag

## 8. API-Status

Unten auf der Verwaltungsseite wird ein API-Status angezeigt.

Wenn dort ueberall `OK` steht, funktionieren die wichtigsten eBuSy-Leseendpunkte.

Aktuell erfolgreich getestet:

- `/general/modules`
- `/general/attributes`
- `/general/groups`
- `/general/persons`
- `/member/modules/4/memberships`

## 9. Was aktuell schon funktioniert

- Formularspeicherung nach Supabase
- Anzeige der Antraege in der Verwaltung
- automatischer erster eBuSy-Abgleich nach dem Speichern
- Status `Treffer`, `Kein Treffer`, `Mehrdeutig`
- manueller Neuabgleich
- Kandidatenanzeige bei mehrdeutigen Treffern
- manuelle Personenanlage in eBuSy bei `Kein Treffer`
- Loeschen von Testeintraegen

## 10. Bekannte Luecken im Prototyp

- automatische Mitgliedschaftsanlage in eBuSy fehlt noch
- finale Zuordnung der Mitgliedschaftsarten / Beitragsarten in eBuSy fehlt noch
- Einwilligungstexte sind naeher an den PDF-Inhalten, sollten aber vor Live-Freigabe noch final fachlich gegengeprueft werden
- E-Mail-Versand fehlt
- PDF-Zusammenfassung fehlt
- digitale Unterschrift fehlt
- WordPress-Einbindung fehlt

## 11. Naechste fachliche Punkte

- Mitgliedschaftsanlage / Beitragsart-Mapping in eBuSy klaeren
- Familien- und Kinderlogik mit Hauptzahler sauber modellieren
- PDF-Zusammenfassung und E-Mail-Versand vorbereiten
- digitale Unterschrift pruefen
- WordPress-Einbindung spaeter planen

## 12. Empfohlener Test nach Wiederaufnahme im neuen Pro-Konto

1. neuen Testantrag anlegen
2. pruefen, ob Erfolgsmeldung erscheint
3. Verwaltung oeffnen
4. pruefen, ob der Antrag in `Eingegangene Antraege` auftaucht
5. pruefen, ob sofort `Treffer`, `Kein Treffer` oder `Mehrdeutig` gesetzt wird
6. bei `Mehrdeutig` Kandidatenliste oeffnen
7. bei `Kein Treffer` optional `In eBuSy anlegen` mit einer echten Testperson testen
8. Testeintrag wieder loeschen
