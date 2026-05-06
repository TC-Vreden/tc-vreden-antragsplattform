# Konzept: Mehrpersonen-Antraege und eBuSy-Uebernahme

Stand: 06.05.2026

Dieses Dokument beschreibt die fachliche Zielrichtung fuer Antraege mit mehreren Personen. Es ist bewusst noch keine produktive eBuSy-Mitgliedschaftsimplementierung. Die bestehende Personenanlage bleibt unveraendert.

## 1. Ausgangspunkt

Das Formular kann kuenftig je nach Mitgliedschaftsart mehr als eine Person enthalten:

- Hauptperson
- Ehepartner/Lebenspartner
- ein Kind bei `Erwachsene + 1 Kind`
- mehrere Kinder oder weitere Familienmitglieder bei `Familie`

Damit reicht die einfache Logik `ein Antrag -> eine eBuSy-Person` nicht mehr aus. Ein Antrag muss als Vorgang betrachtet werden, der mehrere Personen und mehrere Folgeschritte umfasst.

Aktuell werden Zusatzpersonen im Prototyp strukturiert im vorhandenen JSON-Feld `family_members` gespeichert. Das ist als Uebergangsloesung ausreichend, weil die Daten nicht in Freitextnotizen verloren gehen. Fuer die spaetere robuste eBuSy-Uebernahme sollte daraus aber eine normalisierte Personenstruktur entstehen.

## 1a. Minderjaehrige Hauptperson vs. minderjaehrige Zusatzperson

Der grosse Formularblock `Minderjaehrige / gesetzliche Vertreter` gehoert nur zur Hauptperson, wenn die ausgewaehlte Mitgliedschaft die Hauptperson selbst als minderjaehrig beschreibt:

- `child`
- `youth_active`
- `youth_passive`

Bei `family` und `adult_child` ist die Hauptperson normalerweise ein erwachsener Antragsteller. Minderjaehrige Kinder werden dort als Zusatzpersonen erfasst. Dafuer sollte spaeter keine globale Hauptpersonen-Pflichtvalidierung greifen, sondern eine eigene, kleinere Zustimmungsschicht fuer die jeweilige Zusatzperson oder fuer den gesamten Haushalt.

Empfohlene spaetere Struktur fuer minderjaehrige Zusatzpersonen:

- je Zusatzperson `requires_guardian_consent`
- je Zusatzperson `guardian_name`
- je Zusatzperson oder Antrag `guardian_email`
- je Zusatzperson `guardian_consent_confirmed`
- Zeitstempel und Textversion der bestaetigten Minderjaehrigen-Zustimmung
- klare Zuordnung, fuer welches Kind bzw. welche Zusatzperson die Zustimmung gilt

Damit kann ein Familienantrag mehrere Kinder enthalten, ohne dass die Hauptperson faelschlich als minderjaehrig behandelt wird.

## 2. Zielprozess bei der spaeteren Uebernahme

Die Uebernahme nach eBuSy sollte mehrstufig und nachvollziehbar ablaufen:

1. Hauptperson in eBuSy suchen.
2. Hauptperson mit bestehender eBuSy-Person verknuepfen oder neu anlegen.
3. Jede Zusatzperson einzeln in eBuSy suchen.
4. Jede Zusatzperson einzeln verknuepfen oder neu anlegen.
5. Mitgliedschaften je Person anlegen oder aktualisieren.
6. Beitrags-/Attributzuordnung je Person setzen, sobald das Mapping fachlich bestaetigt ist.
7. Familien-, Haushalts- oder Zahlerbezug herstellen, falls eBuSy dafuer eine sichere schreibbare API anbietet.
8. Interne Freigabe abschliessen.
9. Erst danach PDF-Zusammenfassung erzeugen und Bestaetigungs-E-Mail versenden.

Wichtig: Bereits erfolgreich angelegte eBuSy-Personen sollten nicht automatisch zurueckgerollt werden. Wenn Schritt 4 oder 6 fehlschlaegt, muss der Vorgang in Supabase nachvollziehbar stehen bleiben und manuell fortsetzbar sein.

