# Supabase- und Vercel-Einrichtung

Stand: 29.04.2026

## Was bereits vorliegt

- GitHub-Repository:
  - `https://github.com/TC-Vreden/tc-vreden-antragsplattform`
- Supabase Project URL:
  - `https://xftnhnojaizyaecvtxcq.supabase.co`
- Supabase Publishable Key:
  - liegt vor und kann als `NEXT_PUBLIC_SUPABASE_ANON_KEY` verwendet werden

## Wichtiger Hinweis

Der Publishable Key ist fuer die Browser-App gedacht und darf in Vercel als oeffentliche Umgebungsvariable hinterlegt werden.

Nicht in Git einchecken:

- Service Role Key
- eBuSy-Passwoerter
- sonstige geheime Zugangsdaten

## Naechster Schritt 1: Supabase-Datenbank vorbereiten

Ihr muesst in Supabase einmal das Schema anlegen.

So geht es:

1. In Supabase das Projekt oeffnen.
2. Links auf `SQL Editor`.
3. `New query` oder `New SQL snippet` anklicken.
4. Den Inhalt aus dieser Datei einfuegen:
   - [schema.sql](F:/Onedrive/Dokumente/Codex/TC-Vreden/webapp-prototyp/supabase/schema.sql)
5. `Run` klicken.

Ergebnis:

- die Tabellen fuer den Prototypen werden angelegt
- der Statusverlauf ist vorbereitet
- Platz fuer eBuSy-Match-Ergebnisse ist vorbereitet

## Naechster Schritt 2: Vercel-Umgebungsvariablen setzen

In Vercel braucht ihr fuer den ersten Schritt mindestens:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EBUSY_MATCH_MODE`

Werte:

- `NEXT_PUBLIC_SUPABASE_URL`
  - `https://xftnhnojaizyaecvtxcq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - euer vorhandener Publishable Key
- `EBUSY_MATCH_MODE`
  - `mock`

So geht es:

1. In Vercel das Projekt anlegen oder oeffnen.
2. Auf `Settings`.
3. Auf `Environment Variables`.
4. Jede Variable einzeln anlegen.

## Naechster Schritt 3: GitHub-Repository mit Projektdateien fuellen

Sobald lokal Git sauber funktioniert oder ihr die Dateien anderweitig hochladet, sollte der Inhalt von:

- [webapp-prototyp](F:/Onedrive/Dokumente/Codex/TC-Vreden/webapp-prototyp)

in das GitHub-Repository uebernommen werden.

Wenn ihr lokal noch kein Git sauber nutzen koennt, gibt es zwei Wege:

- spaeter mit installiertem Git normal pushen
- oder Dateien direkt ueber die GitHub-Weboberflaeche hochladen

## Was danach direkt moeglich ist

Sobald die Projektdateien bei GitHub liegen und Vercel verbunden ist, koennen wir:

- das Formular an Supabase anschliessen
- die Vorstandsansicht mit echten Daten fuellen
- den Mock-eBuSy-Abgleich einbauen

## Was ich spaeter noch von euch brauche

Nicht sofort, aber bald:

- Supabase Service Role Key
- eBuSy-API-Zugangsdaten
- Corporate-Design-PDF
- spaeter Domain-Zuweisung fuer `antrag.tennisclub-vreden.de`
