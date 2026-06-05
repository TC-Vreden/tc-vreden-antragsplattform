# Bedienung aktueller Prototyp

Stand: 04.06.2026

Zweck dieser Datei:

- schnelle Bedienungsanleitung fuer den aktuellen Teststand
- Nachschlagehilfe fuer das neue ChatGPT Pro Konto
- beschreibt nur den Ist-Stand, nicht den Soll-Endzustand

## 1. Oeffentliche Test-URL

- [https://tennisclub-vreden.vercel.app/anmelden](https://tennisclub-vreden.vercel.app/anmelden)

## 2. Interne Verwaltungs-URL

- [https://tennisclub-vreden.vercel.app/verwaltung](https://tennisclub-vreden.vercel.app/verwaltung)

## 3. Zugang zur Verwaltung

Die Verwaltungsseite ist primaer ueber Supabase Auth mit internen Benutzerrollen geschuetzt.

Der alte gemeinsame Basic-Auth-Zugang ist nur noch ein Bootstrap-/Fallback. Nach erfolgreichem Admin-Bootstrap sollte gesetzt sein:

- `INTERNAL_BASIC_AUTH_FALLBACK_ENABLED=false`

Nur wenn dieser Fallback bewusst aktiv bleiben soll, werden zusaetzlich `INTERNAL_ACCESS_USERNAME` und `INTERNAL_ACCESS_PASSWORD` benoetigt.

## 4. Aktueller Test-Ablauf

### Oeffentliches Formular

1. Formular oeffnen
2. Mitgliedschaft auswählen
3. Anrede und Mitgliedsdaten der Hauptperson eingeben
4. je nach Mitgliedschaft Ehepartner/Lebenspartner, Kind oder weitere Familienmitglieder erfassen
5. bei Schueler/Azubi/Student ggf. Nachweisdatum erfassen
6. SEPA- und Einwilligungsbereiche ausfuellen
7. bei Kinder-/Jugendmitgliedschaft der Hauptperson zusaetzlich den Bereich fuer gesetzliche Vertreter ausfuellen
8. `Antrag absenden`

Aktuelles erwartetes Ergebnis:

- gruene Erfolgsmeldung
- interne Vorgangs-ID wird angezeigt

Wenn das klappt, ist der Antrag bereits in Supabase gespeichert.

Zusatzpersonen werden aktuell strukturiert im vorhandenen JSON-Feld `family_members`
gespeichert. Dieses Feld dient im Prototyp als Uebergangsstruktur fuer Ehepartner,
Kinder und weitere Haushalts-/Familienmitglieder.

Der grosse Minderjaehrigen-/Vertreterblock erscheint nur, wenn die Hauptperson
selbst als Kind oder Jugendliche:r angemeldet wird (`child`, `youth_active`,
`youth_passive`). Bei Familie oder `Erwachsene + 1 Kind` wird dieser Block nicht
global fuer die Hauptperson angezeigt; minderjaehrige Zusatzpersonen werden dort
zunaechst ueber den Zusatzpersonenbereich erfasst.

### Interne Verwaltung

1. Verwaltungsseite oeffnen
2. nach unten zu `Anträge verwalten` scrollen
3. Antrag in `Offene Anträge` oder `Bereits übertragene Anträge` suchen

Direkt nach dem Speichern sollte der Antrag dort sichtbar sein.

Die Verwaltung trennt offene und bereits nach eBuSy übertragene Anträge. Nach einer
erfolgreichen Einzelpersonen-Anlage in eBuSy wird der Antrag als übertragen markiert,
aus der offenen Liste ausgeblendet und im Bereich `Bereits übertragene Anträge`
weiter nachvollziehbar angezeigt.

## 5. Bedeutungen in `Eingegangene Antraege`

### `Treffer`

- ein sicherer eBuSy-Datensatz wurde gefunden
- sichere Treffer werden nur automatisch verknuepft, wenn die Trefferqualitaet hoch genug ist

### `Kein Treffer`

- aktuell wurde kein passender Datensatz in eBuSy gefunden
- in diesem Fall kann eine neue Person in eBuSy angelegt werden
- die Mitgliedschaft selbst wird noch nicht automatisch in eBuSy angelegt

### `Mehrdeutig`

- mehrere moegliche eBuSy-Treffer wurden gefunden
- der Benutzer kann die Kandidatenliste oeffnen und den passenden Treffer verknuepfen

### `Pruefen`

- genau ein moeglicher eBuSy-Kandidat wurde gefunden, aber nicht sicher genug
- Beispiel: Treffer nur ueber Geburtsdatum
- der Benutzer kann den Kandidaten verknuepfen oder stattdessen eine neue Person in eBuSy anlegen

## 6. Buttons in der Verwaltung

### `Erneut abgleichen`

- fuehrt den eBuSy-Abgleich fuer genau diesen Antrag erneut aus

### `Kandidaten ansehen (n)`

- bei `Mehrdeutig` oder `Pruefen`
- klappt die Kandidatenliste fuer diesen Antrag auf

### `Diesen Treffer verknuepfen`

- erscheint in der aufgeklappten Kandidatenliste
- verknuepft den Antrag mit der gewaehlten eBuSy-Person

### `Details anzeigen`

- klappt die Detailansicht zum Antrag auf
- zeigt Hauptperson, Mitgliedschaft, Zusatzpersonen, Vertreterdaten, SEPA, Einwilligungen und eBuSy-Status
- IBAN wird in der geschützten Verwaltungsansicht vollständig angezeigt

### `In eBuSy anlegen`

- erscheint bei `Kein Treffer`, `Pruefen` oder `Mehrdeutig`, solange keine sichere eBuSy-ID verknuepft ist
- erscheint nur bei Einzelpersonen-Antraegen
- fragt vor dem Schreibzugriff noch einmal nach Bestaetigung
- legt aus dem Antrag eine neue Person in eBuSy an
- speichert die neue eBuSy-ID am Antrag
- markiert den Antrag als nach eBuSy uebertragen
- setzt fuer freigegebene Mitgliedschaftsarten Attribute und eine einfache Mitgliedschaft in eBuSy
- schreibt weiterhin keine Beitragsart direkt; die Beitragszuordnung laeuft ueber das Attribut `Mitgliedsbeitraege NEU`
- erzeugt nach erfolgreicher Uebernahme die PDF-Zusammenfassung und versendet die Bestaetigungsmail, wenn die Mail-ENV aktiv ist
- erzeugt aktuell ein technisches temporaeres Benutzerkonto-Passwort fuer eBuSy; vor Produktivbetrieb muss der Verein festlegen, ob Mitglieder ihr Passwort selbst setzen, ein Reset-Link genutzt wird oder ein Passwort manuell vergeben wird

### Mehrpersonen-Uebernahme

- fuer Familie, Ehepartner/Lebenspartner und `Erwachsene + 1 Kind` ist die produktive Uebernahme freigegeben
- die Plattform legt Hauptperson und Zusatzpersonen nacheinander an oder aktualisiert die verknuepfte Hauptperson
- Zusatzpersonen erhalten Hauptzahlerbezug zur Hauptperson, Attribute und einfache Mitgliedschaften
- Beitragsarten werden weiterhin nicht direkt geschrieben; die fachliche Beitragslogik laeuft ueber das Attribut `Mitgliedsbeitraege NEU`
- bei Teilfehlern bleibt im Antrag nachvollziehbar, welche Schritte bereits erfolgreich waren

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

## 8a. eBuSy-Testlabor

Das Testlabor hat zwei getrennte Testarten:

- `Datenpaket prüfen`: zeigt nur, welche Daten vorbereitet würden; kein Supabase-Schreiben und kein eBuSy-Schreiben.
- `Testantrag in Verwaltung anlegen`: legt einen echten Testantrag in Supabase an, startet den normalen eBuSy-Abgleich und löst die interne Eingangsmail aus, sofern die Mail-ENV aktiv ist. Es wird noch keine Person in eBuSy angelegt.
- Gelbe Live-Buttons: legen direkt Testpersonen in eBuSy an und sind nur für kontrollierte API-Feldtests gedacht.

Der neue Verwaltungs-Testpfad ist für den Produktablauf gedacht:

1. Testszenario wählen.
2. `Testantrag in Verwaltung anlegen` drücken.
3. In `/verwaltung` den Antrag prüfen und bei Bedarf bearbeiten.
4. eBuSy-Abgleich prüfen bzw. erneut ausführen.
5. Erst dann über den Verwaltungsbutton nach eBuSy übernehmen.
6. Danach muss die Bestätigungsmail mit PDF an den Antragsteller und die Vereinskopie ausgelöst werden, wenn `APPLICATION_CONFIRMATION_EMAIL_ENABLED=true` und Mailversand korrekt gesetzt sind.

Optional kann `TEST_LAB_APPLICATION_EMAIL` gesetzt werden. Dann verwendet der Testantrag diese Adresse als Antragsteller-E-Mail. Ohne diese ENV nutzt der Testpfad `MAIL_TO_CLUB`, falls gesetzt, sonst die Testadresse aus dem Szenario.

## 9. Was aktuell schon funktioniert

- Formularspeicherung nach Supabase
- Anzeige der Antraege in der Verwaltung
- automatischer erster eBuSy-Abgleich nach dem Speichern
- Status `Treffer`, `Kein Treffer`, `Mehrdeutig`, `Pruefen`
- manueller Neuabgleich
- Kandidatenanzeige bei mehrdeutigen und unsicheren Treffern
- manuelle Personenanlage in eBuSy bei `Kein Treffer`, `Pruefen` oder `Mehrdeutig`
- Loeschen von Testeintraegen
- strukturierte Detailansicht in der Verwaltung
- Trennung offener und bereits uebertragener Antraege
- Anrede-Erfassung und Uebergabe an eBuSy fuer Einzelpersonen
- Mehrpersonen-Uebernahme fuer Familie, Erwachsene + 1 Kind und Partner-/Lebenspartner-Antraege
- Testlabor-Button fuer einen echten Supabase-Testantrag bis zur Verwaltungsoberflaeche
- PDF-Zusammenfassung und Bestaetigungsmail nach erfolgreicher eBuSy-Uebernahme, sofern die Mail-ENV aktiv ist
- optionale interne Eingangsmail nach oeffentlicher Antragstellung

## 10. Bekannte Luecken im Prototyp

- Beitragsarten werden in eBuSy noch nicht direkt geschrieben; die aktuelle Zuordnung laeuft ueber das Attribut `Mitgliedsbeitraege NEU`
- produktive Minderjaehrigen-Uebernahme fuer Einzelantraege `Kind` und `Jugendliche:r` ist noch gesperrt, bis Vertreter-/Nachweislogik final abgenommen ist
- Einwilligungs- und DSGVO-Texte sind deutlich naeher an den PDF-Inhalten, sollten aber vor Live-Freigabe final fachlich/rechtlich gegengeprueft werden
- Mailversand ist nur aktiv, wenn die Mail-ENV in Vercel bzw. lokal gesetzt ist
- digitale Unterschrift wird aktuell als aktive Checkbox-/Zeitstempel-Bestaetigung dokumentiert; eine handschriftliche Signatur wird nicht erfasst
- WordPress-Einbindung fehlt

## 10a. PDF und E-Mail

Beim oeffentlichen Absenden wird weiterhin keine Bestaetigungsmail an Antragsteller verschickt. Optional kann nur eine interne Eingangsmail an das Vereinspostfach versendet werden.

Aktueller Ablauf fuer die Bestaetigung:

1. Antrag wird oeffentlich ausgefuellt und intern gespeichert
2. Verwaltung prueft den Antrag
3. Verwaltung uebernimmt bzw. gibt den Antrag frei
4. erst danach werden PDF-Zusammenfassung und Bestaetigungs-E-Mail erzeugt
5. der Versand haengt von `APPLICATION_CONFIRMATION_EMAIL_ENABLED`, `MAIL_FROM` und dem konfigurierten Mailprovider ab

Das Konzept liegt in `docs/pdf-email-konzept.md`.

## 10b. Spaetere Inhaltsverwaltung

Langfristig sollen Mitgliedschaftsarten, Preise, sichtbare Labels,
Akkordeontexte, DSGVO-/Einwilligungstexte sowie PDF-/E-Mail-Texte nicht mehr fest
im Code stehen. Das Konzept fuer eine spaetere Supabase-gestuetzte
Inhaltsverwaltung liegt in `docs/admin-content-konzept.md`.

## 10c. Mehrpersonen-Antraege und eBuSy

Bei Partner-, Erwachsenen-plus-Kind- und Familienantraegen enthaelt ein Antrag
mehrere Personen. Die spaetere eBuSy-Uebernahme muss deshalb als mehrstufiger
Workflow gebaut werden: Hauptperson suchen/anlegen, Zusatzpersonen einzeln
suchen/anlegen, danach Mitgliedschaften, Attribute und ggf. Familien- oder
Zahlerbezug setzen.

Das Konzept einschliesslich Statusfeldern, Supabase-Struktur, offenen eBuSy-
Klaerungen und Testfaellen liegt in `docs/mehrpersonen-ebusy-konzept.md`.
Die konkrete Pruefung zu eBuSy-Anrede, E-Mail-Unique-Frage und aktueller
Mehrpersonen-Sperre liegt in `docs/ebusy-anrede-email-mehrpersonen.md`.

## 11. Naechste fachliche Punkte

- Mitgliedschaftsanlage / Beitragsart-Mapping in eBuSy klaeren
- Familien- und Kinderlogik mit Hauptzahler sauber modellieren
- Mail-Absender, Reply-To/BCC, SMTP/Resend und Testadresse final abnehmen
- Pflichttexte rechtlich/fachlich final abnehmen
- digitale Checkbox-/Zeitstempel-Bestaetigung gegen Vereinsanforderung pruefen
- WordPress-Einbindung spaeter planen

## 12. Empfohlener Test nach Wiederaufnahme im neuen Pro-Konto

1. neuen Testantrag anlegen
2. pruefen, ob Erfolgsmeldung erscheint
3. Verwaltung oeffnen
4. pruefen, ob der Antrag in `Eingegangene Antraege` auftaucht
5. pruefen, ob sofort `Treffer`, `Kein Treffer`, `Mehrdeutig` oder `Pruefen` gesetzt wird
6. bei `Mehrdeutig` oder `Pruefen` Kandidatenliste oeffnen
7. bei `Kein Treffer`, `Mehrdeutig` oder `Pruefen` optional `In eBuSy anlegen` mit einer echten Testperson testen
8. Testeintrag wieder loeschen
