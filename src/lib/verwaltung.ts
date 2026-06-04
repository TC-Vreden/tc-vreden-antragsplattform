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
  setEbusyPersonAttributes,
  setEbusyPersonPaidBy,
  updateEbusyPersonFromApplication,
  type EbusyPaymentDetailsPayload
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
import {
  sendApplicationConfirmationEmail,
  type ApplicationConfirmationEmailResult
} from "@/lib/application-confirmation-email";

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

function appendConfirmationEmailMessage(
  message: string,
  result: ApplicationConfirmationEmailResult
) {
  if (result.status === "sent") {
    return `${message} Bestätigungsmail wurde gesendet.`;
  }

  if (result.status === "failed") {
    return `${message} Achtung: Bestätigungsmail konnte nicht gesendet werden: ${
      result.reason ?? "Unbekannter Mailfehler"
    }.`;
  }

  return `${message} Hinweis: Bestätigungsmail wurde nicht gesendet: ${
    result.reason ?? "Mailversand deaktiviert"
  }.`;
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

function updateCreatedPersonDetails(
  person: ApplicationCreatedEbusyPerson,
  readBackPerson: EbusyPerson | null | undefined,
  fallbackName: string
) {
  if (!readBackPerson) {
    return;
  }

  person.customerId = readBackPerson.customerId;
  person.personCode = readBackPerson.code;
  person.displayName = getPersonDisplayName(readBackPerson, person.displayName ?? fallbackName);
}

function getMainPayerPerson(createdPeople: ApplicationCreatedEbusyPerson[]) {
  return (
    createdPeople.find((person) => person.memberId === "main") ??
    createdPeople[0]
  );
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

function hasPaymentDetails(paymentDetails: EbusyPaymentDetailsPayload) {
  return Boolean(paymentDetails.bankAccount?.number || paymentDetails.sepaMandate?.date);
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

function isMinorByBirthDate(value: string | null | undefined) {
  const birthDateValue = getStringValue(value);

  if (!birthDateValue) {
    return false;
  }

  const birthDate = new Date(`${birthDateValue}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const eighteenthBirthday = new Date(birthDate);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);

  return eighteenthBirthday > new Date();
}

function validateAdditionalMember(member: ApplicationAdditionalMember, index: number) {
  const missingFields = [
    ["Anrede", member.salutation],
    ["Vorname", member.firstName],
    ["Nachname", member.lastName],
    ["Geburtsdatum", member.birthDate],
    ...(member.relation === "child" || isMinorByBirthDate(member.birthDate)
      ? [["Gesetzliche Vertreter", member.legalRepresentative]]
      : [])
  ]
    .filter(([, value]) => !getStringValue(value))
    .map(([label]) => label);

  if (missingFields.length === 0) {
    return null;
  }

  return `Zusatzperson ${index + 1} ist unvollständig: ${missingFields.join(", ")} fehlt.`;
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
    const fallbackUpdate = { ...update };
    delete fallbackUpdate.transferred_at;
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
        "Diese Mehrpersonen-Mitgliedschaft ist noch nicht für die automatische eBuSy-Übernahme freigegeben."
    };
  }

  if (!row.family_members?.length) {
    return {
      status: "error",
      message:
        "Der Antrag ist als Mehrpersonen-Mitgliedschaft markiert, enthält aber keine Zusatzpersonen."
    };
  }

  let plan: ReturnType<typeof buildMultiPersonTakeoverPlan>;

  try {
    plan = buildMultiPersonTakeoverPlan(row, takeoverConfig);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Mehrpersonen-Antrag ist unvollständig."
    };
  }

  const createdPeople: ApplicationCreatedEbusyPerson[] = [];
  const createdMemberships: ApplicationCreatedEbusyMembership[] = [];
  const takeoverSteps: ApplicationEbusyTakeoverStep[] = [];
  const takeoverWarnings = [...takeoverConfig.warnings];
  let mainPayerPaymentDetails: EbusyPaymentDetailsPayload = {};

  for (const member of plan) {
    const fallbackName = getDisplayName(member.application);
    let createdPerson: Awaited<ReturnType<typeof createEbusyPersonFromApplication>>;
    let readBackPerson: EbusyPerson | null = null;

    try {
      if (member.memberId === "main" && row.ebusy_person_id) {
        await updateEbusyPersonFromApplication(row.ebusy_person_id, member.application);
        createdPerson = {
          externalPersonId: row.ebusy_person_id,
          displayName: fallbackName
        };
      } else {
        createdPerson = await createEbusyPersonFromApplication(member.application);
      }

      readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
      if (member.memberId === "main") {
        mainPayerPaymentDetails = getPaymentDetailsFromPerson(readBackPerson);
      }
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
        message:
          member.memberId === "main" && row.ebusy_person_id
            ? `Vorhandene eBuSy-Person aktualisiert: ${getPersonDisplayName(readBackPerson, fallbackName)} (${createdPerson.externalPersonId}).`
            : `Person angelegt: ${createdPerson.displayName} (${createdPerson.externalPersonId}).`
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Personenfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Übernahme abgebrochen: ${member.roleLabel} konnte nicht angelegt werden: ${reason}`,
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
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy prüfen.`,
        externalPersonId: createdPeople[0]?.externalPersonId ?? null,
        matchPayload: failedPayload
      };
    }

    try {
      if (member.config.payerRelation) {
        const payer = getMainPayerPerson(createdPeople);
        const payerPersonId = Number(payer?.externalPersonId);

        if (!payer || !Number.isInteger(payerPersonId)) {
          throw new Error("Der Hauptzahler wurde noch nicht angelegt oder konnte nicht als eBuSy-ID verarbeitet werden.");
        }

        await setEbusyPersonPaidBy(createdPerson.externalPersonId, {
          id: payerPersonId,
          moduleIds: member.config.payerRelation.moduleIds,
          paysForVouchersAndCoupons: member.config.payerRelation.paysForVouchersAndCoupons,
          paysForCustomPurchases: member.config.payerRelation.paysForCustomPurchases
        }, mainPayerPaymentDetails);
        readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);

        const currentPerson = createdPeople.find(
          (person) => person.memberId === member.memberId
        );

        if (currentPerson) {
          updateCreatedPersonDetails(currentPerson, readBackPerson, fallbackName);
        }

        takeoverSteps.push({
          memberId: member.memberId,
          roleLabel: member.roleLabel,
          step: "payer",
          status: "success",
          message: hasPaymentDetails(mainPayerPaymentDetails)
            ? `Hauptzahler und Bankkonto gesetzt: ${payer.displayName ?? payer.externalPersonId}.`
            : `Hauptzahler gesetzt: ${payer.displayName ?? payer.externalPersonId}.`
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Hauptzahlerfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Übernahme abgebrochen: Hauptzahler für ${member.roleLabel} konnte nicht gesetzt werden: ${reason}`,
        candidates: existingPayload?.candidates ?? [],
        createdPeople,
        createdMemberships,
        takeoverSteps: [
          ...takeoverSteps,
          {
            memberId: member.memberId,
            roleLabel: member.roleLabel,
            step: "payer",
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
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy prüfen.`,
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
          updateCreatedPersonDetails(currentPerson, readBackPerson, fallbackName);
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
          message: "Keine Attribute für diese Rolle konfiguriert."
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unbekannter Attributfehler";
      const failedPayload: ApplicationMatchPayload = {
        status: "error",
        source: "live",
        message: `Mehrpersonen-Übernahme abgebrochen: Attribute für ${member.roleLabel} konnten nicht gesetzt werden: ${reason}`,
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
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy prüfen.`,
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

      if (member.memberId === "main" && row.ebusy_person_id) {
        const existingMemberships = await getEbusyMembershipsByPersonId(
          member.config.membership.moduleId,
          personId
        );

        if (existingMemberships.length > 0) {
          throw new Error(
            "Die verknüpfte Hauptperson hat bereits eine Mitgliedschaft. Bitte den Mehrpersonen-Antrag manuell prüfen, damit keine Doppelmitgliedschaft entsteht."
          );
        }
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
        message: `Mehrpersonen-Übernahme abgebrochen: Mitgliedschaft für ${member.roleLabel} konnte nicht erstellt werden: ${reason}`,
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
        message: `${failedPayload.message}. Bereits angelegte Teilpersonen bitte in eBuSy prüfen.`,
        externalPersonId: createdPeople[0]?.externalPersonId ?? null,
        matchPayload: failedPayload
      };
    }
  }

  const mainPerson = createdPeople[0];
  const message = `${createdPeople.length} Person(en), Hauptzahlerbezug für Zusatzpersonen, Attribute und einfache Mitgliedschaften wurden in eBuSy angelegt bzw. aktualisiert.`;
  const transferredAt = new Date().toISOString();
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
    transferred_at: transferredAt,
    ebusy_match_status: "created_in_ebusy",
    ebusy_person_id: mainPerson?.externalPersonId ?? null,
    ebusy_match_payload: nextPayload
  });

  if (updateError) {
    return {
      status: "created_in_ebusy",
      message: `${message} Achtung: Die lokale Verknüpfung konnte nicht gespeichert werden: ${updateError.message}`,
      externalPersonId: mainPerson?.externalPersonId ?? null,
      matchPayload: nextPayload
    };
  }

  const confirmationEmailResult: ApplicationConfirmationEmailResult =
    await sendApplicationConfirmationEmail({
      application: row,
      transferredAt,
      matchPayload: nextPayload
    }).catch((error) => ({
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter Mailfehler"
    }));

  return {
    status: "created_in_ebusy",
    message: appendConfirmationEmailMessage(message, confirmationEmailResult),
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

  if (isMultiPersonMembership(row.membership_kind)) {
    return createMultiPersonApplicationInEbusy(applicationId, row);
  }

  const existingPersonId = row.ebusy_person_id;
  const canCreatePerson = existingPersonId
    ? row.ebusy_match_status === "match_found"
    : ["no_match", "needs_review", "multiple_matches"].includes(row.ebusy_match_status);

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
        "Diese Mitgliedschaftsart ist noch nicht für die vollständige automatische eBuSy-Übernahme freigegeben. Bitte zuerst im eBuSy-Testlabor prüfen."
    };
  }

  const existingPayload = row.ebusy_match_payload as ApplicationMatchPayload | null;
  const createdPerson = existingPersonId
    ? {
        externalPersonId: existingPersonId,
        displayName: getDisplayName(row)
      }
    : await createEbusyPersonFromApplication(row);

  if (existingPersonId) {
    await updateEbusyPersonFromApplication(existingPersonId, row);
  }

  let readBackPerson = await getEbusyPersonById(createdPerson.externalPersonId);
  const personId = Number(createdPerson.externalPersonId);

  if (!Number.isInteger(personId)) {
    return {
      status: "error",
      message: `Person wurde in eBuSy angelegt (${createdPerson.externalPersonId}), aber die eBuSy-ID konnte nicht als Zahl für Folgeschritte verarbeitet werden. Bitte manuell prüfen.`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  if (existingPersonId) {
    const existingMemberships = await getEbusyMembershipsByPersonId(
      takeoverConfig.membership.moduleId,
      personId
    );

    if (existingMemberships.length > 0) {
      return {
        status: "error",
        message:
          "Die verknüpfte eBuSy-Person hat bereits eine Mitgliedschaft. Bitte den Fall manuell prüfen, damit keine Doppelmitgliedschaft entsteht.",
        externalPersonId: createdPerson.externalPersonId
      };
    }
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
      message: `${failedPayload.message}. Bitte die Person in eBuSy manuell prüfen.`,
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
      message: `${failedPayload.message}. Bitte die Person in eBuSy manuell prüfen.`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  const message = existingPersonId
    ? `Vorhandene eBuSy-Person wurde aktualisiert, Attribute und Mitgliedschaft wurden angelegt: ${getPersonDisplayName(readBackPerson, createdPerson.displayName)} (${createdPerson.externalPersonId}).`
    : `Person, Attribute und Mitgliedschaft wurden in eBuSy angelegt: ${createdPerson.displayName} (${createdPerson.externalPersonId}).`;
  const transferredAt = new Date().toISOString();
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
      transferred_at: transferredAt,
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

  const confirmationEmailResult: ApplicationConfirmationEmailResult =
    await sendApplicationConfirmationEmail({
      application: row,
      transferredAt,
      matchPayload: nextPayload
    }).catch((error) => ({
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter Mailfehler"
    }));

  return {
    status: "created_in_ebusy",
    message: appendConfirmationEmailMessage(message, confirmationEmailResult),
    externalPersonId: createdPerson.externalPersonId,
    matchPayload: nextPayload
  };
}
