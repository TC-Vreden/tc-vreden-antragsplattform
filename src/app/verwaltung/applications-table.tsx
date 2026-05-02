"use client";

import { useMemo, useState } from "react";
import type { ApplicationMatchSummary, ApplicationRow } from "@/lib/application-types";

type Props = {
  applications: ApplicationRow[];
};

type LocalState = {
  loading: boolean;
  feedback?: ApplicationMatchSummary;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "match_found":
      return "Treffer";
    case "multiple_matches":
      return "Mehrdeutig";
    case "no_match":
      return "Kein Treffer";
    case "pending":
      return "Noch offen";
    default:
      return status;
  }
}

export function ApplicationsTable({ applications }: Props) {
  const [rows, setRows] = useState(applications);
  const [states, setStates] = useState<Record<string, LocalState>>({});

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ),
    [rows]
  );

  async function handleMatch(applicationId: string) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        loading: true
      }
    }));

    try {
      const response = await fetch(`/api/verwaltung/applications/${applicationId}/match`, {
        method: "POST"
      });

      const payload = (await response.json()) as ApplicationMatchSummary;

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setStates((current) => ({
        ...current,
        [applicationId]: {
          loading: false,
          feedback: payload
        }
      }));

      setRows((current) =>
        current.map((row) =>
          row.id === applicationId
            ? {
                ...row,
                ebusy_match_status:
                  payload.status === "multiple_matches"
                    ? "multiple_matches"
                    : payload.status,
                ebusy_person_id: payload.externalPersonId ?? row.ebusy_person_id
              }
            : row
        )
      );
    } catch (error) {
      setStates((current) => ({
        ...current,
        [applicationId]: {
          loading: false,
          feedback: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Der eBuSy-Abgleich ist fehlgeschlagen."
          }
        }
      }));
    }
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Eingang</th>
          <th>Name</th>
          <th>Mitgliedschaft</th>
          <th>Familienbezug</th>
          <th>eBuSy</th>
          <th>Aktion</th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((application) => {
          const localState = states[application.id];

          return (
            <tr key={application.id}>
              <td>{new Date(application.created_at).toLocaleDateString("de-DE")}</td>
              <td>
                <strong>
                  {application.first_name} {application.last_name}
                </strong>
                <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                  Vorgang: {application.id}
                  {application.ebusy_person_id ? ` · eBuSy-ID: ${application.ebusy_person_id}` : ""}
                </div>
              </td>
              <td>{application.membership_kind ?? "-"}</td>
              <td>
                {application.family_members?.length
                  ? `${application.family_members.length} Person(en) zugeordnet`
                  : "-"}
              </td>
              <td>
                <strong>{getStatusLabel(application.ebusy_match_status)}</strong>
                {localState?.feedback ? (
                  <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                    {localState.feedback.message}
                  </div>
                ) : null}
              </td>
              <td>
                <button
                  className="button"
                  type="button"
                  disabled={Boolean(localState?.loading)}
                  onClick={() => handleMatch(application.id)}
                  style={{ minWidth: 180 }}
                >
                  {localState?.loading ? "Abgleich laeuft..." : "Mit eBuSy abgleichen"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
