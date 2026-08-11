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
   - [`supabase/schema.sql`](../supabase/schema.sql)
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

## Naechster Schritt 3: Repository klonen und lokal starten

Auf einem neuen Rechner reicht der normale GitHub-Workflow:

```powershell
git clone https://github.com/TC-Vreden/tc-vreden-antragsplattform.git
cd tc-vreden-antragsplattform
npm ci
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Die lokalen Secrets stehen in `.env.local`; produktive Secrets stehen in Vercel Environment Variables.

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
- spaeter Domain-Zuweisung fuer eine eigene Vereinsdomain, z. B. `app.tennisclub-vreden.de`
