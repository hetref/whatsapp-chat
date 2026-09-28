import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Public paths that do not require authentication
const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/open-source",
  "/privacy",
  "/terms",
  "/test",
  "/contact",
];

const publicPrefixes = [
  "/api/auth",
  "/api/webhook",
  "/api/flow-endpoint",
  "/api/wc",
  "/api/razorpay/webhook",
];

function isPublic(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = getSessionCookie(req);

  let userId: string | null = null;

  // If session cookie exists, fetch active user session
  if (sessionCookie) {
    try {
      const sessionUrl = new URL("/api/auth/get-session", req.url);
      const res = await fetch(sessionUrl.toString(), {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      });
      if (res.ok) {
        const sessionData = await res.json();
        userId = sessionData?.user?.id || null;
      }
    } catch (err) {
      // In case session check fails, fall through
    }
  }

  // 1. Forward user context for endpoints rewritten to Express API
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (userId) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // 2. Redirect logged-in users away from auth pages
  if ((pathname === "/sign-in" || pathname === "/sign-up") && userId) {
    return NextResponse.redirect(new URL("/protected", req.url));
  }

  // 3. Protect /protected and private routes
  if (pathname === "/protected" || pathname.startsWith("/protected/")) {
    if (!userId) {
      const redirectUrl = new URL("/sign-in", req.url);
      redirectUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. For any other non-public route
  if (!isPublic(pathname) && !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/sign-in", req.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files, favicon, etc.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
