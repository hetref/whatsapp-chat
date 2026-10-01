"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCheck,
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
  ShieldAlert,
  ArrowRightLeft,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import LogoIcon from "@/components/logo-icon";

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

  // Account Conflict & Transfer states (1:1 account integrity)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    type: "INTERNAL_WACHAT_USER" | "EXTERNAL_PROVIDER";
    maskedEmail?: string;
    maskedPhone?: string;
    phone?: string | null;
    phoneNumberId?: string | null;
    wabaId?: string | null;
    externalAppName?: string | null;
    source: "embedded" | "manual";
    sessionPayload?: {
      code?: string;
      waba_id?: string;
      phone_number_id?: string;
      redirect_uri?: string;
      access_token?: string;
      display_phone_number?: string | null;
      verified_name?: string | null;
    };
    manualPayload?: {
      access_token: string;
      phone_number_id: string;
      business_account_id: string;
      api_version: string;
    };
  } | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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

  // Phone Cloud API registration state (Fixes Meta Error #133010)
  const [registeringPhone, setRegisteringPhone] = useState(false);
  const [phonePin, setPhonePin] = useState("123456");
  const [phoneRegStatus, setPhoneRegStatus] = useState<{
    status?: string;
    code_verification_status?: string;
    is_connected?: boolean;
    is_verified?: boolean;
    is_pin_enabled?: boolean;
    registration_needed?: boolean;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  } | null>(null);
  const [phoneRegError, setPhoneRegError] = useState<string | null>(null);
  const [phoneRegSuccess, setPhoneRegSuccess] = useState<string | null>(null);
  const [checkingPhoneStatus, setCheckingPhoneStatus] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [deregisteringPhone, setDeregisteringPhone] = useState(false);

  // Webhook Test states
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    stage1_meta: {
      waba_subscribed: boolean;
      waba_subscribed_fields: string[];
      meta_registered_url: string | null;
      meta_registered_fields: string[];
      current_webhook_url: string;
      url_matches_active_domain: boolean;
      meta_error?: string | null;
    };
    stage2_simulation: {
      success: boolean;
      status_code: number;
      latency_ms: number;
      message_saved: boolean;
      contact_created: boolean;
      contact_id?: string | null;
      test_message_id: string;
      test_sender: string;
      delivered_to_user_id: string;
    };
  } | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  // Dispatch comprehensive webhook test
  const handleRunWebhookTest = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    setTestDialogOpen(true);
    try {
      const res = await fetch("/api/settings/test-webhook", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
      if (data?.success) {
        await loadSettings();
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to execute webhook diagnostic test.",
        stage1_meta: {
          waba_subscribed: false,
          waba_subscribed_fields: [],
          meta_registered_url: null,
          meta_registered_fields: [],
          current_webhook_url: webhookUrl,
          url_matches_active_domain: false,
        },
        stage2_simulation: {
          success: false,
          status_code: 500,
          latency_ms: 0,
          message_saved: false,
          contact_created: false,
          test_message_id: "",
          test_sender: "",
          delivered_to_user_id: "",
        },
      });
    } finally {
      setTestingWebhook(false);
    }
  };

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
      await checkPhoneRegistration();
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

  // Check phone Cloud API registration status
  const checkPhoneRegistration = useCallback(async () => {
    try {
      setCheckingPhoneStatus(true);
      const res = await fetch("/api/settings/register-phone");
      if (res.ok) {
        const data = await res.json();
        setPhoneRegStatus({
          status: data.status,
          code_verification_status: data.code_verification_status,
          is_connected: data.is_connected,
          is_verified: data.is_verified,
          is_pin_enabled: data.is_pin_enabled,
          registration_needed: data.registration_needed,
          display_phone_number: data.display_phone_number,
          verified_name: data.verified_name,
          quality_rating: data.quality_rating,
        });
        if (data.is_pin_enabled) {
          setShowPinInput(true);
        }
      }
    } catch (e) {
      console.warn("Failed to check phone registration:", e);
    } finally {
      setCheckingPhoneStatus(false);
    }
  }, []);

  // Automatically check registration status when settings change
  useEffect(() => {
    if (settings?.has_access_token && (settings?.phone_number_id || settings?.has_phone_number_id)) {
      checkPhoneRegistration();
    }
  }, [settings?.has_access_token, settings?.phone_number_id, settings?.has_phone_number_id, checkPhoneRegistration]);

  // Register phone number with WhatsApp Cloud API using 6-digit PIN
  const handleRegisterPhone = async (e?: React.FormEvent, customPin?: string) => {
    if (e) e.preventDefault();
    setRegisteringPhone(true);
    setPhoneRegError(null);
    setPhoneRegSuccess(null);
    const pinToSubmit = (customPin || phonePin || "123456").trim();
    try {
      const res = await fetch("/api/settings/register-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToSubmit }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMessage = data.error || "Failed to register phone number with Meta";
        if (errMessage.toLowerCase().includes("pin") || data.error_subcode === 133005) {
          setShowPinInput(true);
        }
        throw new Error(errMessage);
      }
      setPhoneRegSuccess("Phone number registered successfully on Meta Cloud API! Status is now Connected & Active.");
      setShowPinInput(false);
      await checkPhoneRegistration();
      await loadSettings();
    } catch (err: unknown) {
      setPhoneRegError(err instanceof Error ? err.message : "Failed to register phone number");
    } finally {
      setRegisteringPhone(false);
    }
  };

  // Attempt to deregister phone number from Meta Cloud API
  const handleDeregisterPhone = async () => {
    if (!confirm("Attempt to deregister this phone number from Meta Cloud API?")) return;
    setDeregisteringPhone(true);
    setPhoneRegError(null);
    setPhoneRegSuccess(null);
    try {
      const res = await fetch("/api/settings/register-phone", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Deregistration failed");
      }
      setPhoneRegSuccess("Phone number deregistered from Cloud API. Wait 3 minutes before re-registering.");
      await checkPhoneRegistration();
    } catch (err: unknown) {
      setPhoneRegError(err instanceof Error ? err.message : "Failed to deregister phone number");
    } finally {
      setDeregisteringPhone(false);
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
      return;
    }

    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    try {
      setConnectingEmbedded(true);
      setEmbeddedStep("Connecting WhatsApp credentials to your account...");
      setEmbeddedError(null);

      const response = await fetch("/api/settings/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 409 || data.conflict) {
        console.warn("[Embedded Signup] WhatsApp account conflict detected:", data);
        setConflictInfo({
          type: data.conflictDetails?.type || "INTERNAL_WACHAT_USER",
          maskedEmail: data.conflictDetails?.existingUser?.maskedEmail,
          maskedPhone: data.conflictDetails?.existingUser?.maskedPhone,
          phone: data.conflictDetails?.existingUser?.phone || data.sessionPayload?.display_phone_number || payload.phone_number_id,
          phoneNumberId: data.conflictDetails?.existingUser?.phoneNumberId || payload.phone_number_id,
          wabaId: data.conflictDetails?.existingUser?.businessAccountId || payload.waba_id,
          externalAppName: data.conflictDetails?.externalApp?.name,
          source: "embedded",
          sessionPayload: data.sessionPayload || payload,
        });
        setConflictDialogOpen(true);
        setConnectingEmbedded(false);
        isSubmittingRef.current = false;
        return;
      }

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
      await checkPhoneRegistration();
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
    const scopes = "whatsapp_business_management,whatsapp_business_messaging";
    const oauthUrl = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${META_APP_ID}&config_id=${META_CONFIG_ID}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // If FB JS SDK is loaded and ready, invoke FB.login
    if (window.FB) {
      try {
        window.FB.login(
          (response) => {
            if (response.authResponse?.code) {
              void completeEmbeddedSignup({
                code: response.authResponse.code,
                redirect_uri: redirectUri,
              });
            } else if (response.status === "not_authorized" || !response.authResponse) {
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
              scope: scopes,
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

  // 6.5 WhatsApp Account Conflict & Transfer Handlers
  const handleConfirmTransfer = async () => {
    if (!conflictInfo) return;
    setTransferring(true);
    setTransferError(null);

    try {
      if (conflictInfo.source === "embedded" && conflictInfo.sessionPayload) {
        setEmbeddedStep("Disconnecting previous workspace and transferring WhatsApp...");
        const response = await fetch("/api/settings/embedded-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...conflictInfo.sessionPayload,
            forceTransfer: true,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to transfer WhatsApp account");
        }

        setEmbeddedSuccess(true);
        setEmbeddedStep("WhatsApp transferred and connected successfully!");
        setConflictDialogOpen(false);
        setConflictInfo(null);
        if (data.settings) {
          setSettings(data.settings);
        }
        await loadSettings();
        await checkPhoneRegistration();
      } else if (conflictInfo.source === "manual" && conflictInfo.manualPayload) {
        const response = await fetch("/api/settings/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...conflictInfo.manualPayload,
            forceTransfer: true,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to transfer WhatsApp account");
        }

        setAccessTokenSuccess(true);
        setConflictDialogOpen(false);
        setConflictInfo(null);
        await loadSettings();
        await checkPhoneRegistration();
        setTimeout(() => setAccessTokenSuccess(false), 3000);
      }
    } catch (err: unknown) {
      console.error("WhatsApp Transfer error:", err);
      setTransferError(err instanceof Error ? err.message : "Failed to transfer WhatsApp account");
    } finally {
      setTransferring(false);
    }
  };

  const handleAbortTransfer = () => {
    setConflictDialogOpen(false);
    setConflictInfo(null);
    setTransferError(null);
    setConnectingEmbedded(false);
    setSavingAccessToken(false);
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

      if (response.status === 409 || data.conflict) {
        console.warn("[Manual Setup] WhatsApp account conflict detected:", data);
        setConflictInfo({
          type: data.conflictDetails?.type || "INTERNAL_WACHAT_USER",
          maskedEmail: data.conflictDetails?.existingUser?.maskedEmail,
          maskedPhone: data.conflictDetails?.existingUser?.maskedPhone,
          phone: data.conflictDetails?.existingUser?.phone || phoneNumberId,
          phoneNumberId: data.conflictDetails?.existingUser?.phoneNumberId || phoneNumberId,
          wabaId: data.conflictDetails?.existingUser?.businessAccountId || businessAccountId,
          externalAppName: data.conflictDetails?.externalApp?.name,
          source: "manual",
          manualPayload: {
            access_token: accessToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId,
            api_version: apiVersion,
          },
        });
        setConflictDialogOpen(true);
        setSavingAccessToken(false);
        return;
      }

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

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.wachat.tech";

  const webhookUrl = settings?.webhook_token
    ? `${origin}/api/webhook/${settings.webhook_token}`
    : loading
      ? ""
      : `${origin}/api/webhook`;

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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0C0F0D] p-6">
        <div className="text-center space-y-4 max-w-sm p-6 bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800/80 rounded-2xl shadow-xl">
          <div className="size-12 rounded-2xl bg-[#5F7C65]/12 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mx-auto">
            <CheckCircle2 className="h-6 w-6 text-[#5F7C65]" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Meta Authorization Received!
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Connecting your WhatsApp account to WaChat... This window will close automatically.
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-[#5F7C65] mx-auto" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.close()}
            className="mt-2 text-xs rounded-xl border-stone-300 dark:border-stone-700"
          >
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-[#5F7C65]" />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Loading WhatsApp configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-3">
            <LogoIcon className="size-3.5 text-[#5F7C65]" />
            <span>Cloud API Gateway</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
            WhatsApp <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">Configuration</span>
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed">
            Connect and manage your WhatsApp Cloud Business API to send and receive real-time messages with WaChat.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: CONNECTED STATE - Displays connected account & Disconnect option */}
        {/* ========================================================================= */}
        {isConnected ? (
          <div className="space-y-6">
            {/* Status Card (Doppelrand Architecture) */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200/70 dark:border-stone-800/70">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] shrink-0">
                      <CheckCircle2 className="size-6 text-[#5F7C65]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                          WhatsApp Connected &amp; Active
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25">
                          <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
                          Live
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                        Your WhatsApp Cloud API account is fully integrated and actively receiving messages.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunWebhookTest}
                      disabled={testingWebhook}
                      className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs h-9 px-3.5 shadow-2xs font-medium transition-all active:scale-[0.98] flex items-center gap-1.5"
                      title="Dispatch test incoming WhatsApp message and verify Meta subscriptions"
                    >
                      <FlaskConical className={cn("size-3.5 text-[#5F7C65]", testingWebhook && "animate-spin")} />
                      {testingWebhook ? "Testing..." : "Test Webhook"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncPhone}
                      disabled={syncingPhone}
                      className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs h-9 px-3.5 shadow-2xs font-medium transition-all active:scale-[0.98]"
                      title="Refresh status and check Meta for phone numbers"
                    >
                      <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5 text-[#5F7C65]", syncingPhone && "animate-spin")} />
                      {syncingPhone ? "Syncing..." : "Sync from Meta"}
                    </Button>
                    <Link href="/protected">
                      <Button className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs h-9 px-4 font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] transition-all active:scale-[0.98] flex items-center gap-1.5">
                        Go to Chat
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/50 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/25 hover:border-red-200 text-xs h-9 px-3 font-medium transition-all active:scale-[0.98] flex items-center gap-1.5"
                      onClick={() => setDisconnectDialogOpen(true)}
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>

                {/* Notice if Phone Number ID is not yet attached */}
                {!settings?.phone_number_id && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
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
                        className="font-mono text-xs w-44 h-8 rounded-lg border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingPhoneId || !phoneNumberId.trim()}
                        className="text-xs h-8 rounded-lg bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium"
                      >
                        {savingPhoneId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save ID
                      </Button>
                    </form>
                  </div>
                )}

                {/* Action Required: Cloud API Registration Banner */}
                {phoneRegStatus && phoneRegStatus.status !== "CONNECTED" && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2 flex-wrap">
                            <span>Phone Registration Required with Meta Cloud API</span>
                            {phoneRegStatus.is_pin_enabled ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                2FA PIN Enabled on Meta
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-500/15 text-stone-700 dark:text-stone-300">
                                Standard PIN (123456)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                            This phone number is verified with Meta, but Cloud API registration is required before WhatsApp allows sending or receiving messages.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          onClick={() => handleRegisterPhone()}
                          disabled={registeringPhone}
                          className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium h-9 px-4 shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          {registeringPhone ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1" />
                              Registering on Meta...
                            </>
                          ) : (
                            <>
                              <Zap className="size-3.5" />
                              Register Phone Now
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPinInput(!showPinInput)}
                          className="rounded-xl border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 text-xs h-9 px-3"
                        >
                          {showPinInput ? "Hide PIN" : "Edit PIN"}
                        </Button>
                      </div>
                    </div>

                    {/* PIN Customization Row */}
                    {showPinInput && (
                      <div className="pt-2.5 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-pin" className="text-xs font-medium text-amber-900 dark:text-amber-200 shrink-0">
                            6-Digit Security PIN:
                          </Label>
                          <Input
                            id="reg-pin"
                            type="password"
                            maxLength={6}
                            value={phonePin}
                            onChange={(e) => setPhonePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="123456"
                            className="w-28 h-8 text-center font-mono tracking-widest text-xs rounded-lg border-amber-500/30 bg-white dark:bg-stone-900"
                          />
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          {phoneRegStatus.is_pin_enabled
                            ? "Meta has Two-Step Verification active. Enter the 6-digit PIN configured in Meta Business Manager."
                            : "Default PIN is 123456. You can keep this or enter your custom 6-digit PIN."}
                        </p>
                      </div>
                    )}

                    {/* Error Notice */}
                    {phoneRegError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-semibold">Registration Error:</div>
                          <div>{phoneRegError}</div>
                          {phoneRegError.toLowerCase().includes("pin") && (
                            <div className="text-[11px] text-red-600 dark:text-red-400">
                              💡 Tip: Click &quot;Edit PIN&quot; above and enter the exact 6-digit PIN set in WhatsApp Manager (Phone Numbers &gt; Two-step verification).
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Success Notice */}
                    {phoneRegSuccess && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                        <span>{phoneRegSuccess}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4-Item Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {/* Card 1: Connected Phone */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-1.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                        <Phone className="h-3.5 w-3.5 text-[#5F7C65]" />
                        <span>Connected Phone</span>
                      </div>
                      {phoneRegStatus?.status === 'CONNECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                          <span className="size-1 rounded-full bg-[#5F7C65]" />
                          Registered &amp; Active
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                            {phoneRegStatus?.status === 'PENDING'
                              ? 'Pending Approval'
                              : 'Verified (Registration Needed)'}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRegisterPhone()}
                            disabled={registeringPhone}
                            className="h-6 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium shadow-2xs flex items-center gap-1 transition-all active:scale-95"
                            title="Register phone with Meta Cloud API"
                          >
                            {registeringPhone ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Zap className="size-3" />
                            )}
                            {registeringPhone ? "Registering..." : "Register"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-mono tracking-tight">
                      {settings?.phone_number || settings?.phone_number_id || "WhatsApp Account (WABA Active)"}
                    </p>
                    {settings?.full_name ? (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Verified Name: <span className="font-medium text-stone-800 dark:text-stone-200">{settings.full_name}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Account linked via Meta Embedded Signup
                      </p>
                    )}

                    {/* Quick Register Action inside Card 1 */}
                    {phoneRegStatus && phoneRegStatus.status !== 'CONNECTED' && (
                      <div className="mt-2.5 pt-2.5 border-t border-stone-200/70 dark:border-stone-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-500/5 dark:bg-amber-500/10 -mx-4 -mb-4 p-3 rounded-b-xl border-t border-amber-500/20">
                        <div className="text-[11px] text-amber-800 dark:text-amber-300">
                          {phoneRegStatus.is_pin_enabled ? (
                            <span>Meta Two-Factor Auth detected. Ready to register.</span>
                          ) : (
                            <span>One-click registration needed to send &amp; receive messages.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRegisterPhone()}
                            disabled={registeringPhone}
                            className="h-7 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            {registeringPhone ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Zap className="size-3" />
                            )}
                            {registeringPhone ? "Registering..." : "Register Phone"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPinInput(!showPinInput)}
                            className="h-7 px-2 text-[11px] rounded-lg border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15"
                            title="Configure 6-digit PIN"
                          >
                            {showPinInput ? "Hide PIN" : "PIN"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Phone Number ID */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-1.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                        Phone Number ID
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                        onClick={() => copyToClipboard(settings?.phone_number_id || "", "phone")}
                        title="Copy Phone Number ID"
                      >
                        {copiedPhoneId ? (
                          <Check className="h-3.5 w-3.5 text-[#5F7C65]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-stone-900 dark:text-stone-100 truncate">
                      {settings?.phone_number_id || (
                        <span className="text-xs text-stone-400 italic">Pending Sync · Click &quot;Sync from Meta&quot;</span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Unique Meta identifier for this phone line
                    </p>
                  </div>

                  {/* Card 3: Business Account ID */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-1.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                        <Building2 className="h-3.5 w-3.5 text-[#5F7C65]" />
                        <span>WhatsApp Business Account (WABA)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                        onClick={() => copyToClipboard(settings?.business_account_id || "", "waba")}
                        title="Copy WABA ID"
                      >
                        {copiedWabaId ? (
                          <Check className="h-3.5 w-3.5 text-[#5F7C65]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-stone-900 dark:text-stone-100 truncate">
                      {settings?.business_account_id || "N/A"}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Parent organization account ID on Meta
                    </p>
                  </div>

                  {/* Card 4: Webhook Status */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-2 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                        <Radio className="h-3.5 w-3.5 text-[#5F7C65]" />
                        <span>Webhook Status</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                        {settings?.webhook_verified ? "Subscribed & Verified" : "Active"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span>Callback URL:</span>
                        <span>Verify Token: <strong className="font-mono text-stone-700 dark:text-stone-300">{settings?.verify_token || "VAsDSKmdFNSDMvsdDOpk"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 bg-stone-100/80 dark:bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-200/60 dark:border-stone-700/60">
                          <p className="text-xs text-stone-600 dark:text-stone-300 truncate font-mono">
                            {webhookUrl || "Generating unique webhook URL..."}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors shrink-0"
                          onClick={() => copyToClipboard(webhookUrl, "webhook")}
                          disabled={!webhookUrl}
                          title="Copy Webhook URL"
                        >
                          {copiedWebhookUrl ? (
                            <Check className="h-3.5 w-3.5 text-[#5F7C65]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        Configure Meta subscriptions and test live incoming delivery pipeline.
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSyncPhone}
                          disabled={syncingPhone}
                          className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-200 text-xs h-8 px-3 font-medium hover:bg-stone-100 dark:hover:bg-stone-700 shrink-0 flex items-center gap-1.5"
                          title="Subscribe WABA and configure Meta App Webhook via Graph API"
                        >
                          <RefreshCw className={cn("size-3.5 text-[#5F7C65]", syncingPhone && "animate-spin")} />
                          {syncingPhone ? "Syncing..." : "Sync Webhook to Meta"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRunWebhookTest}
                          disabled={testingWebhook}
                          className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-200 text-xs h-8 px-3 font-medium hover:bg-stone-100 dark:hover:bg-stone-700 shrink-0 flex items-center gap-1.5"
                        >
                          <FlaskConical className={cn("size-3.5 text-[#5F7C65]", testingWebhook && "animate-spin")} />
                          {testingWebhook ? "Running..." : "Test Webhook"}
                        </Button>
                      </div>
                    </div>

                    {metaWebhookSyncInfo?.meta_configured_url && !metaWebhookSyncInfo.url_matches_active_domain && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1.5 text-amber-800 dark:text-amber-300">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Meta App Callback URL points to another domain:</span>
                        </div>
                        <p className="font-mono text-[11px] truncate bg-white/60 dark:bg-stone-900/60 p-1.5 rounded-lg border border-amber-500/20">
                          {metaWebhookSyncInfo.meta_configured_url}
                        </p>
                        <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                          To receive messages in development, update Callback URL in Meta App Dashboard → Webhooks to:
                        </p>
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-[11px] bg-white/80 dark:bg-stone-900/80 p-1.5 rounded-lg border border-stone-200/80 dark:border-stone-700 select-all flex-1 truncate">
                            {metaWebhookSyncInfo.current_domain_url}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px] rounded-lg border-stone-300 dark:border-stone-700"
                            onClick={() => copyToClipboard(metaWebhookSyncInfo.current_domain_url || "", "webhook")}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Footer */}
                <div className="mt-6 pt-4 border-t border-stone-200/70 dark:border-stone-800/70 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 dark:text-stone-400 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#5F7C65]" />
                    <span>Cloud API Version: <strong className="text-stone-700 dark:text-stone-300 font-mono">{settings?.api_version || "v23.0"}</strong></span>
                  </div>
                  <span>Need to change accounts? Disconnect above to re-link.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DISCONNECTED STATE - Shows both Embedded Signup & Manual methods   */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Choose Setup Method Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="inline-flex h-auto min-h-12 w-full max-w-md sm:max-w-lg items-center justify-center rounded-2xl bg-stone-200/70 dark:bg-stone-900/80 p-1.5 border border-stone-300/50 dark:border-stone-800/80 shadow-xs backdrop-blur-md">
                  <TabsTrigger
                    value="embedded"
                    className="flex-1 inline-flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-[#18201B] data-[state=active]:text-stone-900 dark:data-[state=active]:text-stone-100 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-stone-200/80 dark:data-[state=active]:border-stone-700/60 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <Zap className="h-4 w-4 text-[#5F7C65] shrink-0" />
                    <span className="font-semibold">1-Click Connect</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                      Recommended
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className="flex-1 inline-flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-[#18201B] data-[state=active]:text-stone-900 dark:data-[state=active]:text-stone-100 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-stone-200/80 dark:data-[state=active]:border-stone-700/60 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <Sliders className="h-4 w-4 text-stone-500 shrink-0" />
                    <span className="font-semibold">Manual Setup</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ============================================================= */}
              {/* TAB 1: 1-CLICK EMBEDDED SIGNUP (RECOMMENDED)                  */}
              {/* ============================================================= */}
              <TabsContent value="embedded" className="space-y-6 focus-visible:outline-none">
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
                  <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 text-center">
                    <div className="mx-auto size-14 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-3">
                      <Zap className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">
                      Connect with WhatsApp Embedded Signup
                    </h2>
                    <p className="text-stone-600 dark:text-stone-400 text-sm max-w-lg mx-auto mt-1.5 leading-relaxed">
                      Log in with Facebook to select your WhatsApp Business Account and phone number.
                      Everything is configured automatically in under 60 seconds.
                    </p>

                    <div className="space-y-6 max-w-xl mx-auto mt-6 text-left">
                      {/* Benefits 3-col */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/80 shadow-2xs space-y-1">
                          <CheckCircle2 className="h-5 w-5 text-[#5F7C65] mx-auto" />
                          <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">No Manual Tokens</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">Permanent system token issued automatically</p>
                        </div>
                        <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/80 shadow-2xs space-y-1">
                          <Radio className="h-5 w-5 text-[#5F7C65] mx-auto" />
                          <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Instant Webhooks</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">Auto-subscribed to receive real-time messages</p>
                        </div>
                        <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/80 shadow-2xs space-y-1">
                          <ShieldCheck className="h-5 w-5 text-[#5F7C65] mx-auto" />
                          <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Official Meta Flow</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">Secured directly by Meta Business Platform</p>
                        </div>
                      </div>

                      {/* Progress / Status feedback */}
                      {connectingEmbedded && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-[#5F7C65]/10 border border-[#5F7C65]/20 flex items-center gap-3">
                            <Loader2 className="h-5 w-5 text-[#5F7C65] animate-spin shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-stone-900 dark:text-stone-100">Connecting to Meta...</p>
                              <p className="text-xs text-[#2D583F] dark:text-[#8EAE95]">{embeddedStep}</p>
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
                            className="w-full text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 border-dashed rounded-xl"
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Already completed in Meta popup? Refresh connection status
                          </Button>
                        </div>
                      )}

                      {embeddedError && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-red-900 dark:text-red-200">Connection Failed</p>
                            <p className="text-xs text-red-700 dark:text-red-300">{embeddedError}</p>
                          </div>
                        </div>
                      )}

                      {embeddedSuccess && (
                        <div className="p-4 rounded-xl bg-[#5F7C65]/10 border border-[#5F7C65]/20 flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-[#5F7C65] shrink-0" />
                          <p className="text-sm font-medium text-[#2D583F] dark:text-[#8EAE95]">
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
                          className="w-full min-h-12 py-3 px-6 text-sm sm:text-base font-semibold text-white rounded-xl shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.25),inset_0_-2px_4px_0_rgba(0,0,0,0.22),0_4px_16px_rgba(24,119,242,0.28)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-0 bg-[#1877F2]"
                        >
                          {connectingEmbedded ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin text-white shrink-0" />
                              <span>{embeddedStep || "Connecting WhatsApp..."}</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-5 w-5 fill-white shrink-0" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                              <span>Connect WhatsApp via Facebook</span>
                            </>
                          )}
                        </button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleOpenDirectPopup}
                          disabled={connectingEmbedded}
                          className="w-full h-11 text-xs sm:text-sm font-medium border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-900/60 text-stone-800 dark:text-stone-200 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-[0.98]"
                        >
                          <ExternalLink className="h-4 w-4 text-[#5F7C65] shrink-0" />
                          <span>Launch Meta Authorization Window</span>
                        </Button>

                        <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
                          Direct Meta OAuth 2.0 flow. Once authorized, your WhatsApp account is linked in under 60 seconds.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-stone-200/70 dark:border-stone-800/70 text-center text-xs text-stone-500 dark:text-stone-400 space-y-1">
                      <p>
                        App ID: <span className="font-mono">{META_APP_ID}</span> | Login Config: <span className="font-mono">{META_CONFIG_ID}</span>
                      </p>
                      <p>Powered by Meta Facebook Login for Business &amp; WhatsApp Cloud API v23.0</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ============================================================= */}
              {/* TAB 2: MANUAL SETUP (PRESERVED TRADITIONAL FLOW)               */}
              {/* ============================================================= */}
              <TabsContent value="manual" className="space-y-6 focus-visible:outline-none">
                <div className="grid md:grid-cols-2 gap-6 items-stretch">
                  {/* Access Token Configuration */}
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col">
                    <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex-1 flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <span>Access Token Configuration</span>
                            {settings?.access_token_added && (
                              <CheckCircle2 className="h-4 w-4 text-[#5F7C65]" />
                            )}
                          </h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Manually provide credentials from your Meta Business Suite
                        </p>
                      </div>

                      <form onSubmit={handleSaveAccessToken} className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="access-token" className="text-xs font-medium text-stone-700 dark:text-stone-300">Access Token *</Label>
                              {settings?.has_access_token && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                                  Configured
                                </span>
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
                                className="font-mono text-sm pr-20 h-10 rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                              />
                              {accessToken && (
                                <div className="absolute right-2 flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                                    onClick={() => setShowAccessToken(!showAccessToken)}
                                    title={showAccessToken ? "Hide token" : "Show token"}
                                  >
                                    {showAccessToken ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                                    onClick={() => copyToClipboard(accessToken, "access")}
                                    title="Copy token"
                                  >
                                    {copiedAccessToken ? (
                                      <Check className="h-3.5 w-3.5 text-[#5F7C65]" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              System User or temporary token from Meta Business Manager
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="phone-number-id" className="text-xs font-medium text-stone-700 dark:text-stone-300">Phone Number ID *</Label>
                              {settings?.has_phone_number_id && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                                  Configured
                                </span>
                              )}
                            </div>
                            <Input
                              id="phone-number-id"
                              type="text"
                              placeholder="Enter your Phone Number ID"
                              value={phoneNumberId}
                              onChange={(e) => setPhoneNumberId(e.target.value)}
                              className="font-mono text-sm h-10 rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                            />
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Found in WhatsApp API Setup in Meta App Dashboard
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="business-account-id" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                                Business Account ID (WABA) <span className="text-[10px] text-stone-400 font-normal">(Auto-detected if blank)</span>
                              </Label>
                              {settings?.has_business_account_id && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                                  Configured
                                </span>
                              )}
                            </div>
                            <Input
                              id="business-account-id"
                              type="text"
                              placeholder="Auto-detected from Meta (or enter WABA ID)"
                              value={businessAccountId}
                              onChange={(e) => setBusinessAccountId(e.target.value)}
                              className="font-mono text-sm h-10 rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                            />
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Your WhatsApp Business Account (WABA) ID. Automatically discovered from Meta if left blank.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="api-version" className="text-xs font-medium text-stone-700 dark:text-stone-300">API Version</Label>
                            <Input
                              id="api-version"
                              type="text"
                              placeholder="v23.0"
                              value={apiVersion}
                              onChange={(e) => setApiVersion(e.target.value)}
                              className="font-mono text-sm h-10 rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                            />
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Default: v23.0
                            </p>
                          </div>

                          {accessTokenError && (
                            <div className="text-xs text-red-600 bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{accessTokenError}</span>
                            </div>
                          )}

                          {accessTokenSuccess && (
                            <div className="text-xs text-[#2D583F] dark:text-[#8EAE95] bg-[#5F7C65]/10 p-3 rounded-xl border border-[#5F7C65]/20 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#5F7C65]" />
                              <span>Access token saved successfully!</span>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={savingAccessToken}
                          className="w-full h-11 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all duration-200 active:scale-[0.98] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-4"
                        >
                          {savingAccessToken ? (
                            <>
                              <Loader2 className="size-4 animate-spin text-white" />
                              <span>Saving Credentials...</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-4 text-white" />
                              <span>Save Credentials</span>
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Webhook Configuration */}
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col">
                    <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex-1 flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <span>Webhook Setup</span>
                            {settings?.webhook_verified && (
                              <CheckCircle2 className="h-4 w-4 text-[#5F7C65]" />
                            )}
                          </h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Required for receiving incoming WhatsApp messages
                        </p>
                      </div>

                      <form onSubmit={handleSaveWebhook} className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          {/* Webhook URL */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">Webhook Callback URL</Label>
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                                Unique to You
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={webhookUrl || "Generating unique webhook URL..."}
                                readOnly
                                className="font-mono text-xs bg-stone-100/90 dark:bg-stone-950/60 rounded-xl border-stone-300/80 dark:border-stone-700/80 text-stone-800 dark:text-stone-200 h-10 select-all"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(webhookUrl, "webhook")}
                                disabled={!webhookUrl}
                                className="h-10 w-10 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 shrink-0 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                              >
                                {copiedWebhookUrl ? (
                                  <Check className="h-4 w-4 text-[#5F7C65]" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Copy this URL to your Meta Webhooks configuration
                            </p>
                          </div>

                          {/* Verify Token */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="verify-token" className="text-xs font-medium text-stone-700 dark:text-stone-300">Verify Token *</Label>
                              {settings?.has_verify_token && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                                  Configured
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                id="verify-token"
                                type="text"
                                placeholder="Enter a secure verify token"
                                value={verifyToken}
                                onChange={(e) => setVerifyToken(e.target.value)}
                                className="font-mono text-sm h-10 rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                              />
                              {verifyToken && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(verifyToken, "verify")}
                                  className="h-10 w-10 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 shrink-0 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                                >
                                  {copiedVerifyToken ? (
                                    <Check className="h-4 w-4 text-[#5F7C65]" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Custom string matched when Meta verifies your webhook
                            </p>
                          </div>

                          {/* Quick steps */}
                          <div className="bg-[#FAF8F5]/90 dark:bg-stone-950/50 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 space-y-1.5 text-xs">
                            <p className="font-semibold text-stone-900 dark:text-stone-100">Steps in Meta Dashboard:</p>
                            <ol className="list-decimal list-inside space-y-1 text-stone-600 dark:text-stone-400 text-[11px]">
                              <li>Go to Meta App Dashboard → WhatsApp → Configuration</li>
                              <li>Paste the Webhook Callback URL and Verify Token</li>
                              <li>Click &quot;Verify and Save&quot; in Meta</li>
                              <li>Subscribe to the <span className="font-mono font-semibold">messages</span> field</li>
                            </ol>
                          </div>

                          {webhookError && (
                            <div className="text-xs text-red-600 bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{webhookError}</span>
                            </div>
                          )}

                          {webhookSuccess && (
                            <div className="text-xs text-[#2D583F] dark:text-[#8EAE95] bg-[#5F7C65]/10 p-3 rounded-xl border border-[#5F7C65]/20 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#5F7C65]" />
                              <span>Webhook configuration saved!</span>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={savingWebhook}
                          className="w-full h-11 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all duration-200 active:scale-[0.98] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-4"
                        >
                          {savingWebhook ? (
                            <>
                              <Loader2 className="size-4 animate-spin text-white" />
                              <span>Saving Configuration...</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-4 text-white" />
                              <span>Save Webhook Configuration</span>
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Confirmation Dialog for Disconnecting */}
        <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6">
            <DialogHeader>
              <div className="mx-auto size-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
                <Unplug className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Disconnect WhatsApp Account?
              </DialogTitle>
              <DialogDescription className="text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                Are you sure you want to disconnect this WhatsApp number? You will not be able to send or receive messages in WaChat until you reconnect.
              </DialogDescription>
            </DialogHeader>

            {disconnectError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                <span>{disconnectError}</span>
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisconnectDialogOpen(false)}
                disabled={disconnecting}
                className="rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium h-9 px-4 shadow-sm"
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

        {/* WhatsApp Account Conflict & Transfer Confirmation Dialog */}
        <Dialog
          open={conflictDialogOpen}
          onOpenChange={(open) => {
            if (!open && !transferring) {
              handleAbortTransfer();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg rounded-2xl border border-amber-300/80 dark:border-amber-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6 shadow-2xl">
            <DialogHeader>
              <div className="mx-auto size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                WhatsApp Account Already Connected
              </DialogTitle>
              <DialogDescription className="text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                This WhatsApp business profile is already active in another WaChat workspace or provider.
              </DialogDescription>
            </DialogHeader>

            {/* Account Details Box */}
            <div className="my-2 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200/80 dark:border-stone-800/80 p-4 space-y-2.5 text-xs">
              {conflictInfo?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-medium">
                    <Phone className="size-3.5 text-stone-400" />
                    Phone Number:
                  </span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                    {conflictInfo.phone}
                  </span>
                </div>
              )}
              {conflictInfo?.wabaId && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-medium">
                    <Building2 className="size-3.5 text-stone-400" />
                    WABA ID:
                  </span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {conflictInfo.wabaId}
                  </span>
                </div>
              )}
              {conflictInfo?.maskedEmail && (
                <div className="flex items-center justify-between border-t border-stone-200/60 dark:border-stone-800/60 pt-2">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-medium">
                    <Radio className="size-3.5 text-amber-500" />
                    Currently Linked To:
                  </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {conflictInfo.maskedEmail}
                  </span>
                </div>
              )}
              {conflictInfo?.externalAppName && (
                <div className="flex items-center justify-between border-t border-stone-200/60 dark:border-stone-800/60 pt-2">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-medium">
                    <Radio className="size-3.5 text-amber-500" />
                    External Provider:
                  </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {conflictInfo.externalAppName}
                  </span>
                </div>
              )}
            </div>

            {/* Warning Callout Box */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                What happens if you transfer:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90">
                <li>This WhatsApp account will be <strong>disconnected</strong> from the existing account.</li>
                <li>All incoming messages, read receipts, and live chat will be <strong>redirected exclusively to your workspace</strong>.</li>
                <li>Only one workspace can actively receive webhook messages per WhatsApp number.</li>
              </ul>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{transferError}</span>
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
              <Button
                type="button"
                variant="outline"
                onClick={handleAbortTransfer}
                disabled={transferring}
                className="rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium h-9 px-4"
              >
                Abort Setup
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferring}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium h-9 px-4 shadow-sm flex items-center gap-1.5"
              >
                {transferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting & Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="size-3.5" />
                    Disconnect & Transfer Here
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Webhook Diagnostic & Test Results Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-xl rounded-2xl border-stone-200 dark:border-stone-800 bg-[#FAF8F5] dark:bg-stone-900 p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-10 rounded-xl border flex items-center justify-center shrink-0",
                  testResult?.success
                    ? "bg-[#5F7C65]/15 border-[#5F7C65]/30 text-[#5F7C65]"
                    : testResult
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                    : "bg-stone-500/15 border-stone-500/30 text-stone-600"
                )}>
                  <FlaskConical className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    Webhook Ingestion &amp; Meta Subscriptions Test
                  </DialogTitle>
                  <DialogDescription className="text-xs text-stone-600 dark:text-stone-400">
                    Live end-to-end diagnostic of Meta webhook subscriptions and simulated message delivery.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {testingWebhook ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="size-8 animate-spin text-[#5F7C65]" />
                <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Sending simulated WhatsApp message and querying Meta Graph API...
                </p>
              </div>
            ) : testResult ? (
              <div className="space-y-4 py-2 text-xs">
                {/* Overall Status Banner */}
                <div className={cn(
                  "p-3.5 rounded-xl border flex items-start gap-2.5",
                  testResult.success
                    ? "bg-[#5F7C65]/10 border-[#5F7C65]/30 text-[#2D583F] dark:text-[#8EAE95]"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                )}>
                  {testResult.success ? (
                    <CheckCircle2 className="size-5 shrink-0 text-[#5F7C65] mt-0.5" />
                  ) : (
                    <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {testResult.success
                        ? "Webhook Ingestion & Verification Successful!"
                        : "Webhook Test Completed with Warnings"}
                    </div>
                    <div className="text-xs opacity-90 mt-0.5">
                      {testResult.message || (testResult.success
                        ? "Simulated incoming WhatsApp message was accepted by the webhook endpoint and verified in the database for your account."
                        : "Review the diagnostic details below to ensure Meta is routing incoming customer messages.")}
                    </div>
                  </div>
                </div>

                {/* Stage 1: Simulated Payload Delivery */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Radio className="size-3.5 text-[#5F7C65]" />
                      Simulated Webhook Delivery
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                      testResult.stage2_simulation.success
                        ? "bg-[#5F7C65]/15 text-[#5F7C65] border border-[#5F7C65]/30"
                        : "bg-red-500/15 text-red-600 border border-red-500/30"
                    )}>
                      {testResult.stage2_simulation.success ? "Passed (200 OK)" : `Failed (${testResult.stage2_simulation.status_code})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400 pt-1">
                    <div>
                      Target URL: <span className="font-mono text-stone-800 dark:text-stone-200 truncate block">{testResult.stage1_meta.current_webhook_url}</span>
                    </div>
                    <div>
                      DB Verified: <span className={cn("font-medium", testResult.stage2_simulation.message_saved ? "text-[#5F7C65]" : "text-amber-600")}>
                        {testResult.stage2_simulation.message_saved ? "Yes (Saved in Chat)" : "Pending / Not Found"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stage 2: Meta Subscriptions Check */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[#5F7C65]" />
                      Meta Graph API Subscription Check
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                      testResult.stage1_meta.waba_subscribed
                        ? "bg-[#5F7C65]/15 text-[#5F7C65] border border-[#5F7C65]/30"
                        : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                    )}>
                      {testResult.stage1_meta.waba_subscribed ? "WABA Subscribed" : "Not Confirmed"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-stone-600 dark:text-stone-400 pt-1">
                    {testResult.stage1_meta.meta_registered_url ? (
                      <div>
                        Meta Callback URL:
                        <span className="font-mono text-stone-800 dark:text-stone-200 block truncate bg-stone-100 dark:bg-stone-900 p-1 rounded mt-0.5">
                          {testResult.stage1_meta.meta_registered_url}
                        </span>
                      </div>
                    ) : null}

                    {testResult.stage1_meta.meta_registered_fields && testResult.stage1_meta.meta_registered_fields.length > 0 && (
                      <div>
                        Subscribed Meta Fields:
                        <div className="flex flex-wrap gap-1 mt-1">
                          {testResult.stage1_meta.meta_registered_fields.map((field: string) => (
                            <span key={field} className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-mono",
                              field === "messages"
                                ? "bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] font-semibold"
                                : "bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300"
                            )}>
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Helpful Guidance */}
                <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">How to trigger a real test from Meta:</div>
                  <div>
                    Go to Meta Developer Dashboard → Your App → <strong>WhatsApp</strong> → <strong>Configuration</strong> → <strong>Webhook fields</strong> → click <strong>Test</strong> next to the <code>messages</code> field.
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestDialogOpen(false)}
                className="rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium h-9 px-4"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleRunWebhookTest}
                disabled={testingWebhook}
                className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium h-9 px-4 shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className={cn("size-3.5", testingWebhook && "animate-spin")} />
                {testingWebhook ? "Running..." : "Run Test Again"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
