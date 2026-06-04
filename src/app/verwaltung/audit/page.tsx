import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { InternalUserBar } from "@/components/internal-user-bar";
import { getInternalAuditLog } from "@/lib/internal-audit";
import { requireInternalPagePermission } from "@/lib/internal-auth";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}

function formatDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details);

  if (entries.length === 0) {
    return "-";
  }

  return (
    <div className="audit-details">
      {entries.map(([key, value]) => (
        <div className="audit-detail" key={key}>
          <span className="audit-detail-key">{key}</span>
          <span className="audit-detail-value">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AuditPage() {
  const actor = await requireInternalPagePermission("audit.read");
  const { entries, error } = await getInternalAuditLog();

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Audit-Log</h1>
        <p>
          Nachvollziehbarkeit für interne Aktionen: Benutzer, Zeitpunkt, Aktion und technische
          Referenz werden ohne Passwörter oder Secrets protokolliert.
        </p>

        <InternalUserBar actor={actor} />

        {error ? (
          <div className="warning-box">
            <strong>Audit-Log nicht verfügbar</strong>
            <p style={{ margin: "8px 0 0" }}>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <p>Noch keine Audit-Einträge vorhanden.</p>
        ) : (
          <div className="table-scroll audit-table-scroll">
            <table className="table audit-table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Benutzer</th>
                  <th>Aktion</th>
                  <th>Objekt</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>
                      <strong className="audit-email">{entry.actor_email ?? "-"}</strong>
                      <div className="audit-muted">{entry.actor_role ?? "-"}</div>
                    </td>
                    <td className="audit-code">{entry.action}</td>
                    <td>
                      <span className="audit-code">{entry.entity_type ?? "-"}</span>
                      {entry.entity_id ? (
                        <div className="audit-muted audit-id">{entry.entity_id}</div>
                      ) : null}
                    </td>
                    <td>{formatDetails(entry.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
