import type { ApplicationRow } from "@/lib/application-types";
import { getMembershipLabel } from "@/lib/application-options";
import { sendApplicationReceivedNotification } from "@/lib/application-notification-email";
import { getMailEnv } from "@/lib/mail";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { matchApplicationWithEbusy } from "@/lib/verwaltung";
import {
  buildEbusyMembershipPayloadForApplication,
  type EbusyPayerRelationWriteConfig,
  type EbusyMembershipWriteConfig
} from "@/lib/ebusy-takeover-config";
import {
  buildEbusyAttributePayload,
  buildEbusyPersonPayloadFromApplication,
  createEbusyMembership,
  createEbusyPersonFromApplication,
  getEbusyMembershipsByPersonId,
  getEbusyPersonById,
  setEbusyPersonPaidBy,
  setEbusyPersonAttributes,
  type EbusyAttributeAssignment,
  type EbusyMembership,
  type EbusyMembershipPayload,
  type EbusyPaymentDetailsPayload,
  type EbusyPaymentRelationPayload,
  type EbusyPerson
} from "@/lib/ebusy";

export type EbusyTestAction =
  | "dry_run"
  | "create_management_application"
  | "create_person"
  | "create_person_with_attributes"
  | "create_person_with_membership"
  | "create_person_with_attributes_and_membership";

export type EbusyTestScenarioMember = {
  id: string;
  roleLabel: string;
  description?: string;
  application: ApplicationRow;
  attributeAssignments?: EbusyAttributeAssignment[];
  membershipTest?: EbusyMembershipWriteConfig;
  payerRelation?: EbusyPayerRelationWriteConfig;
};

export type EbusySinglePersonTestScenario = {
  kind: "single";
  id: string;
  title: string;
  description: string;
  application: ApplicationRow;
  attributeAssignments?: EbusyAttributeAssignment[];
  membershipTest?: EbusyMembershipWriteConfig;
};

export type EbusyMultiPersonTestScenario = {
  kind: "multi";
  id: string;
  title: string;
  description: string;
  members: EbusyTestScenarioMember[];
};

export type EbusyTestScenario = EbusySinglePersonTestScenario | EbusyMultiPersonTestScenario;

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
    kind: EbusyTestScenario["kind"];
  };
  message: string;
  payload: unknown;
  attributeAssignments?: EbusyAttributeAssignment[];
  memberAttributeAssignments?: Array<{
    memberId: string;
    roleLabel: string;
    assignments: EbusyAttributeAssignment[];
  }>;
  createdPerson?: {
    externalPersonId: string;
    displayName: string;
    customerId?: string;
    personCode?: string;
  };
  createdPersons?: Array<{
    memberId: string;
    roleLabel: string;
    externalPersonId: string;
    displayName: string;
    customerId?: string;
    personCode?: string;
  }>;
  createdMembership?: {
    externalMembershipId: string;
    displayName: string;
  };
  createdMemberships?: Array<{
    memberId: string;
    roleLabel: string;
    externalMembershipId: string;
    displayName: string;
  }>;
  checks: EbusyTestCheck[];
  cleanupHint?: string;
  managementApplication?: {
    id: string;
    createdAt: string;
    managementUrl: string;
    applicantEmail: string;
    matchStatus: string;
    matchMessage: string;
    notificationStatus: string;
    notificationReason?: string;
  };
};

type EbusyTestCreatedPerson = NonNullable<EbusyTestLabResult["createdPersons"]>[number];
type EbusyTestCreatedMembership = NonNullable<EbusyTestLabResult["createdMemberships"]>[number];

const TEST_MARKER = "AUTOMATISCHER EBUSY-TEST - darf gelöscht werden";
const SIMPLE_ACTIVE_TENNIS_MEMBERSHIP: EbusyMembershipWriteConfig = {
  moduleId: 4,
  sectionIds: [1],
  membershipTypeId: null,
  consideredActive: true,
  status: "ACTIVE"
};
const DEFAULT_MAIN_PAYER_RELATION: EbusyPayerRelationWriteConfig = {
  payerRole: "main",
  moduleIds: [1, 2, 3, 4],
  paysForVouchersAndCoupons: true,
  paysForCustomPurchases: true
};

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

