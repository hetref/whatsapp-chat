"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Search, MessageCircle, LogOut, Plus, Edit3, Check, X, Phone, FileText, Settings, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupsList } from "./groups-list";
import { GroupManagementDialog } from "./group-management-dialog";

interface ChatUser {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  last_message?: string;
  last_message_time?: string;
  last_message_type?: string;
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
}

interface NewUserInput {
  id: string;
  phoneNumber: string;
  customName: string;
}

export function UserList({ users, selectedUser, onUserSelect, currentUserId, onUsersUpdate, onBroadcastToGroup }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newUsers, setNewUsers] = useState<NewUserInput[]>([
    { id: '1', phoneNumber: '', customName: '' }
  ]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const { signOut } = useClerk();
  const router = useRouter();

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
    .filter(user => user.id !== currentUserId)
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

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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

        console.log('Chat created successfully:', result);

        // Reset form
        setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
        setShowNewChat(false);

        // Refresh users list
        if (onUsersUpdate) {
          onUsersUpdate();
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

        console.log('Bulk chat creation result:', result.results);

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
          onUsersUpdate();
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

      console.log('Name updated successfully:', result);

      // Reset editing state
      setEditingUserId(null);
      setEditingName("");

      // Refresh users list
      if (onUsersUpdate) {
        onUsersUpdate();
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
      });

      if (response.ok) {
        loadGroups();
        if (onUsersUpdate) {
          onUsersUpdate();
        }
      } else {
        console.error('Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleGroupSaved = () => {
    loadGroups();
    if (onUsersUpdate) {
      onUsersUpdate();
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-green-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6" />
            <h1 className="text-lg font-semibold">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewChat(true)}
              className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
              title="New chat"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateGroup}
              className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
              title="Create broadcast group"
            >
              <Users className="h-5 w-5" />
            </Button>
            <Link href="/protected/templates">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
                title="Message Templates"
              >
                <FileText className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/protected/setup">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
                title="WhatsApp Setup"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="[&>button]:text-white [&>button]:hover:bg-green-700">
              <ThemeSwitcher />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-green-700 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* New Chat Form - Bulk User Creation */}
      {showNewChat && (
        <div className="p-4 border-b border-border bg-muted/50 max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add User{newUsers.length > 1 ? 's' : ''}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewChat(false);
                  setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
                }}
                className="p-1 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* User Inputs */}
            <div className="space-y-3">
              {newUsers.map((user, index) => (
                <div key={user.id} className="space-y-2 p-3 border border-border rounded-lg bg-background">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      User {index + 1}
                    </span>
                    {newUsers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUserInput(user.id)}
                        disabled={isCreatingChat}
                        className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Remove this user"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Phone number (e.g., 918097296453)"
                      value={user.phoneNumber}
                      onChange={(e) => handleUpdateUserInput(user.id, 'phoneNumber', e.target.value)}
                      className="text-sm"
                      disabled={isCreatingChat}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Name (optional)"
                      value={user.customName}
                      onChange={(e) => handleUpdateUserInput(user.id, 'customName', e.target.value)}
                      className="text-sm"
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
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another User
              </Button>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreateNewChat}
                disabled={isCreatingChat || newUsers.every(u => !u.phoneNumber.trim())}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isCreatingChat ? "Adding..." : `Add User${newUsers.filter(u => u.phoneNumber.trim()).length > 1 ? 's' : ''}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewChat(false);
                  setNewUsers([{ id: '1', phoneNumber: '', customName: '' }]);
                }}
                disabled={isCreatingChat}
                size="sm"
              >
                Cancel
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground text-center">
              {newUsers.filter(u => u.phoneNumber.trim()).length} user{newUsers.filter(u => u.phoneNumber.trim()).length !== 1 ? 's' : ''} to add
              {newUsers.length < 20 && ` • Max 20 at once`}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Groups List */}
      {groups.length > 0 && (
        <div className="border-b border-border">
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
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? "No conversations found" : "No conversations yet"}
            {!searchTerm && (
              <div className="mt-4">
                <Button
                  onClick={() => setShowNewChat(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Start New Chat
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`group p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-all duration-200 ${selectedUser?.id === user.id ? "bg-muted" : ""
                }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                    {getDisplayName(user).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0" onClick={() => onUserSelect(user)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-6 text-sm"
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
                            className="p-1 h-6 w-6"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEditName}
                            disabled={isUpdatingName}
                            className="p-1 h-6 w-6"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium truncate ${(user.unread_count || 0) > 0 ? "font-semibold" : ""
                            }`}>
                            {getDisplayName(user)}
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditName(user);
                            }}
                            className="p-1 h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            title="Edit name"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Secondary name display */}
                      {getSecondaryName(user) && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {user.whatsapp_name && user.custom_name ? (
                            <>WhatsApp: {user.whatsapp_name}</>
                          ) : (
                            <>
                              <Phone className="h-3 w-3" />
                              {user.id}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(user.last_message_time || user.last_active)}
                      </span>
                      {(user.unread_count || 0) > 0 && (
                        <div className="bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-md animate-scale-in">
                          {user.unread_count! > 99 ? '99+' : user.unread_count}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className={`text-sm text-muted-foreground truncate mt-1 ${(user.unread_count || 0) > 0 ? "font-medium text-foreground" : ""
                    }`}>
                    {getMessagePreview(user)}
                  </p>
                </div>
              </div>
            </div>
          ))
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
    </div>
  );
}