"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2, X, Download, FileText, Image as ImageIcon, Play, Pause, RefreshCw, Volume2, Paperclip } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { MediaUpload } from "./media-upload";

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

interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'document' | 'audio' | 'video';
  preview?: string;
  caption?: string;
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
  const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});
  const [audioCurrentTime, setAudioCurrentTime] = useState<{ [key: string]: number }>({});
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
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
        if (showMediaUpload) {
          setShowMediaUpload(false);
        } else if (isMobile && onBack) {
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
  }, [selectedUser, isMobile, onBack, onClose, showMediaUpload]);

  // Handle drag and drop for the entire chat window
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if we're leaving the chat window entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && selectedUser) {
      setShowMediaUpload(true);
      // The MediaUpload component will handle the files
    }
  }, [selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedUser && !isLoading) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };

  const handleSendMedia = async (mediaFiles: MediaFile[]) => {
    if (!selectedUser || sendingMedia) return;

    setSendingMedia(true);
    
    try {
      const formData = new FormData();
      formData.append('to', selectedUser.id);
      
      mediaFiles.forEach((mediaFile) => {
        formData.append('files', mediaFile.file);
        formData.append('captions', mediaFile.caption || '');
      });

      const response = await fetch('/api/send-media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send media');
      }

      console.log('Media sent successfully:', result);
      
      // Show success message
      if (result.successCount > 0) {
        // You might want to show a toast notification here
        console.log(`Successfully sent ${result.successCount} of ${result.totalFiles} files`);
      }
      
      if (result.failureCount > 0) {
        alert(`Failed to send ${result.failureCount} files. Please try again.`);
      }

    } catch (error) {
      console.error('Error sending media:', error);
      alert(`Failed to send media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingMedia(false);
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

  const formatAudioDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      
      // Set up audio event listeners
      newAudio.onloadedmetadata = () => {
        setAudioDurations(prev => ({ ...prev, [messageId]: newAudio.duration }));
      };
      
      newAudio.ontimeupdate = () => {
        setAudioCurrentTime(prev => ({ ...prev, [messageId]: newAudio.currentTime }));
      };
      
      newAudio.onended = () => {
        setPlayingAudio(null);
        setAudioCurrentTime(prev => ({ ...prev, [messageId]: 0 }));
      };
      
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

  const handleMediaLoad = (messageId: string) => {
    setLoadingMedia(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

  const handleMediaLoadStart = (messageId: string) => {
    setLoadingMedia(prev => new Set(prev).add(messageId));
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

    const baseClasses = `max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
      isOwn
        ? 'bg-green-500 text-white ml-4'
        : 'bg-white dark:bg-muted border border-border mr-4'
    }`;

    const isRefreshing = refreshingUrls.has(message.id);
    const isMediaLoading = loadingMedia.has(message.id);

    switch (messageType) {
      case 'image':
        return (
          <div className={baseClasses}>
            {mediaData?.media_url && mediaData.s3_uploaded ? (
              <div className="mb-2 relative overflow-hidden rounded-xl">
                {isMediaLoading && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="text-xs text-gray-500">Loading image...</span>
                    </div>
                  </div>
                )}
                <Image
                  src={mediaData.media_url}
                  alt={mediaData.caption || "Shared image"}
                  width={300}
                  height={200}
                  className="max-w-[300px] max-h-[400px] w-auto h-auto object-cover cursor-pointer rounded-xl"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  onClick={() => window.open(mediaData.media_url, '_blank')}
                  onLoadingComplete={() => handleMediaLoad(message.id)}
                  onLoadStart={() => handleMediaLoadStart(message.id)}
                  onError={() => {
                    console.log('Next.js Image failed to load, attempting to refresh URL');
                    handleMediaLoad(message.id);
                    refreshMediaUrl(message.id);
                  }}
                  priority={false}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq19G9D/Z"
                  unoptimized={false}
                />
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl mb-2">
                <ImageIcon className="h-8 w-8 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Image</p>
                  <p className="text-xs text-gray-500">Loading...</p>
                </div>
                {mediaData?.s3_uploaded === false && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => refreshMediaUrl(message.id)}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}
            {mediaData?.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mb-2">
                {mediaData.caption}
              </p>
            )}
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'document':
        return (
          <div className={baseClasses}>
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 min-w-[280px] max-w-[400px]">
              <div className={`p-3 rounded-full ${isOwn ? 'bg-green-600' : 'bg-blue-500'}`}>
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">
                  {mediaData?.filename || 'Document'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mediaData?.mime_type}
                </p>
                {isMediaLoading && (
                  <p className="text-xs text-blue-500 mt-1">Preparing download...</p>
                )}
              </div>
              {mediaData?.media_url && mediaData.s3_uploaded && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-2 h-10 w-10 ${isOwn ? 'hover:bg-green-600' : 'hover:bg-gray-200'}`}
                  onClick={() => downloadMedia(mediaData.media_url!, mediaData?.filename || 'document')}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
              )}
              {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-2 h-10 w-10 ${isOwn ? 'hover:bg-green-600' : 'hover:bg-gray-200'}`}
                  onClick={() => refreshMediaUrl(message.id)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'audio':
        const duration = audioDurations[message.id] || 0;
        const currentTime = audioCurrentTime[message.id] || 0;
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        return (
          <div className={baseClasses}>
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 min-w-[300px] max-w-[400px]">
              <Button
                size="sm"
                variant="ghost"
                className={`p-3 rounded-full ${isOwn ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                onClick={() => mediaData?.media_url && handleAudioPlay(message.id, mediaData.media_url)}
                disabled={!mediaData?.media_url || !mediaData.s3_uploaded || isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : playingAudio === message.id ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {mediaData?.voice ? 'Voice Message' : 'Audio'}
                  </span>
                  {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-6 w-6 ml-auto"
                      onClick={() => refreshMediaUrl(message.id)}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
                
                {/* Audio Progress Bar */}
                <div className="relative">
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isOwn ? 'bg-green-300' : 'bg-blue-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {formatAudioDuration(currentTime)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {duration > 0 ? formatAudioDuration(duration) : '--:--'}
                    </span>
                  </div>
                </div>
                
                {isMediaLoading && (
                  <p className="text-xs text-blue-500 mt-1">Loading audio...</p>
                )}
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
              <div className="mb-2 relative overflow-hidden rounded-xl max-w-[400px] max-h-[300px]">
                {isMediaLoading && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-xl z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="text-xs text-gray-500">Loading video...</span>
                    </div>
                  </div>
                )}
                <video 
                  controls
                  className="max-w-[400px] max-h-[300px] w-auto h-auto rounded-xl"
                  preload="metadata"
                  onLoadStart={() => handleMediaLoadStart(message.id)}
                  onCanPlay={() => handleMediaLoad(message.id)}
                  onError={() => {
                    console.log('Video failed to load, attempting to refresh URL');
                    handleMediaLoad(message.id);
                    refreshMediaUrl(message.id);
                  }}
                >
                  <source src={mediaData.media_url} type={mediaData.mime_type} />
                  Your browser does not support the video tag.
                </video>
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl z-20">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl mb-2">
                <Play className="h-8 w-8 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Video</p>
                  <p className="text-xs text-gray-500">Loading...</p>
                </div>
                {(!mediaData?.media_url || !mediaData.s3_uploaded) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => refreshMediaUrl(message.id)}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}
            {mediaData?.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mb-2">
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
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
            <span className={`text-xs mt-2 block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
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
    <div 
      className="h-full flex flex-col bg-background relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
            {isLoading || sendingMedia ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {sendingMedia ? 'Sending media...' : 'Sending message...'}
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
                <div className="flex justify-center my-6">
                  <span className="bg-background/80 text-muted-foreground text-xs px-4 py-2 rounded-full border shadow-sm">
                    {formatDate(dayMessages[0].timestamp)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
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
        <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMediaUpload(true)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Attach media"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={isLoading || sendingMedia ? "Sending..." : "Type a message..."}
            className="flex-1 border-border focus:ring-green-500 rounded-full px-4 py-2"
            maxLength={1000}
            disabled={isLoading || sendingMedia}
            autoFocus
          />
          <Button 
            type="submit" 
            disabled={!messageInput.trim() || isLoading || sendingMedia}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading || sendingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-green-500 border-dashed">
            <Paperclip className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-2xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Drop files to send
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Release to upload and send media
            </p>
          </div>
        </div>
      )}

      {/* Media Upload Modal */}
      <MediaUpload
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onSend={handleSendMedia}
        selectedUser={selectedUser}
      />
    </div>
  );
} 