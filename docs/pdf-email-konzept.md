# PDF- und E-Mail-Konzept

Stand: 06.05.2026

Dieses Dokument beschreibt die vorbereitete Zielrichtung. Im aktuellen Prototyp werden noch kein PDF erzeugt und keine E-Mail versendet.

## 1. Gewuenschter Ausloesepunkt

Der PDF- und E-Mail-Prozess soll nicht beim oeffentlichen Absenden des Formulars starten.

Geplanter Ablauf:

1. Antragsteller fuellt das Formular aus.
2. Antrag wird intern in Supabase gespeichert.
3. Verwaltung prueft den Antrag.
4. Verwaltung gibt den Antrag frei bzw. uebernimmt ihn nach eBuSy.
5. Erst nach erfolgreicher interner Freigabe / Uebernahme werden PDF-Zusammenfassung und Bestaetigungs-E-Mail erzeugt.

Damit bleibt der oeffentliche Antrag zunaechst ein interner Pruefvorgang. Die Bestaetigung an den Antragsteller sagt dann nicht nur "eingegangen", sondern "erfolgreich uebernommen".

## 2. Inhalt der PDF-Zusammenfassung

Die PDF-Zusammenfassung sollte als Nachweisdokument fuer Antragsteller und Verein dienen.

Enthalten sein sollten:

- Vorgangs-ID
- Zeitstempel der Antragstellung
- Zeitstempel der internen Freigabe / Uebernahme
- Stammdaten des Antragstellers
- Kontakt- und Adressdaten
- Mitgliedschafts- und Beitragsauswahl
- Nachweisdatum fuer Schueler / Azubi / Student, falls angegeben
- Familienangehoerige / Familienbezug
- gesetzliche Vertreter und Minderjaehrigen-Zustimmung, falls betroffen
- SEPA-Daten soweit sinnvoll, z. B. Kontoinhaber, IBAN maskiert, Mandatszustimmung
- bestaetigte Pflichttexte mit Textversion
- Foto-/Videoeinwilligung ja/nein
- WhatsApp-/Kommunikationseinwilligung ja/nein
- Datenschutzhinweise / DSGVO-Kenntnisnahme
- eBuSy-Personen-ID nach Uebernahme
- Hinweis, dass die Mitgliedschafts- und Beitragsdaten in eBuSy bzw. durch die Vereinsverwaltung final gepflegt werden

IBAN sollte in der PDF fuer E-Mail-Anhaenge vorzugsweise maskiert werden, z. B. nur Laenderkennung, Pruefziffer und die letzten vier Zeichen sichtbar. Vollstaendige Bankdaten koennen intern in Supabase/eBuSy vorliegen, sollten aber nicht unnoetig per E-Mail verteilt werden.

## 3. Vereinsdesign fuer PDF und Mail

Aus `TCV-Designlines.pdf`:

- Gelb: `#ffde00`
- Grau: `#d0d0cf`
- Schwarz: `#000000`
- Weiss: `#ffffff`
- Schriftfamilie: PT Sans Regular / PT Sans Bold

Empfehlung fuer das PDF:

- Kopfbereich mit Vereinslogo, gelbem Akzentbalken und Dokumenttitel
- klare Abschnitte fuer Stammdaten, Mitgliedschaft, SEPA, Einwilligungen, Datenschutz
- Fusszeile mit `TennisClub Vreden e.V. | Ottensteiner Str. 59 | 48691 Vreden`
- Kontaktzeile `mail@tennisclub-vreden.de | www.tennisclub-vreden.de`
- keine werbliche Gestaltung, sondern ein gut lesbares Nachweisdokument

Empfehlung fuer die HTML-Mail:

- schmaler, responsiver Inhalt mit weissem Hintergrund
- gelber Akzent am Kopf
- freundliche persoenliche Anrede
- kurzer Hinweis, dass der Antrag erfolgreich uebernommen wurde
- Hinweis auf die angehaengte PDF-Zusammenfassung
- kurzer Hinweis auf Widerrufbarkeit freiwilliger Einwilligungen
- Vereinskontakt / Signatur
- BCC an Vereinsadresse

## 4. Sinnvolle Supabase-Statusfelder

Fuer die spaetere Freigabe- und Versandstrecke waeren zusaetzliche Felder sinnvoll:

- `approval_status` mit Werten wie `pending`, `approved`, `rejected`, `needs_clarification`
- `approved_at`
- `approved_by`
- `ebusy_takeover_status`
- `ebusy_takeover_at`
- `legal_text_version`
- `confirmation_pdf_status` mit Werten wie `pending`, `generated`, `failed`
- `confirmation_pdf_path`
- `confirmation_pdf_generated_at`
- `confirmation_pdf_error`
- `confirmation_email_status` mit Werten wie `pending`, `sent`, `failed`
- `confirmation_email_sent_at`
- `confirmation_email_message_id`
- `confirmation_email_error`
- `confirmation_retry_count`

