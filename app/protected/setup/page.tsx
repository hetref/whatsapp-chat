"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Copy, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

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

export default function SetupPage() {
  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Access Token form
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [apiVersion, setApiVersion] = useState("v23.0");
  const [savingAccessToken, setSavingAccessToken] = useState(false);
  const [accessTokenError, setAccessTokenError] = useState<string | null>(null);
  const [accessTokenSuccess, setAccessTokenSuccess] = useState(false);
  
  // Webhook form
  const [verifyToken, setVerifyToken] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  
  // Copy states
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [copiedAccessToken, setCopiedAccessToken] = useState(false);
  
  // Show/hide states
  const [showAccessToken, setShowAccessToken] = useState(false);
  
  // Get user and settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/save');
      const data = await response.json();
      
      if (response.ok && data.settings) {
        setSettings(data.settings);
        
        // Populate form fields if data exists
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
        setApiVersion(data.settings.api_version || 'v23.0');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
      
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          api_version: apiVersion,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save access token');
      }
      
      setAccessTokenSuccess(true);
      
      // Reload settings to get updated values
      await loadSettings();
      
      setTimeout(() => setAccessTokenSuccess(false), 3000);
    } catch (error) {
      setAccessTokenError(error instanceof Error ? error.message : 'Failed to save access token');
    } finally {
      setSavingAccessToken(false);
    }
  };
  
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
      
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verify_token: verifyToken,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save webhook configuration');
      }
      
      setWebhookSuccess(true);
      
      // Reload settings
      await loadSettings();
      
      setTimeout(() => setWebhookSuccess(false), 3000);
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : 'Failed to save webhook configuration');
    } finally {
      setSavingWebhook(false);
    }
  };
  
  const copyToClipboard = (text: string, type: 'webhook' | 'verify' | 'access') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } else if (type === 'verify') {
      setCopiedVerifyToken(true);
      setTimeout(() => setCopiedVerifyToken(false), 2000);
    } else {
      setCopiedAccessToken(true);
      setTimeout(() => setCopiedAccessToken(false), 2000);
    }
  };
  
  // Mask access token - show first 10 chars and rest as asterisks
  const getMaskedAccessToken = (token: string) => {
    if (!token || token.length <= 10) return token;
    const visiblePart = token.substring(0, 10);
    const maskedPart = '*'.repeat(Math.min(token.length - 10, 50)); // Cap asterisks at 50
    return visiblePart + maskedPart;
  };
  
  const webhookUrl = typeof window !== 'undefined' && settings?.webhook_token
    ? `${window.location.origin}/api/webhook/${settings.webhook_token}`
    : '';
  
  const isSetupComplete = settings?.access_token_added || settings?.webhook_verified;
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto py-8 px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            WhatsApp Setup
          </h1>
          <p className="text-muted-foreground text-lg">
            Configure your WhatsApp Business API credentials to start sending and receiving messages
          </p>
        </div>
        
        {/* Setup Status Banner */}
        {isSetupComplete && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Setup Complete!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You can now access the chat interface
                  </p>
                </div>
                <Link href="/protected">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Go to Chat
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Instruction Banner */}
        {!isSetupComplete && (
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Complete at least one setup to continue
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Configure either the Access Token (for sending messages) or Webhook (for receiving messages) to unlock the chat interface
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Access Token Configuration */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Access Token
                    {settings?.access_token_added && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Required for sending WhatsApp messages
                  </CardDescription>
                </div>
              </div>
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
                      value={accessToken && !showAccessToken ? getMaskedAccessToken(accessToken) : accessToken}
                      onChange={(e) => {
                        // Only allow editing if shown or if it's empty/being typed for first time
                        if (showAccessToken || !settings?.access_token_added) {
                          setAccessToken(e.target.value);
                        }
                      }}
                      // readOnly={!showAccessToken && settings?.access_token_added}
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
                          onClick={() => copyToClipboard(accessToken, 'access')}
                          title="Copy token"
                        >
                          {copiedAccessToken ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get this from your Meta Business Suite
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
                    // readOnly={settings?.access_token_added}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in WhatsApp Business API settings
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
                    // readOnly={settings?.access_token_added}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Meta Business Suite settings
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
                    Default: v23.0 (recommended)
                  </p>
                </div>
                
                {accessTokenError && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{accessTokenError}</span>
                  </div>
                )}
                
                {accessTokenSuccess && (
                  <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Access token saved successfully!</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={savingAccessToken}
                >
                  {savingAccessToken ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Access Token'
                  )}
                </Button>
                
                {settings?.access_token_added && (
                  <p className="text-sm text-center text-muted-foreground">
                    ✓ Access token configured
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
          
          {/* Webhook Configuration */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Webhook Setup
                    {settings?.webhook_verified && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Required for receiving WhatsApp messages
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveWebhook} className="space-y-4">
                {/* Webhook URL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Webhook URL</Label>
                    <Badge variant="secondary" className="text-xs">
                      Unique to You
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={webhookUrl || 'Loading your unique webhook URL...'}
                      readOnly
                      className="font-mono text-sm bg-muted"
                      placeholder="Your unique webhook URL will appear here"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                      disabled={!webhookUrl}
                    >
                      {copiedWebhookUrl ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {webhookUrl ? (
                      "This is your unique webhook URL. Copy it to your Meta webhook configuration"
                    ) : (
                      "Your unique webhook URL is being generated..."
                    )}
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
                      // readOnly={settings?.webhook_verified}
                    />
                    {verifyToken && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(verifyToken, 'verify')}
                      >
                        {copiedVerifyToken ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create a secure token (e.g., random string). You&apos;ll need this when configuring the webhook in Meta
                  </p>
                </div>
                
                {/* Instructions */}
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Create a secure verify token above</li>
                    <li>Click &quot;Save Webhook Configuration&quot;</li>
                    <li>Go to Meta Business Suite</li>
                    <li>Add the webhook URL and verify token</li>
                    <li>Subscribe to message events</li>
                  </ol>
                </div>
                
                {webhookError && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{webhookError}</span>
                  </div>
                )}
                
                {webhookSuccess && (
                  <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Webhook configuration saved! Now verify it in Meta Business Suite</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={savingWebhook}
                >
                  {savingWebhook ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Webhook Configuration'
                  )}
                </Button>
                
                {settings?.has_verify_token && !settings?.webhook_verified && (
                  <p className="text-sm text-center text-amber-600">
                    ⚠ Webhook configured but not yet verified by Meta
                  </p>
                )}
                
                {settings?.webhook_verified && (
                  <p className="text-sm text-center text-muted-foreground">
                    ✓ Webhook verified and active
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* Help Section */}
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • <strong>Access Token:</strong> Found in your Meta Business Suite under WhatsApp API settings
            </p>
            <p>
              • <strong>Phone Number ID:</strong> The unique identifier for your WhatsApp Business phone number
            </p>
            <p>
              • <strong>Business Account ID:</strong> Your WhatsApp Business Account ID from Meta Business Suite (used for managing templates)
            </p>
            <p>
              • <strong>Webhook URL:</strong> Each user gets a unique webhook URL with a secure token for enhanced security and multi-tenant support
            </p>
            <p>
              • <strong>Verify Token:</strong> A security token you create to verify webhook requests from Meta (choose a strong, random string)
            </p>
            <p className="pt-2 border-t border-border">
              <strong>Note:</strong> Your unique webhook URL is automatically generated when you first visit this page. Use this URL in your Meta Business Suite webhook configuration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

