import Link from "next/link";
import { TcVredenLogo } from "@/components/tc-vreden-logo";

const handbookDate = "18.05.2026";

const functionCards = [
  {
    title: "Öffentliches Formular",
    text:
      "Über /anmelden werden neue Mitgliedsanträge erfasst. Pflicht sind Mitgliedschaftsart, Stammdaten, E-Mail, Festnetz, Mobil, Adresse, SEPA-Zustimmung, IBAN, Kontoinhaber, Satzung/Beiträge und Datenschutz. Bei Minderjährigen werden zusätzlich Vertreterdaten geprüft."
  },
  {
    title: "eBuSy-Abgleich",
    text:
      "Der Antrag wird zuerst gegen eBuSy geprüft. Gesucht wird vor allem über E-Mail/Benutzerkennung sowie über Name und Geburtsdatum. Sichere Treffer werden verknüpft, unsichere Treffer bleiben manuell zu prüfen."
  },
  {
    title: "Vorhandener Benutzer",
    text:
      "Wenn bereits eine eBuSy-Person bzw. ein Benutzer gefunden wurde, legt die Plattform kein neues Benutzerkonto an. Die vorhandene Person wird mit den Antragsdaten aktualisiert; anschließend werden Attribute und Mitgliedschaft ergänzt, sofern noch keine Mitgliedschaft vorhanden ist."
  },
  {
    title: "Neue eBuSy-Person",
    text:
      "Wenn kein Treffer gefunden wurde, wird eine neue eBuSy-Person inklusive Adresse, Kontakt, Bankkonto, SEPA-Mandat, Kommentar und technischem Benutzerkonto angelegt."
  },
  {
    title: "Attribute",
    text:
      "Automatisch gesetzt wird nur noch das Attribut Mitgliedsbeiträge NEU. Die alten Status-Quo-Attribute und Sommertraining-Gebühren werden nicht mehr gesetzt."
  },
  {
    title: "Mitgliedschaft",
    text:
      "Nach der Personenanlage wird eine einfache Mitgliedschaft im Modul Mitglieder, Abteilung Tennis, mit Eintrittsdatum aus dem Antrag angelegt. Beitragsarten werden weiterhin nicht direkt geschrieben."
  },
  {
    title: "Familien und Mehrpersonen",
    text:
      "Bei Familie, Erwachsene + 1 Kind sowie Partner-/Lebenspartner-Anträgen ist die Hauptperson der Beitragszahler. Zusatzpersonen werden einzeln angelegt, als beitragsfreie Familienangehörige bzw. passende Partner-Zuordnung markiert und auf die Hauptperson als Hauptzahler gesetzt."
  },
  {
    title: "PDF und Bestätigung",
    text:
      "Nach erfolgreicher interner Übernahme erzeugt das System eine PDF-Zusammenfassung und verschickt die Bestätigungsmail, sofern der Mailversand aktiv ist."
  }
];

const statusRows = [
  ["pending", "Noch kein eBuSy-Abgleich oder wieder offener Vorgang nach Bearbeitung."],
  ["match_found", "Sicherer eBuSy-Treffer gefunden; Treffer kann übernommen werden."],
  ["multiple_matches", "Mehrere mögliche eBuSy-Treffer; bitte manuell prüfen."],
  ["needs_review", "Ein möglicher Treffer, aber nicht sicher genug für automatische Verknüpfung."],
  ["no_match", "Kein bestehender Treffer; Neuanlage ist möglich."],
  ["created_in_ebusy", "Person(en), Hauptzahlerbezug, Attribute und Mitgliedschaften wurden angelegt bzw. aktualisiert."],
  ["error", "Ein technischer oder fachlicher Fehler ist aufgetreten; Meldung im Detail prüfen."]
];

const workflowSteps = [
  "Antragsteller:in füllt das öffentliche Formular aus.",
  "Supabase speichert Antrag, SEPA-Daten, Einwilligungen und Zusatzpersonen.",
  "Die Verwaltung prüft den Antrag und führt den eBuSy-Abgleich aus.",
  "Bei einem bestehenden Treffer wird die eBuSy-Person verknüpft und später ohne neues Benutzerkonto ergänzt.",
  "Bei Neuanlage erstellt die Plattform die eBuSy-Person mit Kontakt, Bankkonto, SEPA und Benutzerkonto.",
  "Danach werden Mitgliedsbeiträge-NEU-Attribute, einfache Mitgliedschaften und bei Mehrpersonen der Hauptzahlerbezug gesetzt.",
  "Nach erfolgreicher Übernahme werden PDF-Zusammenfassung und Bestätigungsmail erzeugt."
];

