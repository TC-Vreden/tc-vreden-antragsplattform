import type { ApplicationRow } from "@/lib/application-types";
import { getMembershipLabel } from "@/lib/application-options";
import {
  buildEbusyAttributePayload,
  buildEbusyPersonPayloadFromApplication,
  createEbusyPersonFromApplication,
  getEbusyPersonById,
  setEbusyPersonAttributes,
  type EbusyAttributeAssignment,
  type EbusyPerson
} from "@/lib/ebusy";

export type EbusyTestAction = "dry_run" | "create_person" | "create_person_with_attributes";

export type EbusyTestScenario = {
  id: string;
  title: string;
  description: string;
  application: ApplicationRow;
  attributeAssignments?: EbusyAttributeAssignment[];
};

export type EbusyTestCheck = {
  label: string;
  expected: string;
  actual: string;
  status: "ok" | "missing" | "different" | "not_sent";
};

export type EbusyTestLabResult = {
  action: EbusyTestAction;
  mode: string;
  writeEnabled: boolean;
  scenario: {
    id: string;
    title: string;
    membershipLabel: string;
  };
  message: string;
  payload: unknown;
  attributeAssignments?: EbusyAttributeAssignment[];
  createdPerson?: {
    externalPersonId: string;
    displayName: string;
  };
  checks: EbusyTestCheck[];
  cleanupHint?: string;
};

const TEST_MARKER = "AUTOMATISCHER EBUSY-TEST - darf geloescht werden";

function createBaseApplication(overrides: Partial<ApplicationRow>): ApplicationRow {
  const now = new Date().toISOString();

  return {
    id: "tcv-test-adult-active-0001",
    created_at: now,
    updated_at: now,
    status: "test_lab",
    transferred_at: null,
    salutation: "MALE",
    first_name: "TCV Testperson",
    last_name: "Erwachsen",
    birth_date: "1990-01-01",
    email: "tcv-testperson-erwachsen@example.com",
    phone: "02861 000000",
    mobile: "015100000000",
    street: "Testweg 1",
    postal_code: "48691",
    city: "Vreden",
    membership_kind: "adult_active",
    student_status_until: null,
    family_members: [],
    accepts_statutes: true,
    accepts_privacy: true,
    accepts_photo_video: true,
    accepts_whatsapp: true,
    accepts_sepa: true,
    iban: "DE89370400440532013000",
    account_holder: "TCV Testperson Erwachsen",
    account_holder_address: "Testweg 1, 48691 Vreden",
    guardian_name: null,
    guardian_email: null,
    guardian_phone: null,
    guardian_consent: false,
    notes: TEST_MARKER,
    ebusy_match_status: "no_match",
    ebusy_person_id: null,
    ebusy_match_payload: null,
    ...overrides
  };
}

export const ebusyTestScenarios: EbusyTestScenario[] = [
  {
    id: "adult_active_person",
    title: "Erwachsene Einzelperson",
    description:
      "Prüft die Personen-/Benutzeranlage für ein aktives Erwachsenenmitglied. Optional kann danach ein kontrollierter Attribut-Test ausgeführt werden; Mitgliedschaft und Beitragslogik werden noch nicht geschrieben.",
    application: createBaseApplication({}),
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 8,
        valueName: "1 Beitrag 1. Erwachsene/r"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 16,
        valueName: "Erwachsene Aktiv"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 30,
        valueName: "Erwachsene"
      }
    ]
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readPath(value: unknown, path: string[]) {
  return path.reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, value);
}

function readFirstPath(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const result = readPath(value, path);

    if (result !== undefined && result !== null && String(result).trim() !== "") {
      return result;
    }
  }

  return undefined;
}

function normalizeDisplayValue(value: unknown) {
  if (value === undefined || value === null) {
    return "-";
  }

  const normalized = String(value).trim();

  return normalized || "-";
}

