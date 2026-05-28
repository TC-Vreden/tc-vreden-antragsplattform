import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { linkApplicationToEbusyPerson } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiPermission("ebusy.takeover", request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      externalPersonId?: string;
    };

    if (!id || !body.externalPersonId) {
      return NextResponse.json(
        { message: "Antrags-ID oder eBuSy-Person fehlt." },
        { status: 400 }
      );
    }

    const result = await linkApplicationToEbusyPerson(id, body.externalPersonId);

    await writeInternalAuditLog({
      actor,
      action: "application.ebusy_select_candidate",
      entityType: "application",
      entityId: id,
      details: {
        resultStatus: result.status,
        externalPersonId: body.externalPersonId
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
          error instanceof Error ? error.message : "Der Kandidat konnte nicht verknuepft werden."
      },
      { status: 500 }
    );
  }
}
