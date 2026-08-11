# TC-Vreden Antragsplattform

Digitale Antragsplattform des TC Vreden fuer Mitgliedsantraege, interne Pruefung und eBuSy-Uebernahme.

## Funktionen

- digitale Neuanmeldung und Mitgliedschaftserweiterung
- Speicherung und Statusverwaltung in Supabase
- interne Verwaltung mit Supabase-Benutzern, Rollen und Rechten
- eBuSy-Abgleich und kontrollierte eBuSy-Uebernahme
- PDF-Zusammenfassung und Bestaetigungs-E-Mail nach erfolgreicher eBuSy-Uebernahme
- optional interne Eingangsmail nach oeffentlicher Antragstellung

## Lokaler Start

```powershell
npm ci
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Die Werte in `.env.local` muessen zum freigegebenen Supabase-, eBuSy- und Mail-Setup passen. `.env.local` ist gitignored und darf nicht committed werden.

## Pruefung Vor Push Oder Deployment

```powershell
npm run lint
npm run typecheck
npm run build
```

Deployments laufen nicht mehr ueber projektlokale Sonder-Skripte. Nutze einen normalen GitHub-/Vercel-Workflow oder die Vercel CLI mit dem korrekt verlinkten Projekt.

## Projektziele

Die Dateien sind bewusst so angelegt, dass lokale Tests, produktive eBuSy-Schreibzugriffe und geheime Zugangsdaten getrennt bleiben. Produktive Secrets gehoeren in Vercel Environment Variables, lokale Secrets in `.env.local`.

## Weitere Dokumentation

- [Custom Domain verwaltung.tennisclub-vreden.de](docs/custom-domain-verwaltung.md)
- [Supabase Heartbeat Cron](docs/supabase-heartbeat-cron.md)
- [Supabase- und Vercel-Einrichtung](docs/supabase-vercel-einrichtung.md)

## Schutz Interner Bereiche

Interne Seiten werden primaer ueber Supabase Auth, interne Benutzerrollen und Berechtigungen geschuetzt.

Der fruehere gemeinsame Basic-Auth-Zugang ist nur noch als Bootstrap-/Fallback vorgesehen. Nach erfolgreichem Admin-Bootstrap sollte in Vercel und lokal gesetzt werden:

- `INTERNAL_BASIC_AUTH_FALLBACK_ENABLED=false`

Nur solange der Fallback bewusst aktiv bleiben soll, werden zusaetzlich verwendet:

- `INTERNAL_ACCESS_USERNAME`
- `INTERNAL_ACCESS_PASSWORD`

Der interne Schutz betrifft insbesondere:

- `/verwaltung`
- `/api/ebusy/*`
