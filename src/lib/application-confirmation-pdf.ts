import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage
} from "pdf-lib";

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
const contentTop = 720;
const footerReserve = 68;
const headerLogoX = margin - 10;
const headerLogoY = 744;
const headerLogoScale = 0.12;
const headerTextX = 112;
const textColor = rgb(0.12, 0.12, 0.11);
const mutedColor = rgb(0.37, 0.34, 0.29);
const yellow = rgb(1, 0.86, 0);
const softYellow = rgb(1, 0.97, 0.76);
const borderColor = rgb(0.86, 0.80, 0.68);
const black = rgb(0.08, 0.08, 0.07);

const logoPaths = {
  black:
    "M150.7,286.1c6.4,0.4,9.2,0.3,16.1,0c35-1.1,57.2-15.8,81.3-47.1c16.5-21.5,28.3-46.7,41.8-70.4c19.5-34.1,38.5-68.5,57.9-102.6c9-15.9,23-24.1,41.2-24.3c29.8-0.3,59.6-0.3,89.4-0.2c9.9,0,12.2,4.7,7,14.1c-30.9,55.1-62,110.2-92.9,165.3c-47.7,84.9-95.3,169.8-143,254.8c-0.7,1.2-1.3,2.4-2,3.6c-5.8,9.7-10.3,9.8-16-0.1c-12.6-21.9-25-44-37.4-66c-17.6-31-40.3-74.1-53.1-96.2c-3.2-5.4-4-6.8-6.6-11.5c-2.6-4.7-1.5-12.2,1.7-15.2C141.9,284.8,150.7,286.1,150.7,286.1",
  yellowOne:
    "M127.4,133.9c24.2-25,33.3-61,24.9-93.9c-8.3,0.7-17.9,1.8-27.2,4.3C70.7,58.9,31.6,105.8,31.4,161C65.7,170,102.1,160,127.4,133.9",
  yellowTwo:
    "M281.8,119.4c-20.6-46.6-57.2-71.4-111.7-80c8.3,37.7-2.6,78.2-30.2,106.6c-22.4,23.1-53.1,35.5-84.2,35.5c-7.6,0-15.3-0.8-22.9-2.3c0.3,2.1,0.5,4.3,1,6.4c8.5,41.5,32.4,70.4,69.1,87.9c6.3,3.1,11.1,5.3,14.5,5.3c3.8,0,9.6-2.5,11.1-9.2c0.6-4.7-0.9-10.8-0.7-14.5c0.2-12.9,2.2-22.6,6.9-35c20.7-55.2,77.7-85.5,132.4-79.7c8.4,0.9,12.3-1.3,14.7-5C284.1,131.7,284.9,125.9,281.8,119.4"
};

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
        minute: "2-digit"
      }
    : {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
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

function safeFilePart(value: string | null | undefined) {
  return (value || "mitgliedsantrag")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "mitgliedsantrag";
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
    private readonly generatedAt: string
  ) {
    this.page = this.addPage();
  }

  section(title: string) {
    this.ensureSpace(34);
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

  paragraph(text: string, options?: { highlight?: boolean }) {
    const lines = wrapText(text, this.regularFont, 9.5, pageWidth - margin * 2 - (options?.highlight ? 18 : 0));
    const height = lines.length * 12 + (options?.highlight ? 20 : 4);

    this.ensureSpace(height);

    if (options?.highlight) {
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
    }

    for (const line of lines) {
      this.page.drawText(line, {
        x: margin + (options?.highlight ? 9 : 0),
        y: this.y,
        size: 9.5,
        font: this.regularFont,
        color: textColor
      });
      this.y -= 12;
    }

    this.y -= options?.highlight ? 6 : 4;
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
    const footer = `${clubContact.name} | ${clubContact.address} | ${clubContact.email} | ${clubContact.website}`;

    pages.forEach((page, index) => {
      page.drawRectangle({
        x: margin,
        y: 50,
        width: pageWidth - margin * 2,
        height: 0.8,
        color: borderColor
      });
      page.drawText(pdfText(`${footer} | Seite ${index + 1}/${pages.length}`), {
        x: margin,
        y: 34,
        size: 7.5,
        font: this.regularFont,
        color: mutedColor
      });
      page.drawText(pdfText(`Erstellt: ${formatDate(this.generatedAt)}`), {
        x: pageWidth - margin - 112,
        y: 22,
        size: 7,
        font: this.regularFont,
        color: mutedColor
      });
    });
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
    page.drawSvgPath(logoPaths.yellowOne, {
      x: headerLogoX,
      y: headerLogoY,
      scale: headerLogoScale,
      color: yellow
    });
    page.drawSvgPath(logoPaths.yellowTwo, {
      x: headerLogoX,
      y: headerLogoY,
      scale: headerLogoScale,
      color: yellow
    });
    page.drawSvgPath(logoPaths.black, {
      x: headerLogoX,
      y: headerLogoY,
      scale: headerLogoScale,
      color: black
    });

    page.drawText("TennisClub Vreden e.V.", {
      x: headerTextX,
      y: 792,
      size: 18,
      font: this.boldFont,
      color: black
    });
    page.drawText("Nachweis Mitgliedsantrag", {
      x: headerTextX,
      y: 772,
      size: 11,
      font: this.regularFont,
      color: mutedColor
    });
    page.drawRectangle({
      x: margin,
      y: 736,
      width: pageWidth - margin * 2,
      height: 5,
      color: yellow
    });
  }
}

function buildConsentRows(application: ApplicationRow): FieldRow[] {
  const confirmedBy = mainPersonName(application);
  const createdAt = formatDate(application.created_at);

  return [
    {
      label: "Satzung / Beiträge / Datenschutz",
      value: `${yesNo(application.accepts_statutes)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "Datenschutz separat",
      value: `${yesNo(application.accepts_privacy)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "SEPA-Lastschriftmandat",
      value: `${yesNo(application.accepts_sepa)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "Foto / Video",
      value: `${yesNo(application.accepts_photo_video)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "WhatsApp / Mobilnummer",
      value: `${yesNo(application.accepts_whatsapp)} | bestätigt am ${createdAt} durch ${confirmedBy}`
    },
    {
      label: "Gesetzliche Vertreter",
      value: `${yesNo(application.guardian_consent)} | ${application.guardian_name ?? "Nicht erfasst"}`
    }
  ];
}

function ebusyPeople(matchPayload: ApplicationMatchPayload) {
  if (matchPayload.createdPeople?.length) {
    return matchPayload.createdPeople.map(
      (person) =>
        `${person.roleLabel ? `${person.roleLabel}: ` : ""}${person.displayName ?? "Person"} - eBuSy-ID ${person.externalPersonId}${person.customerId ? `, Kundennummer ${person.customerId}` : ""}`
    );
  }

  if (matchPayload.createdPerson) {
    return [
      `${matchPayload.createdPerson.displayName ?? "Person"} - eBuSy-ID ${matchPayload.createdPerson.externalPersonId}`
    ];
  }

  return ["Keine eBuSy-Person in der Rückmeldung enthalten."];
}

function ebusyMemberships(matchPayload: ApplicationMatchPayload) {
  if (matchPayload.createdMemberships?.length) {
    return matchPayload.createdMemberships.map(
      (membership) =>
        `${membership.roleLabel ? `${membership.roleLabel}: ` : ""}${membership.displayName ?? "Mitgliedschaft"} - ID ${membership.externalMembershipId}${membership.membershipNumber ? `, Mitgliedsnummer ${membership.membershipNumber}` : ""}`
    );
  }

  if (matchPayload.createdMembership) {
    return [
      `${matchPayload.createdMembership.displayName ?? "Mitgliedschaft"} - ID ${matchPayload.createdMembership.externalMembershipId}`
    ];
  }

  return ["Keine Mitgliedschaft in der Rückmeldung enthalten."];
}

function addAdditionalMember(writer: ConfirmationPdfWriter, member: ApplicationAdditionalMember, index: number) {
  const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || `Zusatzperson ${index + 1}`;

  writer.section(`Zusatzperson ${index + 1}: ${name}`);
  writer.fields([
    { label: "Rolle", value: getAdditionalMemberRelationLabel(member.relation) },
    { label: "Anrede", value: getSalutationLabel(member.salutation) },
    { label: "Vorname", value: member.firstName },
    { label: "Nachname", value: member.lastName },
    { label: "Geburtsdatum", value: formatDate(member.birthDate) },
    { label: "E-Mail", value: member.email },
    { label: "Mobil", value: member.mobile },
    { label: "Adresse", value: address([member.street, member.postalCode, member.city]) }
  ]);
}

export async function buildApplicationConfirmationPdf(
  input: ApplicationConfirmationPdfInput
): Promise<ConfiguredMailAttachment> {
  const { application, transferredAt, matchPayload } = input;
  const generatedAt = new Date().toISOString();
  const document = await PDFDocument.create();
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const writer = new ConfirmationPdfWriter(document, regularFont, boldFont, generatedAt);
  const additionalMembers = Array.isArray(application.family_members)
    ? application.family_members
    : [];

  document.setTitle(`Mitgliedsantrag ${mainPersonName(application)}`);
  document.setAuthor(clubContact.name);
  document.setSubject("Digitale Mitgliedsantragsbestätigung");
  document.setProducer("TC Vreden Antragsplattform");
  document.setCreator("TC Vreden Antragsplattform");
  document.setCreationDate(new Date(generatedAt));

  writer.section("Bestätigung");
  writer.paragraph(confirmationMailPreview.intro, { highlight: true });
  writer.fields([
    { label: "Vorgangs-ID", value: application.id },
    { label: "Antrag gestellt am", value: formatDate(application.created_at) },
    { label: "Intern übernommen am", value: formatDate(transferredAt) },
    { label: "PDF erstellt am", value: formatDate(generatedAt) }
  ]);

  writer.section("Hauptperson");
  writer.fields([
    { label: "Anrede", value: getSalutationLabel(application.salutation) },
    { label: "Vorname", value: application.first_name },
    { label: "Nachname", value: application.last_name },
    { label: "Geburtsdatum", value: formatDate(application.birth_date) },
    { label: "E-Mail", value: application.email },
    { label: "Mobil", value: application.mobile },
    { label: "Telefon", value: application.phone },
    { label: "Adresse", value: address([application.street, application.postal_code, application.city]) }
  ]);

  writer.section("Mitgliedschaft");
  const membershipRows: FieldRow[] = [
    { label: "Mitgliedschaftsart", value: getMembershipLabel(application.membership_kind) }
  ];

  if (isReducedContributionMembership(application.membership_kind)) {
    membershipRows.push({
      label: "Nachweis Schüler:innen / Azubis / Student:innen gültig bis",
      value: formatDate(application.student_status_until)
    });
  }

  writer.fields(membershipRows, membershipRows.length > 1 ? 1 : 2);

  if (additionalMembers.length === 0) {
    writer.section("Zusatzpersonen / Familienmitglieder");
    writer.paragraph("Keine Zusatzpersonen erfasst.");
  } else {
    additionalMembers.forEach((member, index) => addAdditionalMember(writer, member, index));
  }

  writer.section("SEPA / Zahlung");
  writer.fields([
    { label: "Kontoinhaber", value: application.account_holder },
    { label: "IBAN", value: formatIban(application.iban) },
    { label: "Anschrift Kontoinhaber", value: application.account_holder_address },
    { label: "SEPA-Mandat bestätigt", value: yesNo(application.accepts_sepa) }
  ]);

  writer.section("Minderjährige / gesetzliche Vertreter");
  writer.fields([
    { label: "Gesetzliche Vertreter", value: application.guardian_name },
    { label: "E-Mail", value: application.guardian_email },
    { label: "Telefon", value: application.guardian_phone },
    { label: "Zustimmung", value: yesNo(application.guardian_consent) }
  ]);

  writer.section("Bestätigungen und Einwilligungen");
  writer.fields(buildConsentRows(application), 1);

  writer.section("eBuSy-Übernahme");
  writer.paragraph("Personen");
  writer.bulletList(ebusyPeople(matchPayload));
  writer.paragraph("Mitgliedschaften");
  writer.bulletList(ebusyMemberships(matchPayload));

  if (matchPayload.takeoverWarnings?.length) {
    writer.paragraph("Hinweise aus der Übernahme");
    writer.bulletList(matchPayload.takeoverWarnings);
  }

  if (application.notes) {
    writer.section("Hinweise aus dem Antrag");
    writer.paragraph(application.notes);
  }

  writer.section("Rechtliche Hinweise");
  for (const section of confirmationLegalSections) {
    writer.paragraph(section.title);
    writer.paragraph(section.text);
  }
  writer.paragraph(confirmationMailPreview.revocationNote, { highlight: true });

  writer.drawFooters();

  const bytes = await document.save();
  const filename = [
    "mitgliedsantrag",
    safeFilePart(application.last_name),
    safeFilePart(application.first_name),
    safeFilePart(application.id)
  ]
    .filter(Boolean)
    .join("-");

  return {
    filename: `${filename}.pdf`,
    content: Buffer.from(bytes),
    contentType: "application/pdf"
  };
}
