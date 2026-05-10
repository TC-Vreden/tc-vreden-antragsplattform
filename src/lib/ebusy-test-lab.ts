import type { ApplicationRow } from "@/lib/application-types";
import { getMembershipLabel } from "@/lib/application-options";
import {
  buildEbusyMembershipPayloadForApplication,
  type EbusyMembershipWriteConfig
} from "@/lib/ebusy-takeover-config";
import {
  buildEbusyAttributePayload,
  buildEbusyPersonPayloadFromApplication,
  createEbusyMembership,
  createEbusyPersonFromApplication,
  getEbusyMembershipsByPersonId,
  getEbusyPersonById,
  setEbusyPersonAttributes,
  type EbusyAttributeAssignment,
  type EbusyMembership,
  type EbusyMembershipPayload,
  type EbusyPerson
} from "@/lib/ebusy";

export type EbusyTestAction =
  | "dry_run"
  | "create_person"
  | "create_person_with_attributes"
  | "create_person_with_membership"
  | "create_person_with_attributes_and_membership";

export type EbusyTestScenario = {
  id: string;
  title: string;
  description: string;
  application: ApplicationRow;
  attributeAssignments?: EbusyAttributeAssignment[];
  membershipTest?: EbusyMembershipWriteConfig;
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
    customerId?: string;
    personCode?: string;
  };
  createdMembership?: {
    externalMembershipId: string;
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

function createTestRunId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 12);
}

function createRunApplication(application: ApplicationRow): ApplicationRow {
  const now = new Date().toISOString();
  const runId = createTestRunId();
  const membershipPart = (application.membership_kind ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    ...application,
    id: `${runId}-${application.id}`,
    created_at: now,
    updated_at: now,
    email: `tcv-testperson-${membershipPart}-${runId}@example.com`,
    notes: `${application.notes ?? TEST_MARKER} (${runId})`
  };
}

export const ebusyTestScenarios: EbusyTestScenario[] = [
  {
    id: "adult_active_person",
    title: "Erwachsene Einzelperson",
    description:
      "Prüft die Personen-/Benutzeranlage für ein aktives Erwachsenenmitglied. Optional können danach kontrollierte Attribut- und Mitgliedschaftstests ausgeführt werden; Beitragslogik wird noch nicht geschrieben.",
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
    ],
    membershipTest: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
  },
  {
    id: "adult_passive_person",
    title: "Erwachsene Einzelperson passiv",
    description:
      "Kontrollierter Test fuer eine passive erwachsene Einzelperson. Nach Live-Bestaetigung darf dieser Fall auch produktiv fuer Einzelpersonen uebernommen werden.",
    application: createBaseApplication({
      id: "tcv-test-adult-passive-0001",
      last_name: "Passiv",
      membership_kind: "adult_passive",
      account_holder: "TCV Testperson Passiv"
    }),
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 10,
        valueName: "7 Beitrag Passiv"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 33,
        valueName: "Passiv"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 31,
        valueName: "Passiv"
      }
    ],
    membershipTest: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: false,
      status: "ACTIVE"
    }
  },
  {
    id: "child_person",
    title: "Kind bis 14 Jahre",
    description:
      "Kontrollierter Test fuer ein Kind bis 14 Jahre. Prueft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Kinderuebernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestaetigt sind.",
    application: createBaseApplication({
      id: "tcv-test-child-0001",
      salutation: "FEMALE",
      first_name: "TCV Testkind",
      last_name: "Kind",
      birth_date: "2016-01-01",
      email: "tcv-testperson-kind@example.com",
      phone: "02861 000001",
      mobile: "015100000001",
      membership_kind: "child",
      account_holder: "TCV Test-Elternteil",
      account_holder_address: "Testweg 1, 48691 Vreden",
      guardian_name: "TCV Test-Elternteil",
      guardian_email: "tcv-test-elternteil@example.com",
      guardian_phone: "02861 000001",
      guardian_consent: true,
      notes:
        `${TEST_MARKER}\nMinderjaehrigen-Test: gesetzlicher Vertreter und SEPA-Zahler muessen spaeter im PDF/E-Mail-Prozess nachvollziehbar dokumentiert werden.`
    }),
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 12,
        valueName: "4 Beitrag Kinder, Jugendl. bis 16"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 14,
        valueName: "Kinder bis 14 Jahre"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 25,
        valueName: "1. Kind/Jugendlicher bis 18 Jahre"
      }
    ],
    membershipTest: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
  },
  {
    id: "youth_active_person",
    title: "Jugendliche bis 18 Jahre aktiv",
    description:
      "Kontrollierter Test fuer Jugendliche bis 18 Jahre. Prueft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Minderjaehrigenuebernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestaetigt sind.",
    application: createBaseApplication({
      id: "tcv-test-youth-active-0001",
      salutation: "MALE",
      first_name: "TCV Testjugend",
      last_name: "Jugend",
      birth_date: "2010-01-01",
      email: "tcv-testperson-jugend@example.com",
      phone: "02861 000002",
      mobile: "015100000002",
      membership_kind: "youth_active",
      account_holder: "TCV Test-Elternteil",
      account_holder_address: "Testweg 1, 48691 Vreden",
      guardian_name: "TCV Test-Elternteil",
      guardian_email: "tcv-test-elternteil@example.com",
      guardian_phone: "02861 000002",
      guardian_consent: true,
      notes:
        `${TEST_MARKER}\nMinderjaehrigen-Test Jugendliche bis 18 Jahre: gesetzlicher Vertreter und SEPA-Zahler muessen spaeter im PDF/E-Mail-Prozess nachvollziehbar dokumentiert werden.`
    }),
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 12,
        valueName: "4 Beitrag Kinder, Jugendl. bis 16"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 17,
        valueName: "Jugendliche bis 18 Jahre"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 25,
        valueName: "1. Kind/Jugendlicher bis 18 Jahre"
      }
    ],
    membershipTest: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
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

