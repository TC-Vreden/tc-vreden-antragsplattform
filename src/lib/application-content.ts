import { unstable_noStore as noStore } from "next/cache";

import { membershipOptions, type MembershipOption } from "@/lib/application-options";
import {
  CONTRIBUTION_NOTES,
  CONTRIBUTION_ROWS,
  CONTRIBUTIONS_URL,
  JUNIOR_TRAINING_NOTES,
  PLACE_CARE_RULES_URL,
  STATUTES_CONFIRMATION_TEXT,
  STATUTES_URL,
  YOUTH_RULES_URL
} from "@/lib/application-legal-content";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export type ContributionRow = {
  membership: string;
  status: string;
  fee: string;
};

export type ApplicationDocumentLink = {
  id: "statutes" | "contributions" | "placeCareRules" | "youthRules";
  label: string;
  url: string;
};

export type ApplicationFormContent = {
  membershipOptions: MembershipOption[];
  contributionRows: ContributionRow[];
  contributionNotes: string[];
  juniorTrainingNotes: string[];
  statutesConfirmationText: string[];
  documentLinks: ApplicationDocumentLink[];
};

const settingsId = "default";

export const defaultApplicationDocumentLinks: ApplicationDocumentLink[] = [
  { id: "statutes", label: "Satzung als PDF öffnen", url: STATUTES_URL },
  { id: "contributions", label: "Beitragsübersicht als PDF öffnen", url: CONTRIBUTIONS_URL },
  {
    id: "placeCareRules",
    label: "Platzpflegeordnung als PDF öffnen",
    url: PLACE_CARE_RULES_URL
  },
  { id: "youthRules", label: "Jugendordnung als PDF öffnen", url: YOUTH_RULES_URL }
];

export const defaultApplicationFormContent: ApplicationFormContent = {
  membershipOptions,
  contributionRows: CONTRIBUTION_ROWS,
  contributionNotes: CONTRIBUTION_NOTES,
  juniorTrainingNotes: JUNIOR_TRAINING_NOTES,
  statutesConfirmationText: STATUTES_CONFIRMATION_TEXT,
  documentLinks: defaultApplicationDocumentLinks
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const rows = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return rows.length ? rows : fallback;
}

function normalizeMembershipOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultApplicationFormContent.membershipOptions;
  }

  const byValue = new Map(
    value.filter(isRecord).map((item) => [
      cleanString(item.value),
      cleanString(item.label)
    ])
  );

  return defaultApplicationFormContent.membershipOptions.map((option) => ({
    value: option.value,
    label: byValue.get(option.value) || option.label
  }));
}

function normalizeContributionRows(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultApplicationFormContent.contributionRows;
  }

  const rows = value.filter(isRecord).map((item) => ({
    membership: cleanString(item.membership),
    status: cleanString(item.status),
    fee: cleanString(item.fee)
  }));

  return rows.filter((row) => row.membership || row.status || row.fee).length
    ? rows
    : defaultApplicationFormContent.contributionRows;
}

function normalizeDocumentLinks(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultApplicationFormContent.documentLinks;
  }

  const byId = new Map(
    value.filter(isRecord).map((item) => [
      cleanString(item.id),
      {
        label: cleanString(item.label),
        url: cleanString(item.url)
      }
    ])
  );

  return defaultApplicationFormContent.documentLinks.map((link) => {
    const override = byId.get(link.id);

    return {
      id: link.id,
      label: override?.label || link.label,
      url: override?.url || link.url
    };
  });
}

export function normalizeApplicationFormContent(value: unknown): ApplicationFormContent {
  const content = isRecord(value) ? value : {};

  return {
    membershipOptions: normalizeMembershipOptions(content.membershipOptions),
    contributionRows: normalizeContributionRows(content.contributionRows),
    contributionNotes: cleanStringArray(
      content.contributionNotes,
      defaultApplicationFormContent.contributionNotes
    ),
    juniorTrainingNotes: cleanStringArray(
      content.juniorTrainingNotes,
      defaultApplicationFormContent.juniorTrainingNotes
    ),
    statutesConfirmationText: cleanStringArray(
      content.statutesConfirmationText,
      defaultApplicationFormContent.statutesConfirmationText
    ),
    documentLinks: normalizeDocumentLinks(content.documentLinks)
  };
}

export function getMembershipLabelFromContent(
  value: string | null | undefined,
  content: ApplicationFormContent
) {
  return content.membershipOptions.find((option) => option.value === value)?.label ?? value ?? "-";
}

export async function getApplicationFormContent() {
  noStore();

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("application_form_content")
      .select("content")
      .eq("id", settingsId)
      .maybeSingle();

    if (error) {
      return defaultApplicationFormContent;
    }

    return normalizeApplicationFormContent(data?.content);
  } catch {
    return defaultApplicationFormContent;
  }
}

export async function saveApplicationFormContent(content: ApplicationFormContent) {
  const normalized = normalizeApplicationFormContent(content);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("application_form_content").upsert({
    id: settingsId,
    content: normalized,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalized;
}
