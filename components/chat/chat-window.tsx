"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2, X, Download, FileText, Music, Image as ImageIcon, Play, Pause, RefreshCw } from "lucide-react";
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
  message_type?: string;
  media_data?: string | null;
}

interface MediaData {
  type: string;
  id?: string;
  mime_type?: string;
  sha256?: string;
  filename?: string;
  caption?: string;
  voice?: boolean;
  media_url?: string;
  s3_uploaded?: boolean;
  upload_timestamp?: string;
  url_refreshed_at?: string;
}

interface ChatWindowProps {
  selectedUser: ChatUser | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  currentUserId: string;
  isMobile?: boolean;
  isLoading?: boolean;
}

export function ChatWindow({ 
  selectedUser, 
  messages, 
  onSendMessage, 
  onBack, 
  onClose,
  currentUserId, 
  isMobile = false,
  isLoading = false
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [refreshingUrls, setRefreshingUrls] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle ESC key press within the chat window
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobile && onBack) {
          onBack();
        } else if (!isMobile && onClose) {
          onClose();
        }
      }
    };

    // Only add listener when chat window is active (selectedUser exists)
    if (selectedUser) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedUser, isMobile, onBack, onClose]);

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

  const handleAudioPlay = (messageId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (playingAudio && playingAudio !== messageId) {
      const currentAudio = audioRefs.current[playingAudio];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    // Toggle play/pause for the clicked audio
    const audio = audioRefs.current[messageId];
    if (audio) {
      if (playingAudio === messageId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        audio.play();
        setPlayingAudio(messageId);
      }
    } else {
      // Create new audio element
      const newAudio = new Audio(audioUrl);
      newAudio.onended = () => setPlayingAudio(null);
      newAudio.onerror = () => {
        console.error('Error playing audio');
        setPlayingAudio(null);
      };
      audioRefs.current[messageId] = newAudio;
      newAudio.play();
      setPlayingAudio(messageId);
    }
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  const refreshMediaUrl = async (messageId: string) => {
    if (refreshingUrls.has(messageId)) return;

    setRefreshingUrls(prev => new Set(prev).add(messageId));

    try {
      const response = await fetch('/api/media/refresh-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Media URL refreshed:', result);
        
        // Trigger a re-render by updating the messages
        // This will be handled by the parent component's real-time subscription
        
        // Show success feedback
        // You might want to add a toast notification here
      } else {
        console.error('Failed to refresh media URL:', await response.text());
      }
    } catch (error) {
      console.error('Error refreshing media URL:', error);
    } finally {
      setRefreshingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const renderMessageContent = (message: Message, isOwn: boolean) => {
    const messageType = message.message_type || 'text';
    let mediaData: MediaData | null = null;

    if (message.media_data) {
      try {
        mediaData = JSON.parse(message.media_data);
      } catch (error) {
        console.error('Error parsing media data:', error);
      }
    }

    const baseClasses = `max-w-[70%] px-4 py-2 rounded-lg ${
      isOwn
        ? 'bg-green-500 text-white ml-4'
        : 'bg-white dark:bg-muted border border-border mr-4'
    }`;

    const isRefreshing = refreshingUrls.has(message.id);

    switch (messageType) {
      case 'image':
        return (
          <div className={baseClasses}>
            {mediaData?.media_url && mediaData.s3_uploaded ? (
              <div className="mb-2 relative">
                <img 
                  src={mediaData.media_url} 
                  alt="Shared image"
                  className="max-w-full h-auto rounded-lg cursor-pointer"
                  onClick={() => window.open(mediaData.media_url, '_blank')}
                  onError={() => {
                    console.log('Image failed to load, attempting to refresh URL');
                    refreshMediaUrl(message.id);
                  }}
                />
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm mb-2">
                <ImageIcon className="h-4 w-4" />
                <span>Image</span>
                {mediaData?.s3_uploaded === false && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6"
                    onClick={() => refreshMediaUrl(message.id)}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            )}
            {mediaData?.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mb-1">
                {mediaData.caption}
              </p>
            )}
            <span className={`text-xs mt-1 block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'document':
        return (
          <div className={baseClasses}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-full ${isOwn ? 'bg-green-600' : 'bg-gray-200'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {mediaData?.filename || 'Document'}
                </p>
                <p className={`text-xs ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
                  {mediaData?.mime_type}
                </p>
              </div>
              {mediaData?.media_url && mediaData.s3_uploaded && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-1 h-8 w-8 ${isOwn ? 'hover:bg-green-600' : 'hover:bg-gray-200'}`}
                  onClick={() => downloadMedia(mediaData.media_url!, mediaData?.filename || 'document')}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
              {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-1 h-8 w-8 ${isOwn ? 'hover:bg-green-600' : 'hover:bg-gray-200'}`}
                  onClick={() => refreshMediaUrl(message.id)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'audio':
        return (
          <div className={baseClasses}>
            <div className="flex items-center gap-3 mb-2">
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 rounded-full ${isOwn ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                onClick={() => mediaData?.media_url && handleAudioPlay(message.id, mediaData.media_url)}
                disabled={!mediaData?.media_url || !mediaData.s3_uploaded || isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : playingAudio === message.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span className="text-sm">
                    {mediaData?.voice ? 'Voice Message' : 'Audio'}
                  </span>
                  {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-6 w-6"
                      onClick={() => refreshMediaUrl(message.id)}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
                <div className={`h-1 bg-current opacity-20 rounded-full mt-1`}></div>
              </div>
            </div>
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'video':
        return (
          <div className={baseClasses}>
            {mediaData?.media_url && mediaData.s3_uploaded ? (
              <div className="mb-2 relative">
                <video 
                  controls
                  className="max-w-full h-auto rounded-lg"
                  preload="metadata"
                  onError={() => {
                    console.log('Video failed to load, attempting to refresh URL');
                    refreshMediaUrl(message.id);
                  }}
                >
                  <source src={mediaData.media_url} type={mediaData.mime_type} />
                  Your browser does not support the video tag.
                </video>
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm mb-2">
                <Play className="h-4 w-4" />
                <span>Video</span>
                {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6"
                    onClick={() => refreshMediaUrl(message.id)}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            )}
            {mediaData?.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mb-1">
                {mediaData.caption}
              </p>
            )}
            <span className={`text-xs mt-1 block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      default:
        // Text message or fallback
        return (
          <div className={baseClasses}>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <span className={`text-xs mt-1 block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );
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
        <p className="text-sm text-muted-foreground mt-4 opacity-75">
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">ESC</kbd> to close chat window
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
            title="Back to contacts"
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
        {!isMobile && onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Close chat (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        )}
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
                        {renderMessageContent(message, isOwn)}
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
            autoFocus
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