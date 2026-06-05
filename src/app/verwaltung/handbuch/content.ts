export const handbookDate = "04.06.2026";

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
  audience: "Vorstand" | "Betrieb" | "Alle";
  sections: HandbookSection[];
};

export const handbookPages: HandbookPage[] = [
  {
    slug: "bedienung",
    title: "Bedienung für die Verwaltung",
    audience: "Vorstand",
    summary:
      "Schritt-für-Schritt-Beschreibung für Formular, Antragsliste, eBuSy-Abgleich und interne Bearbeitung.",
    sections: [
      {
        title: "Öffentliches Formular",
        body: [
          "Neue Mitglieder nutzen /anmelden. Pflicht sind Mitgliedschaftsart, Stammdaten, E-Mail, Festnetz, Mobil, Adresse, SEPA-Zustimmung, IBAN, Kontoinhaber, Satzung/Beitragsordnung/Platzpflegeordnung und Datenschutzerklärung nach DSGVO.",
          "Bei minderjährigen Hauptpersonen prüft das Formular zusätzlich die Vertreterdaten. Bei minderjährigen Zusatzpersonen wird die zuerst erfasste erwachsene Hauptperson als gesetzlicher Vertreter vorbelegt und kann geändert werden."
        ]
      },
      {
        title: "Verwaltungsbereich",
        bullets: [
          "Neue Anträge erscheinen in /verwaltung als offene Vorgänge.",
          "Die Verwaltung prüft Details, führt den eBuSy-Abgleich aus und entscheidet bei unsicheren Treffern manuell.",
          "Erfolgreich übertragene Anträge bleiben nachvollziehbar, verschwinden aber aus der offenen Bearbeitung.",
          "Im eBuSy-Testlabor kann über `Testantrag in Verwaltung anlegen` ein kompletter Verwaltungs-Testfall angelegt werden, ohne sofort nach eBuSy zu schreiben."
        ]
      },
      {
        title: "Statusbegriffe",
        rows: [
          ["pending", "Noch kein eBuSy-Abgleich oder wieder offener Vorgang nach Bearbeitung."],
          ["match_found", "Sicherer eBuSy-Treffer gefunden; Treffer kann übernommen werden."],
          ["multiple_matches", "Mehrere mögliche Treffer; bitte manuell prüfen."],
          ["needs_review", "Ein möglicher Treffer, aber nicht sicher genug für Automatik."],
          ["no_match", "Kein bestehender Treffer; Neuanlage ist möglich."],
          ["created_in_ebusy", "Personen, Attribute, Mitgliedschaften und ggf. Hauptzahlerbezug wurden angelegt bzw. aktualisiert."],
          ["error", "Technischer oder fachlicher Fehler; Meldung im Detail prüfen."]
        ]
      }
    ]
  },
  {
    slug: "ebusy-uebernahme",
    title: "eBuSy-Übernahme",
    audience: "Vorstand",
    summary:
      "Wie die Plattform bestehende Benutzer prüft, neue Personen anlegt, Attribute setzt und Familien übernimmt.",
    sections: [
      {
        title: "Abgleich vor Neuanlage",
        body: [
          "Die Plattform sucht zuerst nach bestehenden eBuSy-Personen. Relevant sind E-Mail/Benutzerkennung sowie Name und Geburtsdatum.",
          "Bei sicheren Treffern wird kein neues Benutzerkonto angelegt. Die vorhandene Person wird aktualisiert und um Attribut/Mitgliedschaft ergänzt."
        ]
      },
      {
        title: "Neue eBuSy-Person",
        bullets: [
          "Neue Personen erhalten Adresse, Kontakt, Bankkonto, SEPA-Mandatsdatum, Kommentar und ein technisches Benutzerkonto.",
          "Der Benutzername ist möglichst sprechend: vorname.nachname.",
          "Wenn der Name belegt ist, prüft die API weiter mit vorname.nachname2, vorname.nachname3 usw."
        ]
      },
      {
        title: "Familien und Mehrpersonen",
        body: [
          "Bei Familie, Erwachsene + 1 Kind sowie Partner-/Lebenspartner-Anträgen ist die Hauptperson der Beitragszahler.",
          "Zusatzpersonen werden einzeln angelegt. Sie erhalten den Hauptzahlerbezug zur Hauptperson. Bankkonto und SEPA-Datum werden vom Hauptzahler übernommen."
        ]
      },
      {
        title: "Attribute",
        rows: [
          ["Erwachsene aktiv", "Mitgliedsbeiträge NEU = Erwachsene Aktiv"],
          ["Erwachsene passiv", "Mitgliedsbeiträge NEU = Passiv"],
          ["Familie Hauptperson", "Mitgliedsbeiträge NEU = Familien"],
          ["Familie Zusatzperson", "Mitgliedsbeiträge NEU = Beitragsfreie Familienangehörige"],
          ["Erwachsene + 1 Kind Hauptperson", "Mitgliedsbeiträge NEU = Erwachsene + 1 Kind"],
          ["Partner/Lebenspartner aktiv", "Mitgliedsbeiträge NEU = Ehepaare / Lebenspartner aktiv"],
          ["Kinder bis 14", "Mitgliedsbeiträge NEU = Kinder bis 14 Jahre"],
          ["Jugendliche bis 18", "Mitgliedsbeiträge NEU = Jugendliche bis 18 Jahre"]
        ]
      },
      {
        title: "Bewusst nicht automatisch",
        bullets: [
          "Status-Quo-Attribute werden nicht mehr gesetzt.",
          "Sommertraining-Gebühren werden nicht gesetzt.",
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
      "Was nach erfolgreicher interner Übernahme erzeugt und verschickt wird.",
    sections: [
      {
        title: "PDF-Zusammenfassung",
        body: [
          "Nach erfolgreicher Übernahme erzeugt das System eine PDF-Zusammenfassung als Nachweis Mitgliedsantrag.",
          "Dateiname und Inhalt orientieren sich am Antrag, der Hauptperson und dem TennisClub Vreden."
        ]
      },
      {
        title: "Bestätigungsmail",
        bullets: [
          "Die Bestätigungsmail wird nach interner Übernahme vorbereitet bzw. versendet, sofern Mailversand aktiv ist.",
          "SMTP-Konfiguration liegt als Vercel-/Runtime-Variable vor.",
          "Die Vorschau ist unter /verwaltung/bestaetigung-vorschau erreichbar.",
          "Supabase-Auth-Mails für Einladung, Passwortlink und Passwort-geändert-Hinweis nutzen ein TC-Vreden-Template mit Logo, gelbem Aktionsbutton und deutschem Text. Der technische Absender bleibt ohne Custom-SMTP weiterhin die Supabase-Standardadresse."
        ]
      }
    ]
  },
  {
    slug: "technik-betrieb",
    title: "Betrieb",
    audience: "Betrieb",
    summary:
      "Architektur, Tabellen, Secrets, Release-Pfad, Supabase-Heartbeat und Projekttrennung.",
    sections: [
      {
        title: "Projektanker",
        rows: [
          ["Lokaler Ordner", "F:\\Onedrive\\Dokumente\\Codex\\TC-Vreden\\webapp-prototyp"],
          ["GitHub", "https://github.com/TC-Vreden/tc-vreden-antragsplattform.git"],
          ["Vercel", "tennisclub-vreden im Scope tc-vredens-projects"],
          ["Supabase", "xftnhnojaizyaecvtxcq / tennisclub-vreden"],
          ["Live-URL", "https://tennisclub-vreden.vercel.app"]
        ]
      },
      {
        title: "Wichtige Supabase-Tabellen",
        rows: [
          ["applications", "Mitgliedsanträge, Stammdaten, SEPA, Status, eBuSy-Payload."],
          ["application_status_history", "Statusverlauf je Antrag."],
          ["ebusy_match_candidates", "Mögliche eBuSy-Treffer je Antrag."],
          ["admin_notes", "Interne Notizen je Antrag."],
          ["system_heartbeat", "Eine technische Zeile für den täglichen Supabase-Free-Plan-Heartbeat."],
          ["internal_user_profiles", "Interne Supabase-Auth-Benutzerprofile mit Rolle und Status."],
          ["internal_audit_log", "Nachvollziehbarkeit für interne Aktionen ohne Passwörter oder Secrets."]
        ]
      },
      {
        title: "Release-Pfad",
        bullets: [
          "Vor Release: scripts/codex-doctor.ps1 muss grün sein.",
          "Fertige Releases laufen über scripts/codex-release.ps1.",
          "Der Release-Pfad prüft Routing, Lint, Build, Supabase-Migrationen, Git Push, Vercel Deploy, Live-Check und Handy-Benachrichtigung.",
          "Keine globalen CLI-Logins als Quelle der Wahrheit verwenden; maßgeblich sind .codex-project.json, .deploy.local.ps1, .vercel/project.json und Git-Remote."
        ]
      },
      {
        title: "Supabase Heartbeat",
        body: [
          "Vercel ruft täglich /api/cron/supabase-heartbeat auf. Die Route ist mit CRON_SECRET geschützt und aktualisiert genau eine Zeile in system_heartbeat.",
          "Ziel ist, das Supabase-Free-Projekt durch minimale echte Aktivität wach zu halten. Das ersetzt keine Pro-Plan-Garantie, ist aber für den Vereinsbetrieb pragmatisch."
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
        title: "Nächste fachliche Prüfungen",
        bullets: [
          "Hauptzahler-Patch inklusive Bankkonto/SEPA-Kopie fachlich im eBuSy-Backend kontrollieren.",
          "Zusatzpersonen werden aktuell noch nicht einzeln gegen vorhandene eBuSy-Benutzer geprüft.",
          "Kinder/Jugendliche und Schüler:innen/Azubis/Student:innen müssen fachlich final für produktive Vollautomatik freigegeben werden.",
          "Der genaue eBuSy-Prozess für Zugangsdaten/Registrierung muss final festgelegt werden."
        ]
      },
      {
        title: "Dokumentationsregel",
        body: [
          "Bei jeder fachlichen oder technischen Änderung muss diese Dokumentation mit aktualisiert werden. Das ist bewusst Teil der Projektregeln, damit Vorstandswechsel und Vertretungen handhabbar bleiben."
        ]
      }
    ]
  },
  {
    slug: "rechte-rollen",
    title: "Rechte und Rollen",
    audience: "Betrieb",
    summary:
      "Interne Benutzer, Rollen, Passwortprozesse und Nachvollziehbarkeit.",
    sections: [
      {
        title: "Aktueller Stand",
        body: [
          "Der interne Bereich nutzt persönliche Supabase-Auth-Zugänge mit Profilen in internal_user_profiles. Die Middleware akzeptiert eine gültige Supabase-Session und prüft die konkreten Rechte danach serverseitig in Seiten und API-Routen.",
          "Die bisherige Basic-Auth-Kennung bleibt als Übergangs- und Bootstrap-Zugang aktiv, solange INTERNAL_BASIC_AUTH_FALLBACK_ENABLED nicht auf false gesetzt ist. Dieser Zugang gilt intern als Admin und sollte nach dem Anlegen des ersten Admins deaktiviert werden."
        ]
      },
      {
        title: "Benutzer und Passwortprozess",
        bullets: [
          "Admins verwalten Benutzer unter /verwaltung/benutzer.",
          "Für den ersten Admin kann /verwaltung/benutzer?legacy=1 den alten Basic-Auth-Dialog auslösen, solange der Fallback aktiv ist.",
          "Der Legacy-Dialog akzeptiert übliche Browser-Codierungen für Basic Auth, damit bestehende Passwörter mit Sonderzeichen während des Bootstraps funktionieren.",
          "Neue Benutzer werden per E-Mail eingeladen oder bekommen erneut einen Passwortlink.",
          "Benutzer setzen ihr Passwort über /verwaltung/passwort-neu selbst.",
          "Einladungs- und Passwortlinks führen direkt auf /verwaltung/passwort-neu, weil Supabase diese Mail-Links mit Browser-Session-Tokens ausliefert.",
          "Die Passwortseite übernimmt diese Session-Tokens beim Laden und entfernt sie danach aus der Browser-Adresszeile.",
          "Einladungs- und Passwortlinks sind in der aktuellen Supabase-Konfiguration 3600 Sekunden, also 1 Stunde, gültig.",
          "Die zugehörigen Supabase-Auth-Mails sind im TC-Vreden-Branding gestaltet. Betroffen sind Einladung, Passwortlink und Passwort-geändert-Hinweis.",
          "Bei neuen Benutzern verschickt die Aktion Benutzer einladen direkt die erste Einladung. Bei noch nicht angenommenen Benutzern heißt die erneute Aktion Link erneut senden; bei aktiven Benutzern Passwortlink.",
          "Admins können interne Benutzer löschen, auch andere Admins. Der eigene aktive Admin-Zugang kann nicht gelöscht werden.",
          "Vergessene Passwörter können über /verwaltung/passwort-zuruecksetzen neu angefordert werden.",
          "Optional kann INTERNAL_BOOTSTRAP_ADMIN_EMAIL gesetzt werden, damit ein bereits vorhandener Supabase-Auth-Benutzer beim ersten Login automatisch Admin wird."
        ]
      },
      {
        title: "Rollen",
        rows: [
          ["admin", "Alle Rechte: Anträge, eBuSy, Testlabor, Benutzerverwaltung, Audit und Betrieb."],
          ["verwaltung", "Operative Bearbeitung: Anträge lesen, bearbeiten und löschen, eBuSy suchen, abgleichen und übernehmen."]
        ]
      },
      {
        title: "Audit-Log",
        body: [
          "Wichtige interne Aktionen werden in internal_audit_log gespeichert. Dazu gehören Antragsliste, Bearbeitung, Löschen, eBuSy-Abgleich, manuelle Trefferauswahl, eBuSy-Übernahme, Testlabor-Aktionen sowie Benutzer- und Passwortlink-Aktionen.",
          "Audit-Details werden bewusst sparsam protokolliert. Passwörter, Tokens, Secrets, Keys und IBAN-Werte werden vor dem Speichern redigiert."
        ]
      },
      {
        title: "Sicherheit",
        bullets: [
          "Direkter Data-API-Zugriff für authenticated auf bestehende Antragsdaten wurde entfernt; die App nutzt für interne Daten serverseitige Service-Role-Routen mit Rollencheck.",
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
