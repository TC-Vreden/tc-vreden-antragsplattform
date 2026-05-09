"use client";

import { useState } from "react";
import type {
  EbusyTestAction,
  EbusyTestCheck,
  EbusyTestLabResult,
  EbusyTestScenario
} from "@/lib/ebusy-test-lab";

type Props = {
  scenarios: EbusyTestScenario[];
  writeEnabled: boolean;
};

function getStatusLabel(status: EbusyTestCheck["status"]) {
  switch (status) {
    case "ok":
      return "OK";
    case "missing":
      return "Fehlt in eBuSy";
    case "different":
      return "Abweichend";
    case "not_sent":
      return "Nicht gesendet";
  }
}

function getActionLabel(action: EbusyTestAction, isLoading: boolean) {
  if (action === "dry_run") {
    return isLoading ? "Datenpaket wird geprüft..." : "Datenpaket prüfen";
  }

  if (action === "create_person_with_attributes") {
    return isLoading ? "Live-Test mit Attributen läuft..." : "Live-Testperson + Attribute anlegen";
  }

  if (action === "create_person_with_membership") {
    return isLoading ? "Live-Test mit Mitgliedschaft läuft..." : "Live-Testperson + Mitgliedschaft anlegen";
  }

  if (action === "create_person_with_attributes_and_membership") {
    return isLoading
      ? "Live-Test komplett läuft..."
      : "Live-Testperson + Attribute + Mitgliedschaft anlegen";
  }

  return isLoading ? "Live-Test läuft..." : "Live-Testperson anlegen";
}

