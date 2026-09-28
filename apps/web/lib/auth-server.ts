import { auth as betterAuthInstance } from "./auth";
import { headers } from "next/headers";

/**
 * Get current active session from server components, actions, or route handlers.
 */
export async function getServerAuthSession() {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Get current user object from server session.
 * Returns null if unauthenticated.
 */
export async function getSessionUser() {
  const session = await getServerAuthSession();
  return session?.user ?? null;
}

/**
 * Server auth helper compatible with existing route handlers.
 * Returns { userId: string | null }
 */
export async function auth() {
  const user = await getSessionUser();
  return {
    userId: user?.id ?? null,
  };
}

/**
 * Server currentUser helper compatible with existing Razorpay / user handlers.
 */
export async function currentUser() {
  const user = await getSessionUser();
  if (!user) return null;

  const nameParts = (user.name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    name: user.name || "",
    imageUrl: user.image || "",
    emailAddresses: [
      {
        id: "primary",
        emailAddress: user.email,
      },
    ],
    phoneNumbers: [] as Array<{ id: string; phoneNumber: string }>,
  };
}
