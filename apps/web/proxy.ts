import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// SECURITY: Only truly public endpoints should be listed here
// All other API endpoints require authentication
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/contact",
    "/pricing",
    "/open-source",
    "/",

    // Webhooks - no auth (validated by webhook signature/key or identifier)
    "/api/clerk-webhook",
    "/api/webhook/(.*)",
    "/api/flow-endpoint",
    "/api/flow-endpoint/(.*)",
    "/api/wc/(.*)", // WhatsApp Cloud webhooks
    "/api/razorpay/webhook", // Razorpay webhook (verified by webhook signature)
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    const isPublic = isPublicRoute(req);

    // Forward authenticated user context for endpoints rewritten to the external API service.
    if (req.nextUrl.pathname.startsWith('/api/') && userId) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', userId);
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Handle root route specifically
    if ((req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up") && userId) {
        // User is authenticated, redirect to dashboard
        return NextResponse.redirect(new URL("/protected", req.url));
    } else if ((req.nextUrl.pathname === "/protected" || req.nextUrl.pathname.startsWith("/protected/")) && !userId) {
        // User is not authenticated, redirect to sign-in
        return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // For non-public routes, require authentication
    if (!isPublic) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
