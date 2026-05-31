import Link from "next/link";
import type { Route } from "next";
import type { InternalActor } from "@/lib/internal-auth";
import { getInternalRoleLabel, hasInternalPermission } from "@/lib/internal-roles";

type Props = {
  actor: InternalActor;
};

export function InternalUserBar({ actor }: Props) {
  const canManageUsers = hasInternalPermission(actor.role, "users.manage");
  const canReadAudit = hasInternalPermission(actor.role, "audit.read");
  const canReadDocs = hasInternalPermission(actor.role, "docs.read");
  const canReadTestLab = hasInternalPermission(actor.role, "testlab.read");

  return (
    <div
      className="hint-box internal-user-bar"
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
        marginBottom: 20
      }}
    >
      <div>
        <strong>{actor.displayName ?? actor.email}</strong>
        <p style={{ margin: "4px 0 0" }}>
          Rolle: {getInternalRoleLabel(actor.role)}
          {actor.authMode === "basic" ? " (Uebergangs-Zugang)" : ""}
        </p>
      </div>
      <nav className="internal-nav" aria-label="Interne Navigation">
        <Link className="internal-nav-link" href={"/verwaltung" as Route}>
          Verwaltung
        </Link>
        {canReadDocs ? (
          <Link className="internal-nav-link" href={"/verwaltung/handbuch" as Route}>
            Handbuch
          </Link>
        ) : null}
        {canReadTestLab ? (
          <Link className="internal-nav-link" href={"/verwaltung/ebusy-testlabor" as Route}>
            Testlabor
          </Link>
        ) : null}
        {canManageUsers ? (
          <Link className="internal-nav-link" href={"/verwaltung/benutzer" as Route}>
            Benutzer
          </Link>
        ) : null}
        {canReadAudit ? (
          <Link className="internal-nav-link" href={"/verwaltung/audit" as Route}>
            Audit
          </Link>
        ) : null}
        {actor.authMode === "supabase" ? (
          <form action="/auth/sign-out" method="post">
            <button className="internal-nav-link internal-nav-button" type="submit">
              Logout
            </button>
          </form>
        ) : null}
      </nav>
    </div>
  );
}
