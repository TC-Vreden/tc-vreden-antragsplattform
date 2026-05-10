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
