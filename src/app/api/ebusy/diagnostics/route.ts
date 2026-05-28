import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { getEbusyDiagnostics } from "@/lib/ebusy";

export async function GET(request: Request) {
  try {
    await requireInternalApiPermission("system.read", request);
    const diagnostics = await getEbusyDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Diagnose konnte nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
