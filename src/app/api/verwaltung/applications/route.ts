import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, created_at, updated_at, status, transferred_at, salutation, first_name, last_name, birth_date, email, phone, mobile, street, postal_code, city, membership_kind, student_status_until, family_members, accepts_statutes, accepts_privacy, accepts_photo_video, accepts_whatsapp, accepts_sepa, iban, account_holder, account_holder_address, guardian_name, guardian_email, guardian_phone, guardian_consent, notes, ebusy_match_status, ebusy_person_id, ebusy_match_payload"
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
            : "Anträge konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