export function EbusyTestLabClient({ scenarios, writeEnabled }: Props) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [loadingAction, setLoadingAction] = useState<EbusyTestAction | null>(null);
  const [result, setResult] = useState<EbusyTestLabResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: EbusyTestAction) {
    const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);

    if (!selectedScenario) {
      setError("Bitte zuerst ein Testszenario auswählen.");
      return;
    }

    if (action !== "dry_run") {
      const writesAttributes =
        action === "create_person_with_attributes" ||
        action === "create_person_with_attributes_and_membership";
      const writesMembership =
        action === "create_person_with_membership" ||
        action === "create_person_with_attributes_and_membership";
      const confirmationText =
        "Soll jetzt wirklich eine eBuSy-Testperson angelegt werden?\n\n" +
        (writesAttributes
          ? "Zusätzlich werden die Test-Attribute für eine erwachsene Einzelperson gesetzt.\n\n"
          : "") +
        (writesMembership
          ? "Zusätzlich wird eine einfache Test-Mitgliedschaft gesetzt: aktiv, Status ACTIVE, Abteilung Tennis und Eintrittsdatum. Eine Beitragsart wird noch nicht geschrieben.\n\n"
          : "") +
        "Die Testperson wird nicht automatisch gelöscht und muss nach der Prüfung in eBuSy entfernt werden.";

      if (!window.confirm(confirmationText)) {
        return;
      }
    }

    setLoadingAction(action);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/verwaltung/ebusy-testlabor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          action
        })
      });

      const payload = (await response.json()) as EbusyTestLabResult | { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setResult(payload as EbusyTestLabResult);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Das eBuSy-Testlabor konnte nicht ausgeführt werden."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <article className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.2rem" }}>Testszenario</h2>
        <label className="field-label" htmlFor="scenario">
          Szenario auswählen
        </label>
        <select
          id="scenario"
          value={selectedScenarioId}
          onChange={(event) => setSelectedScenarioId(event.target.value)}
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.title}
            </option>
          ))}
        </select>

        {scenarios.map((scenario) =>
          scenario.id === selectedScenarioId ? (
            <p key={scenario.id} style={{ color: "var(--text-muted)", marginTop: 12 }}>
              {scenario.description}
            </p>
          ) : null
        )}

        <div className="cta-row" style={{ marginTop: 16 }}>
          <button
            className="button secondary"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("dry_run")}
          >
            {getActionLabel("dry_run", loadingAction === "dry_run")}
          </button>
          <button
            className="button"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("create_person")}
          >
            {getActionLabel("create_person", loadingAction === "create_person")}
          </button>
          <button
            className="button"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("create_person_with_attributes")}
          >
            {getActionLabel(
              "create_person_with_attributes",
              loadingAction === "create_person_with_attributes"
            )}
          </button>
          <button
            className="button"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("create_person_with_membership")}
          >
            {getActionLabel(
              "create_person_with_membership",
              loadingAction === "create_person_with_membership"
            )}
          </button>
          <button
            className="button"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("create_person_with_attributes_and_membership")}
          >
            {getActionLabel(
              "create_person_with_attributes_and_membership",
              loadingAction === "create_person_with_attributes_and_membership"
            )}
          </button>
        </div>

        {!writeEnabled ? (
          <div className="warning-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest gesperrt</strong>
            <p style={{ margin: "8px 0 0" }}>
              Der Live-Button ist absichtlich serverseitig gesperrt, bis{" "}
              <code>EBUSY_TEST_LAB_WRITE_ENABLED=true</code> gesetzt ist. Der Datenpaket-Test
              funktioniert trotzdem ohne eBuSy-Schreibzugriff.
            </p>
          </div>
        ) : (
          <div className="hint-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest freigeschaltet</strong>
            <p style={{ margin: "8px 0 0" }}>
              Der Live-Test darf eine eindeutig markierte Testperson in eBuSy anlegen. Bitte die
              Testperson nach der Prüfung in eBuSy wieder löschen.
            </p>
          </div>
        )}
      </article>

      {error ? (
        <article className="warning-box">
          <strong>Test fehlgeschlagen</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
        </article>
      ) : null}

      {result ? (
        <article className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Testergebnis</h2>
          <p>{result.message}</p>

          <ul className="list">
            <li>Modus: {result.mode}</li>
            <li>Live-Schreibtest freigeschaltet: {result.writeEnabled ? "Ja" : "Nein"}</li>
            <li>Testszenario: {result.scenario.title}</li>
            <li>Mitgliedschaft: {result.scenario.membershipLabel}</li>
            {result.createdPerson ? (
              <li>
                eBuSy-Testperson: {result.createdPerson.displayName} (interne eBuSy-ID:{" "}
                {result.createdPerson.externalPersonId}
                {result.createdPerson.customerId
                  ? `, Kundennummer: ${result.createdPerson.customerId}`
                  : ""}
                {result.createdPerson.personCode
                  ? `, persönlicher Code: ${result.createdPerson.personCode}`
                  : ""}
                )
              </li>
            ) : null}
            {result.createdMembership ? (
              <li>
                eBuSy-Testmitgliedschaft: {result.createdMembership.displayName} (ID:{" "}
                {result.createdMembership.externalMembershipId})
              </li>
            ) : null}
          </ul>

          {result.cleanupHint ? (
            <div className="warning-box" style={{ marginTop: 16 }}>
              <strong>Aufräumen</strong>
              <p style={{ margin: "8px 0 0" }}>{result.cleanupHint}</p>
            </div>
          ) : null}

          {result.attributeAssignments?.length ? (
            <div className="hint-box" style={{ marginTop: 16 }}>
              <strong>Geplante Attribute</strong>
              <ul className="list" style={{ marginTop: 8 }}>
                {result.attributeAssignments.map((assignment) => (
                  <li key={`${assignment.attributeId}-${assignment.valueId}`}>
                    {assignment.attributeName}: {assignment.valueName} ({assignment.attributeId} -{" "}
                    {assignment.valueId})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.checks.length > 0 ? (
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Feld</th>
                    <th>Gesendet</th>
                    <th>Aus eBuSy gelesen</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.checks.map((check) => (
                    <tr key={check.label}>
                      <td>{check.label}</td>
                      <td>{check.expected}</td>
                      <td>{check.actual}</td>
                      <td>{getStatusLabel(check.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Gesendetes Datenpaket anzeigen
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </details>
        </article>
      ) : null}
    </div>
  );
}
