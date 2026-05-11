import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type {
  ApplicationCreatedEbusyMembership,
  ApplicationCreatedEbusyPerson,
  ApplicationEbusyTakeoverStep,
  ApplicationAdditionalMember,
  ApplicationMatchPayload,
  ApplicationMatchSummary,
  ApplicationRow
} from "@/lib/application-types";
import {
  createEbusyMembership,
  createEbusyPersonFromApplication,
  type EbusyPerson,
  getEbusyMembershipsByPersonId,
  getEbusyPersonById,
  lookupEbusyPerson,
  setEbusyPersonAttributes
} from "@/lib/ebusy";
import { isMultiPersonMembership } from "@/lib/application-options";
import {
  buildEbusyMembershipPayloadForApplication,
  getEbusyMultiPersonMemberConfig,
  getProductionEbusyMultiPersonTakeoverConfig,
  getProductionEbusySinglePersonTakeoverConfig,
  type EbusyMultiPersonRole,
  type EbusyMultiPersonTakeoverConfig
} from "@/lib/ebusy-takeover-config";

function isStrongAutomaticMatch(candidate: { matchScore: number }) {
  return candidate.matchScore >= 98;
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("column"));
}

function getStringValue(value: string | null | undefined) {
  return value?.trim() || undefined;
}

function getAdditionalMemberRole(member: ApplicationAdditionalMember): EbusyMultiPersonRole {
  if (member.relation === "partner") {
    return "partner";
  }

  if (member.relation === "child") {
    return "child";
  }

  return "family_member";
}

function getRoleLabel(role: EbusyMultiPersonRole) {
  switch (role) {
    case "main":
      return "Hauptperson / Zahler";
    case "partner":
      return "Partner:in / Familienmitglied";
    case "child":
      return "Kind / Familienmitglied";
    case "family_member":
      return "Familienmitglied";
    default:
      return role;
  }
}

function getDisplayName(application: ApplicationRow) {
  return `${application.first_name} ${application.last_name}`.trim();
}

function getPersonDisplayName(person: EbusyPerson | null | undefined, fallback: string) {
  return `${person?.firstname ?? ""} ${person?.lastname ?? ""}`.trim() || fallback;
}

function getCreatedPersonDetails(
  memberId: string,
  roleLabel: string,
  externalPersonId: string,
  readBackPerson: EbusyPerson | null | undefined,
  fallbackName: string
): ApplicationCreatedEbusyPerson {
  return {
    memberId,
    roleLabel,
    externalPersonId,
    displayName: getPersonDisplayName(readBackPerson, fallbackName),
    customerId: readBackPerson?.customerId,
    personCode: readBackPerson?.code
  };
}

function buildAdditionalMemberApplication(
  row: ApplicationRow,
  member: ApplicationAdditionalMember,
  memberId: string
): ApplicationRow {
  return {
    ...row,
    id: `${row.id}-${memberId}`,
    salutation: getStringValue(member.salutation) ?? null,
    first_name: getStringValue(member.firstName) ?? "",
    last_name: getStringValue(member.lastName) ?? "",
    birth_date: getStringValue(member.birthDate) ?? null,
    email: getStringValue(member.email) ?? row.email,
    phone: row.phone,
    mobile: getStringValue(member.mobile) ?? row.mobile,
    street: getStringValue(member.street) ?? row.street,
    postal_code: getStringValue(member.postalCode) ?? row.postal_code,
    city: getStringValue(member.city) ?? row.city,
    family_members: [],
    accepts_sepa: false,
    iban: null,
    account_holder: null,
    account_holder_address: null,
    notes: [row.notes, `Zusatzperson aus Antrag ${row.id}.`].filter(Boolean).join("\n")
  };
}

function validateAdditionalMember(member: ApplicationAdditionalMember, index: number) {
  const missingFields = [
    ["Vorname", member.firstName],
    ["Nachname", member.lastName],
    ["Geburtsdatum", member.birthDate]
  ]
    .filter(([, value]) => !getStringValue(value))
    .map(([label]) => label);

  if (missingFields.length === 0) {
    return null;
  }

  return `Zusatzperson ${index + 1} ist unvollstaendig: ${missingFields.join(", ")} fehlt.`;
}

