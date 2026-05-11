# eBuSy-Testlabor

Stand: 10.05.2026

Das eBuSy-Testlabor ist ein geschützter interner Bereich unter:

`/verwaltung/ebusy-testlabor`

Ziel ist, die eBuSy-Übertragung feldweise und wiederholbar zu prüfen, ohne jedes Mal den kompletten Formular- und Verwaltungsprozess manuell durchlaufen zu müssen.

## Was das Testlabor aktuell kann

- Testszenario `Erwachsene Einzelperson`
- Testszenario `Erwachsene Einzelperson passiv`
- Datenpaket anzeigen, ohne eBuSy-Schreibzugriff auszuführen
- optional eine klar markierte eBuSy-Testperson anlegen
- optional eine klar markierte eBuSy-Testperson anlegen und danach die Test-Attribute für `Erwachsene Einzelperson` setzen
- optional eine klar markierte eBuSy-Testperson anlegen und danach eine einfache Test-Mitgliedschaft setzen
- optional eine klar markierte eBuSy-Testperson anlegen, danach die Test-Attribute setzen und anschließend die einfache Test-Mitgliedschaft setzen
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

## Nächster Testschritt: einfache Mitgliedschaft

Das Testlabor enthält nun eine eigene Live-Aktion für einen isolierten Mitgliedschaftstest:

`Live-Testperson + Mitgliedschaft anlegen`

Diese Aktion legt zuerst eine klar markierte Testperson an und setzt danach eine einfache Test-Mitgliedschaft.

Aktuell werden nur Felder gesetzt, die anhand der API und vorhandener eBuSy-Daten kontrolliert nachvollziehbar sind:

- Modul-ID `4`
- Abteilung `1` / `Tennis`
- Status `ACTIVE`
- aktiv / `consideredActive = true`
- Eintrittsdatum aus dem Testlaufdatum
- Mitgliedsnummer aus der von eBuSy erzeugten Kundennummer der Testperson
- Mitgliedschaftsart-ID `null`, weil die API-Liste der Membership-Types leer zurückkommt und vorhandene eBuSy-Mitgliedschaften ebenfalls `membershipTypeId: null` enthalten

Bewusst noch nicht geschrieben werden:

- Beitragsart / `membershipFeeTypes`
- Familien-/Haushaltsbezug
- Hauptzahler-/Beitragszahler-Bezug
- Mehrpersonen-Mitgliedschaften

Der Test liest die Mitgliedschaft direkt nach dem Schreiben wieder aus und vergleicht die gesetzten Felder. Wenn eBuSy automatisch eine Mitgliedsnummer oder Beitragsart ergänzt, wird das in der Ergebnistabelle sichtbar, aber nicht als Fehler behandelt.

## Kombinierter Test: Attribute plus Mitgliedschaft

Nach den Einzeltests gibt es zusätzlich die kombinierte Aktion:

`Live-Testperson + Attribute + Mitgliedschaft anlegen`

Diese Aktion ist der nächste Zwischenschritt in Richtung produktiver Einzelpersonen-Übernahme. Sie führt in einem kontrollierten Testlauf aus:

1. Testperson anlegen
2. Person direkt aus eBuSy zurücklesen
3. Test-Attribute für `Erwachsene Einzelperson` setzen
4. Person erneut zurücklesen und Attribute vergleichen
5. einfache Test-Mitgliedschaft setzen
6. Mitgliedschaft zurücklesen und vergleichen

Auch dieser Test bleibt ausdrücklich ein Testlabor-Schreibtest. Die produktive Verwaltungsübernahme wird dadurch noch nicht verändert.

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

Das Testlabor testet zunächst nur die Personen-/Benutzeranlage inkl. Bankkonto/SEPA, den isolierten Attribut-Schreibweg und eine einfache Test-Mitgliedschaft für eine erwachsene Einzelperson.

Noch nicht produktiv automatisiert:

- produktive Mitgliedschaftsübernahme aus echten Anträgen
- Beitragsart
- Familien-/Mehrpersonenprozess
- eBuSy-Löschung

Diese Schritte sollen nach und nach ergänzt werden, sobald der jeweilige API-Schreibweg kontrolliert getestet wurde.
## Update 10.05.2026

- Der kombinierte Test fuer `Erwachsene Einzelperson` wurde live bestaetigt.
- Die produktive Verwaltungsuebernahme darf fuer `adult_active` jetzt Person, Attribute und einfache Mitgliedschaft schreiben.
- Der kombinierte Test fuer `Erwachsene Einzelperson passiv` wurde live bestaetigt. Die produktive Verwaltungsuebernahme darf fuer `adult_passive` jetzt ebenfalls Person, Attribute und einfache Mitgliedschaft schreiben.
- Der technische Lauf fuer `Kind bis 14 Jahre` zeigt anhand der eBuSy-Kontrolle: Attribute sowie Bankkonto/SEPA kommen korrekt an. Produktiv bleibt dieser Fall noch gesperrt, bis der Minderjaehrigen-/Vertreter-, PDF- und Mailprozess fachlich final ist.
- Als naechster Testfall ist `Jugendliche bis 18 Jahre aktiv` vorbereitet. Dieser Fall bleibt bis zur Live-Bestaetigung noch nicht produktiv freigegeben.
- Zusaetzlich gibt es nun den Button `Alle Datenpakete pruefen`. Dieser fuehrt fuer alle Testlabor-Szenarien nur Datenpaket-Pruefungen aus und schreibt nichts nach eBuSy.

## Update 11.05.2026

- Der technische Lauf fuer `Jugendliche bis 18 Jahre aktiv` wurde bestaetigt: Person, Bankkonto/SEPA, Attribute und einfache Mitgliedschaft kommen an. Produktiv bleibt der Fall trotzdem gesperrt, weil Minderjaehrigen-/Vertreter-, PDF- und Mailprozess fachlich finalisiert werden muessen.
- Im Testlabor ist nun das Szenario `Familie mit 4 Personen` vorbereitet.
- Dieses Szenario besteht aus zahlender Hauptperson, Partner:in, Kind und Jugendlicher Person.
- Fuer dieses Szenario koennen nur Datenpakete, Personenanlage und vorgeschlagene Attribute getestet werden.
- Mitgliedschaften, Beitragslogik, Familien-/Hauptzahlerbezug und gemeinsame Abrechnung bleiben fuer Mehrpersonen-Antraege bewusst gesperrt.
- Hintergrund: eBuSy muss erst fachlich bestaetigt werden, ob Familienmitglieder ueber Attribute, Mitgliedschaften, Hauptzahler-Felder oder eine andere Verbindung abgebildet werden.
- Bei Live-Tests muessen alle angelegten `TCV Testfamilie ...` Testpersonen anschliessend manuell in eBuSy geloescht werden.
