"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Search, MessageCircle, LogOut, Plus, Edit3, Check, X, Phone, FileText } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

interface UserListProps {
  users: ChatUser[];
  selectedUser: ChatUser | null;
  onUserSelect: (user: ChatUser) => void;
  currentUserId: string;
  onUsersUpdate?: () => void;
}

export function UserList({ users, selectedUser, onUserSelect, currentUserId, onUsersUpdate }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const supabase = createClient();
  const router = useRouter();

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
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCreateNewChat = async () => {
    if (!newChatPhone.trim()) return;

    setIsCreatingChat(true);
    try {
      const response = await fetch('/api/users/create-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: newChatPhone.trim(),
          customName: newChatName.trim() || null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to create chat');
      }

      console.log('Chat created successfully:', result);
      
      // Reset form
      setNewChatPhone("");
      setNewChatName("");
      setShowNewChat(false);

      // Refresh users list
      if (onUsersUpdate) {
        onUsersUpdate();
      }

      // Select the new/existing user
      onUserSelect(result.user);

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

      {/* New Chat Form */}
      {showNewChat && (
        <div className="p-4 border-b border-border bg-muted/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">New Chat</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewChat(false)}
                className="p-1 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Phone number (e.g., +1234567890)"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              className="text-sm"
              disabled={isCreatingChat}
            />
            <Input
              placeholder="Name (optional)"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              className="text-sm"
              disabled={isCreatingChat}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateNewChat}
                disabled={!newChatPhone.trim() || isCreatingChat}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isCreatingChat ? "Creating..." : "Start Chat"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewChat(false)}
                disabled={isCreatingChat}
                size="sm"
              >
                Cancel
              </Button>
            </div>
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
              className={`group p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-all duration-200 ${
                selectedUser?.id === user.id ? "bg-muted" : ""
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
                          <h3 className={`font-medium truncate ${
                            (user.unread_count || 0) > 0 ? "font-semibold" : ""
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
                  
                  <p className={`text-sm text-muted-foreground truncate mt-1 ${
                    (user.unread_count || 0) > 0 ? "font-medium text-foreground" : ""
                  }`}>
                    {getMessagePreview(user)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}