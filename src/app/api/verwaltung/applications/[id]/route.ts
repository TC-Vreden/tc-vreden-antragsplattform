import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ message: "Antrags-ID fehlt." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("applications").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Antrag geloescht." });
}
