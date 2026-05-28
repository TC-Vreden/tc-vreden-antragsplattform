import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { matchApplicationWithEbusy } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const request = _request;

  try {
    const actor = await requireInternalApiPermission("ebusy.match", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "Antrags-ID fehlt." },
        { status: 400 }
      );
    }

    const result = await matchApplicationWithEbusy(id);

    await writeInternalAuditLog({
      actor,
      action: "application.ebusy_match",
      entityType: "application",
      entityId: id,
      details: {
        resultStatus: result.status,
        candidateCount: result.candidateCount ?? null
      }
    });

    return NextResponse.json(result, {
      status: result.status === "error" ? 500 : 200
    });
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Der eBuSy-Abgleich ist fehlgeschlagen."
      },
      { status: 500 }
    );
  }
}
