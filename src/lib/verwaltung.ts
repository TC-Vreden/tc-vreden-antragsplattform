import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type {
  ApplicationMatchPayload,
  ApplicationMatchSummary,
  ApplicationRow
} from "@/lib/application-types";
import {
  createEbusyMembership,
  createEbusyPersonFromApplication,
  getEbusyMembershipsByPersonId,
  getEbusyPersonById,
  lookupEbusyPerson,
  setEbusyPersonAttributes
} from "@/lib/ebusy";
import { isMultiPersonMembership } from "@/lib/application-options";
import {
  buildEbusyMembershipPayloadForApplication,
  getProductionEbusySinglePersonTakeoverConfig
} from "@/lib/ebusy-takeover-config";

function isStrongAutomaticMatch(candidate: { matchScore: number }) {
  return candidate.matchScore >= 98;
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("column"));
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
    return {
      status: "error",
      message:
        "Mehrpersonen-Anträge können noch nicht automatisch als einzelne eBuSy-Person angelegt werden. Bitte später die Mehrpersonen-Anlage verwenden."
    };
  }

  if (row.ebusy_person_id) {
    return {
      status: "match_found",
      message: `Antrag ist bereits mit eBuSy-ID ${row.ebusy_person_id} verknüpft.`,
      externalPersonId: row.ebusy_person_id
    };
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
    externalPersonId: createdPerson.externalPersonId
  };
}
