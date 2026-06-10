import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { matchApplicationWithEbusy } from "@/lib/verwaltung";
import { sendApplicationReceivedNotification } from "@/lib/application-notification-email";
import { isMembershipExtensionOption } from "@/lib/application-options";

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
  relation: z.enum(["partner", "child", "family_member"]).optional(),
  salutation: z.enum(["FEMALE", "MALE"]).or(z.literal("")).optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  email: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  street: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  legalRepresentative: z.string().trim().optional()
});

function getAdditionalMemberRequirement(
  membershipKind: string | undefined,
  requestType: "new_membership" | "membership_extension"
) {
  if (requestType === "membership_extension") {
    if (membershipKind === "partner_active" || membershipKind === "partner_passive") {
      return { minMembers: 1, maxMembers: 1 };
    }

    if (membershipKind === "adult_child" || membershipKind === "family") {
      return { minMembers: 1, maxMembers: Number.POSITIVE_INFINITY };
    }

    return null;
  }

  if (membershipKind === "partner_active" || membershipKind === "partner_passive") {
    return { minMembers: 1, maxMembers: 1 };
  }

  if (membershipKind === "adult_child") {
    return { minMembers: 1, maxMembers: 1 };
  }

  if (membershipKind === "family") {
    return { minMembers: 1, maxMembers: Number.POSITIVE_INFINITY };
  }

  return null;
}

function isMinorMainApplicantMembership(membershipKind: string | undefined) {
  return (
    membershipKind === "child" ||
    membershipKind === "youth_active" ||
    membershipKind === "youth_passive"
  );
}

function isAdultAdditionalMember(member: z.infer<typeof familyMemberSchema>) {
  return member.relation === "partner" || member.relation === "family_member";
}

function isAllowedExtensionMemberRelation(
  membershipKind: string | undefined,
  relation: string | undefined
) {
  if (membershipKind === "adult_child") {
    return relation === "child";
  }

  if (membershipKind === "partner_active" || membershipKind === "partner_passive") {
    return relation === "partner";
  }

  if (membershipKind === "family") {
    return relation === "child" || relation === "family_member";
  }

  return false;
}

function isMinorByBirthDate(value: string | undefined) {
  if (!value) {
    return false;
  }

  const birthDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  const eighteenthBirthday = new Date(birthDate);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);

  return eighteenthBirthday > today;
}

function needsAdditionalMemberLegalRepresentative(member: z.infer<typeof familyMemberSchema>) {
  return member.relation === "child" || isMinorByBirthDate(member.birthDate);
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("column"));
}

function omitModernApplicationColumns<T extends Record<string, unknown>>(payload: T) {
  const clone = { ...payload };

  delete clone.source;
  delete clone.request_type;

  return clone;
}

