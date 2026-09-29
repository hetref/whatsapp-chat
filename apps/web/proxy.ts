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

// In-memory cache for session token to user ID lookup to prevent excessive roundtrips
const sessionCache = new Map<string, { userId: string; expires: number }>();

export default async function proxy(req: NextRequest) {
  // Prevent any internal recursion from sub-fetches
  if (req.headers.has("x-internal-proxy")) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Never intercept or inspect /api/auth endpoints or public webhook endpoints
  if (pathname.startsWith("/api/auth") || isPublic(pathname)) {
    // If a logged-in user visits sign-in or sign-up, redirect to /protected
    if (pathname === "/sign-in" || pathname === "/sign-up") {
      const sessionCookie = getSessionCookie(req);
      if (sessionCookie) {
        return NextResponse.redirect(new URL("/protected", req.url));
      }
    }
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(req);

  // If no session cookie, user is unauthenticated
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/sign-in", req.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from auth pages
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/protected", req.url));
  }

  // User is authenticated by session cookie.
  // For page routes (/protected, etc.), no need to fetch /api/auth/get-session!
  // Only API routes forwarded to external/rewritten services need x-user-id header.
  if (pathname.startsWith("/api/")) {
    let userId = req.headers.get("x-user-id");

    if (!userId) {
      const cached = sessionCache.get(sessionCookie);
      const now = Date.now();

      if (cached && cached.expires > now) {
        userId = cached.userId;
      } else {
        try {
          const sessionUrl = new URL("/api/auth/get-session", req.url);
          const res = await fetch(sessionUrl.toString(), {
            headers: {
              cookie: req.headers.get("cookie") || "",
              "x-internal-proxy": "1",
            },
          });
          if (res.ok) {
            const sessionData = await res.json();
            userId = sessionData?.user?.id || null;
            if (userId) {
              sessionCache.set(sessionCookie, {
                userId,
                expires: now + 5 * 60 * 1000, // 5 min TTL
              });
            }
          }
        } catch {
          // If session check fails, fall through
        }
      }
    }

    if (userId) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
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
