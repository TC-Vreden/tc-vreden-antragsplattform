# eBuSy-Prüfung: Anrede, E-Mail und Mehrpersonen-Anträge

Stand: 08.05.2026

## Anrede

Die lokal abgelegte eBuSy-OpenAPI-Datei enthält im `Personendeskriptor` das Feld
`salutation`.

Zulässige Werte laut OpenAPI:

- `FEMALE`
- `MALE`
- `NONE`

Die Anrede kann daher im Formular strukturiert erfasst, in Supabase gespeichert und bei
der eBuSy-Personenanlage als `salutation` mitgesendet werden. Das ist nicht mit dem
separaten eBuSy-Feld `gender` zu verwechseln.

## E-Mail-Unique-Frage

In der OpenAPI ist für `contact.email`, `user.email`, `user.username` und `user.name`
keine eindeutige Unique-Regel dokumentiert. Es ist daher aus der Doku nicht sicher
ableitbar, ob mehrere Personen dieselbe E-Mail-Adresse verwenden dürfen.

Eine kleine read-only Stichprobe über `/general/persons?offset=0&limit=200` hat nur
einen auswertbaren Datensatz ohne E-Mail-Wert geliefert. Daraus lässt sich keine
belastbare Aussage zur E-Mail-Eindeutigkeit ableiten.

Empfohlener kontrollierter Test:

1. Zwei klar erkennbare Testpersonen in eBuSy verwenden, keine echten Mitglieder.
2. Bei beiden dieselbe Kontakt-E-Mail eintragen oder per API anlegen, falls der
   Vorstand/eBuSy-Admin diesen Test ausdrücklich freigibt.
3. Danach prüfen:
   - akzeptiert eBuSy dieselbe `contact.email`?
   - akzeptiert eBuSy denselben Benutzernamen oder dieselbe Login-E-Mail?
   - wie verhält sich `/general/person/by-username/{username}` bei Dopplungen?
4. Testpersonen anschließend wieder bereinigen oder eindeutig als Test markieren.

Bis dahin sollte die Plattform gleiche E-Mail-Adressen im Formular zulassen, aber bei
der späteren eBuSy-Übernahme pro Person eigene Benutzerkennungen erzeugen.

## Mehrpersonen-Anträge

Aktuelles Risiko: Die bestehende produktive Personenanlage erzeugt genau eine eBuSy-Person
aus einem Antrag. Bei Familie, Ehepartner/Lebenspartner oder `Erwachsene + 1 Kind` wäre
ein direkter Klick auf `In eBuSy anlegen` fachlich unvollständig, weil nur die Hauptperson
angelegt würde.

Aktuelle Absicherung:

- Mehrpersonen-Anträge werden in der Verwaltung als solche markiert.
- Der Button `In eBuSy anlegen` bleibt für Einzelpersonen aktiv.
- Für Mehrpersonen-Anträge wird die automatische Einzelpersonen-Anlage gesperrt.
- Die Oberfläche zeigt stattdessen `Mehrpersonen-Anlage vorbereiten`.

Für die spätere sichere Routine fehlen weiterhin:

- technische Attribut-IDs und Wert-IDs für Familien, Ehepartner/Lebenspartner,
  beitragsfreie Familienangehörige und `Erwachsene + 1 Kind`
- fachliche Entscheidung, welche Person welchen Beitrags-/Attributwert erhält
- sichere Schreiblogik für Mitgliedschaften je Person
- Klärung, ob `paidByInfo` / `paysForInfo` nur readonly bleiben oder über einen anderen
  Endpunkt gesetzt werden können
- Klärung, ob der eBuSy-Reiter `Hauptzahler` genutzt werden soll oder ob die Abbildung
  ausschließlich über Beitragsattribute läuft

Nächste Testfälle:

- Einzelperson neu: Anlage in eBuSy funktioniert weiter
- Familie: Button ist gesperrt und Hinweis sichtbar
- Ehepartner/Lebenspartner: Button ist gesperrt und Hinweis sichtbar
- Erwachsene + 1 Kind: Button ist gesperrt und Hinweis sichtbar
- Mehrpersonen-Antrag mit bestehendem Treffer: Kandidatenliste bleibt prüfbar, aber keine
  blinde Einzelpersonen-Anlage
