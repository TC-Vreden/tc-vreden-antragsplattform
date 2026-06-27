import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabasePublicClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const HEARTBEAT_ID = "supabase-free-plan-heartbeat";

function getExpectedCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET fehlt.");
  }

  return secret;
}

function isAuthorizedCronRequest(request: NextRequest) {
  const expectedSecret = getExpectedCronSecret();
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${expectedSecret}`;
}

async function writeServiceRoleHeartbeat(request: NextRequest, triggeredAt: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_heartbeat")
    .upsert(
      {
        id: HEARTBEAT_ID,
        updated_at: triggeredAt,
        source: "vercel-cron-service-role",
        last_result: "ok",
        details: {
          triggeredAt,
          userAgent: request.headers.get("user-agent")
        }
      },
      { onConflict: "id" }
    )
    .select("id, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function writePublicRpcHeartbeat() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase.rpc("touch_system_heartbeat");

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const triggeredAt = new Date().toISOString();
    const serviceRoleHeartbeat = await writeServiceRoleHeartbeat(request, triggeredAt);
    const publicRpcHeartbeat = await writePublicRpcHeartbeat();

    return NextResponse.json({
      ok: true,
      id: publicRpcHeartbeat?.id ?? serviceRoleHeartbeat?.id ?? HEARTBEAT_ID,
      updatedAt:
        publicRpcHeartbeat?.updated_at ?? serviceRoleHeartbeat?.updated_at ?? triggeredAt,
      serviceRoleUpdatedAt: serviceRoleHeartbeat?.updated_at ?? triggeredAt,
      publicRpcUpdatedAt: publicRpcHeartbeat?.updated_at ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Heartbeat konnte nicht geschrieben werden."
      },
      { status: 500 }
    );
  }
}
