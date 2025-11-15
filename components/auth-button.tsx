import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function AuthButton() {
  const { userId } = await auth();
  const user = await currentUser();

  return userId ? (
    <div className="flex items-center gap-4">
      Hey, {user?.emailAddresses[0]?.emailAddress || user?.firstName || "User"}!
      <SignOutButton>
        <button className="py-2 px-3 flex rounded-md no-underline bg-btn-background hover:bg-btn-background-hover">
          Sign out
        </button>
      </SignOutButton>
    </div>
  ) : (
    <div className="flex gap-2">
      <SignInButton mode="redirect">
        <button className="py-2 px-3 flex rounded-md no-underline bg-btn-background hover:bg-btn-background-hover">
          Sign in
        </button>
      </SignInButton>
      <Link
        href="/sign-up"
        className="py-2 px-4 flex rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
      >
        Sign up
      </Link>
    </div>
  );
}