const attributeRows = [
  ["Erwachsene aktiv", "Mitgliedsbeiträge NEU = Erwachsene Aktiv"],
  ["Erwachsene passiv", "Mitgliedsbeiträge NEU = Passiv"],
  ["Familie Hauptperson", "Mitgliedsbeiträge NEU = Familien"],
  ["Familie Zusatzperson", "Mitgliedsbeiträge NEU = Beitragsfreie Familienangehörige"],
  ["Erwachsene + 1 Kind Hauptperson", "Mitgliedsbeiträge NEU = Erwachsene + 1 Kind"],
  ["Partner/Lebenspartner aktiv", "Mitgliedsbeiträge NEU = Ehepaare / Lebenspartner aktiv"],
  ["Kinder bis 14", "Mitgliedsbeiträge NEU = Kinder bis 14 Jahre"],
  ["Jugendliche bis 18", "Mitgliedsbeiträge NEU = Jugendliche bis 18 Jahre"]
];

const openItems = [
  "Hauptzahler-Patch im eBuSy-Testlabor mit echten Testpersonen kontrollieren, bevor wir ihn fachlich als final betrachten.",
  "Zusatzpersonen werden aktuell noch nicht einzeln gegen vorhandene eBuSy-Benutzer geprüft. Das ist der nächste wichtige Schutz gegen Doppelanlagen bei Familien.",
  "Beitragsarten bzw. membershipFeeTypes werden weiterhin nicht direkt geschrieben; eBuSy-Zuordnung läuft über Mitgliedsbeiträge NEU und einfache Mitgliedschaft.",
  "DOSB wird noch nicht automatisch gepflegt.",
  "Der genaue eBuSy-Prozess für Zugangsdaten/Registrierung muss final festgelegt werden. Neue Personen bekommen technisch ein Benutzerkonto, aber die Plattform verschickt aktuell keine eBuSy-Login-Daten.",
  "Kinder/Jugendliche und Schüler:innen/Azubis/Student:innen müssen fachlich final für produktive Vollautomatik freigegeben werden."
];

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: 18 }}>
      <h2 style={{ fontSize: "1.25rem" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function VerwaltungHandbuchPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Mini-Handbuch</h1>
        <p>
          Aktueller Arbeitsstand der digitalen Mitgliedsanträge beim TennisClub Vreden e.V.
          Stand: <strong>{handbookDate}</strong>.
        </p>

        <div className="cta-row" style={{ marginBottom: 20 }}>
          <Link className="button secondary" href="/verwaltung">
            Zurück zur Verwaltung
          </Link>
          <Link className="button secondary" href="/anmelden">
            Öffentliches Formular ansehen
          </Link>
          <Link className="button secondary" href="/verwaltung/ebusy-testlabor">
            eBuSy-Testlabor öffnen
          </Link>
          <Link className="button secondary" href="/verwaltung/bestaetigung-vorschau">
            Bestätigungsvorschau öffnen
          </Link>
        </div>

        <div className="grid" style={{ gap: 20 }}>
          <Section title="Kurzüberblick">
            <p>
              Die Plattform erfasst Mitgliedsanträge digital, prüft bestehende eBuSy-Treffer,
              legt neue Personen an oder ergänzt vorhandene eBuSy-Personen ohne neues
              Benutzerkonto. Nach erfolgreicher Übernahme werden PDF und Bestätigungsmail
              vorbereitet bzw. versendet.
            </p>
          </Section>

          <Section title="Ablauf von A bis Z">
            <ol className="list">
              {workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Section>

          <Section title="Aktuelle Funktionen">
            <div className="grid grid-2">
              {functionCards.map((item) => (
                <article className="hint-box" key={item.title}>
                  <strong>{item.title}</strong>
                  <p style={{ margin: "8px 0 0" }}>{item.text}</p>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Statusbegriffe">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Bedeutung</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map(([status, meaning]) => (
                  <tr key={status}>
                    <td>
                      <strong>{status}</strong>
                    </td>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Attribut-Mapping">
            <table className="table">
              <thead>
                <tr>
                  <th>Fall</th>
                  <th>Automatisch gesetztes Attribut</th>
                </tr>
              </thead>
              <tbody>
                {attributeRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Offene Punkte">
            <ul className="list">
              {openItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </div>
      </section>
    </main>
  );
}
