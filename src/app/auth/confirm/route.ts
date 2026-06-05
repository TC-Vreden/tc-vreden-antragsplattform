import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSafeInternalNextPath, getSupabaseAuthServerClient } from "@/lib/internal-auth";

const allowedTokenTypes = new Set<EmailOtpType>(["invite", "recovery", "email"]);

function getTokenType(value: string | null): EmailOtpType | null {
  if (!value || !allowedTokenTypes.has(value as EmailOtpType)) {
    return null;
  }

  return value as EmailOtpType;
}

function getRedirectUrl(requestUrl: URL, path: string) {
  const redirectUrl = new URL(path, requestUrl.origin);
  redirectUrl.searchParams.set("verified", "1");

  return redirectUrl;
}

function getErrorRedirectUrl(requestUrl: URL, message: string) {
  const redirectUrl = new URL("/verwaltung/passwort-neu", requestUrl.origin);
  redirectUrl.searchParams.set("error", "access_denied");
  redirectUrl.searchParams.set("error_code", "link_not_confirmed");
  redirectUrl.searchParams.set("error_description", message);

  return redirectUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenType = getTokenType(requestUrl.searchParams.get("type"));
  const next = getSafeInternalNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || !tokenType) {
    return NextResponse.redirect(
      getErrorRedirectUrl(requestUrl, "Der Passwortlink ist unvollständig.")
    );
  }

  const supabase = await getSupabaseAuthServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: tokenType
  });

  if (error) {
    return NextResponse.redirect(
      getErrorRedirectUrl(requestUrl, error.message)
    );
  }

  return NextResponse.redirect(getRedirectUrl(requestUrl, next));
}
