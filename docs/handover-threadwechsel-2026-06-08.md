# Handover Threadwechsel 2026-06-08

Diese Datei ist die kurze Projektuebergabe fuer einen neuen Codex-Thread.

## Projektanker

- Lokaler Arbeitsordner: `F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp`
- GitHub: `https://github.com/TC-Vreden/tc-vreden-antragsplattform.git`
- Branch: `main`
- Live-URL: `https://tennisclub-vreden.vercel.app`
- Vercel-Projekt: `tennisclub-vreden`
- Vercel-Scope: `tc-vredens-projects`
- Supabase-Projekt: `xftnhnojaizyaecvtxcq`
- eBuSy: echte TC-Vreden-Integration, Schreibtests nur bewusst und mit eindeutig markierten Testdaten.

Massgeblich sind:

- `.codex-project.json`
- `.vercel/project.json`
- `.deploy.local.ps1`
- `.env.local`
- `docs/codex-routing-und-lokale-secrets.md`
- `docs/BEDIENUNG-AKTUELLER-PROTOTYP.md`

## Arbeitsweise

- Keine Secrets ausgeben oder committen.
- Keine Dateien, Secrets oder Projekte aus anderen Arbeitskontexten verwenden.
- Bei Codeaenderungen zuerst vorhandene Patterns lesen.
- Manuelle Edits mit `apply_patch`.
- Vor Release:
  - `npm run lint`
  - `npm run build`
- Fuer Commit/Push/Deploy den Projekt-Releasepfad nutzen:

```powershell
cd F:\Onedrive\Dokumente\Codex\TC-Vreden\webapp-prototyp
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\codex-release.ps1 -CommitMessage "Kurze Beschreibung"
```

Der Releasepfad prueft Routing, Lint, Build, Supabase-Migrationen, commit, push, Vercel Production Deploy, Live-Check und Handy-Benachrichtigung.

## Aktueller Git-Stand

Stand 2026-06-08: Arbeitsbaum war sauber.

Letzte wichtige Commits:

- `f32e44b Polish user administration layout`
- `d66a774 Fix Supabase password links`
- `a7512ee Translate password link browser error`
- `8f703ae Rename live Vercel app URL`
- `aac3e5f Simplify internal login entry`
- `e149fed Improve internal user auth flows`
- `c07ef35 Add editable mail settings`
- `4df2a7b Improve audit log layout`

## Funktionsstand

- Oeffentliches Formular unter `/anmelden`.
- Formular speichert Mitgliedsantraege in Supabase.
- Formulartexte, Mitgliedschaftsoptionen, Beitragslogik, Rechtstexte und Dokumentlinks sind im Backend unter `/verwaltung/formular` editierbar.
- Online-Texte wurden auf 27 Jahre fuer Schueler:innen/Azubis/Student:innen angepasst.
- Satzung, Platzpflegeordnung, Beitragsuebersicht und Jugendordnung sind als Links eingebunden.
- DSGVO-, SEPA-, Foto-/Video- und WhatsApp-Texte sind im Formular und PDF ausfuehrlich enthalten.
- Footer im Formular: TennisClub Vreden e.V. mit Adresse und Mail.
- Favicon/Branding fuer App-Seiten ist gesetzt.
- Interne Verwaltung unter `/verwaltung`.
- Login ist Supabase Auth mit Rollen:
  - `admin`
  - `verwaltung`
- Basic-Auth ist nur noch Bootstrap-/Fallback und sollte deaktiviert bleiben bzw. mit `INTERNAL_BASIC_AUTH_FALLBACK_ENABLED=false` betrieben werden, sobald Admin-Zugang sicher ist.
- Benutzerverwaltung unter `/verwaltung/benutzer`.
- Passwortlinks laufen ueber `/auth/confirm` mit Supabase `token_hash`; alter PKCE-Fehler ist behoben.
- Audit-Log unter `/verwaltung/audit`.
- Handbuch unter `/verwaltung/handbuch`.
- eBuSy-Testlabor unter `/verwaltung/ebusy-testlabor`.
- E-Mail-Einstellungen unter `/verwaltung/email`.
- Testmail kann dort gesendet werden: Testempfaenger setzen, speichern, unten `Testmail senden`.

## Mailstand

