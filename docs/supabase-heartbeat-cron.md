# Supabase Heartbeat Cron

Stand: 28.05.2026

Supabase Free-Projekte koennen nach Inaktivitaet pausiert werden. Dieses Projekt nutzt deshalb einen sehr kleinen Vercel Cron Job, der einmal taeglich eine einzelne Zeile in Supabase aktualisiert.

## Umsetzung

- Route: `/api/cron/supabase-heartbeat`
- Tabelle: `public.system_heartbeat`
- Vercel-Zeitplan: `0 6 * * *`
- Schutz: `Authorization: Bearer <CRON_SECRET>`

Der Cron schreibt keine fachlichen Mitgliedsdaten. Er aktualisiert nur die feste Zeile `supabase-free-plan-heartbeat`.

## Einrichtung

`CRON_SECRET` muss an zwei Stellen gleich gesetzt werden:

- lokal in `.env.local`
- in Vercel beim Projekt `tennisclub-vreden` als Environment Variable fuer Production

Ein lokales Secret kann so erzeugt werden:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Danach laeuft der normale Release-Pfad:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-release.ps1 -CommitMessage "TC-Vreden: add Supabase heartbeat cron"
```

## Manueller Test nach Deployment

Mit dem Secret kann die Route manuell getestet werden:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Uri "https://tennisclub-vreden.vercel.app/api/cron/supabase-heartbeat" -Headers $headers
```

Die Antwort sollte `ok: true` enthalten.
