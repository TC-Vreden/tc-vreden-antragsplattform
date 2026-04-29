# Webapp-Prototyp

Diese Web-App ist der erste technische Prototyp fuer die digitale Antragsplattform des TC Vreden.

## Ziel der Version 1

- digitale Neuanmeldung
- Speicherung in Supabase
- Vorstands-Cockpit
- eBuSy-Abgleich zunaechst im Mock-Modus

## Was schon vorbereitet ist

- Next.js-Projektstruktur
- Umgebungsvariablen als Vorlage
- Supabase-Schema unter `supabase/schema.sql`
- oeffentliche Startseite
- Formular-Skelett fuer Neuanmeldung
- Vorstands-Cockpit-Skelett

## Was noch fehlt, bevor die App laeuft

- Dependencies installieren
- `.env.local` auf Basis von `.env.example` anlegen
- Supabase-Tabellen mit `supabase/schema.sql` einrichten
- spaeter eBuSy-API-Zugang eintragen

## Geplanter Ablauf

1. Supabase verbinden
2. Formular an Datenbank anbinden
3. Cockpit mit echten Daten fuellen
4. Mock-eBuSy-Abgleich einbauen
5. spaeter echten eBuSy-Abgleich anschliessen

## Hinweis

Die Dateien sind bewusst so angelegt, dass wir auch ohne freigeschaltete eBuSy-API weiterarbeiten koennen.
