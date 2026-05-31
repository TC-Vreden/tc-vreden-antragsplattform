import { NextResponse } from "next/server";
import { z } from "zod";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { internalRoleIds } from "@/lib/internal-roles";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateUserSchema = z.object({
  displayName: z.string().trim().nullable().optional(),
  role: z.enum(internalRoleIds as [string, ...string[]]).optional(),
  status: z.enum(["invited", "active", "disabled"]).optional()
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("users.manage", request);
    const { id } = await context.params;
    const parsed = updateUserSchema.safeParse(await request.json());

    if (!id) {
      return NextResponse.json({ message: "Benutzer-ID fehlt." }, { status: 400 });
    }

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Die Benutzerdaten sind unvollstaendig oder ungueltig.",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    if (
      actor.userId === id &&
      (parsed.data.status === "disabled" || parsed.data.role !== undefined && parsed.data.role !== "admin")
    ) {
      return NextResponse.json(
        {
          message: "Der eigene Admin-Zugang kann nicht gesperrt oder herabgestuft werden."
        },
        { status: 400 }
      );
    }

    const updatePayload = {
      ...(parsed.data.displayName !== undefined
        ? {
            display_name: parsed.data.displayName
          }
        : {}),
      ...(parsed.data.role
        ? {
            role: parsed.data.role
          }
        : {}),
      ...(parsed.data.status
        ? {
            status: parsed.data.status
          }
        : {})
    };

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("internal_user_profiles")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Benutzerprofil konnte nicht gespeichert werden.");
    }

    await writeInternalAuditLog({
      actor,
      action: "internal_user.update",
      entityType: "internal_user",
      entityId: id,
      details: {
        changedFields: Object.keys(updatePayload)
      }
    });

    return NextResponse.json({
      user: data
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Benutzer konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("users.manage", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Benutzer-ID fehlt." }, { status: 400 });
    }

    if (actor.userId === id) {
      return NextResponse.json(
        {
          message: "Der eigene Admin-Zugang kann nicht geloescht werden."
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("internal_user_profiles")
      .select("id, email, role, status")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message ?? "Benutzerprofil wurde nicht gefunden.");
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await writeInternalAuditLog({
      actor,
      action: "internal_user.delete",
      entityType: "internal_user",
      entityId: id,
      details: {
        email: profile.email,
        role: profile.role,
        status: profile.status
      }
    });

    return NextResponse.json({
      message: `Benutzer ${profile.email} wurde geloescht.`
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Benutzer konnte nicht geloescht werden."
      },
      { status: 500 }
    );
  }
}
