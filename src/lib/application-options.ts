export type MembershipOption = {
  value: string;
  label: string;
};

export const membershipOptions: MembershipOption[] = [
  { value: "adult_active", label: "Erwachsene aktiv - 180 EUR/Jahr" },
  { value: "adult_passive", label: "Erwachsene passiv - 60 EUR/Jahr" },
  { value: "adult_child", label: "Erwachsene + 1 Kind - 230 EUR/Jahr" },
  {
    value: "partner_active",
    label: "Ehepartner / eingetragene Lebenspartner aktiv - 250 EUR/Jahr"
  },
  {
    value: "partner_passive",
    label: "Ehepartner / eingetragene Lebenspartner passiv - 120 EUR/Jahr"
  },
  { value: "family", label: "Familie - 290 EUR/Jahr" },
  { value: "child", label: "Kinder bis 14 Jahre - 50 EUR/Jahr" },
  { value: "youth_active", label: "Jugendliche bis 18 Jahre aktiv - 80 EUR/Jahr" },
  { value: "youth_passive", label: "Jugendliche bis 18 Jahre passiv - 40 EUR/Jahr" },
  {
    value: "student_active",
    label: "Schüler:innen / Azubis / Student:innen bis 27 Jahre aktiv - 100 EUR/Jahr"
  },
  {
    value: "student_passive",
    label: "Schüler:innen / Azubis / Student:innen bis 27 Jahre passiv - 60 EUR/Jahr"
  }
];

export const salutationOptions = [
  { value: "", label: "Bitte auswählen" },
  { value: "MALE", label: "Herr" },
  { value: "FEMALE", label: "Frau" },
  { value: "NONE", label: "Keine Anrede" }
] as const;

export function getMembershipLabel(value: string | null | undefined) {
  return membershipOptions.find((option) => option.value === value)?.label ?? value ?? "-";
}

export function getSalutationLabel(value: string | null | undefined) {
  return salutationOptions.find((option) => option.value === value)?.label ?? value ?? "-";
}

export function isMultiPersonMembership(value: string | null | undefined) {
  return (
    value === "partner_active" ||
    value === "partner_passive" ||
    value === "adult_child" ||
    value === "family"
  );
}

export function getAdditionalMemberRelationLabel(value: string | null | undefined) {
  switch (value) {
    case "partner":
      return "Ehepartner / Lebenspartner";
    case "child":
      return "Kind";
    case "family_member":
      return "Familienmitglied";
    default:
      return value ?? "-";
  }
}
