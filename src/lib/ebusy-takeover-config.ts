import type { ApplicationRow } from "@/lib/application-types";
import { getMembershipLabel } from "@/lib/application-options";
import type {
  EbusyAttributeAssignment,
  EbusyMembershipPayload,
  EbusyPaymentRelationPayload
} from "@/lib/ebusy";

export type EbusyMembershipWriteConfig = {
  moduleId: number;
  sectionIds: number[];
  membershipTypeId: number | null;
  consideredActive: boolean;
  status: "ACTIVE" | "REQUESTED" | "DECLINED";
};

export type EbusySinglePersonTakeoverConfig = {
  membershipKind: string;
  title: string;
  description: string;
  productionEnabled: boolean;
  attributeAssignments: EbusyAttributeAssignment[];
  membership: EbusyMembershipWriteConfig;
};

export type EbusyMultiPersonRole =
  | "main"
  | "partner"
  | "child"
  | "family_member";

export type EbusyMultiPersonMemberConfig = {
  role: EbusyMultiPersonRole;
  title: string;
  attributeAssignments: EbusyAttributeAssignment[];
  membership: EbusyMembershipWriteConfig;
  payerRelation?: EbusyPayerRelationWriteConfig;
};

export type EbusyMultiPersonTakeoverConfig = {
  membershipKind: string;
  title: string;
  productionEnabled: boolean;
  memberConfigs: EbusyMultiPersonMemberConfig[];
  warnings: string[];
};

export type EbusyPayerRelationWriteConfig = Omit<EbusyPaymentRelationPayload, "id"> & {
  payerRole: "main";
};

const activeSimpleMembership: EbusyMembershipWriteConfig = {
  moduleId: 4,
  sectionIds: [1],
  membershipTypeId: null,
  consideredActive: true,
  status: "ACTIVE"
};

const passiveSimpleMembership: EbusyMembershipWriteConfig = {
  moduleId: 4,
  sectionIds: [1],
  membershipTypeId: null,
  consideredActive: false,
  status: "ACTIVE"
};

const defaultMainPayerRelation: EbusyPayerRelationWriteConfig = {
  payerRole: "main",
  moduleIds: [1, 2, 3, 4],
  paysForVouchersAndCoupons: true,
  paysForCustomPurchases: true
};

const familyMainAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeiträge NEU",
    valueId: 18,
    valueName: "Familien"
  }
];

const freeFamilyAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeiträge NEU",
    valueId: 22,
    valueName: "Beitragsfreie Familienangehörige"
  }
];

const adultChildMainAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeiträge NEU",
    valueId: 20,
    valueName: "Erwachsene + 1 Kind"
  }
];

const partnerActiveAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeiträge NEU",
    valueId: 19,
    valueName: "Ehepaare / Lebenspartner aktiv"
  }
];

const partnerPassiveAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeiträge NEU",
    valueId: 33,
    valueName: "Passiv"
  }
];

export const ebusySinglePersonTakeoverConfigs: EbusySinglePersonTakeoverConfig[] = [
  {
    membershipKind: "adult_active",
    title: "Erwachsene Einzelperson",
    description:
      "Prüft die Personen-/Benutzeranlage für ein aktives Erwachsenenmitglied. Optional können danach kontrollierte Attribut- und Mitgliedschaftstests ausgeführt werden; Beitragslogik wird nicht direkt geschrieben.",
    productionEnabled: true,
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 16,
        valueName: "Erwachsene Aktiv"
      }
    ],
    membership: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
  },
  {
    membershipKind: "adult_passive",
    title: "Erwachsene Einzelperson passiv",
    description:
      "Kontrollierter Test für eine passive erwachsene Einzelperson. Nach Live-Bestätigung darf dieser Fall auch produktiv für Einzelpersonen übernommen werden.",
    productionEnabled: true,
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 33,
        valueName: "Passiv"
      }
    ],
    membership: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: false,
      status: "ACTIVE"
    }
  },
  {
    membershipKind: "child",
    title: "Kind bis 14 Jahre",
    description:
      "Kontrollierter Test für ein Kind bis 14 Jahre. Prüft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Kinderübernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestätigt sind.",
    productionEnabled: false,
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 14,
        valueName: "Kinder bis 14 Jahre"
      }
    ],
    membership: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
  },
  {
    membershipKind: "youth_active",
    title: "Jugendliche bis 18 Jahre aktiv",
    description:
      "Kontrollierter Test für Jugendliche bis 18 Jahre. Prüft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Minderjährigenübernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestätigt sind.",
    productionEnabled: false,
    attributeAssignments: [
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeiträge NEU",
        valueId: 17,
        valueName: "Jugendliche bis 18 Jahre"
      }
    ],
    membership: {
      moduleId: 4,
      sectionIds: [1],
      membershipTypeId: null,
      consideredActive: true,
      status: "ACTIVE"
    }
  }
];

