# Handover fuer neuen Thread: TC-Vreden Rechte- und Rollensystem

Stand: 28.05.2026

Diese Datei ist der Startpunkt fuer einen neuen Codex-Thread zum Baustein **Rechte- und Rollensystem** der digitalen Mitgliedsantragsplattform des TennisClub Vreden.

## Kopierfertiger Starttext fuer den neuen Thread

```text
Wir arbeiten ausschliesslich am Projekt TC-Vreden / digitale Mitgliedsantragsplattform fuer den Tennisclub Vreden.

Wichtig: Dieses Projekt ist NICHT das Filter.Shop Cockpit. In meinem Codex-Setup gibt es mehrere getrennte Projekte. Du darfst in diesem Thread nichts am Filter.Shop-Cockpit-Projekt lesen, aendern, committen, pushen oder deployen, ausser ich fordere dich ausdruecklich dazu auf.

Arbeite im Projektordner:
F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp

Lies zuerst, bevor du irgendetwas aenderst:
F:\Onedrive\Dokumente\Codex\AGENTS.md
F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp\AGENTS.md
F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp\.codex-project.json
F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp\docs\handover-rechte-rollensystem-thread.md
F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp\src\app\verwaltung\handbuch\content.ts

Startcheck, bevor du aenderst:
- git status --short --branch
- git remote -v
- git branch --show-current
- .codex-project.json lesen
- .vercel\project.json lesen
- powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1

Erwartetes Routing:
- Lokaler Ordner: F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp
- GitHub: https://github.com/TC-Vreden/tc-vreden-antragsplattform.git
- Branch: main
- Vercel-Projekt: antrag-tennisclub-vreden
- Vercel-Scope: tc-vredens-projects
- Supabase-Projekt: xftnhnojaizyaecvtxcq / tennisclub-vreden
- Live-URL: https://antrag-tennisclub-vreden.vercel.app

Ziel dieses neuen Threads:
Plane und implementiere ein kleines, sauberes Rechte- und Rollensystem fuer die interne Verwaltung. Aktuell ist der interne Bereich nur per gemeinsamer Basic Auth ueber INTERNAL_ACCESS_USERNAME / INTERNAL_ACCESS_PASSWORD geschuetzt. Ziel ist: mehrere interne Benutzer, Rollen/Rechte, Benutzerverwaltung in der App, Einladung/Passwort-Prozess und Audit-Log, damit nachvollziehbar ist, welcher interne User welche Aktion ausgefuehrt hat.

Wichtig:
- Nicht blind implementieren. Erst aktuellen Code und Supabase-Struktur lesen.
- Keine Secrets, Tokens, Passwoerter oder Keys im Chat ausgeben.
- Bei jeder fachlichen/technischen Aenderung die interne Dokumentation unter /verwaltung/handbuch mit aktualisieren.
- Vor Commit pruefen, dass nur TC-Vreden-Dateien betroffen sind.
- Release nur ueber scripts\codex-release.ps1, wenn der Doctor gruen ist.
```

## Aktueller Projektstand

- Repo ist auf `main`.
- Letzte bekannte Commits:
  - `64ac7d3 TC-Vreden: expand internal documentation`
  - `c479710 TC-Vreden: add Supabase heartbeat cron`
  - `f4ad399 TC-Vreden: harden Codex routing checks`
- Release-/Doctor-Setup ist projektgeroutet und funktionierte am 28.05.2026.
- Vercel Production ist live unter `https://antrag-tennisclub-vreden.vercel.app`.
- Supabase-Migration `20260528_add_system_heartbeat.sql` wurde angewendet.
- Der Supabase-Heartbeat funktioniert live ueber `/api/cron/supabase-heartbeat` mit `CRON_SECRET`.

## Wichtige lokale Dateien

