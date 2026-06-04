import { cookies, headers } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-server";
import {
  getInternalRolePermissions,
  hasInternalPermission,
  isInternalRole,
  type InternalPermission,
  type InternalRole
} from "@/lib/internal-roles";
import {
  isLegacyBasicAuthCookieValueValid,
  LEGACY_BASIC_AUTH_COOKIE_NAME
} from "@/lib/legacy-basic-auth-cookie";

export type InternalUserStatus = "invited" | "active" | "disabled";

export type InternalUserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: InternalRole;
  status: InternalUserStatus;
  invited_at: string | null;
  accepted_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalActor = {
  authMode: "supabase" | "basic";
  userId: string | null;
  email: string;
  displayName: string | null;
  role: InternalRole;
  status: InternalUserStatus;
  permissions: readonly InternalPermission[];
};

export class InternalAuthError extends Error {
  status: 401 | 403 | 503;

  constructor(message: string, status: 401 | 403 | 503) {
    super(message);
    this.name = "InternalAuthError";
    this.status = status;
  }
}

function isInternalUserStatus(value: string | null | undefined): value is InternalUserStatus {
  return value === "invited" || value === "active" || value === "disabled";
}

function toProfile(row: Record<string, unknown>): InternalUserProfile | null {
  const role = typeof row.role === "string" && isInternalRole(row.role) ? row.role : null;
  const status =
    typeof row.status === "string" && isInternalUserStatus(row.status) ? row.status : null;

  if (!role || !status || typeof row.id !== "string" || typeof row.email !== "string") {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    role,
    status,
    invited_at: typeof row.invited_at === "string" ? row.invited_at : null,
    accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
    last_seen_at: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : ""
  };
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getBootstrapAdminEmails() {
  return (process.env.INTERNAL_BOOTSTRAP_ADMIN_EMAIL ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

function isBootstrapAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  return Boolean(normalizedEmail && getBootstrapAdminEmails().includes(normalizedEmail));
}

function isLegacyBasicAuthFallbackEnabled() {
  return process.env.INTERNAL_BASIC_AUTH_FALLBACK_ENABLED !== "false";
}

function decodeBasicAuthHeaderCandidates(authHeader: string | null | undefined) {
  if (!authHeader?.startsWith("Basic ")) {
    return [];
  }

  try {
    const bytes = Buffer.from(authHeader.slice(6), "base64");
    const decodedCandidates = [
      new TextDecoder("utf-8").decode(bytes),
      new TextDecoder("windows-1252").decode(bytes),
      new TextDecoder("iso-8859-1").decode(bytes)
    ];

    return Array.from(new Set(decodedCandidates))
      .map((decoded) => {
        const separatorIndex = decoded.indexOf(":");

        if (separatorIndex < 0) {
          return null;
        }

        return {
          username: decoded.slice(0, separatorIndex),
          password: decoded.slice(separatorIndex + 1)
        };
      })
      .filter(
        (credentials): credentials is { username: string; password: string } =>
          Boolean(credentials)
      );
  } catch {
    return [];
  }
}

async function getLegacyBasicAuthActor(
  authHeader: string | null | undefined,
  legacyCookieValue: string | null | undefined
): Promise<InternalActor | null> {
  if (!isLegacyBasicAuthFallbackEnabled()) {
    return null;
  }

  const expectedUsername = process.env.INTERNAL_ACCESS_USERNAME;
  const expectedPassword = process.env.INTERNAL_ACCESS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return null;
  }

  const credentials = decodeBasicAuthHeaderCandidates(authHeader);
  const hasMatchingCredentials = credentials.some(
    (candidate) =>
      candidate.username === expectedUsername && candidate.password === expectedPassword
  );
  const hasMatchingCookie = await isLegacyBasicAuthCookieValueValid(
    legacyCookieValue,
    expectedUsername,
    expectedPassword
  );

  if (!hasMatchingCredentials && !hasMatchingCookie) {
    return null;
  }

  return {
    authMode: "basic",
    userId: null,
    email: `legacy-basic-auth:${expectedUsername}`,
    displayName: "Übergangs-Basic-Auth",
    role: "admin",
    status: "active",
    permissions: getInternalRolePermissions("admin")
  };
}

export async function getSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always set cookies. Middleware refreshes them.
        }
      }
    }
  });
}

