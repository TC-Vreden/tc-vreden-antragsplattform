import { NextResponse } from "next/server";
import { z } from "zod";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission,
  type InternalUserProfile
} from "@/lib/internal-auth";
import { getAuthMailErrorMessage } from "@/lib/auth-mail-errors";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { internalRoleIds } from "@/lib/internal-roles";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().optional(),
  role: z.enum(internalRoleIds as [string, ...string[]])
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAuthRedirectUrl(request: Request) {
  const origin = new URL(request.url).origin;

  return `${origin}/verwaltung/passwort-neu`;
}

async function findAuthUserByEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user) => normalizeEmail(user.email ?? "") === normalizedEmail) ?? null;
}

async function listProfiles(): Promise<InternalUserProfile[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("internal_user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as InternalUserProfile[] | null) ?? [];
}

export async function GET(request: Request) {
  try {
    await requireInternalApiPermission("users.manage", request);

    return NextResponse.json({
      users: await listProfiles()
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Benutzer konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiPermission("users.manage", request);
    const parsed = createUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Die Benutzerdaten sind unvollständig oder ungültig.",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const email = normalizeEmail(parsed.data.email);
    const redirectTo = getAuthRedirectUrl(request);
    let authUser = await findAuthUserByEmail(email);
    const userAlreadyExisted = Boolean(authUser);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          display_name: parsed.data.displayName || null
        },
        redirectTo
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Einladung konnte nicht erstellt werden.");
      }

      authUser = data.user;
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    const now = new Date().toISOString();
    const { data: existingProfile } = await supabase
      .from("internal_user_profiles")
      .select("status, accepted_at, invited_at")
      .eq("id", authUser.id)
      .maybeSingle();
    const { data: profile, error: profileError } = await supabase
      .from("internal_user_profiles")
      .upsert(
        {
          id: authUser.id,
          email,
          display_name: parsed.data.displayName || null,
          role: parsed.data.role,
          status: existingProfile?.status ?? "invited",
          accepted_at: existingProfile?.accepted_at ?? null,
          invited_at: existingProfile?.invited_at ?? now
        },
        {
          onConflict: "id"
        }
      )
      .select("*")
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message ?? "Benutzerprofil konnte nicht gespeichert werden.");
    }

    await writeInternalAuditLog({
      actor,
      action: "internal_user.invite",
      entityType: "internal_user",
      entityId: authUser.id,
      details: {
        email,
        role: parsed.data.role,
        existingAuthUser: userAlreadyExisted
      }
    });

    return NextResponse.json({
      user: profile,
      message: userAlreadyExisted
        ? `Für ${email} gab es bereits einen Zugang. Ein neuer Passwortlink wurde versendet.`
        : `Einladung wurde an ${email} versendet.`
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    const mailError = getAuthMailErrorMessage(
      error,
      "Benutzer konnte nicht eingeladen werden."
    );

    return NextResponse.json(
      {
        message: mailError.message
      },
      { status: mailError.status }
    );
  }
}