async function runMultiEbusyTestLabAction(
  input: {
    scenarioId: string;
    action: EbusyTestAction;
  },
  scenario: EbusyMultiPersonTestScenario
): Promise<EbusyTestLabResult> {
  const runId = createTestRunId();
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";
  const writeEnabled = process.env.EBUSY_TEST_LAB_WRITE_ENABLED === "true";
  const members = getScenarioMembers(scenario, runId);
  const memberPayloadPreview = buildMemberPayloadPreview(members);
  const memberAttributeAssignments = getMemberAttributeAssignments(members);
  const baseResult = {
    action: input.action,
    mode,
    writeEnabled,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      membershipLabel: getScenarioMembershipLabel(scenario),
      kind: scenario.kind
    },
    payload: sanitizePayload({
      runId,
      members: memberPayloadPreview,
      safetyNote:
        "Mehrpersonen-Test: Hauptzahlerbezug inklusive Bankkonto/SEPA-Kopie für Zusatzpersonen, Mitgliedsbeiträge-NEU-Attribute und einfache Mitgliedschaften können je Person geschrieben werden. Beitragsarten werden nicht geschrieben."
    }),
    memberAttributeAssignments
  };

  if (input.action === "dry_run") {
    return {
      ...baseResult,
      message:
        "Mehrpersonen-Datenpaket wurde vorbereitet. Es wurde keine Person in eBuSy angelegt und kein Live-Schreibzugriff verwendet.",
      checks: []
    };
  }

  const shouldSetAttributes =
    input.action === "create_person_with_attributes" ||
    input.action === "create_person_with_attributes_and_membership";
  const shouldCreateMembership =
    input.action === "create_person_with_membership" ||
    input.action === "create_person_with_attributes_and_membership";

  if (!writeEnabled) {
    throw new Error(
      "Live-Schreibtests sind serverseitig gesperrt. Setze EBUSY_TEST_LAB_WRITE_ENABLED=true, wenn du bewusst eBuSy-Testpersonen anlegen willst."
    );
  }

  const createdPersons: EbusyTestCreatedPerson[] = [];
  const createdMemberships: EbusyTestCreatedMembership[] = [];
  const checks: EbusyTestCheck[] = [];
  let mainPayerPaymentDetails: EbusyPaymentDetailsPayload = {};

  try {
    for (const member of members) {
      const createdPerson = await createEbusyPersonFromApplication(member.application);
      const personPayload = buildEbusyPersonPayloadFromApplication(member.application, {
        username: createdPerson.username
      });
      let readBack = await getEbusyPersonById(createdPerson.externalPersonId);
      const resultCreatedPerson: EbusyTestCreatedPerson = {
        memberId: member.id,
        roleLabel: member.roleLabel,
        externalPersonId: createdPerson.externalPersonId,
        displayName: createdPerson.displayName,
        customerId: readBack.customerId,
        personCode: readBack.code
      };

      createdPersons.push(resultCreatedPerson);
      checks.push(...prefixChecks(comparePayloadWithPerson(personPayload, readBack), member.roleLabel));

      if (member.id === "family_main") {
        mainPayerPaymentDetails = getPaymentDetailsFromPerson(readBack);
      }

      if (member.payerRelation) {
        const payer = createdPersons.find((person) => person.memberId === "family_main") ?? createdPersons[0];
        const payerPersonId = Number(payer?.externalPersonId);

        if (!payer || !Number.isInteger(payerPersonId)) {
          throw new Error(`${member.roleLabel}: Hauptzahler wurde noch nicht angelegt.`);
        }

        const relationPayload = {
          id: payerPersonId,
          moduleIds: member.payerRelation.moduleIds,
          paysForVouchersAndCoupons: member.payerRelation.paysForVouchersAndCoupons,
          paysForCustomPurchases: member.payerRelation.paysForCustomPurchases
        };

        await setEbusyPersonPaidBy(
          createdPerson.externalPersonId,
          relationPayload,
          mainPayerPaymentDetails
        );
        readBack = await getEbusyPersonById(createdPerson.externalPersonId);
        resultCreatedPerson.customerId = readBack.customerId;
        resultCreatedPerson.personCode = readBack.code;
        checks.push(
          ...prefixChecks(
            comparePayerRelationWithPerson(relationPayload, readBack),
            member.roleLabel
          )
        );
        checks.push(
          ...prefixChecks(
            comparePaymentDetailsWithPerson(mainPayerPaymentDetails, readBack),
            member.roleLabel
          )
        );
      }

      if (shouldSetAttributes && member.attributeAssignments?.length) {
        await setEbusyPersonAttributes(createdPerson.externalPersonId, member.attributeAssignments);
        readBack = await getEbusyPersonById(createdPerson.externalPersonId);
        resultCreatedPerson.customerId = readBack.customerId;
        resultCreatedPerson.personCode = readBack.code;
        checks.push(
          ...prefixChecks(
            compareAttributeAssignmentsWithPerson(member.attributeAssignments, readBack),
            member.roleLabel
          )
        );
      }

      if (shouldCreateMembership) {
        if (!member.membershipTest) {
          throw new Error(`Für ${member.roleLabel} ist kein Mitgliedschaftstest hinterlegt.`);
        }

        const personId = Number(createdPerson.externalPersonId);

        if (!Number.isInteger(personId)) {
          throw new Error(
            `${member.roleLabel}: Die eBuSy-Person-ID ${createdPerson.externalPersonId} konnte nicht als Zahl verarbeitet werden.`
          );
        }

        const membershipPayload = buildMembershipPayload(
          member.application,
          personId,
          member.membershipTest,
          resultCreatedPerson.customerId
        );
        const createdMembership = await createEbusyMembership(
          member.membershipTest.moduleId,
          membershipPayload
        );
        const memberships = await getEbusyMembershipsByPersonId(member.membershipTest.moduleId, personId);
        const readBackMembership =
          memberships.find(
            (membership) => String(membership.id) === createdMembership.externalMembershipId
          ) ?? memberships[0];

        if (!readBackMembership) {
          throw new Error(`${member.roleLabel}: Die neue Mitgliedschaft konnte nicht zurückgelesen werden.`);
        }

        createdMemberships.push({
          memberId: member.id,
          roleLabel: member.roleLabel,
          externalMembershipId: createdMembership.externalMembershipId,
          displayName: createdMembership.displayName
        });
        checks.push(
          ...prefixChecks(
            compareMembershipPayloadWithMembership(membershipPayload, readBackMembership),
            member.roleLabel
          )
        );
      }
    }
  } catch (multiPersonError) {
    const reason =
      multiPersonError instanceof Error ? multiPersonError.message : "Unbekannter Mehrpersonenfehler";
    const cleanupList = createdPersons
      .map((person) =>
        person.customerId
          ? `${person.roleLabel}: ${person.displayName} (Kundennummer ${person.customerId}, interne eBuSy-ID ${person.externalPersonId})`
          : `${person.roleLabel}: ${person.displayName} (interne eBuSy-ID ${person.externalPersonId})`
      )
      .join("; ");
    const cleanupHint = cleanupList
      ? ` Bereits angelegte Testpersonen bitte manuell in eBuSy löschen: ${cleanupList}.`
      : "";

    throw new Error(`Mehrpersonen-Test fehlgeschlagen: ${reason}.${cleanupHint}`);
  }

  const cleanupHint =
    "Bitte diese eBuSy-Testpersonen nach der Prüfung manuell löschen: " +
    createdPersons
      .map((person) =>
        person.customerId
          ? `${person.roleLabel}: ${person.displayName} (Kundennummer ${person.customerId}, interne eBuSy-ID ${person.externalPersonId})`
          : `${person.roleLabel}: ${person.displayName} (interne eBuSy-ID ${person.externalPersonId})`
      )
      .join("; ");

  return {
    ...baseResult,
    message: shouldCreateMembership
      ? shouldSetAttributes
        ? "Mehrpersonen-Testpersonen wurden in eBuSy angelegt, Zusatzpersonen wurden dem Hauptzahler zugeordnet, Bankkonto/SEPA wurden vom Hauptzahler übernommen, Mitgliedsbeiträge-NEU-Attribute wurden gesetzt, einfache Test-Mitgliedschaften wurden je Person erstellt und alle Datensätze wurden direkt wieder ausgelesen. Beitragsarten werden weiterhin nicht geschrieben."
        : "Mehrpersonen-Testpersonen wurden in eBuSy angelegt, Zusatzpersonen wurden dem Hauptzahler zugeordnet, einfache Test-Mitgliedschaften wurden je Person erstellt und alle Datensätze wurden direkt wieder ausgelesen. Attribute und Beitragsarten wurden nicht geschrieben."
      : shouldSetAttributes
        ? "Mehrpersonen-Testpersonen wurden in eBuSy angelegt, Zusatzpersonen wurden dem Hauptzahler zugeordnet, Mitgliedsbeiträge-NEU-Attribute wurden gesetzt und alle Datensätze wurden direkt wieder ausgelesen. Mitgliedschaften und Beitragsarten wurden nicht geschrieben."
        : "Mehrpersonen-Testpersonen wurden in eBuSy angelegt, Zusatzpersonen wurden dem Hauptzahler zugeordnet und direkt wieder ausgelesen. Attribute, Mitgliedschaften und Beitragsarten wurden nicht geschrieben.",
    createdPersons,
    createdMemberships,
    checks,
    cleanupHint
  };
}

