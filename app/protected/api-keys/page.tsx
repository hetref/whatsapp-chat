"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    AlertCircle,
    CheckCircle2,
    Calendar,
    Clock,
    Settings,
    ShieldAlert
} from "lucide-react";
import { useSubscriptionStatus } from "@/components/subscription-guard";

interface ApiKey {
    id: string;
    name: string;
    partial_key: string;
    last_used: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export default function SettingsPage() {
    const subscriptionStatus = useSubscriptionStatus();
    const isRestricted = subscriptionStatus.loading ? false : (!subscriptionStatus.isActive || subscriptionStatus.messagingBlocked);

    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form state
    const [newKeyName, setNewKeyName] = useState("");
    const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    // Visibility state for each API key
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [fullKeys, setFullKeys] = useState<Record<string, string>>({});
    const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

    // Copy state
    const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

    // Messages
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Newly created key (shown once)
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; key: string } | null>(null);

    useEffect(() => {
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/api-keys');
            const data = await response.json();

            if (response.ok) {
                setApiKeys(data.data || []);
            } else {
                setError(data.error?.message || data.message || 'Failed to load API keys');
            }
        } catch (err) {
            console.error('Error loading API keys:', err);
            setError('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const createApiKey = async () => {
        if (!newKeyName.trim()) {
            setError('API key name is required');
            return;
        }

        try {
            setCreating(true);
            setError(null);

            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || 'Failed to create API key');
            }

            // Show the newly created key
            setNewlyCreatedKey({
                name: data.data.name,
                key: data.data.key,
            });

            // Reset form
            setNewKeyName("");
            setShowNewKeyDialog(false);

            // Reload list
            await loadApiKeys();

            setSuccess('API key created successfully! Make sure to copy it now.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create API key');
        } finally {
            setCreating(false);
        }
    };

