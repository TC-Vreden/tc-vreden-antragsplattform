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
import type { ApplicationAdditionalMember } from "@/lib/application-types";
import type { ApplicationRequestType } from "@/lib/application-types";
import {
  getAdminPortalUrl,
  sendConfiguredMail,
  type MailDeliveryResult
} from "@/lib/mail";

export type ApplicationNotificationResult = MailDeliveryResult;

export type ApplicationReceivedNotificationInput = {
  applicationId: string;
  createdAt: string;
  requestType?: ApplicationRequestType;
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

const germanTimeZone = "Europe/Berlin";

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

function getRequestTypeLabel(requestType: ApplicationRequestType | undefined) {
  return requestType === "membership_extension" ? "Mitgliedschaft erweitern" : "Neuanmeldung";
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

function buildContext(
  input: ApplicationReceivedNotificationInput,
  adminPortalUrl: string | undefined,
  formContent: ApplicationFormContent
): MailTemplateContext {
  const name = `${input.firstName} ${input.lastName}`.trim();
  const membership = getMembershipLabelFromContent(input.membershipKind, formContent);
  const requestTypeLabel = getRequestTypeLabel(input.requestType);

  return {
    name,
    vorname: input.firstName,
    nachname: input.lastName,
    email: input.email,
    mitgliedschaft: membership,
    antragsart: requestTypeLabel,
    referenznummer: input.applicationId,
    eingang: formatDate(input.createdAt),
    verwaltungslink: adminPortalUrl ?? "interne Verwaltungsadresse öffnen",
    club: "TennisClub Vreden e.V."
  };
}

function paragraphHtml(lines: string[], context: MailTemplateContext) {
  return renderMailTemplateLines(lines, context)
    .map((line) => `<p style="margin:0 0 12px;color:#1f1f1d;">${escapeHtml(line)}</p>`)
    .join("");
}

function buildHtml(
  input: ApplicationReceivedNotificationInput,
  adminPortalUrl: string | undefined,
  formContent: ApplicationFormContent,
  settings: ApplicationMailSettings
) {
  const context = buildContext(input, adminPortalUrl, formContent);
  const membershipLabel = String(context.mitgliedschaft ?? "-");
  const requestTypeLabel = String(context.antragsart ?? "-");
  const applicantName = String(context.name ?? "-");
  const address = buildAddress(input);
  const additionalMembers = buildAdditionalMembersSummary(input.familyMembers);
  const buttonLabel = renderMailTemplate(settings.notificationButtonLabel, context);
  const reviewLink = adminPortalUrl
    ? `<p style="margin:20px 0;"><a href="${escapeHtml(adminPortalUrl)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;text-decoration:none;font-weight:700;padding:11px 16px;border-radius:6px;">${escapeHtml(buttonLabel)}</a></p>`
    : "<p style=\"margin:20px 0;\"><strong>Verwaltungsportal:</strong> Bitte die interne Verwaltungsadresse öffnen.</p>";

  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1d1d1b;line-height:1.45;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;border-collapse:collapse;border:1px solid #e3d8c0;background:#ffffff;">
            <tr>
              <td style="padding:18px 20px 14px;border-bottom:4px solid #ffd800;background:#ffffff;">
                <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6b5900;">TennisClub Vreden e.V.</p>
                <h1 style="margin:6px 0 0;font-size:23px;line-height:1.25;color:#1d1d1b;">Neuer Antrag eingegangen</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px;background:#ffffff;">
                ${paragraphHtml(settings.notificationIntro, context)}
                ${reviewLink}
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px;margin-top:12px;">
                  <tbody>
                    <tr><td style="width:170px;padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Referenznummer</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(input.applicationId)}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Antragsart</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(requestTypeLabel)}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Eingang</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(formatDate(input.createdAt))}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Hauptperson</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(applicantName)}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Geburtsdatum</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(formatDate(input.birthDate))}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Mitgliedschaft</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(membershipLabel)}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Kontakt</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(input.email)}<br>${escapeHtml(input.mobile || input.phone || "-")}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Adresse</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(address || "-")}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Zusatzpersonen</td><td style="padding:8px 0;border-top:1px solid #eee;white-space:pre-line;">${escapeHtml(additionalMembers)}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">SEPA bestätigt</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsSepa))}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">Foto/Video</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsPhotoVideo))}</td></tr>
                    <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:700;vertical-align:top;">WhatsApp</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(yesNo(input.acceptsWhatsapp))}</td></tr>
                  </tbody>
                </table>
                <div style="margin-top:18px;color:#555;font-size:13px;">
                  ${paragraphHtml(settings.notificationFooter, context)}
                </div>
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
  input: ApplicationReceivedNotificationInput,
  adminPortalUrl: string | undefined,
  formContent: ApplicationFormContent,
  settings: ApplicationMailSettings
) {
  const context = buildContext(input, adminPortalUrl, formContent);
  const intro = renderMailTemplateLines(settings.notificationIntro, context);
  const footer = renderMailTemplateLines(settings.notificationFooter, context);

  return [
    "Neuer Antrag eingegangen",
    "",
    ...intro,
    "",
    `Referenznummer: ${input.applicationId}`,
    `Antragsart: ${context.antragsart}`,
    `Eingang: ${formatDate(input.createdAt)}`,
    `Hauptperson: ${input.firstName} ${input.lastName}`,
    `Geburtsdatum: ${formatDate(input.birthDate)}`,
    `Mitgliedschaft: ${context.mitgliedschaft}`,
    `Kontakt: ${input.email} / ${input.mobile || input.phone || "-"}`,
    `Adresse: ${buildAddress(input) || "-"}`,
    "Zusatzpersonen:",
    buildAdditionalMembersSummary(input.familyMembers),
    `SEPA bestätigt: ${yesNo(input.acceptsSepa)}`,
    `Foto/Video: ${yesNo(input.acceptsPhotoVideo)}`,
    `WhatsApp: ${yesNo(input.acceptsWhatsapp)}`,
    "",
    adminPortalUrl ? `Verwaltung: ${adminPortalUrl}` : "Verwaltung: interne Verwaltungsadresse öffnen",
    "",
    ...footer
  ].join("\n");
}

export async function sendApplicationReceivedNotification(
  input: ApplicationReceivedNotificationInput
): Promise<ApplicationNotificationResult> {
  const settings = await getApplicationMailSettings();

  if (!settings.notificationEnabled) {
    return {
      status: "skipped",
      reason: "Eingangsmail ist nicht aktiv."
    };
  }

  if (!settings.from || !settings.clubRecipient) {
    return {
      status: "skipped",
      reason: "Absender oder Club-Empfänger fehlt."
    };
  }

  const adminPortalUrl = getAdminPortalUrl();
  const formContent = await getApplicationFormContent();
  const context = buildContext(input, adminPortalUrl, formContent);

  return sendConfiguredMail(
    {
      from: settings.from,
      to: settings.clubRecipient,
      replyTo: settings.replyTo || undefined,
      subject: renderMailTemplate(settings.notificationSubject, context),
      html: buildHtml(input, adminPortalUrl, formContent, settings),
      text: buildText(input, adminPortalUrl, formContent, settings)
    },
    getMailTransportSettings(settings)
  );
}
