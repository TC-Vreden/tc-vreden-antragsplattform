import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="TC Vreden Intern"'
    }
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPath =
    pathname.startsWith("/verwaltung") ||
    pathname.startsWith("/vorstand") ||
    pathname.startsWith("/api/ebusy");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const username = process.env.INTERNAL_ACCESS_USERNAME;
  const password = process.env.INTERNAL_ACCESS_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Internal access is not configured.", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const encoded = authHeader.slice(6);
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [providedUsername, ...passwordParts] = decoded.split(":");
  const providedPassword = passwordParts.join(":");

  if (providedUsername !== username || providedPassword !== password) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/verwaltung/:path*", "/vorstand/:path*", "/api/ebusy/:path*"]
};
