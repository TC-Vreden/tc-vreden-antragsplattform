"use client";

import { Fragment, useMemo, useState } from "react";
import type {
  ApplicationMatchCandidate,
  ApplicationMatchPayload,
  ApplicationMatchSummary,
  ApplicationRow
} from "@/lib/application-types";

type Props = {
  applications: ApplicationRow[];
};

type LocalState = {
  loading: boolean;
  feedback?: ApplicationMatchSummary;
  expanded?: boolean;
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
          feedback: payload,
          expanded: payload.status === "multiple_matches"
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

  async function handleSelectCandidate(applicationId: string, candidate: ApplicationMatchCandidate) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        loading: true
      }
    }));

    try {
      const response = await fetch(`/api/verwaltung/applications/${applicationId}/select-candidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          externalPersonId: candidate.externalPersonId
        })
      });

      const payload = (await response.json()) as ApplicationMatchSummary;

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setStates((current) => ({
        ...current,
        [applicationId]: {
          loading: false,
          feedback: payload,
          expanded: false
        }
      }));

      setRows((current) =>
        current.map((row) =>
          row.id === applicationId
            ? {
                ...row,
                ebusy_match_status: "match_found",
                ebusy_person_id: payload.externalPersonId ?? row.ebusy_person_id
              }
            : row
        )
      );
    } catch (error) {
      setStates((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          loading: false,
          feedback: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Die Verknuepfung konnte nicht gespeichert werden."
          }
        }
      }));
    }
  }

  async function handleDelete(applicationId: string) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        loading: true
      }
    }));

    try {
      const response = await fetch(`/api/verwaltung/applications/${applicationId}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setRows((current) => current.filter((row) => row.id !== applicationId));
      setStates((current) => {
        const clone = { ...current };
        delete clone[applicationId];
        return clone;
      });
    } catch (error) {
      setStates((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          loading: false,
          feedback: {
            status: "error",
            message:
              error instanceof Error ? error.message : "Der Antrag konnte nicht geloescht werden."
          }
        }
      }));
    }
  }

  function toggleExpanded(applicationId: string) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        expanded: !current[applicationId]?.expanded
      }
    }));
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
          const matchPayload = application.ebusy_match_payload as ApplicationMatchPayload | null;
          const candidates = matchPayload?.candidates ?? [];
          const showCandidates = Boolean(localState?.expanded) && candidates.length > 0;

          return (
            <Fragment key={application.id}>
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
                  <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                    {localState?.feedback?.message ??
                      matchPayload?.message ??
                      (application.ebusy_match_status === "pending"
                        ? "Noch kein eBuSy-Abgleich erfolgt."
                        : "")}
                  </div>
                </td>
                <td>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button
                      className="button"
                      type="button"
                      disabled={Boolean(localState?.loading)}
                      onClick={() => handleMatch(application.id)}
                      style={{ minWidth: 180 }}
                    >
                      {localState?.loading
                        ? "Abgleich laeuft..."
                        : application.ebusy_match_status === "pending"
                          ? "Mit eBuSy abgleichen"
                          : "Erneut abgleichen"}
                    </button>

                    {candidates.length > 0 ? (
                      <button
                        className="button secondary"
                        type="button"
                        disabled={Boolean(localState?.loading)}
                        onClick={() => toggleExpanded(application.id)}
                        style={{ minWidth: 180 }}
                      >
                        {showCandidates ? "Treffer ausblenden" : `Treffer ansehen (${candidates.length})`}
                      </button>
                    ) : null}

                    <button
                      className="button secondary"
                      type="button"
                      disabled={Boolean(localState?.loading)}
                      onClick={() => handleDelete(application.id)}
                      style={{ minWidth: 180 }}
                    >
                      Testeintrag loeschen
                    </button>
                  </div>
                </td>
              </tr>
              {showCandidates ? (
                <tr>
                  <td colSpan={6} style={{ background: "#fffdf6" }}>
                    <div style={{ padding: "8px 0" }}>
                      <strong>Moegliche eBuSy-Treffer</strong>
                      <table className="table" style={{ marginTop: 10 }}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>eBuSy-ID</th>
                            <th>Geburtsdatum</th>
                            <th>E-Mail</th>
                            <th>Mitgliedsnummer</th>
                            <th>Treffergrund</th>
                            <th>Aktion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map((candidate) => (
                            <tr
                              key={`${application.id}-${candidate.externalPersonId}-${candidate.matchReason}`}
                            >
                              <td>{candidate.displayName ?? "-"}</td>
                              <td>{candidate.externalPersonId}</td>
                              <td>{candidate.birthDate ?? "-"}</td>
                              <td>{candidate.email ?? "-"}</td>
                              <td>{candidate.membershipNumber ?? "-"}</td>
                              <td>{candidate.matchReason}</td>
                              <td>
                                <button
                                  className="button"
                                  type="button"
                                  disabled={Boolean(localState?.loading)}
                                  onClick={() => handleSelectCandidate(application.id, candidate)}
                                >
                                  Diesen Treffer verknuepfen
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
