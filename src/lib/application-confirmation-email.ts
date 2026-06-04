import {
  isReducedContributionMembership
} from "@/lib/application-options";
import {
  getApplicationFormContent,
  getMembershipLabelFromContent,
  type ApplicationFormContent
} from "@/lib/application-content";
import {
  getApplicationMailSettings,
  getMailTransportSettings,
  renderMailTemplate,
  renderMailTemplateLines,
  type ApplicationMailSettings,
  type MailTemplateContext
} from "@/lib/application-mail-settings";
import type {
  ApplicationMatchPayload,
  ApplicationRow
} from "@/lib/application-types";
import { clubContact } from "@/lib/confirmation-document";
import { buildApplicationConfirmationPdf } from "@/lib/application-confirmation-pdf";
import {
  sendConfiguredMail,
  type MailDeliveryResult
} from "@/lib/mail";

export type ApplicationConfirmationEmailResult = MailDeliveryResult;

type ApplicationConfirmationEmailInput = {
  application: ApplicationRow;
  transferredAt: string;
  matchPayload: ApplicationMatchPayload;
};

const germanTimeZone = "Europe/Berlin";
const brandLogoUrl = "https://antrag-tennisclub-vreden.vercel.app/brand/tc-vreden-logo.png";

function escapeHtml(value: string | number | boolean | null | undefined) {
  return String(value ?? "")
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

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (value.includes("T")) {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: germanTimeZone
    }).format(date);
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: germanTimeZone
  }).format(date);
}

function yesNo(value: boolean | null | undefined) {
  return value ? "Ja" : "Nein";
}

function mainPersonName(application: ApplicationRow) {
  return `${application.first_name} ${application.last_name}`.trim();
}

function buildContext(
  input: ApplicationConfirmationEmailInput,
  formContent: ApplicationFormContent
): MailTemplateContext {
  const { application, transferredAt } = input;
  const name = mainPersonName(application);

  return {
    name,
    vorname: application.first_name,
    nachname: application.last_name,
    email: application.email,
    mitgliedschaft: getMembershipLabelFromContent(application.membership_kind, formContent),
    referenznummer: application.id,
    bestaetigt_am: formatDate(transferredAt),
    club: clubContact.name
  };
}

function paragraphHtml(lines: string[], context: MailTemplateContext) {
  return renderMailTemplateLines(lines, context)
    .map((line) => `<p style="margin:0 0 14px;color:#1f1f1d;">${escapeHtml(line)}</p>`)
    .join("");
}

function detailRow(label: string, value: string | number | boolean | null | undefined) {
  return `
    <tr>
      <td style="width:190px;padding:7px 10px 7px 0;border-bottom:1px solid #eadfc7;color:#4d4636;font-weight:700;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:7px 0;border-bottom:1px solid #eadfc7;color:#1f1f1d;vertical-align:top;">
        ${escapeHtml(value ?? "-")}
      </td>
    </tr>`;
}

