# eBuSy-Mapping: Benutzer, Bankkonto, Mitgliedschaft und Attribute

Stand: 10.05.2026

Dieses Dokument fasst zusammen, was aus den eBuSy-Screenshots, den bisherigen Tests und der API-Struktur ableitbar ist. Ziel ist eine fachliche Gegenüberstellung für Vorstand/Kassenwart, bevor wir weitere produktive Schreiblogik in eBuSy aktivieren.

## Aktueller Stand

Die Personenanlage aus der Antragsplattform funktioniert grundsätzlich:

- In eBuSy wird unter `Allgemein > Benutzer & Gruppen > Benutzer` eine Person angelegt.
- Allgemeine Daten, Adresse, Kontakt, Benutzerkonto und Kommentar werden geschrieben.
- Die Anrede wird korrekt übertragen, z. B. `Herr`.
- Der Antrag wird in der Verwaltungsoberfläche als übertragen markiert.

Noch nicht vollständig bestätigt gesetzt werden:

- Attribute im eBuSy-Reiter `Attribute`
- Mitgliedschaft im eBuSy-Reiter `Mitgliedschaft`
- Mitgliedsbeitrag / Beitragsart in `Mitglieder > Mitgliedschaften`
- Familien-/Haushalts-/Zahlerbezug

Bankkonto/IBAN und SEPA-Mandat wurden am 09.05.2026 als nächste technische Stufe in das eBuSy-Datenpaket aufgenommen und im Live-Rücklesetest bestätigt. eBuSy erkennt den Banknamen aus der IBAN selbst und erzeugt die SEPA-Mandatsreferenz automatisch.

Die im Testlabor angezeigte Nummer, z. B. `812`, ist die interne eBuSy-Person-ID/API-ID. Sie ist nicht identisch mit der sichtbaren Kundennummer im eBuSy-Backend, z. B. `0255`. Für API-Folgeoperationen wie erneutes Auslesen, Attribute setzen oder später Mitgliedschaft anlegen benötigen wir die interne Personen-ID. Für manuelle Kontrolle im eBuSy-Backend bleibt die Kundennummer die sichtbare Nummer.

Der aktuelle Test zeigt deshalb korrekt: Die Person existiert als Benutzer/Person, ist aber noch kein vollständiges Mitglied im eBuSy-Mitgliederbereich.

## Begriffsklärung

### Benutzer / Person

Der Bereich `Allgemein > Benutzer & Gruppen > Benutzer` ist offenbar der zentrale Personen- und Benutzerbereich in eBuSy.

Dort liegen:

- Name, Anrede, Geburtsdatum
- Adresse
- Kontakt
- Bankkonto und SEPA-Mandat
- Benutzerkonto für Login/Buchung
- Zugangsdaten
- Attribute
- Kommentar

Das `Benutzerkonto` dürfte für die Anmeldung bei `tc-vreden.ebusy.de` benötigt werden, damit ein Mitglied später Plätze buchen kann. Das sollte fachlich noch bestätigt werden.

Aktuelle automatische Benutzername-Logik:

- `vorname.nachname.<erste-8-zeichen-der-antrags-id>`
- Beispiel: `a.l.c1fbcf91`

Vorteil:

- sehr geringe Kollisionsgefahr
- keine vorherige globale Benutzersuche nötig
- stabil für automatisierte Anlage

Nachteil:

- weniger schön als `vorname.nachname`

Empfehlung:

- Für die erste produktive Automatisierung diese kollisionsarme Variante beibehalten.
- Später optional eine schönere Logik bauen: erst `vorname.nachname` prüfen, bei Kollision `vorname.nachname.geburtsjahr` oder Antragskürzel verwenden.
- Passwort-/Login-Übergabe an das neue Mitglied muss im Workflow dokumentiert werden.

### Mitglied

Der Bereich `Mitglieder > Mitgliedschaften > Mitglieder` ist offenbar ein zusätzlicher Mitgliedschaftsdatensatz zum Benutzer.

Eine Person wird dort erst sichtbar, wenn im Benutzer-Reiter `Mitgliedschaft` bzw. per Mitgliedschafts-API ein Mitgliedschaftsdatensatz angelegt wurde.

