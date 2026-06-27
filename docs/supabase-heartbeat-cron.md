# Supabase Heartbeat Cron

Stand: 25.06.2026

Supabase Free-Projekte koennen nach Inaktivitaet pausiert werden. Dieses Projekt nutzt deshalb einen sehr kleinen Vercel Cron Job, der einmal taeglich eine technische Heartbeat-Zeile in Supabase aktualisiert.

## Umsetzung

- Route: `/api/cron/supabase-heartbeat`
- Tabelle: `public.system_heartbeat`
- Vercel-Zeitplan: `0 1 * * *`
- Schutz: `Authorization: Bearer <CRON_SECRET>`
- Supabase-Zugriff:
  - serverseitiger Service-Role-Upsert auf `system_heartbeat`
  - zusaetzlicher anon/RPC-Aufruf `touch_system_heartbeat()`

Der Cron schreibt keine fachlichen Mitgliedsdaten. Er aktualisiert nur die feste Zeile `supabase-free-plan-heartbeat`.

Am 25.06.2026 kam trotz aktivem Service-Role-Heartbeat eine Supabase-Warnung wegen drohender Free-Plan-Pause. Deshalb laeuft der Cron jetzt frueher am Tag und nutzt zusaetzlich einen anonymen RPC-Aufruf. Das erzeugt eine normale Supabase-API-Aktivitaet ohne Zugriff auf Mitgliedsdaten. Eine Garantie gegen Free-Plan-Pausen ist das weiterhin nicht; die einzige Supabase-seitig garantierte Loesung ist ein bezahlter Plan.

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
