"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LogoIcon from "@/components/logo-icon";
import { useSubscriptionStatus } from "@/components/subscription-guard";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Key,
  Calendar,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Terminal,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  RefreshCw,
  Send,
  FileCode2,
  Activity,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  partial_key: string;
  last_used: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const subscriptionStatus = useSubscriptionStatus();
  const isRestricted = subscriptionStatus.loading
    ? false
    : !subscriptionStatus.isActive || subscriptionStatus.messagingBlocked;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form modal state
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Key visibility & revealed data
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [fullKeys, setFullKeys] = useState<Record<string, string>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

  // Copy states
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  // Newly created key display
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; key: string } | null>(null);

  // Revoke confirmation modal state
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Documentation tab state
  const [docTab, setDocTab] = useState<"curl" | "node" | "python">("curl");
  const [showDocs, setShowDocs] = useState(true);

  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/api-keys");
      const data = await response.json();

      if (response.ok) {
        setApiKeys(data.data || []);
      } else {
        toast(data.error?.message || data.message || "Failed to load API keys", "error");
      }
    } catch (err) {
      console.error("Error loading API keys:", err);
      toast("Failed to load API keys", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast("Please provide a descriptive name for the API key", "warning");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || "Failed to create API key");
      }

      setNewlyCreatedKey({
        name: data.data.name,
        key: data.data.key,
      });

      setNewKeyName("");
      setShowNewKeyModal(false);
      await loadApiKeys();
      toast("API key generated successfully", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create API key", "error");
    } finally {
      setCreating(false);
    }
  };

  const updateApiKey = async (id: string, name: string) => {
    if (!name.trim()) {
      toast("API key name cannot be empty", "warning");
      return;
    }

    try {
      setUpdatingId(id);

      const response = await fetch("/api/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || "Failed to update API key");
      }

      setEditingId(null);
      setEditingName("");
      toast("API key renamed successfully", "success");
      await loadApiKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update API key", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const revokeApiKey = async () => {
    if (!keyToRevoke) return;

    try {
      setRevoking(true);

      const response = await fetch(`/api/api-keys?id=${keyToRevoke.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || "Failed to revoke API key");
      }

      toast(`API key "${keyToRevoke.name}" has been permanently revoked`, "success");
      setKeyToRevoke(null);
      await loadApiKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to revoke API key", "error");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string, keyId: string, label = "API Key") => {
    navigator.clipboard.writeText(text);
    setCopiedKeys((prev) => ({ ...prev, [keyId]: true }));
    toast(`${label} copied to clipboard`, "success", 2000);
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [keyId]: false }));
    }, 2000);
  };

  const toggleKeyVisibility = async (keyId: string) => {
    if (visibleKeys[keyId]) {
      setVisibleKeys((prev) => ({ ...prev, [keyId]: false }));
      return;
    }

    try {
      setLoadingKeys((prev) => ({ ...prev, [keyId]: true }));

      const response = await fetch(`/api/api-keys?reveal=${keyId}`);
      const data = await response.json();

      if (response.ok && data.data?.key) {
        setFullKeys((prev) => ({ ...prev, [keyId]: data.data.key }));
        setVisibleKeys((prev) => ({ ...prev, [keyId]: true }));
      } else {
        toast(data.error?.message || data.message || "Failed to reveal API key", "error");
      }
    } catch (err) {
      console.error("Error revealing API key:", err);
      toast("Failed to reveal API key", "error");
    } finally {
      setLoadingKeys((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never used";
    try {
      return new Date(dateString).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getPartialDisplay = (partialKey: string, keyId: string, isVisible: boolean) => {
    if (isVisible && fullKeys[keyId]) {
      return fullKeys[keyId];
    }
    if (isVisible) {
      return partialKey;
    }
    return partialKey.substring(0, 4) + "••••••••••••••••••••••••••••••";
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
      <Toaster />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16">
        {/* Atmospheric Header matching /protected/setup */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-3">
            <LogoIcon className="size-3.5 text-[#5F7C65]" />
            <span>Developer Tokens &amp; Integration Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
            API <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">Keys</span> &amp; Access Credentials
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed">
            Generate and manage sovereign API tokens to programmatically send WhatsApp messages, inspect delivery statuses, and automate template workflows.
          </p>
        </div>

        {/* Subscription Restriction Banner */}
        {!subscriptionStatus.loading && isRestricted && (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/25 p-4.5 mb-6 space-y-2 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  API Provisioning Suspended
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {subscriptionStatus?.messagingBlockedReason ||
                    "Your workspace subscription is currently inactive. API key creation and live secret reveal are disabled until subscription renewal."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Newly Created Key Alert Card (Shown once with Doppelrand architecture) */}
        {newlyCreatedKey && (
          <div className="rounded-2xl border border-[#5F7C65]/35 dark:border-[#5F7C65]/30 bg-white/90 dark:bg-stone-900/80 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(45,88,63,0.12)] mb-6 animate-in fade-in duration-200">
            <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5] dark:bg-stone-900/90 p-5 space-y-4 border border-[#5F7C65]/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center shrink-0">
                    <Lock className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Save Your New API Key Securely
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      This secret token will only be shown in plain text once. Copy it now and store it in your environment variables.
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewlyCreatedKey(null)}
                  className="size-7 p-0 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-stone-600 dark:text-stone-400">
                  <span>
                    Name: <strong className="text-stone-900 dark:text-stone-100">{newlyCreatedKey.name}</strong>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">
                    One-Time Plaintext Revelation
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newlyCreatedKey.key}
                    readOnly
                    className="font-mono text-xs sm:text-sm bg-white dark:bg-stone-950 border-stone-300 dark:border-stone-700 h-10 rounded-xl select-all"
                  />
                  <Button
                    onClick={() => copyToClipboard(newlyCreatedKey.key, "new", "Secret Key")}
                    className="h-10 px-4 rounded-xl text-xs bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium gap-1.5 shrink-0 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] cursor-pointer"
                  >
                    {copiedKeys["new"] ? (
                      <>
                        <Check className="size-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy Secret</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewlyCreatedKey(null)}
                  className="h-8 px-3.5 rounded-xl text-xs border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  I have safely stored this key
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Top Status & Quick Action Card (Doppelrand Architecture matching /protected/setup) */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 mb-6">
          <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] shrink-0">
                  <Key className="size-6 text-[#5F7C65]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      Active Key Inventory
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25">
                      <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
                      {apiKeys.length} {apiKeys.length === 1 ? "Key Active" : "Keys Active"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                    Authorized bearer credentials valid for WhatsApp Cloud API endpoints.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadApiKeys}
                  disabled={loading}
                  className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs h-9 px-3.5 shadow-2xs font-medium transition-all active:scale-[0.98]"
                  title="Refresh key inventory"
                >
                  <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5 text-[#5F7C65]", loading && "animate-spin")} />
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  onClick={() => setShowNewKeyModal(true)}
                  disabled={isRestricted}
                  className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs h-9 px-4 font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New API Key</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Inventory Cards */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="size-7 animate-spin mx-auto text-[#5F7C65]" />
            <p className="text-xs text-stone-500 font-mono">Retrieving secure key records...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/40 dark:bg-stone-900/30 p-12 text-center space-y-4 mb-8">
            <div className="size-12 rounded-2xl bg-[#5F7C65]/10 flex items-center justify-center mx-auto text-[#5F7C65]">
              <Key className="size-6 opacity-80" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                No API Keys Provisioned
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Create your first API key to enable webhook dispatchers, backend microservices, or custom integrations.
              </p>
            </div>
            <Button
              onClick={() => setShowNewKeyModal(true)}
              disabled={isRestricted}
              size="sm"
              className="h-9 px-4 rounded-xl text-xs bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium gap-1.5 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Create Key</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-8">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-3.5 transition-all hover:border-stone-300 dark:hover:border-stone-700"
              >
                {/* Header Row: Name & Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="size-8 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center shrink-0">
                      <Key className="size-4" />
                    </div>

                    {editingId === apiKey.id ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateApiKey(apiKey.id, editingName);
                            else if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingName("");
                            }
                          }}
                          className="h-8 text-xs font-semibold rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus-visible:ring-[#5F7C65]"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => updateApiKey(apiKey.id, editingName)}
                          disabled={updatingId === apiKey.id}
                          className="h-8 px-3 rounded-xl text-xs bg-[#5F7C65] hover:bg-[#526D57] text-white shrink-0 font-medium"
                        >
                          {updatingId === apiKey.id ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="h-8 px-3 rounded-xl text-xs border-stone-300 dark:border-stone-700 shrink-0"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate">
                          {apiKey.name}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(apiKey.id);
                            setEditingName(apiKey.name);
                          }}
                          className="size-6 p-0 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                          title="Rename API key"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status & Revoke Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wide",
                        apiKey.is_active
                          ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20"
                          : "bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          apiKey.is_active ? "bg-[#5F7C65]" : "bg-stone-400"
                        )}
                      />
                      {apiKey.is_active ? "Active" : "Inactive"}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setKeyToRevoke(apiKey)}
                      className="rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/50 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/25 hover:border-red-200 text-xs h-8 px-2.5 font-medium transition-all active:scale-[0.98] flex items-center gap-1.5"
                      title="Revoke API key"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">Revoke</span>
                    </Button>
                  </div>
                </div>

                {/* Token Display Strip */}
                <div className="flex items-center justify-between gap-3 bg-[#FAF8F5]/80 dark:bg-[#121614] border border-stone-200/80 dark:border-stone-800/80 rounded-xl px-3.5 py-2">
                  <code className="font-mono text-xs sm:text-sm text-stone-800 dark:text-stone-200 tracking-wide select-all truncate flex-1">
                    {getPartialDisplay(apiKey.partial_key, apiKey.id, visibleKeys[apiKey.id])}
                  </code>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      disabled={loadingKeys[apiKey.id] || isRestricted}
                      className="h-7 px-2.5 rounded-lg text-xs font-mono text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 gap-1.5 transition-colors cursor-pointer"
                      title={
                        isRestricted
                          ? "Subscription inactive"
                          : visibleKeys[apiKey.id]
                          ? "Hide full token"
                          : "Reveal complete token"
                      }
                    >
                      {loadingKeys[apiKey.id] ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : visibleKeys[apiKey.id] ? (
                        <>
                          <EyeOff className="size-3.5 text-[#5F7C65]" />
                          <span className="text-[11px]">Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" />
                          <span className="text-[11px]">Reveal</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          fullKeys[apiKey.id] || apiKey.partial_key,
                          apiKey.id,
                          visibleKeys[apiKey.id] ? "Full API key" : "Partial key"
                        )
                      }
                      className="h-7 px-2.5 rounded-lg text-xs font-mono text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 gap-1.5 transition-colors cursor-pointer"
                      title="Copy API key"
                    >
                      {copiedKeys[apiKey.id] ? (
                        <>
                          <Check className="size-3.5 text-[#5F7C65]" />
                          <span className="text-[11px] text-[#2D583F] dark:text-[#8EAE95] font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 text-[11px] text-stone-500 dark:text-stone-400 font-mono flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3 text-[#5F7C65]/70" />
                    <span>Created: {formatDate(apiKey.created_at)}</span>
                  </div>
                  <div className="h-3 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-[#5F7C65]/70" />
                    <span>Last Used: {formatDate(apiKey.last_used)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Developer Integration & API Reference Guide (Harmonious Botanical Theme without Harsh Black Blocks) */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
          <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
            {/* Collapsible Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200/70 dark:border-stone-800/70">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] shrink-0">
                  <Terminal className="size-5 text-[#5F7C65]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    API Integration &amp; Developer Reference
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    HTTP protocol specifications for authenticated server-to-server dispatch.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocs(!showDocs)}
                className="h-8 px-3 rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 text-xs font-medium gap-1.5 transition-all"
              >
                <span>{showDocs ? "Collapse" : "Expand"}</span>
                {showDocs ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            </div>

            {showDocs && (
              <div className="space-y-6 pt-1">
                {/* 1. Bearer Authentication Header */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono uppercase tracking-wider">
                      1. Bearer Authentication Header
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Attach your secret token to every HTTP request in the standard Authorization header:
                  </p>
                  <div className="flex items-center justify-between gap-3 bg-[#F5F2EB] dark:bg-[#121614] border border-stone-200/90 dark:border-stone-800/90 rounded-xl px-4 py-3">
                    <code className="text-xs font-mono text-stone-800 dark:text-stone-200 select-all overflow-x-auto">
                      <span className="text-[#2D583F] dark:text-[#8EAE95] font-semibold">Authorization:</span> Bearer wc_live_your_secret_api_key_here
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          "Authorization: Bearer wc_live_your_secret_api_key_here",
                          "auth_header",
                          "Header format"
                        )
                      }
                      className="rounded-lg border border-stone-300/80 dark:border-stone-700 bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 text-stone-700 dark:text-stone-200 text-xs h-7 px-2.5 shrink-0 shadow-2xs font-medium"
                    >
                      {copiedKeys["auth_header"] ? (
                        <>
                          <Check className="size-3 text-[#5F7C65] mr-1" />
                          <span className="text-[11px] text-[#2D583F] dark:text-[#8EAE95]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 2. Quick Start Example */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono uppercase tracking-wider">
                      2. Quick Start Example (Send Text Message)
                    </span>

                    {/* Language Switcher Tabs */}
                    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/80 text-[11px] font-mono border border-stone-300/40 dark:border-stone-700/60">
                      {(["curl", "node", "python"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDocTab(tab)}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all cursor-pointer",
                            docTab === tab
                              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold shadow-2xs"
                              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                          )}
                        >
                          {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : "Python"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Container with Warm Botanical Styling matching Step 1 */}
                  <div className="relative flex items-start justify-between gap-3 bg-[#F5F2EB] dark:bg-[#121614] border border-stone-200/90 dark:border-stone-800/90 rounded-xl px-4 py-3">
                    {docTab === "curl" && (
                      <pre className="text-xs font-mono text-stone-800 dark:text-stone-200 overflow-x-auto leading-relaxed select-all flex-1 m-0">
{`curl -X POST "https://your-domain.com/api/wc/messages/text" \\
  -H "Authorization: Bearer wc_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from sovereign WhatsApp API!"
  }'`}
                      </pre>
                    )}

                    {docTab === "node" && (
                      <pre className="text-xs font-mono text-stone-800 dark:text-stone-200 overflow-x-auto leading-relaxed select-all flex-1 m-0">
{`const response = await fetch("https://your-domain.com/api/wc/messages/text", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.WHATSAPP_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    recipient: "+1234567890",
    message: "Hello from sovereign WhatsApp API!"
  })
});
const data = await response.json();`}
                      </pre>
                    )}

                    {docTab === "python" && (
                      <pre className="text-xs font-mono text-stone-800 dark:text-stone-200 overflow-x-auto leading-relaxed select-all flex-1 m-0">
{`import os, requests

res = requests.post(
    "https://your-domain.com/api/wc/messages/text",
    headers={
        "Authorization": f"Bearer {os.environ['WHATSAPP_API_KEY']}",
        "Content-Type": "application/json"
    },
    json={
        "recipient": "+1234567890",
        "message": "Hello from sovereign WhatsApp API!"
    }
)
print(res.json())`}
                      </pre>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const snippet =
                          docTab === "curl"
                            ? `curl -X POST "https://your-domain.com/api/wc/messages/text" \\\n  -H "Authorization: Bearer wc_live_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "recipient": "+1234567890",\n    "message": "Hello from sovereign WhatsApp API!"\n  }'`
                            : docTab === "node"
                            ? `const response = await fetch("https://your-domain.com/api/wc/messages/text", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer " + process.env.WHATSAPP_API_KEY,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    recipient: "+1234567890",\n    message: "Hello from sovereign WhatsApp API!"\n  })\n});\nconst data = await response.json();`
                            : `import os, requests\n\nres = requests.post(\n    "https://your-domain.com/api/wc/messages/text",\n    headers={\n        "Authorization": f"Bearer {os.environ['WHATSAPP_API_KEY']}",\n        "Content-Type": "application/json"\n    },\n    json={\n        "recipient": "+1234567890",\n        "message": "Hello from sovereign WhatsApp API!"\n    }\n)\nprint(res.json())`;
                        copyToClipboard(snippet, "snippet", `${docTab} snippet`);
                      }}
                      className="rounded-lg border border-stone-300/80 dark:border-stone-700 bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 text-stone-700 dark:text-stone-200 text-xs h-7 px-2.5 shrink-0 shadow-2xs font-medium sticky top-0"
                    >
                      {copiedKeys["snippet"] ? (
                        <>
                          <Check className="size-3 text-[#5F7C65] mr-1" />
                          <span className="text-[11px] text-[#2D583F] dark:text-[#8EAE95]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 3. Supported Endpoint Surface Bento */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono uppercase tracking-wider">
                    3. Supported Endpoint Surface
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Messages */}
                    <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-2.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                          <Send className="h-3.5 w-3.5 text-[#5F7C65]" />
                          <span>Message Dispatch</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-mono">
                          Live
                        </span>
                      </div>
                      <ul className="text-[11px] font-mono space-y-1.5 text-stone-700 dark:text-stone-300">
                        <li>
                          <span className="text-[#2D583F] dark:text-[#8EAE95] font-bold">POST</span> /api/wc/messages/text
                        </li>
                        <li>
                          <span className="text-[#2D583F] dark:text-[#8EAE95] font-bold">POST</span> /api/wc/messages/template
                        </li>
                        <li>
                          <span className="text-[#2D583F] dark:text-[#8EAE95] font-bold">POST</span> /api/wc/messages/media
                        </li>
                      </ul>
                    </div>

                    {/* Card 2: Templates */}
                    <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-2.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                          <FileCode2 className="h-3.5 w-3.5 text-[#5F7C65]" />
                          <span>Template Management</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-mono">
                          CRUD
                        </span>
                      </div>
                      <ul className="text-[11px] font-mono space-y-1.5 text-stone-700 dark:text-stone-300">
                        <li>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">GET</span> /api/wc/templates
                        </li>
                        <li>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">GET</span> /api/wc/templates/[id]
                        </li>
                        <li>
                          <span className="text-[#2D583F] dark:text-[#8EAE95] font-bold">POST</span> /api/wc/templates
                        </li>
                      </ul>
                    </div>

                    {/* Card 3: Health & Diagnostics */}
                    <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 shadow-2xs space-y-2.5 transition-all hover:border-stone-300 dark:hover:border-stone-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10px] font-semibold uppercase tracking-wider">
                          <Activity className="h-3.5 w-3.5 text-[#5F7C65]" />
                          <span>Status &amp; Diagnostics</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-mono">
                          Health
                        </span>
                      </div>
                      <ul className="text-[11px] font-mono space-y-1.5 text-stone-700 dark:text-stone-300">
                        <li>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">GET</span> /api/wc/status
                        </li>
                        <li className="text-[10px] text-stone-500 dark:text-stone-400 font-sans">
                          Inspect account quality, phone registration, &amp; throughput limits.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 4. Security Best Practices */}
                <div className="p-4 rounded-xl bg-[#5F7C65]/10 border border-[#5F7C65]/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2D583F] dark:text-[#8EAE95]">
                    <ShieldCheck className="size-4" />
                    <span>Security &amp; Credential Governance</span>
                  </div>
                  <ul className="text-xs text-stone-700 dark:text-stone-300 space-y-1 leading-relaxed list-disc ml-5">
                    <li>Never hardcode API keys into client-side code, frontend SPAs, or public Git repositories.</li>
                    <li>Provision separate keys with unique names for development, staging, and production environments.</li>
                    <li>Rotate keys periodically and immediately revoke keys suspected of credential leakage.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog: Create New API Key */}
      <Dialog open={showNewKeyModal} onOpenChange={setShowNewKeyModal}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6">
          <DialogHeader>
            <div className="mx-auto size-12 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-2">
              <Key className="size-6 text-[#5F7C65]" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold text-stone-900 dark:text-stone-100">
              Provision New API Key
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-stone-500 dark:text-stone-400">
              Generate a unique authorization token to securely dispatch messages and automate workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key_name" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Key Identification Name *
              </Label>
              <Input
                id="key_name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createApiKey();
                }}
                placeholder="e.g. Production Backend, n8n Automation, Mobile App"
                className="h-10 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus-visible:ring-[#5F7C65]"
                autoFocus
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Choose a descriptive identifier so your team can trace requests in audit logs.
              </p>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewKeyModal(false)}
              disabled={creating}
              className="rounded-xl border-stone-300 dark:border-stone-700 text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={createApiKey}
              disabled={creating || !newKeyName.trim()}
              className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs h-9 px-4 font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] transition-all cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="size-3.5 mr-1.5" />
                  Generate Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Revoke Confirmation Safeguard */}
      <Dialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6">
          <DialogHeader>
            <div className="mx-auto size-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold text-stone-900 dark:text-stone-100">
              Revoke API Key &quot;{keyToRevoke?.name}&quot;?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              This action is immediate and permanent. Any background services, crons, or integrations authenticated with this key will immediately fail with HTTP 401 Unauthorized.
            </DialogDescription>
          </DialogHeader>

          {keyToRevoke && (
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/60 text-[11px] font-mono text-stone-600 dark:text-stone-400 my-2 text-center">
              <span>Key Token: {keyToRevoke.partial_key.substring(0, 4)}••••••••</span>
            </div>
          )}

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKeyToRevoke(null)}
              disabled={revoking}
              className="rounded-xl border-stone-300 dark:border-stone-700 text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={revokeApiKey}
              disabled={revoking}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 font-semibold shadow-2xs cursor-pointer"
            >
              {revoking ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5 mr-1.5" />
                  Confirm Permanent Revocation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