const applicationSchema = z
  .object({
    requestType: z.enum(["new_membership", "membership_extension"]).optional(),
    salutation: z.enum(["FEMALE", "MALE"]).or(z.literal("")).optional(),
    firstName: z.string().trim().min(1, "Vorname fehlt."),
    lastName: z.string().trim().min(1, "Nachname fehlt."),
    birthDate: z.string().trim().optional(),
    email: z.string().trim().email("Bitte eine gültige E-Mail angeben."),
    phone: z.string().trim().optional(),
    mobile: z.string().trim().optional(),
    street: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    city: z.string().trim().optional(),
    membershipKind: z.string().trim().optional(),
    studentStatusUntil: z.string().trim().optional(),
    familyMembers: z.array(familyMemberSchema).optional(),
    acceptsStatutes: z.boolean(),
    acceptsPrivacy: z.boolean(),
    acceptsPhotoVideo: z.boolean(),
    acceptsWhatsapp: z.boolean(),
    acceptsSepa: z.boolean(),
    isMinorApplicant: z.boolean().optional(),
    guardianName: z.string().trim().optional(),
    guardianEmail: z.string().trim().optional(),
    guardianPhone: z.string().trim().optional(),
    guardianConsent: z.boolean().optional(),
    iban: z.string().trim().optional(),
    accountHolder: z.string().trim().optional(),
    accountHolderAddress: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    const requestType = value.requestType ?? "new_membership";

    if (!value.membershipKind) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipKind"],
        message: "Art der Mitgliedschaft fehlt."
      });
    }

    if (requestType === "membership_extension" && !isMembershipExtensionOption(value.membershipKind)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipKind"],
        message: "Bitte eine gültige Erweiterungsart auswählen."
      });
    }

    if (!value.birthDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: "Das Geburtsdatum fehlt."
      });
    }

    if (!value.salutation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salutation"],
        message: "Die Anrede fehlt."
      });
    }

    if (!value.mobile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mobile"],
        message: "Die Mobilnummer fehlt."
      });
    }

    if (!value.phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Die Festnetznummer fehlt."
      });
    }

    if (!value.street) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["street"],
        message: "Die Straße fehlt."
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
        message: "Satzung, Beitragsordnung und Platzpflegeordnung müssen bestätigt werden."
      });
    }

    if (!value.acceptsPrivacy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptsPrivacy"],
        message: "Die Datenschutzerklärung nach DSGVO muss bestätigt werden."
      });
    }

    if (requestType === "new_membership" && !value.acceptsSepa) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptsSepa"],
        message: "Das SEPA-Lastschriftverfahren muss bestätigt werden."
      });
    }

    if (requestType === "new_membership" && value.acceptsSepa && !value.iban) {
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
        message: "Die IBAN ist formal ungültig."
      });
    }

    if (requestType === "new_membership" && value.acceptsSepa && !value.accountHolder) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountHolder"],
        message: "Der Kontoinhaber fehlt."
      });
    }

    const members = value.familyMembers ?? [];
    const requirement = getAdditionalMemberRequirement(value.membershipKind, requestType);
    const mainApplicantIsMinor =
      requestType === "new_membership" && isMinorMainApplicantMembership(value.membershipKind);

    if (mainApplicantIsMinor && !value.guardianName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianName"],
        message: "Der gesetzliche Vertreter fehlt."
      });
    }

    if (mainApplicantIsMinor && !value.guardianConsent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianConsent"],
        message: "Die Zustimmung des gesetzlichen Vertreters fehlt."
      });
    }

    if (requirement && members.length < requirement.minMembers) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["familyMembers"],
        message: "Bitte die erforderliche Zusatzperson erfassen."
      });
    }

    if (requirement && members.length > requirement.maxMembers) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["familyMembers"],
        message: "Für diese Mitgliedschaft sind zu viele Zusatzpersonen erfasst."
      });
    }

    members.forEach((member, index) => {
      const hasAnyValue = Object.values(member).some((value) =>
        typeof value === "string" ? value.trim() : Boolean(value)
      );

      if (!hasAnyValue) {
        return;
      }

      if (!member.firstName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "firstName"],
          message: "Vorname der Zusatzperson fehlt."
        });
      }

      if (!member.salutation) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "salutation"],
          message: "Anrede der Zusatzperson fehlt."
        });
      }

      if (!member.lastName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "lastName"],
          message: "Nachname der Zusatzperson fehlt."
        });
      }

      if (!member.birthDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "birthDate"],
          message: "Geburtsdatum der Zusatzperson fehlt."
        });
      }

      if (needsAdditionalMemberLegalRepresentative(member) && !member.legalRepresentative) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "legalRepresentative"],
          message: "Gesetzliche Vertreter der minderjährigen Zusatzperson fehlen."
        });
      }

      if (
        requestType === "membership_extension" &&
        !isAllowedExtensionMemberRelation(value.membershipKind, member.relation)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["familyMembers", index, "relation"],
          message: "Die Rolle der Zusatzperson passt nicht zur gewählten Erweiterung."
        });
      }

      if (requestType === "membership_extension" && isAdultAdditionalMember(member)) {
        if (!member.email) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["familyMembers", index, "email"],
            message: "E-Mail der erwachsenen Zusatzperson fehlt."
          });
        }

        if (!member.mobile) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["familyMembers", index, "mobile"],
            message: "Mobilnummer der erwachsenen Zusatzperson fehlt."
          });
        }
      }

      if (requestType === "membership_extension") {
        ([
          ["street", "Straße"],
          ["postalCode", "PLZ"],
          ["city", "Ort"]
        ] as const).forEach(([field, label]) => {
          if (!member[field]) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["familyMembers", index, field],
              message: `${label} der Zusatzperson fehlt.`
            });
          }
        });
      }
    });
  });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Die Formulardaten sind unvollständig oder ungültig.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const requestType = input.requestType ?? "new_membership";
  const normalizedIban = normalizeIban(input.iban ?? "");
  const mainApplicantIsMinor =
    requestType === "new_membership" && isMinorMainApplicantMembership(input.membershipKind);
  const derivedAccountHolderAddress =
    input.accountHolderAddress ||
    [input.street, input.postalCode, input.city].filter(Boolean).join(", ");
  const minorNotes = mainApplicantIsMinor
    ? [
        "Minderjährigen-Zusatz Hauptperson:",
        input.guardianName ? `Gesetzlicher Vertreter: ${input.guardianName}` : undefined,
        input.guardianEmail
          ? `E-Mail des gesetzlichen Vertreters: ${input.guardianEmail}`
          : undefined,
        input.guardianPhone
          ? `Telefon des gesetzlichen Vertreters: ${input.guardianPhone}`
          : undefined,
        input.guardianConsent
          ? "Zustimmung des gesetzlichen Vertreters wurde digital bestätigt."
          : undefined
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const legacyNotes = [
    input.salutation ? `Anrede: ${input.salutation}` : undefined,
    input.notes,
    minorNotes
  ]
    .filter(Boolean)
    .join("\n\n");
  const familyMembers = (input.familyMembers ?? []).map((member) => ({
    relation: member.relation ?? "family_member",
    salutation: member.salutation ?? "",
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    birthDate: member.birthDate ?? "",
    email: member.email || (requestType === "membership_extension" ? input.email : input.email),
    mobile: member.mobile || (requestType === "membership_extension" ? "" : input.mobile || ""),
    street: member.street || input.street || "",
    postalCode: member.postalCode || input.postalCode || "",
    city: member.city || input.city || "",
    legalRepresentative: member.legalRepresentative || ""
  }));
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

  const baseInsertPayload = {
    source: "public_form",
    request_type: requestType,
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
    student_status_until: input.studentStatusUntil || null,
    family_members: familyMembers,
    accepts_statutes: input.acceptsStatutes,
    accepts_privacy: input.acceptsPrivacy,
    accepts_photo_video: input.acceptsPhotoVideo,
    accepts_whatsapp: input.acceptsWhatsapp,
    accepts_sepa: requestType === "new_membership" ? input.acceptsSepa : false,
    iban: requestType === "new_membership" ? normalizedIban || null : null,
    account_holder: requestType === "new_membership" ? input.accountHolder || null : null,
    account_holder_address:
      requestType === "new_membership" ? derivedAccountHolderAddress || null : null,
    notes: input.notes || null
  };
  const insertPayload = {
    ...baseInsertPayload,
    salutation: input.salutation || null,
    guardian_name: mainApplicantIsMinor ? input.guardianName || null : null,
    guardian_email: mainApplicantIsMinor ? input.guardianEmail || null : null,
    guardian_phone: mainApplicantIsMinor ? input.guardianPhone || null : null,
    guardian_consent: mainApplicantIsMinor ? Boolean(input.guardianConsent) : false
  };

  let { data, error } = await supabase
    .from("applications")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (error && isMissingColumnError(error)) {
    const retry = await supabase
      .from("applications")
      .insert({
        ...omitModernApplicationColumns(baseInsertPayload),
        notes: legacyNotes || null
      })
      .select("id, created_at")
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json(
      {
        message: "Der Antrag konnte nicht gespeichert werden.",
        details: error.message
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        message: "Der Antrag konnte nicht gespeichert werden.",
        details: "Supabase hat keinen gespeicherten Datensatz zurückgegeben."
      },
      { status: 500 }
    );
  }

  const matchSummary = await matchApplicationWithEbusy(data.id);
  const notificationResult = await sendApplicationReceivedNotification({
    applicationId: data.id,
    createdAt: data.created_at,
    requestType,
    salutation: input.salutation || null,
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate || null,
    email: input.email,
    phone: input.phone || null,
    mobile: input.mobile || null,
    street: input.street || null,
    postalCode: input.postalCode || null,
    city: input.city || null,
    membershipKind: input.membershipKind || null,
    familyMembers,
    acceptsSepa: requestType === "new_membership" ? input.acceptsSepa : false,
    acceptsPhotoVideo: input.acceptsPhotoVideo,
    acceptsWhatsapp: input.acceptsWhatsapp
  });

  if (notificationResult.status === "failed") {
    console.warn(
      `Antrag ${data.id}: interne Eingangsmail konnte nicht versendet werden: ${
        notificationResult.reason ?? "unbekannter Fehler"
      }`
    );
  }

  return NextResponse.json({
    message: "Antrag gespeichert.",
    application: data,
    ebusyMatch: matchSummary
  });
}
