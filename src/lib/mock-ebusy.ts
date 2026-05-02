export type EbusyMatchResult = {
  status: "pending" | "match_found" | "no_match";
  source?: "mock" | "live";
  message?: string;
  candidates: Array<{
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
  }>;
};

export async function mockEbusyLookup(input: {
  firstName: string;
  lastName: string;
  email: string;
}) : Promise<EbusyMatchResult> {
  const normalized = `${input.firstName} ${input.lastName}`.toLowerCase();

  if (normalized.includes("anna") || input.email.toLowerCase().includes("anna")) {
    return {
      status: "match_found",
      source: "mock",
      candidates: [
        {
          externalPersonId: "12345",
          matchScore: 92,
          matchReason: "Mock-Treffer ueber Name/E-Mail"
        }
      ]
    };
  }

  return {
    status: "no_match",
    source: "mock",
    candidates: []
  };
}
