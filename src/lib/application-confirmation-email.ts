import {
  getAdditionalMemberRelationLabel,
  getMembershipLabel,
  getSalutationLabel,
  isReducedContributionMembership
} from "@/lib/application-options";
import type {
  ApplicationAdditionalMember,
  ApplicationMatchPayload,
  ApplicationRow
} from "@/lib/application-types";
import {
  clubContact,
  confirmationLegalSections,
  confirmationMailPreview
} from "@/lib/confirmation-document";
import { buildApplicationConfirmationPdf } from "@/lib/application-confirmation-pdf";
import {
  getMailEnv,
  isTruthyMailValue,
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

function isConfirmationEmailEnabled() {
  const explicitValue = getMailEnv("APPLICATION_CONFIRMATION_EMAIL_ENABLED");

  if (explicitValue !== undefined) {
    return isTruthyMailValue(explicitValue);
  }

  return isTruthyMailValue(getMailEnv("APPLICATION_NOTIFICATION_EMAIL_ENABLED"));
}

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

function formatAddress(parts: Array<string | null | undefined>) {
  const address = parts.map((part) => part?.trim()).filter(Boolean).join(", ");
  return address || "-";
}

function formatIban(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, "").trim();

  if (!normalized) {
    return "-";
  }

  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function mainPersonName(application: ApplicationRow) {
  return `${application.first_name} ${application.last_name}`.trim();
}

function detailRow(label: string, value: string | number | boolean | null | undefined) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? "-")}</td></tr>`;
}

function renderParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderLegalSectionsHtml() {
  return confirmationLegalSections
    .map(
      (section) => `
        <section class="legal-section">
          <h3>${escapeHtml(section.title)}</h3>
          ${renderParagraphs(section.text)}
        </section>`
    )
    .join("");
}

function renderAdditionalMembers(members: ApplicationAdditionalMember[]) {
  if (members.length === 0) {
    return "<p class=\"muted\">Keine Zusatzpersonen erfasst.</p>";
  }

  return members
    .map((member, index) => {
      const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || `Zusatzperson ${index + 1}`;
      return `
        <table class="details">
          <tbody>
            ${detailRow("Rolle", getAdditionalMemberRelationLabel(member.relation))}
            ${detailRow("Anrede", getSalutationLabel(member.salutation))}
            ${detailRow("Name", name)}
            ${detailRow("Geburtsdatum", formatDate(member.birthDate))}
            ${detailRow("E-Mail", member.email)}
            ${detailRow("Mobil", member.mobile)}
            ${detailRow("Gesetzliche Vertreter", member.legalRepresentative)}
            ${detailRow("Adresse", formatAddress([member.street, member.postalCode, member.city]))}
          </tbody>
        </table>`;
    })
    .join("");
}

function buildHtml(input: ApplicationConfirmationEmailInput) {
  const { application, transferredAt } = input;
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];
  const applicantName = mainPersonName(application);
  const reducedProofRow = isReducedContributionMembership(application.membership_kind)
    ? detailRow(
        "Nachweis Schüler:innen / Azubis / Student:innen gültig bis",
        formatDate(application.student_status_until)
      )
    : "";
  const legalNotice = renderLegalSectionsHtml();

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #ffffff; color: #1f1f1d; font-family: Arial, sans-serif; line-height: 1.5; }
      .wrap { max-width: 760px; margin: 0 auto; padding: 24px; background: #ffffff; }
      .card { background: #ffffff; border: 1px solid #e3d8c0; border-radius: 8px; overflow: hidden; }
      .header { padding: 22px 24px 20px; border-bottom: 4px solid #ffd800; background: #ffffff; }
      .logo { display: block; width: 180px; max-width: 70%; height: auto; margin: 0 0 18px; }
      h1 { margin: 0; font-size: 26px; }
      h2 { margin: 28px 0 10px; font-size: 18px; }
      h3 { margin: 16px 0 6px; font-size: 15px; }
      .content { padding: 24px; }
      .details { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
      .details th, .details td { padding: 8px 10px; border-bottom: 1px solid #eadfc7; text-align: left; vertical-align: top; }
      .details th { width: 230px; color: #4d4636; }
      .muted { color: #655f52; }
      .notice { background: #fffbea; border: 1px solid #ffd800; border-radius: 6px; padding: 12px 14px; }
      .legal-section { margin: 16px 0; padding-top: 6px; border-top: 1px solid #eadfc7; }
      .legal-section p { margin: 8px 0; }
      .footer { padding: 18px 24px; background: #ffffff; border-top: 1px solid #e3d8c0; color: #4d4636; font-size: 13px; }
      a { color: #0b5f8a; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="header">
          <img class="logo" src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(clubContact.name)}" />
          <h1>Bestätigung deiner Mitgliedschaft</h1>
        </div>
        <div class="content">
          <p>Hallo ${escapeHtml(applicantName)},</p>
          <p>${escapeHtml(confirmationMailPreview.intro)}</p>
          <p class="notice">${escapeHtml(confirmationMailPreview.attachmentNote)}</p>

          <h2>Hauptperson</h2>
          <table class="details">
            <tbody>
              ${detailRow("Anrede", getSalutationLabel(application.salutation))}
              ${detailRow("Name", applicantName)}
              ${detailRow("Geburtsdatum", formatDate(application.birth_date))}
              ${detailRow("E-Mail", application.email)}
              ${detailRow("Mobil", application.mobile)}
              ${detailRow("Telefon", application.phone)}
              ${detailRow("Adresse", formatAddress([application.street, application.postal_code, application.city]))}
            </tbody>
          </table>

          <h2>Mitgliedschaft</h2>
          <table class="details">
            <tbody>
              ${detailRow("Mitgliedschaftsart", getMembershipLabel(application.membership_kind))}
              ${reducedProofRow}
              ${detailRow("Bestätigt am", formatDate(transferredAt))}
            </tbody>
          </table>

          <h2>Zusatzpersonen / Familienmitglieder</h2>
          ${renderAdditionalMembers(additionalMembers)}

          <h2>SEPA / Zahlung</h2>
          <table class="details">
            <tbody>
              ${detailRow("Kontoinhaber", application.account_holder)}
              ${detailRow("IBAN", formatIban(application.iban))}
              ${detailRow("Anschrift Kontoinhaber", application.account_holder_address)}
              ${detailRow("SEPA-Mandat bestätigt", yesNo(application.accepts_sepa))}
              ${detailRow("SEPA-Mandatsdatum / digital bestätigt am", formatDate(application.created_at))}
            </tbody>
          </table>

          <h2>Einwilligungen</h2>
          <table class="details">
            <tbody>
              ${detailRow("Satzung / Beitragsordnung / Platzpflegeordnung", yesNo(application.accepts_statutes))}
              ${detailRow("Datenschutzerklärung nach DSGVO", yesNo(application.accepts_privacy))}
              ${detailRow("Foto / Video", yesNo(application.accepts_photo_video))}
              ${detailRow("WhatsApp", yesNo(application.accepts_whatsapp))}
              ${detailRow("Gesetzliche Vertreter", application.guardian_name)}
              ${detailRow("Zustimmung gesetzliche Vertreter", yesNo(application.guardian_consent))}
            </tbody>
          </table>

          <h2>Hinweise</h2>
          ${legalNotice}
          <p>${escapeHtml(confirmationMailPreview.revocationNote)}</p>
          <p>Viele Grüße<br />${escapeHtml(clubContact.name)}</p>
        </div>
        <div class="footer">
          ${escapeHtml(clubContact.name)} · ${escapeHtml(clubContact.address)} · ${escapeHtml(clubContact.email)} · ${escapeHtml(clubContact.website)}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildText(input: ApplicationConfirmationEmailInput) {
  const { application, transferredAt } = input;
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];
  const applicantName = mainPersonName(application);
  const reducedProofLine = isReducedContributionMembership(application.membership_kind)
    ? [`Nachweis Schüler:innen / Azubis / Student:innen gültig bis: ${formatDate(application.student_status_until)}`]
    : [];
  const legalText = confirmationLegalSections.flatMap((section) => [
    section.title,
    section.text,
    ""
  ]);

  return [
    `Hallo ${applicantName},`,
    "",
    confirmationMailPreview.intro,
    confirmationMailPreview.attachmentNote,
    "",
    `Mitgliedschaft: ${getMembershipLabel(application.membership_kind)}`,
    ...reducedProofLine,
    `Bestätigt am: ${formatDate(transferredAt)}`,
    `Geburtsdatum: ${formatDate(application.birth_date)}`,
    `Adresse: ${formatAddress([application.street, application.postal_code, application.city])}`,
    `SEPA-Mandat bestätigt: ${yesNo(application.accepts_sepa)}`,
    `SEPA-Mandatsdatum / digital bestätigt am: ${formatDate(application.created_at)}`,
    `IBAN: ${formatIban(application.iban)}`,
    "",
    "Zusatzpersonen:",
    additionalMembers.length
      ? additionalMembers
          .map(
            (member) =>
              `- ${getAdditionalMemberRelationLabel(member.relation)}: ${member.firstName ?? ""} ${
                member.lastName ?? ""
              } (${formatDate(member.birthDate)})${
                member.legalRepresentative
                  ? `, gesetzliche Vertreter: ${member.legalRepresentative}`
                  : ""
              }`
          )
          .join("\n")
      : "- Keine Zusatzpersonen erfasst.",
    "",
    "Hinweise:",
    ...legalText,
    confirmationMailPreview.revocationNote,
    "",
    `Viele Grüße`,
    clubContact.name
  ].join("\n");
}

export async function sendApplicationConfirmationEmail(
  input: ApplicationConfirmationEmailInput
): Promise<ApplicationConfirmationEmailResult> {
  if (!isConfirmationEmailEnabled()) {
    return {
      status: "skipped",
      reason: "APPLICATION_CONFIRMATION_EMAIL_ENABLED ist nicht aktiv."
    };
  }

  const from = getMailEnv("MAIL_FROM");
  const bcc = getMailEnv("MAIL_CONFIRMATION_BCC") ?? getMailEnv("MAIL_TO_CLUB") ?? clubContact.email;
  const replyTo = getMailEnv("MAIL_REPLY_TO") ?? clubContact.email;

  if (!from) {
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

  return sendConfiguredMail({
    from,
    to: input.application.email,
    bcc,
    replyTo,
    subject: confirmationMailPreview.subject,
    html: buildHtml(input),
    text: buildText(input),
    attachments: [pdfAttachment]
  });
}