    const updateApiKey = async (id: string, name: string) => {
        if (!name.trim()) {
            setError('API key name is required');
            return;
        }

        try {
            setError(null);

            const response = await fetch('/api/api-keys', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: name.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || 'Failed to update API key');
            }

            setEditingId(null);
            setEditingName("");
            setSuccess('API key updated successfully');

            await loadApiKeys();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update API key');
        }
    };

    const deleteApiKey = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke the API key "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setError(null);

            const response = await fetch(`/api/api-keys?id=${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || 'Failed to delete API key');
            }

            setSuccess('API key revoked successfully');
            await loadApiKeys();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete API key');
        }
    };

    const copyToClipboard = (text: string, keyId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKeys(prev => ({ ...prev, [keyId]: true }));
        setTimeout(() => {
            setCopiedKeys(prev => ({ ...prev, [keyId]: false }));
        }, 2000);
    };

    const toggleKeyVisibility = async (keyId: string) => {
        // If already visible, just hide it
        if (visibleKeys[keyId]) {
            setVisibleKeys(prev => ({ ...prev, [keyId]: false }));
            return;
        }

        // If not visible, fetch the full key
        try {
            setLoadingKeys(prev => ({ ...prev, [keyId]: true }));

            const response = await fetch(`/api/api-keys?reveal=${keyId}`);
            const data = await response.json();

            if (response.ok) {
                // Store the full key and mark as visible
                setFullKeys(prev => ({ ...prev, [keyId]: data.data.key }));
                setVisibleKeys(prev => ({ ...prev, [keyId]: true }));
            } else {
                setError(data.error?.message || data.message || 'Failed to reveal API key');
            }
        } catch (err) {
            console.error('Error revealing API key:', err);
            setError('Failed to reveal API key');
        } finally {
            setLoadingKeys(prev => ({ ...prev, [keyId]: false }));
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getPartialDisplay = (partialKey: string, keyId: string, isVisible: boolean) => {
        if (isVisible && fullKeys[keyId]) {
            return fullKeys[keyId]; // Show complete API key
        }
        if (isVisible) {
            return partialKey; // Show partial key
        }
        // Show only first 4 characters when hidden
        return partialKey.substring(0, 4) + '••••';
    };

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
        <div className="h-full overflow-y-auto bg-background">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="border-b bg-muted/30 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-1">API Settings</h1>
                            <p className="text-muted-foreground">
                                Manage your API keys for WhatsApp Cloud API access
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Settings className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">

                    {/* Subscription Restriction Banner */}
                    {!subscriptionStatus.loading && isRestricted && (
                        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-amber-900 dark:text-amber-100">API Access Restricted</p>
                                        <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                            {subscriptionStatus?.messagingBlockedReason ||
                                                'Your subscription is currently inactive. API key creation & reveal are disabled. Existing API keys will not authenticate until your subscription is reactivated.'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Messages */}
                    {error && (
                        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    <p className="text-red-900 dark:text-red-100">{error}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setError(null)}
                                        className="ml-auto"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {success && (
                        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    <p className="text-green-900 dark:text-green-100">{success}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSuccess(null)}
                                        className="ml-auto"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Newly Created Key Display */}
                    {newlyCreatedKey && (
                        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    API Key Created Successfully
                                </CardTitle>
                                <CardDescription className="text-blue-700 dark:text-blue-300">
                                    Please copy this API key now. You won&apos;t be able to see it again!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-sm font-semibold">Name</Label>
                                    <p className="text-lg">{newlyCreatedKey.name}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">API Key</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            value={newlyCreatedKey.key}
                                            readOnly
                                            className="font-mono text-sm bg-white dark:bg-gray-900"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(newlyCreatedKey.key, 'new')}
                                        >
                                            {copiedKeys['new'] ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setNewlyCreatedKey(null)}
                                    className="w-full"
                                >
                                    I&apos;ve copied the key
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Create New API Key */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Create New API Key
                            </CardTitle>
                            <CardDescription>
                                Generate a new API key to access the WhatsApp Cloud API endpoints
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!showNewKeyDialog ? (
                                <Button onClick={() => setShowNewKeyDialog(true)} disabled={isRestricted}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create API Key
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="new-key-name">API Key Name</Label>
                                        <Input
                                            id="new-key-name"
                                            placeholder="e.g., Production Server, Development, Mobile App"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    createApiKey();
                                                }
                                            }}
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Choose a descriptive name to identify where this key will be used
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={createApiKey}
                                            disabled={creating || !newKeyName.trim()}
                                        >
                                            {creating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                'Create API Key'
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowNewKeyDialog(false);
                                                setNewKeyName("");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* API Keys List */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Your API Keys</CardTitle>
                            <CardDescription>
                                Manage and monitor your API keys. You can rename or revoke keys at any time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {apiKeys.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No API keys yet. Create one to get started!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {apiKeys.map((apiKey) => (
                                        <Card key={apiKey.id} className="border-2">
                                            <CardContent className="pt-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Name */}
                                                        {editingId === apiKey.id ? (
                                                            <div className="flex gap-2 mb-3">
                                                                <Input
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            updateApiKey(apiKey.id, editingName);
                                                                        } else if (e.key === 'Escape') {
                                                                            setEditingId(null);
                                                                            setEditingName("");
                                                                        }
                                                                    }}
                                                                    className="text-lg font-semibold"
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => updateApiKey(apiKey.id, editingName)}
                                                                >
                                                                    Save
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setEditingId(null);
                                                                        setEditingName("");
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <h3 className="text-lg font-semibold">{apiKey.name}</h3>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => {
                                                                        setEditingId(apiKey.id);
                                                                        setEditingName(apiKey.name);
                                                                    }}
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* API Key */}
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1 overflow-x-auto">
                                                                {getPartialDisplay(apiKey.partial_key, apiKey.id, visibleKeys[apiKey.id])}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                                                disabled={loadingKeys[apiKey.id] || isRestricted}
                                                                title={isRestricted ? "Subscription inactive" : visibleKeys[apiKey.id] ? "Hide API key" : "Show complete API key"}
                                                            >
                                                                {loadingKeys[apiKey.id] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : visibleKeys[apiKey.id] ? (
                                                                    <EyeOff className="h-4 w-4" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            {visibleKeys[apiKey.id] && fullKeys[apiKey.id] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => copyToClipboard(fullKeys[apiKey.id], apiKey.id)}
                                                                    title="Copy complete API key"
                                                                >
                                                                    {copiedKeys[apiKey.id] ? (
                                                                        <Check className="h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <Copy className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            )}
                                                            <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                                                                {apiKey.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </div>

                                                        {/* Metadata */}
                                                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Created: {formatDate(apiKey.created_at)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>Last used: {formatDate(apiKey.last_used)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                                                            title="Revoke API key"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* API Documentation */}
                    <Card className="border-dashed bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-lg">Using Your API Keys</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">Authentication</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Include your API key in the Authorization header of your requests:
                                </p>
                                <code className="block bg-muted p-3 rounded text-xs font-mono">
                                    Authorization: Bearer wc_live_your_api_key_here
                                </code>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">Available Endpoints</h4>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium mb-1">Status & Health</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• <code>GET /api/wc/status</code> - Check API status and template statistics</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium mb-1">Template Management</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• <code>GET /api/wc/templates</code> - List all templates (with pagination)</li>
                                            <li>• <code>POST /api/wc/templates</code> - Create a new template</li>
                                            <li>• <code>GET /api/wc/templates/[id]</code> - Get a specific template</li>
                                            <li>• <code>DELETE /api/wc/templates/[id]?name=template_name</code> - Delete a template</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium mb-1">Message Sending</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• <code>POST /api/wc/messages/text</code> - Send text messages (max 4096 chars)</li>
                                            <li>• <code>POST /api/wc/messages/template</code> - Send template messages with variables</li>
                                            <li>• <code>POST /api/wc/messages/media</code> - Send media (image, video, audio, document)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">Security Best Practices</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Never share your API keys publicly or commit them to version control</li>
                                    <li>• Use environment variables to store API keys in your applications</li>
                                    <li>• Create separate API keys for different environments (dev, staging, production)</li>
                                    <li>• Revoke and rotate API keys regularly</li>
                                    <li>• Monitor the &quot;Last used&quot; timestamp to detect unauthorized usage</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
