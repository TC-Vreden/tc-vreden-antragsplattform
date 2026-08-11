# Custom Domain: verwaltung.tennisclub-vreden.de

Stand: 10.06.2026

Ziel ist, die Antragsplattform zusätzlich zur Vercel-Adresse unter

```text
https://verwaltung.tennisclub-vreden.de
```

bereitzustellen.

## DNS bei ALL-INKL/KAS

Vercel hat nach dem Hinzufügen der Domain am 10.06.2026 für diese konkrete
Subdomain folgenden DNS-Eintrag gefordert. Mail-DNS bleibt unverändert.

```text
Typ: A
Name/Subdomain: verwaltung
Ziel/Wert: 76.76.21.21
TTL: Standardwert
```

Wichtig:

- keine MX-, SPF-, DKIM- oder DMARC-Einträge ändern
- keinen Nameserver-Umzug zu Vercel durchführen
- falls für `verwaltung` bereits ein CNAME oder ein anderer A-Record existiert, diesen durch den oben genannten A-Record ersetzen
- den Zielwert in Vercel prüfen und exakt übernehmen, falls Vercel später einen anderen Wert anzeigen sollte

## Vercel

Im Projekt `tennisclub-vreden` muss die Domain hinterlegt sein:

```text
verwaltung.tennisclub-vreden.de
```

Erledigt am 10.06.2026 per Vercel CLI. Vercel meldet noch `not configured properly`, bis der
DNS-Eintrag bei ALL-INKL gesetzt und propagiert ist.

Zusätzlich müssen für Production gesetzt sein:

```text
NEXT_PUBLIC_SITE_URL=https://verwaltung.tennisclub-vreden.de
ADMIN_PORTAL_URL=https://verwaltung.tennisclub-vreden.de/verwaltung
```

Diese beiden Werte wurden am 10.06.2026 in Vercel Production gesetzt. Danach ist ein neues
Production-Deployment nötig, damit die Werte in Mails, Logo-URLs und Serverpfaden verwendet werden.

## Supabase Auth

In Supabase unter `Authentication` -> `URL Configuration`:

```text
Site URL:
https://verwaltung.tennisclub-vreden.de
```

Additional Redirect URLs:

```text
https://verwaltung.tennisclub-vreden.de/auth/callback
https://verwaltung.tennisclub-vreden.de/auth/confirm
https://verwaltung.tennisclub-vreden.de/verwaltung
https://verwaltung.tennisclub-vreden.de/verwaltung/passwort-neu
```

Die alte Vercel-URL kann während der Umstellung zusätzlich eingetragen bleiben.

## App-Pfade

Öffentlich:

```text
https://verwaltung.tennisclub-vreden.de/anmelden
https://verwaltung.tennisclub-vreden.de/anmelden/neuanmeldung
https://verwaltung.tennisclub-vreden.de/anmelden/erweitern
```

Intern:

```text
https://verwaltung.tennisclub-vreden.de/verwaltung
```

## Betriebs-Hinweis

Nach Aenderungen an `NEXT_PUBLIC_SITE_URL` oder `ADMIN_PORTAL_URL` ist ein neues
Production-Deployment noetig, damit Mails, Logo-URLs und Serverpfade die aktuellen
Werte verwenden.
