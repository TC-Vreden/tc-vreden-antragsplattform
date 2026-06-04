import { unstable_noStore as noStore } from "next/cache";

import { clubContact, confirmationMailPreview } from "@/lib/confirmation-document";
import {
  getMailEnv,
  isTruthyMailValue,
  type ConfiguredMailTransportSettings
} from "@/lib/mail";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export type MailProviderSetting = "auto" | "smtp" | "resend";
export type SmtpSecureSetting = "auto" | "true" | "false";

export type ApplicationMailSettings = {
  notificationEnabled: boolean;
  confirmationEnabled: boolean;
  provider: MailProviderSetting;
  from: string;
  replyTo: string;
  clubRecipient: string;
  confirmationBcc: string;
  testRecipient: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: SmtpSecureSetting;
  smtpUser: string;
  notificationSubject: string;
  notificationIntro: string[];
  notificationButtonLabel: string;
  notificationFooter: string[];
  confirmationSubject: string;
  confirmationIntro: string[];
  confirmationAttachmentNote: string[];
  confirmationPdfNote: string[];
  confirmationRevocationNote: string[];
};

export type MailTemplateContext = Record<string, string | number | boolean | null | undefined>;

const settingsId = "default";

function envBoolean(name: string, fallback = false) {
  const value = getMailEnv(name);
  return value === undefined ? fallback : isTruthyMailValue(value);
}

function envProvider(): MailProviderSetting {
  const provider = getMailEnv("MAIL_PROVIDER")?.toLowerCase();
  return provider === "smtp" || provider === "resend" ? provider : "auto";
}

function envSmtpSecure(): SmtpSecureSetting {
  const value = getMailEnv("SMTP_SECURE")?.toLowerCase();

  if (["1", "true", "yes", "ja"].includes(value ?? "")) {
    return "true";
  }

  if (["0", "false", "no", "nein"].includes(value ?? "")) {
    return "false";
  }

  return "auto";
}

function defaultFromAddress() {
  return `${clubContact.name} <${clubContact.email}>`;
}