- Versand ist auf SMTP umgestellt.
- Sichtbare Einstellungen in Supabase/Backend:
  - Absender: `TennisClub Vreden e.V. <verwaltung@tennisclub-vreden.de>`
  - Reply-To aktuell: `verwaltung@tennisclub-vreden.de` (kann im Backend auf `mail@tennisclub-vreden.de` geaendert werden)
  - SMTP Host: `w01edb2f.kasserver.com`
  - SMTP Port: `465`
  - SMTP Sicherheit: `true` / SSL-TLS
  - SMTP Benutzer: `verwaltung@tennisclub-vreden.de`
- `SMTP_PASSWORD` liegt als Vercel Secret und muss zum Postfach `verwaltung@tennisclub-vreden.de` passen.
- Eingangsmail an Verein und Bestaetigungsmail mit PDF sind aktiv.
- Testmails kamen an, bei Outlook/Live teilweise im Junk.

DNS-Stand am 2026-06-08:

- SPF: `v=spf1 a mx include:spf.kasserver.com ~all`
- DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@tennisclub-vreden.de; adkim=r; aspf=r`
- DKIM-Eintraege von All-Inkl/Kasserver sind vorhanden.

Naechster Mail-Schritt:

- Outlook/Live/Office365-Zustellung weiter beobachten.
- Bei Junk: Kopfzeilen pruefen, ob `spf=pass`, `dkim=pass`, `dmarc=pass`.
- DMARC-Reports ein paar Tage/Wochen sammeln, danach ggf. `p=quarantine` mit kleinem `pct` diskutieren.

## Eingerichtete interne Benutzer

Admins/Bestand:

- Alexander Lenfers / HITPARTNER ist Admin.
- Zweiter Admin wurde vom Nutzer getestet.

Zusaetzliche Verwaltungskonten wurden direkt in Supabase angelegt, Rolle `verwaltung`, Status `active`, E-Mail bestaetigt:

- Ulrich Schwering, `ulrich.schwering@web.de`
- Erwin Wissing mit scharfem s im echten Profil, `e.wissing@t-online.de`
- Hendrik Flues, `hflues@gmx.de`

Temporäres Passwort wurde auf Wunsch des Nutzers gesetzt; nicht in Antworten wiederholen.

## Aktueller Vorstandstest

Der Nutzer will Vorstand/Verwalter testen lassen:

- Formular oeffnen und Texte pruefen.
- Verschiedene Mitgliedschaftsarten durchgehen.
- Testantrag absenden.
- Im Backend anmelden.
- Antrag pruefen/bearbeiten.
- Testuebernahme bzw. Bestaetigung ausprobieren.
- Automatische E-Mails und PDF pruefen.
- Rueckmeldungen zu Formulierungen, Beitraegen, Einwilligungen, Datenschutz, E-Mail und PDF sammeln.

## Wichtige fachliche/offene Punkte

- Vorstand muss Inhalte final abnehmen: Formulartexte, Rechtstexte, PDF, E-Mail, Beitrags-/Optionstexte.
- DMARC/Junk-Zustellung weiter beobachten.
- eBuSy-Zugangsdaten-/Mitgliederlogin-Prozess final fachlich klaeren.
- eBuSy-Schreibtests sind echte Zugriffe. Testpersonen muessen in eBuSy manuell kontrolliert und ggf. geloescht werden.
- Mehrpersonen-/Familienlogik ist vorhanden, aber fachlich weiter vorsichtig behandeln und pruefen.
- Zusatzpersonen/Minderjaehrige: Der erste erwachsene Antragsteller wird als gesetzlicher Vertreter vorausgefuellt, kann geaendert werden.
- Bei eBuSy-Diskrepanzen zwischen alten Labels und aktueller 27-Jahre-Regel nicht blind schlussfolgern; aktuelle Vereinsregel ist 27.

## Antwortstil fuer neuen Thread

- Deutsch, knapp und praktisch.
- Bei Code-/Produktionsaenderungen proaktiv implementieren, testen, committen und deployen, wenn der Nutzer das moechte.
- Keine langen technischen Abhandlungen, wenn der Nutzer operative Antworten braucht.
- Bei Unklarheiten kurz fragen, sonst konservativ handeln.
