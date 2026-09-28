import { getSessionUser } from "@/lib/auth-server";
import Link from "next/link";
import { UserAvatarDropdown } from "./user-avatar-dropdown";

export default async function AuthButton() {
  const user = await getSessionUser();

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">Hey, {user.name || user.email || "User"}!</span>
      <UserAvatarDropdown />
    </div>
  ) : (
    <div className="flex gap-2">
      <Link
        href="/sign-in"
        className="py-2 px-3 flex rounded-md no-underline bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="py-2 px-4 flex rounded-md no-underline bg-[#5F7C65] text-white hover:bg-[#526D57] text-sm font-medium shadow-xs transition-colors"
      >
        Sign up
      </Link>
    </div>
  );
}
