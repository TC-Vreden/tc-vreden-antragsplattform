import { randomBytes } from "node:crypto";
import { mockEbusyLookup, type EbusyMatchResult } from "@/lib/mock-ebusy";
import type { ApplicationRow } from "@/lib/application-types";

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
  code?: string;
  customerId?: string;
  contact?: {
    email?: string;
  };
  user?: {
    email?: string;
    username?: string;
    name?: string;
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

type EbusyCreatedPerson = {
  id?: number;
  name?: string;
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

async function ebusyPost<T>(path: string, payload: unknown): Promise<EbusyApiResponse<T>> {
  const baseUrl = process.env.EBUSY_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("EBUSY_API_BASE_URL fehlt.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const text = await response.text();
  let body: EbusyApiResponse<T> | null = null;

  try {
    body = text ? (JSON.parse(text) as EbusyApiResponse<T>) : null;
  } catch {
    body = null;
  }

  if (!response.ok || body?.error) {
    const details = body?.message || text || response.statusText || "Keine Detailmeldung";
    throw new Error(`eBuSy-Request ${path} fehlgeschlagen: HTTP ${response.status}. ${details}`);
  }

  return body ?? { error: null, message: null };
}

function optionalText(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed || undefined;
}

function buildApplicationComment(application: ApplicationRow) {
  const applicantName = `${application.first_name} ${application.last_name}`.trim();
  const lines = [
    `Digitaler Mitgliedsantrag ${application.id}.`,
    application.membership_kind
      ? `Gewuenschte Mitgliedschaft: ${application.membership_kind}.`
      : undefined,
    application.accepts_sepa ? "SEPA-Lastschrift wurde bestaetigt." : undefined,
    application.accepts_photo_video
      ? "Foto-/Videoeinwilligung: ja."
      : "Foto-/Videoeinwilligung: nein.",
    application.accepts_whatsapp ? "WhatsApp-Einwilligung: ja." : "WhatsApp-Einwilligung: nein.",
    application.account_holder && application.account_holder !== applicantName
      ? `Kontoinhaber: ${application.account_holder}.`
      : undefined,
    application.account_holder_address
      ? `Anschrift Kontoinhaber: ${application.account_holder_address}.`
      : undefined,
    application.iban ? `IBAN aus Antrag: ${application.iban}.` : undefined,
    application.notes ? `Hinweise: ${application.notes}` : undefined
  ];

  return lines.filter(Boolean).join("\n");
}

function pruneEmptyValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneEmptyValues(item))
      .filter((item) => item !== undefined && item !== null) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, pruneEmptyValues(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

function toUsernamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function buildEbusyUsername(application: ApplicationRow) {
  const firstName = toUsernamePart(application.first_name);
  const lastName = toUsernamePart(application.last_name);
  const suffix = application.id.replace(/-/g, "").slice(0, 8);

  return [firstName, lastName, suffix].filter(Boolean).join(".");
}

function buildTemporaryPassword() {
  return `TCV-${randomBytes(9).toString("base64url")}-2026`;
}

export async function createEbusyPersonFromApplication(application: ApplicationRow): Promise<{
  externalPersonId: string;
  displayName: string;
}> {
  const mode = process.env.EBUSY_MATCH_MODE ?? "mock";

  if (mode !== "live") {
    throw new Error("Personenanlage in eBuSy ist nur im Live-Modus erlaubt.");
  }

  const displayName = `${application.first_name} ${application.last_name}`.trim();
  const hasAddress = Boolean(application.street || application.postal_code || application.city);
  const hasContact = Boolean(application.email || application.mobile || application.phone);

  const payload = pruneEmptyValues({
    firstname: application.first_name,
    lastname: application.last_name,
    birthday: optionalText(application.birth_date),
    address: hasAddress
      ? {
          street: optionalText(application.street),
          postcode: optionalText(application.postal_code),
          city: optionalText(application.city),
          country: "Deutschland",
          countryCode: "DE"
        }
      : undefined,
    contact: hasContact
      ? {
          email: optionalText(application.email),
          mobile: optionalText(application.mobile),
          phone: optionalText(application.phone)
        }
      : undefined,
    user: {
      name: buildEbusyUsername(application),
      password: buildTemporaryPassword(),
      enabled: true,
      level: "USER"
    },
    comment: buildApplicationComment(application)
  });

  const result = await ebusyPost<EbusyCreatedPerson>("/general/person", payload);
  const createdPerson = result.response ?? result.result;

  if (!createdPerson?.id) {
    throw new Error("eBuSy hat keine Personen-ID fuer den neuen Datensatz zurueckgegeben.");
  }

  return {
    externalPersonId: String(createdPerson.id),
    displayName: createdPerson.name ?? displayName
  };
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
    const membershipMap = new Map<string, { membershipNumber: string; membershipId: string }>();
    const seenPersonIds = new Set<string>();
    const hasAnyCriteria = Boolean(
      normalizedFirstName || normalizedLastName || normalizedEmail || normalizedBirthDate
    );

    if (!hasAnyCriteria) {
      return {
        status: "no_match",
        source: "live",
        message: "Bitte mindestens ein Suchfeld ausfuellen.",
        candidates: []
      };
    }

    try {
      const membershipPage = await ebusyGet<{
        content?: EbusyMembership[];
      }>("/member/modules/4/memberships?offset=0&limit=100");

      for (const membership of membershipPage.response?.content ?? []) {
        if (membership.personId) {
          membershipMap.set(String(membership.personId), {
            membershipNumber: membership.number ?? "",
            membershipId: membership.id ? String(membership.id) : ""
          });
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
          seenPersonIds.add(String(person.id));
          candidates.push({
            externalPersonId: String(person.id),
            matchScore: 98,
            matchReason: "Treffer ueber E-Mail / Benutzerkennung",
            displayName: `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim(),
            email: person.contact?.email ?? person.user?.username ?? normalizedEmail,
            birthDate: person.birthday,
            membershipNumber: membershipMap.get(String(person.id))?.membershipNumber ?? "",
            membershipId: membershipMap.get(String(person.id))?.membershipId ?? "",
            personCode: person.code ?? "",
            customerId: person.customerId ?? ""
          });
        }
      } catch {
        // We continue with name/date matching below.
      }
    }

    if (candidates.length === 0 && hasAnyCriteria) {
      const pageSize = Number(process.env.EBUSY_PERSON_SCAN_PAGE_SIZE ?? "100");
      const maxPages = Number(process.env.EBUSY_PERSON_SCAN_MAX_PAGES ?? "10");

      for (let page = 0; page < maxPages; page += 1) {
        const offset = page * pageSize;
        const result = await ebusyGet<{ content?: EbusyPerson[] }>(
          `/general/persons?offset=${offset}&limit=${pageSize}`
        );

        const pageMatches = (result.response?.content ?? []).filter((person) => {
          const personId = String(person.id ?? "");
          if (!personId || seenPersonIds.has(personId)) {
            return false;
          }

          const firstNameMatches =
            normalizedFirstName &&
            (person.firstname ?? "").trim().toLowerCase() === normalizedFirstName;
          const lastNameMatches =
            normalizedLastName &&
            (person.lastname ?? "").trim().toLowerCase() === normalizedLastName;
          const birthDateMatches =
            normalizedBirthDate && (person.birthday ?? "").trim() === normalizedBirthDate;
          const emailMatches = normalizedEmail
            ? [
                person.contact?.email,
                person.user?.email,
                person.user?.username,
                person.user?.name
              ]
                .filter(Boolean)
                .some((value) => String(value).trim().toLowerCase() === normalizedEmail)
            : false;

          return Boolean(firstNameMatches || lastNameMatches || birthDateMatches || emailMatches);
        });

        for (const person of pageMatches) {
          seenPersonIds.add(String(person.id ?? ""));
          const matchedFields: string[] = [];

          if (
            normalizedEmail &&
            [
              person.contact?.email,
              person.user?.email,
              person.user?.username,
              person.user?.name
            ]
              .filter(Boolean)
              .some((value) => String(value).trim().toLowerCase() === normalizedEmail)
          ) {
            matchedFields.push("E-Mail");
          }

          if (
            normalizedFirstName &&
            (person.firstname ?? "").trim().toLowerCase() === normalizedFirstName
          ) {
            matchedFields.push("Vorname");
          }

          if (
            normalizedLastName &&
            (person.lastname ?? "").trim().toLowerCase() === normalizedLastName
          ) {
            matchedFields.push("Nachname");
          }

          if (normalizedBirthDate && (person.birthday ?? "").trim() === normalizedBirthDate) {
            matchedFields.push("Geburtsdatum");
          }

          const matchScore = Math.min(99, 68 + matchedFields.length * 10);

          candidates.push({
            externalPersonId: String(person.id ?? ""),
            matchScore,
            matchReason: `Treffer ueber ${matchedFields.join(", ")}`,
            displayName: `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim(),
            email:
              person.contact?.email ??
              person.user?.email ??
              person.user?.username ??
              person.user?.name ??
              "",
            birthDate: person.birthday,
            membershipNumber: membershipMap.get(String(person.id ?? ""))?.membershipNumber ?? "",
            membershipId: membershipMap.get(String(person.id ?? ""))?.membershipId ?? "",
            personCode: person.code ?? "",
            customerId: person.customerId ?? ""
          });
        }

        const content = result.response?.content ?? [];
        if (content.length < pageSize) {
          break;
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((left, right) => right.matchScore - left.matchScore);

      return {
        status: "match_found",
        source: "live",
        message: `${candidates.length} passende Datensaetze wurden intern in eBuSy gefunden.`,
        candidates: candidates.slice(0, 25)
      };
    }

    return {
      status: "no_match",
      source: "live",
      message:
        "Kein passender eBuSy-Treffer ueber E-Mail oder die aktuelle Kombination aus Suchfeldern gefunden.",
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
