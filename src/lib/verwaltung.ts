import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type { ApplicationRow } from "@/lib/application-types";

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
