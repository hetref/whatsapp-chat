import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  // Allow homepage without authentication
  if (isPublicRoute(req)) {
    return;
  }

  // Allow webhook and flow endpoints to bypass auth
  if (path.startsWith('/api/webhook') || path.startsWith('/api/flow-endpoint')) {
    return;
  }

  const { userId } = await auth();

  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    // Match all request paths except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};