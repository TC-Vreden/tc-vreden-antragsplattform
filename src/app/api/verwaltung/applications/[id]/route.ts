import { NextResponse } from "next/server";
import { z } from "zod";
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

const nullableTextSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

const requiredTextSchema = z.string().trim().min(1);

const familyMemberSchema = z.object({
  relation: z.enum(["partner", "child", "family_member"]).optional(),
  salutation: nullableTextSchema,
  firstName: nullableTextSchema,
  lastName: nullableTextSchema,
  birthDate: nullableTextSchema,
  email: nullableTextSchema,
  mobile: nullableTextSchema,
  street: nullableTextSchema,
  postalCode: nullableTextSchema,
  city: nullableTextSchema
});

const updateApplicationSchema = z.object({
  salutation: nullableTextSchema,
  first_name: requiredTextSchema,
  last_name: requiredTextSchema,
  birth_date: nullableTextSchema,
  email: requiredTextSchema.email(),
  phone: requiredTextSchema,
  mobile: requiredTextSchema,
  street: nullableTextSchema,
  postal_code: nullableTextSchema,
  city: nullableTextSchema,
  membership_kind: nullableTextSchema,
  student_status_until: nullableTextSchema,
  family_members: z.array(familyMemberSchema).default([]),
  accepts_statutes: z.boolean(),
  accepts_privacy: z.boolean(),
  accepts_photo_video: z.boolean(),
  accepts_whatsapp: z.boolean(),
  accepts_sepa: z.boolean(),
  iban: nullableTextSchema,
  account_holder: nullableTextSchema,
  account_holder_address: nullableTextSchema,
  guardian_name: nullableTextSchema,
  guardian_email: nullableTextSchema,
  guardian_phone: nullableTextSchema,
  guardian_consent: z.boolean(),
  notes: nullableTextSchema
});

function normalizeIban(value: string | null) {
  return value?.replace(/\s+/g, "").toUpperCase() ?? null;
}

function isAlreadyTransferred(application: {
  status: string | null;
  transferred_at: string | null;
  ebusy_match_status: string | null;
}) {
  return (
    application.status === "transferred_to_ebusy" ||
    Boolean(application.transferred_at) ||
    application.ebusy_match_status === "person_created" ||
    application.ebusy_match_status === "created_in_ebusy"
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("applications.write", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Antrags-ID fehlt." }, { status: 400 });
    }

    const parsed = updateApplicationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Die uebermittelten Antragsdaten sind unvollstaendig oder ungueltig.",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: existingApplication, error: lookupError } = await supabase
      .from("applications")
      .select("status, transferred_at, ebusy_match_status")
      .eq("id", id)
      .single();

    if (lookupError) {
      return NextResponse.json({ message: lookupError.message }, { status: 500 });
    }

    if (!existingApplication) {
      return NextResponse.json({ message: "Antrag wurde nicht gefunden." }, { status: 404 });
    }

    if (isAlreadyTransferred(existingApplication)) {
      return NextResponse.json(
        {
          message:
            "Bereits nach eBuSy uebertragene Antraege koennen hier nicht mehr veraendert werden."
        },
        { status: 409 }
      );
    }

    const input = parsed.data;
    const normalizedFamilyMembers = input.family_members.map((member) => ({
      relation: member.relation ?? "family_member",
      salutation: member.salutation ?? "",
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      birthDate: member.birthDate ?? "",
      email: member.email ?? "",
      mobile: member.mobile ?? "",
      street: member.street ?? "",
      postalCode: member.postalCode ?? "",
      city: member.city ?? ""
    }));

    const now = new Date().toISOString();
    const updatePayload = {
      salutation: input.salutation,
      first_name: input.first_name,
      last_name: input.last_name,
      birth_date: input.birth_date,
      email: input.email,
      phone: input.phone,
      mobile: input.mobile,
      street: input.street,
      postal_code: input.postal_code,
      city: input.city,
      membership_kind: input.membership_kind,
      student_status_until: input.student_status_until,
      family_members: normalizedFamilyMembers,
      accepts_statutes: input.accepts_statutes,
      accepts_privacy: input.accepts_privacy,
      accepts_photo_video: input.accepts_photo_video,
      accepts_whatsapp: input.accepts_whatsapp,
      accepts_sepa: input.accepts_sepa,
      iban: normalizeIban(input.iban),
      account_holder: input.account_holder,
      account_holder_address: input.account_holder_address,
      guardian_name: input.guardian_name,
      guardian_email: input.guardian_email,
      guardian_phone: input.guardian_phone,
      guardian_consent: input.guardian_consent,
      notes: input.notes,
      status: "submitted",
      ebusy_match_status: "pending",
      ebusy_person_id: null,
      ebusy_match_payload: {
        status: "pending",
        source: "manual_review",
        message:
          "Antrag wurde intern bearbeitet. Bitte den eBuSy-Abgleich vor der Uebernahme erneut starten.",
        candidates: []
      },
      updated_at: now
    };

    const { data: updatedApplication, error: updateError } = await supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    await writeInternalAuditLog({
      actor,
      action: "application.update",
      entityType: "application",
      entityId: id,
      details: {
        changedFields: Object.keys(updatePayload)
      }
    });

    return NextResponse.json({
      message: "Antrag gespeichert. Bitte den eBuSy-Abgleich erneut starten.",
      application: updatedApplication
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Antrag konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("applications.delete", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Antrags-ID fehlt." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("applications").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    await writeInternalAuditLog({
      actor,
      action: "application.delete",
      entityType: "application",
      entityId: id
    });

    return NextResponse.json({ message: "Antrag geloescht." });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Antrag konnte nicht geloescht werden."
      },
      { status: 500 }
    );
  }
}
