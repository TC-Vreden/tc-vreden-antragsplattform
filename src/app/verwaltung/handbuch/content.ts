export const handbookDate = "28.05.2026";

export type HandbookSection = {
  title: string;
  body?: string[];
  bullets?: string[];
  rows?: Array<[string, string]>;
};

export type HandbookPage = {
  slug: string;
  title: string;
  summary: string;
  audience: "Vorstand" | "Technik" | "Betrieb" | "Alle";
  sections: HandbookSection[];
};

export const handbookPages: HandbookPage[] = [
  {
    slug: "bedienung",
    title: "Bedienung fuer die Verwaltung",
    audience: "Vorstand",
    summary:
      "Schritt-fuer-Schritt-Beschreibung fuer Formular, Antragsliste, eBuSy-Abgleich und interne Bearbeitung.",
    sections: [
      {
        title: "Oeffentliches Formular",
        body: [
          "Neue Mitglieder nutzen /anmelden. Pflicht sind Mitgliedschaftsart, Stammdaten, E-Mail, Festnetz, Mobil, Adresse, SEPA-Zustimmung, IBAN, Kontoinhaber, Satzung/Beitraege und Datenschutz.",
          "Bei Minderjaehrigen prueft das Formular zusaetzlich die Vertreterdaten. Mehrpersonen-Antraege erfassen Zusatzpersonen in einer strukturierten Liste."
        ]
      },
      {
        title: "Verwaltungsbereich",
        bullets: [
          "Neue Antraege erscheinen in /verwaltung als offene Vorgaenge.",
          "Die Verwaltung prueft Details, fuehrt den eBuSy-Abgleich aus und entscheidet bei unsicheren Treffern manuell.",
          "Erfolgreich uebertragene Antraege bleiben nachvollziehbar, verschwinden aber aus der offenen Bearbeitung."
        ]
      },
      {
        title: "Statusbegriffe",
        rows: [
          ["pending", "Noch kein eBuSy-Abgleich oder wieder offener Vorgang nach Bearbeitung."],
          ["match_found", "Sicherer eBuSy-Treffer gefunden; Treffer kann uebernommen werden."],
          ["multiple_matches", "Mehrere moegliche Treffer; bitte manuell pruefen."],
          ["needs_review", "Ein moeglicher Treffer, aber nicht sicher genug fuer Automatik."],
          ["no_match", "Kein bestehender Treffer; Neuanlage ist moeglich."],
          ["created_in_ebusy", "Personen, Attribute, Mitgliedschaften und ggf. Hauptzahlerbezug wurden angelegt bzw. aktualisiert."],
          ["error", "Technischer oder fachlicher Fehler; Meldung im Detail pruefen."]
        ]
      }
    ]
  },
  {
    slug: "ebusy-uebernahme",
    title: "eBuSy-Uebernahme",
    audience: "Vorstand",
    summary:
      "Wie die Plattform bestehende Benutzer prueft, neue Personen anlegt, Attribute setzt und Familien uebernimmt.",
    sections: [
      {
        title: "Abgleich vor Neuanlage",
        body: [
          "Die Plattform sucht zuerst nach bestehenden eBuSy-Personen. Relevant sind E-Mail/Benutzerkennung sowie Name und Geburtsdatum.",
          "Bei sicheren Treffern wird kein neues Benutzerkonto angelegt. Die vorhandene Person wird aktualisiert und um Attribut/Mitgliedschaft ergaenzt."
        ]
      },
      {
        title: "Neue eBuSy-Person",
        bullets: [
          "Neue Personen erhalten Adresse, Kontakt, Bankkonto, SEPA-Mandatsdatum, Kommentar und ein technisches Benutzerkonto.",
          "Der Benutzername ist moeglichst sprechend: vorname.nachname.",
          "Wenn der Name belegt ist, prueft die API weiter mit vorname.nachname2, vorname.nachname3 usw."
        ]
      },
      {
        title: "Familien und Mehrpersonen",
        body: [
          "Bei Familie, Erwachsene + 1 Kind sowie Partner-/Lebenspartner-Antraegen ist die Hauptperson der Beitragszahler.",
          "Zusatzpersonen werden einzeln angelegt. Sie erhalten den Hauptzahlerbezug zur Hauptperson. Bankkonto und SEPA-Datum werden vom Hauptzahler uebernommen."
        ]
      },
      {
        title: "Attribute",
        rows: [
          ["Erwachsene aktiv", "Mitgliedsbeitraege NEU = Erwachsene Aktiv"],
          ["Erwachsene passiv", "Mitgliedsbeitraege NEU = Passiv"],
          ["Familie Hauptperson", "Mitgliedsbeitraege NEU = Familien"],
          ["Familie Zusatzperson", "Mitgliedsbeitraege NEU = Beitragsfreie Familienangehoerige"],
          ["Erwachsene + 1 Kind Hauptperson", "Mitgliedsbeitraege NEU = Erwachsene + 1 Kind"],
          ["Partner/Lebenspartner aktiv", "Mitgliedsbeitraege NEU = Ehepaare / Lebenspartner aktiv"],
          ["Kinder bis 14", "Mitgliedsbeitraege NEU = Kinder bis 14 Jahre"],
          ["Jugendliche bis 18", "Mitgliedsbeitraege NEU = Jugendliche bis 18 Jahre"]
        ]
      },
      {
        title: "Bewusst nicht automatisch",
        bullets: [
          "Status-Quo-Attribute werden nicht mehr gesetzt.",
          "Sommertraining-Gebuehren werden nicht gesetzt.",
          "Beitragsarten bzw. membershipFeeTypes werden weiterhin nicht direkt geschrieben.",
          "DOSB wird noch nicht automatisch gepflegt."
        ]
      }
    ]
  },
  {
    slug: "pdf-mail",
    title: "PDF und E-Mail",
    audience: "Vorstand",
    summary:
      "Was nach erfolgreicher interner Uebernahme erzeugt und verschickt wird.",
    sections: [
      {
        title: "PDF-Zusammenfassung",
        body: [
          "Nach erfolgreicher Uebernahme erzeugt das System eine PDF-Zusammenfassung als Nachweis Mitgliedsantrag.",
          "Dateiname und Inhalt orientieren sich am Antrag, der Hauptperson und dem TennisClub Vreden."
        ]
      },
      {
        title: "Bestaetigungsmail",
        bullets: [
          "Die Bestaetigungsmail wird nach interner Uebernahme vorbereitet bzw. versendet, sofern Mailversand aktiv ist.",
          "SMTP-Konfiguration liegt als Vercel-/Runtime-Variable vor.",
          "Die Vorschau ist unter /verwaltung/bestaetigung-vorschau erreichbar."
        ]
      }
    ]
  },
  {
    slug: "technik-betrieb",
    title: "Technik und Betrieb",
    audience: "Technik",
    summary:
      "Architektur, Tabellen, Secrets, Release-Pfad, Supabase-Heartbeat und Projekttrennung.",
    sections: [
      {
        title: "Projektanker",
        rows: [
          ["Lokaler Ordner", "F:\\Onedrive\\Dokumente\\Codex\\TC-Vreden\\webapp-prototyp"],
          ["GitHub", "https://github.com/TC-Vreden/tc-vreden-antragsplattform.git"],
          ["Vercel", "antrag-tennisclub-vreden im Scope tc-vredens-projects"],
          ["Supabase", "xftnhnojaizyaecvtxcq / tennisclub-vreden"],
          ["Live-URL", "https://antrag-tennisclub-vreden.vercel.app"]
        ]
      },
      {
        title: "Wichtige Supabase-Tabellen",
        rows: [
          ["applications", "Mitgliedsantraege, Stammdaten, SEPA, Status, eBuSy-Payload."],
          ["application_status_history", "Statusverlauf je Antrag."],
          ["ebusy_match_candidates", "Moegliche eBuSy-Treffer je Antrag."],
          ["admin_notes", "Interne Notizen je Antrag."],
          ["system_heartbeat", "Eine technische Zeile fuer den taeglichen Supabase-Free-Plan-Heartbeat."],
          ["internal_user_profiles", "Interne Supabase-Auth-Benutzerprofile mit Rolle und Status."],
          ["internal_audit_log", "Nachvollziehbarkeit fuer interne Aktionen ohne Passwoerter oder Secrets."]
        ]
      },
      {
        title: "Release-Pfad",
        bullets: [
          "Vor Release: scripts/codex-doctor.ps1 muss gruen sein.",
          "Fertige Releases laufen ueber scripts/codex-release.ps1.",
          "Der Release-Pfad prueft Routing, Lint, Build, Supabase-Migrationen, Git Push, Vercel Deploy, Live-Check und Handy-Benachrichtigung.",
          "Keine globalen CLI-Logins als Quelle der Wahrheit verwenden; massgeblich sind .codex-project.json, .deploy.local.ps1, .vercel/project.json und Git-Remote."
        ]
      },
      {
        title: "Supabase Heartbeat",
        body: [
          "Vercel ruft taeglich /api/cron/supabase-heartbeat auf. Die Route ist mit CRON_SECRET geschuetzt und aktualisiert genau eine Zeile in system_heartbeat.",
          "Ziel ist, das Supabase-Free-Projekt durch minimale echte Aktivitaet wach zu halten. Das ersetzt keine Pro-Plan-Garantie, ist aber fuer den Vereinsbetrieb pragmatisch."
        ]
      }
    ]
  },
  {
    slug: "offene-punkte",
    title: "Offene Punkte",
    audience: "Alle",
    summary:
      "Was noch fachlich oder technisch entschieden, getestet oder ausgebaut werden muss.",
    sections: [
      {
        title: "Naechste fachliche Pruefungen",
        bullets: [
          "Hauptzahler-Patch inklusive Bankkonto/SEPA-Kopie fachlich im eBuSy-Backend kontrollieren.",
          "Zusatzpersonen werden aktuell noch nicht einzeln gegen vorhandene eBuSy-Benutzer geprueft.",
          "Kinder/Jugendliche und Schueler:innen/Azubis/Student:innen muessen fachlich final fuer produktive Vollautomatik freigegeben werden.",
          "Der genaue eBuSy-Prozess fuer Zugangsdaten/Registrierung muss final festgelegt werden."
        ]
      },
      {
        title: "Dokumentationsregel",
        body: [
          "Bei jeder fachlichen oder technischen Aenderung muss diese Dokumentation mit aktualisiert werden. Das ist bewusst Teil der Projektregeln, damit Vorstandswechsel und Vertretungen handhabbar bleiben."
        ]
      }
    ]
  },
  {
    slug: "rechte-rollen",
    title: "Rechte und Rollen",
    audience: "Betrieb",
    summary:
      "Zielbild fuer mehrere interne Benutzer, Rollen, Passwortprozesse und Nachvollziehbarkeit.",
    sections: [
      {
        title: "Aktueller Stand",
        body: [
          "Der interne Bereich nutzt jetzt persoenliche Supabase-Auth-Zugaenge mit Profilen in internal_user_profiles. Die Middleware akzeptiert eine gueltige Supabase-Session und prueft die konkreten Rechte danach serverseitig in Seiten und API-Routen.",
          "Die bisherige Basic-Auth-Kennung bleibt als Uebergangs- und Bootstrap-Zugang aktiv, solange INTERNAL_BASIC_AUTH_FALLBACK_ENABLED nicht auf false gesetzt ist. Dieser Zugang gilt intern als Admin und sollte nach dem Anlegen des ersten Admins deaktiviert werden."
        ]
      },
      {
        title: "Benutzer und Passwortprozess",
        bullets: [
          "Admins verwalten Benutzer unter /verwaltung/benutzer.",
          "Fuer den ersten Admin kann /verwaltung/benutzer?legacy=1 den alten Basic-Auth-Dialog ausloesen, solange der Fallback aktiv ist.",
          "Der Legacy-Dialog akzeptiert uebliche Browser-Codierungen fuer Basic Auth, damit bestehende Passwoerter mit Sonderzeichen waehrend des Bootstraps funktionieren.",
          "Nach erfolgreichem Legacy-Login wird kurzzeitig ein signiertes HttpOnly-Cookie gesetzt, damit auch Hintergrundaktionen wie Einladen oder Passwortlink ueber die API im Bootstrap funktionieren.",
          "Neue Benutzer werden per E-Mail eingeladen oder bekommen erneut einen Passwortlink.",
          "Benutzer setzen ihr Passwort ueber /verwaltung/passwort-neu selbst.",
          "Einladungs- und Passwortlinks fuehren direkt auf /verwaltung/passwort-neu, weil Supabase diese Mail-Links mit Browser-Session-Tokens ausliefert.",
          "Die Passwortseite uebernimmt diese Session-Tokens beim Laden und entfernt sie danach aus der Browser-Adresszeile.",
          "Vergessene Passwoerter koennen ueber /verwaltung/passwort-zuruecksetzen neu angefordert werden.",
          "Optional kann INTERNAL_BOOTSTRAP_ADMIN_EMAIL gesetzt werden, damit ein bereits vorhandener Supabase-Auth-Benutzer beim ersten Login automatisch Admin wird."
        ]
      },
      {
        title: "Rollen",
        rows: [
          ["admin", "Alle Rechte: Antraege, eBuSy, Testlabor-Liveaktionen, Benutzerverwaltung, Audit und Technik."],
          ["verwaltung", "Antraege lesen/bearbeiten/loeschen, eBuSy suchen, abgleichen und uebernehmen."],
          ["vorstand_lesen", "Antraege und Status einsehen, aber nichts bearbeiten oder uebertragen."],
          ["technik", "Systemstatus, Testlabor-Datenpakete, Audit und Betriebsdokumentation einsehen; keine eBuSy-Live-Schreibtests."]
        ]
      },
      {
        title: "Audit-Log",
        body: [
          "Wichtige interne Aktionen werden in internal_audit_log gespeichert. Dazu gehoeren Antragsliste, Bearbeitung, Loeschen, eBuSy-Abgleich, manuelle Kandidatenauswahl, eBuSy-Uebernahme, Testlabor-Aktionen sowie Benutzer- und Passwortlink-Aktionen.",
          "Audit-Details werden bewusst sparsam protokolliert. Passwoerter, Tokens, Secrets, Keys und IBAN-Werte werden vor dem Speichern redigiert."
        ]
      },
      {
        title: "Sicherheit",
        bullets: [
          "Direkter Data-API-Zugriff fuer authenticated auf bestehende Antragsdaten wurde entfernt; die App nutzt fuer interne Daten serverseitige Service-Role-Routen mit Rollencheck.",
          "Gesperrte Profile bleiben in Supabase Auth vorhanden, werden aber durch Profilstatus und serverseitige Rechtechecks blockiert.",
          "Nach erfolgreichem Admin-Bootstrap sollte INTERNAL_BASIC_AUTH_FALLBACK_ENABLED=false gesetzt werden."
        ]
      }
    ]
  }
];

export function getHandbookPage(slug: string) {
  return handbookPages.find((page) => page.slug === slug);
}
