# eBuSy-Testlabor

Stand: 09.05.2026

Das eBuSy-Testlabor ist ein geschützter interner Bereich unter:

`/verwaltung/ebusy-testlabor`

Ziel ist, die eBuSy-Übertragung feldweise und wiederholbar zu prüfen, ohne jedes Mal den kompletten Formular- und Verwaltungsprozess manuell durchlaufen zu müssen.

## Was das Testlabor aktuell kann

- festes Testszenario `Erwachsene Einzelperson`
- Datenpaket anzeigen, ohne eBuSy-Schreibzugriff auszuführen
- optional eine klar markierte eBuSy-Testperson anlegen
- optional eine klar markierte eBuSy-Testperson anlegen und danach die Test-Attribute für `Erwachsene Einzelperson` setzen
- die angelegte Person direkt wieder aus eBuSy auslesen
- gesendete Werte mit zurückgelesenen eBuSy-Werten vergleichen
- Abweichungen in einer Tabelle anzeigen

## Bisher bestätigte Tests

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

Danach wurden Bankkonto und SEPA als echte Felder ergänzt und am 09.05.2026 erneut getestet.

Zusätzlich bestätigt wurden:

- Kontoinhaber
- IBAN
- SEPA-Mandatsdatum

eBuSy hat den Banknamen aus der IBAN selbst erkannt und die SEPA-Mandatsreferenz selbst erzeugt. Diese beiden Werte werden deshalb vorerst nicht aktiv von der Antragsplattform gesetzt.

Wichtig zur Nummernanzeige: Die im Testlabor angezeigte Nummer, z. B. `812`, ist die interne eBuSy-Person-ID/API-ID. Die sichtbare Kundennummer im eBuSy-Backend kann abweichen, z. B. `0255`. Für die API ist die interne Personen-ID erforderlich; für die manuelle Prüfung im Backend ist die Kundennummer die menschlich sichtbare Nummer.

## Nächster Testschritt: Attribute

Das Testlabor enthält nun eine eigene Live-Aktion für den Attribut-Test:

`Live-Testperson + Attribute anlegen`

Diese Aktion legt zuerst eine Testperson an und setzt danach für `Erwachsene Einzelperson` diese Attributwerte:

| Attribut-ID | Attribut | Wert-ID | Wert |
|---:|---|---:|---|
| 4 | Status Quo - Beitragsarten TENNIS RW | 8 | 1 Beitrag 1. Erwachsene/r |
| 6 | Mitgliedsbeiträge NEU | 16 | Erwachsene Aktiv |
| 7 | Status Quo TCH | 30 | Erwachsene |

Der Test schreibt weiterhin keine Mitgliedschaft und keine Beitragslogik. Er prüft nur, ob die Attributwerte per eBuSy-API gesetzt und wieder ausgelesen werden können.

## Sicherheitslogik

Der Datenpaket-Test funktioniert ohne zusätzliche Freigabe.

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

Das Testlabor testet zunächst nur die Personen-/Benutzeranlage inkl. Bankkonto/SEPA und den isolierten Attribut-Schreibweg für eine einfache Einzelperson.

Noch nicht produktiv automatisiert:

- Mitgliedschaft
- Beitragsart
- Familien-/Mehrpersonenprozess
- eBuSy-Löschung

Diese Schritte sollen nach und nach ergänzt werden, sobald der jeweilige API-Schreibweg kontrolliert getestet wurde.
