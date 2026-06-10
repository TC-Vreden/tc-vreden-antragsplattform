import {
  PDFDocument,
  type PDFImage,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage
} from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  getAdditionalMemberRelationLabel,
  getSalutationLabel,
  isReducedContributionMembership
} from "@/lib/application-options";
import {
  getApplicationFormContent,
  getMembershipLabelFromContent
} from "@/lib/application-content";
import type {
  ApplicationAdditionalMember,
  ApplicationMatchPayload,
  ApplicationRow
} from "@/lib/application-types";
import {
  clubContact,
  getConfirmationDocumentLinks,
  getConfirmationLegalSections,
  confirmationMailPreview
} from "@/lib/confirmation-document";
import type { ConfiguredMailAttachment } from "@/lib/mail";

type ApplicationConfirmationPdfInput = {
  application: ApplicationRow;
  transferredAt: string;
  matchPayload: ApplicationMatchPayload;
};

type FieldRow = {
  label: string;
  value: string | number | boolean | null | undefined;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const contentTop = 676;
const footerReserve = 106;
const headerLogoWidth = 218;
const headerLogoHeight = headerLogoWidth / 2.5;
const headerLogoY = 738;
const headerTextX = margin + headerLogoWidth + 28;
const logoFilePath = path.join(process.cwd(), "public", "brand", "tc-vreden-logo.png");
const textColor = rgb(0.12, 0.12, 0.11);
const mutedColor = rgb(0.37, 0.34, 0.29);
const yellow = rgb(1, 0.86, 0);
const softYellow = rgb(1, 0.97, 0.76);
const borderColor = rgb(0.86, 0.80, 0.68);
const black = rgb(0.08, 0.08, 0.07);
const germanTimeZone = "Europe/Berlin";

function pdfText(value: string | number | boolean | null | undefined) {
  return String(value ?? "-")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”„]/g, "\"")
    .replace(/[’‘]/g, "'")
    .replace(/€/g, "EUR")
    .replace(/•/g, "-")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", value.includes("T")
    ? {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: germanTimeZone
      }
    : {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: germanTimeZone
      }).format(date);
}

function formatIban(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, "").trim();

  if (!normalized) {
    return "-";
  }

  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function yesNo(value: boolean | null | undefined) {
  return value ? "Ja" : "Nein";
}

function address(parts: Array<string | null | undefined>) {
  const text = parts.map((part) => part?.trim()).filter(Boolean).join(", ");
  return text || "-";
}

function mainPersonName(application: ApplicationRow) {
  return `${application.first_name} ${application.last_name}`.trim();
}