export async function runEbusyTestLabAction(input: {
  scenarioId: string;
  action: EbusyTestAction;
}): Promise<EbusyTestLabResult> {
  const scenario = getEbusyTestScenario(input.scenarioId);

  if (!scenario) {
    throw new Error("Testszenario wurde nicht gefunden.");
  }

  if (input.action === "create_management_application") {
    return createManagementApplicationTest(input, scenario);
  }

  if (scenario.kind === "multi") {
    return runMultiEbusyTestLabAction(input, scenario);
  }

  return runSingleEbusyTestLabAction(input, scenario);
}

function getManagementApplicationForScenario(scenario: EbusyTestScenario, runId: string) {
  if (scenario.kind === "multi") {
    return createRunApplication(scenario.members[0].application, runId);
  }

  return createRunApplication(scenario.application, runId);
}

function getTestApplicantEmail(runId: string, fallback: string) {
  return (
    getMailEnv("TEST_LAB_APPLICATION_EMAIL") ??
    getMailEnv("MAIL_TEST_RECIPIENT") ??
    getMailEnv("MAIL_TO_CLUB") ??
    fallback.replace("@example.com", `+${runId}@example.com`)
  );
}

function normalizeFamilyMembersForManagement(application: ApplicationRow) {
  const mainApplicantName = `${application.first_name} ${application.last_name}`.trim();

  return (application.family_members ?? []).map((member) => ({
    relation: member.relation ?? "family_member",
    salutation: member.salutation ?? "",
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    birthDate: member.birthDate ?? "",
    email: member.email || application.email,
    mobile: member.mobile || application.mobile || "",
    street: member.street || application.street || "",
    postalCode: member.postalCode || application.postal_code || "",
    city: member.city || application.city || "",
    legalRepresentative:
      member.legalRepresentative || (member.relation === "child" ? mainApplicantName : "")
  }));
}

