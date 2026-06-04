import {
  getApplicationFormContent,
  getMembershipLabelFromContent,
  type ApplicationFormContent
} from "@/lib/application-content";
import type { ApplicationAdditionalMember } from "@/lib/application-types";
import nodemailer from "nodemailer";

type NotificationStatus = "sent" | "skipped" | "failed";

export type ApplicationNotificationResult = {
  status: NotificationStatus;
  reason?: string;
  messageId?: string;
};

export type ApplicationReceivedNotificationInput = {
  applicationId: string;
  createdAt: string;
  salutation?: string | null;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  membershipKind?: string | null;
  familyMembers?: ApplicationAdditionalMember[];
  acceptsSepa: boolean;
  acceptsPhotoVideo: boolean;
  acceptsWhatsapp: boolean;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

type MailProvider = "resend" | "smtp";

type MailPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

const germanTimeZone = "Europe/Berlin";

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getAdminPortalUrl() {
  const explicitUrl = getEnv("ADMIN_PORTAL_URL");

  if (explicitUrl) {
    return explicitUrl;
  }

  const siteUrl = getEnv("NEXT_PUBLIC_SITE_URL");
  if (siteUrl) {
    return `${siteUrl.replace(/\/$/, "")}/verwaltung`;
  }

  const vercelUrl = getEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}/verwaltung`;
  }

  return undefined;
}

function isEnabled() {
  return getEnv("APPLICATION_NOTIFICATION_EMAIL_ENABLED") === "true";
}

function getMailProvider(): MailProvider {
  const provider = getEnv("MAIL_PROVIDER")?.toLowerCase();

  if (provider === "smtp" || provider === "resend") {
    return provider;
  }

  return getEnv("SMTP_HOST") ? "smtp" : "resend";
}

function getSmtpPort() {
  const rawPort = getEnv("SMTP_PORT");

  if (!rawPort) {
    return 465;
  }

  const port = Number.parseInt(rawPort, 10);

  return Number.isFinite(port) ? port : 465;
}

function getSmtpSecure(port: number) {
  const rawSecure = getEnv("SMTP_SECURE")?.toLowerCase();

  if (!rawSecure) {
    return port === 465;
  }

  return ["1", "true", "yes", "ja"].includes(rawSecure);
}

function escapeHtml(value: string | number | boolean | null | undefined) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    timeZone: germanTimeZone
  }).format(date);
}

function yesNo(value: boolean) {
  return value ? "Ja" : "Nein";
}

function buildAddress(input: ApplicationReceivedNotificationInput) {
  return [input.street, [input.postalCode, input.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function buildAdditionalMembersSummary(familyMembers: ApplicationAdditionalMember[] = []) {
  if (familyMembers.length === 0) {
    return "Keine Zusatzpersonen erfasst";
  }

  return familyMembers
    .map((member, index) => {
      const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
      const birthDate = member.birthDate ? `, geb. ${formatDate(member.birthDate)}` : "";
      const relation = member.relation ? ` (${member.relation})` : "";
      const legalRepresentative = member.legalRepresentative
        ? `, gesetzliche Vertreter: ${member.legalRepresentative}`
        : "";

      return `${index + 1}. ${name || "Zusatzperson"}${relation}${birthDate}${legalRepresentative}`;
    })
    .join("\n");
}

function buildHtml(
  input: ApplicationReceivedNotificationInput,
  adminPortalUrl: string | undefined,
  formContent: ApplicationFormContent
) {
  const membershipLabel = getMembershipLabelFromContent(input.membershipKind, formContent);
  const applicantName = `${input.firstName} ${input.lastName}`.trim();
  const address = buildAddress(input);
  const additionalMembers = buildAdditionalMembersSummary(input.familyMembers);
  const reviewLink = adminPortalUrl
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(adminPortalUrl)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Zum Verwaltungsportal</a></p>`
    : "<p style=\"margin:24px 0;\"><strong>Verwaltungsportal:</strong> Bitte die interne Verwaltungsadresse öffnen.</p>";

  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#f7f3ea;font-family:Arial,sans-serif;color:#1d1d1b;">
    <main style="max-width:680px;margin:0 auto;padding:28px 18px;">
      <section style="background:#ffffff;border:1px solid #e1d6be;border-radius:8px;overflow:hidden;">
        <div style="background:#ffde00;padding:18px 22px;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">TennisClub Vreden e.V.</p>
          <h1 style="margin:6px 0 0;font-size:24px;line-height:1.25;">Neuer Mitgliedsantrag eingegangen</h1>
        </div>
        <div style="padding:22px;">
          <p style="margin-top:0;">Im Verwaltungsportal liegt ein neuer Antrag zur Prüfung bereit. Bitte die Daten prüfen und anschließend bei eBuSy übernehmen.</p>
          ${reviewLink}
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tbody>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Vorgang</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(input.applicationId)}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Eingang</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(formatDate(input.createdAt))}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Hauptperson</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(applicantName)}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Geburtsdatum</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(formatDate(input.birthDate))}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Mitgliedschaft</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(membershipLabel)}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Kontakt</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(input.email)}<br>${escapeHtml(input.mobile || input.phone || "-")}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Adresse</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(address || "-")}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Zusatzpersonen</td><td style="padding:8px 0;border-top:1px solid #eee;white-space:pre-line;">${escapeHtml(additionalMembers)}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">SEPA bestätigt</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsSepa))}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">Foto/Video</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsPhotoVideo))}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;">WhatsApp</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsWhatsapp))}</td></tr>
            </tbody>
          </table>
          <p style="margin:22px 0 0;color:#555;font-size:13px;">Dies ist eine automatische Benachrichtigung der digitalen Mitgliedsantragsplattform.</p>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function buildText(
  input: ApplicationReceivedNotificationInput,
  adminPortalUrl: string | undefined,
  formContent: ApplicationFormContent
) {
  const membershipLabel = getMembershipLabelFromContent(input.membershipKind, formContent);

  return [
    "Neuer Mitgliedsantrag eingegangen",
    "",
    "Im Verwaltungsportal liegt ein neuer Antrag zur Prüfung bereit.",
    "",
    `Vorgang: ${input.applicationId}`,
    `Eingang: ${formatDate(input.createdAt)}`,
    `Hauptperson: ${input.firstName} ${input.lastName}`,
    `Geburtsdatum: ${formatDate(input.birthDate)}`,
    `Mitgliedschaft: ${membershipLabel}`,
    `Kontakt: ${input.email} / ${input.mobile || input.phone || "-"}`,
    `Adresse: ${buildAddress(input) || "-"}`,
    "Zusatzpersonen:",
    buildAdditionalMembersSummary(input.familyMembers),
    `SEPA bestätigt: ${yesNo(input.acceptsSepa)}`,
    `Foto/Video: ${yesNo(input.acceptsPhotoVideo)}`,
    `WhatsApp: ${yesNo(input.acceptsWhatsapp)}`,
    "",
    adminPortalUrl ? `Verwaltung: ${adminPortalUrl}` : "Verwaltung: interne Verwaltungsadresse öffnen"
  ].join("\n");
}

