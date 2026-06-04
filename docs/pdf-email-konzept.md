# PDF- und E-Mail-Konzept

Stand: 04.06.2026

Dieses Dokument beschreibt die Zielrichtung und den aktuellen Umsetzungsstand. Der Code erzeugt inzwischen nach erfolgreicher eBuSy-Uebernahme eine PDF-Zusammenfassung und eine Bestaetigungs-E-Mail, wenn die Mail-ENV aktiv ist. Beim oeffentlichen Absenden wird weiterhin keine Antragsteller-Bestaetigung verschickt; optional ist dort nur eine interne Eingangsmail an das Vereinspostfach vorgesehen.

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
- SEPA-Daten, z. B. Kontoinhaber, IBAN, Mandatszustimmung und digitales Mandatsdatum
- bestaetigte Pflichttexte mit Textversion
- Foto-/Videoeinwilligung ja/nein
- WhatsApp-/Kommunikationseinwilligung ja/nein
- Datenschutzhinweise / DSGVO-Kenntnisnahme
- eBuSy-Personen-ID nach Uebernahme
- Hinweis, dass die Mitgliedschafts- und Beitragsdaten in eBuSy bzw. durch die Vereinsverwaltung final gepflegt werden

Datenschutzabwaegung: Eine maskierte IBAN reduziert das Risiko bei weitergeleiteten oder dauerhaft gespeicherten E-Mail-Anhaengen. Fachliche Entscheidung vom 04.06.2026: Die PDF-/Mail-Zusammenfassung an Antragsteller und Verein darf die vollstaendige IBAN zeigen, weil sie als Nachweisdokument fuer die selbst angegebenen Bankdaten dient. Der Versand muss deshalb als sensibler Mailversand behandelt werden: korrekter Empfaenger, begrenztes BCC, TLS-faehiger Provider und keine unnoetige Weiterleitung.

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

## 8. Noch offen vor Produktiv-Abnahme

- finale Vereinsadresse fuer BCC
- Absenderadresse und Reply-To
- Entscheidung Resend/API-Maildienst oder SMTP
- Testadresse und echter Mailprovider in Vercel abnehmen
- rechtliche Freigabe der Pflichttexte und der digitalen Bestaetigungsstrecke
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

Wichtig: Beim oeffentlichen Absenden des Formulars wird weiterhin kein Antragsteller-PDF erzeugt und keine Antragsteller-Bestaetigung verschickt. Die Vorschau und der echte Versand bilden den Zielzeitpunkt nach interner Pruefung und erfolgreicher eBuSy-Uebernahme ab.

## 10. Interne Eingangsmail nach Antragstellung

Stand: 12.05.2026

Zusaetzlich zur spaeteren Bestaetigungsmail ist eine interne Benachrichtigung vorbereitet.

Ziel:

- Sobald ein Antrag erfolgreich in Supabase gespeichert wurde, kann das Vereinspostfach eine kurze E-Mail erhalten.
- Die E-Mail weist darauf hin, dass ein neuer Antrag im Verwaltungsportal geprueft und spaeter nach eBuSy uebernommen werden muss.
- Die E-Mail enthaelt nur eine kurze strukturierte Zusammenfassung: Vorgangs-ID, Eingang, Hauptperson, Mitgliedschaft, Kontakt, Adresse, Zusatzpersonen und Einwilligungsstatus.
- Es wird dabei kein PDF erzeugt und keine Bestaetigung an den Antragsteller verschickt.

Technik:

- Helfer: `src/lib/application-notification-email.ts`
- Ausloesung: `src/app/api/applications/route.ts`, direkt nach erfolgreicher Speicherung und eBuSy-Erstabgleich.
- Versandweg: wahlweise SMTP oder Resend.
- Fuer die bestehende Vereins-Mailbox bei All-Inkl ist SMTP vorgesehen.
- Fehler beim Mailversand blockieren die Antragsspeicherung nicht. Sie werden serverseitig protokolliert.

Noetige ENV-Variablen fuer Aktivierung mit All-Inkl / SMTP:

- `APPLICATION_NOTIFICATION_EMAIL_ENABLED=true`
- `MAIL_PROVIDER=smtp`
- `SMTP_HOST`, z. B. der Servername aus All-Inkl/KAS
- `SMTP_PORT`, meistens `465` bei SSL/TLS
- `SMTP_SECURE=true`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM`, z. B. `TennisClub Vreden e.V. <mail@tennisclub-vreden.de>`
- `MAIL_TO_CLUB`, z. B. das Vereinspostfach
- optional `MAIL_REPLY_TO`
- optional `ADMIN_PORTAL_URL`, z. B. `https://antrag-tennisclub-vreden.vercel.app/verwaltung`

Alternative Aktivierung ueber Resend:

- `APPLICATION_NOTIFICATION_EMAIL_ENABLED=true`
- `MAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_TO_CLUB`
- optional `MAIL_REPLY_TO`
- optional `ADMIN_PORTAL_URL`

Ohne `APPLICATION_NOTIFICATION_EMAIL_ENABLED=true` bleibt die Eingangsmail absichtlich aus. Dadurch kann lokal und in Vercel weiter getestet werden, ohne versehentlich echte Mails zu versenden.

Empfohlene Aktivierung mit All-Inkl:

1. SMTP-Daten im All-Inkl/KAS fuer das bestehende Vereinspostfach heraussuchen.
2. ENV-Variablen in Vercel setzen.
3. Erst mit einer Testadresse als `MAIL_TO_CLUB` pruefen.
4. Danach `MAIL_TO_CLUB` auf das echte Vereinspostfach umstellen.
5. Einen Testantrag absenden und pruefen, ob die Eingangsmail ankommt.

Hinweis: IMAP ist nur fuer das Abrufen von E-Mails relevant. Fuer diese Plattform wird SMTP benoetigt, weil die Anwendung aktiv E-Mails versenden soll.

## 11. Bestaetigungsmail nach eBuSy-Uebernahme

Stand: 04.06.2026

Die Bestaetigungsmail an den Antragsteller wird nicht beim oeffentlichen Absenden versendet, sondern nach erfolgreicher interner eBuSy-Uebernahme. Sie enthaelt eine freundliche Du-Form-Mail und die erzeugte PDF-Zusammenfassung als Anhang.

Technik:

- Helfer: `src/lib/application-confirmation-email.ts`
- PDF: `src/lib/application-confirmation-pdf.ts`
- Ausloesung: erfolgreicher Uebernahmepfad in `src/lib/verwaltung.ts`
- Empfaenger: Antragsteller-E-Mail aus dem Antrag
- BCC: `MAIL_CONFIRMATION_BCC`, sonst `MAIL_TO_CLUB`, sonst Vereinskontakt

Noetige ENV-Variablen:

- `APPLICATION_CONFIRMATION_EMAIL_ENABLED=true`
- `MAIL_PROVIDER=smtp` oder `MAIL_PROVIDER=resend`
- `MAIL_FROM`
- bei SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`
- bei Resend: `RESEND_API_KEY`
- optional `MAIL_REPLY_TO`
- optional `MAIL_CONFIRMATION_BCC`

Wenn `APPLICATION_CONFIRMATION_EMAIL_ENABLED` nicht gesetzt ist, faellt der Code derzeit auf `APPLICATION_NOTIFICATION_EMAIL_ENABLED` zurueck. Fuer den Produktivbetrieb sollte die Bestaetigungsmail trotzdem bewusst separat aktiviert und getestet werden.
