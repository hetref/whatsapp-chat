"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Sliders,
  Phone,
  Building2,
  Radio,
  Unplug,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserSettings {
  access_token_added: boolean;
  webhook_verified: boolean;
  api_version: string;
  phone_number: string | null;
  full_name: string | null;
  has_access_token: boolean;
  has_phone_number_id: boolean;
  has_business_account_id: boolean;
  has_verify_token: boolean;
  webhook_token: string | null;
  access_token?: string | null;
  phone_number_id?: string | null;
  business_account_id?: string | null;
  verify_token?: string | null;
}

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            code?: string;
            accessToken?: string;
            userID?: string;
            expiresIn?: number;
            signedRequest?: string;
          };
          status?: string;
        }) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
        }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "1825841578150241";
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || "2024693201673779";
const META_HOSTED_URL = `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${META_APP_ID}&config_id=${META_CONFIG_ID}&extras=%7B%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v4%22%7D`;

export default function SetupPage() {
  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Setup Tab
  const [activeTab, setActiveTab] = useState<string>("embedded");

  // Embedded Signup states
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [connectingEmbedded, setConnectingEmbedded] = useState(false);
  const [embeddedStep, setEmbeddedStep] = useState<string>("");
  const [embeddedError, setEmbeddedError] = useState<string | null>(null);
  const [embeddedSuccess, setEmbeddedSuccess] = useState(false);

  // Disconnect states
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Manual Access Token form
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [apiVersion, setApiVersion] = useState("v23.0");
  const [savingAccessToken, setSavingAccessToken] = useState(false);
  const [accessTokenError, setAccessTokenError] = useState<string | null>(null);
  const [accessTokenSuccess, setAccessTokenSuccess] = useState(false);

  // Manual Webhook form
  const [verifyToken, setVerifyToken] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSuccess, setWebhookSuccess] = useState(false);

  // Copy states
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [copiedAccessToken, setCopiedAccessToken] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState(false);
  const [copiedWabaId, setCopiedWabaId] = useState(false);

  // Show/hide states
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Phone sync and manual ID states
  const [syncingPhone, setSyncingPhone] = useState(false);
  const [savingPhoneId, setSavingPhoneId] = useState(false);
  const [metaWebhookSyncInfo, setMetaWebhookSyncInfo] = useState<{
    meta_configured_url?: string | null;
    current_domain_url?: string;
    url_matches_active_domain?: boolean;
    verify_token_to_use?: string;
  } | null>(null);

  // Popup callback state - detect synchronously so popup callback never renders main dashboard or fires initial fetches
  const [isPopupCallback, setIsPopupCallback] = useState(() => {
    if (typeof window === "undefined") return false;
    const isOpener = !!window.opener && window.opener !== window;
    const params = new URLSearchParams(window.location.search);
    return isOpener && (params.has("code") || params.has("error"));
  });

  // Track credentials received from Meta to coordinate code and postMessage data
  const sessionPayloadRef = useRef<{
    code?: string;
    waba_id?: string;
    phone_number_id?: string;
  }>({});
  const isSubmittingRef = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const loadSettings = useCallback(async () => {
    // If running in OAuth callback popup, do nothing
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("/api/settings/save");
      if (!response.ok) {
        return;
      }
      const data = await response.json();

      if (data?.settings) {
        setSettings(data.settings);

        if (data.settings.access_token) {
          setAccessToken(data.settings.access_token);
        }
        if (data.settings.phone_number_id) {
          setPhoneNumberId(data.settings.phone_number_id);
        }
        if (data.settings.business_account_id) {
          setBusinessAccountId(data.settings.business_account_id);
        }
        if (data.settings.verify_token) {
          setVerifyToken(data.settings.verify_token);
        }
        setApiVersion(data.settings.api_version || "v23.0");
      }
    } catch (error: unknown) {
      // Ignore network abort errors during popup close or unmount
      const err = error as { name?: string; message?: string };
      if (
        err?.name === "AbortError" ||
        err?.message?.includes("Failed to fetch") ||
        (typeof window !== "undefined" && window.closed)
      ) {
        return;
      }
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Load settings on mount (skip if inside OAuth popup callback)
  useEffect(() => {
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      return;
    }
    loadSettings();
  }, [loadSettings]);

  // Sync phone number from Meta and verify webhook subscription
  const handleSyncPhone = async () => {
    setSyncingPhone(true);
    try {
      const res = await fetch("/api/settings/subscribe-webhooks", { method: "POST" });
      const data = await res.json();
      if (data) {
        setMetaWebhookSyncInfo({
          meta_configured_url: data.meta_configured_url,
          current_domain_url: data.current_domain_url,
          url_matches_active_domain: data.url_matches_active_domain,
          verify_token_to_use: data.verify_token_to_use,
        });
      }
      await loadSettings();
    } catch (err) {
      console.warn("Error syncing phone / webhook subscription:", err);
    } finally {
      setSyncingPhone(false);
    }
  };

  // Quick save phone number ID when connected
  const handleSavePhoneNumberOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim()) return;
    setSavingPhoneId(true);
    try {
      const response = await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number_id: phoneNumberId.trim() }),
      });
      if (response.ok) {
        await loadSettings();
      }
    } catch (err) {
      console.error("Error saving phone number ID:", err);
    } finally {
      setSavingPhoneId(false);
    }
  };

  // 2. Initialize Facebook JavaScript SDK for Embedded Signup
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v23.0",
      });
      setFbSdkLoaded(true);
    };

    if (window.FB) {
      setFbSdkLoaded(true);
    } else if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      document.body.appendChild(js);
    }
  }, []);

  // 3. Complete Embedded Signup with backend
  const completeEmbeddedSignup = useCallback(async (params?: {
    code?: string;
    waba_id?: string;
    phone_number_id?: string;
    redirect_uri?: string;
  }) => {
    if (params?.code) sessionPayloadRef.current.code = params.code;
    if (params?.waba_id) sessionPayloadRef.current.waba_id = params.waba_id;
    if (params?.phone_number_id) sessionPayloadRef.current.phone_number_id = params.phone_number_id;

    const redirectUri = params?.redirect_uri || (typeof window !== "undefined" ? `${window.location.origin}/protected/setup` : "");

    // Need at least authorization code or WABA ID to complete setup
    const payload = {
      code: sessionPayloadRef.current.code,
      waba_id: sessionPayloadRef.current.waba_id,
      phone_number_id: sessionPayloadRef.current.phone_number_id,
      redirect_uri: redirectUri,
    };

    // To complete embedded signup for a new account, we MUST have code (or user already has access token in settings)
    if (!payload.code && !settingsRef.current?.has_access_token && !settingsRef.current?.access_token) {
      console.log("[Embedded Signup] Stored WABA and Phone metadata, waiting for Meta authorization code...", payload);
      return;
    }

    if (isSubmittingRef.current) {
      console.log("[Embedded Signup] Submission already in progress, stored parameters:", params);
      return;
    }
    isSubmittingRef.current = true;

    try {
      setConnectingEmbedded(true);
      setEmbeddedStep("Connecting WhatsApp credentials to your account...");
      setEmbeddedError(null);

      console.log("[Embedded Signup] Sending payload to backend:", payload);

      const response = await fetch("/api/settings/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete Embedded Signup with Meta");
      }

      setEmbeddedSuccess(true);
      setEmbeddedStep("WhatsApp connected successfully! Loading account...");
      setEmbeddedError(null);
      if (data.settings) {
        setSettings(data.settings);
      }
      await loadSettings();
    } catch (err: unknown) {
      console.error("Embedded Signup error:", err);
      setEmbeddedError(err instanceof Error ? err.message : "Failed to connect WhatsApp account");
    } finally {
      isSubmittingRef.current = false;
      setConnectingEmbedded(false);

      // If a phone_number_id was received in background while code was submitting, and not already saved, sync it now
      if (sessionPayloadRef.current.phone_number_id && !settingsRef.current?.phone_number_id) {
        const pendingPhoneId = sessionPayloadRef.current.phone_number_id;
        sessionPayloadRef.current.phone_number_id = undefined;
        fetch("/api/settings/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number_id: pendingPhoneId }),
        })
          .then(() => loadSettings())
          .catch(console.error);
      }
    }
  }, [loadSettings]);

  // 0. Detect OAuth Code in URL (when Meta redirects back to /protected/setup?code=...)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDesc = urlParams.get("error_description");

    if (error) {
      if (window.opener && window.opener !== window) {
        setIsPopupCallback(true);
        try {
          window.opener.postMessage({ type: "META_AUTH_ERROR", error: errorDesc || error }, "*");
          setTimeout(() => window.close(), 400);
        } catch {}
        return;
      }
      setEmbeddedError(errorDesc || "Meta authorization was denied or cancelled.");
      setConnectingEmbedded(false);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (code) {
      console.log("[SetupPage] Detected OAuth code in URL:", code);
      const redirectUri = `${window.location.origin}/protected/setup`;

      // If loaded inside a popup window
      if (window.opener && window.opener !== window) {
        setIsPopupCallback(true);
        try {
          localStorage.setItem("meta_whatsapp_code", code);
          window.opener.postMessage({ type: "META_AUTH_CODE", code, redirect_uri: redirectUri }, "*");
          setTimeout(() => {
            window.close();
          }, 400);
        } catch (e) {
          console.error("Failed to notify opener window:", e);
        }
      } else {
        // If loaded in main window, complete connection directly
        window.history.replaceState({}, "", window.location.pathname);
        completeEmbeddedSignup({ code, redirect_uri: redirectUri });
      }
    }
  }, [completeEmbeddedSignup]);

  // 4. Message & Storage Event Listeners for responses from Meta OAuth Popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // 1. Check for our OAuth popup postMessage
      if (event.data?.type === "META_AUTH_CODE" && event.data?.code) {
        console.log("[SetupPage] Received META_AUTH_CODE from popup:", event.data.code);
        await completeEmbeddedSignup({
          code: event.data.code,
          redirect_uri: event.data.redirect_uri,
        });
        return;
      }

      if (event.data?.type === "META_AUTH_ERROR") {
        setEmbeddedError(event.data.error || "Meta authorization was denied.");
        setConnectingEmbedded(false);
        return;
      }

      // 2. Check for Meta postMessage
      const origin = event.origin || "";
      if (
        !origin.includes("facebook.com") &&
        origin !== "https://www.facebook.com" &&
        origin !== "https://web.facebook.com" &&
        origin !== "https://business.facebook.com"
      ) {
        return;
      }

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          console.log("[Embedded Signup postMessage]:", data);

          if (typeof data.event === "string" && data.event.startsWith("FINISH")) {
            const { phone_number_id, waba_id } = data.data || {};
            await completeEmbeddedSignup({
              phone_number_id,
              waba_id,
            });
          } else if (data.event === "CANCEL") {
            setEmbeddedError("WhatsApp setup was cancelled in the Meta popup.");
            setConnectingEmbedded(false);
          } else if (data.event === "ERROR") {
            setEmbeddedError("An error occurred during Meta signup: " + (data.data?.error_message || "Unknown error"));
            setConnectingEmbedded(false);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    const handleStorage = async (e: StorageEvent) => {
      if (e.key === "meta_whatsapp_code" && e.newValue) {
        console.log("[SetupPage] Detected code via storage event:", e.newValue);
        localStorage.removeItem("meta_whatsapp_code");
        const redirectUri = `${window.location.origin}/protected/setup`;
        await completeEmbeddedSignup({ code: e.newValue, redirect_uri: redirectUri });
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [completeEmbeddedSignup]);

  // 5. Trigger Embedded Signup Dialog with Direct OAuth Flow & redirect_uri
  const handleLaunchEmbeddedSignup = () => {
    sessionPayloadRef.current = {};
    isSubmittingRef.current = false;
    setConnectingEmbedded(true);
    setEmbeddedError(null);
    setEmbeddedSuccess(false);
    setEmbeddedStep("Opening Meta WhatsApp login...");

    const redirectUri = `${window.location.origin}/protected/setup`;
    const oauthUrl = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${META_APP_ID}&config_id=${META_CONFIG_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // If FB JS SDK is loaded and ready, invoke FB.login
    if (window.FB) {
      try {
        window.FB.login(
          (response) => {
            console.log("[Embedded Signup] FB.login response:", response);
            if (response.authResponse?.code) {
              console.log("[Embedded Signup] Received auth code from FB.login");
              void completeEmbeddedSignup({
                code: response.authResponse.code,
                redirect_uri: redirectUri,
              });
            } else if (response.status === "not_authorized" || !response.authResponse) {
              console.log("[Embedded Signup] Login closed or cancelled by user");
              setConnectingEmbedded(false);
            }
          },
          {
            config_id: META_CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              sessionInfoVersion: "3",
              version: "v4",
            },
          }
        );
        return;
      } catch (sdkErr) {
        console.warn("[Embedded Signup] FB.login failed, using direct OAuth popup:", sdkErr);
      }
    }

    // Direct Meta OAuth Popup (Works reliably even if SDK is blocked by browser shields)
    const popup = window.open(
      oauthUrl,
      "whatsapp_meta_oauth",
      "width=720,height=800,scrollbars=yes,status=yes"
    );

    if (!popup) {
      // If popup was blocked, redirect in same window
      window.location.href = oauthUrl;
      return;
    }

    // Poll for localStorage code or popup closure
    const pollInterval = setInterval(() => {
      const storedCode = localStorage.getItem("meta_whatsapp_code");
      if (storedCode) {
        clearInterval(pollInterval);
        localStorage.removeItem("meta_whatsapp_code");
        completeEmbeddedSignup({ code: storedCode, redirect_uri: redirectUri });
        return;
      }

      if (popup.closed) {
        clearInterval(pollInterval);
        setTimeout(() => {
          loadSettings();
          setConnectingEmbedded(false);
        }, 1200);
      }
    }, 800);
  };

  // Direct Meta Popup Fallback
  const handleOpenDirectPopup = () => {
    handleLaunchEmbeddedSignup();
  };

  // 6. Disconnect WhatsApp Handler
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setDisconnectError(null);

    try {
      const response = await fetch("/api/settings/disconnect", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect WhatsApp account");
      }

      setDisconnectDialogOpen(false);
      setAccessToken("");
      setPhoneNumberId("");
      setBusinessAccountId("");
      await loadSettings();
    } catch (err: unknown) {
      setDisconnectError(err instanceof Error ? err.message : "Failed to disconnect WhatsApp");
    } finally {
      setDisconnecting(false);
    }
  };

  // 7. Manual Access Token Save
  const handleSaveAccessToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccessToken(true);
    setAccessTokenError(null);
    setAccessTokenSuccess(false);

    try {
      if (!accessToken.trim()) {
        setAccessTokenError("Access token is required");
        setSavingAccessToken(false);
        return;
      }

      if (!phoneNumberId.trim()) {
        setAccessTokenError("Phone Number ID is required");
        setSavingAccessToken(false);
        return;
      }

      if (!businessAccountId.trim()) {
        setAccessTokenError("Business Account ID is required");
        setSavingAccessToken(false);
        return;
      }

      const response = await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          api_version: apiVersion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save access token");
      }

      setAccessTokenSuccess(true);
      await loadSettings();
      setTimeout(() => setAccessTokenSuccess(false), 3000);
    } catch (error) {
      setAccessTokenError(error instanceof Error ? error.message : "Failed to save access token");
    } finally {
      setSavingAccessToken(false);
    }
  };

  // 8. Manual Webhook Save
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setWebhookError(null);
    setWebhookSuccess(false);

    try {
      if (!verifyToken.trim()) {
        setWebhookError("Verify token is required");
        setSavingWebhook(false);
        return;
      }

      const response = await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify_token: verifyToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save webhook configuration");
      }

      setWebhookSuccess(true);
      await loadSettings();
      setTimeout(() => setWebhookSuccess(false), 3000);
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "Failed to save webhook configuration");
    } finally {
      setSavingWebhook(false);
    }
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, type: "webhook" | "verify" | "access" | "phone" | "waba") => {
    navigator.clipboard.writeText(text);
    if (type === "webhook") {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } else if (type === "verify") {
      setCopiedVerifyToken(true);
      setTimeout(() => setCopiedVerifyToken(false), 2000);
    } else if (type === "access") {
      setCopiedAccessToken(true);
      setTimeout(() => setCopiedAccessToken(false), 2000);
    } else if (type === "phone") {
      setCopiedPhoneId(true);
      setTimeout(() => setCopiedPhoneId(false), 2000);
    } else if (type === "waba") {
      setCopiedWabaId(true);
      setTimeout(() => setCopiedWabaId(false), 2000);
    }
  };

  // Mask access token
  const getMaskedAccessToken = (token: string) => {
    if (!token || token.length <= 10) return token;
    const visiblePart = token.substring(0, 10);
    const maskedPart = "*".repeat(Math.min(token.length - 10, 50));
    return visiblePart + maskedPart;
  };

  const webhookUrl =
    typeof window !== "undefined" && settings?.webhook_token
      ? `${window.location.origin}/api/webhook/${settings.webhook_token}`
      : typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook`
      : "";

  // Connected check: Access token is added and either phone number ID or business account ID is present
  const isConnected = !!(
    settings?.access_token_added &&
    (settings?.has_phone_number_id ||
      settings?.phone_number_id ||
      settings?.has_business_account_id ||
      settings?.business_account_id)
  );

  if (isPopupCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm p-6 bg-card border rounded-2xl shadow-xl">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold">Meta Authorization Received!</h2>
          <p className="text-xs text-muted-foreground">
            Connecting your WhatsApp account to WaChat... This window will close automatically.
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.close()}
            className="mt-2 text-xs"
          >
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Loading WhatsApp settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-5xl mx-auto py-8 px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Phone className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
              WhatsApp Configuration
            </h1>
          </div>
          <p className="text-muted-foreground text-base">
            Connect your WhatsApp Cloud Business API to send and receive messages with WaChat
          </p>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: CONNECTED STATE - Displays connected account & Disconnect option */}
        {/* ========================================================================= */}
        {isConnected ? (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold text-foreground">
                          WhatsApp Connected & Active
                        </CardTitle>
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                          Live
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        Your WhatsApp Cloud API account is fully integrated and receiving messages.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncPhone}
                      disabled={syncingPhone}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 text-xs"
                      title="Refresh status and check Meta for phone numbers"
                    >
                      <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncingPhone && "animate-spin")} />
                      {syncingPhone ? "Syncing..." : "Sync from Meta"}
                    </Button>
                    <Link href="/protected">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs">
                        Go to Chat
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/40 text-xs"
                      onClick={() => setDisconnectDialogOpen(true)}
                    >
                      <Unplug className="mr-1.5 h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                {/* Notice if Phone Number ID is not yet attached */}
                {!settings?.phone_number_id && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          WhatsApp Business Account Connected (Phone Number Auto-Sync)
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Your WABA is verified. Click &quot;Sync from Meta&quot; to fetch your registered phone number, or enter your Phone Number ID below.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleSavePhoneNumberOnly} className="flex gap-2 items-center shrink-0">
                      <Input
                        placeholder="Paste Phone Number ID"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        className="font-mono text-xs w-44 h-8"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingPhoneId || !phoneNumberId.trim()}
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {savingPhoneId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save ID
                      </Button>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* Phone Number */}
                  <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      Connected Phone
                    </div>
                    <p className="text-lg font-bold text-foreground font-mono">
                      {settings?.phone_number || settings?.phone_number_id || "WhatsApp Account (WABA Active)"}
                    </p>
                    {settings?.full_name ? (
                      <p className="text-xs text-muted-foreground">
                        Verified Name: <span className="font-medium text-foreground">{settings.full_name}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Account linked via Meta Embedded Signup
                      </p>
                    )}
                  </div>

                  {/* Phone Number ID */}
                  <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Phone Number ID
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(settings?.phone_number_id || "", "phone")}
                      >
                        {copiedPhoneId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-foreground truncate">
                      {settings?.phone_number_id || (
                        <span className="text-xs text-muted-foreground italic">Pending Sync · Click &quot;Sync from Meta&quot;</span>
                      )}
                    </p>
                  </div>

                  {/* Business Account ID */}
                  <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        WhatsApp Business Account (WABA)
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(settings?.business_account_id || "", "waba")}
                      >
                        {copiedWabaId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-foreground truncate">
                      {settings?.business_account_id || "N/A"}
                    </p>
                  </div>

                    {/* Webhook Status */}
                    <div className="p-4 rounded-xl bg-card border shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          <Radio className="h-3.5 w-3.5 text-emerald-600" />
                          Webhook Status
                        </div>
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                          {settings?.webhook_verified ? "Subscribed & Verified" : "Active"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground truncate font-mono flex-1">
                          {webhookUrl}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(webhookUrl, "webhook")}
                          title="Copy Webhook URL"
                        >
                          {copiedWebhookUrl ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>

                      {metaWebhookSyncInfo?.meta_configured_url && !metaWebhookSyncInfo.url_matches_active_domain && (
                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1.5 text-amber-700 dark:text-amber-400">
                          <div className="font-semibold flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <span>Meta App Callback URL is pointing to another domain:</span>
                          </div>
                          <p className="font-mono text-[11px] truncate bg-background/60 p-1.5 rounded border border-amber-500/20">
                            {metaWebhookSyncInfo.meta_configured_url}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            To receive messages in development, update Callback URL in Meta App Dashboard → Webhooks to:
                          </p>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-[11px] bg-background/80 p-1.5 rounded border select-all flex-1 truncate">
                              {metaWebhookSyncInfo.current_domain_url}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => copyToClipboard(metaWebhookSyncInfo.current_domain_url || "", "webhook")}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
              </CardContent>

              <CardFooter className="border-t bg-muted/30 pt-4 pb-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Cloud API Version: <strong>{settings?.api_version || "v23.0"}</strong></span>
                </div>
                <span>Need to change accounts? Disconnect above to re-link.</span>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DISCONNECTED STATE - Shows both Embedded Signup & Manual methods   */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Choose Setup Method Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/80 rounded-xl">
                  <TabsTrigger
                    value="embedded"
                    className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium"
                  >
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span>1-Click Connect</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Recommended
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium"
                  >
                    <Sliders className="h-4 w-4 text-muted-foreground" />
                    <span>Manual Setup</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ============================================================= */}
              {/* TAB 1: 1-CLICK EMBEDDED SIGNUP (RECOMMENDED)                  */}
              {/* ============================================================= */}
              <TabsContent value="embedded" className="space-y-6 focus-visible:outline-none">
                <Card className="border-emerald-200/80 dark:border-emerald-900/60 shadow-lg">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                      <Zap className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                      Connect with WhatsApp Embedded Signup
                    </CardTitle>
                    <CardDescription className="text-base max-w-xl mx-auto">
                      Log in with Facebook to select your WhatsApp Business Account and phone number.
                      Everything is configured automatically in under 60 seconds.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6 max-w-xl mx-auto">
                    {/* Benefits List */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                        <p className="font-semibold text-xs text-foreground">No Manual Tokens</p>
                        <p className="text-[11px] text-muted-foreground">Permanent system token issued automatically</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <Radio className="h-5 w-5 text-emerald-600 mx-auto" />
                        <p className="font-semibold text-xs text-foreground">Instant Webhooks</p>
                        <p className="text-[11px] text-muted-foreground">Auto-subscribed to receive real-time messages</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <ShieldCheck className="h-5 w-5 text-emerald-600 mx-auto" />
                        <p className="font-semibold text-xs text-foreground">Official Meta Flow</p>
                        <p className="text-[11px] text-muted-foreground">Secured directly by Meta Business Platform</p>
                      </div>
                    </div>

                    {/* Progress / Status feedback */}
                    {connectingEmbedded && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                          <Loader2 className="h-5 w-5 text-emerald-600 animate-spin flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-emerald-900 dark:text-emerald-100">Connecting to Meta...</p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">{embeddedStep}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConnectingEmbedded(false);
                            loadSettings();
                          }}
                          className="w-full text-xs text-muted-foreground hover:text-foreground border-dashed"
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Already completed in Meta popup? Refresh connection status
                        </Button>
                      </div>
                    )}

                    {embeddedError && (
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-red-900 dark:text-red-100">Connection Failed</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{embeddedError}</p>
                        </div>
                      </div>
                    )}

                    {embeddedSuccess && (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                          WhatsApp connected successfully! Loading your account...
                        </p>
                      </div>
                    )}

                    {/* Main Connect Buttons */}
                    <div className="space-y-3 pt-2">
                      <button
                        type="button"
                        id="connect-whatsapp-btn"
                        onClick={handleLaunchEmbeddedSignup}
                        disabled={connectingEmbedded}
                        className="w-full py-4 px-6 text-base sm:text-lg font-bold text-white rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-0"
                        style={{
                          backgroundColor: "#1877F2",
                          color: "#FFFFFF",
                        }}
                      >
                        {connectingEmbedded ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin text-white shrink-0" />
                            <span>{embeddedStep || "Connecting WhatsApp..."}</span>
                          </>
                        ) : (
                          <>
                            {/* Facebook / Meta F Logo */}
                            <svg className="h-6 w-6 fill-white shrink-0" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Connect WhatsApp via Facebook</span>
                          </>
                        )}
                      </button>

                      {/* Direct popup button fallback */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenDirectPopup}
                        disabled={connectingEmbedded}
                        className="w-full h-11 text-sm font-medium border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Launch Meta Authorization Window</span>
                      </Button>

                      <div className="text-center pt-1">
                        <p className="text-xs text-muted-foreground">
                          Direct Meta OAuth 2.0 flow. Once authorized, your WhatsApp account is linked in under 60 seconds.
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t bg-muted/20 text-center py-4 text-xs text-muted-foreground flex flex-col gap-1">
                    <p>
                      App ID: <span className="font-mono">{META_APP_ID}</span> | Login Config: <span className="font-mono">{META_CONFIG_ID}</span>
                    </p>
                    <p>Powered by Meta Facebook Login for Business & WhatsApp Cloud API v23.0</p>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ============================================================= */}
              {/* TAB 2: MANUAL SETUP (PRESERVED TRADITIONAL FLOW)               */}
              {/* ============================================================= */}
              <TabsContent value="manual" className="space-y-6 focus-visible:outline-none">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Access Token Configuration */}
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span>Access Token Configuration</span>
                        {settings?.access_token_added && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        Manually provide credentials from your Meta Business Suite
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <form onSubmit={handleSaveAccessToken} className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="access-token">Access Token *</Label>
                            {settings?.has_access_token && (
                              <Badge variant="secondary" className="text-xs">
                                Configured
                              </Badge>
                            )}
                          </div>
                          <div className="relative flex items-center gap-2">
                            <Input
                              id="access-token"
                              type="text"
                              placeholder="Enter your WhatsApp Access Token"
                              value={
                                accessToken && !showAccessToken
                                  ? getMaskedAccessToken(accessToken)
                                  : accessToken
                              }
                              onChange={(e) => {
                                if (showAccessToken || !settings?.access_token_added) {
                                  setAccessToken(e.target.value);
                                }
                              }}
                              className="font-mono text-sm pr-20"
                            />
                            {accessToken && (
                              <div className="absolute right-2 flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setShowAccessToken(!showAccessToken)}
                                  title={showAccessToken ? "Hide token" : "Show token"}
                                >
                                  {showAccessToken ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyToClipboard(accessToken, "access")}
                                  title="Copy token"
                                >
                                  {copiedAccessToken ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            System User or temporary token from Meta Business Manager
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="phone-number-id">Phone Number ID *</Label>
                            {settings?.has_phone_number_id && (
                              <Badge variant="secondary" className="text-xs">
                                Configured
                              </Badge>
                            )}
                          </div>
                          <Input
                            id="phone-number-id"
                            type="text"
                            placeholder="Enter your Phone Number ID"
                            value={phoneNumberId}
                            onChange={(e) => setPhoneNumberId(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Found in WhatsApp API Setup in Meta App Dashboard
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="business-account-id">Business Account ID *</Label>
                            {settings?.has_business_account_id && (
                              <Badge variant="secondary" className="text-xs">
                                Configured
                              </Badge>
                            )}
                          </div>
                          <Input
                            id="business-account-id"
                            type="text"
                            placeholder="Enter your WhatsApp Business Account ID"
                            value={businessAccountId}
                            onChange={(e) => setBusinessAccountId(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Your WhatsApp Business Account (WABA) ID
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="api-version">API Version</Label>
                          <Input
                            id="api-version"
                            type="text"
                            placeholder="v23.0"
                            value={apiVersion}
                            onChange={(e) => setApiVersion(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Default: v23.0
                          </p>
                        </div>

                        {accessTokenError && (
                          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{accessTokenError}</span>
                          </div>
                        )}

                        {accessTokenSuccess && (
                          <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Access token saved successfully!</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={savingAccessToken}
                        >
                          {savingAccessToken ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Credentials"
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Webhook Configuration */}
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span>Webhook Setup</span>
                        {settings?.webhook_verified && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        Required for receiving incoming WhatsApp messages
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <form onSubmit={handleSaveWebhook} className="space-y-4">
                        {/* Webhook URL */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Webhook Callback URL</Label>
                            <Badge variant="secondary" className="text-xs">
                              Unique to You
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={webhookUrl || "Generating unique webhook URL..."}
                              readOnly
                              className="font-mono text-sm bg-muted"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(webhookUrl, "webhook")}
                              disabled={!webhookUrl}
                            >
                              {copiedWebhookUrl ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Copy this URL to your Meta Webhooks configuration
                          </p>
                        </div>

                        {/* Verify Token */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="verify-token">Verify Token *</Label>
                            {settings?.has_verify_token && (
                              <Badge variant="secondary" className="text-xs">
                                Configured
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              id="verify-token"
                              type="text"
                              placeholder="Enter a secure verify token"
                              value={verifyToken}
                              onChange={(e) => setVerifyToken(e.target.value)}
                              className="font-mono text-sm"
                            />
                            {verifyToken && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(verifyToken, "verify")}
                              >
                                {copiedVerifyToken ? (
                                  <Check className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Custom string matched when Meta verifies your webhook
                          </p>
                        </div>

                        {/* Quick steps */}
                        <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-xs">
                          <p className="font-semibold text-foreground">Steps in Meta Dashboard:</p>
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>Go to Meta App Dashboard → WhatsApp → Configuration</li>
                            <li>Paste the Webhook Callback URL and Verify Token</li>
                            <li>Click &quot;Verify and Save&quot; in Meta</li>
                            <li>Subscribe to the <span className="font-mono">messages</span> field</li>
                          </ol>
                        </div>

                        {webhookError && (
                          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{webhookError}</span>
                          </div>
                        )}

                        {webhookSuccess && (
                          <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Webhook configuration saved!</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={savingWebhook}
                        >
                          {savingWebhook ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Webhook Configuration"
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Confirmation Dialog for Disconnecting */}
        <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-2">
                <Unplug className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl">Disconnect WhatsApp Account?</DialogTitle>
              <DialogDescription className="text-center text-sm">
                Are you sure you want to disconnect this WhatsApp number? You will not be able to send or receive messages in WaChat until you reconnect.
              </DialogDescription>
            </DialogHeader>

            {disconnectError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{disconnectError}</span>
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisconnectDialogOpen(false)}
                disabled={disconnecting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Confirm Disconnect"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
