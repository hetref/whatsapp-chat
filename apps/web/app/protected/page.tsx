"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { UserList } from "@/components/chat/user-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings } from "lucide-react";
import Link from "next/link";
import { useSubscriptionStatus } from "@/components/subscription-guard";

interface ChatUser {
  id: string;
  phone_number: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  unread_count?: number;
  last_message_time?: string;
  last_message?: string;
  last_message_type?: string;
  last_message_template_name?: string | null;
  last_message_sender?: string;
}

interface ReactionEntry {
  emoji: string;
  from: string;
  timestamp: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_sent_by_me: boolean;
  message_type?: string;
  media_data?: string | null;
  reactions?: ReactionEntry[] | null;
  isOptimistic?: boolean;
  is_read?: boolean;
  status?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  broadcast_stats?: any;
  recipients?: any[];
}

interface ConversationApi {
  id: string;
  phone_number: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  unread_count?: number;
  last_message_time?: string;
  last_message?: string;
  last_message_type?: string;
  last_message_template_name?: string | null;
  last_message_sender?: string;
}

export default function ChatPage() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isLoaded = !isPending;
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [whatsappAccessToken, setWhatsappAccessToken] = useState<string | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [broadcastGroupId, setBroadcastGroupId] = useState<string | null>(null);
  const [broadcastGroupName, setBroadcastGroupName] = useState<string | null>(null);
  const { messagingBlocked, messagingBlockedReason } = useSubscriptionStatus();

  const normalizeReactions = useCallback((raw?: ReactionEntry[] | null | string) => {
    if (!raw) return [] as ReactionEntry[];
    let list: unknown = raw;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(list)) return [] as ReactionEntry[];
    return (list as ReactionEntry[]).filter((entry) => entry && entry.emoji && entry.from);
  }, []);

  const upsertReactionList = useCallback((params: {
    reactions?: ReactionEntry[] | null;
    emoji: string;
    from: string;
    timestamp: string;
  }) => {
    const current = normalizeReactions(params.reactions);
    const filtered = current.filter((reaction) => reaction.from !== params.from);

    if (params.emoji) {
      filtered.push({
        emoji: params.emoji,
        from: params.from,
        timestamp: params.timestamp,
      });
    }

    return filtered;
  }, [normalizeReactions]);

  const refreshMessages = useCallback(async () => {
    if (!selectedUser || !user) return;

    try {
      const response = await fetch(`/api/messages?conversationId=${selectedUser.id}&limit=50`, {
        headers: user?.id ? { 'x-user-id': user.id } : undefined,
      });
      const result = await response.json();

      if (response.ok && result.messages) {
        const mappedMessages = result.messages
          .filter((msg: Message) => msg.message_type !== 'reaction' && msg.content !== '[reaction]')
          .map((msg: Message) => ({
            ...msg,
            is_sent_by_me: msg.sender_id === user.id,
          }));

        setMessages((prevMessages) => {
          const optimisticMessages = prevMessages.filter(msg => msg.isOptimistic);
          return [...mappedMessages, ...optimisticMessages];
        });
      } else {
        console.error('Error fetching messages:', result.error);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  }, [selectedUser, user]);

  // Define handleBackToUsers early so it can be used in useEffect
  const handleBackToUsers = useCallback(() => {
    setShowChat(false);
    setSelectedUser(null);
    setMessages([]);
  }, []);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle ESC key press to close chat window
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobile && showChat) {
          // On mobile, go back to user list
          handleBackToUsers();
        } else if (!isMobile && selectedUser) {
          // On desktop, close chat window
          setSelectedUser(null);
          setMessages([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, showChat, selectedUser, handleBackToUsers]);

  // Check setup when user is loaded
  useEffect(() => {
    const checkSetup = async () => {
      if (!isLoaded) return;

      if (user) {
        // Check if user has completed setup
        const response = await fetch('/api/settings/save');
        const data = await response.json();

        const setupComplete = data.settings?.access_token_added || data.settings?.webhook_verified;
        setIsSetupComplete(setupComplete);
        if (data.settings?.access_token) {
          setWhatsappAccessToken(data.settings.access_token);
        }
        setCheckingSetup(false);
      } else {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, [user, isLoaded]); // Run when user or loading state changes

  // Fetch users using API and set up polling for updates
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/conversations', {
          headers: user?.id ? { 'x-user-id': user.id } : undefined,
        });
        const result = await response.json();

        if (response.ok && result.conversations) {
          // Transform data to match ChatUser interface
          const transformedUsers: ChatUser[] = result.conversations.map((conv: ConversationApi) => ({
            id: conv.id,
            phone_number: conv.phone_number,
            name: conv.name,
            custom_name: conv.custom_name,
            whatsapp_name: conv.whatsapp_name,
            last_active: conv.last_active,
            unread_count: conv.unread_count || 0,
            last_message_time: conv.last_message_time,
            last_message: conv.last_message,
            last_message_type: conv.last_message_type,
            last_message_sender: conv.last_message_sender
          }));

          setUsers(transformedUsers);
          setSelectedUser((prev) => {
            if (!prev) return null;
            const updated = transformedUsers.find(u => u.id === prev.id);
            return updated ? { ...prev, ...updated } : prev;
          });
        } else {
          console.error('Error fetching conversations:', result.error);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };


    // Initial fetch
    fetchUsers();

    // Set up polling for updates (since we removed realtime)
    const interval = setInterval(fetchUsers, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user]); // Poll for user conversations

  // Subscribe to messages for selected user with improved real-time handling
  useEffect(() => {
    if (!selectedUser || !user) {
      setMessages([]);
      return;
    }

    refreshMessages();

    // Set up polling for message updates as resilient fallback
    const interval = setInterval(refreshMessages, 4000); // Poll every 4 seconds

    // Real-time SSE stream for instantaneous status marks and incoming messages
    let eventSource: EventSource | null = null;
    try {
      const sseUrl = `/api/messages/stream?conversationId=${encodeURIComponent(selectedUser.id)}${user?.id ? `&userId=${encodeURIComponent(user.id)}` : ''}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);

          if (data.type === 'status_update' && data.messageId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === data.messageId
                  ? {
                      ...msg,
                      status: data.status,
                      delivered_at: data.deliveredAt || msg.delivered_at,
                      read_at: data.readAt || msg.read_at,
                      error_message: data.errorMessage || msg.error_message,
                      is_read: data.status === 'read' ? true : msg.is_read,
                    }
                  : msg
              )
            );
          } else if (data.type === 'reaction_update' && data.messageId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === data.messageId
                  ? {
                      ...msg,
                      reactions: data.reactions,
                    }
                  : msg
              )
            );
          } else if (data.type === 'new_message' && data.message) {
            if (data.message.message_type === 'reaction' || data.message.content === '[reaction]') {
              return;
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [
                ...prev,
                {
                  ...data.message,
                  is_sent_by_me: data.message.sender_id === user.id,
                },
              ];
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch {
      // SSE not supported or blocked, polling continues
    }

    const handleMessageSent = () => {
      refreshMessages();
    };
    window.addEventListener('whatsapp:message-sent', handleMessageSent);

    return () => {
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener('whatsapp:message-sent', handleMessageSent);
    };
  }, [selectedUser, user, refreshMessages]);

  // Fetch broadcast messages when broadcast group is selected
  useEffect(() => {
    if (!broadcastGroupId || !user) {
      // Clear messages if no broadcast group is selected
      if (!selectedUser) {
        setMessages([]);
      }
      return;
    }

    const fetchBroadcastMessages = async () => {
      try {
        const response = await fetch(`/api/groups/${broadcastGroupId}/messages`);
        const result = await response.json();

        if (response.ok && result.success) {
          // Preserve optimistic messages during polling updates
          setMessages((prevMessages) => {
            const optimisticMessages = prevMessages.filter(msg => msg.isOptimistic);
            const fetchedMessages = result.messages || [];

            // Combine real messages with optimistic ones, avoiding duplicates
            return [...fetchedMessages, ...optimisticMessages];
          });
        } else {
          console.error('Failed to fetch broadcast messages:', result.error);
          // Only clear messages if there are no optimistic ones
          setMessages((prevMessages) => prevMessages.filter(msg => msg.isOptimistic));
        }
      } catch (error) {
        console.error('Error fetching broadcast messages:', error);
        // Only clear messages if there are no optimistic ones
        setMessages((prevMessages) => prevMessages.filter(msg => msg.isOptimistic));
      }
    };

    fetchBroadcastMessages();

    // Set up polling for broadcast message updates
    const interval = setInterval(fetchBroadcastMessages, 4000); // Poll every 4 seconds

    // SSE connection for broadcast status updates
    let eventSource: EventSource | null = null;
    try {
      const sseUrl = `/api/messages/stream?conversationId=${encodeURIComponent(broadcastGroupId)}${user?.id ? `&userId=${encodeURIComponent(user.id)}` : ''}`;
      eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          if (data.type === 'status_update' || data.type === 'new_message') {
            fetchBroadcastMessages();
          }
        } catch {
          // ignore
        }
      };
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [broadcastGroupId, user, selectedUser]);

  // Handle user selection and mark messages as read
  const handleUserSelect = async (selectedUser: ChatUser) => {
    // Clear broadcast group state when selecting an individual user
    setBroadcastGroupId(null);
    setBroadcastGroupName(null);

    setSelectedUser(selectedUser);

    // Immediately clear unread count in UI for better UX
    if (selectedUser.unread_count && selectedUser.unread_count > 0) {
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id
          ? { ...u, unread_count: 0 }
          : u
      ));

      // Mark messages as read in the background
      try {
        const response = await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otherUserId: selectedUser.id
          }),
        });

        if (response.ok) {
          await response.json();
        } else {
          console.error('Failed to mark messages as read');
          // Revert unread count if API fails
          setUsers(prev => prev.map(u =>
            u.id === selectedUser.id
              ? { ...u, unread_count: selectedUser.unread_count }
              : u
          ));
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
        // Revert unread count if API fails
        setUsers(prev => prev.map(u =>
          u.id === selectedUser.id
            ? { ...u, unread_count: selectedUser.unread_count }
            : u
        ));
      }
    }

    if (!isMobile) {
      setShowChat(true);
    } else {
      setShowChat(true);
    }
  };

  const refreshUsers = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/conversations', {
        headers: user?.id ? { 'x-user-id': user.id } : undefined,
      });
      const result = await response.json();

      if (response.ok && result.conversations) {
        const transformedUsers: ChatUser[] = result.conversations.map((conv: ConversationApi) => ({
          id: conv.id,
          phone_number: conv.phone_number,
          name: conv.name,
          custom_name: conv.custom_name,
          whatsapp_name: conv.whatsapp_name,
          last_active: conv.last_active,
          unread_count: conv.unread_count || 0,
          last_message_time: conv.last_message_time,
          last_message: conv.last_message,
          last_message_type: conv.last_message_type,
          last_message_template_name: conv.last_message_template_name,
          last_message_sender: conv.last_message_sender
        }));

        setUsers(transformedUsers);
        setSelectedUser((prev) => {
          if (!prev) return null;
          const updated = transformedUsers.find(u => u.id === prev.id);
          return updated ? { ...prev, ...updated } : prev;
        });
      } else {
        console.error('Error refreshing users:', result.error);
      }
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, [user]);

  const handleUpdateName = useCallback(async (userId: string, customName: string) => {
    try {
      const response = await fetch('/api/users/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          customName: customName.trim() || null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update name');
      }

      // Refresh users list to show updated name
      await refreshUsers();

    } catch (error) {
      console.error('Error updating name:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  }, [refreshUsers]);

  const handleBroadcastToGroup = useCallback((groupId: string, groupName: string) => {
    // Clear individual user state
    setSelectedUser(null);
    setMessages([]);

    // Set broadcast group state
    setBroadcastGroupId(groupId);
    setBroadcastGroupName(groupName);

    // Show chat window on mobile
    setShowChat(true);
  }, []);

  const handleSendBroadcast = async (content: string) => {
    if (!broadcastGroupId || !user || sendingMessage) return;

    setSendingMessage(true);

    // Generate optimistic message ID
    const optimisticId = `optimistic_broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Check if content is a template (JSON format)
    let requestBody;
    let messageContent = content;
    let messageType = 'text';
    let isTemplate = false;

    try {
      const parsedContent = JSON.parse(content);
      if (parsedContent.type === 'template') {
        // Template broadcast
        isTemplate = true;
        messageContent = parsedContent.displayMessage;
        messageType = 'template';
        requestBody = {
          message: parsedContent.displayMessage,
          messageType: 'template',
          templateName: parsedContent.templateName,
          templateData: parsedContent.templateData,
          variables: parsedContent.variables,
        };
      } else {
        requestBody = {
          message: content,
          messageType: 'text',
        };
      }
    } catch {
      // Not JSON, treat as regular text message
      requestBody = {
        message: content,
        messageType: 'text',
      };
    }

    // Create optimistic message for instant UI feedback
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: user.id,
      content: messageContent,
      timestamp,
      is_sent_by_me: true,
      message_type: messageType,
      media_data: isTemplate ? content : JSON.stringify({ broadcast_group_id: broadcastGroupId }),
      isOptimistic: true
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`/api/groups/${broadcastGroupId}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send broadcast');
      }

      // Remove optimistic message and refresh to get real messages
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));

      // Refresh broadcast messages to show the real ones
      const messagesResponse = await fetch(`/api/groups/${broadcastGroupId}/messages`);
      const messagesResult = await messagesResponse.json();
      if (messagesResponse.ok && messagesResult.success) {
        setMessages(messagesResult.messages || []);
      }

      // Show success message
      alert(`Broadcast sent to ${result.results.success}/${result.results.total} members`);

      // Refresh users list to show the broadcast messages
      await refreshUsers();

    } catch (error) {
      console.error('Error sending broadcast:', error);

      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));

      alert(`Failed to send broadcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Check if we're broadcasting to a group or sending to a single user
    if (broadcastGroupId && broadcastGroupName) {
      await handleSendBroadcast(content);
      return;
    }

    if (!selectedUser || !user || sendingMessage) return;

    setSendingMessage(true);

    // Generate optimistic message ID
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Create optimistic message for instant UI feedback
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content,
      timestamp,
      is_sent_by_me: true,
      message_type: 'text',
      media_data: null,
      isOptimistic: true
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const recipientPhone =
        selectedUser.phone_number ||
        (selectedUser as unknown as { phoneNumber?: string }).phoneNumber ||
        (selectedUser as unknown as { phone?: string }).phone;

      // Call the WhatsApp API endpoint which handles both WhatsApp sending and database storage
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientPhone,
          contactId: selectedUser.id,
          message: content,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.details?.message || result.error || result.message || 'Failed to send message';
        throw new Error(errorMsg);
      }

      // Replace optimistic message with real message from API response
      setMessages((prev) => prev.map(m =>
        m.id === optimisticId
          ? {
            id: result.messageId,
            sender_id: user.id,
            receiver_id: selectedUser.id,
            content,
            timestamp: result.timestamp || timestamp,
            is_sent_by_me: true,
            message_type: 'text',
            media_data: null,
            isOptimistic: false
          }
          : m
      ));

      // Update the user list to show this as the latest message
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id
          ? {
            ...u,
            last_message: content,
            last_message_time: result.timestamp || timestamp,
            last_message_type: 'text',
            last_message_sender: user.id
          }
          : u
      ));

    } catch (error) {
      console.error('Error sending message:', error);

      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));

      // Show error to user
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Note: Fallback storage is handled by the send-message API endpoint
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!user || sendingMessage) return;

    const timestamp = new Date().toISOString();

    setMessages((prev) => prev.map((msg) => {
      if (msg.id !== messageId) return msg;
      return {
        ...msg,
        reactions: upsertReactionList({
          reactions: msg.reactions || [],
          emoji,
          from: user.id,
          timestamp,
        }),
      };
    }));

    try {
      const response = await fetch('/api/messages/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, emoji }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to react');
      }

      if (result.reactions) {
        setMessages((prev) => prev.map((msg) => (
          msg.id === messageId ? { ...msg, reactions: result.reactions } : msg
        )));
      }
    } catch (error) {
      console.error('Error reacting to message:', error);
      alert(`Failed to react: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await refreshMessages();
    }
  }, [refreshMessages, sendingMessage, upsertReactionList, user]);

  // Show loading state while checking setup
  if (!user || checkingSetup) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-stone-300 dark:border-stone-700 border-t-[#5F7C65] dark:border-t-[#8EAE95] mx-auto mb-3.5"></div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Show setup required message if setup is not complete
  if (isSetupComplete === false) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
        <div className="max-w-md w-full rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-[#131915]/80 backdrop-blur-md p-2 shadow-sm">
          <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 p-8 text-center space-y-6 border border-stone-200/60 dark:border-stone-800/60">
            <div className="flex justify-center">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">Setup Required</h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Please complete your WhatsApp Cloud API setup to access the live chat interface. Configure either the Access Token or Webhook to continue.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/protected/setup" className="block">
                <Button className="w-full bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-xl shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)]" size="lg">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Setup
                </Button>
              </Link>

              <p className="text-xs text-stone-500 dark:text-stone-400">
                Setup typically takes less than 2 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#FAF8F5]/30 dark:bg-[#0C0F0D] overflow-hidden">
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          {/* User List - Desktop */}
          <div className="w-[340px] md:w-[360px] lg:w-[380px] xl:w-[410px] shrink-0 border-r border-stone-200/80 dark:border-stone-800/80 h-full flex flex-col bg-[#FAF8F5]/30 dark:bg-[#0C0F0D]">
            <UserList
              users={users}
              selectedUser={selectedUser}
              onUserSelect={handleUserSelect}
              currentUserId={user.id}
              onUsersUpdate={refreshUsers}
              onBroadcastToGroup={handleBroadcastToGroup}
            />
          </div>

          {/* Chat Window - Desktop */}
          <div className="flex-1 h-full min-w-0 flex flex-col bg-[#FAF8F5]/20 dark:bg-[#0C0F0D]">
            <ChatWindow
              selectedUser={selectedUser}
              messages={messages}
              onSendMessage={handleSendMessage}
              onReactToMessage={handleReactToMessage}
              currentUserId={user.id}
              isLoading={sendingMessage}
              onUpdateName={handleUpdateName}
              onClose={() => {
                setSelectedUser(null);
                setMessages([]);
                setBroadcastGroupId(null);
                setBroadcastGroupName(null);
              }}
              broadcastGroupName={broadcastGroupName}
              messagingDisabled={messagingBlocked}
              messagingDisabledReason={messagingBlockedReason}
              whatsappAccessToken={whatsappAccessToken}
            />
          </div>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <>
          {!showChat ? (
            // User List - Mobile
            <div className="w-full h-full flex flex-col">
              <UserList
                users={users}
                selectedUser={selectedUser}
                onUserSelect={handleUserSelect}
                currentUserId={user.id}
                onUsersUpdate={refreshUsers}
                onBroadcastToGroup={handleBroadcastToGroup}
              />
            </div>
          ) : (
            // Chat Window - Mobile
            <div className="w-full h-full flex flex-col">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                onSendMessage={handleSendMessage}
                onReactToMessage={handleReactToMessage}
                currentUserId={user.id}
                onBack={() => {
                  handleBackToUsers();
                  setBroadcastGroupId(null);
                  setBroadcastGroupName(null);
                }}
                isMobile={true}
                isLoading={sendingMessage}
                onUpdateName={handleUpdateName}
                broadcastGroupName={broadcastGroupName}
                messagingDisabled={messagingBlocked}
                messagingDisabledReason={messagingBlockedReason}
                whatsappAccessToken={whatsappAccessToken}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
