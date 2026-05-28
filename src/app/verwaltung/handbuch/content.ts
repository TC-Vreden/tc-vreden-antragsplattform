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
          ["system_heartbeat", "Eine technische Zeile fuer den taeglichen Supabase-Free-Plan-Heartbeat."]
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
          "Der interne Bereich ist aktuell ueber eine gemeinsame Basic-Auth-Kennung geschuetzt. Das ist einfach, aber noch kein echtes Rollen- und Benutzerkonzept.",
          "Supabase Auth ist technisch vorhanden, aber es gibt noch keine interne Oberflaeche zum Anlegen, Einladen, Sperren oder Rollenverwalten von Benutzern."
        ]
      },
      {
        title: "Zielbild",
        bullets: [
          "Interne Benutzer koennen in der App angelegt und eingeladen werden.",
          "Benutzer setzen ihr Passwort selbst oder nutzen Passwort-zuruecksetzen.",
          "Rollen steuern, wer lesen, bearbeiten, eBuSy uebernehmen, Testlabor nutzen, Benutzer verwalten oder technische Einstellungen sehen darf.",
          "Wichtige Aktionen werden mit Benutzer, Zeitpunkt und Aktion im Audit-Log gespeichert."
        ]
      },
      {
        title: "Empfohlene Rollen",
        rows: [
          ["admin", "Benutzer, Rollen, technische Einstellungen und alle Antraege verwalten."],
          ["verwaltung", "Antraege bearbeiten, eBuSy-Abgleich und Uebernahme ausfuehren."],
          ["vorstand_lesen", "Antraege und Status einsehen, aber nichts uebertragen."],
          ["technik", "Systemstatus, Testlabor und Betriebsdokumentation einsehen."]
        ]
      },
      {
        title: "Umsetzung als eigener Block",
        body: [
          "Dieses Thema sollte als separater Implementierungsblock geplant werden, weil es Datenbanktabellen, Supabase Auth, Einladungsmails, Passwortprozesse, Middleware und Audit-Logging betrifft."
        ]
      }
    ]
  }
];

export function getHandbookPage(slug: string) {
  return handbookPages.find((page) => page.slug === slug);
}
