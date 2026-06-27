# Codex Routing und lokale Secrets

Stand: 27.06.2026

Diese Datei beschreibt die lokale Codex-Einrichtung fuer die TC-Vreden Antragsplattform. Das Projekt ist strikt vom Filter.Shop Cockpit getrennt.

## Projektanker

- Lokaler Ordner: `C:\Codex-Projekte\TC-Vreden\webapp-prototyp`
- GitHub: `https://github.com/TC-Vreden/tc-vreden-antragsplattform.git`
- Vercel-Projekt: `tennisclub-vreden`
- Vercel-Scope: `tc-vredens-projects`
- Supabase-Projekt: `xftnhnojaizyaecvtxcq`
- Live-URL bis DNS-Umstellung: `https://tennisclub-vreden.vercel.app`
- Ziel-Domain nach DNS-Umstellung: `https://verwaltung.tennisclub-vreden.de`

Massgeblich sind immer die lokalen Routing-Dateien:

- `.codex-project.json`
- `.vercel\project.json`
- `.deploy.local.ps1`
- Git-Remote `origin`

## Pflichtcheck

Vor Release oder Deployment:

```powershell
cd C:\Codex-Projekte\TC-Vreden\webapp-prototyp
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1
```

Der Doctor muss gruen sein. Wenn er rot ist, nicht deployen.

Der Doctor nutzt die projektlokalen Tokens aus `.deploy.local.ps1`, nicht globale CLI-Logins. Die GitHub-Pruefung nutzt `TCVREDEN_GITHUB_TOKEN` und Git mit OpenSSL-Transport, damit der Release nicht vom Windows Credential Manager oder SChannel abhaengt. Die Vercel-Pruefung startet die CLI mit einem temporaeren globalen Config-Ordner und entfernt nur blockierende Proxy-Variablen, die auf `127.0.0.1:9`, `localhost:9` oder `[::1]:9` zeigen.

## Release-Pfad

Fertige Implementierungen laufen ueber:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-release.ps1 -CommitMessage "TC-Vreden: kurze Beschreibung"
```

Dieser Pfad prueft Projekt-Routing, GitHub-Token, Lint, TypeScript, Build, Supabase-Migrationen, Git-Commit, Git-Push, Vercel-Production-Deploy, Live-Check und Handy-Benachrichtigung. Der Git-Push nutzt den projektlokalen `TCVREDEN_GITHUB_TOKEN` und OpenSSL-Git-Transport; Token und Authorization-Header werden in Fehlermeldungen redigiert. Wenn Codex den lokalen `.git`-Index in der Sandbox nicht beschreiben darf, erstellt der Release-Pfad automatisch einen temporaeren Git-Klon unter `%TEMP%`, kopiert den Arbeitsstand ohne lokale Secret-Dateien hinein und committet/pusht von dort.

`npm run build` laeuft ueber `scripts/next-build.mjs`. Der Wrapper startet intern `next build`, deaktiviert Telemetrie/Update-Hinweise und entfernt nur die bekannten blockierenden Codex-Proxy-Variablen. Lokal baut er in einer temporaeren Kopie unter `%TEMP%` und setzt dort `TC_VREDEN_DISABLE_NEXT_CLEAN=1`, damit Next in der Codex-Sandbox weder den vorhandenen `.next`-Ordner im Projekt rekursiv loescht noch Prozess-Worker startet, die dort mit `EPERM` blockiert sein koennen. Fuer diesen lokalen Codex-Build nutzt der Wrapper `next build --experimental-build-mode compile`; Lint und TypeScript laufen im Release-Skript explizit vor dem Build. Wenn der Compile erfolgreich war und danach nur der sandboxbedingte Next-Worker mit `spawn EPERM` blockiert, beendet der Wrapper den lokalen Build erfolgreich und weist darauf hin. Der vollstaendige Production-Build mit statischer Generierung laeuft beim anschliessenden Vercel-Deploy remote. Auf Vercel bleibt das normale Next-Verhalten aktiv, weil dort `VERCEL=1` gesetzt ist. `node_modules` wird fuer den Temp-Build als Junction eingebunden; `.git`, `.next`, `.deploy.local.ps1` und `supabase/.temp` werden nicht in die Temp-Kopie uebernommen.

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
- `TCVREDEN_GITHUB_TOKEN`
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
- Die Handy-Benachrichtigung wird ueber `C:\Codex-Projekte\TC-Vreden\_codex-scripts\notify-phone.cmd` geroutet. Dieser lokale Skriptordner ist nicht Teil des Git-Repositories. Wenn Windows PowerShell den ntfy-Aufruf nicht sauber ausfuehren kann, nutzt `codex-release.ps1` als Fallback Node `fetch` mit dem lokalen `NTFY_TOPIC`.
- eBuSy-Schreibtests sind echte Schreibzugriffe im TC-Vreden-eBuSy. Testdaten muessen klar markiert und spaeter manuell geloescht werden.