function filenameDate(value: string) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
    year: "2-digit"
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}${part("month")}${part("day")}`;
}

function safeFilePart(value: string | null | undefined, fallback: string) {
  return (value?.trim() || fallback)
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || fallback;
}

function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  const parts: string[] = [];
  let current = "";

  for (const char of word) {
    const next = `${current}${char}`;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalized = pdfText(text);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return ["-"];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const chunks = font.widthOfTextAtSize(word, size) > maxWidth
      ? splitLongWord(word, font, size, maxWidth)
      : [word];

    for (const chunk of chunks) {
      const candidate = current ? `${current} ${chunk}` : chunk;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = chunk;
      } else {
        current = candidate;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  return pdfText(text)
    .split(/\n+/)
    .flatMap((line) => wrapLine(line, font, size, maxWidth));
}

class ConfirmationPdfWriter {
  private page: PDFPage;
  private y = contentTop;

  constructor(
    private readonly document: PDFDocument,
    private readonly regularFont: PDFFont,
    private readonly boldFont: PDFFont,
    private readonly generatedAt: string,
    private readonly logoImage: PDFImage | null,
    private readonly headerTitle: string,
    private readonly headerSubtitle: string
  ) {
    this.page = this.addPage();
  }

  section(title: string) {
    this.ensureSpace(72);
    this.y -= 8;
    this.page.drawText(pdfText(title), {
      x: margin,
      y: this.y,
      size: 13,
      font: this.boldFont,
      color: black
    });
    this.y -= 9;
    this.page.drawRectangle({
      x: margin,
      y: this.y,
      width: pageWidth - margin * 2,
      height: 1,
      color: yellow
    });
    this.y -= 16;
  }

  subheading(title: string) {
    this.ensureSpace(28);
    this.page.drawText(pdfText(title), {
      x: margin,
      y: this.y,
      size: 10.4,
      font: this.boldFont,
      color: black
    });
    this.y -= 15;
  }

  paragraph(text: string, options?: { highlight?: boolean }) {
    const lines = wrapText(text, this.regularFont, 9.5, pageWidth - margin * 2 - (options?.highlight ? 18 : 0));
    const height = lines.length * 12 + (options?.highlight ? 20 : 4);

    if (options?.highlight) {
      this.ensureSpace(height);
      this.page.drawRectangle({
        x: margin,
        y: this.y - height + 8,
        width: pageWidth - margin * 2,
        height,
        color: softYellow,
        borderColor,
        borderWidth: 0.8
      });
      this.y -= 10;

      for (const line of lines) {
        this.page.drawText(line, {
          x: margin + 9,
          y: this.y,
          size: 9.5,
          font: this.regularFont,
          color: textColor
        });
        this.y -= 12;
      }

      this.y -= 16;
      return;
    }

    for (const line of lines) {
      this.ensureSpace(18);
      this.page.drawText(line, {
        x: margin,
        y: this.y,
        size: 9.5,
        font: this.regularFont,
        color: textColor
      });
      this.y -= 12;
    }

    this.y -= 4;
  }

  linkList(items: Array<{ label: string; url: string }>) {
    for (const item of items) {
      const label = `${item.label}:`;
      const url = item.url;

      this.ensureSpace(28);
      this.page.drawText(pdfText(label), {
        x: margin,
        y: this.y,
        size: 9.2,
        font: this.boldFont,
        color: textColor
      });
      this.y -= 11;
      this.drawExternalLink(url, url, margin, this.y, 8.3);
      this.y -= 17;
    }

    this.y -= 2;
  }

  fields(rows: FieldRow[], columns = 2) {
    const gap = 16;
    const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;

    for (let start = 0; start < rows.length; start += columns) {
      const cells = rows.slice(start, start + columns);
      const heights = cells.map((cell) => {
        const valueLines = wrapText(String(cell.value ?? "-"), this.regularFont, 9.2, cellWidth);
        return 12 + valueLines.length * 11 + 8;
      });
      const rowHeight = Math.max(34, ...heights);

      this.ensureSpace(rowHeight + 4);

      cells.forEach((cell, index) => {
        const x = margin + index * (cellWidth + gap);
        const valueLines = wrapText(String(cell.value ?? "-"), this.regularFont, 9.2, cellWidth);

        this.page.drawText(pdfText(cell.label), {
          x,
          y: this.y,
          size: 8.5,
          font: this.boldFont,
          color: black
        });

        let valueY = this.y - 12;
        for (const line of valueLines) {
          this.page.drawText(line, {
            x,
            y: valueY,
            size: 9.2,
            font: this.regularFont,
            color: textColor
          });
          valueY -= 11;
        }
      });

      this.y -= rowHeight;
    }

    this.y -= 4;
  }

  bulletList(items: string[]) {
    if (items.length === 0) {
      this.paragraph("-");
      return;
    }

    for (const item of items) {
      const lines = wrapText(item, this.regularFont, 9.2, pageWidth - margin * 2 - 12);
      const height = Math.max(13, lines.length * 11 + 4);
      this.ensureSpace(height);

      this.page.drawText("-", {
        x: margin,
        y: this.y,
        size: 9.2,
        font: this.regularFont,
        color: textColor
      });

      let lineY = this.y;
      for (const line of lines) {
        this.page.drawText(line, {
          x: margin + 12,
          y: lineY,
          size: 9.2,
          font: this.regularFont,
          color: textColor
        });
        lineY -= 11;
      }

      this.y -= height;
    }

    this.y -= 4;
  }

  drawFooters() {
    const pages = this.document.getPages();

    pages.forEach((page, index) => {
      page.drawRectangle({
        x: margin,
        y: 62,
        width: pageWidth - margin * 2,
        height: 0.8,
        color: borderColor
      });
      page.drawText(pdfText(clubContact.name), {
        x: margin,
        y: 47,
        size: 7.8,
        font: this.boldFont,
        color: textColor
      });
      page.drawText(pdfText(clubContact.address), {
        x: margin,
        y: 36,
        size: 7.2,
        font: this.regularFont,
        color: mutedColor
      });
      page.drawText(pdfText(`${clubContact.email} | ${clubContact.website}`), {
        x: margin,
        y: 25,
        size: 7.2,
        font: this.regularFont,
        color: mutedColor
      });
      this.drawRightText(page, `Seite ${index + 1}/${pages.length}`, 47, 7.6);
      this.drawRightText(page, `Erstellt: ${formatDate(this.generatedAt)}`, 36, 7.2);
    });
  }

  private drawRightText(page: PDFPage, text: string, y: number, size: number) {
    const normalized = pdfText(text);
    const width = this.regularFont.widthOfTextAtSize(normalized, size);

    page.drawText(normalized, {
      x: pageWidth - margin - width,
      y,
      size,
      font: this.regularFont,
      color: mutedColor
    });
  }

  private drawExternalLink(text: string, url: string, x: number, y: number, size: number) {
    const normalized = pdfText(text);
    const linkColor = rgb(0.02, 0.31, 0.52);
    const width = this.regularFont.widthOfTextAtSize(normalized, size);

    this.page.drawText(normalized, {
      x,
      y,
      size,
      font: this.regularFont,
      color: linkColor
    });

    const annotation = this.document.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y - 2, x + width, y + size + 2],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: url
      }
    });

    this.page.node.addAnnot(this.document.context.register(annotation));
  }

  private ensureSpace(height: number) {
    if (this.y - height < footerReserve) {
      this.page = this.addPage();
      this.y = contentTop;
    }
  }

  private addPage() {
    const page = this.document.addPage([pageWidth, pageHeight]);
    this.drawHeader(page);
    return page;
  }

  private drawHeader(page: PDFPage) {
    if (this.logoImage) {
      page.drawImage(this.logoImage, {
        x: margin,
        y: headerLogoY,
        width: headerLogoWidth,
        height: headerLogoHeight
      });
    } else {
      page.drawText("TennisClub Vreden e.V.", {
        x: margin,
        y: 792,
        size: 17,
        font: this.boldFont,
        color: black
      });
    }

    page.drawText(pdfText(this.headerTitle), {
      x: headerTextX,
      y: 790,
      size: 14,
      font: this.boldFont,
      color: black
    });
    page.drawText(pdfText(this.headerSubtitle), {
      x: headerTextX,
      y: 773,
      size: 9.2,
      font: this.regularFont,
      color: mutedColor
    });
    page.drawRectangle({
      x: margin,
      y: 716,
      width: pageWidth - margin * 2,
      height: 4,
      color: yellow
    });
  }
}

async function embedClubLogo(document: PDFDocument) {
  try {
    const bytes = await readFile(logoFilePath);
    return await document.embedPng(bytes);
  } catch {
    return null;
  }
}

function buildConsentRows(application: ApplicationRow): FieldRow[] {
  const confirmedBy = mainPersonName(application);
  const createdAt = formatDate(application.created_at);
  const rows: FieldRow[] = [];

  rows.push(
    {
      label: "Satzung / Beitragsordnung / Platzpflegeordnung",
      value: `${yesNo(application.accepts_statutes)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "Datenschutzerklärung nach DSGVO",
      value: `${yesNo(application.accepts_privacy)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    }
  );

  if (!isMembershipExtension(application)) {
    rows.push({
      label: "SEPA-Lastschriftmandat",
      value: `${yesNo(application.accepts_sepa)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    });
  }

  rows.push(
    {
      label: "Foto / Video",
      value: `${yesNo(application.accepts_photo_video)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "WhatsApp / Mobilnummer",
      value: `${yesNo(application.accepts_whatsapp)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    }
  );

  if (hasGuardianInformation(application)) {
    rows.push({
      label: "Gesetzliche Vertreter",
      value: `${yesNo(application.guardian_consent)} | ${application.guardian_name ?? "Nicht erfasst"}`
    });
  }

  return rows;
}

