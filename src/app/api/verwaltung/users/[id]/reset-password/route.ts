import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getAuthRedirectUrl(request: Request) {
  const origin = new URL(request.url).origin;

  return `${origin}/verwaltung/passwort-neu`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("users.manage", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Benutzer-ID fehlt." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("internal_user_profiles")
      .select("id, email")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message ?? "Benutzerprofil wurde nicht gefunden.");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: getAuthRedirectUrl(request)
    });

    if (error) {
      throw new Error(error.message);
    }

    await writeInternalAuditLog({
      actor,
      action: "internal_user.password_reset",
      entityType: "internal_user",
      entityId: id,
      details: {
        email: profile.email
      }
    });

    return NextResponse.json({
      message: "Passwortlink wurde angefordert."
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Passwortlink konnte nicht gesendet werden."
      },
      { status: 500 }
    );
  }
}
