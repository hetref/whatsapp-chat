"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

interface ChatWindowProps {
  selectedUser: ChatUser | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  currentUserId: string;
  isMobile?: boolean;
  isLoading?: boolean;
}

export function ChatWindow({ 
  selectedUser, 
  messages, 
  onSendMessage, 
  onBack, 
  currentUserId, 
  isMobile = false,
  isLoading = false
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedUser && !isLoading) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!selectedUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/20">
        <MessageCircle className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
          Welcome to WhatsApp Web
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a conversation from the sidebar to start messaging, or create a new chat.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-3">
        {isMobile && onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
            {selectedUser.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{selectedUser.name}</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending message...
              </span>
            ) : (
              `Last seen ${formatTime(selectedUser.last_active)}`
            )}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-green-50/30 to-blue-50/30 dark:from-green-950/10 dark:to-blue-950/10"
      >
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm text-center">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                  <span className="bg-background/80 text-muted-foreground text-xs px-3 py-1 rounded-full border">
                    {formatDate(dayMessages[0].timestamp)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {dayMessages.map((message) => {
                    const isOwn = message.sender_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-green-500 text-white ml-4'
                              : 'bg-white dark:bg-muted border border-border mr-4'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <span
                            className={`text-xs mt-1 block ${
                              isOwn ? 'text-green-100' : 'text-muted-foreground'
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={isLoading ? "Sending..." : "Type a message..."}
            className="flex-1 border-border focus:ring-green-500"
            maxLength={1000}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!messageInput.trim() || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 