export type ConfirmationPerson = {
  salutation: "Herr" | "Frau";
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  mobile: string;
  phone?: string;
  street: string;
  postalCode: string;
  city: string;
};

export type ConfirmationAdditionalPerson = ConfirmationPerson & {
  role: string;
  membershipNote: string;
  legalRepresentative?: string;
};

export type ConfirmationSection = {
  title: string;
  text: string;
};

export type ConfirmationConsentEvidence = {
  key: string;
  title: string;
  checked: boolean;
  confirmedAt: string | null;
  confirmedBy: string;
  text: string;
};

export type ConfirmationApplicationPreview = {
  processId: string;
  applicationCreatedAt: string;
  approvedAt: string;
  ebusyPersonIds: string[];
  mainPerson: ConfirmationPerson;
  additionalPeople: ConfirmationAdditionalPerson[];
  membershipLabel: string;
  contributionNote: string;
  youthTrainingNote: string;
  bankAccount: {
    holder: string;
    holderAddress: string;
    iban: string;
    bank: string;
    mandateDate: string;
  };
  consent: {
    statutesAndRules: boolean;
    privacy: boolean;
    sepa: boolean;
    photoVideo: boolean;
    whatsapp: boolean;
    minorConsent: boolean;
  };
  notes: string;
};

export const confirmationDocumentVersion = "mitgliedsantrag-2026-preview-2026-05-11";

export const clubContact = {
  name: "TennisClub Vreden e.V.",
  address: "Ottensteiner Str. 59, 48691 Vreden",
  email: "mail@tennisclub-vreden.de",
  website: "www.tennisclub-vreden.de",
  statutesUrl: "https://tennisclub-vreden.de/wp-content/uploads/2024/04/TennisClubVreden-Satzung.pdf"
};

export const confirmationPreviewApplication: ConfirmationApplicationPreview = {
  processId: "tcv-demo-2026-0001",
  applicationCreatedAt: "2026-05-11T09:14:00+02:00",
  approvedAt: "2026-05-11T10:02:00+02:00",
  ebusyPersonIds: ["842", "843", "844", "845"],
  membershipLabel: "Familie - 290 EUR/Jahr",
  contributionNote:
    "Der Familienbeitrag wird gemäß Beitragsübersicht 2026 geführt. Jugendtraining ist nicht im Mitgliedsbeitrag enthalten.",
  youthTrainingNote:
    "Jugendtraining ist ein separater Leistungsblock. Laut Informationsblatt gelten für das Sommertraining und Wintertraining eigene Trainingsgebühren; die Teilnahme muss separat organisiert und abgerechnet werden.",
  mainPerson: {
    salutation: "Herr",
    firstName: "Max",
    lastName: "Mustermann",
    birthDate: "1988-04-12",
    email: "max.mustermann@example.com",
    mobile: "0151 00000010",
    phone: "02861 000010",
    street: "Musterweg 12",
    postalCode: "48691",
    city: "Vreden"
  },
  additionalPeople: [
    {
      role: "Partnerin / Familienmitglied",
      membershipNote: "Beitragsfreie Familienangehörige, finale Zuordnung in eBuSy nach Vereinsfreigabe.",
      salutation: "Frau",
      firstName: "Maria",
      lastName: "Mustermann",
      birthDate: "1990-09-03",
      email: "maria.mustermann@example.com",
      mobile: "0151 00000011",
      phone: "02861 000011",
      street: "Musterweg 12",
      postalCode: "48691",
      city: "Vreden"
    },
    {
      role: "Kind / Familienmitglied",
      membershipNote: "Minderjährige Zusatzperson im Familienantrag.",
      legalRepresentative: "Max Mustermann und Maria Mustermann",
      salutation: "Frau",
      firstName: "Mia",
      lastName: "Mustermann",
      birthDate: "2016-03-05",
      email: "familie.mustermann@example.com",
      mobile: "0151 00000012",
      phone: "02861 000012",
      street: "Musterweg 12",
      postalCode: "48691",
      city: "Vreden"
    },
    {
      role: "Jugendlicher / Familienmitglied",
      membershipNote: "Minderjährige Zusatzperson im Familienantrag.",
      legalRepresentative: "Max Mustermann und Maria Mustermann",
      salutation: "Herr",
      firstName: "Jonas",
      lastName: "Mustermann",
      birthDate: "2010-10-04",
      email: "jonas.mustermann@example.com",
      mobile: "0151 00000013",
      phone: "02861 000013",
      street: "Musterweg 12",
      postalCode: "48691",
      city: "Vreden"
    }
  ],
  bankAccount: {
    holder: "Max Mustermann",
    holderAddress: "Musterweg 12, 48691 Vreden",
    iban: "DE89370400440532013000",
    bank: "Commerzbank",
    mandateDate: "2026-05-11"
  },
  consent: {
    statutesAndRules: true,
    privacy: true,
    sepa: true,
    photoVideo: true,
    whatsapp: true,
    minorConsent: true
  },
  notes:
    "Demo mit vollständig ausgefüllten Testdaten für die optische Prüfung der späteren PDF- und E-Mail-Bestätigung."
};