function hasGuardianInformation(application: ApplicationRow) {
  return Boolean(
    application.guardian_name ||
      application.guardian_email ||
      application.guardian_phone ||
      application.guardian_consent
  );
}

function isMembershipExtension(application: ApplicationRow) {
  return application.request_type === "membership_extension";
}

function getConfirmationTitle(application: ApplicationRow) {
  return isMembershipExtension(application)
    ? "Nachweis Mitgliedschaftserweiterung"
    : "Nachweis Mitgliedsantrag";
}

function getConfirmationSubtitle(application: ApplicationRow) {
  return isMembershipExtension(application)
    ? "Bestätigung deiner digitalen Mitgliedschaftserweiterung"
    : "Bestätigung deines digitalen Mitgliedsantrags";
}

function getConfirmationIntro(application: ApplicationRow) {
  if (isMembershipExtension(application)) {
    return "Vielen Dank für deine digitale Mitgliedschaftserweiterung. Wir haben den Antrag geprüft und die neu hinzuzufügenden Personen in der Vereinsverwaltung bearbeitet.";
  }

  return confirmationMailPreview.intro;
}

function getApplicantVisibleNotes(notes: string | null | undefined) {
  const text = notes?.trim();

  if (!text) {
    return null;
  }

  if (/e\s*bu\s*sy|testlabor|verwaltungsworkflow|automatischer.*test/i.test(text)) {
    return null;
  }

  return text;
}