async function sendWithResend(payload: MailPayload): Promise<ApplicationNotificationResult> {
  const apiKey = getEnv("RESEND_API_KEY");

  if (!apiKey) {
    return {
      status: "skipped",
      reason: "RESEND_API_KEY fehlt."
    };
  }

  const responsePayload = {
    from: payload.from,
    to: [payload.to],
    reply_to: payload.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responsePayload)
    });

    const data = (await response.json().catch(() => ({}))) as ResendSendResponse;

    if (!response.ok) {
      return {
        status: "failed",
        reason: data.message || data.name || `Resend HTTP ${response.status}`
      };
    }

    return {
      status: "sent",
      messageId: data.id
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter Mailfehler"
    };
  }
}

async function sendWithSmtp(payload: MailPayload): Promise<ApplicationNotificationResult> {
  const host = getEnv("SMTP_HOST");
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASSWORD");
  const port = getSmtpPort();

  if (!host || !user || !pass) {
    return {
      status: "skipped",
      reason: "SMTP_HOST, SMTP_USER oder SMTP_PASSWORD fehlt."
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: getSmtpSecure(port),
    auth: {
      user,
      pass
    }
  });

  try {
    const info = await transporter.sendMail({
      from: payload.from,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });

    return {
      status: "sent",
      messageId: info.messageId
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter SMTP-Mailfehler"
    };
  }
}

export async function sendApplicationReceivedNotification(
  input: ApplicationReceivedNotificationInput
): Promise<ApplicationNotificationResult> {
  if (!isEnabled()) {
    return {
      status: "skipped",
      reason: "APPLICATION_NOTIFICATION_EMAIL_ENABLED ist nicht true."
    };
  }

  const from = getEnv("MAIL_FROM");
  const to = getEnv("MAIL_TO_CLUB");

  if (!from || !to) {
    return {
      status: "skipped",
      reason: "MAIL_FROM oder MAIL_TO_CLUB fehlt."
    };
  }

  const adminPortalUrl = getAdminPortalUrl();
  const formContent = await getApplicationFormContent();
  const replyTo = getEnv("MAIL_REPLY_TO");
  const subject = `Neuer Mitgliedsantrag: ${input.firstName} ${input.lastName}`.trim();
  const provider = getMailProvider();

  const payload = {
    from,
    to,
    replyTo,
    subject,
    html: buildHtml(input, adminPortalUrl, formContent),
    text: buildText(input, adminPortalUrl, formContent)
  };

  if (provider === "smtp") {
    return sendWithSmtp(payload);
  }

  return sendWithResend(payload);
}