async function createManagementApplicationTest(
  input: {
    scenarioId: string;
    action: EbusyTestAction;
  },
  scenario: EbusyTestScenario
): Promise<EbusyTestLabResult> {
  const runId = createTestRunId();
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";
  const application = getManagementApplicationForScenario(scenario, runId);
  const applicantEmail = getTestApplicantEmail(runId, application.email);
  const familyMembers = normalizeFamilyMembersForManagement({
    ...application,
    email: applicantEmail
  });
  const managementUrl = getMailEnv("ADMIN_PORTAL_URL") ?? "/verwaltung";
  const supabase = getSupabaseAdminClient();
  const insertPayload = {
    source: "test_lab",
    request_type: "new_membership",
    status: "submitted",
    salutation: application.salutation,
    first_name: application.first_name,
    last_name: application.last_name,
    birth_date: application.birth_date,
    email: applicantEmail,
    phone: application.phone,
    mobile: application.mobile,
    street: application.street,
    postal_code: application.postal_code,
    city: application.city,
    membership_kind: application.membership_kind,
    student_status_until: application.student_status_until,
    family_members: familyMembers,
    accepts_statutes: application.accepts_statutes,
    accepts_privacy: application.accepts_privacy,
    accepts_photo_video: application.accepts_photo_video,
    accepts_whatsapp: application.accepts_whatsapp,
    accepts_sepa: application.accepts_sepa,
    iban: application.iban?.replace(/\s+/g, "").toUpperCase() ?? null,
    account_holder: application.account_holder,
    account_holder_address:
      application.account_holder_address ||
      [application.street, application.postal_code, application.city].filter(Boolean).join(", "),
    guardian_name: application.guardian_name,
    guardian_email: application.guardian_email,
    guardian_phone: application.guardian_phone,
    guardian_consent: application.guardian_consent,
    notes: [
      application.notes,
      `Testlabor-Verwaltungsworkflow ${runId}: Antrag wurde absichtlich nur bis zur Verwaltungsoberfläche angelegt. Nach Prüfung kann er dort nach eBuSy übernommen werden.`
    ]
      .filter(Boolean)
      .join("\n"),
    ebusy_match_status: "pending",
    ebusy_person_id: null,
    ebusy_match_payload: {
      status: "pending",
      source: "test_lab",
      message:
        "Testantrag wurde im eBuSy-Testlabor angelegt. Bitte den automatischen Abgleich prüfen.",
      candidates: []
    }
  };

  const { data, error } = await supabase
    .from("applications")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Supabase hat keinen Testantrag zurückgegeben.");
  }

  const matchSummary = await matchApplicationWithEbusy(data.id);
  const notificationResult = await sendApplicationReceivedNotification({
    applicationId: data.id,
    createdAt: data.created_at,
    salutation: application.salutation,
    firstName: application.first_name,
    lastName: application.last_name,
    birthDate: application.birth_date,
    email: applicantEmail,
    phone: application.phone,
    mobile: application.mobile,
    street: application.street,
    postalCode: application.postal_code,
    city: application.city,
    membershipKind: application.membership_kind,
    familyMembers,
    acceptsSepa: application.accepts_sepa,
    acceptsPhotoVideo: application.accepts_photo_video,
    acceptsWhatsapp: application.accepts_whatsapp
  });

  return {
    action: input.action,
    mode,
    writeEnabled: process.env.EBUSY_TEST_LAB_WRITE_ENABLED === "true",
    scenario: {
      id: scenario.id,
      title: scenario.title,
      membershipLabel: getScenarioMembershipLabel(scenario),
      kind: scenario.kind
    },
    message:
      "Testantrag wurde in Supabase angelegt, in der Verwaltung sichtbar gemacht und per normalem eBuSy-Abgleich geprüft. Es wurde keine Person in eBuSy angelegt.",
    payload: sanitizePayload({
      runId,
      insertPayload,
      matchSummary,
      notificationResult
    }),
    checks: [],
    cleanupHint:
      "Der Testantrag kann in der Verwaltung bearbeitet, erneut abgeglichen, nach eBuSy übernommen und danach aus der Verwaltung gelöscht werden. In eBuSy angelegte Testpersonen müssen separat geprüft und ggf. manuell entfernt werden.",
    managementApplication: {
      id: data.id,
      createdAt: data.created_at,
      managementUrl,
      applicantEmail,
      matchStatus: matchSummary.status,
      matchMessage: matchSummary.message,
      notificationStatus: notificationResult.status,
      notificationReason: notificationResult.reason
    }
  };
}

