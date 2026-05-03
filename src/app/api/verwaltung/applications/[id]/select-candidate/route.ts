import { NextResponse } from "next/server";
import { linkApplicationToEbusyPerson } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  return NextResponse.json(result, {
    status: result.status === "error" ? 500 : 200
  });
}
