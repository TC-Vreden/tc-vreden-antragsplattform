import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiPermission("applications.read", request);
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

    await writeInternalAuditLog({
      actor,
      action: "applications.api_list",
      entityType: "application",
      details: {
        visibleCount: data?.length ?? 0
      }
    });

    return NextResponse.json({
      applications: data ?? []
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

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