export const defaultApplicationMailSettings: ApplicationMailSettings = {
  notificationEnabled: envBoolean("APPLICATION_NOTIFICATION_EMAIL_ENABLED"),
  confirmationEnabled: envBoolean(
    "APPLICATION_CONFIRMATION_EMAIL_ENABLED",
    envBoolean("APPLICATION_NOTIFICATION_EMAIL_ENABLED")
  ),
  provider: envProvider(),
  from: getMailEnv("MAIL_FROM") ?? defaultFromAddress(),
  replyTo: getMailEnv("MAIL_REPLY_TO") ?? clubContact.email,
  clubRecipient: getMailEnv("MAIL_TO_CLUB") ?? clubContact.email,
  confirmationBcc:
    getMailEnv("MAIL_CONFIRMATION_BCC") ?? getMailEnv("MAIL_TO_CLUB") ?? clubContact.email,
  testRecipient:
    getMailEnv("MAIL_TEST_RECIPIENT") ?? getMailEnv("MAIL_TO_CLUB") ?? clubContact.email,
  smtpHost: getMailEnv("SMTP_HOST") ?? "",
  smtpPort: getMailEnv("SMTP_PORT") ?? "465",
  smtpSecure: envSmtpSecure(),
  smtpUser: getMailEnv("SMTP_USER") ?? "",
  notificationSubject: "Neuer Mitgliedsantrag: {name}",
  notificationIntro: [
    "Im Verwaltungsportal liegt ein neuer Mitgliedsantrag zur Prüfung bereit.",
    "Bitte prüfe die Daten und führe anschließend die Übernahme in der Verwaltung aus."
  ],
  notificationButtonLabel: "Zum Verwaltungsportal",
  notificationFooter: [
    "Dies ist eine automatische Benachrichtigung der digitalen Mitgliedsantragsplattform."
  ],
  confirmationSubject: confirmationMailPreview.subject,
  confirmationIntro: [confirmationMailPreview.intro],
  confirmationAttachmentNote: [confirmationMailPreview.attachmentNote],
  confirmationPdfNote: [
    "Die vollständigen eingereichten Daten, Einwilligungen und rechtlichen Hinweise findest du im PDF-Anhang."
  ],
  confirmationRevocationNote: [confirmationMailPreview.revocationNote]
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

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanProvider(value: unknown): MailProviderSetting {
  return value === "smtp" || value === "resend" || value === "auto"
    ? value
    : defaultApplicationMailSettings.provider;
}

function cleanSmtpSecure(value: unknown): SmtpSecureSetting {
  return value === "true" || value === "false" || value === "auto"
    ? value
    : defaultApplicationMailSettings.smtpSecure;
}

export function normalizeApplicationMailSettings(value: unknown): ApplicationMailSettings {
  const settings = isRecord(value) ? value : {};

  return {
    notificationEnabled: cleanBoolean(
      settings.notificationEnabled,
      defaultApplicationMailSettings.notificationEnabled
    ),
    confirmationEnabled: cleanBoolean(
      settings.confirmationEnabled,
      defaultApplicationMailSettings.confirmationEnabled
    ),
    provider: cleanProvider(settings.provider),
    from: cleanString(settings.from, defaultApplicationMailSettings.from),
    replyTo: cleanString(settings.replyTo, defaultApplicationMailSettings.replyTo),
    clubRecipient: cleanString(settings.clubRecipient, defaultApplicationMailSettings.clubRecipient),
    confirmationBcc: cleanString(
      settings.confirmationBcc,
      defaultApplicationMailSettings.confirmationBcc
    ),
    testRecipient: cleanString(settings.testRecipient, defaultApplicationMailSettings.testRecipient),
    smtpHost: cleanString(settings.smtpHost, defaultApplicationMailSettings.smtpHost),
    smtpPort: cleanString(settings.smtpPort, defaultApplicationMailSettings.smtpPort),
    smtpSecure: cleanSmtpSecure(settings.smtpSecure),
    smtpUser: cleanString(settings.smtpUser, defaultApplicationMailSettings.smtpUser),
    notificationSubject: cleanString(
      settings.notificationSubject,
      defaultApplicationMailSettings.notificationSubject
    ),
    notificationIntro: cleanStringArray(
      settings.notificationIntro,
      defaultApplicationMailSettings.notificationIntro
    ),
    notificationButtonLabel: cleanString(
      settings.notificationButtonLabel,
      defaultApplicationMailSettings.notificationButtonLabel
    ),
    notificationFooter: cleanStringArray(
      settings.notificationFooter,
      defaultApplicationMailSettings.notificationFooter
    ),
    confirmationSubject: cleanString(
      settings.confirmationSubject,
      defaultApplicationMailSettings.confirmationSubject
    ),
    confirmationIntro: cleanStringArray(
      settings.confirmationIntro,
      defaultApplicationMailSettings.confirmationIntro
    ),
    confirmationAttachmentNote: cleanStringArray(
      settings.confirmationAttachmentNote,
      defaultApplicationMailSettings.confirmationAttachmentNote
    ),
    confirmationPdfNote: cleanStringArray(
      settings.confirmationPdfNote,
      defaultApplicationMailSettings.confirmationPdfNote
    ),
    confirmationRevocationNote: cleanStringArray(
      settings.confirmationRevocationNote,
      defaultApplicationMailSettings.confirmationRevocationNote
    )
  };
}

export async function getApplicationMailSettings() {
  noStore();

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("application_mail_settings")
      .select("settings")
      .eq("id", settingsId)
      .maybeSingle();

    if (error) {
      return defaultApplicationMailSettings;
    }

    return normalizeApplicationMailSettings(data?.settings);
  } catch {
    return defaultApplicationMailSettings;
  }
}

export async function saveApplicationMailSettings(settings: ApplicationMailSettings) {
  const normalized = normalizeApplicationMailSettings(settings);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("application_mail_settings").upsert({
    id: settingsId,
    settings: normalized,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalized;
}

export function getMailTransportSettings(
  settings: ApplicationMailSettings
): ConfiguredMailTransportSettings {
  const smtpPort = Number.parseInt(settings.smtpPort, 10);

  return {
    provider: settings.provider,
    smtpHost: settings.smtpHost || undefined,
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : undefined,
    smtpSecure:
      settings.smtpSecure === "auto" ? undefined : settings.smtpSecure === "true",
    smtpUser: settings.smtpUser || undefined
  };
}

export function getMailSecretStatus() {
  return {
    smtpPasswordConfigured: Boolean(getMailEnv("SMTP_PASSWORD")),
    resendApiKeyConfigured: Boolean(getMailEnv("RESEND_API_KEY"))
  };
}

export function renderMailTemplate(value: string, context: MailTemplateContext) {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const replacement = context[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function renderMailTemplateLines(lines: string[], context: MailTemplateContext) {
  return lines.map((line) => renderMailTemplate(line, context));
}
