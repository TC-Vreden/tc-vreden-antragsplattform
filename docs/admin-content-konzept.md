# Konzept: bearbeitbare Formular- und Rechtstexte

Stand: 06.05.2026

Ziel dieses Konzepts ist, dass der Vorstand spaeter Mitgliedschaftsarten, Preise, sichtbare Labels, Hinweise, Akkordeontexte, Einwilligungen und PDF-Texte selbst pflegen kann, ohne dass jede Textaenderung als Codeaenderung umgesetzt werden muss.

## 1. Grundsatz

Die fachlichen Inhalte sollten mittelfristig nicht hart im Code stehen.

Stattdessen sollte es eine zentrale Inhaltsquelle geben, aus der mehrere Ausgabekanale gespeist werden:

- oeffentliches Formular
- interne Verwaltung
- PDF-Zusammenfassung
- Bestaetigungs-E-Mail
- spaetere Versionierung / Nachweisfuehrung

Wichtig ist dabei: Was ein Antragsteller bestaetigt, muss spaeter exakt nachvollziehbar sein. Deshalb brauchen Rechtstexte und Einwilligungen Versionen.

## 2. Inhalte, die zentral gepflegt werden sollten

Mitgliedschaft / Beitraege:

- technischer Wert, z. B. `adult_active`
- sichtbares Label
- Jahresbeitrag
- Status aktiv/passiv
- Sortierung
- gueltig ab / gueltig bis
- Sichtbarkeit im Formular
- ob Zusatzpersonen erforderlich sind
- Typ der Zusatzpersonen, z. B. Partner, Kind, Familie
- Mindest- und Maximalanzahl Zusatzpersonen

Formulartexte:

- Hilfetexte an Feldern
- Akkordeontexte fuer Beitraege, SEPA, Satzung, Datenschutz, Foto/Video, WhatsApp
- Hinweise zum Jugendtraining
- Hinweis zur Platzpflegeordnung; aktueller Link im Formular: `https://tennisclub-vreden.de/wp-content/uploads/2026/04/TennisClubVreden-Platzpflegeordnung-2026-1.pdf`

Recht / Nachweis:

- Pflichtbestaetigung Satzung / Beitraege / Datenschutz
- DSGVO-Text
- Foto-/Videoeinwilligung
- WhatsApp-Einwilligung
- Minderjaehrigen-Zusatzerklaerung
- SEPA-Mandatstext
- Widerrufshinweise
- Version und Gueltigkeit der jeweiligen Textfassung

PDF / E-Mail:

- PDF-Titel
- Abschnittsueberschriften
- Einleitungstext
- E-Mail-Betreff
- E-Mail-Begruessung
- E-Mail-Schlusstext / Signatur
- BCC-Adresse nicht als Inhalt, sondern als ENV-/Systemkonfiguration

## 3. Vorschlag fuer Supabase-Datenstruktur

### `content_versions`

Versioniert rechtlich relevante Textstaende.

- `id`
- `key`, z. B. `membership_application_2026`
- `label`
- `version`
- `valid_from`
- `valid_until`
- `status`, z. B. `draft`, `active`, `archived`
- `created_at`
- `created_by`
- `approved_at`
- `approved_by`

### `membership_options`

Pflegt die sichtbaren und fachlichen Mitgliedschaftsoptionen.

- `id`
- `value`, z. B. `adult_active`
- `label`
- `price_cents`
- `price_label`
- `status`, z. B. `active`, `passive`, `none`
- `sort_order`
- `is_active`
- `valid_from`
- `valid_until`
- `requires_additional_members`
- `additional_member_relation`, z. B. `partner`, `child`, `family_member`
- `min_additional_members`
- `max_additional_members`
- `content_version_id`

Die technischen `value`-Werte sollten stabil bleiben, weil Supabase, eBuSy-Mapping und Auswertungen daran haengen.

### `legal_text_blocks`

Pflegt Textbloecke, die bestaetigt und spaeter im PDF nachgewiesen werden.

- `id`
- `content_version_id`
- `key`, z. B. `privacy`, `sepa`, `photo_video`, `whatsapp`, `minor_consent`
- `title`
- `body_markdown`
- `is_required`
- `requires_checkbox`
- `sort_order`
- `valid_from`
- `valid_until`

Markdown waere fuer den Anfang ausreichend und sicherer als ein vollstaendiger WYSIWYG-Editor. Spaeter kann daraus ein komfortabler Editor entstehen.

### `form_content_blocks`

Pflegt nicht zwingend rechtliche, aber sichtbare Formularhinweise.

- `id`
- `content_version_id`
- `key`
- `title`
- `body_markdown`
- `placement`, z. B. `membership_accordion`, `youth_training_hint`
- `sort_order`
- `is_active`

### Erweiterung `applications`

Antraege sollten speichern, welche Textversion bestaetigt wurde:

- `content_version_id`
- `accepted_legal_text_snapshot` als JSONB
- optional spaeter `household_members` oder `additional_members` als eigener JSONB-Name

Aktuell kann das vorhandene Feld `family_members` als Uebergangsstruktur fuer Zusatzpersonen genutzt werden. Langfristig waere `additional_members` oder `household_members` sprechender, weil dort nicht nur Familienmitglieder, sondern auch Ehepartner/Lebenspartner oder Kinder erfasst werden.

## 4. Bearbeitungsoberflaeche

Ein erster Verwaltungsbereich sollte schlicht bleiben:

- Liste der aktiven Mitgliedschaftsoptionen
- Preis / Label / Sichtbarkeit bearbeiten
- Textbloecke in Markdown bearbeiten
- Vorschau fuer Formular und PDF-Abschnitt
- Entwurfsstatus und Aktivierung
- Hinweis, dass aktive Rechtstexte nicht still ueberschrieben, sondern versioniert werden

Ein grosser WYSIWYG-Editor ist nicht sofort noetig. Ein Markdown-Feld mit Vorschau waere fuer den Verein wahrscheinlich robuster und leichter zu kontrollieren.

## 5. Gemeinsame Textquelle fuer Formular und PDF

Formular und PDF sollten dieselben geladenen Textbloecke verwenden:

- Formular zeigt den Text im Akkordeon.
- Antrag speichert die bestaetigte Textversion.
- PDF rendert dieselbe Textversion oder einen gespeicherten Snapshot.
- E-Mail verweist auf die PDF-Zusammenfassung.

Dadurch entsteht kein Auseinanderlaufen zwischen Formulartext und spaeterem Nachweisdokument.

## 6. Empfohlene Reihenfolge

1. Aktuelle Textbloecke im Code stabilisieren.
2. Supabase-Tabellen fuer `content_versions`, `membership_options`, `legal_text_blocks` und `form_content_blocks` vorbereiten.
3. Formular zunaechst lesend aus Supabase laden, mit Code-Fallback.
4. PDF aus derselben Quelle rendern.
5. Interne Bearbeitungsoberflaeche mit Markdown und Vorschau bauen.
6. Aktivierungs-/Freigabeprozess fuer neue Textversionen einfuehren.