function addAdditionalMember(writer: ConfirmationPdfWriter, member: ApplicationAdditionalMember, index: number) {
  const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || `Zusatzperson ${index + 1}`;

  writer.section(`Zusatzperson ${index + 1}: ${name}`);
  writer.fields([
    { label: "Rolle", value: getAdditionalMemberRelationLabel(member.relation) },
    { label: "Anrede", value: getSalutationLabel(member.salutation) },
    { label: "Name", value: name },
    { label: "Geburtsdatum", value: formatDate(member.birthDate) },
    { label: "E-Mail", value: member.email },
    { label: "Mobil", value: member.mobile },
    { label: "Gesetzliche Vertreter", value: member.legalRepresentative },
    { label: "Adresse", value: address([member.street, member.postalCode, member.city]) }
  ]);
}

export async function buildApplicationConfirmationPdf(
  input: ApplicationConfirmationPdfInput
): Promise<ConfiguredMailAttachment> {
  const { application } = input;
  const generatedAt = new Date().toISOString();
  const document = await PDFDocument.create();
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await embedClubLogo(document);
  const writer = new ConfirmationPdfWriter(
    document,
    regularFont,
    boldFont,
    generatedAt,
    logoImage,
    getConfirmationTitle(application),
    getConfirmationSubtitle(application)
  );
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];
  const formContent = await getApplicationFormContent();
  const confirmationDocumentLinks = getConfirmationDocumentLinks(formContent);
  const confirmationLegalSections = getConfirmationLegalSections(formContent).filter(
    (section) => !isMembershipExtension(application) || section.title !== "SEPA-Lastschriftmandat"
  );

  document.setTitle(
    `${isMembershipExtension(application) ? "Mitgliedschaftserweiterung" : "Mitgliedsantrag"} ${mainPersonName(application)}`
  );
  document.setAuthor(clubContact.name);
  document.setSubject(
    isMembershipExtension(application)
      ? "Digitale Bestätigung der Mitgliedschaftserweiterung"
      : "Digitale Mitgliedsantragsbestätigung"
  );
  document.setProducer("TC Vreden Antragsplattform");
  document.setCreator("TC Vreden Antragsplattform");
  document.setCreationDate(new Date(generatedAt));

  writer.section(`Bestätigung vom ${formatDate(generatedAt)}`);
  writer.paragraph(getConfirmationIntro(application), { highlight: true });

  writer.section(isMembershipExtension(application) ? "Bestehendes Hauptmitglied" : "Hauptperson");
  writer.fields([
    { label: "Anrede", value: getSalutationLabel(application.salutation) },
    { label: "Name", value: mainPersonName(application) },
    { label: "Geburtsdatum", value: formatDate(application.birth_date) },
    { label: "E-Mail", value: application.email },
    { label: "Mobil", value: application.mobile },
    { label: "Telefon", value: application.phone },
    { label: "Adresse", value: address([application.street, application.postal_code, application.city]) }
  ]);

  writer.section("Mitgliedschaft");
  const membershipRows: FieldRow[] = [
    {
      label: "Mitgliedschaftsart",
      value: getMembershipLabelFromContent(application.membership_kind, formContent)
    }
  ];

  if (isReducedContributionMembership(application.membership_kind)) {
    membershipRows.push({
      label: "Nachweis Schüler:innen / Azubis / Student:innen gültig bis",
      value: formatDate(application.student_status_until)
    });
  }

  writer.fields(membershipRows, membershipRows.length > 1 ? 1 : 2);

  if (additionalMembers.length === 0) {
    writer.section(
      isMembershipExtension(application)
        ? "Neu hinzuzufügende Personen"
        : "Zusatzpersonen / Familienmitglieder"
    );
    writer.paragraph("Keine Zusatzpersonen erfasst.");
  } else {
    additionalMembers.forEach((member, index) => addAdditionalMember(writer, member, index));
  }

  if (!isMembershipExtension(application)) {
    writer.section("SEPA / Zahlung");
    writer.fields([
      { label: "Kontoinhaber", value: application.account_holder },
      { label: "IBAN", value: formatIban(application.iban) },
      { label: "Anschrift Kontoinhaber", value: application.account_holder_address },
      { label: "SEPA-Mandat bestätigt", value: yesNo(application.accepts_sepa) },
      { label: "SEPA-Mandatsdatum / digital bestätigt am", value: formatDate(application.created_at) }
    ]);
  }

  if (hasGuardianInformation(application)) {
    writer.section("Minderjährige / gesetzliche Vertreter");
    writer.fields([
      { label: "Gesetzliche Vertreter", value: application.guardian_name },
      { label: "E-Mail", value: application.guardian_email },
      { label: "Telefon", value: application.guardian_phone },
      { label: "Zustimmung", value: yesNo(application.guardian_consent) }
    ]);
  }

  writer.section("Bestätigungen und Einwilligungen");
  writer.fields(buildConsentRows(application), 1);

  const applicantVisibleNotes = getApplicantVisibleNotes(application.notes);
  if (applicantVisibleNotes) {
    writer.section("Hinweise aus dem Antrag");
    writer.paragraph(applicantVisibleNotes);
  }

  writer.section("Rechtliche Hinweise");
  writer.subheading("Verlinkte Vereinsdokumente");
  writer.linkList(confirmationDocumentLinks);
  for (const section of confirmationLegalSections) {
    writer.subheading(section.title);
    writer.paragraph(section.text);
  }
  writer.paragraph(confirmationMailPreview.revocationNote, { highlight: true });

  writer.drawFooters();

  const bytes = await document.save();
  const filename = [
    filenameDate(generatedAt),
    safeFilePart(application.last_name, "Nachname"),
    safeFilePart(application.first_name, "Vorname"),
    isMembershipExtension(application) ? "Mitgliedschaftserweiterung" : "Mitgliedsantrag",
    "TennisClub",
    "Vreden"
  ]
    .filter(Boolean)
    .join("-");

  return {
    filename: `${filename}.pdf`,
    content: Buffer.from(bytes),
    contentType: "application/pdf"
  };
}