## 3. Vorgeschlagene Workflow-Status

Auf Antragsebene:

- `pending`
- `matching_main_person`
- `main_person_linked`
- `matching_additional_persons`
- `additional_persons_linked`
- `persons_created`
- `memberships_created`
- `attributes_set`
- `family_link_created`
- `confirmation_sent`
- `completed`
- `failed_requires_manual_review`

Alternativ kann fuer einen ersten Ausbau eine kuerzere Kette genutzt werden:

- `pending`
- `main_person_created`
- `additional_persons_created`
- `memberships_created`
- `family_link_created`
- `completed`
- `failed_requires_manual_review`

Zusaetzlich sollte jede einzelne Person und jeder technische Schritt einen eigenen Status bekommen. Sonst ist spaeter nicht sichtbar, ob z. B. die Hauptperson erfolgreich angelegt wurde, aber Kind 2 beim eBuSy-Abgleich haengt.

## 4. Sinnvolle Supabase-Struktur

### Kurzfristig

Das vorhandene JSON-Feld `family_members` kann weiter als Uebergang dienen.

Es sollte aber nicht als einziger Ort fuer den Uebernahmefortschritt genutzt werden. Workflow-Status, eBuSy-IDs und Fehler sollten eigene Felder oder eigene Tabellen bekommen.

### Antragsebene `applications`

Sinnvolle Zusatzfelder:

- `ebusy_takeover_workflow_status`
- `ebusy_takeover_started_at`
- `ebusy_takeover_completed_at`
- `ebusy_takeover_attempt`
- `ebusy_takeover_error`
- `primary_ebusy_person_id`
- `content_version_id`
- `household_group_key` als interne Gruppierung, falls spaeter hilfreich

### Normalisierte Personentabelle `application_persons`

Langfristig empfehlenswert:

- `id`
- `application_id`
- `role`, z. B. `main`, `partner`, `child`, `family_member`
- `sort_order`
- Stammdaten-Snapshot: Name, Geburtsdatum, Kontakt, Adresse
- `membership_kind`
- `is_primary_payer`
- `ebusy_person_id`
- `ebusy_match_status`
- `ebusy_match_payload`
- `ebusy_create_status`
- `ebusy_create_error`
- `created_at`
- `updated_at`

Damit kann jede Person einzeln gesucht, verknuepft, angelegt, wiederholt oder manuell geklaert werden.

### Schrittprotokoll `application_takeover_steps`

Fuer nachvollziehbare Batch-Logik:

- `id`
- `application_id`
- `application_person_id`
- `step_key`, z. B. `match_person`, `create_person`, `create_membership`, `set_attributes`, `link_family`, `send_confirmation`
- `status`, z. B. `pending`, `running`, `succeeded`, `failed`, `skipped`
- `attempt`
- `request_payload`
- `response_payload`
- `error_message`
- `started_at`
- `finished_at`

Die Payload-Felder sollten keine unnoetigen Secrets enthalten. Sie dienen nur dazu, spaeter nachvollziehen zu koennen, was an eBuSy gesendet wurde und wo ein Fehler entstanden ist.

### Mitgliedschaftsaktionen `application_membership_actions`

Fuer den spaeteren Mapping-Block:

- `id`
- `application_id`
- `application_person_id`
- `membership_option_value`, z. B. `family`
- `target_membership_type_id`
- `target_attribute_values`
- `target_section_ids`
- `status`
- `error_message`

Diese Tabelle trennt die fachliche Absicht vom tatsaechlichen API-Schritt.

## 5. Was die lokale eBuSy-API-Doku hergibt

Aus der lokalen OpenAPI-Datei sind folgende Punkte relevant:

