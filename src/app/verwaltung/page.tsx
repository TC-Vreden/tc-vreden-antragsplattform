import Link from "next/link";
import type { Route } from "next";
import { getEbusyDiagnostics } from "@/lib/ebusy";
import { LookupForm } from "@/app/verwaltung/lookup-form";
import { ApplicationsTable } from "@/app/verwaltung/applications-table";
import { InternalUserBar } from "@/components/internal-user-bar";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { getApplicationsForManagement } from "@/lib/verwaltung";
import { getApplicationFormContent } from "@/lib/application-content";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { requireInternalPagePermission } from "@/lib/internal-auth";
import { hasInternalPermission } from "@/lib/internal-roles";

function getStatusLabel(endpoint: string) {
  if (endpoint.includes("/modules") && !endpoint.includes("memberships")) {
    return "Module";
  }

  if (endpoint.includes("/attributes")) {
    return "Attribute";
  }

  if (endpoint.includes("/groups")) {
    return "Gruppen";
  }

  if (endpoint.includes("/persons")) {
    return "Personen";
  }

  if (endpoint.includes("/memberships")) {
    return "Mitgliedschaften";
  }

  return "API";
}

export default async function VerwaltungPage() {
  const actor = await requireInternalPagePermission("applications.read");
  const diagnostics = await getEbusyDiagnostics();
  const { applications, error: applicationsError } = await getApplicationsForManagement();
  const formContent = await getApplicationFormContent();
  const isLiveMode = diagnostics.mode === "live";
  const confirmationPreviewRoute = "/verwaltung/bestaetigung-vorschau" as Route;
  const canUseLookup = hasInternalPermission(actor.role, "ebusy.lookup");

  await writeInternalAuditLog({
    actor,
    action: "applications.list",
    entityType: "application",
    details: {
      visibleCount: applications.length
    }
  });

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Verwaltungsbereich</h1>

        <InternalUserBar actor={actor} />

        <div className="dashboard-actions" style={{ marginBottom: 20 }}>
          <Link className="button secondary" href="/anmelden">
            Öffentliches Formular ansehen
          </Link>
          <Link className="button secondary" href={confirmationPreviewRoute}>
            Bestätigungsvorschau öffnen
          </Link>
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
            Einzelpersonen und Mehrpersonen-Anträge können nach eBuSy übertragen werden.
            Bei bestehenden eBuSy-Treffern wird kein neues Benutzerkonto angelegt; die vorhandene
            Person wird aktualisiert und um Attribute sowie Mitgliedschaft ergänzt.
            Mehrpersonen-Anträge setzen bei Zusatzpersonen den Hauptzahlerbezug zur Hauptperson
            inklusive Bankkonto/SEPA-Kopie des Hauptzahlers.
          </p>
        </article>

        {canUseLookup ? <LookupForm /> : null}

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
            <ApplicationsTable
              applications={applications}
              membershipOptions={formContent.membershipOptions}
              permissions={{
                canEditApplications: hasInternalPermission(actor.role, "applications.write"),
                canDeleteApplications: hasInternalPermission(actor.role, "applications.delete"),
                canRunEbusyMatch: hasInternalPermission(actor.role, "ebusy.match"),
                canTakeoverEbusy: hasInternalPermission(actor.role, "ebusy.takeover")
              }}
            />
          )}
        </article>

        <article className="technical-status" aria-label="Technischer Status">
          <span className="technical-status-title">Technischer Status</span>
          <span className={`status-chip ${isLiveMode ? "is-ok" : "is-warning"}`}>
            {isLiveMode ? "Live" : "Testmodus"}
          </span>
          {diagnostics.checks.map((check) => (
            <span
              className={`status-chip ${check.ok ? "is-ok" : "is-error"}`}
              key={check.endpoint}
              title={`${check.endpoint}: ${check.message}`}
            >
              {check.ok ? "✓" : "!"} {getStatusLabel(check.endpoint)}
            </span>
          ))}
        </article>
      </section>
    </main>
  );
}
