import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createLegacyBasicAuthCookieValue,
  isLegacyBasicAuthCookieValueValid,
  LEGACY_BASIC_AUTH_COOKIE_MAX_AGE_SECONDS,
  LEGACY_BASIC_AUTH_COOKIE_NAME
} from "@/lib/legacy-basic-auth-cookie";

const PUBLIC_INTERNAL_PATHS = [
  "/verwaltung/login",
  "/verwaltung/passwort-zuruecksetzen",
  "/verwaltung/passwort-neu",
  "/auth/callback"
];

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function isLegacyBasicAuthFallbackEnabled() {
  return process.env.INTERNAL_BASIC_AUTH_FALLBACK_ENABLED !== "false";
}

function unauthorizedApiResponse(message = "Bitte intern anmelden.") {
  return NextResponse.json(
    {
      message
    },
    {
      status: 401
    }
  );
}

function basicAuthChallengeResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="TC Vreden Intern", charset="UTF-8"'
    }
  });
}

function getBase64Bytes(value: string) {
  if (typeof atob === "function") {
    const binary = atob(value);

    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(value, "base64"));
}

function decodeBase64Candidates(value: string) {
  const bytes = getBase64Bytes(value);
  const candidates = [
    new TextDecoder("utf-8").decode(bytes),
    new TextDecoder("windows-1252").decode(bytes),
    new TextDecoder("iso-8859-1").decode(bytes)
  ];

  return Array.from(new Set(candidates));
}

function hasValidBasicAuth(request: NextRequest) {
  if (!isLegacyBasicAuthFallbackEnabled()) {
    return false;
  }

  const username = process.env.INTERNAL_ACCESS_USERNAME;
  const password = process.env.INTERNAL_ACCESS_PASSWORD;

  if (!username || !password) {
    return false;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decodedCandidates = decodeBase64Candidates(authHeader.slice(6));

    return decodedCandidates.some((decoded) => {
      const separatorIndex = decoded.indexOf(":");

      if (separatorIndex < 0) {
        return false;
      }

      const providedUsername = decoded.slice(0, separatorIndex);
      const providedPassword = decoded.slice(separatorIndex + 1);

      return providedUsername === username && providedPassword === password;
    });
  } catch {
    return false;
  }
}

async function hasValidLegacyBasicAuthCookie(request: NextRequest) {
  if (!isLegacyBasicAuthFallbackEnabled()) {
    return false;
  }

  const username = process.env.INTERNAL_ACCESS_USERNAME;
  const password = process.env.INTERNAL_ACCESS_PASSWORD;

  if (!username || !password) {
    return false;
  }

  return isLegacyBasicAuthCookieValueValid(
    request.cookies.get(LEGACY_BASIC_AUTH_COOKIE_NAME)?.value,
    username,
    password
  );
}

async function legacyBasicAuthResponse(request: NextRequest) {
  const username = process.env.INTERNAL_ACCESS_USERNAME;
  const password = process.env.INTERNAL_ACCESS_PASSWORD;
  const response = NextResponse.next();

  if (username && password) {
    response.cookies.set(
      LEGACY_BASIC_AUTH_COOKIE_NAME,
      await createLegacyBasicAuthCookieValue(username, password),
      {
        httpOnly: true,
        maxAge: LEGACY_BASIC_AUTH_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:"
      }
    );
  }

  return response;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/verwaltung") ||
    pathname.startsWith("/vorstand") ||
    pathname.startsWith("/api/ebusy") ||
    pathname.startsWith("/api/verwaltung")
  );
}

function isPublicInternalPath(pathname: string) {
  return PUBLIC_INTERNAL_PATHS.some((path) => pathname.startsWith(path));
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/verwaltung/login";
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(loginUrl);
}

async function hasSupabaseSession(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: new NextResponse("Internal auth is not configured.", { status: 503 })
    };
  }

  const response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof response.cookies.set>[2];
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return {
    ok: Boolean(user),
    response
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname) || isPublicInternalPath(pathname)) {
    return NextResponse.next();
  }

  const session = await hasSupabaseSession(request);

  if (session.ok) {
    return session.response;
  }

  if (await hasValidLegacyBasicAuthCookie(request)) {
    return NextResponse.next();
  }

  if (hasValidBasicAuth(request)) {
    return legacyBasicAuthResponse(request);
  }

  if (
    isLegacyBasicAuthFallbackEnabled() &&
    request.nextUrl.searchParams.get("legacy") === "1"
  ) {
    return basicAuthChallengeResponse();
  }

  if (pathname.startsWith("/api/")) {
    return unauthorizedApiResponse();
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ["/verwaltung/:path*", "/vorstand/:path*", "/api/ebusy/:path*", "/api/verwaltung/:path*"]
};