function buildMultiPersonTakeoverPlan(
  row: ApplicationRow,
  config: EbusyMultiPersonTakeoverConfig
) {
  const validationErrors = (row.family_members ?? [])
    .map((member, index) => validateAdditionalMember(member, index))
    .filter((message): message is string => Boolean(message));

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  return [
    {
      memberId: "main",
      role: "main" as const,
      roleLabel: getRoleLabel("main"),
      application: row,
      config: getEbusyMultiPersonMemberConfig(config, "main")
    },
    ...(row.family_members ?? []).map((member, index) => {
      const role = getAdditionalMemberRole(member);

      return {
        memberId: `${role}-${index + 1}`,
        role,
        roleLabel: getRoleLabel(role),
        application: buildAdditionalMemberApplication(row, member, `${role}-${index + 1}`),
        config: getEbusyMultiPersonMemberConfig(config, role)
      };
    })
  ];
}

async function updateApplicationAfterTakeover(
  applicationId: string,
  update: {
    status: string;
    transferred_at?: string;
    ebusy_match_status: string;
    ebusy_person_id: string | null;
    ebusy_match_payload: ApplicationMatchPayload;
  }
) {
  const supabase = getSupabaseAdminClient();
  let { error: updateError } = await supabase
    .from("applications")
    .update(update)
    .eq("id", applicationId);

  if (updateError && isMissingColumnError(updateError)) {
    const { transferred_at: _transferredAt, ...fallbackUpdate } = update;
    const retry = await supabase.from("applications").update(fallbackUpdate).eq("id", applicationId);
    updateError = retry.error;
  }

  return updateError;
}

export async function getApplicationsForManagement(): Promise<{
  applications: ApplicationRow[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return {
      applications: (data as ApplicationRow[] | null) ?? []
    };
  } catch (error) {
    return {
      applications: [],
      error:
        error instanceof Error ? error.message : "Anträge konnten nicht geladen werden."
    };
  }
}

export async function matchApplicationWithEbusy(
  applicationId: string
): Promise<ApplicationMatchSummary> {
  const supabase = getSupabaseAdminClient();

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      status: "error",
      message: applicationError?.message ?? "Antrag wurde nicht gefunden."
    };
  }

  const row = application as ApplicationRow;
  const result = await lookupEbusyPerson({
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    birthDate: row.birth_date ?? ""
  });

  const candidateCount = result.candidates.length;
  const bestCandidate = result.candidates[0];

  let ebusyMatchStatus = "pending";
  let ebusyPersonId: string | null = null;
  let summaryStatus: ApplicationMatchSummary["status"] = "error";
  let summaryMessage = result.message ?? "Abgleich abgeschlossen.";

  if (candidateCount === 0) {
    ebusyMatchStatus = "no_match";
    summaryStatus = "no_match";
    summaryMessage = "Kein passender Datensatz in eBuSy gefunden.";
  } else if (candidateCount === 1 && bestCandidate && isStrongAutomaticMatch(bestCandidate)) {
    ebusyMatchStatus = "match_found";
    ebusyPersonId = bestCandidate.externalPersonId;
    summaryStatus = "match_found";
    summaryMessage = `1 passender eBuSy-Treffer gefunden: ${bestCandidate.displayName ?? bestCandidate.externalPersonId}`;
  } else if (candidateCount === 1 && bestCandidate) {
    ebusyMatchStatus = "needs_review";
    summaryStatus = "needs_review";
    summaryMessage =
      "1 möglicher eBuSy-Kandidat gefunden, aber kein sicherer Treffer. Bitte prüfen, verknüpfen oder als neue Person anlegen.";
  } else {
    ebusyMatchStatus = "multiple_matches";
    summaryStatus = "multiple_matches";
    summaryMessage = `${candidateCount} mögliche eBuSy-Treffer gefunden. Bitte manuell prüfen.`;
  }

  const matchPayload: ApplicationMatchPayload = {
    ...result,
    status: ebusyMatchStatus as ApplicationMatchPayload["status"],
    message: summaryMessage
  };

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      ebusy_match_status: ebusyMatchStatus,
      ebusy_person_id: ebusyPersonId,
      ebusy_match_payload: matchPayload
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      status: "error",
      message: updateError.message
    };
  }

  return {
    status: summaryStatus,
    message: summaryMessage,
    externalPersonId: ebusyPersonId,
    candidateCount
  };
}