Erforderliche fachliche Felder laut UI/API:

- `Ist Mitglied?`
- Aktiv/Passiv
- Mitglieds-Nr.
- Zahlungsart
- Abteilung, hier `Tennis`
- Eintrittsdatum
- ggf. Austritt/Kündigung
- ggf. Mitgliedsbeitrag / Beitragsart

Die API zeigt dafür ein Mitgliedermodul:

- Modul `4`: `Mitglieder`
- Abteilung/Section `1`: `Tennis`

Unklar:

- Ob die `Mitglieds-Nr.` identisch zur `Kundennummer` sein soll.
- Ob eBuSy die Mitgliedsnummer automatisch setzen kann oder ob wir sie explizit setzen müssen.
- Wie genau die Beitragsart per API gesetzt wird, weil die sichtbaren Beitragsarten in Live-Daten als `membershipFeeTypes` vorkommen, aber in der OpenAPI-Schreibstruktur nicht eindeutig dokumentiert sind.

## Bankkonto und SEPA

Die eBuSy-API kennt am Personenobjekt grundsätzlich:

- `bankAccount.holder`
- `bankAccount.number` für IBAN
- `bankAccount.bank`
- `sepaMandate.date`
- `sepaMandate.reference`
- `sepaMandate.lastUsedDate`

Im ersten Live-Test wurden diese Felder noch nicht an eBuSy gesendet. Deshalb waren Bankkonto und SEPA-Mandat beim Testeintrag leer, obwohl sie im Kommentar standen.

Seit 09.05.2026 sendet die Personenanlage zusätzlich:

- `bankAccount.holder`
- `bankAccount.number`
- `sepaMandate.date`

Die Mandatsreferenz wird zunächst nicht gesendet. Der Live-Test hat bestätigt, dass eBuSy daraus automatisch eine eigene Referenz erzeugt.

Bestätigte technische Umsetzung:

- `bankAccount.holder` aus Kontoinhaber setzen
- `bankAccount.number` aus IBAN setzen
- `bankAccount.bank` nicht setzen, weil eBuSy den Banknamen aus der IBAN ableitet
- `sepaMandate.date` setzen
- `sepaMandate.reference` nicht setzen, weil eBuSy die Referenz automatisch erzeugt

Vor Umsetzung fachlich klären:

- Welches Datum ist das richtige Mandatsdatum: Antragstellung, Freigabe, Eintritt oder heutiges Datum?
- Soll eBuSy die Mandatsreferenz automatisch erzeugen?
- Muss die Mandatsreferenz einem bestimmten Vereinsmuster folgen?
- Darf die IBAN vollständig in eBuSy und in der internen Verwaltungsansicht angezeigt werden? Nach deiner Einschätzung: ja, weil die Verwaltungsoberfläche geschützt ist.

## Gefundene Attribute

### Status Quo - Beitragsarten TENNIS RW

Attribut-ID: `4`

| Wert-ID | Wert |
|---:|---|
| 8 | 1 Beitrag 1. Erwachsene/r |
| 11 | 2 Beitrag 2. Erwachsene/r |
| 6 | 3 Familienbeitrag |
| 12 | 4 Beitrag Kinder, Jugendl. bis 16 |
| 9 | 5 Schüler, Azubis, Studenten über 16 |
| 7 | 6 Schüler, Azubis, Studenten über 18 bis 25 |
| 10 | 7 Beitrag Passiv |
| 4 | 8 Beitrag Zweitmitgliedschaft |
| 5 | 9 beitragsfrei z.B. wg. Familienzugehörigkeit |

### Mitgliedsbeiträge NEU

Attribut-ID: `6`

| Wert-ID | Wert |
|---:|---|
| 16 | Erwachsene Aktiv |
| 20 | Erwachsene + 1 Kind |
| 19 | Ehepaare, eingetr. Lebenspartner |
| 18 | Familien |
| 22 | Beitragsfreie Familienangehörige |
| 14 | Kinder bis 14 Jahre |
| 17 | Jugendliche bis 18 Jahre |
| 21 | Schüler, Studenten, Azubis ab 18 bis 25J |
| 15 | Zweitmitgliedschaft / Trainingsmitgliedschaft |
| 33 | Passiv |

