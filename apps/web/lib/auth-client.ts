"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;

export const forgetPassword = async (opts: { email: string; redirectTo?: string }) => {
  try {
    const res = await authClient.$fetch<{ status: boolean; message?: string }>("/request-password-reset", {
      method: "POST",
      body: opts,
    });
    if ((res as any)?.error) {
      return { data: null, error: (res as any).error };
    }
    return { data: res, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Failed to process request" } };
  }
};

export const resetPassword = async (opts: { newPassword: string; token: string }) => {
  try {
    const res = await authClient.$fetch<{ status: boolean; message?: string }>("/reset-password", {
      method: "POST",
      body: opts,
    });
    if ((res as any)?.error) {
      return { data: null, error: (res as any).error };
    }
    return { data: res, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Failed to reset password" } };
  }
};

export const updateUser = async (opts: { name?: string; image?: string }) => {
  try {
    const res = await authClient.$fetch<{ user: any }>("/update-user", {
      method: "POST",
      body: opts,
    });
    if ((res as any)?.error) {
      return { data: null, error: (res as any).error };
    }
    return { data: res, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Failed to update profile" } };
  }
};

export const changePassword = async (opts: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) => {
  try {
    const res = await authClient.$fetch<{ token?: string; user?: any }>("/change-password", {
      method: "POST",
      body: opts,
    });
    if ((res as any)?.error) {
      return { data: null, error: (res as any).error };
    }
    return { data: res, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Failed to change password" } };
  }
};