function buildHtml(
  input: ApplicationConfirmationEmailInput,
  formContent: ApplicationFormContent,
  settings: ApplicationMailSettings
) {
  const { application, transferredAt } = input;
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];
  const applicantName = mainPersonName(application);
  const context = buildContext(input, formContent);
  const reducedProofRow = isReducedContributionMembership(application.membership_kind)
    ? detailRow(
        "Nachweis Schüler:innen / Azubis / Student:innen gültig bis",
        formatDate(application.student_status_until)
      )
    : "";
  const additionalMemberSummary = additionalMembers.length
    ? `${additionalMembers.length} Zusatzperson(en) im Antrag erfasst.`
    : "Keine Zusatzpersonen erfasst.";

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:#1f1f1d;font-family:Arial,sans-serif;line-height:1.45;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:760px;border-collapse:collapse;border:1px solid #e3d8c0;background:#ffffff;">
            <tr>
              <td style="padding:18px 20px 14px;border-bottom:4px solid #ffd800;background:#ffffff;">
                <img src="${escapeHtml(brandLogoUrl)}" width="130" alt="${escapeHtml(clubContact.name)}" style="display:block;width:130px;max-width:130px;height:auto;border:0;margin:0 0 12px;" />
                <h1 style="margin:0;color:#1f1f1d;font-family:Arial,sans-serif;font-size:24px;line-height:1.2;font-weight:700;">Bestätigung deiner Mitgliedschaft</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px 20px;background:#ffffff;">
                <p style="margin:0 0 12px;color:#1f1f1d;">Hallo ${escapeHtml(applicantName)},</p>
                ${paragraphHtml(settings.confirmationIntro, context)}
                <p style="margin:0 0 18px;padding:10px 12px;border:1px solid #ffd800;background:#fffbea;color:#1f1f1d;">
                  ${renderMailTemplateLines(settings.confirmationAttachmentNote, context)
                    .map((line) => escapeHtml(line))
                    .join("<br />")}
                </p>

                <h2 style="margin:0 0 8px;color:#1f1f1d;font-family:Arial,sans-serif;font-size:18px;line-height:1.25;">Kurzüberblick</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 18px;">
                  <tbody>
                    ${detailRow("Name", applicantName)}
                    ${detailRow(
                      "Mitgliedschaft",
                      getMembershipLabelFromContent(application.membership_kind, formContent)
                    )}
                    ${reducedProofRow}
                    ${detailRow("Zusatzpersonen", additionalMemberSummary)}
                    ${detailRow("Bestätigt am", formatDate(transferredAt))}
                    ${detailRow("SEPA-Mandat", yesNo(application.accepts_sepa))}
                  </tbody>
                </table>

                ${paragraphHtml(settings.confirmationPdfNote, context)}
                ${paragraphHtml(settings.confirmationRevocationNote, context)}
                <p style="margin:0;color:#1f1f1d;">Viele Grüße<br />${escapeHtml(clubContact.name)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:13px 20px;border-top:1px solid #e3d8c0;background:#ffffff;color:#4d4636;font-size:13px;">
                ${escapeHtml(clubContact.name)} · ${escapeHtml(clubContact.address)} · ${escapeHtml(clubContact.email)} · ${escapeHtml(clubContact.website)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText(
  input: ApplicationConfirmationEmailInput,
  formContent: ApplicationFormContent,
  settings: ApplicationMailSettings
) {
  const { application, transferredAt } = input;
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];
  const applicantName = mainPersonName(application);
  const context = buildContext(input, formContent);
  const reducedProofLine = isReducedContributionMembership(application.membership_kind)
    ? [`Nachweis Schüler:innen / Azubis / Student:innen gültig bis: ${formatDate(application.student_status_until)}`]
    : [];

  return [
    `Hallo ${applicantName},`,
    "",
    ...renderMailTemplateLines(settings.confirmationIntro, context),
    ...renderMailTemplateLines(settings.confirmationAttachmentNote, context),
    "",
    `Mitgliedschaft: ${getMembershipLabelFromContent(application.membership_kind, formContent)}`,
    ...reducedProofLine,
    `Bestätigt am: ${formatDate(transferredAt)}`,
    `Zusatzpersonen: ${additionalMembers.length || "keine"}`,
    `SEPA-Mandat bestätigt: ${yesNo(application.accepts_sepa)}`,
    "",
    ...renderMailTemplateLines(settings.confirmationPdfNote, context),
    ...renderMailTemplateLines(settings.confirmationRevocationNote, context),
    "",
    `Viele Grüße`,
    clubContact.name
  ].join("\n");
}

export async function sendApplicationConfirmationEmail(
  input: ApplicationConfirmationEmailInput
): Promise<ApplicationConfirmationEmailResult> {
  const settings = await getApplicationMailSettings();

  if (!settings.confirmationEnabled) {
    return {
      status: "skipped",
      reason: "Bestätigungsmail ist nicht aktiv."
    };
  }

  if (!settings.from) {
    return {
      status: "skipped",
      reason: "MAIL_FROM fehlt."
    };
  }

  if (!input.application.email) {
    return {
      status: "skipped",
      reason: "Antrag enthält keine Empfänger-E-Mail."
    };
  }

  const pdfAttachment = await buildApplicationConfirmationPdf(input);
  const formContent = await getApplicationFormContent();
  const context = buildContext(input, formContent);

  return sendConfiguredMail(
    {
      from: settings.from,
      to: input.application.email,
      bcc: settings.confirmationBcc || undefined,
      replyTo: settings.replyTo || undefined,
      subject: renderMailTemplate(settings.confirmationSubject, context),
      html: buildHtml(input, formContent, settings),
      text: buildText(input, formContent, settings),
      attachments: [pdfAttachment]
    },
    getMailTransportSettings(settings)
  );
}
