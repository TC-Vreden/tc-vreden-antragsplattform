import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type { ApplicationMatchSummary, ApplicationRow } from "@/lib/application-types";
import { lookupEbusyPerson } from "@/lib/ebusy";

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
