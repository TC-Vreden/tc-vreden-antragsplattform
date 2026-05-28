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
      className="hint-box"
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
      <div className="cta-row" style={{ marginTop: 0 }}>
        <Link className="button secondary" href={"/verwaltung" as Route}>
          Verwaltung
        </Link>
        {canReadDocs ? (
          <Link className="button secondary" href={"/verwaltung/handbuch" as Route}>
            Handbuch
          </Link>
        ) : null}
        {canReadTestLab ? (
          <Link className="button secondary" href={"/verwaltung/ebusy-testlabor" as Route}>
            Testlabor
          </Link>
        ) : null}
        {canManageUsers ? (
          <Link className="button secondary" href={"/verwaltung/benutzer" as Route}>
            Benutzer
          </Link>
        ) : null}
        {canReadAudit ? (
          <Link className="button secondary" href={"/verwaltung/audit" as Route}>
            Audit
          </Link>
        ) : null}
        {actor.authMode === "supabase" ? (
          <form action="/auth/sign-out" method="post">
            <button className="button secondary" type="submit">
              Logout
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
