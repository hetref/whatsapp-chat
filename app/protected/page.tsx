"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { UserList } from "@/components/chat/user-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings } from "lucide-react";
import Link from "next/link";

interface ChatUser {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  unread_count?: number;
  last_message_time?: string;
  last_message?: string;
  last_message_type?: string;
  last_message_sender?: string;
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
  isOptimistic?: boolean;
}

interface ConversationApi {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  unread_count?: number;
  last_message_time?: string;
  last_message?: string;
  last_message_type?: string;
  last_message_sender?: string;
}

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [broadcastGroupId, setBroadcastGroupId] = useState<string | null>(null);
  const [broadcastGroupName, setBroadcastGroupName] = useState<string | null>(null);

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
        setCheckingSetup(false);
      } else {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, [user, isLoaded]); // Run when user or loading state changes

  // Fetch users using API instead of direct Supabase calls
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      console.log('Fetching user conversations...');

      try {
        const response = await fetch('/api/conversations');
        const result = await response.json();

        if (response.ok && result.conversations) {
          console.log(`Fetched ${result.conversations.length} user conversations`);

          // Transform data to match ChatUser interface
          const transformedUsers: ChatUser[] = result.conversations.map((conv: ConversationApi) => ({
            id: conv.id,
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

    const fetchMessages = async () => {
      console.log(`Fetching messages between ${user.id} and ${selectedUser.id}`);

      try {
        const response = await fetch(`/api/messages?conversationId=${selectedUser.id}&limit=50`);
        const result = await response.json();

        if (response.ok && result.messages) {
          console.log(`Fetched ${result.messages.length} messages`);

          // Ensure is_sent_by_me is set correctly
          const mappedMessages = result.messages.map((msg: Message) => ({
            ...msg,
            is_sent_by_me: msg.sender_id === user.id
          }));

          // Preserve optimistic messages during polling updates
          setMessages((prevMessages) => {
            const optimisticMessages = prevMessages.filter(msg => msg.isOptimistic);
            // No need to reverse - API now returns messages in chronological order (oldest to newest)

            // Combine real messages with optimistic ones, avoiding duplicates
            return [...mappedMessages, ...optimisticMessages];
          });

          // Debug: Log first few messages
          if (mappedMessages.length > 0) {
            console.log('Sample messages:', mappedMessages.slice(0, 3).map((m: Message) => ({
              id: m.id,
              sender_id: m.sender_id,
              is_sent_by_me: m.is_sent_by_me,
              content: m.content?.substring(0, 20)
            })));
          }
        } else {
          console.error('Error fetching messages:', result.error);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();

    // Set up polling for message updates
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [selectedUser, user]);

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
      console.log(`Fetching broadcast messages for group ${broadcastGroupId}`);

      try {
        const response = await fetch(`/api/groups/${broadcastGroupId}/messages`);
        const result = await response.json();

        if (response.ok && result.success) {
          console.log(`Fetched ${result.messages?.length || 0} broadcast messages`);

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
    const interval = setInterval(fetchBroadcastMessages, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [broadcastGroupId, user, selectedUser]);

  // Handle user selection and mark messages as read
  const handleUserSelect = async (selectedUser: ChatUser) => {
    console.log('User selected:', selectedUser);

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
          const result = await response.json();
          console.log(`Marked ${result.markedCount} messages as read`);
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

    console.log('Refreshing user conversations...');

    try {
      const response = await fetch('/api/conversations');
      const result = await response.json();

      if (response.ok && result.conversations) {
        const transformedUsers: ChatUser[] = result.conversations.map((conv: ConversationApi) => ({
          id: conv.id,
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
        console.log(`Refreshed ${transformedUsers.length} user conversations`);
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

      console.log('Name updated successfully:', result);

      // Refresh users list to show updated name
      await refreshUsers();

    } catch (error) {
      console.error('Error updating name:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  }, [refreshUsers]);

  const handleBroadcastToGroup = useCallback((groupId: string, groupName: string) => {
    console.log('Broadcasting to group:', groupName);

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
      console.log(`Broadcasting message to group ${broadcastGroupId}`);

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

      console.log('Broadcast sent successfully:', result);

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
      console.log(`Sending message to ${selectedUser.id}: ${content}`);

      // Call the WhatsApp API endpoint which handles both WhatsApp sending and database storage
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedUser.id,
          message: content,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      console.log('Message sent successfully:', result);

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

  // Show loading state while checking setup
  if (!user || checkingSetup) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show setup required message if setup is not complete
  if (isSetupComplete === false) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setup Required</h2>
            <p className="text-muted-foreground">
              Please complete the WhatsApp setup to access the chat interface.
              You need to configure either the Access Token or Webhook to continue.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/protected/setup">
              <Button className="w-full" size="lg">
                <Settings className="mr-2 h-5 w-5" />
                Go to Setup
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground">
              This will only take a few minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          {/* User List - Desktop */}
          <div className="w-1/3 border-r border-border">
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
          <div className="flex-1">
            <ChatWindow
              selectedUser={selectedUser}
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={sendingMessage}
              onUpdateName={handleUpdateName}
              onClose={() => {
                setSelectedUser(null);
                setMessages([]);
                setBroadcastGroupId(null);
                setBroadcastGroupName(null);
              }}
              broadcastGroupName={broadcastGroupName}
            />
          </div>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <>
          {!showChat ? (
            // User List - Mobile
            <div className="w-full">
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
            <div className="w-full">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                onSendMessage={handleSendMessage}
                onBack={() => {
                  handleBackToUsers();
                  setBroadcastGroupId(null);
                  setBroadcastGroupName(null);
                }}
                isMobile={true}
                isLoading={sendingMessage}
                onUpdateName={handleUpdateName}
                broadcastGroupName={broadcastGroupName}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
