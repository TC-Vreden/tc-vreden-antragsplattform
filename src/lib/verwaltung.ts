import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type {
  ApplicationMatchPayload,
  ApplicationMatchSummary,
  ApplicationRow
} from "@/lib/application-types";
import { createEbusyPersonFromApplication, lookupEbusyPerson } from "@/lib/ebusy";

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
        error instanceof Error ? error.message : "Antraege konnten nicht geladen werden."
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
  } else if (candidateCount === 1 && bestCandidate) {
    ebusyMatchStatus = "match_found";
    ebusyPersonId = bestCandidate.externalPersonId;
    summaryStatus = "match_found";
    summaryMessage = `1 passender eBuSy-Treffer gefunden: ${bestCandidate.displayName ?? bestCandidate.externalPersonId}`;
  } else {
    ebusyMatchStatus = "multiple_matches";
    summaryStatus = "multiple_matches";
    summaryMessage = `${candidateCount} moegliche eBuSy-Treffer gefunden. Bitte manuell pruefen.`;
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      ebusy_match_status: ebusyMatchStatus,
      ebusy_person_id: ebusyPersonId,
      ebusy_match_payload: result
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
      ? `Antrag wurde mit ${selectedCandidate.displayName} verknuepft.`
      : `Antrag wurde mit eBuSy-ID ${externalPersonId} verknuepft.`,
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

  if (row.ebusy_person_id) {
    return {
      status: "match_found",
      message: `Antrag ist bereits mit eBuSy-ID ${row.ebusy_person_id} verknuepft.`,
      externalPersonId: row.ebusy_person_id
    };
  }

  if (row.ebusy_match_status !== "no_match") {
    return {
      status: "error",
      message:
        row.ebusy_match_status === "pending"
          ? "Bitte zuerst den eBuSy-Abgleich fuer diesen Antrag ausfuehren."
          : "Eine Neuanlage ist nur fuer Antraege mit Status Kein Treffer vorgesehen."
    };
  }

  const createdPerson = await createEbusyPersonFromApplication(row);
  const existingPayload = row.ebusy_match_payload as ApplicationMatchPayload | null;
  const message = `Person wurde in eBuSy angelegt: ${createdPerson.displayName} (${createdPerson.externalPersonId}).`;
  const nextPayload: ApplicationMatchPayload = {
    status: "person_created",
    source: "live",
    message,
    candidates: existingPayload?.candidates ?? [],
    createdPerson
  };

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      ebusy_match_status: "person_created",
      ebusy_person_id: createdPerson.externalPersonId,
      ebusy_match_payload: nextPayload
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      status: "person_created",
      message: `${message} Achtung: Die lokale Verknuepfung konnte nicht gespeichert werden: ${updateError.message}`,
      externalPersonId: createdPerson.externalPersonId
    };
  }

  return {
    status: "person_created",
    message,
    externalPersonId: createdPerson.externalPersonId
  };
}