Wichtig: eBuSy-Uebernahme, PDF-Erzeugung und E-Mail-Versand sollten technisch getrennte Status bekommen. Sonst ist spaeter nicht klar, welcher Teil genau fehlgeschlagen ist.

## 5. Benoetigte ENV-Variablen

Fuer die spaetere produktive Aktivierung werden voraussichtlich benoetigt:

- `MAIL_FROM`
- `MAIL_REPLY_TO`
- `MAIL_BCC`
- `MAIL_PROVIDER`
- `RESEND_API_KEY` bei Resend
- alternativ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`
- `PDF_STORAGE_BUCKET`
- `PUBLIC_CLUB_NAME`
- `PUBLIC_CLUB_WEBSITE_URL`
- `PUBLIC_CLUB_CONTACT_EMAIL`

Die vorhandenen eBuSy- und Supabase-Variablen bleiben davon getrennt.

## 6. Library-Empfehlung fuer Next.js / Vercel

PDF:

- `@react-pdf/renderer` ist geeignet, wenn das PDF deklarativ aus React-Komponenten aufgebaut werden soll.
- `pdf-lib` ist geeignet, wenn spaeter ein bestehendes PDF-Template befuellt oder zusammengesetzt werden soll.

E-Mail:

- `react-email` fuer gut wartbare HTML-Mail-Templates.
- `resend` als einfacher Mailversand im Vercel-Kontext.
- `nodemailer` ist moeglich, wenn ein klassischer SMTP-Zugang des Vereins genutzt werden soll.

Empfehlung fuer dieses Projekt: `@react-pdf/renderer` fuer das Nachweis-PDF und `react-email` + `resend` fuer die erste produktionsnahe Mailstrecke. Falls der Verein zwingend ueber eine bestehende Mailbox senden will, stattdessen `nodemailer` mit SMTP.

## 7. Fehlerfaelle

Wichtigster Fall: eBuSy-Uebernahme erfolgreich, aber PDF oder E-Mail schlaegt fehl.

Empfohlene Behandlung:

- eBuSy-Uebernahme nicht automatisch zurueckrollen.
- Antrag in Supabase auf Status `taken_over_confirmation_failed` oder vergleichbar setzen.
- Fehlermeldung in `confirmation_pdf_error` oder `confirmation_email_error` speichern.
- In der Verwaltung einen Button `Bestaetigung erneut senden` anbieten.
- PDF-Erzeugung und E-Mail-Versand idempotent bauen: erneuter Klick darf nicht doppelte eBuSy-Anlagen erzeugen.
- Wenn PDF erzeugt wurde, aber E-Mail scheitert, PDF-Pfad behalten und nur E-Mail erneut versuchen.
- BCC-Versand an Vereinsadresse als Teil der gleichen Mail pruefen; bei Mailfehler gesamtes Mailereignis als fehlgeschlagen protokollieren.

## 8. Noch offen vor Umsetzung

- finale Vereinsadresse fuer BCC
- Absenderadresse und Reply-To
- Entscheidung Resend/API-Maildienst oder SMTP
- finales PDF-Layout mit Logo/Briefkopf
- rechtliche Freigabe der Pflichttexte und der digitalen Bestaetigungsstrecke
- Entscheidung, ob die vollstaendige oder maskierte IBAN in das PDF fuer den Antragsteller aufgenommen wird
- Entscheidung, wie eBuSy-Benutzerpasswoerter spaeter an Mitglieder kommuniziert oder zurueckgesetzt werden

## 9. Optische Vorschau im Prototyp

Stand: 11.05.2026

Es gibt jetzt eine interne Vorschauseite unter `/verwaltung/bestaetigung-vorschau`.

Diese Vorschau ist noch kein produktiver PDF- oder Mailversand. Sie dient dazu, mit vollstaendig ausgefuellten Testdaten zu pruefen:

- ob die spaetere PDF-Zusammenfassung gut lesbar und ablagefaehig ist
- ob Logo, Vereinsfarben und Dokumentstruktur zum TennisClub-Vreden-Design passen
- ob die Inhalte aus Mitgliedsantrag, Beitragsuebersicht, Jugendtraining-Information und Datenschutz-/Einwilligungstexten sinnvoll zusammengefuehrt sind
- wie die spaetere HTML-Bestaetigungsmail aussehen kann

Technisch vorbereitet:

- zentrale Testdaten und Textbloecke in `src/lib/confirmation-document.ts`
- interne Vorschauseite in `src/app/verwaltung/bestaetigung-vorschau/page.tsx`
- Druck-/PDF-Vorschau ueber den Browserdruck

Wichtig: Beim oeffentlichen Absenden des Formulars wird weiterhin kein PDF erzeugt und keine E-Mail verschickt. Die Vorschau bildet den Zielzeitpunkt nach interner Pruefung und erfolgreicher eBuSy-Uebernahme ab.
