import { NextRequest, NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { lookupEbusyPerson } from "@/lib/ebusy";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireInternalApiPermission("ebusy.lookup", request);
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      birthDate?: string;
    };

    const result = await lookupEbusyPerson({
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      email: body.email ?? "",
      birthDate: body.birthDate ?? ""
    });

    await writeInternalAuditLog({
      actor,
      action: "ebusy.lookup",
      entityType: "ebusy_person",
      details: {
        hasFirstName: Boolean(body.firstName?.trim()),
        hasLastName: Boolean(body.lastName?.trim()),
        hasEmail: Boolean(body.email?.trim()),
        hasBirthDate: Boolean(body.birthDate?.trim()),
        candidateCount: result.candidates.length
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Der eBuSy-Lookup ist fehlgeschlagen."
      },
      { status: 500 }
    );
  }
}