function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      key.toLowerCase().includes("password")
        ? "<wird automatisch generiert>"
        : sanitizePayload(entryValue)
    ])
  );
}

function addCheck(
  checks: EbusyTestCheck[],
  label: string,
  expectedValue: unknown,
  actualValue: unknown
) {
  const expected = normalizeDisplayValue(expectedValue);
  const actual = normalizeDisplayValue(actualValue);
  let status: EbusyTestCheck["status"] = "ok";

  if (expected === "-") {
    status = "not_sent";
  } else if (actual === "-") {
    status = "missing";
  } else if (expected !== actual) {
    status = "different";
  }

  checks.push({
    label,
    expected,
    actual,
    status
  });
}

function formatAttributeAssignment(assignment: EbusyAttributeAssignment) {
  return `${assignment.attributeId} -> ${assignment.valueId} (${assignment.valueName})`;
}

function formatPersonAttribute(attribute: NonNullable<EbusyPerson["attributes"]>[number] | undefined) {
  if (!attribute) {
    return undefined;
  }

  if (attribute.value?.id || attribute.value?.name) {
    return `${attribute.id ?? "-"} -> ${attribute.value.id ?? "-"} (${attribute.value.name ?? "-"})`;
  }

  if (attribute.values?.length) {
    return attribute.values
      .map((value) => `${attribute.id ?? "-"} -> ${value.id ?? "-"} (${value.name ?? "-"})`)
      .join(", ");
  }

  return `${attribute.id ?? "-"} (${attribute.name ?? "-"})`;
}

function comparePayloadWithPerson(payload: unknown, person: EbusyPerson) {
  const checks: EbusyTestCheck[] = [];

  addCheck(checks, "Anrede", readPath(payload, ["salutation"]), person.salutation);
  addCheck(checks, "Vorname", readPath(payload, ["firstname"]), person.firstname);
  addCheck(checks, "Nachname", readPath(payload, ["lastname"]), person.lastname);
  addCheck(checks, "Geburtsdatum", readPath(payload, ["birthday"]), person.birthday);
  addCheck(checks, "Straße", readPath(payload, ["address", "street"]), person.address?.street);
  addCheck(checks, "PLZ", readPath(payload, ["address", "postcode"]), person.address?.postcode);
  addCheck(checks, "Ort", readPath(payload, ["address", "city"]), person.address?.city);
  addCheck(checks, "Land", readPath(payload, ["address", "country"]), person.address?.country);
  addCheck(checks, "E-Mail", readPath(payload, ["contact", "email"]), person.contact?.email);
  addCheck(checks, "Mobil", readPath(payload, ["contact", "mobile"]), person.contact?.mobile);
  addCheck(checks, "Telefon", readPath(payload, ["contact", "phone"]), person.contact?.phone);
  addCheck(
    checks,
    "Benutzername",
    readPath(payload, ["user", "name"]),
    readFirstPath(person, [
      ["user", "name"],
      ["user", "username"],
      ["user", "email"]
    ])
  );
  addCheck(checks, "Benutzerkonto aktiv", readPath(payload, ["user", "enabled"]), person.user?.enabled);
  addCheck(checks, "Kontoart", readPath(payload, ["user", "level"]), person.user?.level);
  addCheck(checks, "Kontoinhaber", readPath(payload, ["bankAccount", "holder"]), person.bankAccount?.holder);
  addCheck(checks, "IBAN", readPath(payload, ["bankAccount", "number"]), person.bankAccount?.number);
  addCheck(checks, "Bank", readPath(payload, ["bankAccount", "bank"]), person.bankAccount?.bank);
  addCheck(checks, "SEPA-Mandatsdatum", readPath(payload, ["sepaMandate", "date"]), person.sepaMandate?.date);
  addCheck(
    checks,
    "SEPA-Mandatsreferenz",
    readPath(payload, ["sepaMandate", "reference"]),
    person.sepaMandate?.reference
  );
  addCheck(checks, "Kommentar", readPath(payload, ["comment"]), person.comment);

  return checks;
}

