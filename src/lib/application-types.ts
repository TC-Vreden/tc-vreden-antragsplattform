export type ApplicationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  transferred_at: string | null;
  salutation: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  membership_kind: string | null;
  student_status_until: string | null;
  family_members: ApplicationAdditionalMember[];
  accepts_statutes: boolean;
  accepts_privacy: boolean;
  accepts_photo_video: boolean;
  accepts_whatsapp: boolean;
  accepts_sepa: boolean;
  iban: string | null;
  account_holder: string | null;
  account_holder_address: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_consent: boolean;
  notes: string | null;
  ebusy_match_status: string;
  ebusy_person_id: string | null;
  ebusy_match_payload: ApplicationMatchPayload | null;
};

export type ApplicationMatchSummary = {
  status:
    | "match_found"
    | "no_match"
    | "multiple_matches"
    | "needs_review"
    | "person_created"
    | "created_in_ebusy"
    | "error";
  message: string;
  externalPersonId?: string | null;
  candidateCount?: number;
};

export type ApplicationMatchCandidate = {
  externalPersonId: string;
  matchScore: number;
  matchReason: string;
  displayName?: string;
  email?: string;
  birthDate?: string;
  membershipNumber?: string;
  personCode?: string;
  customerId?: string;
  membershipId?: string;
};

export type ApplicationMatchPayload = {
  status:
    | "pending"
    | "match_found"
    | "no_match"
    | "multiple_matches"
    | "needs_review"
    | "person_created"
    | "created_in_ebusy"
    | "error";
  source?: "mock" | "live";
  message?: string;
  candidates: ApplicationMatchCandidate[];
  createdPerson?: {
    externalPersonId: string;
    displayName?: string;
  };
  createdMembership?: {
    externalMembershipId: string;
    displayName?: string;
  };
};

export type ApplicationInput = {
  salutation?: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  email: string;
  phone?: string;
  mobile?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  membershipKind?: string;
  studentStatusUntil?: string;
  familyMembers?: ApplicationAdditionalMember[];
  acceptsStatutes: boolean;
  acceptsPrivacy: boolean;
  acceptsPhotoVideo: boolean;
  acceptsWhatsapp: boolean;
  acceptsSepa: boolean;
  iban?: string;
  accountHolder?: string;
  accountHolderAddress?: string;
  notes?: string;
};

export type ApplicationAdditionalMember = {
  relation?: "partner" | "child" | "family_member";
  salutation?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  email?: string;
  mobile?: string;
  street?: string;
  postalCode?: string;
  city?: string;
};
