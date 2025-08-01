"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserList } from "@/components/chat/user-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { User } from "@supabase/supabase-js";

interface ChatUser {
  id: string;
  name: string;
  last_active: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_sent_by_me: boolean;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const supabase = createClient();

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Subscribe to users table for real-time updates
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('last_active', { ascending: false });
      
      if (data) setUsers(data);
    };

    fetchUsers();

    // Set up real-time subscription for users
    const usersSubscription = supabase
      .channel('users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers((prev) => [payload.new as ChatUser, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers((prev) => 
            prev.map((u) => u.id === payload.new.id ? payload.new as ChatUser : u)
          );
        } else if (payload.eventType === 'DELETE') {
          setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      usersSubscription.unsubscribe();
    };
  }, []);

  // Subscribe to messages for selected user
  useEffect(() => {
    if (!selectedUser || !user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id}))`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [selectedUser, user]);

  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBackToUsers = () => {
    setShowChat(false);
    setSelectedUser(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedUser || !user) return;

    const message = {
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content,
      timestamp: new Date().toISOString(),
      is_sent_by_me: true
    };

    const { error } = await supabase
      .from('messages')
      .insert([message]);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
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
            />
          </div>
          
          {/* Chat Window - Desktop */}
          <div className="flex-1">
            <ChatWindow
              selectedUser={selectedUser}
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUserId={user.id}
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
                currentUserId={user.id}
                isMobile={true}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
