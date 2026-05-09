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

    if (
      action === "create_person" &&
      !window.confirm(
        "Soll jetzt wirklich eine eBuSy-Testperson angelegt werden?\n\n" +
          "Die Testperson wird nicht automatisch gelöscht und muss nach der Prüfung in eBuSy entfernt werden."
      )
    ) {
      return;
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
            {loadingAction === "dry_run" ? "Datenpaket wird geprüft..." : "Datenpaket prüfen"}
          </button>
          <button
            className="button"
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => runAction("create_person")}
          >
            {loadingAction === "create_person"
              ? "Live-Test läuft..."
              : "Live-Testperson anlegen"}
          </button>
        </div>

        {!writeEnabled ? (
          <div className="warning-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest gesperrt</strong>
            <p style={{ margin: "8px 0 0" }}>
              Der Live-Button ist absichtlich serverseitig gesperrt, bis{" "}
              <code>EBUSY_TEST_LAB_WRITE_ENABLED=true</code> gesetzt ist. Der Payload-Test
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
                eBuSy-Testperson: {result.createdPerson.displayName} (
                {result.createdPerson.externalPersonId})
              </li>
            ) : null}
          </ul>

          {result.cleanupHint ? (
            <div className="warning-box" style={{ marginTop: 16 }}>
              <strong>Aufräumen</strong>
              <p style={{ margin: "8px 0 0" }}>{result.cleanupHint}</p>
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
              Gesendeten Payload anzeigen
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
