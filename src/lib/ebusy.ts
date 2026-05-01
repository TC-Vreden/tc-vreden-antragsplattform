import { mockEbusyLookup, type EbusyMatchResult } from "@/lib/mock-ebusy";

type EbusyApiResponse<T> = {
  error: string | null;
  message: string | null;
  response?: T;
  result?: T;
};

type EbusyPerson = {
  id?: number;
  firstname?: string;
  lastname?: string;
  birthday?: string;
  customerId?: string;
  contact?: {
    email?: string;
  };
  user?: {
    email?: string;
    username?: string;
  };
  attributes?: Array<{
    id?: number;
    name?: string;
    value?: {
      id?: number;
      name?: string;
    };
  }>;
};

type EbusyMembership = {
  id?: number;
  personId?: number;
  number?: string;
  status?: string;
};

function getAuthHeaders() {
  const username = process.env.EBUSY_API_USERNAME;
  const password = process.env.EBUSY_API_PASSWORD;

  if (!username || !password) {
    throw new Error("eBuSy-Zugangsdaten fehlen in den Umgebungsvariablen.");
  }

  const encoded = Buffer.from(`${username}:${password}`).toString("base64");

  return {
    Authorization: `Basic ${encoded}`,
    Accept: "application/json"
  };
}

async function ebusyGet<T>(path: string): Promise<EbusyApiResponse<T>> {
  const baseUrl = process.env.EBUSY_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("EBUSY_API_BASE_URL fehlt.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store"
  });

  const text = await response.text();
  let body: EbusyApiResponse<T> | null = null;

  try {
    body = text ? (JSON.parse(text) as EbusyApiResponse<T>) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.message || `HTTP ${response.status}`;
    throw new Error(`eBuSy-Request fehlgeschlagen: ${message}`);
  }

  return body ?? { error: null, message: null };
}

export async function lookupEbusyPerson(input: {
  firstName: string;
  lastName: string;
  email: string;
  birthDate?: string;
}): Promise<EbusyMatchResult> {
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";

  if (mode !== "live") {
    return mockEbusyLookup(input);
  }

  try {
    const candidates: EbusyMatchResult["candidates"] = [];
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedFirstName = input.firstName.trim().toLowerCase();
    const normalizedLastName = input.lastName.trim().toLowerCase();
    const normalizedBirthDate = (input.birthDate ?? "").trim();
    const membershipMap = new Map<string, string>();

    try {
      const membershipPage = await ebusyGet<{
        content?: EbusyMembership[];
      }>("/member/modules/4/memberships?offset=0&limit=100");

      for (const membership of membershipPage.response?.content ?? []) {
        if (membership.personId) {
          membershipMap.set(String(membership.personId), membership.number ?? "");
        }
      }
    } catch {
      // Membership lookup is helpful, but not required for person matching.
    }

    if (normalizedEmail) {
      try {
        const query = encodeURIComponent(normalizedEmail);
        const result = await ebusyGet<EbusyPerson>(`/general/person/by-username/${query}`);
        const person = result.response;

        if (person?.id) {
          candidates.push({
            externalPersonId: String(person.id),
            matchScore: 98,
            matchReason: "Treffer ueber E-Mail / Benutzerkennung",
            displayName: `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim(),
            email: person.contact?.email ?? person.user?.username ?? normalizedEmail,
            birthDate: person.birthday,
            membershipNumber: membershipMap.get(String(person.id)) ?? ""
          });
        }
      } catch {
        // We continue with name/date matching below.
      }
    }

    if (candidates.length === 0 && normalizedFirstName && normalizedLastName) {
      const pageSize = Number(process.env.EBUSY_PERSON_SCAN_PAGE_SIZE ?? "100");
      const maxPages = Number(process.env.EBUSY_PERSON_SCAN_MAX_PAGES ?? "10");

      for (let page = 0; page < maxPages; page += 1) {
        const offset = page * pageSize;
        const result = await ebusyGet<{ content?: EbusyPerson[] }>(
          `/general/persons?offset=${offset}&limit=${pageSize}`
        );

        const pageMatches = (result.response?.content ?? []).filter((person) => {
          const firstNameMatches = (person.firstname ?? "").trim().toLowerCase() === normalizedFirstName;
          const lastNameMatches = (person.lastname ?? "").trim().toLowerCase() === normalizedLastName;
          const birthDateMatches = normalizedBirthDate
            ? (person.birthday ?? "").trim() === normalizedBirthDate
            : true;

          return firstNameMatches && lastNameMatches && birthDateMatches;
        });

        for (const person of pageMatches) {
          candidates.push({
            externalPersonId: String(person.id ?? ""),
            matchScore: normalizedBirthDate ? 96 : 88,
            matchReason: normalizedBirthDate
              ? "Treffer ueber Vorname, Nachname und Geburtsdatum"
              : "Treffer ueber Vorname und Nachname",
            displayName: `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim(),
            email: person.contact?.email ?? person.user?.username ?? "",
            birthDate: person.birthday,
            membershipNumber: membershipMap.get(String(person.id ?? "")) ?? ""
          });
        }

        const content = result.response?.content ?? [];
        if (content.length < pageSize) {
          break;
        }
      }
    }

    if (candidates.length > 0) {
      return {
        status: "match_found",
        source: "live",
        message: "Passende Datensaetze wurden intern in eBuSy gefunden.",
        candidates
      };
    }

    return {
      status: "no_match",
      source: "live",
      message:
        "Kein passender eBuSy-Treffer ueber E-Mail oder die aktuelle Kombination aus Name und Geburtsdatum gefunden.",
      candidates: []
    };
  } catch (error) {
    const fallback = await mockEbusyLookup(input);

    return {
      ...fallback,
      source: "live",
      message:
        error instanceof Error
          ? `${error.message} Der Prototyp faellt deshalb auf einen internen Testabgleich zurueck.`
          : "Der Live-Abgleich ist fehlgeschlagen. Der Prototyp faellt deshalb auf einen internen Testabgleich zurueck."
    };
  }
}

export async function getEbusyDiagnostics() {
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";

  if (mode !== "live") {
    return {
      mode,
      checks: [{ endpoint: "test", ok: true, message: "Testmodus aktiv" }]
    };
  }

  const endpoints = [
    "/general/modules",
    "/general/attributes",
    "/general/groups?offset=0&limit=5",
    "/general/persons?offset=0&limit=1",
    "/member/modules/4/memberships?offset=0&limit=1"
  ];

  const checks = [];

  for (const endpoint of endpoints) {
    try {
      const data = await ebusyGet<unknown>(endpoint);
      checks.push({
        endpoint,
        ok: true,
        message: data.message ?? "OK"
      });
    } catch (error) {
      checks.push({
        endpoint,
        ok: false,
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  }

  return { mode, checks };
}
