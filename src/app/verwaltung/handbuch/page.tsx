import Link from "next/link";
import { TcVredenLogo } from "@/components/tc-vreden-logo";

const handbookDate = "12.05.2026";

const functionCards = [
  {
    title: "Öffentliches Formular",
    text:
      "Über /anmelden werden neue Mitgliedsanträge erfasst. Pflichtfelder, SEPA-Zustimmung, Satzung/Datenschutz und bei Minderjährigen die Vertreter-Zustimmung werden direkt geprüft. Mehrpersonen-Mitgliedschaften blenden die passenden Zusatzpersonenfelder ein."
  },
  {
    title: "Reduzierter Nachweis",
    text:
      "Das Feld für Schüler:innen, Azubis und Student:innen erscheint nur bei den reduzierten Mitgliedschaftsarten. In PDF und Bestätigungsmail wird es ebenfalls nur dann ausgegeben."
  },
  {
    title: "Eingangsmail",
    text:
      "Nach dem Absenden speichert Supabase den Antrag. Zusätzlich kann eine interne Benachrichtigung an die Vereinsadresse gesendet werden, sofern die Mail-Umgebung aktiv ist."
  },
  {
    title: "Personenabgleich",
    text:
      "Der Verwaltungsbereich kann direkt in eBuSy suchen. Treffer werden nach Status eingeordnet: eindeutiger Treffer, mehrere Kandidaten, manuelle Prüfung oder kein Treffer."
  },
  {
    title: "eBuSy-Übernahme",
    text:
      "Offene Anträge können nach Prüfung in eBuSy angelegt werden. Bei Einzelpersonen und Mehrpersonen-Anträgen werden Personen, Attribute und einfache Mitgliedschaften übertragen."
  },
  {
    title: "Mehrpersonen-Anträge",
    text:
      "Partner-, Erwachsene+Kind- und Familienanträge werden bewusst als Mehrpersonen-Antrag markiert. Die technische Übertragung funktioniert; die angewendete Familien- und Beitragslogik bleibt fachlich durch den Vorstand zu bestätigen."
  },
  {
    title: "Bearbeitung vor Übernahme",
    text:
      "Offene Anträge können intern bearbeitet werden. Nach dem Speichern wird der Fall wieder als Prüffall behandelt, damit eBuSy-Abgleich und Übernahme mit den korrigierten Daten erfolgen."
  },
  {
    title: "PDF und Bestätigungsmail",
    text:
      "Nach erfolgreicher interner eBuSy-Übernahme erzeugt das System eine PDF-Zusammenfassung und verschickt die Bestätigungsmail, sofern der Mailversand aktiv ist. Das PDF enthält Vereinslogo, Antrag, Einwilligungen und eBuSy-Übernahme."
  }
];

const statusRows = [
  ["pending", "Noch kein eBuSy-Abgleich oder noch offener Vorgang."],
  ["match_found", "Ein eindeutiger bestehender eBuSy-Treffer wurde gefunden."],
  ["multiple_matches", "Mehrere mögliche eBuSy-Treffer; bitte Kandidaten prüfen."],
  ["needs_review", "Der Fall braucht manuelle Prüfung vor der Übernahme."],
  ["no_match", "Kein bestehender Treffer; eine Neuanlage in eBuSy ist möglich."],
  ["created_in_ebusy", "Person(en), Attribute und einfache Mitgliedschaften wurden angelegt."],
  ["error", "Ein technischer oder fachlicher Fehler ist aufgetreten; Meldung im Detail prüfen."]
];

const workflowSteps = [
  "Antragsteller:in füllt das öffentliche Formular aus.",
  "Supabase speichert Antrag, SEPA-Daten, Einwilligungen und Zusatzpersonen.",
  "Die Verwaltung prüft den Antrag, öffnet Details und führt bei Bedarf den eBuSy-Abgleich aus.",
  "Bei bestehenden Treffern wird ein Kandidat verknüpft oder der Fall manuell geprüft.",
  "Bei Neuanlage legt die Verwaltung den Antrag in eBuSy an.",
  "Nach erfolgreicher Übernahme werden PDF-Zusammenfassung und Bestätigungsmail erzeugt, sofern der Mailversand aktiv ist."
];

const openItems = [
  "Familien- und Beitragslogik fachlich durch den Vorstand bestätigen.",
  "Minderjährigen-/Vertreterprozess fachlich final abnehmen.",
  "PDF-/Mail-Texte final rechtlich/fachlich gegenprüfen.",
  "Testpersonen aus dem eBuSy-Testlabor nach Live-Tests manuell in eBuSy entfernen."
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
              Das System erfasst Mitgliedsanträge digital, speichert sie in Supabase, prüft sie
              gegen eBuSy und kann neue Personen inklusive Attribute und einfache Mitgliedschaften
              nach eBuSy übertragen. Nach erfolgreicher interner Übernahme werden PDF und
              Bestätigungsmail vorbereitet bzw. versendet, sofern die Mailkonfiguration aktiv ist.
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

          <Section title="Offene fachliche Punkte">
            <ul className="list">
              {openItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section title="Wichtige Hinweise">
            <p>
              Die Verwaltungsoberfläche ist intern geschützt. Account- und Projektzugänge für
              GitHub, Vercel, Supabase, eBuSy und Mailversand sind projektbezogen zu behandeln.
              Änderungen an Produktivdaten sollten immer im TC-Vreden-Projektkontext geprüft
              werden.
            </p>
          </Section>
        </div>
      </section>
    </main>
  );
}
