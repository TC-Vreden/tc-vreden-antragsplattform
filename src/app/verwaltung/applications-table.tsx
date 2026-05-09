"use client";

import { Fragment, ReactNode, useMemo, useState } from "react";
import type {
  ApplicationMatchCandidate,
  ApplicationMatchPayload,
  ApplicationMatchSummary,
  ApplicationRow
} from "@/lib/application-types";
import {
  getAdditionalMemberRelationLabel,
  getMembershipLabel,
  getSalutationLabel,
  isMultiPersonMembership
} from "@/lib/application-options";

type Props = {
  applications: ApplicationRow[];
};

type LocalState = {
  loading: boolean;
  feedback?: ApplicationMatchSummary;
  candidatesExpanded?: boolean;
  detailsExpanded?: boolean;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "match_found":
      return "Treffer";
    case "multiple_matches":
      return "Mehrdeutig";
    case "needs_review":
      return "Manuell prüfen";
    case "no_match":
      return "Kein Treffer";
    case "person_created":
    case "created_in_ebusy":
      return "In eBuSy angelegt";
    case "pending":
      return "Noch offen";
    case "error":
      return "Fehler";
    default:
      return status;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("de-DE");
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function formatAddress(application: ApplicationRow) {
  return [application.street, application.postal_code, application.city]
    .filter(Boolean)
    .join(", ") || "-";
}

function formatIbanForInternalDisplay(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\s+/g, "");

  if (!normalized) {
    return "-";
  }

  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function getLegacySalutationFromNotes(notes: string | null | undefined) {
  const match = notes?.match(/^Anrede:\s*(FEMALE|MALE|NONE)\s*$/m);

  return match?.[1] ?? null;
}

function getApplicationSalutationLabel(application: ApplicationRow) {
  return getSalutationLabel(
    application.salutation ?? getLegacySalutationFromNotes(application.notes)
  );
}

function yesNo(value: boolean) {
  return value ? "Ja" : "Nein";
}

function hasAdditionalMembers(application: ApplicationRow) {
  return (application.family_members ?? []).length > 0;
}

function isMultiPersonApplication(application: ApplicationRow) {
  return isMultiPersonMembership(application.membership_kind) || hasAdditionalMembers(application);
}

function isTransferredApplication(application: ApplicationRow) {
  return (
    application.status === "transferred_to_ebusy" ||
    application.ebusy_match_status === "person_created" ||
    application.ebusy_match_status === "created_in_ebusy"
  );
}

function needsManualReview(application: ApplicationRow) {
  return ["multiple_matches", "needs_review", "error"].includes(application.ebusy_match_status);
}

function canCreateEbusyPerson(application: ApplicationRow) {
  return (
    !isMultiPersonApplication(application) &&
    !application.ebusy_person_id &&
    ["no_match", "needs_review", "multiple_matches"].includes(application.ebusy_match_status)
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <strong>{label}</strong>
      <div style={{ color: "var(--text-muted)", marginTop: 3 }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderTop: "1px solid var(--border)",
        paddingTop: 14
      }}
    >
      <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>{title}</h3>
      <div className="grid grid-2">{children}</div>
    </section>
  );
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

  const openRows = sortedRows.filter((application) => !isTransferredApplication(application));
  const transferredRows = sortedRows.filter(isTransferredApplication);
  const reviewCount = openRows.filter(needsManualReview).length;

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
          ...current[applicationId],
          loading: false,
          feedback: payload,
          candidatesExpanded:
            payload.status === "multiple_matches" || payload.status === "needs_review"
        }
      }));

      setRows((current) =>
        current.map((row) =>
          row.id === applicationId
            ? {
                ...row,
                updated_at: new Date().toISOString(),
                ebusy_match_status:
                  payload.status === "multiple_matches" ? "multiple_matches" : payload.status,
                ebusy_person_id: payload.externalPersonId ?? null
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
      const response = await fetch(
        `/api/verwaltung/applications/${applicationId}/select-candidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            externalPersonId: candidate.externalPersonId
          })
        }
      );

      const payload = (await response.json()) as ApplicationMatchSummary;

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setStates((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          loading: false,
          feedback: payload,
          candidatesExpanded: false
        }
      }));

      setRows((current) =>
        current.map((row) =>
          row.id === applicationId
            ? {
                ...row,
                updated_at: new Date().toISOString(),
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
                : "Die Verknüpfung konnte nicht gespeichert werden."
          }
        }
      }));
    }
  }

  async function handleCreateEbusy(applicationId: string) {
    const application = rows.find((row) => row.id === applicationId);
    const displayName = application
      ? `${application.first_name} ${application.last_name}`.trim()
      : "diesen Antrag";

    if (!application || isMultiPersonApplication(application)) {
      setStates((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          feedback: {
            status: "error",
            message:
              "Mehrpersonen-Anträge werden noch nicht automatisch angelegt. Bitte die Mehrpersonen-Anlage vorbereiten."
          }
        }
      }));
      return;
    }

    if (
      !window.confirm(
        `Soll für ${displayName} jetzt wirklich eine neue Person in eBuSy angelegt werden?`
      )
    ) {
      return;
    }

    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        loading: true
      }
    }));

    try {
      const response = await fetch(`/api/verwaltung/applications/${applicationId}/create-ebusy`, {
        method: "POST"
      });

      const payload = (await response.json()) as ApplicationMatchSummary;

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const now = new Date().toISOString();

      setStates((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          loading: false,
          feedback: payload,
          candidatesExpanded: false
        }
      }));

      setRows((current) =>
        current.map((row) =>
          row.id === applicationId
            ? {
                ...row,
                status: "transferred_to_ebusy",
                transferred_at: now,
                updated_at: now,
                ebusy_match_status: payload.status,
                ebusy_person_id: payload.externalPersonId ?? row.ebusy_person_id,
                ebusy_match_payload: {
                  status: payload.status,
                  source: "live",
                  message: payload.message,
                  candidates: row.ebusy_match_payload?.candidates ?? [],
                  createdPerson: payload.externalPersonId
                    ? {
                        externalPersonId: payload.externalPersonId,
                        displayName
                      }
                    : undefined
                }
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
                : "Die Person konnte nicht in eBuSy angelegt werden."
          }
        }
      }));
    }
  }

  async function handleDelete(applicationId: string) {
    const application = rows.find((row) => row.id === applicationId);
    const transferred = application ? isTransferredApplication(application) : false;
    const displayName = application
      ? `${application.first_name} ${application.last_name}`.trim()
      : "diesen Antrag";
    const hint = transferred
      ? "Der Antrag wird nur aus der Verwaltungsansicht/Supabase gelöscht. Eine eventuell bereits angelegte Person in eBuSy wird dadurch nicht gelöscht."
      : "Der Antrag wird aus der Verwaltungsansicht/Supabase gelöscht.";

    if (!window.confirm(`Soll der Eintrag für ${displayName} wirklich gelöscht werden?\n\n${hint}`)) {
      return;
    }

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
              error instanceof Error ? error.message : "Der Antrag konnte nicht gelöscht werden."
          }
        }
      }));
    }
  }

  function toggleCandidates(applicationId: string) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        candidatesExpanded: !current[applicationId]?.candidatesExpanded
      }
    }));
  }

  function toggleDetails(applicationId: string) {
    setStates((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        detailsExpanded: !current[applicationId]?.detailsExpanded
      }
    }));
  }

  function renderRows(list: ApplicationRow[], emptyMessage: string) {
    if (list.length === 0) {
      return <p style={{ color: "var(--text-muted)" }}>{emptyMessage}</p>;
    }

    return (
      <table className="table">
        <thead>
          <tr>
            <th>Eingang</th>
            <th>Name</th>
            <th>Mitgliedschaft</th>
            <th>Einordnung</th>
            <th>eBuSy</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {list.map((application) => {
            const localState = states[application.id];
            const matchPayload = application.ebusy_match_payload as ApplicationMatchPayload | null;
            const candidates = matchPayload?.candidates ?? [];
            const showCandidates = Boolean(localState?.candidatesExpanded) && candidates.length > 0;
            const showDetails = Boolean(localState?.detailsExpanded);
            const multiPersonApplication = isMultiPersonApplication(application);
            const transferred = isTransferredApplication(application);

            return (
              <Fragment key={application.id}>
                <tr>
                  <td>{formatDate(application.created_at)}</td>
                  <td>
                    <strong>
                      {application.first_name} {application.last_name}
                    </strong>
                    <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                      Vorgang: {application.id}
                      {application.ebusy_person_id
                        ? ` - eBuSy-ID: ${application.ebusy_person_id}`
                        : ""}
                    </div>
                  </td>
                  <td>{getMembershipLabel(application.membership_kind)}</td>
                  <td>
                    {multiPersonApplication ? (
                      <strong>Mehrpersonen-Antrag</strong>
                    ) : (
                      "Einzelperson"
                    )}
                    {hasAdditionalMembers(application) ? (
                      <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                        {application.family_members.length} Zusatzperson(en)
                      </div>
                    ) : null}
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
                    {transferred ? (
                      <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                        Übertragen am {formatDate(application.transferred_at ?? application.updated_at)}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => toggleDetails(application.id)}
                        style={{ minWidth: 190 }}
                      >
                        {showDetails ? "Details ausblenden" : "Details anzeigen"}
                      </button>

                      {!transferred ? (
                        <button
                          className="button"
                          type="button"
                          disabled={Boolean(localState?.loading)}
                          onClick={() => handleMatch(application.id)}
                          style={{ minWidth: 190 }}
                        >
                          {localState?.loading
                            ? "Abgleich läuft..."
                            : application.ebusy_match_status === "pending"
                              ? "Mit eBuSy abgleichen"
                              : "Erneut abgleichen"}
                        </button>
                      ) : null}

                      {candidates.length > 0 ? (
                        <button
                          className="button secondary"
                          type="button"
                          disabled={Boolean(localState?.loading)}
                          onClick={() => toggleCandidates(application.id)}
                          style={{ minWidth: 190 }}
                        >
                          {showCandidates
                            ? "Kandidaten ausblenden"
                            : `Kandidaten ansehen (${candidates.length})`}
                        </button>
                      ) : null}

                      {canCreateEbusyPerson(application) ? (
                        <button
                          className="button secondary"
                          type="button"
                          disabled={Boolean(localState?.loading)}
                          title="Legt aus diesem Einzelpersonen-Antrag eine neue Person in eBuSy an."
                          onClick={() => handleCreateEbusy(application.id)}
                          style={{ minWidth: 190 }}
                        >
                          {localState?.loading ? "Anlage läuft..." : "In eBuSy anlegen"}
                        </button>
                      ) : null}

                      {!transferred && multiPersonApplication ? (
                        <button
                          className="button secondary"
                          type="button"
                          disabled
                          title="Mehrpersonen-Anträge brauchen zuerst eine eigene Batch-Routine."
                          style={{ minWidth: 190 }}
                        >
                          Mehrpersonen-Anlage vorbereiten
                        </button>
                      ) : null}

                      <button
                        className="button secondary"
                        type="button"
                        disabled={Boolean(localState?.loading)}
                        title={
                          transferred
                            ? "Löscht nur den gespeicherten Antrag aus der Verwaltung, nicht die Person in eBuSy."
                            : "Löscht den gespeicherten Antrag aus der Verwaltung."
                        }
                        onClick={() => handleDelete(application.id)}
                        style={{ minWidth: 190 }}
                      >
                        {transferred ? "Eintrag löschen" : "Testeintrag löschen"}
                      </button>
                    </div>
                  </td>
                </tr>

                {showDetails ? renderDetails(application, candidates, transferred) : null}
                {showCandidates ? renderCandidates(application, candidates, localState) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderDetails(
    application: ApplicationRow,
    candidates: ApplicationMatchCandidate[],
    transferred: boolean
  ) {
    return (
      <tr>
        <td colSpan={6} style={{ background: "#fffdf6" }}>
          <div style={{ display: "grid", gap: 18, padding: "10px 0" }}>
            {isMultiPersonApplication(application) && !transferred ? (
              <div className="warning-box">
                <strong>Mehrpersonen-Antrag</strong>
                <p style={{ margin: "8px 0 0" }}>
                  Dieser Antrag enthält mehrere Personen. Die automatische eBuSy-Anlage ist hier
                  gesperrt, damit nicht versehentlich nur die Hauptperson angelegt wird.
                </p>
              </div>
            ) : null}

            <DetailSection title="Hauptperson">
              <DetailItem label="Anrede" value={getApplicationSalutationLabel(application)} />
              <DetailItem label="Vorname" value={application.first_name} />
              <DetailItem label="Nachname" value={application.last_name} />
              <DetailItem label="Geburtsdatum" value={formatDate(application.birth_date)} />
              <DetailItem label="E-Mail" value={application.email} />
              <DetailItem label="Telefon" value={displayValue(application.phone)} />
              <DetailItem label="Mobil" value={displayValue(application.mobile)} />
              <DetailItem label="Adresse" value={formatAddress(application)} />
            </DetailSection>

            <DetailSection title="Mitgliedschaft">
              <DetailItem label="Technischer Wert" value={displayValue(application.membership_kind)} />
              <DetailItem label="Sichtbares Label" value={getMembershipLabel(application.membership_kind)} />
              <DetailItem
                label="Familienbezug"
                value={
                  hasAdditionalMembers(application)
                    ? `${application.family_members.length} Zusatzperson(en)`
                    : "Kein Familienbezug erfasst"
                }
              />
              <DetailItem
                label="Nachweis reduziert bis"
                value={formatDate(application.student_status_until)}
              />
            </DetailSection>

            <DetailSection title="Zusatzpersonen / Familienmitglieder">
              {hasAdditionalMembers(application) ? (
                <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
                  {application.family_members.map((member, index) => (
                    <div
                      key={`${application.id}-${index}-${member.firstName}-${member.lastName}`}
                      style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}
                    >
                      <strong>
                        {index + 1}. {displayValue(member.firstName)} {displayValue(member.lastName)}
                      </strong>
                      <div className="grid grid-2" style={{ marginTop: 10 }}>
                        <DetailItem
                          label="Rolle"
                          value={getAdditionalMemberRelationLabel(member.relation)}
                        />
                        <DetailItem
                          label="Anrede"
                          value={getSalutationLabel(member.salutation)}
                        />
                        <DetailItem label="Geburtsdatum" value={formatDate(member.birthDate)} />
                        <DetailItem label="E-Mail" value={displayValue(member.email)} />
                        <DetailItem label="Mobil" value={displayValue(member.mobile)} />
                        <DetailItem
                          label="Adresse"
                          value={
                            [member.street, member.postalCode, member.city]
                              .filter(Boolean)
                              .join(", ") || "-"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DetailItem label="Zusatzpersonen" value="Keine Zusatzpersonen erfasst" />
              )}
            </DetailSection>

            <DetailSection title="Minderjährige / gesetzliche Vertreter">
              <DetailItem label="Vertreter" value={displayValue(application.guardian_name)} />
              <DetailItem label="E-Mail" value={displayValue(application.guardian_email)} />
              <DetailItem label="Telefon" value={displayValue(application.guardian_phone)} />
              <DetailItem label="Zustimmung" value={yesNo(application.guardian_consent)} />
            </DetailSection>

            <DetailSection title="SEPA / Zahlung">
              <DetailItem label="Kontoinhaber" value={displayValue(application.account_holder)} />
              <DetailItem label="IBAN" value={formatIbanForInternalDisplay(application.iban)} />
              <DetailItem label="Kreditinstitut" value="Nicht im Formular erfasst" />
              <DetailItem
                label="Anschrift Kontoinhaber"
                value={displayValue(application.account_holder_address)}
              />
              <DetailItem label="SEPA-Mandat bestätigt" value={yesNo(application.accepts_sepa)} />
            </DetailSection>

            <DetailSection title="Einwilligungen">
              <DetailItem
                label="Satzung / Beiträge / Datenschutz"
                value={yesNo(application.accepts_statutes && application.accepts_privacy)}
              />
              <DetailItem label="Foto / Video" value={yesNo(application.accepts_photo_video)} />
              <DetailItem label="WhatsApp" value={yesNo(application.accepts_whatsapp)} />
              <DetailItem label="Datenschutz separat bestätigt" value={yesNo(application.accepts_privacy)} />
              <DetailItem label="Hinweise" value={displayValue(application.notes)} />
            </DetailSection>

            <DetailSection title="eBuSy">
              <DetailItem label="Match-Status" value={getStatusLabel(application.ebusy_match_status)} />
              <DetailItem label="eBuSy-ID" value={displayValue(application.ebusy_person_id)} />
              <DetailItem label="Kandidaten" value={`${candidates.length}`} />
              <DetailItem label="Letzter Abgleich" value={formatDate(application.updated_at)} />
              <DetailItem
                label="Übertragungsstatus"
                value={transferred ? "Bereits übertragen" : "Noch offen"}
              />
              <DetailItem
                label="Übertragen am"
                value={formatDate(application.transferred_at)}
              />
            </DetailSection>
          </div>
        </td>
      </tr>
    );
  }

  function renderCandidates(
    application: ApplicationRow,
    candidates: ApplicationMatchCandidate[],
    localState: LocalState | undefined
  ) {
    return (
      <tr>
        <td colSpan={6} style={{ background: "#fffdf6" }}>
          <div style={{ padding: "8px 0" }}>
            <strong>Mögliche eBuSy-Treffer</strong>
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
                        Diesen Treffer verknüpfen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="grid grid-2">
        <div className="hint-box">
          <strong>{openRows.length} offene Anträge</strong>
          <p style={{ margin: "8px 0 0" }}>
            Davon benötigen {reviewCount} eine manuelle Prüfung.
          </p>
        </div>
        <div className="hint-box">
          <strong>{transferredRows.length} bereits übertragene Anträge</strong>
          <p style={{ margin: "8px 0 0" }}>
            Diese bleiben nachvollziehbar erhalten und können bei Testfällen gezielt gelöscht
            werden.
          </p>
        </div>
      </div>

      <section>
        <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>Offene Anträge</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>
          Hier stehen alle neuen Anträge, unklare Treffer und Fälle, die noch nicht nach eBuSy
          übertragen wurden.
        </p>
        {renderRows(openRows, "Keine offenen Anträge vorhanden.")}
      </section>

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Bereits übertragene Anträge anzeigen ({transferredRows.length})
        </summary>
        <div style={{ marginTop: 12 }}>
          {renderRows(transferredRows, "Noch keine Anträge nach eBuSy übertragen.")}
        </div>
      </details>
    </div>
  );
}