- `AGENTS.md`: Projektregeln, Trennung zu Filter.Shop, Dokumentationspflicht.
- `.codex-project.json`: Projekt-Routing fuer GitHub, Vercel, Supabase, Runtime-Env.
- `.vercel\project.json`: Vercel-Link auf `antrag-tennisclub-vreden`.
- `.deploy.local.ps1`: lokale Release-Secrets, gitignored, nicht anzeigen.
- `.env.local`: lokale Runtime-Secrets, gitignored, nicht anzeigen.
- `scripts\codex-doctor.ps1`: Routing-/Credential-/Runtime-Pruefung.
- `scripts\codex-release.ps1`: gesicherter Release-Pfad.

## Aktuelle interne Auth

Derzeit schuetzt `src/middleware.ts` diese Pfade per Basic Auth:

- `/verwaltung`
- `/vorstand`
- `/api/ebusy/*`
- `/api/verwaltung/*`

Die Werte kommen aus:

- `INTERNAL_ACCESS_USERNAME`
- `INTERNAL_ACCESS_PASSWORD`

Das ist nur ein gemeinsamer Zugang. Es gibt aktuell noch keine individuellen internen Benutzer, keine Rollen und kein Audit-Log.

## Bestehende App-Bereiche

Wichtige Routen:

- `/anmelden`: oeffentliches Formular.
- `/verwaltung`: interne Verwaltungsoberflaeche.
- `/verwaltung/handbuch`: interne Dokumentation.
- `/verwaltung/ebusy-testlabor`: eBuSy-Testlabor.
- `/verwaltung/bestaetigung-vorschau`: Vorschau fuer Bestaetigung/PDF.
- `/vorstand`: einfacher Vorstandsbereich.

Wichtige API-Routen:

- `src/app/api/applications/route.ts`: oeffentliche Antragserfassung.
- `src/app/api/verwaltung/applications/route.ts`: interne Antragsliste.
- `src/app/api/verwaltung/applications/[id]/route.ts`: Antragdetails/-updates.
- `src/app/api/verwaltung/applications/[id]/match/route.ts`: eBuSy-Abgleich.
- `src/app/api/verwaltung/applications/[id]/create-ebusy/route.ts`: eBuSy-Uebernahme.
- `src/app/api/verwaltung/ebusy-testlabor/route.ts`: eBuSy-Testlabor.
- `src/app/api/cron/supabase-heartbeat/route.ts`: technischer Heartbeat.

## Bestehende Supabase-Tabellen

Aktuell aus `supabase/schema.sql` und Migrationen:

- `applications`: Mitgliedsantraege, Stammdaten, SEPA, eBuSy-Status/Payload.
- `application_status_history`: Statusverlauf je Antrag.
- `ebusy_match_candidates`: moegliche eBuSy-Treffer je Antrag.
- `admin_notes`: interne Notizen je Antrag.
- `system_heartbeat`: eine technische Zeile fuer Supabase-Free-Plan-Heartbeat.

Alle bestehenden Tabellen mit Mitgliedsantragsdaten werden serverseitig ueber `SUPABASE_SERVICE_ROLE_KEY` angesprochen. Oeffentliche Inserts laufen ueber den Insert-Client.

## Bestehende Dokumentation in der App

Die interne Dokumentation liegt hier:

- `src/app/verwaltung/handbuch/content.ts`
- `src/app/verwaltung/handbuch/page.tsx`
- `src/app/verwaltung/handbuch/[slug]/page.tsx`

Vorhandene Seiten:

- `/verwaltung/handbuch/bedienung`
- `/verwaltung/handbuch/ebusy-uebernahme`
- `/verwaltung/handbuch/pdf-mail`
- `/verwaltung/handbuch/technik-betrieb`
- `/verwaltung/handbuch/offene-punkte`
- `/verwaltung/handbuch/rechte-rollen`

Wichtig: Bei jeder Aenderung am Rechte-/Rollensystem diese Doku aktualisieren.

## Zielbild Rechte-/Rollensystem

Gewuenscht ist ein kleines internes Verwaltungssystem:

