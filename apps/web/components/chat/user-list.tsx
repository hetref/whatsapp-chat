"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, Plus, Edit3, Check, X, Phone, FileText, Settings, Users, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupsList } from "./groups-list";
import { GroupManagementDialog } from "./group-management-dialog";

interface ChatUser {
  id: string;
  phone_number: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  last_message?: string;
  last_message_time?: string;
  last_message_type?: string;
  last_message_template_name?: string | null;
  last_message_sender?: string;
  unread_count?: number;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  unread_count?: number;
}

interface UserListProps {
  users: ChatUser[];
  selectedUser: ChatUser | null;
  onUserSelect: (user: ChatUser) => void;
  currentUserId: string;
  onUsersUpdate?: () => void;
  onBroadcastToGroup?: (groupId: string, groupName: string) => void;
  onUserDelete?: (userId: string) => void;
  deletingContactIds?: string[];
  onStartDelete?: (userId: string) => void;
  onFinishDelete?: (userId: string, success: boolean) => void;
  onGroupDelete?: (groupId: string) => void;
}

interface NewUserInput {
  id: string;
  phoneNumber: string;
  customName: string;
}

const AVATAR_PALETTES = [
  { bg: "bg-[#5F7C65]/15 dark:bg-[#5F7C65]/25", text: "text-[#2D583F] dark:text-[#8EAE95]", border: "border-[#5F7C65]/30" }, // Sage
  { bg: "bg-amber-500/15 dark:bg-amber-500/25", text: "text-amber-800 dark:text-amber-300", border: "border-amber-500/30" }, // Warm Amber
  { bg: "bg-sky-500/15 dark:bg-sky-500/25", text: "text-sky-800 dark:text-sky-300", border: "border-sky-500/30" }, // Slate Blue
  { bg: "bg-emerald-600/15 dark:bg-emerald-600/25", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-600/30" }, // Forest
  { bg: "bg-stone-500/15 dark:bg-stone-500/25", text: "text-stone-800 dark:text-stone-300", border: "border-stone-500/30" }, // Sandstone
  { bg: "bg-indigo-500/15 dark:bg-indigo-500/25", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-500/30" }, // Indigo
  { bg: "bg-teal-600/15 dark:bg-teal-600/25", text: "text-teal-800 dark:text-teal-300", border: "border-teal-600/30" }, // Deep Teal
];

function getAvatarStyle(str: string) {
  let hash = 0;
  const safeStr = str || "user";
  for (let i = 0; i < safeStr.length; i++) {
    hash = (hash << 5) - hash + safeStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function UserList({
  users,
  selectedUser,
  onUserSelect,
  currentUserId,
  onUsersUpdate,
  onBroadcastToGroup,
  onUserDelete,
  deletingContactIds = [],
  onStartDelete,
  onFinishDelete,
  onGroupDelete,
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newUsers, setNewUsers] = useState<NewUserInput[]>([
    { id: '1', phoneNumber: '', customName: '' }
  ]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Delete contact state
  const [contactToDelete, setContactToDelete] = useState<ChatUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Internal tracking of contacts currently being deleted
  const [internalDeletingIds, setInternalDeletingIds] = useState<string[]>([]);
  // Optimistically removed IDs once API returns success
  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<string[]>([]);
  // Transient feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const router = useRouter();

  // Combine parent deleting IDs and internal deleting IDs
  const activeDeletingIds = new Set([...deletingContactIds, ...internalDeletingIds]);
  const isContactDeleting = (userId: string) => activeDeletingIds.has(userId);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();

      if (data.success && data.groups) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  // Helper functions defined first to avoid hoisting issues
  const getDisplayName = (user: ChatUser) => {
    // Priority: custom_name > whatsapp_name > phone number
    return user.custom_name || user.whatsapp_name || user.id;
  };

  const getSecondaryName = (user: ChatUser) => {
    // Show whatsapp name if we have a custom name, or phone number if we only have whatsapp name
    if (user.custom_name && user.whatsapp_name) {
      return user.whatsapp_name;
    }
    if (user.whatsapp_name && user.whatsapp_name !== user.id) {
      return user.id;
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessagePreview = (user: ChatUser) => {
    if (!user.last_message && !user.last_message_type) {
      return "No messages yet";
    }

    // Handle media messages
    if (user.last_message_type && user.last_message_type !== 'text') {
      const isFromCurrentUser = user.last_message_sender === currentUserId;
      const prefix = isFromCurrentUser ? "You: " : "";

      switch (user.last_message_type) {
        case 'image':
          return `${prefix}📷 Photo`;
        case 'video':
          return `${prefix}🎥 Video`;
        case 'audio':
          return `${prefix}🎵 Audio`;
        case 'document':
          return `${prefix}📄 Document`;
        case 'template':
          return `${prefix}📋 Template: ${user.last_message_template_name || 'Message'}`;
        default:
          return `${prefix}📎 Media`;
      }
    }

    // Handle text messages
    const message = user.last_message || "";
    const isFromCurrentUser = user.last_message_sender === currentUserId;
    const prefix = isFromCurrentUser ? "You: " : "";

    return `${prefix}${message.length > 30 ? message.substring(0, 30) + "..." : message}`;
  };

  // Sort users by last message time (most recent first) and then by unread count
  const sortedUsers = users
    .filter(user => user.id !== currentUserId && !optimisticallyDeletedIds.includes(user.id))
    .sort((a, b) => {
      // First, prioritize users with unread messages
      if ((a.unread_count || 0) > 0 && (b.unread_count || 0) === 0) return -1;
      if ((a.unread_count || 0) === 0 && (b.unread_count || 0) > 0) return 1;

      // Then sort by last message time
      const aTime = new Date(a.last_message_time || a.last_active).getTime();
      const bTime = new Date(b.last_message_time || b.last_active).getTime();
      return bTime - aTime;
    });

  const filteredUsers = sortedUsers.filter(user => {
    const displayName = getDisplayName(user);
    const searchableText = `${displayName} ${user.whatsapp_name || ''} ${user.id}`.toLowerCase();
    return searchableText.includes(searchTerm.toLowerCase());
  });

  const handleAddUserInput = () => {
    setNewUsers([...newUsers, { id: Date.now().toString(), phoneNumber: '', customName: '' }]);
  };

  const handleRemoveUserInput = (id: string) => {
    if (newUsers.length > 1) {
      setNewUsers(newUsers.filter(user => user.id !== id));
    }
  };

  const handleUpdateUserInput = (id: string, field: 'phoneNumber' | 'customName', value: string) => {
    setNewUsers(newUsers.map(user =>
      user.id === id ? { ...user, [field]: value } : user
    ));
  };

  const handleCreateNewChat = async () => {
    // Filter out empty entries
    const validUsers = newUsers.filter(u => u.phoneNumber.trim());

    if (validUsers.length === 0) {
      alert('Please enter at least one phone number');
      return;
    }

    setIsCreatingChat(true);
    try {
      // Single user creation (backward compatible)
      if (validUsers.length === 1) {
        const response = await fetch('/api/users/create-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: validUsers[0].phoneNumber.trim(),
            customName: validUsers[0].customName.trim() || null
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || result.error || 'Failed to create chat');
        }

        // Reset form
        setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
        setShowNewChat(false);

        // Refresh users list first, then select the new user
        if (onUsersUpdate) {
          await onUsersUpdate();
        }

        // Select the new/existing user
        onUserSelect(result.user);

      } else {
        // Bulk user creation
        const response = await fetch('/api/users/create-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            users: validUsers.map(u => ({
              phoneNumber: u.phoneNumber.trim(),
              customName: u.customName.trim() || null
            }))
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create chats');
        }

        // Show summary
        const successCount = result.results.successCount;
        const failedCount = result.results.failedCount;

        let message = `Successfully added ${successCount} user${successCount !== 1 ? 's' : ''}`;

        if (failedCount > 0) {
          message += `\n\nFailed to add ${failedCount} user${failedCount !== 1 ? 's' : ''}:`;
          result.results.failed.forEach((failure: { phoneNumber: string; error: string }) => {
            message += `\n- ${failure.phoneNumber}: ${failure.error}`;
          });
        }

        alert(message);

        // Reset form
        setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
        setShowNewChat(false);

        // Refresh users list
        if (onUsersUpdate) {
          await onUsersUpdate();
        }
      }

    } catch (error) {
      console.error('Error creating chat:', error);
      alert(`Failed to create chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleStartEditName = (user: ChatUser) => {
    setEditingUserId(user.id);
    setEditingName(user.custom_name || '');
  };

  const handleSaveEditName = async (userId: string) => {
    setIsUpdatingName(true);
    try {
      const response = await fetch('/api/users/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          customName: editingName.trim() || null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update name');
      }

      // Reset editing state
      setEditingUserId(null);
      setEditingName("");

      // Refresh users list
      if (onUsersUpdate) {
        await onUsersUpdate();
      }

    } catch (error) {
      console.error('Error updating name:', error);
      alert(`Failed to update name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingUserId(null);
    setEditingName("");
  };

  // Group handlers
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setShowGroupDialog(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowGroupDialog(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: currentUserId ? { 'x-user-id': currentUserId } : {},
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to delete group');
      }

      await loadGroups();
      if (onUsersUpdate) {
        await onUsersUpdate();
      }
      onGroupDelete?.(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  };

  const handleGroupSaved = async () => {
    await loadGroups();
    if (onUsersUpdate) {
      await onUsersUpdate();
    }
  };

  const handleBroadcastToGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group && onBroadcastToGroup) {
      onBroadcastToGroup(groupId, group.name);
    }
  };

  const handleSelectMemberFromGroup = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      onUserSelect(user);
    }
  };

  const handleRequestDelete = (user: ChatUser) => {
    setDeleteError(null);
    setContactToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;

    const targetUser = contactToDelete;
    const targetId = targetUser.id;
    const targetDisplayName = getDisplayName(targetUser);

    // Immediately close the confirmation modal so the chat list shows the contact entering deleting state
    setContactToDelete(null);
    setDeleteError(null);

    // Mark this contact as deleting immediately (both locally and for parent)
    setInternalDeletingIds((prev) => [...new Set([...prev, targetId])]);
    onStartDelete?.(targetId);

    try {
      // Call the API: this synchronously deletes S3 objects in bulk first, then deletes DB records
      const response = await fetch(`/api/conversations/${targetId}`, {
        method: 'DELETE',
        headers: currentUserId ? { 'x-user-id': currentUserId } : {},
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to delete contact');
      }

      // ONLY AFTER API SUCCEEDS:
      // Remove contact from the active list
      setOptimisticallyDeletedIds((prev) => [...new Set([...prev, targetId])]);
      setInternalDeletingIds((prev) => prev.filter((id) => id !== targetId));

      // Deselect active conversation if it matches
      if (onUserDelete) {
        onUserDelete(targetId);
      }
      onFinishDelete?.(targetId, true);

      // Trigger list refresh
      if (onUsersUpdate) {
        await onUsersUpdate();
      }

      setToast({
        type: 'success',
        message: `Deleted ${targetDisplayName} successfully.`,
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      // Remove from deleting state so contact row is re-enabled to click
      setInternalDeletingIds((prev) => prev.filter((id) => id !== targetId));
      onFinishDelete?.(targetId, false);

      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact';
      setToast({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF8F5]/30 dark:bg-[#0C0F0D] relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-lg backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-800 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span className="text-xs font-medium truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 shrink-0 text-stone-400 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-stone-200/80 dark:border-stone-800/80 bg-[#FAF8F5]/90 dark:bg-[#131915]/90 backdrop-blur-md sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#5F7C65]/10 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 flex items-center justify-center shadow-2xs">
              <MessageCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">
                  Messages
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/70 dark:border-stone-700/60 tabular-nums">
                  {users.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Direct WhatsApp Conversations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNewChat(true)}
              className="h-8 w-8 rounded-xl border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 hover:bg-[#5F7C65]/10 hover:border-[#5F7C65]/30 text-stone-700 dark:text-stone-300 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-all shadow-2xs"
              title="Start New Chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCreateGroup}
              className="h-8 w-8 rounded-xl border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 hover:bg-[#5F7C65]/10 hover:border-[#5F7C65]/30 text-stone-700 dark:text-stone-300 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-all shadow-2xs"
              title="Create Broadcast Group"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* New Chat Form - Bulk User Creation */}
      {showNewChat && (
        <div className="p-4 border-b border-stone-200/80 dark:border-stone-800/80 bg-[#FAF8F5] dark:bg-[#131915] max-h-[420px] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
              Add Contact{newUsers.length > 1 ? 's' : ''}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowNewChat(false);
                setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
              }}
              className="p-1 h-7 w-7 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Inputs */}
          <div className="space-y-2.5">
            {newUsers.map((user, index) => (
              <div key={user.id} className="space-y-2 p-3 border border-stone-200/80 dark:border-stone-800 rounded-xl bg-white dark:bg-[#18201B] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Contact {index + 1}
                  </span>
                  {newUsers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUserInput(user.id)}
                      disabled={isCreatingChat}
                      className="p-1 h-6 w-6 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                      title="Remove this contact"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <Input
                    placeholder="Phone number (e.g. 918097296453)"
                    value={user.phoneNumber}
                    onChange={(e) => handleUpdateUserInput(user.id, 'phoneNumber', e.target.value)}
                    className="text-xs sm:text-sm h-8 rounded-lg border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50"
                    disabled={isCreatingChat}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <Input
                    placeholder="Display Name (optional)"
                    value={user.customName}
                    onChange={(e) => handleUpdateUserInput(user.id, 'customName', e.target.value)}
                    className="text-xs sm:text-sm h-8 rounded-lg border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50"
                    disabled={isCreatingChat}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          {newUsers.length < 20 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddUserInput}
              disabled={isCreatingChat}
              className="w-full border-dashed border-stone-300 dark:border-stone-700 hover:border-[#5F7C65]/40 hover:bg-[#5F7C65]/5 text-stone-600 dark:text-stone-400 rounded-xl h-8 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Another Contact
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleCreateNewChat}
              disabled={isCreatingChat || newUsers.every(u => !u.phoneNumber.trim())}
              className="flex-1 bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] rounded-xl text-xs sm:text-sm h-9 font-medium"
              size="sm"
            >
              {isCreatingChat ? "Saving..." : `Add Contact${newUsers.filter(u => u.phoneNumber.trim()).length > 1 ? 's' : ''}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewChat(false);
                setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
              }}
              disabled={isCreatingChat}
              size="sm"
              className="border-stone-200/80 dark:border-stone-800 text-stone-600 dark:text-stone-400 rounded-xl text-xs sm:text-sm h-9"
            >
              Cancel
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center">
            {newUsers.filter(u => u.phoneNumber.trim()).length} contact{newUsers.filter(u => u.phoneNumber.trim()).length !== 1 ? 's' : ''} to create
            {newUsers.length < 20 && ` • Max 20 contacts at once`}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/60 dark:bg-[#0E1310]/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations by name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#18201B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Groups List */}
      {groups.length > 0 && (
        <div className="border-b border-stone-200/80 dark:border-stone-800/80">
          <GroupsList
            groups={groups}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onSelectMember={handleSelectMemberFromGroup}
            onBroadcastToGroup={handleBroadcastToGroup}
          />
        </div>
      )}

      {/* User List */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-200/60 dark:divide-stone-800/60">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="size-12 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-center text-stone-400 mb-3 shadow-2xs">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-[220px] leading-relaxed">
              {searchTerm
                ? "Try searching for a different name, phone number, or clear your query."
                : "Add your first contact or start a chat to begin messaging."}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowNewChat(true)}
                className="mt-4 bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-xl shadow-xs text-xs font-medium gap-1.5 h-8 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                Start New Chat
              </Button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const avatarStyle = getAvatarStyle(user.id || user.name);
            const isSelected = selectedUser?.id === user.id;
            const hasUnread = (user.unread_count || 0) > 0;
            const isDeleting = isContactDeleting(user.id);

            return (
              <div
                key={user.id}
                onClick={() => {
                  if (isDeleting) return;
                  onUserSelect(user);
                }}
                className={`group relative p-3 sm:p-3.5 transition-all duration-200 ${
                  isDeleting
                    ? "pointer-events-none select-none cursor-not-allowed bg-red-500/[0.07] dark:bg-red-500/[0.12] border-l-[3px] border-l-red-500/80"
                    : isSelected
                    ? "cursor-pointer bg-[#5F7C65]/10 dark:bg-[#5F7C65]/20 border-l-[3px] border-l-[#5F7C65]"
                    : "cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/40 border-l-[3px] border-l-transparent"
                }`}
                aria-disabled={isDeleting}
              >
                <div className="flex items-start gap-3">
                  {/* Botanical Avatar or Spinning Delete Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className={`h-11 w-11 rounded-xl border shrink-0 transition-all duration-200 shadow-2xs ${
                      isDeleting ? "border-red-500/40 opacity-70" : `${avatarStyle.border} group-hover:scale-105`
                    }`}>
                      <AvatarFallback className={`rounded-xl font-semibold text-sm ${avatarStyle.bg} ${avatarStyle.text}`}>
                        {getDisplayName(user).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isDeleting && (
                      <div className="absolute inset-0 rounded-xl bg-red-500/20 dark:bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-7 text-xs rounded-lg border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                              placeholder="Enter name"
                              disabled={isUpdatingName}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditName(user.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditName();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEditName(user.id)}
                              disabled={isUpdatingName}
                              className="p-1 h-6 w-6 text-[#2D583F] dark:text-[#8EAE95] hover:bg-[#5F7C65]/10"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEditName}
                              disabled={isUpdatingName}
                              className="p-1 h-6 w-6 text-stone-400 hover:text-stone-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h3 className={`text-sm truncate ${
                              isDeleting
                                ? "line-through text-stone-400 dark:text-stone-500 font-normal"
                                : hasUnread
                                ? "font-bold text-[#2D583F] dark:text-[#8EAE95]"
                                : "font-medium text-stone-900 dark:text-stone-100"
                            }`}>
                              {getDisplayName(user)}
                            </h3>
                            {isDeleting ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25 animate-pulse shrink-0">
                                Deleting
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditName(user);
                                }}
                                className="p-0.5 h-5 w-5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                title="Edit contact name"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Secondary name display */}
                        {getSecondaryName(user) && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1 font-mono mt-0.5">
                            {user.whatsapp_name && user.custom_name ? (
                              <span>WA: {user.whatsapp_name}</span>
                            ) : (
                              <>
                                <Phone className="h-2.5 w-2.5 text-stone-400" />
                                <span>{user.phone_number || (user.id.includes('-') ? '' : user.id) || 'No number'}</span>
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <div className="flex items-center gap-1">
                          {isDeleting ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/10">
                              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                              <span className="hidden sm:inline">Deleting...</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                                {formatTime(user.last_message_time || user.last_active)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestDelete(user);
                                }}
                                className="h-6 w-6 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                title="Delete contact"
                                aria-label={`Delete contact ${getDisplayName(user)}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        {!isDeleting && hasUnread && (
                          <span className="bg-[#5F7C65] text-white text-[10px] font-bold rounded-full min-w-[18px] h-4.5 px-1.5 flex items-center justify-center shadow-xs">
                            {user.unread_count! > 99 ? '99+' : user.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {isDeleting ? (
                      <p className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        <span>Deleting user, please wait...</span>
                      </p>
                    ) : (
                      <p className={`text-xs truncate mt-1 ${
                        hasUnread
                          ? "font-medium text-stone-900 dark:text-stone-100" 
                          : "text-stone-500 dark:text-stone-400"
                      }`}>
                        {getMessagePreview(user)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Animated micro-bar for active deletion */}
                {isDeleting && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500/20 overflow-hidden">
                    <div className="h-full bg-red-500 w-1/3 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Group Management Dialog */}
      <GroupManagementDialog
        isOpen={showGroupDialog}
        onClose={() => {
          setShowGroupDialog(false);
          setEditingGroup(null);
        }}
        users={users}
        group={editingGroup}
        onGroupSaved={handleGroupSaved}
      />

      {/* Delete Contact Confirmation Modal */}
      {contactToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-150"
          onClick={() => {
            setContactToDelete(null);
            setDeleteError(null);
          }}
        >
          <div
            className="bg-white dark:bg-[#18201B] border border-stone-200/80 dark:border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    Delete Contact
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-stone-900 dark:text-stone-200">
                      {getDisplayName(contactToDelete)}
                    </span>
                    {contactToDelete.phone_number && (
                      <span className="font-mono text-stone-600 dark:text-stone-400">
                        {" "}
                        ({contactToDelete.phone_number})
                      </span>
                    )}
                    ?
                  </p>

                  {/* Non-technical user warning */}
                  <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      This user will be permanently deleted. <strong>This operation cannot be reversed.</strong>
                    </p>
                  </div>

                  {deleteError && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-stone-50/80 dark:bg-[#131915]/80 border-t border-stone-200/70 dark:border-stone-800/70">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setContactToDelete(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete User</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}