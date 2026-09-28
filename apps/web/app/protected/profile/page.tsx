"use client";

import { useState } from "react";
import { authClient, updateUser, changePassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Fingerprint,
} from "lucide-react";

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();

  // Profile info state
  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-[#5F7C65]" />
      </div>
    );
  }

  const user = session?.user;
  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      const result = await updateUser({
        name: name.trim() || user.name || "",
      });

      if (result.error) {
        setProfileMessage({ type: "error", text: result.error.message || "Failed to update profile" });
      } else {
        setProfileMessage({ type: "success", text: "Profile updated successfully." });
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err?.message || "Failed to update profile" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    setPasswordSaving(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });

      if (result.error) {
        setPasswordMessage({ type: "error", text: result.error.message || "Failed to change password." });
      } else {
        setPasswordMessage({ type: "success", text: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err?.message || "Failed to change password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = (user.name || "User")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Account Settings
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Manage your personal profile, credentials, and account security
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="size-20 rounded-full bg-[#5F7C65] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-xs">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 truncate">
                {user.name || "Unnamed User"}
              </h2>
              <Badge variant="outline" className="text-xs bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border-[#5F7C65]/30">
                Verified
              </Badge>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="size-3.5" />
              <span>{user.email}</span>
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 font-mono flex items-center gap-1.5">
              <Fingerprint className="size-3.5" />
              <span>ID: {user.id}</span>
            </p>
          </div>
        </div>

        {/* Update Name Form */}
        <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4 max-w-md">
          {profileMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs ${
                profileMessage.type === "success"
                  ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
              }`}
            >
              {profileMessage.type === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Display Name
            </Label>
            <Input
              id="name"
              type="text"
              defaultValue={user.name || ""}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <Button
            type="submit"
            disabled={profileSaving}
            className="h-9 px-4 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium"
          >
            {profileSaving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Save Changes
          </Button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="size-5 text-[#5F7C65]" />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Change Password
          </h2>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
          Update your password to keep your account safe
        </p>

        {passwordMessage && (
          <div
            className={`mb-6 p-3 rounded-xl flex items-center gap-2.5 text-xs max-w-md ${
              passwordMessage.type === "success"
                ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
            }`}
          >
            {passwordMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="currentPass" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Current Password
            </Label>
            <Input
              id="currentPass"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <div>
            <Label htmlFor="newPass" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              New Password
            </Label>
            <Input
              id="newPass"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <div>
            <Label htmlFor="confirmPass" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Confirm New Password
            </Label>
            <Input
              id="confirmPass"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <Button
            type="submit"
            disabled={passwordSaving}
            className="h-9 px-4 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium"
          >
            {passwordSaving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Update Password
          </Button>
        </form>
      </div>

      {/* Security & Authentication Info */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="size-5 text-[#5F7C65]" />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Authentication Engine
          </h2>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Powered by Better Auth with native database-level security and session verification
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">
              Active Provider
            </span>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#5F7C65]" />
              Email & Credentials
            </span>
          </div>

          <div className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">
              Session Security
            </span>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#5F7C65]" />
              HTTP-Only Encrypted Cookie
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
