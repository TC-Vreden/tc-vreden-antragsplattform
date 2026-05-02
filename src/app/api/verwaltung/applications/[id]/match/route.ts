import { NextResponse } from "next/server";
import { matchApplicationWithEbusy } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { message: "Antrags-ID fehlt." },
      { status: 400 }
    );
  }

  const result = await matchApplicationWithEbusy(id);

  return NextResponse.json(result, {
    status: result.status === "error" ? 500 : 200
  });
}
