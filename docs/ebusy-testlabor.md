# eBuSy-Testlabor

Stand: 09.05.2026

Das eBuSy-Testlabor ist ein geschützter interner Bereich unter:

`/verwaltung/ebusy-testlabor`

Ziel ist, die eBuSy-Übertragung feldweise und wiederholbar zu prüfen, ohne jedes Mal den kompletten Formular- und Verwaltungsprozess manuell durchlaufen zu müssen.

## Was das Testlabor aktuell kann

- festes Testszenario `Erwachsene Einzelperson`
- Payload anzeigen, ohne eBuSy-Schreibzugriff auszuführen
- optional eine klar markierte eBuSy-Testperson anlegen
- die angelegte Person direkt wieder aus eBuSy auslesen
- gesendete Werte mit zurückgelesenen eBuSy-Werten vergleichen
- Abweichungen in einer Tabelle anzeigen

## Bisher bestätigter Test

Am 09.05.2026 wurde eine Testperson angelegt und direkt wieder aus eBuSy gelesen.

Bestätigt wurden:

- Anrede
- Vorname/Nachname
- Geburtsdatum
- Adresse
- E-Mail
- Mobil/Telefon
- Benutzername
- Benutzerkonto aktiv
- Kontoart
- Kommentar

Bankkonto und SEPA wurden danach als echte Payload-Felder ergänzt und sind im nächsten Live-Test zu prüfen.

## Sicherheitslogik

Der Payload-Test funktioniert ohne zusätzliche Freigabe.

Der Live-Schreibtest ist zusätzlich gesperrt und läuft nur, wenn diese Server-Variable gesetzt ist:

`EBUSY_TEST_LAB_WRITE_ENABLED=true`

Damit wird verhindert, dass versehentlich Testpersonen in eBuSy angelegt werden.

## Testperson

Das aktuelle Szenario legt eine eindeutig erkennbare Testperson an:

- Vorname: `TCV Testperson`
- Nachname: `Erwachsen`
- Kommentar-Marker: `AUTOMATISCHER EBUSY-TEST - darf geloescht werden`

Solange kein sicherer API-Löschweg für eBuSy-Personen bestätigt ist, muss diese Testperson nach einem Live-Test manuell in eBuSy gelöscht werden.

## Wichtige Einschränkung

Das Testlabor testet zunächst nur die Personen-/Benutzeranlage inkl. Bankkonto/SEPA.

Noch nicht produktiv automatisiert:

- Mitgliedschaft
- Attribute
- Beitragsart
- Familien-/Mehrpersonenprozess
- eBuSy-Löschung

Diese Schritte sollen nach und nach ergänzt werden, sobald der jeweilige API-Schreibweg kontrolliert getestet wurde.
