import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AuthLayout() {
  const { userId } = await auth();

  // If user is already authenticated, redirect to protected area
  if (userId) {
    redirect("/protected");
  }

  // Redirect to Clerk's sign-in page since we're using Clerk's default UI
  redirect("/sign-in");
}