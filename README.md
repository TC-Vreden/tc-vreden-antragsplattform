# Webapp-Prototyp

Diese Web-App ist die digitale Antragsplattform des TC Vreden fuer Mitgliedsantraege, interne Pruefung und eBuSy-Uebernahme.

## Aktueller Stand

- digitale Neuanmeldung
- Auswahlseite fuer Neuanmeldung oder Mitgliedschaftserweiterung
- Speicherung in Supabase
- interne Verwaltung mit Supabase-Benutzern, Rollen und Rechten
- eBuSy-Abgleich und kontrollierte eBuSy-Uebernahme
- PDF-Zusammenfassung und Bestaetigungs-E-Mail nach erfolgreicher eBuSy-Uebernahme
- optional interne Eingangsmail nach oeffentlicher Antragstellung

## Vor dem lokalen Start

- Dependencies installieren
- `.env.local` auf Basis von `.env.example` anlegen
- Supabase-, eBuSy- und Mail-ENV passend zum freigegebenen Projekt setzen
- vor Deployments den lokalen Doctor ausfuehren

## Hinweis

Die Dateien sind bewusst so angelegt, dass Test-/Pruefstrecken und produktive eBuSy-Schreibzugriffe getrennt bleiben.

## Codex-Projekt-Routing

Dieses Repository ist strikt an das TC-Vreden-Projekt gebunden. Vor Releases oder Deployments muss der lokale Doctor gruen sein:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1
```

Die lokale Einrichtung fuer Tokens und Secrets ist hier dokumentiert:

- [Codex Routing und lokale Secrets](docs/codex-routing-und-lokale-secrets.md)
- [Custom Domain verwaltung.tennisclub-vreden.de](docs/custom-domain-verwaltung.md)
- [Supabase Heartbeat Cron](docs/supabase-heartbeat-cron.md)

## Lokale eBuSy-Zugangsdaten

Lokale Zugangsdaten gehoeren in `.env.local`.

Diese Datei ist durch `.gitignore` vom Repository ausgeschlossen und soll nicht nach GitHub hochgeladen werden.

## Schutz interner Bereiche

Interne Seiten werden primaer ueber Supabase Auth, interne Benutzerrollen und Berechtigungen geschuetzt.

Der fruehere gemeinsame Basic-Auth-Zugang ist nur noch als Bootstrap-/Fallback vorgesehen. Nach erfolgreichem Admin-Bootstrap sollte in Vercel und lokal gesetzt werden:

- `INTERNAL_BASIC_AUTH_FALLBACK_ENABLED=false`

Nur solange der Fallback bewusst aktiv bleiben soll, werden zusaetzlich verwendet:

- `INTERNAL_ACCESS_USERNAME`
- `INTERNAL_ACCESS_PASSWORD`

Der interne Schutz betrifft insbesondere:

- `/verwaltung`
- `/api/ebusy/*`