function compareAttributeAssignmentsWithPerson(
  assignments: EbusyAttributeAssignment[],
  person: EbusyPerson
) {
  const checks: EbusyTestCheck[] = [];

  for (const assignment of assignments) {
    const attribute = person.attributes?.find((candidate) => candidate.id === assignment.attributeId);

    addCheck(
      checks,
      `Attribut: ${assignment.attributeName}`,
      formatAttributeAssignment(assignment),
      formatPersonAttribute(attribute)
    );
  }

  return checks;
}

export function getEbusyTestScenario(scenarioId: string) {
  return ebusyTestScenarios.find((scenario) => scenario.id === scenarioId);
}

export async function runEbusyTestLabAction(input: {
  scenarioId: string;
  action: EbusyTestAction;
}): Promise<EbusyTestLabResult> {
  const scenario = getEbusyTestScenario(input.scenarioId);

  if (!scenario) {
    throw new Error("Testszenario wurde nicht gefunden.");
  }

  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";
  const writeEnabled = process.env.EBUSY_TEST_LAB_WRITE_ENABLED === "true";
  const personPayload = buildEbusyPersonPayloadFromApplication(scenario.application);
  const attributePayload = scenario.attributeAssignments?.length
    ? buildEbusyAttributePayload(scenario.attributeAssignments)
    : undefined;
  const baseResult = {
    action: input.action,
    mode,
    writeEnabled,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      membershipLabel: getMembershipLabel(scenario.application.membership_kind)
    },
    payload: sanitizePayload({
      person: personPayload,
      attributes: attributePayload
    }),
    attributeAssignments: scenario.attributeAssignments
  };

  if (input.action === "dry_run") {
    return {
      ...baseResult,
      message:
        "Datenpaket wurde vorbereitet. Es wurde keine Person in eBuSy angelegt und kein Live-Schreibzugriff verwendet.",
      checks: []
    };
  }

  if (!writeEnabled) {
    throw new Error(
      "Live-Schreibtests sind serverseitig gesperrt. Setze EBUSY_TEST_LAB_WRITE_ENABLED=true, wenn du bewusst eine eBuSy-Testperson anlegen willst."
    );
  }

  const createdPerson = await createEbusyPersonFromApplication(scenario.application);
  let readBack = await getEbusyPersonById(createdPerson.externalPersonId);
  let checks = comparePayloadWithPerson(personPayload, readBack);
  let message =
    "Testperson wurde in eBuSy angelegt und direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist.";

  if (input.action === "create_person_with_attributes") {
    if (!scenario.attributeAssignments?.length) {
      throw new Error("Für dieses Testszenario sind keine Attributwerte hinterlegt.");
    }

    try {
      await setEbusyPersonAttributes(createdPerson.externalPersonId, scenario.attributeAssignments);
    } catch (attributeError) {
      const reason =
        attributeError instanceof Error ? attributeError.message : "Unbekannter Attributfehler";

      throw new Error(
        `Testperson ${createdPerson.displayName} (${createdPerson.externalPersonId}) wurde angelegt, aber die Attribute konnten nicht gesetzt werden: ${reason} Bitte diese Testperson manuell in eBuSy löschen.`
      );
    }

    readBack = await getEbusyPersonById(createdPerson.externalPersonId);
    checks = [
      ...checks,
      ...compareAttributeAssignmentsWithPerson(scenario.attributeAssignments, readBack)
    ];
    message =
      "Testperson wurde in eBuSy angelegt, die Test-Attribute wurden gesetzt und der Datensatz wurde direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist.";
  }

  return {
    ...baseResult,
    message,
    createdPerson,
    checks,
    cleanupHint: `Bitte eBuSy-Testperson ${createdPerson.displayName} (${createdPerson.externalPersonId}) nach der Prüfung manuell löschen.`
  };
}