- Personen koennen ueber `/general/persons`, `/general/person/by-id/{person_id}` gelesen und ueber `/general/person` angelegt werden.
- Attribute koennen ueber `/general/person/{person_id}/set-attributes` gesetzt werden. Dafuer werden konkrete Attribut-IDs und Werte benoetigt. Ohne bestaetigtes Mapping duerfen hier keine Werte geraten werden.
- Mitgliedschaften koennen ueber `/member/modules/{module_id}/membership` erstellt werden.
- Der lokale `Mitgliedschaftsdeskriptor` verlangt mindestens `begin`, `membershipTypeId` und `personId`.
- Mitgliedschaftsarten koennen ueber `/member/modules/{module_id}/membership-types` gelesen werden.
- Bei vollstaendiger Aktualisierung einer Mitgliedschaft warnt die API, dass nicht gesetzte Werte geloescht werden. Fuer spaetere Updates sollte deshalb bevorzugt eine Teilaktualisierung genutzt werden, falls die API diese fuer den benoetigten Fall anbietet.
- `paidByInfo` und `paysForInfo` sind in der Person-Struktur vorhanden, aber als `readonly` beschrieben.
- Die `Zahlungsbeziehung` enthaelt eine Personen-ID der Bezugsperson und Modul-Informationen. Es ist lokal aber kein eindeutiger schreibbarer Endpunkt fuer diese Zahlungsbeziehung erkennbar.

In der lokalen OpenAPI-Doku wurde kein klares Feld `membershipFeeTypes` als schreibbarer Bestandteil des Mitgliedschaftsdeskriptors gefunden. Aus frueheren lesenden Stichproben und den eBuSy-Screenshots ist aber sichtbar, dass eBuSy fachlich mit Mitgliedschaftsarten, Beitragsarten und Attributen arbeitet. Die finalen IDs und Schreibwege muessen vor produktiver Automatisierung bestaetigt werden.

## 6. Hinweise aus vorhandenen eBuSy-Screenshots und Lesedaten

Aus den vorhandenen Beispielen wirkt es so, als ob Familienbeitraege nicht allein ueber den Reiter `Hauptzahler` gepflegt werden. Der Reiter `Hauptzahler` war bei den gezeigten Familienmitgliedern nicht aktiv genutzt.

Stattdessen waren in den Beispielen Attribute bzw. Auswahlfelder sichtbar:

- Hauptzahler/Familienbeitrag: `Status Quo - Beitragsarten TENNIS RW` = `3 Familienbeitrag`
- neue Beitragslogik: `Mitgliedsbeitraege NEU` = `Familien`
- beitragsfreie Familienangehoerige: `Status Quo - Beitragsarten TENNIS RW` = `9 beitragsfrei z.B. wg. Familienzugehoerigkeit`
- neue Beitragslogik: `Mitgliedsbeitraege NEU` = `Beitragsfreie Familienangehoerige`

Diese Werte sind fachliche Hinweise, aber noch kein sicheres technisches Mapping. Benoetigt werden die echten Attribut-IDs, Wert-IDs und die Entscheidung, welche Person bei Familie, Partner und `Erwachsene + 1 Kind` welchen Wert bekommt.

## 7. Automatisierbar, unklar, manuell

Voraussichtlich automatisierbar:

- Antrag mit mehreren Personen strukturiert speichern.
- Hauptperson und Zusatzpersonen einzeln in eBuSy suchen.
- Hauptperson und Zusatzpersonen einzeln in eBuSy anlegen oder verknuepfen.
- eBuSy-Personen-IDs pro Person in Supabase speichern.
- Mitgliedschaft pro Person vorbereiten, sobald `membershipTypeId`, Beginn, Status und Abteilung klar sind.
- Attribute setzen, sobald Attribut-IDs und Werte fachlich bestaetigt sind.

Noch unklar:

- Ob und wie `paidByInfo` / `paysForInfo` per API geschrieben werden koennen.
- Ob eBuSy eine eigene schreibbare Familien-/Haushaltsverknuepfung hat oder ob dies nur ueber Attribute und Beitragsarten abgebildet wird.
- Welche konkrete Mitgliedschaftsart fuer Hauptperson, Partner, Kind und beitragsfreie Familienmitglieder gesetzt werden soll.
- Ob Familien-/Partnerbeitraege ueber Mitgliedschaftsart, Attribute, Zahlungsart oder eine Kombination gepflegt werden.
- Ob Bankkonto und SEPA-Mandat direkt per API sauber gesetzt werden koennen. Die Personenanlage funktioniert aktuell bewusst ohne produktive Bank-/SEPA-Schreiblogik.