export const confirmationLegalSections: ConfirmationSection[] = [
  {
    title: "Satzung, Beiträge, Platzpflege und Datenschutz",
    text:
      "Die antragstellende Person bestätigt, dass Satzung, Beitragsordnung, Platzpflegeordnung und Datenschutzbestimmungen des TennisClub Vreden e.V. als verbindlich anerkannt werden. Die Satzung wird im digitalen Prozess verlinkt; Beiträge und Hinweise stammen aus den vorliegenden Vereinsunterlagen 2026."
  },
  {
    title: "SEPA-Lastschriftmandat",
    text:
      "Der TennisClub Vreden e.V. wird ermächtigt, fällige Mitgliedsbeiträge und sonstige satzungsgemäße Forderungen per SEPA-Lastschrift einzuziehen. Die Mandatsreferenz wird durch den Verein bzw. eBuSy vergeben. Die Bankdaten werden zur Beitragsabrechnung verwendet."
  },
  {
    title: "Minderjährige und gesetzliche Vertreter",
    text:
      "Bei minderjährigen Mitgliedern bestätigen die gesetzlichen Vertreter den Eintritt und die daraus entstehenden Verpflichtungen aus Mitgliedschaft und Spielbetrieb. Im digitalen Prozess werden diese Daten im Antrag und in der PDF-Zusammenfassung dokumentiert."
  },
  {
    title: "Foto- und Videoeinwilligung",
    text:
      "Die Einwilligung zur Nutzung von Foto- und Videoaufnahmen für Vereinszwecke, Internetseite, soziale Medien und Printmedien ist freiwillig und kann mit Wirkung für die Zukunft widerrufen werden. Sie gilt nicht als Voraussetzung für die Mitgliedschaft."
  },
  {
    title: "WhatsApp- und Kommunikationshinweise",
    text:
      "Die Mobilnummer darf für vereinsbezogene WhatsApp-Gruppen und organisatorische Kommunikation genutzt werden. Die Einwilligung ist freiwillig und widerrufbar; innerhalb von WhatsApp-Gruppen kann die Nummer für andere Gruppenmitglieder sichtbar sein."
  },
  {
    title: "Datenschutz / DSGVO",
    text:
      "Personenbezogene Daten werden zur Bearbeitung des Mitgliedsantrags, zur Mitgliederverwaltung, zur Beitragsabrechnung, zur Sportorganisation und zur Vereinskommunikation verarbeitet. Betroffene Personen haben insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde."
  }
];

export const confirmationMailPreview = {
  subject: "Bestätigung deiner Mitgliedschaft beim TennisClub Vreden e.V.",
  bcc: clubContact.email,
  intro:
    "vielen Dank für den digitalen Mitgliedsantrag. Wir haben den Antrag intern geprüft und die Daten in unsere Vereinsverwaltung übernommen.",
  attachmentNote:
    "Im Anhang befindet sich eine PDF-Zusammenfassung mit den eingereichten Daten, den bestätigten Einwilligungen und den wichtigsten Hinweisen.",
  revocationNote:
    "Freiwillige Einwilligungen, zum Beispiel Foto/Video oder WhatsApp-Kommunikation, können jederzeit mit Wirkung für die Zukunft widerrufen werden."
};

export function formatGermanDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatGermanDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatConsent(value: boolean) {
  return value ? "Ja" : "Nein";
}

export function getConfirmationConsentEvidence(
  application: ConfirmationApplicationPreview
): ConfirmationConsentEvidence[] {
  const confirmedBy = `${application.mainPerson.salutation} ${application.mainPerson.firstName} ${application.mainPerson.lastName}`;
  const confirmedAt = application.applicationCreatedAt;

  return [
    {
      key: "statutes-and-rules",
      title: "Satzung / Beiträge / Datenschutz",
      checked: application.consent.statutesAndRules,
      confirmedAt: application.consent.statutesAndRules ? confirmedAt : null,
      confirmedBy,
      text:
        "Satzung, Beitragsinformationen, Vereins-/Platzregeln und Datenschutzbestimmungen wurden gelesen und als verbindlich anerkannt."
    },
    {
      key: "privacy",
      title: "Datenschutz- und DSGVO-Hinweise",
      checked: application.consent.privacy,
      confirmedAt: application.consent.privacy ? confirmedAt : null,
      confirmedBy,
      text:
        "Die Hinweise zur Verarbeitung der Antrags- und Mitgliedsdaten wurden gelesen und verstanden."
    },
    {
      key: "sepa",
      title: "SEPA-Lastschriftmandat",
      checked: application.consent.sepa,
      confirmedAt: application.consent.sepa ? confirmedAt : null,
      confirmedBy,
      text:
        "Das SEPA-Lastschriftmandat wurde aktiv bestätigt; Kontoinhaber, IBAN und Mandatsdatum werden im Antrag dokumentiert."
    },
    {
      key: "photo-video",
      title: "Foto- und Videoeinwilligung",
      checked: application.consent.photoVideo,
      confirmedAt: application.consent.photoVideo ? confirmedAt : null,
      confirmedBy,
      text:
        "Die freiwillige Foto-/Videoeinwilligung für Vereinszwecke wurde aktiv erteilt und kann mit Wirkung für die Zukunft widerrufen werden."
    },
    {
      key: "whatsapp",
      title: "WhatsApp- und Mobilnummer-Kommunikation",
      checked: application.consent.whatsapp,
      confirmedAt: application.consent.whatsapp ? confirmedAt : null,
      confirmedBy,
      text:
        "Die freiwillige Einwilligung zur Nutzung der Mobilnummer für WhatsApp- und Vereinskommunikation wurde aktiv erteilt und kann widerrufen werden."
    },
    {
      key: "minor-consent",
      title: "Minderjährige / gesetzliche Vertreter",
      checked: application.consent.minorConsent,
      confirmedAt: application.consent.minorConsent ? confirmedAt : null,
      confirmedBy,
      text:
        "Die Angaben zu minderjährigen Mitgliedern und gesetzlichen Vertretern wurden bestätigt und sollen in der späteren PDF-Zusammenfassung nachvollziehbar dokumentiert werden."
    }
  ];
}
