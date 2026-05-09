import Link from "next/link";
import type { Route } from "next";
import { getEbusyDiagnostics } from "@/lib/ebusy";
import { LookupForm } from "@/app/verwaltung/lookup-form";
import { ApplicationsTable } from "@/app/verwaltung/applications-table";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { getApplicationsForManagement } from "@/lib/verwaltung";

export default async function VerwaltungPage() {
  const diagnostics = await getEbusyDiagnostics();
  const { applications, error: applicationsError } = await getApplicationsForManagement();
  const isLiveMode = diagnostics.mode === "live";
  const testLabRoute = "/verwaltung/ebusy-testlabor" as Route;

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 style={{ maxWidth: "unset", fontSize: "2.5rem" }}>Verwaltungsbereich</h1>
        <p>
          Diese Ansicht ist für die interne Bearbeitung gedacht. Sensible eBuSy-Daten werden
          serverseitig abgefragt und nur in stark reduzierter Form angezeigt.
        </p>

        <div className="cta-row" style={{ marginBottom: 20 }}>
          <Link className="button secondary" href="/anmelden">
            Öffentliches Formular ansehen
          </Link>
          <Link className="button secondary" href={testLabRoute}>
            eBuSy-Testlabor öffnen
          </Link>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <article className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.2rem" }}>Arbeitsweise</h2>
            <ul className="list">
              <li>Im Moment ist dies eine direkte interne Suche in eBuSy</li>
              <li>Der Personenabgleich erfolgt serverseitig über die API</li>
              <li>Sensible Finanzdaten werden nicht in der Oberfläche gezeigt</li>
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
              Die aktuelle Ansicht läuft noch im Testmodus. Darum sucht der Bereich im Moment
              noch nicht live in eBuSy, sondern verwendet nur den internen Testpfad. Erst nach
              einem erfolgreichen Live-Deploy mit den richtigen Vercel-Umgebungsvariablen springt
              der Modus hier auf <strong>live</strong>.
            </p>
          </article>
        ) : null}

        <article className="hint-box" style={{ marginBottom: 20 }}>
          <strong>Aktueller Arbeitsstand</strong>
          <p style={{ margin: "10px 0 0" }}>
            Neue Mitgliedsanträge erscheinen zuerst als offene Vorgänge. Die Liste zeigt, welche
            Anträge neu sind, welche einen unklaren eBuSy-Treffer haben und welche bereits als
            Person nach eBuSy übertragen wurden.
          </p>
          <p style={{ margin: "10px 0 0" }}>
            Einzelpersonen können weiterhin nach eBuSy übertragen werden. Mehrpersonen-Anträge
            werden bewusst gekennzeichnet und noch nicht automatisch angelegt, bis die sichere
            Familien- und Beitragslogik geklärt ist.
          </p>
        </article>

        <LookupForm />

        <article className="card" style={{ padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Anträge verwalten</h2>
          <p>
            Bearbeite neue Anträge Schritt für Schritt: Details prüfen, eBuSy-Abgleich ansehen,
            bei Einzelpersonen eine neue eBuSy-Person anlegen oder unklare Treffer manuell
            entscheiden. Erfolgreich übertragene Anträge verschwinden aus der offenen Liste und
            bleiben unten nachvollziehbar erhalten.
          </p>

          {applicationsError ? (
            <div className="warning-box">
              <strong>Antragsliste noch nicht verfügbar</strong>
              <p style={{ margin: "10px 0 0" }}>
                {applicationsError}. Sehr wahrscheinlich fehlt noch der{" "}
                <strong>SUPABASE_SERVICE_ROLE_KEY</strong> in Vercel.
              </p>
            </div>
          ) : applications.length === 0 ? (
            <p>Noch keine gespeicherten Anträge vorhanden.</p>
          ) : (
            <ApplicationsTable applications={applications} />
          )}
        </article>

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

      </section>
    </main>
  );
}
