import { NextResponse } from "next/server";
import { createApplicationPersonInEbusy } from "@/lib/verwaltung";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ message: "Antrags-ID fehlt." }, { status: 400 });
  }

  const result = await createApplicationPersonInEbusy(id).catch((error) => ({
    status: "error" as const,
    message:
      error instanceof Error ? error.message : "Die Person konnte nicht in eBuSy angelegt werden."
  }));

  return NextResponse.json(result, {
    status: result.status === "error" ? 500 : 200
  });
}
