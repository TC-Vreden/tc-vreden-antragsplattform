import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { createApplicationPersonInEbusy } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("ebusy.takeover", request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Antrags-ID fehlt." }, { status: 400 });
    }

    const result = await createApplicationPersonInEbusy(id).catch((error) => ({
      status: "error" as const,
      message:
        error instanceof Error ? error.message : "Die Person konnte nicht in eBuSy angelegt werden."
    }));

    await writeInternalAuditLog({
      actor,
      action: "application.ebusy_takeover",
      entityType: "application",
      entityId: id,
      details: {
        resultStatus: result.status,
        externalPersonId: "externalPersonId" in result ? result.externalPersonId ?? null : null
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
          error instanceof Error ? error.message : "Die Person konnte nicht in eBuSy angelegt werden."
      },
      { status: 500 }
    );
  }
}
