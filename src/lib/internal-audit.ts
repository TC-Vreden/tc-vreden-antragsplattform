import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type { InternalActor } from "@/lib/internal-auth";

type AuditDetails = Record<string, unknown>;

export type InternalAuditLogEntry = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: AuditDetails;
};

function redactAuditValue(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase();

  if (
    normalizedKey.includes("password") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("key") ||
    normalizedKey.includes("iban")
  ) {
    return "<redacted>";
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === "object" && entry !== null ? sanitizeAuditDetails(entry) : entry
    );
  }

  if (typeof value === "object" && value !== null) {
    return sanitizeAuditDetails(value);
  }

  return value;
}

export function sanitizeAuditDetails(value: unknown): AuditDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, redactAuditValue(key, entryValue)])
  );
}

export async function writeInternalAuditLog(input: {
  actor: InternalActor;
  action: string;
  entityType?: string;
  entityId?: string | null;
  details?: AuditDetails;
}) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("internal_audit_log").insert({
      actor_user_id: input.actor.userId,
      actor_email: input.actor.email,
      actor_role: input.actor.role,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      details: sanitizeAuditDetails(input.details ?? {})
    });

    if (error) {
      console.warn(`Audit-Log konnte nicht geschrieben werden: ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `Audit-Log konnte nicht geschrieben werden: ${
        error instanceof Error ? error.message : "Unbekannter Fehler"
      }`
    );
  }
}

export async function getInternalAuditLog(limit = 100): Promise<{
  entries: InternalAuditLogEntry[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("internal_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return {
      entries: (data as InternalAuditLogEntry[] | null) ?? []
    };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : "Audit-Log konnte nicht geladen werden."
    };
  }
}
