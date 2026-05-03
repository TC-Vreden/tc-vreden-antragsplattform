export type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
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
  family_members: Array<{
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    email?: string;
  }>;
  accepts_statutes: boolean;
  accepts_privacy: boolean;
  accepts_photo_video: boolean;
  accepts_whatsapp: boolean;
  accepts_sepa: boolean;
  iban: string | null;
  account_holder: string | null;
  account_holder_address: string | null;
  notes: string | null;
  ebusy_match_status: string;
  ebusy_person_id: string | null;
  ebusy_match_payload: ApplicationMatchPayload | null;
};

export type ApplicationMatchSummary = {
  status: "match_found" | "no_match" | "multiple_matches" | "error";
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
  status: "pending" | "match_found" | "no_match";
  source?: "mock" | "live";
  message?: string;
  candidates: ApplicationMatchCandidate[];
};

export type ApplicationInput = {
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
  familyMembers?: Array<{
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    email?: string;
  }>;
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