export async function linkApplicationToEbusyPerson(
  applicationId: string,
  externalPersonId: string
): Promise<ApplicationMatchSummary> {
  const supabase = getSupabaseAdminClient();

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("ebusy_match_payload")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      status: "error",
      message: applicationError?.message ?? "Antrag wurde nicht gefunden."
    };
  }

  const payload = application.ebusy_match_payload as
    | {
        candidates?: Array<{
          externalPersonId?: string;
          displayName?: string;
        }>;
      }
    | null;

  const selectedCandidate = payload?.candidates?.find(
    (candidate) => candidate.externalPersonId === externalPersonId
  );

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      ebusy_match_status: "match_found",
      ebusy_person_id: externalPersonId
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      status: "error",
      message: updateError.message
    };
  }

  return {
    status: "match_found",
    message: selectedCandidate?.displayName
      ? `Antrag wurde mit ${selectedCandidate.displayName} verknüpft.`
      : `Antrag wurde mit eBuSy-ID ${externalPersonId} verknüpft.`,
    externalPersonId
  };
}

async function createMultiPersonApplicationInEbusy(
  applicationId: string,
  row: ApplicationRow
): Promise<ApplicationMatchSummary> {
  const existingPayload = row.ebusy_match_payload as ApplicationMatchPayload | null;
  const takeoverConfig = getProductionEbusyMultiPersonTakeoverConfig(row.membership_kind);

  if (!takeoverConfig) {
    return {
      status: "error",
      message:
        "Diese Mehrpersonen-Mitgliedschaft ist noch nicht fuer die automatische eBuSy-Uebernahme freigegeben."
    };
  }

  if (!row.family_members?.length) {
    return {
      status: "error",
      message:
        "Der Antrag ist als Mehrpersonen-Mitgliedschaft markiert, enthaelt aber keine Zusatzpersonen."
    };
  }

  let plan: ReturnType<typeof buildMultiPersonTakeoverPlan>;

  try {
    plan = buildMultiPersonTakeoverPlan(row, takeoverConfig);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Mehrpersonen-Antrag ist unvollstaendig."
    };
  }

  const createdPeople: ApplicationCreatedEbusyPerson[] = [];
  const createdMemberships: ApplicationCreatedEbusyMembership[] = [];
  const takeoverSteps: ApplicationEbusyTakeoverStep[] = [];
  const takeoverWarnings = [...takeoverConfig.warnings];

  for (const member of plan) {
    const fallbackName = getDisplayName(member.application);
    let createdPerson: Awaited<ReturnType<typeof createEbusyPersonFromApplication>>;
    let readBackPerson: EbusyPerson | null = null;

    try {
      createdPerson = await createEbusyPersonFromApplication(member.application);
      readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
      createdPeople.push(
        getCreatedPersonDetails(
          member.memberId,
          member.roleLabel,
          createdPerson.externalPersonId,
          readBackPerson,
          createdPerson.displayName || fallbackName
        )
      );
      takeoverSteps.push({
        memberId: member.memberId,
        roleLabel: member.roleLabel,
        step: "person",
        status: "success",
        message: `Person angelegt: ${createdPerson.displayName} (${createdPerson.externalPersonId}).`
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Personenfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Uebernahme abgebrochen: ${member.roleLabel} konnte nicht angelegt werden: ${reason}`,
        candidates: existingPayload?.candidates ?? [],
        createdPeople,
        createdMemberships,
        takeoverSteps: [
          ...takeoverSteps,
          {
            memberId: member.memberId,
            roleLabel: member.roleLabel,
            step: "person",
            status: "error",
            message: reason
          }
        ],
        takeoverWarnings
      };

      await updateApplicationAfterTakeover(applicationId, {
        status: row.status,
        ebusy_match_status: "error",
        ebusy_person_id: createdPeople[0]?.externalPersonId ?? null,
        ebusy_match_payload: failedPayload
      });

      return {
        status: "error",
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy pruefen.`,
        externalPersonId: createdPeople[0]?.externalPersonId ?? null,
        matchPayload: failedPayload
      };
    }

    try {
      if (member.config.attributeAssignments.length > 0) {
        await setEbusyPersonAttributes(
          createdPerson.externalPersonId,
          member.config.attributeAssignments
        );
        readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
        const currentPerson = createdPeople.find(
          (person) => person.memberId === member.memberId
        );

        if (currentPerson && readBackPerson) {
          currentPerson.customerId = readBackPerson.customerId;
          currentPerson.personCode = readBackPerson.code;
          currentPerson.displayName = getPersonDisplayName(readBackPerson, currentPerson.displayName ?? fallbackName);
        }

        takeoverSteps.push({
          memberId: member.memberId,
          roleLabel: member.roleLabel,
          step: "attributes",
          status: "success",
          message: `${member.config.attributeAssignments.length} Attribut(e) gesetzt.`
        });
      } else {
        takeoverSteps.push({
          memberId: member.memberId,
          roleLabel: member.roleLabel,
          step: "attributes",
          status: "skipped",
          message: "Keine Attribute fuer diese Rolle konfiguriert."
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Attributfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Uebernahme abgebrochen: Attribute fuer ${member.roleLabel} konnten nicht gesetzt werden: ${reason}`,
        candidates: existingPayload?.candidates ?? [],
        createdPeople,
        createdMemberships,
        takeoverSteps: [
          ...takeoverSteps,
          {
            memberId: member.memberId,
            roleLabel: member.roleLabel,
            step: "attributes",
            status: "error",
            message: reason
          }
        ],
        takeoverWarnings
      };

      await updateApplicationAfterTakeover(applicationId, {
        status: row.status,
        ebusy_match_status: "error",
        ebusy_person_id: createdPeople[0]?.externalPersonId ?? null,
        ebusy_match_payload: failedPayload
      });

      return {
        status: "error",
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy pruefen.`,
        externalPersonId: createdPeople[0]?.externalPersonId ?? null,
        matchPayload: failedPayload
      };
    }

    try {
      const personId = Number(createdPerson.externalPersonId);

      if (!Number.isInteger(personId)) {
        throw new Error(
          `eBuSy-ID ${createdPerson.externalPersonId} konnte nicht als Zahl verarbeitet werden.`
        );
      }

      const membershipPayload = buildEbusyMembershipPayloadForApplication(
        member.application,
        personId,
        member.config.membership,
        readBackPerson?.customerId,
        "Digitaler Mitgliedsantrag"
      );
      const createdMembership = await createEbusyMembership(
        member.config.membership.moduleId,
        membershipPayload
      );

      await getEbusyMembershipsByPersonId(member.config.membership.moduleId, personId);

      createdMemberships.push({
        memberId: member.memberId,
        roleLabel: member.roleLabel,
        externalMembershipId: createdMembership.externalMembershipId,
        displayName: createdMembership.displayName,
        personId: createdPerson.externalPersonId,
        membershipNumber: readBackPerson?.customerId
      });
      takeoverSteps.push({
        memberId: member.memberId,
        roleLabel: member.roleLabel,
        step: "membership",
        status: "success",
        message: `Einfache Mitgliedschaft erstellt: ${createdMembership.displayName}.`
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Mitgliedschaftsfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Uebernahme abgebrochen: Mitgliedschaft fuer ${member.roleLabel} konnte nicht erstellt werden: ${reason}`,
        candidates: existingPayload?.candidates ?? [],
        createdPeople,
        createdMemberships,
        takeoverSteps: [
          ...takeoverSteps,
          {
            memberId: member.memberId,
            roleLabel: member.roleLabel,
            step: "membership",
            status: "error",
            message: reason
          }
        ],
        takeoverWarnings
      };

      await updateApplicationAfterTakeover(applicationId, {
        status: row.status,
        ebusy_match_status: "error",
        ebusy_person_id: createdPeople[0]?.externalPersonId ?? null,
        ebusy_match_payload: failedPayload
      });

      return {
        status: "error",
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy pruefen.`,
        externalPersonId: createdPeople[0]?.externalPersonId ?? null,
        matchPayload: failedPayload
      };
    }
  }

  const mainPerson = createdPeople[0];
  const message = `${createdPeople.length} Person(en), Attribute und einfache Mitgliedschaften wurden in eBuSy angelegt. Familien-/Hauptzahlerbezug und Beitragsarten bleiben zur manuellen/fachlichen Pruefung offen.`;
  const nextPayload: ApplicationMatchPayload = {
    status: "created_in_ebusy",
    source: "live",
    message,
    candidates: existingPayload?.candidates ?? [],
    createdPerson: mainPerson
      ? {
          externalPersonId: mainPerson.externalPersonId,
          displayName: mainPerson.displayName
        }
      : undefined,
    createdPeople,
    createdMemberships,
    takeoverSteps,
    takeoverWarnings
  };
  const updateError = await updateApplicationAfterTakeover(applicationId, {
    status: "transferred_to_ebusy",
    transferred_at: new Date().toISOString(),
    ebusy_match_status: "created_in_ebusy",
    ebusy_person_id: mainPerson?.externalPersonId ?? null,
    ebusy_match_payload: nextPayload
  });

  if (updateError) {
    return {
      status: "created_in_ebusy",
      message: `${message} Achtung: Die lokale Verknuepfung konnte nicht gespeichert werden: ${updateError.message}`,
      externalPersonId: mainPerson?.externalPersonId ?? null,
      matchPayload: nextPayload
    };
  }

  return {
    status: "created_in_ebusy",
    message,
    externalPersonId: mainPerson?.externalPersonId ?? null,
    matchPayload: nextPayload
  };
}

export async function createApplicationPersonInEbusy(
  applicationId: string
): Promise<ApplicationMatchSummary> {
  const supabase = getSupabaseAdminClient();

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      status: "error",
      message: applicationError?.message ?? "Antrag wurde nicht gefunden."
    };
  }

  const row = application as ApplicationRow;

  if (row.ebusy_person_id) {
    return {
      status: "match_found",
      message: `Antrag ist bereits mit eBuSy-ID ${row.ebusy_person_id} verknüpft.`,
      externalPersonId: row.ebusy_person_id
    };
  }

  if (isMultiPersonMembership(row.membership_kind)) {
    return createMultiPersonApplicationInEbusy(applicationId, row);
  }

  const canCreatePerson = ["no_match", "needs_review", "multiple_matches"].includes(
    row.ebusy_match_status
  );

  if (!canCreatePerson) {
    return {
      status: "error",
      message:
        row.ebusy_match_status === "pending"
          ? "Bitte zuerst den eBuSy-Abgleich für diesen Antrag ausführen."
          : "Eine Neuanlage ist nur für Anträge ohne sichere eBuSy-Verknüpfung vorgesehen."
    };
  }

  const takeoverConfig = getProductionEbusySinglePersonTakeoverConfig(row.membership_kind);

  if (!takeoverConfig) {
    return {
      status: "error",
      message:
        "Diese Mitgliedschaftsart ist noch nicht fuer die vollstaendige automatische eBuSy-Uebernahme freigegeben. Bitte zuerst im eBuSy-Testlabor pruefen."
    };
  }

  const createdPerson = await createEbusyPersonFromApplication(row);
  const existingPayload = row.ebusy_match_payload as ApplicationMatchPayload | null;
  let readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
  const personId = Number(createdPerson.externalPersonId);

  if (!Number.isInteger(personId)) {
    return {
      status: "error",
      message: `Person wurde in eBuSy angelegt (${createdPerson.externalPersonId}), aber die eBuSy-ID konnte nicht als Zahl fuer Folgeschritte verarbeitet werden. Bitte manuell pruefen.`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  try {
    await setEbusyPersonAttributes(
      createdPerson.externalPersonId,
      takeoverConfig.attributeAssignments
    );
    readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unbekannter Attributfehler";
    const failedPayload: ApplicationMatchPayload = {
      status: "error",
      source: "live",
      message: `Person wurde in eBuSy angelegt, aber Attribute konnten nicht gesetzt werden: ${reason}`,
      candidates: existingPayload?.candidates ?? [],
      createdPerson
    };

    await supabase
      .from("applications")
      .update({
        ebusy_match_status: "error",
        ebusy_person_id: createdPerson.externalPersonId,
        ebusy_match_payload: failedPayload
      })
      .eq("id", applicationId);

    return {
      status: "error",
      message: `${failedPayload.message}. Bitte die Person in eBuSy manuell pruefen.`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  const membershipPayload = buildEbusyMembershipPayloadForApplication(
    row,
    personId,
    takeoverConfig.membership,
    readBackPerson.customerId,
    "Digitaler Mitgliedsantrag"
  );
  let createdMembership:
    | {
        externalMembershipId: string;
        displayName: string;
      }
    | undefined;

  try {
    createdMembership = await createEbusyMembership(
      takeoverConfig.membership.moduleId,
      membershipPayload
    );

    await getEbusyMembershipsByPersonId(takeoverConfig.membership.moduleId, personId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unbekannter Mitgliedschaftsfehler";
    const failedPayload: ApplicationMatchPayload = {
      status: "error",
      source: "live",
      message: `Person wurde in eBuSy angelegt und Attribute wurden gesetzt, aber die Mitgliedschaft konnte nicht erstellt oder gelesen werden: ${reason}`,
      candidates: existingPayload?.candidates ?? [],
      createdPerson
    };

    await supabase
      .from("applications")
      .update({
        ebusy_match_status: "error",
        ebusy_person_id: createdPerson.externalPersonId,
        ebusy_match_payload: failedPayload
      })
      .eq("id", applicationId);

    return {
      status: "error",
      message: `${failedPayload.message}. Bitte die Person in eBuSy manuell pruefen.`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  const message = `Person, Attribute und Mitgliedschaft wurden in eBuSy angelegt: ${createdPerson.displayName} (${createdPerson.externalPersonId}).`;
  const nextPayload: ApplicationMatchPayload = {
    status: "created_in_ebusy",
    source: "live",
    message,
    candidates: existingPayload?.candidates ?? [],
    createdPerson,
    createdMembership
  };

  let { error: updateError } = await supabase
    .from("applications")
    .update({
      status: "transferred_to_ebusy",
      transferred_at: new Date().toISOString(),
      ebusy_match_status: "created_in_ebusy",
      ebusy_person_id: createdPerson.externalPersonId,
      ebusy_match_payload: nextPayload
    })
    .eq("id", applicationId);

  if (updateError && isMissingColumnError(updateError)) {
    const retry = await supabase
      .from("applications")
      .update({
        status: "transferred_to_ebusy",
        ebusy_match_status: "created_in_ebusy",
        ebusy_person_id: createdPerson.externalPersonId,
        ebusy_match_payload: nextPayload
      })
      .eq("id", applicationId);

    updateError = retry.error;
  }

  if (updateError) {
    return {
      status: "created_in_ebusy",
      message: `${message} Achtung: Die lokale Verknüpfung konnte nicht gespeichert werden: ${updateError.message}`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  return {
    status: "created_in_ebusy",
    message,
    externalPersonId: createdPerson.externalPersonId,
    matchPayload: nextPayload
  };
}