### Status Quo TCH

Attribut-ID: `7`

| Wert-ID | Wert |
|---:|---|
| 30 | Erwachsene |
| 29 | Ehepaare |
| 32 | Familienbeitrag |
| 23 | 1 Erwachsener + 1 Kind |
| 25 | 1. Kind/Jugendlicher bis 18 Jahre |
| 27 | Studenten, Auszubildende, Schüler ab 18 Jahre |
| 28 | 0 Beitrag |
| 26 | Beitragsfrei Familie |
| 31 | Passiv |
| 24 | Unklar |

Weitere Attribute:

- `Trainer`
- `Platzwart`
- `Sommertraining 2024`
- `Sommertraining Gebühren`
- `Sommertraining 2025 1. Kind`

Diese sollten für den normalen Mitgliedsantrag zunächst nicht automatisch gesetzt werden, außer der Vorstand bestätigt das ausdrücklich.

## Gefundene Mitgliedsbeitragsarten in bestehenden Mitgliedschaften

In bestehenden eBuSy-Mitgliedschaften wurden folgende `membershipFeeTypes` gefunden:

| ID | Wert |
|---:|---|
| 1 | Erwachsene (aktiv) |
| 2 | Erwachsen (passiv) |
| 3 | Ehepaare, eingetr. Lebenspartner (aktiv) |
| 4 | Jugendliche bis 18 Jahre (aktiv) |
| 5 | Schüler, Studenten, Azubis ab 18 - 30J (aktiv) |
| 9 | Kinder bis 14 Jahre (aktiv) |
| 10 | Erwachsene + 1 Kind |
| 11 | Familien |
| 12 | MGV-Zweitmitgliedschaft |
| 13 | Beitragsfreie Familienangehörige |

Wichtig: Diese Werte erscheinen in Live-Daten, sind aber in der OpenAPI-Schreibstruktur für neue Mitgliedschaften nicht eindeutig dokumentiert. Deshalb sollten wir sie nicht blind produktiv setzen, bevor ein kontrollierter Test bestätigt, wie eBuSy diese Werte per API annimmt.

## Vorschlag für fachliches Mapping

Diese Gegenüberstellung ist ein Vorschlag und sollte vom Vorstand/Kassenwart bestätigt werden.

| Formularwert | Sichtbares Formularlabel | Mitgliedschaft / Beitrag vermutlich | Attribute vermutlich |
|---|---|---|---|
| `adult_active` | Erwachsene aktiv | `membershipFeeType 1` Erwachsene (aktiv), aktiv, Section Tennis | Attribut 4 = Wert 8; Attribut 6 = Wert 16; Attribut 7 = Wert 30 |
| `adult_passive` | Erwachsene passiv | `membershipFeeType 2` Erwachsen (passiv), passiv | Attribut 4 = Wert 10; Attribut 6 = Wert 33; Attribut 7 = Wert 31 |
| `partner_active` | Ehepartner/Lebenspartner aktiv | `membershipFeeType 3` Ehepaare, eingetr. Lebenspartner (aktiv) | Attribut 6 = Wert 19; Attribut 7 = Wert 29; Attribut 4 muss bestätigt werden |
| `partner_passive` | Ehepartner/Lebenspartner passiv | unklar, kein eigener passiver Partner-FeeType gefunden | Muss bestätigt werden |
| `family` | Familie | Hauptzahler vermutlich `membershipFeeType 11` Familien | Hauptzahler: Attribut 4 = Wert 6; Attribut 6 = Wert 18; Attribut 7 = Wert 32 |
| Zusatzperson in Familie | Familienmitglied beitragsfrei | vermutlich `membershipFeeType 13` Beitragsfreie Familienangehörige | Attribut 4 = Wert 5; Attribut 6 = Wert 22; Attribut 7 = Wert 26 |
| `adult_child` | Erwachsene + 1 Kind | Hauptperson vermutlich `membershipFeeType 10` Erwachsene + 1 Kind | Attribut 6 = Wert 20; Attribut 7 = Wert 23; Attribut 4 muss bestätigt werden |
| Kind bei Erwachsene + 1 Kind | Kind beitragsfrei/zugeordnet | vermutlich `membershipFeeType 13` oder Kindertyp, abhängig vom Vereinsprozess | Muss bestätigt werden |
| `child` | Kind bis 14 Jahre | `membershipFeeType 9` Kinder bis 14 Jahre (aktiv) | Attribut 6 = Wert 14; Attribut 7 = Wert 25; Attribut 4 vermutlich Wert 12 |
| `youth` | Jugendliche/r bis 18 Jahre | `membershipFeeType 4` Jugendliche bis 18 Jahre (aktiv) | Attribut 6 = Wert 17; Attribut 7 = Wert 25; Attribut 4 vermutlich Wert 12 |
| `student` | Schüler:innen / Azubis / Student:innen | `membershipFeeType 5` Schüler, Studenten, Azubis ab 18 - 30J (aktiv) | Attribut 6 = Wert 21; Attribut 7 = Wert 27; Attribut 4 Wert 7 oder 9 muss bestätigt werden |
| Zweit-/Trainingsmitgliedschaft | falls im Formular vorgesehen | `membershipFeeType 12` MGV-Zweitmitgliedschaft | Attribut 4 = Wert 4; Attribut 6 = Wert 15 |

