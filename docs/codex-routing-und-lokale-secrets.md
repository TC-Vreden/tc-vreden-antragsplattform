# Codex Routing und lokale Secrets

Stand: 28.05.2026

Diese Datei beschreibt die lokale Codex-Einrichtung fuer die TC-Vreden Antragsplattform. Das Projekt ist strikt vom Filter.Shop Cockpit getrennt.

## Projektanker

- Lokaler Ordner: `F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp`
- GitHub: `https://github.com/TC-Vreden/tc-vreden-antragsplattform.git`
- Vercel-Projekt: `tennisclub-vreden`
- Vercel-Scope: `tc-vredens-projects`
- Supabase-Projekt: `xftnhnojaizyaecvtxcq`
- Live-URL: `https://tennisclub-vreden.vercel.app`

Massgeblich sind immer die lokalen Routing-Dateien:

- `.codex-project.json`
- `.vercel\project.json`
- `.deploy.local.ps1`
- Git-Remote `origin`

## Pflichtcheck

Vor Release oder Deployment:

```powershell
cd F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1
```

Der Doctor muss gruen sein. Wenn er rot ist, nicht deployen.

## Release-Pfad

Fertige Implementierungen laufen ueber:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-release.ps1 -CommitMessage "TC-Vreden: kurze Beschreibung"
```

Dieser Pfad prueft Projekt-Routing, Lint, Build, Supabase-Migrationen, Git-Commit, Git-Push, Vercel-Production-Deploy, Live-Check und Handy-Benachrichtigung.

## Lokale Dateien fuer Secrets

Secrets duerfen nie in Git. Zwei lokale Dateien sind vorgesehen:

- `.deploy.local.ps1` fuer Release-/CLI-Tokens
- `.env.local` fuer lokale Runtime-Secrets der Next.js-App

Beide Dateien sind gitignored.

## `.deploy.local.ps1`

Aus Vorlage erstellen:

```powershell
Copy-Item .\.deploy.local.example.ps1 .\.deploy.local.ps1
notepad .\.deploy.local.ps1
```

Eintragen:

- `VERCEL_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Alternative zu `SUPABASE_ACCESS_TOKEN` plus `SUPABASE_DB_PASSWORD`:

- `SUPABASE_DB_URL`

## `.env.local`

Diese Werte muessen lokal vorhanden sein, damit Codex die Verwaltungsfunktionen und Serverpfade ohne Rueckfragen testen kann:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_ACCESS_USERNAME`
- `INTERNAL_ACCESS_PASSWORD`
- `CRON_SECRET`
- `EBUSY_API_BASE_URL`
- `EBUSY_API_USERNAME`
- `EBUSY_API_PASSWORD`
- `EBUSY_MATCH_MODE`

Optional:

- `EBUSY_TEST_LAB_WRITE_ENABLED=true` nur fuer bewusste echte eBuSy-Schreibtests
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`

## Sicherheitsregeln

- Keine Filter.Shop-Dateien verwenden.
- Keine globalen Vercel- oder Supabase-Logins als Quelle der Wahrheit verwenden.
- Wenn `.deploy.local.ps1` fehlt, nicht deployen.
- Wenn `codex-doctor.ps1` fehlschlaegt, nicht deployen.
- eBuSy-Schreibtests sind echte Schreibzugriffe im TC-Vreden-eBuSy. Testdaten muessen klar markiert und spaeter manuell geloescht werden.