Bis zur Klaerung manuell oder pruefpflichtig:

- Familien-/Zahlerbezug setzen, falls kein sicherer API-Endpunkt existiert.
- Beitrags- und Attribut-Mapping final freigeben.
- Sonderfaelle wie getrennte Adressen, abweichender Kontoinhaber, bestehende Kinder im System oder doppelte Treffer.

## 8. Fehler- und Wiederaufnahmelogik

Der Uebernahmeprozess muss idempotent sein:

- Ein erneuter Klick darf keine bereits angelegte Person doppelt anlegen.
- Vor jedem Schreibschritt wird geprueft, ob fuer diese interne Person bereits eine `ebusy_person_id` gespeichert ist.
- Wenn eine Zusatzperson fehlschlaegt, bleiben erfolgreiche vorherige Schritte sichtbar.
- Der Antrag wechselt auf `failed_requires_manual_review`.
- Die Verwaltung zeigt an, welche Person oder welcher Schritt fehlgeschlagen ist.
- Nach manueller Korrektur kann genau der fehlgeschlagene Schritt erneut gestartet werden.

Beispiel: Hauptperson und Partner wurden angelegt, Kind 2 scheitert wegen mehrdeutigem Treffer. Dann duerfen Hauptperson und Partner nicht erneut erzeugt werden. Der Vorgang braucht einen klaren Status fuer Kind 2 und einen Wiederaufnahmebutton ab diesem Schritt.

## 9. Testfaelle fuer spaeter

- Einzelmitglied Erwachsene aktiv ohne Zusatzperson.
- Einzelmitglied passiv ohne Zusatzperson.
- Ehepartner/Lebenspartner: Hauptperson neu, Partner neu.
- Ehepartner/Lebenspartner: Hauptperson bestehend, Partner neu.
- Ehepartner/Lebenspartner: Hauptperson neu, Partner bestehend.
- Erwachsene + 1 Kind: Kind neu.
- Erwachsene + 1 Kind: Kind mit unsicherem Treffer ueber Geburtsdatum.
- Familie mit zwei Erwachsenen und einem Kind.
- Familie mit zwei Erwachsenen und mehreren Kindern.
- Familie mit abweichender Adresse bei einer Zusatzperson.
- Familie mit abweichendem Kontoinhaber.
- Fehler bei Zusatzperson 2, nachdem Hauptperson und Zusatzperson 1 schon in eBuSy angelegt wurden.
- Fehler beim Mitgliedschaftsschritt, nachdem alle Personen angelegt wurden.
- Fehler beim PDF- oder E-Mail-Schritt nach erfolgreicher eBuSy-Uebernahme.
- Wiederaufnahme nach manuellem Review ohne doppelte eBuSy-Anlage.

## 10. Naechste Klaerungen

Vom Vorstand bzw. eBuSy-Admin werden besonders benoetigt:

- Welche eBuSy-Attribute und Werte stehen fuer Familie, Partner, Kind, beitragsfreie Familienangehoerige und neue Beitragslogik?
- Welche Person bekommt bei Familie den beitragspflichtigen Wert und welche Personen bekommen beitragsfreie Werte?
- Wird der eBuSy-Reiter `Hauptzahler` im realen Prozess genutzt oder bewusst nicht?
- Gibt es in eBuSy einen separaten Familien-/Haushaltsbezug, der gepflegt werden muss?
- Welche Mitgliedschaftsart und welcher Status werden bei Kindern, Partnern und beitragsfreien Familienmitgliedern gesetzt?
- Wie werden SEPA-Mandat, Mandatsdatum und abweichender Kontoinhaber aktuell final gepflegt?

Erst wenn diese Punkte bestaetigt sind, sollte die Mitgliedschafts- und Familienuebernahme produktiv implementiert werden.
