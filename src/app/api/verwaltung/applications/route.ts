import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, created_at, status, first_name, last_name, birth_date, email, membership_kind, notes, ebusy_match_status, ebusy_person_id, family_members"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      applications: data ?? []
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Antraege konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
