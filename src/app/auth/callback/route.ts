import type { Route } from "next";
import { redirect } from "next/navigation";
import { getSafeInternalNextPath, getSupabaseAuthServerClient } from "@/lib/internal-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeInternalNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseAuthServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect(next as Route);
}