- mehrere interne Benutzer statt gemeinsamem Basic-Auth-Login
- Benutzer in der App anlegen/einladen
- E-Mail-Einladung oder Passwort-zuruecksetzen
- Benutzer koennen Passwort selbst setzen/zuruecksetzen
- Rollen/Rechte in der App verwalten
- Aktionen werden mit Benutzer, Zeitpunkt und Details protokolliert

Empfohlene Rollen aus aktueller Doku:

- `admin`: Benutzer, Rollen, technische Einstellungen und alle Antraege verwalten.
- `verwaltung`: Antraege bearbeiten, eBuSy-Abgleich und Uebernahme ausfuehren.
- `vorstand_lesen`: Antraege und Status einsehen, aber nichts uebertragen.
- `technik`: Systemstatus, Testlabor und Betriebsdokumentation einsehen.

## Wahrscheinliche technische Richtung

Der neue Thread soll diese Punkte pruefen und dann konkret planen:

1. Supabase Auth als Identitaetsbasis fuer interne Benutzer.
2. Neue Tabelle fuer interne Profile/Rollen, z. B. `internal_user_profiles`.
3. Neue Audit-Tabelle, z. B. `internal_audit_log`.
4. Middleware von gemeinsamer Basic Auth auf Session/Auth-Check umbauen.
5. Login-Seite fuer interne Benutzer, z. B. `/login` oder `/verwaltung/login`.
6. Benutzerverwaltung unter `/verwaltung/benutzer`.
7. Rollenchecks fuer API-Routen und UI-Aktionen.
8. Audit-Logging fuer wichtige Aktionen:
   - Antrag ansehen/bearbeiten
   - eBuSy-Abgleich
   - eBuSy-Uebernahme
   - Kandidat manuell auswaehlen
   - Testlabor-Schreibtest
   - Benutzer/Rolle anlegen/aendern/sperren

Nicht sofort voraussetzen, sondern im neuen Thread anhand des Codes und der aktuellen Supabase-Version sauber pruefen.

## Migrations-/Datenbankhinweise

Neue Migrationen gehoeren nach:

`supabase/migrations/YYYYMMDD_beschreibung.sql`

`supabase/schema.sql` muss mitgezogen werden.

Bei neuen Tabellen direkt beachten:

- RLS bewusst setzen.
- Service Role Zugriff ermoeglichen.
- Keine unnoetige oeffentliche Lesbarkeit.
- Fuer neue Tabellen die kommenden Supabase Data-API-GRANT-Aenderungen beruecksichtigen.

## Release-/Testregeln

Vor groesseren Aenderungen:

```powershell
git status --short --branch
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-doctor.ps1
```

Vor Commit/Release:

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run build
```

Fertiger Release:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-release.ps1 -CommitMessage "TC-Vreden: add internal roles and users"
```

Keine Secrets ausgeben, loggen oder committen.

## Offene fachliche Entscheidungen fuer den neuen Thread

Vor Umsetzung klaeren oder als Annahme dokumentieren:

- Welche Personen duerfen neue interne Benutzer anlegen?
- Soll es initial genau einen Admin geben?
- Soll Basic Auth sofort ersetzt werden oder fuer eine Uebergangsphase parallel bleiben?
- Welche Rolle darf das eBuSy-Testlabor mit Live-Schreibzugriff verwenden?
- Welche Aktionen muessen auditpflichtig sein?
- Wie lange sollen Audit-Logs aufbewahrt werden?
- Sollen Vorstandsmitglieder nur lesen oder auch Kommentare/Notizen schreiben duerfen?

## Wichtige Warnungen

- Dieses Projekt nicht mit Filter.Shop Cockpit vermischen.
- Keine Filter.Shop-Zugangsdaten, -Supabase-Refs, -Vercel-Projekte oder -Scripts uebernehmen.
- Nicht auf globale CLI-Login-Zustaende vertrauen.
- Vor Release immer Doctor verwenden.
- Nach jeder relevanten Aenderung `/verwaltung/handbuch` aktualisieren.
