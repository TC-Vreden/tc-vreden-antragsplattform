"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  EbusyTestAction,
  EbusyTestCheck,
  EbusyTestLabResult,
  EbusyTestScenario
} from "@/lib/ebusy-test-lab";

type Props = {
  scenarios: EbusyTestScenario[];
  writeEnabled: boolean;
  canRunLiveActions: boolean;
  canCreateManagementApplication: boolean;
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

function getActionLabel(action: EbusyTestAction, isLoading: boolean, isMultiPerson = false) {
  if (action === "dry_run") {
    return isLoading ? "Datenpaket wird geprüft..." : "Datenpaket prüfen";
  }

  if (action === "create_management_application") {
    return isLoading
      ? "Testantrag wird angelegt..."
      : "Testantrag in Verwaltung anlegen";
  }

  if (action === "create_person_with_attributes") {
    return isLoading
      ? "Live-Test mit Attributen läuft..."
      : isMultiPerson
        ? "Live-Testpersonen + Attribute anlegen"
        : "Live-Testperson + Attribute anlegen";
  }

  if (action === "create_person_with_membership") {
    return isLoading ? "Live-Test mit Mitgliedschaft läuft..." : "Live-Testperson + Mitgliedschaft anlegen";
  }

  if (action === "create_person_with_attributes_and_membership") {
    return isLoading
      ? "Live-Test komplett läuft..."
      : "Live-Testperson + Attribute + Mitgliedschaft anlegen";
  }

  return isLoading
    ? "Live-Test läuft..."
    : isMultiPerson
      ? "Live-Testpersonen anlegen"
      : "Live-Testperson anlegen";
}

function scenarioSupportsAttributes(scenario: EbusyTestScenario | undefined) {
  if (!scenario) {
    return false;
  }

  if (scenario.kind === "multi") {
    return scenario.members.some((member) => Boolean(member.attributeAssignments?.length));
  }

  return Boolean(scenario.attributeAssignments?.length);
}

function scenarioSupportsMembership(scenario: EbusyTestScenario | undefined) {
  if (!scenario) {
    return false;
  }

  if (scenario.kind === "multi") {
    return (
      scenario.members.length > 0 &&
      scenario.members.every((member) => Boolean(member.membershipTest))
    );
  }

  return Boolean(scenario.membershipTest);
}

function isMembershipExtensionScenario(scenario: EbusyTestScenario | undefined) {
  return scenario?.kind === "single" && scenario.application.request_type === "membership_extension";
}

export function EbusyTestLabClient({
  scenarios,
  writeEnabled,
  canRunLiveActions,
  canCreateManagementApplication
}: Props) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [loadingAction, setLoadingAction] = useState<EbusyTestAction | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<EbusyTestLabResult[]>([]);
  const [result, setResult] = useState<EbusyTestLabResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusy = Boolean(loadingAction) || batchLoading;
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);
  const selectedScenarioIsMulti = selectedScenario?.kind === "multi";
  const selectedScenarioIsMembershipExtension = isMembershipExtensionScenario(selectedScenario);
  const selectedScenarioHasAttributes = scenarioSupportsAttributes(selectedScenario);
  const selectedScenarioHasMembership = scenarioSupportsMembership(selectedScenario);

  async function runAction(action: EbusyTestAction) {
    if (!selectedScenario) {
      setError("Bitte zuerst ein Testszenario auswählen.");
      return;
    }

    if (action === "create_management_application") {
      const confirmationText =
        "Soll jetzt ein Testantrag in Supabase angelegt werden?\n\n" +
        "Der Antrag erscheint danach in der Verwaltung, der normale eBuSy-Abgleich läuft, und die interne Eingangsmail wird ausgelöst, sofern die Mail-ENV aktiv ist.\n\n" +
        "Es wird dadurch noch keine Person in eBuSy angelegt.";

      if (!window.confirm(confirmationText)) {
        return;
      }
    } else if (action !== "dry_run") {
      const writesAttributes =
        action === "create_person_with_attributes" ||
        action === "create_person_with_attributes_and_membership";
      const writesMembership =
        action === "create_person_with_membership" ||
        action === "create_person_with_attributes_and_membership";
      const membershipConfirmationText = selectedScenarioIsMulti
        ? "Zusätzlich wird je Testperson eine einfache Test-Mitgliedschaft gesetzt: aktiv, Status ACTIVE, Abteilung Tennis und Eintrittsdatum. Bei Zusatzpersonen werden Hauptzahlerbezug sowie Bankkonto/SEPA-Kopie zur Hauptperson gesetzt. Beitragsarten werden nicht geschrieben.\n\n"
        : "Zusätzlich wird eine einfache Test-Mitgliedschaft gesetzt: aktiv, Status ACTIVE, Abteilung Tennis und Eintrittsdatum. Eine Beitragsart wird noch nicht geschrieben.\n\n";
      const confirmationText =
        `Soll jetzt wirklich ${selectedScenarioIsMulti ? "mehrere eBuSy-Testpersonen" : "eine eBuSy-Testperson"} angelegt werden?\n\n` +
        (writesAttributes
          ? selectedScenarioIsMulti
            ? "Zusätzlich werden die vorgeschlagenen Test-Attribute für alle Testpersonen gesetzt.\n\n"
            : "Zusätzlich werden die Test-Attribute für dieses Szenario gesetzt.\n\n"
          : "") +
        (writesMembership ? membershipConfirmationText : "") +
        `${selectedScenarioIsMulti ? "Die Testpersonen werden" : "Die Testperson wird"} nicht automatisch gelöscht und ${selectedScenarioIsMulti ? "müssen" : "muss"} nach der Prüfung in eBuSy entfernt werden.`;

      if (!window.confirm(confirmationText)) {
        return;
      }
    }

    setLoadingAction(action);
    setError(null);
    setResult(null);
    setBatchResults([]);

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

  async function runAllDryRuns() {
    setBatchLoading(true);
    setError(null);
    setResult(null);
    setBatchResults([]);

    try {
      const results: EbusyTestLabResult[] = [];

      for (const scenario of scenarios) {
        const response = await fetch("/api/verwaltung/ebusy-testlabor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            scenarioId: scenario.id,
            action: "dry_run"
          })
        });

        const payload = (await response.json()) as EbusyTestLabResult | { message?: string };

        if (!response.ok) {
          throw new Error(`${scenario.title}: ${payload.message || `HTTP ${response.status}`}`);
        }

        results.push(payload as EbusyTestLabResult);
      }

      setBatchResults(results);
    } catch (batchError) {
      setError(
        batchError instanceof Error
          ? batchError.message
          : "Die Mehrfachprüfung konnte nicht ausgeführt werden."
      );
    } finally {
      setBatchLoading(false);
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
            disabled={isBusy}
            onClick={() => runAction("dry_run")}
          >
            {getActionLabel("dry_run", loadingAction === "dry_run")}
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={isBusy}
            onClick={runAllDryRuns}
          >
            {batchLoading ? "Alle Datenpakete werden geprüft..." : "Alle Datenpakete prüfen"}
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={isBusy || !canCreateManagementApplication}
            onClick={() => runAction("create_management_application")}
          >
            {selectedScenarioIsMembershipExtension
              ? loadingAction === "create_management_application"
                ? "Erweiterungsantrag wird angelegt..."
                : "Erweiterungsantrag in Verwaltung anlegen"
              : getActionLabel(
                  "create_management_application",
                  loadingAction === "create_management_application"
                )}
          </button>
          {!selectedScenarioIsMembershipExtension ? (
            <button
              className="button"
              type="button"
              disabled={isBusy || !canRunLiveActions}
              onClick={() => runAction("create_person")}
            >
              {getActionLabel("create_person", loadingAction === "create_person", selectedScenarioIsMulti)}
            </button>
          ) : null}
          {!selectedScenarioIsMembershipExtension && selectedScenarioHasAttributes ? (
            <button
              className="button"
              type="button"
              disabled={isBusy || !canRunLiveActions}
              onClick={() => runAction("create_person_with_attributes")}
            >
              {getActionLabel(
                "create_person_with_attributes",
                loadingAction === "create_person_with_attributes",
                selectedScenarioIsMulti
              )}
            </button>
          ) : null}
          {!selectedScenarioIsMembershipExtension && selectedScenarioHasMembership ? (
            <button
              className="button"
              type="button"
              disabled={isBusy || !canRunLiveActions}
              onClick={() => runAction("create_person_with_membership")}
            >
              {getActionLabel(
                "create_person_with_membership",
                loadingAction === "create_person_with_membership",
                selectedScenarioIsMulti
              )}
            </button>
          ) : null}
          {!selectedScenarioIsMembershipExtension && selectedScenarioHasAttributes && selectedScenarioHasMembership ? (
            <button
              className="button"
              type="button"
              disabled={isBusy || !canRunLiveActions}
              onClick={() => runAction("create_person_with_attributes_and_membership")}
            >
              {getActionLabel(
                "create_person_with_attributes_and_membership",
                loadingAction === "create_person_with_attributes_and_membership",
                selectedScenarioIsMulti
              )}
            </button>
          ) : null}
        </div>

        {selectedScenarioIsMembershipExtension ? (
          <div className="hint-box" style={{ marginTop: 16 }}>
            <strong>Erweiterungsworkflow</strong>
            <p style={{ margin: "8px 0 0" }}>
              Dieses Szenario legt nur den Erweiterungsantrag in der Verwaltung an. Die neue
              Person wird erst über den Verwaltungsbutton nach eBuSy übertragen.
            </p>
          </div>
        ) : !writeEnabled ? (
          <div className="warning-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest gesperrt</strong>
            <p style={{ margin: "8px 0 0" }}>
              Der Live-Button ist absichtlich serverseitig gesperrt, bis{" "}
              <code>EBUSY_TEST_LAB_WRITE_ENABLED=true</code> gesetzt ist. Der Datenpaket-Test
              funktioniert trotzdem ohne eBuSy-Schreibzugriff.
            </p>
          </div>
        ) : !canRunLiveActions ? (
          <div className="warning-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest für diese Rolle gesperrt</strong>
            <p style={{ margin: "8px 0 0" }}>
              Datenpakete können geprüft werden. Live-Schreibtests dürfen nur Rollen mit
              Testlabor-Schreibrecht ausführen.
            </p>
          </div>
        ) : (
          <div className="hint-box" style={{ marginTop: 16 }}>
            <strong>Live-Schreibtest freigeschaltet</strong>
            <p style={{ margin: "8px 0 0" }}>
              Der Live-Test darf eindeutig markierte Testpersonen in eBuSy anlegen. Bitte die
              Testpersonen nach der Prüfung in eBuSy wieder löschen.
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

      {batchResults.length > 0 ? (
        <article className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Mehrfachprüfung</h2>
          <p>
            Alle aktuell hinterlegten Szenarien wurden als Datenpaket vorbereitet. Es wurde keine
            Person in eBuSy angelegt.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {batchResults.map((batchResult) => (
              <details key={batchResult.scenario.id}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  {batchResult.scenario.title} - {batchResult.scenario.membershipLabel}
                </summary>
                {batchResult.attributeAssignments?.length ? (
                  <ul className="list" style={{ marginTop: 8 }}>
                    {batchResult.attributeAssignments.map((assignment) => (
                      <li key={`${batchResult.scenario.id}-${assignment.attributeId}-${assignment.valueId}`}>
                        {assignment.attributeName}: {assignment.valueName} ({assignment.attributeId} -{" "}
                        {assignment.valueId})
                      </li>
                    ))}
                  </ul>
                ) : null}
                {batchResult.memberAttributeAssignments?.length ? (
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {batchResult.memberAttributeAssignments.map((memberGroup) => (
                      <div key={`${batchResult.scenario.id}-${memberGroup.memberId}`}>
                        <strong>{memberGroup.roleLabel}</strong>
                        <ul className="list" style={{ marginTop: 4 }}>
                          {memberGroup.assignments.map((assignment) => (
                            <li
                              key={`${batchResult.scenario.id}-${memberGroup.memberId}-${assignment.attributeId}-${assignment.valueId}`}
                            >
                              {assignment.attributeName}: {assignment.valueName} ({assignment.attributeId} -{" "}
                              {assignment.valueId})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
                  {JSON.stringify(batchResult.payload, null, 2)}
                </pre>
              </details>
            ))}
          </div>
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
            {result.managementApplication ? (
              <>
                <li>Testantrag: {result.managementApplication.id}</li>
                <li>Antragsteller-Mail: {result.managementApplication.applicantEmail}</li>
                <li>
                  Eingangsmail: {result.managementApplication.notificationStatus}
                  {result.managementApplication.notificationReason
                    ? ` (${result.managementApplication.notificationReason})`
                    : ""}
                </li>
                <li>
                  eBuSy-Abgleich: {result.managementApplication.matchStatus} -{" "}
                  {result.managementApplication.matchMessage}
                </li>
              </>
            ) : null}
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

          {result.managementApplication ? (
            <div className="cta-row" style={{ marginTop: 16 }}>
              <Link className="button secondary" href="/verwaltung">
                Testantrag in der Verwaltung prüfen
              </Link>
            </div>
          ) : null}

          {result.createdPersons?.length ? (
            <div className="hint-box" style={{ marginTop: 16 }}>
              <strong>Angelegte Testpersonen</strong>
              <ul className="list" style={{ marginTop: 8 }}>
                {result.createdPersons.map((person) => (
                  <li key={`${person.memberId}-${person.externalPersonId}`}>
                    {person.roleLabel}: {person.displayName} (interne eBuSy-ID:{" "}
                    {person.externalPersonId}
                    {person.customerId ? `, Kundennummer: ${person.customerId}` : ""}
                    {person.personCode ? `, persönlicher Code: ${person.personCode}` : ""})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.createdMemberships?.length ? (
            <div className="hint-box" style={{ marginTop: 16 }}>
              <strong>Angelegte Test-Mitgliedschaften</strong>
              <ul className="list" style={{ marginTop: 8 }}>
                {result.createdMemberships.map((membership) => (
                  <li key={`${membership.memberId}-${membership.externalMembershipId}`}>
                    {membership.roleLabel}: {membership.displayName} (ID:{" "}
                    {membership.externalMembershipId})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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

          {result.memberAttributeAssignments?.length ? (
            <div className="hint-box" style={{ marginTop: 16 }}>
              <strong>Geplante Attribute pro Testperson</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {result.memberAttributeAssignments.map((memberGroup) => (
                  <div key={memberGroup.memberId}>
                    <strong>{memberGroup.roleLabel}</strong>
                    <ul className="list" style={{ marginTop: 4 }}>
                      {memberGroup.assignments.map((assignment) => (
                        <li key={`${memberGroup.memberId}-${assignment.attributeId}-${assignment.valueId}`}>
                          {assignment.attributeName}: {assignment.valueName} ({assignment.attributeId} -{" "}
                          {assignment.valueId})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