export const ebusyMultiPersonTakeoverConfigs: EbusyMultiPersonTakeoverConfig[] = [
  {
    membershipKind: "family",
    title: "Familie",
    productionEnabled: true,
    memberConfigs: [
      {
        role: "main",
        title: "Hauptperson / Familienzahler",
        attributeAssignments: familyMainAttributes,
        membership: activeSimpleMembership
      },
      {
        role: "partner",
        title: "Partner:in / Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      },
      {
        role: "child",
        title: "Kind / Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      },
      {
        role: "family_member",
        title: "Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      }
    ],
    warnings: [
      "Hauptzahlerbezug wird für Zusatzpersonen per eBuSy-Personen-Patch gesetzt und muss im Testlabor fachlich kontrolliert werden.",
      "Beitragsarten werden weiterhin nicht geschrieben; die Zuordnung läuft über das Attribut Mitgliedsbeiträge NEU."
    ]
  },
  {
    membershipKind: "adult_child",
    title: "Erwachsene + 1 Kind",
    productionEnabled: true,
    memberConfigs: [
      {
        role: "main",
        title: "Hauptperson / Zahler",
        attributeAssignments: adultChildMainAttributes,
        membership: activeSimpleMembership
      },
      {
        role: "child",
        title: "Kind",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      },
      {
        role: "family_member",
        title: "Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      }
    ],
    warnings: [
      "Hauptzahlerbezug wird für Zusatzpersonen per eBuSy-Personen-Patch gesetzt und muss im Testlabor fachlich kontrolliert werden.",
      "Beitragsarten werden weiterhin nicht geschrieben; die Zuordnung läuft über das Attribut Mitgliedsbeiträge NEU."
    ]
  },
  {
    membershipKind: "partner_active",
    title: "Ehepartner / Lebenspartner aktiv",
    productionEnabled: true,
    memberConfigs: [
      {
        role: "main",
        title: "Hauptperson",
        attributeAssignments: partnerActiveAttributes,
        membership: activeSimpleMembership
      },
      {
        role: "partner",
        title: "Partner:in",
        attributeAssignments: partnerActiveAttributes,
        membership: activeSimpleMembership,
        payerRelation: defaultMainPayerRelation
      }
    ],
    warnings: [
      "Hauptzahlerbezug wird für die zweite Person per eBuSy-Personen-Patch gesetzt und muss im Testlabor fachlich kontrolliert werden.",
      "Beitragsarten werden weiterhin nicht geschrieben; die Zuordnung läuft über das Attribut Mitgliedsbeiträge NEU."
    ]
  },
  {
    membershipKind: "partner_passive",
    title: "Ehepartner / Lebenspartner passiv",
    productionEnabled: true,
    memberConfigs: [
      {
        role: "main",
        title: "Hauptperson",
        attributeAssignments: partnerPassiveAttributes,
        membership: passiveSimpleMembership
      },
      {
        role: "partner",
        title: "Partner:in",
        attributeAssignments: partnerPassiveAttributes,
        membership: passiveSimpleMembership,
        payerRelation: defaultMainPayerRelation
      }
    ],
    warnings: [
      "Hauptzahlerbezug wird für die zweite Person per eBuSy-Personen-Patch gesetzt und muss im Testlabor fachlich kontrolliert werden.",
      "Beitragsarten werden weiterhin nicht geschrieben; die Zuordnung läuft über das Attribut Mitgliedsbeiträge NEU."
    ]
  }
];

export function getEbusySinglePersonTakeoverConfig(membershipKind: string | null | undefined) {
  return ebusySinglePersonTakeoverConfigs.find(
    (config) => config.membershipKind === membershipKind
  );
}

export function getProductionEbusySinglePersonTakeoverConfig(
  membershipKind: string | null | undefined
) {
  const config = getEbusySinglePersonTakeoverConfig(membershipKind);

  return config?.productionEnabled ? config : undefined;
}

export function getEbusyMultiPersonTakeoverConfig(membershipKind: string | null | undefined) {
  return ebusyMultiPersonTakeoverConfigs.find(
    (config) => config.membershipKind === membershipKind
  );
}

export function getProductionEbusyMultiPersonTakeoverConfig(
  membershipKind: string | null | undefined
) {
  const config = getEbusyMultiPersonTakeoverConfig(membershipKind);

  return config?.productionEnabled ? config : undefined;
}

export function getEbusyMultiPersonMemberConfig(
  config: EbusyMultiPersonTakeoverConfig,
  role: EbusyMultiPersonRole
) {
  const memberConfig =
    config.memberConfigs.find((memberConfig) => memberConfig.role === role) ??
    config.memberConfigs.find((memberConfig) => memberConfig.role === "family_member") ??
    config.memberConfigs[0];

  if (!memberConfig) {
    throw new Error(`Keine eBuSy-Konfiguration für Mehrpersonen-Rolle ${role} gefunden.`);
  }

  return memberConfig;
}

export function buildEbusyMembershipPayloadForApplication(
  application: ApplicationRow,
  personId: number,
  config: EbusyMembershipWriteConfig,
  membershipNumber?: string,
  commentPrefix = "Automatischer eBuSy-Test für Antrag"
): EbusyMembershipPayload {
  return {
    begin: application.created_at.slice(0, 10),
    personId,
    membershipTypeId: config.membershipTypeId,
    consideredActive: config.consideredActive,
    status: config.status,
    sections: config.sectionIds,
    number: membershipNumber,
    comment: `${commentPrefix} ${application.id}.`
  };
}

export function getEbusyTakeoverMembershipLabel(application: ApplicationRow) {
  return getMembershipLabel(application.membership_kind);
}
