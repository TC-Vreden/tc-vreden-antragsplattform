import type { Route } from "next";
import { redirect } from "next/navigation";
import { getSupabaseAuthServerClient } from "@/lib/internal-auth";

export async function POST() {
  const supabase = await getSupabaseAuthServerClient();
  await supabase.auth.signOut();

  redirect("/verwaltung/login" as Route);
}
