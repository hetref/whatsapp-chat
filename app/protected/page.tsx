"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserList } from "@/components/chat/user-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { User } from "@supabase/supabase-js";
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
}

interface MessagePayload {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  message_type?: string;
  media_data?: string | null;
}

interface UnreadConversation {
  conversation_id: string;
  display_name: string;
  unread_count: number;
  last_message_time: string;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const supabase = createClient();

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

  // Get current user and check setup
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check if user has completed setup
        const response = await fetch('/api/settings/save');
        const data = await response.json();
        
        const setupComplete = data.settings?.access_token_added || data.settings?.webhook_verified;
        setIsSetupComplete(setupComplete);
        setCheckingSetup(false);
      }
    };
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Subscribe to users table for real-time updates with optimized loading
  useEffect(() => {
    if (!user) return;

    let isInitialLoad = true;

    const fetchUsers = async () => {
      console.log('Fetching user conversations...');
      
      // Use the updated user_conversations view with enhanced name handling
      const { data, error } = await supabase
        .from('user_conversations')
        .select('*')
        .order('has_unread', { ascending: false })
        .order('last_message_time', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      if (data) {
        console.log(`Fetched ${data.length} user conversations`);
        
        // Transform data to match ChatUser interface
        const transformedUsers: ChatUser[] = data.map(user => ({
          id: user.id,
          name: user.display_name, // This now uses the priority logic from the view
          custom_name: user.custom_name,
          whatsapp_name: user.whatsapp_name,
          last_active: user.last_active,
          unread_count: user.unread_count || 0,
          last_message_time: user.last_message_time,
          last_message: user.last_message,
          last_message_type: user.last_message_type,
          last_message_sender: user.last_message_sender
        }));

        setUsers(transformedUsers);

        // On initial load, preload top 10 unread conversations
        if (isInitialLoad) {
          isInitialLoad = false;
          preloadUnreadConversations();
        }
      }
    };

    const preloadUnreadConversations = async () => {
      try {
        console.log('Preloading unread conversations...');
        
        // Get top 10 unread conversations
        const { data: unreadConversations, error } = await supabase.rpc('get_unread_conversations', {
          limit_count: 10
        });

        if (error) {
          console.error('Error preloading unread conversations:', error);
          return;
        }

        if (unreadConversations && unreadConversations.length > 0) {
          console.log(`Preloading messages for ${unreadConversations.length} unread conversations`);
          
          // Preload messages for each unread conversation (in parallel)
          const preloadPromises = unreadConversations.map(async (conversation: UnreadConversation) => {
            try {
              const { data: messages, error: messagesError } = await supabase.rpc('get_conversation_messages', {
                other_user_id: conversation.conversation_id
              });

              if (messagesError) {
                console.error(`Error preloading messages for ${conversation.conversation_id}:`, messagesError);
              } else {
                console.log(`Preloaded ${messages?.length || 0} messages for ${conversation.display_name}`);
                // Store in a cache if needed (optional - for now just log)
              }
            } catch (error) {
              console.error(`Error in preload for ${conversation.conversation_id}:`, error);
            }
          });

          // Wait for all preload operations to complete
          await Promise.allSettled(preloadPromises);
          console.log('Preloading completed');
        }
      } catch (error) {
        console.error('Error in preloadUnreadConversations:', error);
      }
    };

    // Initial fetch
    fetchUsers();

    // Set up real-time subscription for users table changes
    const usersSubscription = supabase
      .channel('users-channel-optimized')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, (payload) => {
        console.log('Users table change:', payload.eventType);
        // Debounce the refresh to avoid excessive calls
        setTimeout(fetchUsers, 100);
      })
      .subscribe();

    // Set up real-time subscription for messages table changes
    const messagesSubscription = supabase
      .channel('messages-global-channel-optimized')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        console.log('Messages table change:', payload.eventType);
        
        // Update specific user in list based on message change
        const message = payload.new as MessagePayload;
        if (message) {
          const otherUserId = message.sender_id === user?.id ? message.receiver_id : message.sender_id;
          
          // Update the specific user's last message and unread count
          setUsers((prevUsers) => {
            const updatedUsers = prevUsers.map(u => {
              if (u.id === otherUserId) {
                const isFromMe = message.sender_id === user?.id;
                // Don't increment unread count if this conversation is currently open
                const isCurrentlyViewing = selectedUser?.id === otherUserId;
                const shouldIncrementUnread = !isFromMe && !isCurrentlyViewing;
                
                return {
                  ...u,
                  last_message: message.content || '',
                  last_message_time: message.timestamp,
                  last_message_type: message.message_type || 'text',
                  last_message_sender: message.sender_id,
                  // Increment unread count only if message is from other user and not currently viewing
                  unread_count: shouldIncrementUnread ? (u.unread_count || 0) + 1 : u.unread_count
                };
              }
              return u;
            });
            
            // Re-sort users after update (unread first, then by time)
            return updatedUsers.sort((a, b) => {
              if ((a.unread_count || 0) > 0 && (b.unread_count || 0) === 0) return -1;
              if ((a.unread_count || 0) === 0 && (b.unread_count || 0) > 0) return 1;
              const aTime = new Date(a.last_message_time || a.last_active).getTime();
              const bTime = new Date(b.last_message_time || b.last_active).getTime();
              return bTime - aTime;
            });
          });
        }
        
        // Also debounce a full refresh as fallback
        setTimeout(fetchUsers, 2000);
      })
      .subscribe();

    return () => {
      usersSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // supabase and selectedUser are stable/controlled

  // Subscribe to messages for selected user with improved real-time handling
  useEffect(() => {
    if (!selectedUser || !user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      console.log(`Fetching messages between ${user.id} and ${selectedUser.id}`);
      
      // Use the database function to get conversation messages
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        other_user_id: selectedUser.id
      });
      
      if (error) {
        console.error('Error fetching messages:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Selected user ID:', selectedUser.id);
        console.error('Current user ID:', user.id);
      } else {
        console.log(`Fetched ${data?.length || 0} messages`);
        // Map message_timestamp back to timestamp for the interface and ensure is_sent_by_me is set
        const mappedMessages = (data || []).map((msg: MessagePayload & { message_timestamp?: string; is_sent_by_me?: boolean }) => ({
          ...msg,
          timestamp: msg.message_timestamp || msg.timestamp,
          // Ensure is_sent_by_me is always set correctly
          is_sent_by_me: msg.is_sent_by_me !== undefined ? msg.is_sent_by_me : msg.sender_id === user.id
        }));
        setMessages(mappedMessages);
        
        // Debug: Log first few messages to check is_sent_by_me values
        if (mappedMessages.length > 0) {
          console.log('Sample messages with is_sent_by_me:', mappedMessages.slice(0, 3).map((m: Message) => ({
            id: m.id,
            sender_id: m.sender_id,
            is_sent_by_me: m.is_sent_by_me,
            content: m.content?.substring(0, 20)
          })));
        }
      }
    };

    fetchMessages();

    // Set up real-time subscription for messages with a unique channel name
    const channelName = `messages-${user.id}-${selectedUser.id}-${Date.now()}`;
    const messagesSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        console.log('New message received via real-time:', payload);
        
        const newMessage = payload.new as MessagePayload;
        
        // Check if this message belongs to the current conversation
        const isRelevantMessage = 
          (newMessage.sender_id === user.id && newMessage.receiver_id === selectedUser.id) ||
          (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === user.id);
        
        if (isRelevantMessage) {
          console.log('Adding message to conversation');
          
          // Determine if this message was sent by the current user
          const messageWithFlag = {
            ...newMessage,
            is_sent_by_me: newMessage.sender_id === user.id,
            timestamp: newMessage.timestamp || new Date().toISOString()
          };
          
          console.log('Real-time message flags:', {
            message_id: messageWithFlag.id,
            sender_id: newMessage.sender_id,
            current_user_id: user.id,
            is_sent_by_me: messageWithFlag.is_sent_by_me,
            content: messageWithFlag.content?.substring(0, 20)
          });
          
          setMessages((prev) => {
            // Avoid duplicates (check for both regular ID and optimistic ID)
            const exists = prev.find(m => 
              m.id === messageWithFlag.id || 
              (m.id.startsWith('optimistic_') && m.content === messageWithFlag.content && m.timestamp === messageWithFlag.timestamp)
            );
            
            if (exists) {
              // Replace optimistic message with real one
              if (exists.id.startsWith('optimistic_')) {
                return prev.map(m => m.id === exists.id ? messageWithFlag : m);
              }
              return prev;
            }
            
            // Insert message in correct chronological order
            const newMessages = [...prev, messageWithFlag];
            return newMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });

          // Mark message as read if it's from the other user
          if (newMessage.sender_id === selectedUser.id) {
            setTimeout(() => {
              fetch('/api/messages/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otherUserId: selectedUser.id })
              }).catch(console.error);
            }, 500);
          }
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        console.log('Message updated:', payload);
        
        const updatedMessage = payload.new as MessagePayload;
        
        // Check if this message belongs to the current conversation
        const isRelevantMessage = 
          (updatedMessage.sender_id === user.id && updatedMessage.receiver_id === selectedUser.id) ||
          (updatedMessage.sender_id === selectedUser.id && updatedMessage.receiver_id === user.id);
        
        if (isRelevantMessage) {
          const messageWithFlag = {
            ...updatedMessage,
            is_sent_by_me: updatedMessage.sender_id === user.id,
            timestamp: updatedMessage.timestamp || new Date().toISOString()
          };
          
          setMessages((prev) => 
            prev.map(m => m.id === updatedMessage.id ? messageWithFlag : m)
          );
        }
      })
      .subscribe();

    console.log(`Subscribed to messages channel: ${channelName}`);

    return () => {
      console.log(`Unsubscribing from messages channel: ${channelName}`);
      messagesSubscription.unsubscribe();
    };
  }, [selectedUser, user, supabase]);

  // Handle user selection and mark messages as read
  const handleUserSelect = async (selectedUser: ChatUser) => {
    console.log('User selected:', selectedUser);
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
    
    const { data, error } = await supabase
      .from('user_conversations')
      .select('*')
      .order('has_unread', { ascending: false })
      .order('last_message_time', { ascending: false });
    
    if (error) {
      console.error('Error refreshing users:', error);
      return;
    }

    if (data) {
      const transformedUsers: ChatUser[] = data.map(user => ({
        id: user.id,
        name: user.display_name,
        custom_name: user.custom_name,
        whatsapp_name: user.whatsapp_name,
        last_active: user.last_active,
        unread_count: user.unread_count || 0,
        last_message_time: user.last_message_time,
        last_message: user.last_message,
        last_message_type: user.last_message_type,
        last_message_sender: user.last_message_sender
      }));

      setUsers(transformedUsers);
      console.log(`Refreshed ${transformedUsers.length} user conversations`);
    }
  }, [user, supabase]);

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

  const handleSendMessage = async (content: string) => {
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
      media_data: null
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
      
      // The message will be replaced by the real one via real-time subscription
      // The subscription handler will detect the optimistic ID and replace it
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));
      
      // Show error to user
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback: Store in database only if WhatsApp API fails
      try {
        const fallbackMessage = {
          sender_id: user.id,
          receiver_id: selectedUser.id,
          content,
          timestamp: new Date().toISOString(),
          message_type: 'text',
          media_data: null
        };

        const { error: dbError } = await supabase
          .from('messages')
          .insert([fallbackMessage]);

        if (dbError) {
          console.error('Fallback database storage also failed:', dbError);
        } else {
          console.log('Message stored in database as fallback');
        }
      } catch (fallbackError) {
        console.error('Fallback storage failed:', fallbackError);
      }
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
              }}
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
              />
      </div>
          ) : (
            // Chat Window - Mobile
            <div className="w-full">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                onSendMessage={handleSendMessage}
                onBack={handleBackToUsers}
                isMobile={true}
                isLoading={sendingMessage}
                onUpdateName={handleUpdateName}
              />
      </div>
          )}
        </>
      )}
    </div>
  );
}
