import { NextResponse } from "next/server";
import { getEbusyDiagnostics } from "@/lib/ebusy";

export async function GET() {
  const diagnostics = await getEbusyDiagnostics();
  return NextResponse.json(diagnostics);
}