async function upsertBootstrapProfile(user: User): Promise<InternalUserProfile | null> {
  if (!isBootstrapAdminEmail(user.email)) {
    return null;
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("internal_user_profiles")
    .upsert(
      {
        id: user.id,
        email: normalizeEmail(user.email),
        display_name:
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name
            : null,
        role: "admin",
        status: "active",
        accepted_at: now,
        last_seen_at: now
      },
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return toProfile(data);
}

async function getProfileForUser(user: User): Promise<InternalUserProfile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("internal_user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  let profile = data ? toProfile(data) : null;

  if (!profile) {
    profile = await upsertBootstrapProfile(user);
  }

  if (!profile || profile.status === "disabled") {
    return profile;
  }

  const now = new Date().toISOString();
  const updatePayload =
    profile.status === "invited"
      ? {
          status: "active",
          accepted_at: profile.accepted_at ?? now,
          last_seen_at: now
        }
      : {
          last_seen_at: now
        };

  const { data: updatedProfile } = await supabase
    .from("internal_user_profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select("*")
    .single();

  return toProfile((updatedProfile as Record<string, unknown> | null) ?? profile);
}

function actorFromProfile(profile: InternalUserProfile): InternalActor {
  return {
    authMode: "supabase",
    userId: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    status: profile.status,
    permissions: getInternalRolePermissions(profile.role)
  };
}

export async function getCurrentInternalActor(options?: {
  allowLegacyBasicAuth?: boolean;
  authorizationHeader?: string | null;
}): Promise<InternalActor | null> {
  const allowLegacyBasicAuth = options?.allowLegacyBasicAuth ?? true;
  const supabase = await getSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfileForUser(user);

    return profile ? actorFromProfile(profile) : null;
  }

  if (!allowLegacyBasicAuth) {
    return null;
  }

  const authHeader =
    options?.authorizationHeader ?? (await headers()).get("authorization");
  const legacyCookieValue = (await cookies()).get(LEGACY_BASIC_AUTH_COOKIE_NAME)?.value;

  return getLegacyBasicAuthActor(authHeader, legacyCookieValue);
}

export async function requireInternalPagePermission(permission: InternalPermission) {
  const actor = await getCurrentInternalActor();

  if (!actor) {
    redirect(`/verwaltung/login?next=${encodeURIComponent("/verwaltung")}` as Route);
  }

  if (actor.status === "disabled") {
    redirect("/verwaltung/login?reason=disabled" as Route);
  }

  if (!hasInternalPermission(actor.role, permission)) {
    redirect("/verwaltung/login?reason=forbidden" as Route);
  }

  return actor;
}

export async function requireInternalApiPermission(
  permission: InternalPermission,
  request: Request
) {
  const actor = await getCurrentInternalActor({
    authorizationHeader: request.headers.get("authorization")
  });

  if (!actor) {
    throw new InternalAuthError("Bitte intern anmelden.", 401);
  }

  if (actor.status === "disabled") {
    throw new InternalAuthError("Dieser interne Zugang ist gesperrt.", 403);
  }

  if (!hasInternalPermission(actor.role, permission)) {
    throw new InternalAuthError("Für diese Aktion fehlt die Berechtigung.", 403);
  }

  return actor;
}

export function internalAuthErrorResponse(error: unknown) {
  if (error instanceof InternalAuthError) {
    return Response.json(
      {
        message: error.message
      },
      {
        status: error.status
      }
    );
  }

  return null;
}

export function getSafeInternalNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/verwaltung";
  }

  if (value.startsWith("/auth/")) {
    return "/verwaltung";
  }

  return value;
}