Offene fachliche Unstimmigkeit:

- Im Formular bzw. Beitragsdokument gibt es Altersgrenzen, in eBuSy stehen teilweise andere Texte, z. B. `ab 18 - 30J` gegenüber `18 bis 25J`.
- Das muss fachlich geklärt werden, bevor wir diese Fälle vollautomatisch setzen.

## Hauptzahler / Familienbezug

Die Screenshots bestehender Familienmitglieder zeigen, dass der Reiter `Hauptzahler` offenbar nicht sichtbar genutzt wird. Stattdessen scheinen Familienbeiträge über Attribute und Beitragsarten abgebildet zu werden:

- Hauptzahler / zahlende Person: Familienbeitrag
- Familienangehörige: beitragsfrei wegen Familienzugehörigkeit

Die API enthält zwar `paidByInfo` und `paysForInfo`, diese wirken aber lesend/readonly. Ein eindeutig dokumentierter Schreib-Endpunkt für Hauptzahler/Familienverbund wurde bisher nicht sicher identifiziert.

Fachlich zu klären:

- Wird der Reiter `Hauptzahler` aktuell bewusst nicht genutzt?
- Wenn nein: Sollen wir ihn weiterhin ignorieren?
- Wenn ja: Wie wird er manuell gesetzt und gibt es dafür eine API-Funktion?
- Wie werden Familienmitglieder intern eindeutig miteinander verbunden?

## Sichere nächste Umsetzungsschritte

### Schritt 1: Bankkonto und SEPA bei Personenanlage ergänzen

Das ist technisch gut eingrenzbar und fachlich relativ klar.

Vorschlag:

- Beim eBuSy-Personen-Create zusätzlich `bankAccount` senden.
- Bei bestätigtem SEPA-Mandat zusätzlich `sepaMandate` senden.
- Mandatsdatum und Mandatsreferenz vorher fachlich festlegen.

Kontrollierter Test:

- Einen einzelnen Testantrag verwenden.
- In eBuSy prüfen, ob Bankkonto und SEPA-Mandat im Reiter `Bankkonto` korrekt erscheinen.

### Schritt 2: Mitgliedschaft nicht mehr nur als Person denken

Für vollständige Mitgliedschaft muss nach der Personenanlage zusätzlich ein Mitgliedschaftsdatensatz angelegt werden.

Vermutlicher Ablauf für Einzelperson:

1. Person/Benutzer anlegen oder verknüpfen.
2. Bankkonto/SEPA setzen.
3. Attribute setzen.
4. Mitgliedschaft im Modul `4` anlegen.
5. Section `1` Tennis setzen.
6. Eintrittsdatum setzen.
7. Beitragsart/FeeType setzen, sofern API-Schreibweg bestätigt ist.
8. Antrag erst danach als vollständig übernommen markieren.

### Schritt 3: Mehrpersonen-Anträge als Batch behandeln

Bei Familie, Ehepartner/Lebenspartner oder Erwachsene + 1 Kind darf nicht nur eine eBuSy-Person angelegt werden.

