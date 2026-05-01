import { NextRequest, NextResponse } from "next/server";
import { lookupEbusyPerson } from "@/lib/ebusy";

export async function POST(request: NextRequest) {
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

  return NextResponse.json(result);
}
