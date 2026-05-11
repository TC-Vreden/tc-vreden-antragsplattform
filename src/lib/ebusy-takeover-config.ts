import type { ApplicationRow } from "@/lib/application-types";
import { getMembershipLabel } from "@/lib/application-options";
import type { EbusyAttributeAssignment, EbusyMembershipPayload } from "@/lib/ebusy";

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
};

export type EbusyMultiPersonTakeoverConfig = {
  membershipKind: string;
  title: string;
  productionEnabled: boolean;
  memberConfigs: EbusyMultiPersonMemberConfig[];
  warnings: string[];
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

const familyMainAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 4,
    attributeName: "Status Quo - Beitragsarten TENNIS RW",
    valueId: 6,
    valueName: "3 Familienbeitrag"
  },
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeitraege NEU",
    valueId: 18,
    valueName: "Familien"
  },
  {
    attributeId: 7,
    attributeName: "Status Quo TCH",
    valueId: 32,
    valueName: "Familienbeitrag"
  }
];

const freeFamilyAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 4,
    attributeName: "Status Quo - Beitragsarten TENNIS RW",
    valueId: 5,
    valueName: "9 beitragsfrei z.B. wg. Familienzugehoerigkeit"
  },
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeitraege NEU",
    valueId: 22,
    valueName: "Beitragsfreie Familienangehoerige"
  },
  {
    attributeId: 7,
    attributeName: "Status Quo TCH",
    valueId: 26,
    valueName: "Beitragsfrei Familie"
  }
];

const adultChildMainAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeitraege NEU",
    valueId: 20,
    valueName: "Erwachsene + 1 Kind"
  },
  {
    attributeId: 7,
    attributeName: "Status Quo TCH",
    valueId: 23,
    valueName: "1 Erwachsener + 1 Kind"
  }
];

const partnerActiveAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeitraege NEU",
    valueId: 19,
    valueName: "Ehepaare / Lebenspartner aktiv"
  },
  {
    attributeId: 7,
    attributeName: "Status Quo TCH",
    valueId: 29,
    valueName: "Ehepaare / Lebenspartner"
  }
];

const partnerPassiveAttributes: EbusyAttributeAssignment[] = [
  {
    attributeId: 4,
    attributeName: "Status Quo - Beitragsarten TENNIS RW",
    valueId: 10,
    valueName: "7 Beitrag Passiv"
  },
  {
    attributeId: 6,
    attributeName: "Mitgliedsbeitraege NEU",
    valueId: 33,
    valueName: "Passiv"
  },
  {
    attributeId: 7,
    attributeName: "Status Quo TCH",
    valueId: 31,
    valueName: "Passiv"
  }
];

export const ebusySinglePersonTakeoverConfigs: EbusySinglePersonTakeoverConfig[] = [
  {
    membershipKind: "adult_active",
    title: "Erwachsene Einzelperson",
    description:
      "Prueft die Personen-/Benutzeranlage fuer ein aktives Erwachsenenmitglied. Optional koennen danach kontrollierte Attribut- und Mitgliedschaftstests ausgefuehrt werden; Beitragslogik wird nicht direkt geschrieben.",
    productionEnabled: true,
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 8,
        valueName: "1 Beitrag 1. Erwachsene/r"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 16,
        valueName: "Erwachsene Aktiv"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 30,
        valueName: "Erwachsene"
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
      "Kontrollierter Test fuer eine passive erwachsene Einzelperson. Nach Live-Bestaetigung darf dieser Fall auch produktiv fuer Einzelpersonen uebernommen werden.",
    productionEnabled: true,
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 10,
        valueName: "7 Beitrag Passiv"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 33,
        valueName: "Passiv"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 31,
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
      "Kontrollierter Test fuer ein Kind bis 14 Jahre. Prueft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Kinderuebernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestaetigt sind.",
    productionEnabled: false,
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 12,
        valueName: "4 Beitrag Kinder, Jugendl. bis 16"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 14,
        valueName: "Kinder bis 14 Jahre"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 25,
        valueName: "1. Kind/Jugendlicher bis 18 Jahre"
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
      "Kontrollierter Test fuer Jugendliche bis 18 Jahre. Prueft Person, Bank/SEPA, Attribute und einfache aktive Mitgliedschaft. Produktive Minderjaehrigenuebernahme bleibt gesperrt, bis Vertreter-, PDF- und Mailprozess sauber bestaetigt sind.",
    productionEnabled: false,
    attributeAssignments: [
      {
        attributeId: 4,
        attributeName: "Status Quo - Beitragsarten TENNIS RW",
        valueId: 12,
        valueName: "4 Beitrag Kinder, Jugendl. bis 16"
      },
      {
        attributeId: 6,
        attributeName: "Mitgliedsbeitraege NEU",
        valueId: 17,
        valueName: "Jugendliche bis 18 Jahre"
      },
      {
        attributeId: 7,
        attributeName: "Status Quo TCH",
        valueId: 25,
        valueName: "1. Kind/Jugendlicher bis 18 Jahre"
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
        membership: activeSimpleMembership
      },
      {
        role: "child",
        title: "Kind / Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership
      },
      {
        role: "family_member",
        title: "Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership
      }
    ],
    warnings: [
      "Familien-/Hauptzahlerbezug wird noch nicht per API geschrieben.",
      "Beitrags- und Attributmapping fuer Familien bleibt bis zur Vorstandsfreigabe fachlich zu bestaetigen."
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
        membership: activeSimpleMembership
      },
      {
        role: "family_member",
        title: "Familienmitglied",
        attributeAssignments: freeFamilyAttributes,
        membership: activeSimpleMembership
      }
    ],
    warnings: [
      "Das Status-Quo-TENNIS-RW-Attribut fuer Erwachsene + 1 Kind ist noch fachlich offen.",
      "Familien-/Hauptzahlerbezug wird noch nicht per API geschrieben."
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
        membership: activeSimpleMembership
      }
    ],
    warnings: [
      "Das Status-Quo-TENNIS-RW-Attribut fuer Ehepartner/Lebenspartner aktiv ist noch fachlich offen.",
      "Partner-/Haushaltsbezug wird noch nicht per API geschrieben."
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
        membership: passiveSimpleMembership
      }
    ],
    warnings: [
      "Das genaue Partner-/Passiv-Mapping muss vom Vorstand bestaetigt werden.",
      "Partner-/Haushaltsbezug wird noch nicht per API geschrieben."
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
    throw new Error(`Keine eBuSy-Konfiguration fuer Mehrpersonen-Rolle ${role} gefunden.`);
  }

  return memberConfig;
}

export function buildEbusyMembershipPayloadForApplication(
  application: ApplicationRow,
  personId: number,
  config: EbusyMembershipWriteConfig,
  membershipNumber?: string,
  commentPrefix = "Automatischer eBuSy-Test fuer Antrag"
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
