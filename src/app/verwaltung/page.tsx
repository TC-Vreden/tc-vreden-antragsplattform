import Link from "next/link";
import { getEbusyDiagnostics } from "@/lib/ebusy";
import { LookupForm } from "@/app/verwaltung/lookup-form";
import { TcVredenLogo } from "@/components/tc-vreden-logo";

const demoRows = [
  {
    name: "Anna Beispiel",
    type: "Neuanmeldung",
    status: "Neu",
    match: "Bereit fuer echten Personenabgleich"
  },
  {
    name: "Max Muster",
    type: "Neuanmeldung",
    status: "Geprueft",
    match: "Noch ohne Datenbank-Anbindung"
  }
];

export default async function VerwaltungPage() {
  const diagnostics = await getEbusyDiagnostics();
  const isLiveMode = diagnostics.mode === "live";

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 style={{ maxWidth: "unset", fontSize: "2.5rem" }}>Verwaltungsbereich</h1>
        <p>
          Diese Ansicht ist fuer die interne Bearbeitung gedacht. Sensible eBuSy-Daten werden
          serverseitig abgefragt und nur in stark reduzierter Form angezeigt.
        </p>

        <div className="cta-row" style={{ marginBottom: 20 }}>
          <Link className="button secondary" href="/anmelden">
            Oeffentliches Formular ansehen
          </Link>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <article className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.2rem" }}>Arbeitsweise</h2>
            <ul className="list">
              <li>Im Moment ist dies eine direkte interne Suche in eBuSy</li>
              <li>Der Personenabgleich erfolgt serverseitig ueber die API</li>
              <li>Sensible Finanzdaten werden nicht in der Oberflaeche gezeigt</li>
            </ul>
          </article>

          <article className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.2rem" }}>Systemstatus</h2>
            <ul className="list">
              <li>Modus: {diagnostics.mode}</li>
              {diagnostics.checks.map((check) => (
                <li key={check.endpoint}>
                  {check.ok ? "OK" : "Fehler"}: {check.endpoint}
                </li>
              ))}
            </ul>
          </article>
        </div>

        {!isLiveMode ? (
          <article className="warning-box" style={{ marginBottom: 20 }}>
            <strong>Hinweis zur Suche</strong>
            <p style={{ margin: "10px 0 0" }}>
              Die aktuelle Ansicht laeuft noch im Testmodus. Darum sucht der Bereich im Moment
              noch nicht live in eBuSy, sondern verwendet nur den internen Testpfad. Erst nach
              einem erfolgreichen Live-Deploy mit den richtigen Vercel-Umgebungsvariablen springt
              der Modus hier auf <strong>live</strong>.
            </p>
          </article>
        ) : null}

        <article className="hint-box" style={{ marginBottom: 20 }}>
          <strong>Aktueller Stand des Prototyps</strong>
          <p style={{ margin: "10px 0 0" }}>
            Der Bereich sucht aktuell noch nicht in bereits eingegangenen Webformularen, sondern
            direkt in euren vorhandenen eBuSy-Mitgliedsdaten. Du gibst also Name, E-Mail oder
            Geburtsdatum ein und das System prueft serverseitig, ob dazu schon eine Person in
            eBuSy existiert.
          </p>
          <p style={{ margin: "10px 0 0" }}>
            Der naechste Ausbauschritt ist dann: erst Webformular speichern, danach den
            gespeicherten Antrag automatisch gegen eBuSy abgleichen und als Vorgang in einer
            internen Liste anzeigen.
          </p>
        </article>

        <LookupForm />

        <article className="card" style={{ padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.2rem" }}>API-Status</h2>
          <ul className="list">
            {diagnostics.checks.map((check) => (
              <li key={`${check.endpoint}-message`}>
                <strong>{check.endpoint}</strong>: {check.message}
              </li>
            ))}
          </ul>
        </article>

        <table className="table">
          <thead>
            <tr>
              <th>Vorgang</th>
              <th>Art</th>
              <th>Status</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {demoRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.type}</td>
                <td>{row.status}</td>
                <td>{row.match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
