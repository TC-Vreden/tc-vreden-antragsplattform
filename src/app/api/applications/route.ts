import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const familyMemberSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  email: z.string().trim().optional()
});

const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname fehlt."),
  lastName: z.string().trim().min(1, "Nachname fehlt."),
  birthDate: z.string().trim().optional(),
  email: z.string().trim().email("Bitte eine gueltige E-Mail angeben."),
  phone: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  street: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  membershipKind: z.string().trim().optional(),
  familyMembers: z.array(familyMemberSchema).optional(),
  acceptsStatutes: z.boolean(),
  acceptsPrivacy: z.boolean(),
  acceptsPhotoVideo: z.boolean(),
  acceptsWhatsapp: z.boolean(),
  acceptsSepa: z.boolean(),
  iban: z.string().trim().optional(),
  accountHolder: z.string().trim().optional(),
  accountHolderAddress: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Die Formulardaten sind unvollstaendig oder ungueltig.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  let supabase;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message: "Der Antrag konnte serverseitig noch nicht gespeichert werden.",
        details:
          error instanceof Error
            ? error.message
            : "SUPABASE_SERVICE_ROLE_KEY fehlt."
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      birth_date: input.birthDate || null,
      email: input.email,
      phone: input.phone || null,
      mobile: input.mobile || null,
      street: input.street || null,
      postal_code: input.postalCode || null,
      city: input.city || null,
      membership_kind: input.membershipKind || null,
      family_members: input.familyMembers ?? [],
      accepts_statutes: input.acceptsStatutes,
      accepts_privacy: input.acceptsPrivacy,
      accepts_photo_video: input.acceptsPhotoVideo,
      accepts_whatsapp: input.acceptsWhatsapp,
      accepts_sepa: input.acceptsSepa,
      iban: input.iban || null,
      account_holder: input.accountHolder || null,
      account_holder_address: input.accountHolderAddress || null,
      notes: input.notes || null
    })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        message: "Der Antrag konnte nicht gespeichert werden.",
        details: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Antrag gespeichert.",
    application: data
  });
}
