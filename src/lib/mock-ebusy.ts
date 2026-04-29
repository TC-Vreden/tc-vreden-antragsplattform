export type EbusyMatchResult = {
  status: "pending" | "match_found" | "no_match";
  candidates: Array<{
    externalPersonId: string;
    matchScore: number;
    matchReason: string;
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
    candidates: []
  };
}