Zielablauf:

1. Hauptperson anlegen/verknüpfen.
2. Zusatzperson 1 anlegen/verknüpfen.
3. Zusatzperson 2 anlegen/verknüpfen.
4. Für jede Person Attribute/Mitgliedschaft setzen.
5. Familien-/Zahler-/Beitragsbezug herstellen, soweit API und Vereinsprozess klar sind.
6. Erst danach PDF/E-Mail/Abschlussstatus erzeugen.

Empfohlene Status:

- `pending`
- `main_person_created`
- `additional_persons_created`
- `attributes_set`
- `memberships_created`
- `family_link_review_required`
- `completed`
- `failed_requires_manual_review`

## Fragen an Vorstand/Kassenwart

Diese Fragen sollten für die nächste Automatisierungsstufe beantwortet werden:

1. Ist `Benutzerkonto` tatsächlich der Login für Platzbuchung?
2. Soll bei neuen Mitgliedern immer ein Benutzerkonto freigeschaltet werden?
3. Wie soll der Benutzername aussehen?
4. Wie wird das Erstpasswort an das Mitglied übergeben?
5. Soll das Mitglied sein Passwort selbst ändern müssen?
6. Wird die `Kundennummer` als `Mitglieds-Nr.` übernommen?
7. Wenn ja: automatisch von eBuSy oder manuell?
8. Welches Eintrittsdatum soll gesetzt werden: Antragstellung, Freigabe oder Wunschdatum?
9. Wird im Reiter `Mitgliedschaft` immer `Abteilungen = Tennis` gesetzt?
10. Welche Attribute werden bei Neumitgliedern wirklich gepflegt: `Status Quo`, `Mitgliedsbeiträge NEU`, `Status Quo TCH` oder nur ein Teil davon?
11. Bitte das Mapping aus der Tabelle bestätigen oder korrigieren.
12. Wie wird `Ehepartner/Lebenspartner passiv` in eBuSy fachlich abgebildet?
13. Wie wird `Erwachsene + 1 Kind` beim Kind abgebildet?
14. Werden Familienmitglieder über den Reiter `Hauptzahler` verbunden oder nur über Attribute/Beiträge?
15. Soll eBuSy die SEPA-Mandatsreferenz automatisch erzeugen?
16. Welches Mandatsdatum soll gesetzt werden?
17. Dürfen IBAN und SEPA-Daten in der internen Verwaltungsansicht vollständig angezeigt werden?
18. Werden Beiträge direkt in eBuSy erhoben oder über separate Kassenwart-Prozesse verarbeitet?

## Empfehlung

Kurzfristig sollten wir nicht sofort die komplette Mitgliedschafts- und Familienlogik produktiv schreiben.

Aktueller technischer Block:

1. Bankkonto/SEPA für Einzelpersonen ist umgesetzt und im Live-Rücklesetest bestätigt.
2. Als nächstes wird im Testlabor isoliert geprüft, ob Attribute für eine einfache Einzelperson (`adult_active`) gesetzt und zurückgelesen werden können.
3. Danach sollte erst die Mitgliedschaft für eine einfache Einzelperson testweise angelegt werden.
4. Erst nach Bestätigung dieser Einzelschritte sollte der Mehrpersonen-/Familienprozess gebaut werden.

So reduzieren wir manuelle Arbeit schrittweise, ohne dass eBuSy halb gefüllte oder fachlich falsche Mitgliedschaften bekommt.
## Update 10.05.2026

- Der komplette Testpfad fuer `adult_active` wurde bestaetigt: Person, Bankkonto/SEPA, Attribute und einfache Mitgliedschaft werden angelegt und wieder korrekt aus eBuSy gelesen.
- In der produktiven Verwaltungsuebernahme ist deshalb fuer `adult_active` nicht mehr nur die Personenanlage aktiv, sondern auch Attribute und eine einfache Mitgliedschaft mit Kundennummer als Mitgliedsnummer.
- Andere Einzelpersonenarten werden produktiv noch nicht vollautomatisch uebernommen, bis sie im Testlabor bestaetigt wurden.
- Als naechster Testfall ist `adult_passive` im eBuSy-Testlabor vorbereitet.
