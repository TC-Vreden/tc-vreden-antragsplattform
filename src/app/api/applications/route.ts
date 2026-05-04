import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { matchApplicationWithEbusy } from "@/lib/verwaltung";

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);

  if (!iban) {
    return true;
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return false;
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const numeric = rearranged.replace(/[A-Z]/g, (character) =>
    String(character.charCodeAt(0) - 55)
  );

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
}

const familyMemberSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  email: z.string().trim().optional()
});

const applicationSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
    if (!value.membershipKind) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipKind"],
        message: "Art der Mitgliedschaft fehlt."
      });
    }

    if (!value.mobile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mobile"],
        message: "Die Mobilnummer fehlt."
      });
    }

    if (!value.street) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["street"],
        message: "Die Strasse fehlt."
      });
    }

    if (!value.postalCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postalCode"],
        message: "Die PLZ fehlt."
      });
    }

    if (!value.city) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "Der Ort fehlt."
      });
    }

    if (!value.acceptsStatutes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptsStatutes"],
        message: "Satzung und Vereinsregeln muessen bestaetigt werden."
      });
    }

    if (!value.acceptsPrivacy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptsPrivacy"],
        message: "Die Datenschutzhinweise muessen bestaetigt werden."
      });
    }

    if (!value.acceptsSepa) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptsSepa"],
        message: "Das SEPA-Lastschriftverfahren muss bestaetigt werden."
      });
    }

    if (value.acceptsSepa && !value.iban) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["iban"],
        message: "Die IBAN fehlt."
      });
    }

    if (value.iban && !isValidIban(value.iban)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["iban"],
        message: "Die IBAN ist formal ungueltig."
      });
    }

    if (value.acceptsSepa && !value.accountHolder) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountHolder"],
        message: "Der Kontoinhaber fehlt."
      });
    }
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
  const normalizedIban = normalizeIban(input.iban ?? "");
  const derivedAccountHolderAddress =
    input.accountHolderAddress ||
    [input.street, input.postalCode, input.city].filter(Boolean).join(", ");
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
      iban: normalizedIban || null,
      account_holder: input.accountHolder || null,
      account_holder_address: derivedAccountHolderAddress || null,
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

  const matchSummary = await matchApplicationWithEbusy(data.id);

  return NextResponse.json({
    message: "Antrag gespeichert.",
    application: data,
    ebusyMatch: matchSummary
  });
}
