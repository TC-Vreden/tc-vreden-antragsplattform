import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

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

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const triggeredAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("system_heartbeat")
      .upsert(
        {
          id: HEARTBEAT_ID,
          updated_at: triggeredAt,
          source: "vercel-cron",
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

    return NextResponse.json({
      ok: true,
      id: data?.id ?? HEARTBEAT_ID,
      updatedAt: data?.updated_at ?? triggeredAt
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