function formatIdList(values: number[] | undefined) {
  return values?.length ? values.join(", ") : undefined;
}

function formatNullableId(value: number | null | undefined) {
  return value === null ? "null" : value;
}

function formatMembershipFeeTypes(membership: EbusyMembership) {
  return membership.membershipFeeTypes?.length
    ? membership.membershipFeeTypes
        .map((feeType) => `${feeType.id ?? "-"} (${feeType.name ?? "-"})`)
        .join(", ")
    : undefined;
}

function buildMembershipPayload(
  application: ApplicationRow,
  personId: number,
  config: EbusyMembershipWriteConfig,
  membershipNumber?: string
): EbusyMembershipPayload {
  return buildEbusyMembershipPayloadForApplication(application, personId, config, membershipNumber);
}

function buildMembershipPreviewPayload(
  application: ApplicationRow,
  config: EbusyMembershipWriteConfig
) {
  return {
    ...buildMembershipPayload(application, 0, config),
    personId: "<interne eBuSy-ID nach Personenanlage>",
    number: "<Kundennummer nach Personenanlage>"
  };
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

function compareMembershipPayloadWithMembership(
  payload: EbusyMembershipPayload,
  membership: EbusyMembership
) {
  const checks: EbusyTestCheck[] = [];

  addCheck(checks, "Mitgliedschaft: Person-ID", payload.personId, membership.personId);
  addCheck(checks, "Mitgliedschaft: Status", payload.status, membership.status);
  addCheck(checks, "Mitgliedschaft: Aktiv", payload.consideredActive, membership.consideredActive);
  addCheck(checks, "Mitgliedschaft: Eintritt", payload.begin, membership.begin);
  addCheck(checks, "Mitgliedschaft: Abteilungen", formatIdList(payload.sections), formatIdList(membership.sections));
  addCheck(
    checks,
    "Mitgliedschaft: Mitgliedschaftsart-ID",
    formatNullableId(payload.membershipTypeId),
    formatNullableId(membership.membershipTypeId)
  );
  addCheck(checks, "Mitgliedschaft: Mitgliedsnummer", payload.number, membership.number);
  addCheck(checks, "Mitgliedschaft: Beitragsarten", undefined, formatMembershipFeeTypes(membership));

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

  const application = createRunApplication(scenario.application);
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";
  const writeEnabled = process.env.EBUSY_TEST_LAB_WRITE_ENABLED === "true";
  const personPayload = buildEbusyPersonPayloadFromApplication(application);
  const attributePayload = scenario.attributeAssignments?.length
    ? buildEbusyAttributePayload(scenario.attributeAssignments)
    : undefined;
  const membershipPayloadPreview = scenario.membershipTest
    ? buildMembershipPreviewPayload(application, scenario.membershipTest)
    : undefined;
  const baseResult = {
    action: input.action,
    mode,
    writeEnabled,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      membershipLabel: getMembershipLabel(application.membership_kind)
    },
    payload: sanitizePayload({
      person: personPayload,
      attributes: attributePayload,
      membership: membershipPayloadPreview
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

  const createdPerson = await createEbusyPersonFromApplication(application);
  let readBack = await getEbusyPersonById(createdPerson.externalPersonId);
  const resultCreatedPerson = {
    ...createdPerson,
    customerId: readBack.customerId,
    personCode: readBack.code
  };
  let createdMembership: EbusyTestLabResult["createdMembership"];
  let checks = comparePayloadWithPerson(personPayload, readBack);
  let message =
    "Testperson wurde in eBuSy angelegt und direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist.";
  const shouldSetAttributes =
    input.action === "create_person_with_attributes" ||
    input.action === "create_person_with_attributes_and_membership";
  const shouldCreateMembership =
    input.action === "create_person_with_membership" ||
    input.action === "create_person_with_attributes_and_membership";

  if (shouldSetAttributes) {
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
    resultCreatedPerson.customerId = readBack.customerId;
    resultCreatedPerson.personCode = readBack.code;
    checks = [
      ...checks,
      ...compareAttributeAssignmentsWithPerson(scenario.attributeAssignments, readBack)
    ];
    message =
      "Testperson wurde in eBuSy angelegt, die Test-Attribute wurden gesetzt und der Datensatz wurde direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist.";
  }

  if (shouldCreateMembership) {
    if (!scenario.membershipTest) {
      throw new Error("Für dieses Testszenario ist kein Mitgliedschaftstest hinterlegt.");
    }

    const personId = Number(createdPerson.externalPersonId);

    if (!Number.isInteger(personId)) {
      throw new Error(
        `Testperson ${createdPerson.displayName} (${createdPerson.externalPersonId}) wurde angelegt, aber die eBuSy-Person-ID konnte nicht als Zahl verarbeitet werden. Bitte diese Testperson manuell in eBuSy löschen.`
      );
    }

    const membershipPayload = buildMembershipPayload(
      application,
      personId,
      scenario.membershipTest,
      resultCreatedPerson.customerId
    );

    try {
      createdMembership = await createEbusyMembership(
        scenario.membershipTest.moduleId,
        membershipPayload
      );

      const memberships = await getEbusyMembershipsByPersonId(
        scenario.membershipTest.moduleId,
        personId
      );
      const readBackMembership =
        memberships.find(
          (membership) => String(membership.id) === createdMembership?.externalMembershipId
        ) ?? memberships[0];

      if (!readBackMembership) {
        throw new Error("Die neue Mitgliedschaft konnte nicht zurueckgelesen werden.");
      }

      checks = [
        ...checks,
        ...compareMembershipPayloadWithMembership(membershipPayload, readBackMembership)
      ];
    } catch (membershipError) {
      const reason =
        membershipError instanceof Error ? membershipError.message : "Unbekannter Mitgliedschaftsfehler";

      throw new Error(
        `Testperson ${createdPerson.displayName} (${createdPerson.externalPersonId}) wurde angelegt, aber die Mitgliedschaft konnte nicht erstellt oder gelesen werden: ${reason} Bitte diese Testperson manuell in eBuSy löschen.`
      );
    }

    message = shouldSetAttributes
      ? "Testperson wurde in eBuSy angelegt, die Test-Attribute wurden gesetzt, eine einfache Test-Mitgliedschaft wurde erstellt und der Datensatz wurde direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist."
      : "Testperson wurde in eBuSy angelegt, eine einfache Test-Mitgliedschaft wurde erstellt und der Datensatz wurde direkt wieder ausgelesen. Bitte die Person nach dem Test manuell in eBuSy löschen, solange kein sicherer API-Löschweg bestätigt ist.";
  }

  return {
    ...baseResult,
    message,
    createdPerson: resultCreatedPerson,
    createdMembership,
    checks,
    cleanupHint: resultCreatedPerson.customerId
      ? `Bitte eBuSy-Testperson ${createdPerson.displayName} (Kundennummer ${resultCreatedPerson.customerId}, interne eBuSy-ID ${createdPerson.externalPersonId}) nach der Prüfung manuell löschen.`
      : `Bitte eBuSy-Testperson ${createdPerson.displayName} (interne eBuSy-ID ${createdPerson.externalPersonId}) nach der Prüfung manuell löschen.`
  };
}