function createTestRunId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 12);
}

function createRunApplication(
  application: ApplicationRow,
  runId = createTestRunId(),
  emailSuffix = runId
): ApplicationRow {
  const now = new Date().toISOString();
  const membershipPart = (application.membership_kind ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeEmailSuffix = emailSuffix
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    ...application,
    id: `${runId}-${application.id}`,
    created_at: now,
    updated_at: now,
    email: `tcv-testperson-${membershipPart}-${safeEmailSuffix}@example.com`,
    notes: `${application.notes ?? TEST_MARKER} (${runId})`
  };
}

export const ebusyTestScenarios: EbusyTestScenario[] = [
  {
    kind: "single",
    id: "adult_active_person",
    title: "Erwachsene Einzelperson",
    description:
      "Prüft die Personen-/Benutzeranlage für ein aktives Erwachsenenmitglied. Optional können danach kontrollierte Attribut- und Mitgliedschaftstests ausgeführt werden; Beitragslogik wird noch nicht geschrieben.",
    application: createBaseApplication({}),
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 16,
        valueName: "Erwachsene Aktiv"
      },
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
    kind: "single",
    id: "adult_passive_person",
    title: "Erwachsene Einzelperson passiv",
    description:
      "Kontrollierter Test für eine passive erwachsene Einzelperson. Nach Live-Bestätigung darf dieser Fall auch produktiv für Einzelpersonen übernommen werden.",
    application: createBaseApplication({
      id: "tcv-test-adult-passive-0001",
      last_name: "Passiv",
      membership_kind: "adult_passive",
      account_holder: "TCV Testperson Passiv"
    }),
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 33,
        valueName: "Passiv"
      },
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
    kind: "single",
    id: "child_person",
    title: "Kind bis 14 Jahre",
    description:
      "Kontrollierter Test für ein Kind bis 14 Jahre. Prüft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Kinderübernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestätigt sind.",
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
        `${TEST_MARKER}\nMinderjährigen-Test: gesetzlicher Vertreter und SEPA-Zahler müssen später im PDF/E-Mail-Prozess nachvollziehbar dokumentiert werden.`
    }),
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 14,
        valueName: "Kinder bis 14 Jahre"
      },
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
    kind: "single",
    id: "youth_active_person",
    title: "Jugendliche bis 18 Jahre aktiv",
    description:
      "Kontrollierter Test für Jugendliche bis 18 Jahre. Prüft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Minderjährigenübernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestätigt sind.",
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
        `${TEST_MARKER}\nMinderjährigen-Test Jugendliche bis 18 Jahre: gesetzlicher Vertreter und SEPA-Zahler müssen später im PDF/E-Mail-Prozess nachvollziehbar dokumentiert werden.`
    }),
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 17,
        valueName: "Jugendliche bis 18 Jahre"
      },
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
    kind: "multi",
    id: "family_four_persons",
    title: "Familie mit 4 Personen",
    description:
      "Kontrollierter Mehrpersonen-Test für eine Familie mit zahlender Hauptperson, Partner:in und zwei Kindern. Der Test kann Personen, Hauptzahlerbezug, Mitgliedsbeiträge-NEU-Attribute und einfache Mitgliedschaften je Person schreiben.",
    members: [
      {
        id: "family_main",
        roleLabel: "Hauptperson / Familienzahler",
        description: "Zahlende Hauptperson des Familienantrags.",
        application: createBaseApplication({
          id: "tcv-test-family-main-0001",
          salutation: "MALE",
          first_name: "TCV Testfamilie",
          last_name: "Hauptperson",
          birth_date: "1988-01-01",
          email: "tcv-testperson-family-main@example.com",
          phone: "02861 000010",
          mobile: "015100000010",
          membership_kind: "family",
          account_holder: "TCV Testfamilie Hauptperson",
          account_holder_address: "Testweg 1, 48691 Vreden",
          family_members: [
            {
              relation: "partner",
              salutation: "FEMALE",
              firstName: "TCV Testfamilie",
              lastName: "Partnerin",
              birthDate: "1990-02-02"
            },
            {
              relation: "child",
              salutation: "FEMALE",
              firstName: "TCV Testfamilie",
              lastName: "Kind",
              birthDate: "2016-03-03",
              legalRepresentative: "TCV Testfamilie Hauptperson"
            },
            {
              relation: "child",
              salutation: "MALE",
              firstName: "TCV Testfamilie",
              lastName: "Jugend",
              birthDate: "2010-04-04",
              legalRepresentative: "TCV Testfamilie Hauptperson"
            }
          ],
          notes: `${TEST_MARKER}\nFamilien-Test: zahlende Hauptperson mit Attribut Familien.`
        }),
        attributeAssignments: [
          {
            attributeId: 6,
            attributeName: "Mitgliedsbeiträge NEU",
            valueId: 18,
            valueName: "Familien"
          },
        ],
        membershipTest: SIMPLE_ACTIVE_TENNIS_MEMBERSHIP
      },
      {
        id: "family_partner",
        roleLabel: "Partner:in / Familienmitglied",
        description: "Zweite erwachsene Person im Familienantrag, voraussichtlich beitragsfrei zugeordnet.",
        application: createBaseApplication({
          id: "tcv-test-family-partner-0001",
          salutation: "FEMALE",
          first_name: "TCV Testfamilie",
          last_name: "Partnerin",
          birth_date: "1990-02-02",
          email: "tcv-testperson-family-partner@example.com",
          phone: "02861 000011",
          mobile: "015100000011",
          membership_kind: "family",
          accepts_sepa: false,
          iban: null,
          account_holder: null,
          account_holder_address: null,
          notes:
            `${TEST_MARKER}\nFamilien-Test: Partner:in. Vorschlag: beitragsfreie Familienzugehörigkeit, fachlich noch zu bestätigen.`
        }),
        attributeAssignments: [
          {
            attributeId: 6,
            attributeName: "Mitgliedsbeiträge NEU",
            valueId: 22,
            valueName: "Beitragsfreie Familienangehörige"
          },
        ],
        membershipTest: SIMPLE_ACTIVE_TENNIS_MEMBERSHIP,
        payerRelation: DEFAULT_MAIN_PAYER_RELATION
      },
      {
        id: "family_child",
        roleLabel: "Kind / Familienmitglied",
        description: "Kind im Familienantrag, voraussichtlich beitragsfrei zugeordnet.",
        application: createBaseApplication({
          id: "tcv-test-family-child-0001",
          salutation: "FEMALE",
          first_name: "TCV Testfamilie",
          last_name: "Kind",
          birth_date: "2016-03-03",
          email: "tcv-testperson-family-child@example.com",
          phone: "02861 000012",
          mobile: "015100000012",
          membership_kind: "family",
          accepts_sepa: false,
          iban: null,
          account_holder: null,
          account_holder_address: null,
          guardian_name: "TCV Testfamilie Hauptperson",
          guardian_email: "tcv-testperson-family-main@example.com",
          guardian_phone: "02861 000010",
          guardian_consent: true,
          notes:
            `${TEST_MARKER}\nFamilien-Test: minderjähriges Kind. Vertreter-/PDF-/Mailnachweis bleibt separat zu klären.`
        }),
        attributeAssignments: [
          {
            attributeId: 6,
            attributeName: "Mitgliedsbeiträge NEU",
            valueId: 22,
            valueName: "Beitragsfreie Familienangehörige"
          },
        ],
        membershipTest: SIMPLE_ACTIVE_TENNIS_MEMBERSHIP,
        payerRelation: DEFAULT_MAIN_PAYER_RELATION
      },
      {
        id: "family_youth",
        roleLabel: "Jugendliche:r / Familienmitglied",
        description: "Jugendliche Person im Familienantrag, voraussichtlich beitragsfrei zugeordnet.",
        application: createBaseApplication({
          id: "tcv-test-family-youth-0001",
          salutation: "MALE",
          first_name: "TCV Testfamilie",
          last_name: "Jugend",
          birth_date: "2010-04-04",
          email: "tcv-testperson-family-youth@example.com",
          phone: "02861 000013",
          mobile: "015100000013",
          membership_kind: "family",
          accepts_sepa: false,
          iban: null,
          account_holder: null,
          account_holder_address: null,
          guardian_name: "TCV Testfamilie Hauptperson",
          guardian_email: "tcv-testperson-family-main@example.com",
          guardian_phone: "02861 000010",
          guardian_consent: true,
          notes:
            `${TEST_MARKER}\nFamilien-Test: minderjährige jugendliche Person. Vertreter-/PDF-/Mailnachweis bleibt separat zu klären.`
        }),
        attributeAssignments: [
          {
            attributeId: 6,
            attributeName: "Mitgliedsbeiträge NEU",
            valueId: 22,
            valueName: "Beitragsfreie Familienangehörige"
          },
        ],
        membershipTest: SIMPLE_ACTIVE_TENNIS_MEMBERSHIP,
        payerRelation: DEFAULT_MAIN_PAYER_RELATION
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

function formatIdList(values: number[] | undefined) {
  return values?.length ? values.join(", ") : undefined;
}

function readRelationModules(person: EbusyPerson) {
  return person.paidByInfo?.moduleIds ?? person.paidByInfo?.modules;
}

function getPaymentDetailsFromPerson(
  person: EbusyPerson | null | undefined
): EbusyPaymentDetailsPayload {
  return {
    bankAccount: person?.bankAccount?.number
      ? {
          holder: person.bankAccount.holder,
          number: person.bankAccount.number,
          bank: person.bankAccount.bank
        }
      : undefined,
    sepaMandate: person?.sepaMandate?.date
      ? {
          date: person.sepaMandate.date,
          reference: person.sepaMandate.reference,
          lastUsedDate: person.sepaMandate.lastUsedDate
        }
      : undefined
  };
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

function comparePayerRelationWithPerson(
  relation: EbusyPaymentRelationPayload,
  person: EbusyPerson
) {
  const checks: EbusyTestCheck[] = [];

  addCheck(checks, "Hauptzahler: Personen-ID", relation.id, person.paidByInfo?.id);
  addCheck(
    checks,
    "Hauptzahler: Module",
    formatIdList(relation.moduleIds),
    formatIdList(readRelationModules(person))
  );
  addCheck(
    checks,
    "Hauptzahler: Guthaben und Gutscheine",
    relation.paysForVouchersAndCoupons,
    person.paidByInfo?.paysForVouchersAndCoupons
  );
  addCheck(
    checks,
    "Hauptzahler: Manuelle Forderungen",
    relation.paysForCustomPurchases,
    person.paidByInfo?.paysForCustomPurchases
  );

  return checks;
}

function comparePaymentDetailsWithPerson(
  paymentDetails: EbusyPaymentDetailsPayload,
  person: EbusyPerson
) {
  const checks: EbusyTestCheck[] = [];

  addCheck(
    checks,
    "Hauptzahler-Bankkonto: Kontoinhaber",
    paymentDetails.bankAccount?.holder,
    person.bankAccount?.holder
  );
  addCheck(
    checks,
    "Hauptzahler-Bankkonto: IBAN",
    paymentDetails.bankAccount?.number,
    person.bankAccount?.number
  );
  addCheck(
    checks,
    "Hauptzahler-Bankkonto: SEPA-Mandatsdatum",
    paymentDetails.sepaMandate?.date,
    person.sepaMandate?.date
  );

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

function getScenarioMembers(scenario: EbusyTestScenario, runId: string): EbusyTestScenarioMember[] {
  if (scenario.kind === "multi") {
    return scenario.members.map((member) => ({
      ...member,
      application: createRunApplication(member.application, runId, `${runId}-${member.id}`)
    }));
  }

  return [
    {
      id: scenario.id,
      roleLabel: "Testperson",
      application: createRunApplication(scenario.application, runId),
      attributeAssignments: scenario.attributeAssignments,
      membershipTest: scenario.membershipTest
    }
  ];
}

function getScenarioMembershipLabel(scenario: EbusyTestScenario) {
  if (scenario.kind === "multi") {
    return scenario.title;
  }

  return getMembershipLabel(scenario.application.membership_kind);
}

function prefixChecks(checks: EbusyTestCheck[], roleLabel: string) {
  return checks.map((check) => ({
    ...check,
    label: `${roleLabel}: ${check.label}`
  }));
}

function buildMemberPayloadPreview(members: EbusyTestScenarioMember[]) {
  return members.map((member) => {
    const personPayload = buildEbusyPersonPayloadFromApplication(member.application);
    const attributePayload = member.attributeAssignments?.length
      ? buildEbusyAttributePayload(member.attributeAssignments)
      : undefined;
    const membershipPayload = member.membershipTest
      ? buildMembershipPreviewPayload(member.application, member.membershipTest)
      : undefined;
    const payerRelation = member.payerRelation
      ? {
          ...member.payerRelation,
          payerPersonId: "<interne eBuSy-ID der Hauptperson nach Personenanlage>"
        }
      : undefined;

    return {
      id: member.id,
      role: member.roleLabel,
      description: member.description,
      person: personPayload,
      payerRelation,
      attributes: attributePayload,
      membership: membershipPayload
    };
  });
}

function getMemberAttributeAssignments(members: EbusyTestScenarioMember[]) {
  return members
    .filter((member) => member.attributeAssignments?.length)
    .map((member) => ({
      memberId: member.id,
      roleLabel: member.roleLabel,
      assignments: member.attributeAssignments ?? []
    }));
}

async function runSingleEbusyTestLabAction(
  input: {
    scenarioId: string;
    action: EbusyTestAction;
  },
  scenario: EbusySinglePersonTestScenario
): Promise<EbusyTestLabResult> {
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
      membershipLabel: getMembershipLabel(application.membership_kind),
      kind: scenario.kind
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
  const createdPersonPayload = buildEbusyPersonPayloadFromApplication(application, {
    username: createdPerson.username
  });
  let readBack = await getEbusyPersonById(createdPerson.externalPersonId);
  const resultCreatedPerson = {
    ...createdPerson,
    customerId: readBack.customerId,
    personCode: readBack.code
  };
  let createdMembership: EbusyTestLabResult["createdMembership"];
  let checks = comparePayloadWithPerson(createdPersonPayload, readBack);
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
        throw new Error("Die neue Mitgliedschaft konnte nicht zurückgelesen werden.");
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
