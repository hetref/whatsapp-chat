"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2, X, Download, FileText, Image as ImageIcon, Play, Pause, RefreshCw, Volume2, Paperclip, MessageSquare, Users } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { MediaUpload } from "./media-upload";
import { UserInfoDialog } from "./user-info-dialog";
import { TemplateSelector } from "./template-selector";

// Template interfaces
interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  components: TemplateComponent[];
}

interface ChatUser {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
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
  is_read?: boolean;
  read_at?: string | null;
  isOptimistic?: boolean; // Flag for optimistic messages
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
  template_name?: string; // Added for template messages
  language?: string; // Added for template language
  header?: {
    format: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    media_url?: string;
    text?: string;
    filename?: string; // Added for document headers
  };
  body?: {
    text?: string;
  };
  footer?: {
    text?: string;
  };
  buttons?: Array<{
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
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
  isMobile?: boolean;
  isLoading?: boolean;
  onUpdateName?: (userId: string, customName: string) => Promise<void>;
  broadcastGroupName?: string | null;
}

export function ChatWindow({
  selectedUser,
  messages,
  onSendMessage,
  onBack,
  onClose,
  isMobile = false,
  isLoading = false,
  onUpdateName,
  broadcastGroupName
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
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const unreadIndicatorRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Handle template message sending
  const handleSendTemplate = async (templateName: string, templateData: WhatsAppTemplate, variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }) => {
    // Handle broadcast mode
    if (broadcastGroupName) {
      // Call onSendMessage with template data - it will be routed to broadcast endpoint
      const templateMessage = `Template: ${templateName}`;
      // Store template data in a special format that the broadcast handler can use
      onSendMessage(JSON.stringify({
        type: 'template',
        templateName,
        templateData,
        variables,
        displayMessage: templateMessage
      }));
      return;
    }

    if (!selectedUser) return;

    try {
      const response = await fetch('/api/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedUser.id,
          templateName,
          templateData,
          variables,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to send template');
      }

      console.log('Template sent successfully:', result);
    } catch (error) {
      console.error('Error sending template:', error);
      throw error; // Let the template selector handle the error display
    }
  };

  // Calculate unread messages
  const unreadMessages = messages.filter(msg =>
    !msg.is_sent_by_me && !msg.is_read
  );
  const firstUnreadIndex = messages.findIndex(msg =>
    !msg.is_sent_by_me && !msg.is_read
  );
  const hasUnreadMessages = unreadMessages.length > 0;

  // Auto-scroll to unread messages or bottom
  useEffect(() => {
    // Only scroll if we have messages
    if (messages.length === 0) return;

    // Small delay to ensure DOM is updated
    const scrollTimer = setTimeout(() => {
      if (hasUnreadMessages && firstUnreadIndex !== -1) {
        // Scroll to first unread message on initial load
        unreadIndicatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Scroll to bottom for new messages or when no unread messages
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);

    return () => clearTimeout(scrollTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]); // Only depend on messages.length to avoid unnecessary scrolls

  // Handle ESC key press within the chat window
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showMediaUpload) {
          setShowMediaUpload(false);
        } else if (showTemplateSelector) {
          setShowTemplateSelector(false);
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
  }, [selectedUser, isMobile, onBack, onClose, showMediaUpload, showTemplateSelector]);

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
    // Allow sending if either individual user or broadcast group is selected
    if (messageInput.trim() && (selectedUser || broadcastGroupName) && !isLoading) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };

  const handleSendMedia = async (mediaFiles: MediaFile[]) => {
    // Don't allow media upload in broadcast mode for now
    if ((!selectedUser && !broadcastGroupName) || sendingMedia) return;

    if (broadcastGroupName) {
      alert('Media upload to broadcast groups is not yet supported. Please send text messages only.');
      return;
    }

    // TypeScript safety check
    if (!selectedUser) return;

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

  const handleUpdateName = async (userId: string, customName: string) => {
    if (onUpdateName) {
      await onUpdateName(userId, customName);
    }
  };

  const getDisplayName = (user: ChatUser) => {
    return user.custom_name || user.whatsapp_name || user.name || user.id;
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
      // For S3 pre-signed URLs, we can download directly
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      link.style.display = 'none';

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('File downloaded successfully:', filename);
    } catch (error) {
      console.error('Error downloading media:', error);

      // Fallback: Open in new tab if direct download fails
      try {
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          throw new Error('Popup blocked');
        }
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert('Unable to download file. Please try again or contact support.');
      }
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

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Media URL refreshed successfully:', result);
        // Trigger a re-render by forcing the parent component to update
        // You might want to implement a proper message refresh mechanism here
        // For now, we'll let the component handle the updated state
      } else {
        console.error('Failed to refresh media URL:', result.error || result.message);
        // Show user-friendly error message only for non-404 errors
        if (response.status !== 404) {
          alert(`Failed to load media: ${result.error || 'Please try again later'}`);
        }
      }
    } catch (error) {
      console.error('Network error refreshing media URL:', error);
      // Only show network error alerts for repeated failures
      if (!window.mediaRefreshErrorCount) window.mediaRefreshErrorCount = {};
      window.mediaRefreshErrorCount[messageId] = (window.mediaRefreshErrorCount[messageId] || 0) + 1;

      if (window.mediaRefreshErrorCount[messageId] <= 2) {
        console.log('Retrying media refresh...');
      } else {
        alert('Network error: Unable to load media. Please check your connection.');
      }
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
        // Check if media_data is already an object or a string
        if (typeof message.media_data === 'string') {
          mediaData = JSON.parse(message.media_data);
        } else if (typeof message.media_data === 'object') {
          // Already an object, use it directly
          mediaData = message.media_data as unknown as MediaData;
        }
      } catch (error) {
        console.error('Error parsing media data:', error, 'Type:', typeof message.media_data);
      }
    }

    const baseClasses = `max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${isOwn
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
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-xl z-10">
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
                  onLoad={() => handleMediaLoad(message.id)}
                  onLoadStart={() => handleMediaLoadStart(message.id)}
                  onError={() => {
                    console.log('Image failed to load, attempting to refresh URL for message:', message.id);
                    handleMediaLoad(message.id);
                    // Only try to refresh if we haven't already tried
                    if (!refreshingUrls.has(message.id)) {
                      refreshMediaUrl(message.id);
                    }
                  }}
                  priority={false}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq19G9D/Z"
                  unoptimized={false}
                />
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl z-20">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 text-white animate-spin" />
                      <span className="text-xs text-white">Refreshing...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl mb-2">
                <ImageIcon className="h-8 w-8 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Image</p>
                  <p className="text-xs text-gray-500">
                    {mediaData?.s3_uploaded === false ? 'Preparing...' : 'Loading...'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-8 w-8"
                  onClick={() => refreshMediaUrl(message.id)}
                  disabled={isRefreshing}
                  title="Retry loading"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
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
                      className={`h-full transition-all duration-300 ${isOwn ? 'bg-green-300' : 'bg-blue-400'
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
                    console.log('Video failed to load, attempting to refresh URL for message:', message.id);
                    handleMediaLoad(message.id);
                    // Only try to refresh if we haven't already tried
                    if (!refreshingUrls.has(message.id)) {
                      refreshMediaUrl(message.id);
                    }
                  }}
                >
                  <source src={mediaData.media_url} type={mediaData.mime_type} />
                  Your browser does not support the video tag.
                </video>
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl z-20">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 text-white animate-spin" />
                      <span className="text-xs text-white">Refreshing...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl mb-2">
                <Play className="h-8 w-8 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Video</p>
                  <p className="text-xs text-gray-500">
                    {mediaData?.s3_uploaded === false ? 'Preparing...' : 'Loading...'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-8 w-8"
                  onClick={() => refreshMediaUrl(message.id)}
                  disabled={isRefreshing}
                  title="Retry loading"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
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

      case 'template':
        // Template message - display final rendered content cleanly
        return (
          <div className={baseClasses}>
            {/* Template Content - Clean Display */}
            <div className="space-y-3">
              {/* Header Component */}
              {mediaData?.header && (
                <div>
                  {mediaData.header.format === 'IMAGE' && mediaData.header.media_url ? (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <Image
                        src={mediaData.header.media_url}
                        alt="Template header image"
                        width={250}
                        height={150}
                        className="max-w-full h-auto object-cover rounded-lg"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                  ) : mediaData.header.format === 'VIDEO' && mediaData.header.media_url ? (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <video
                        controls
                        className="max-w-full h-auto rounded-lg"
                        preload="metadata"
                      >
                        <source src={mediaData.header.media_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : mediaData.header.format === 'DOCUMENT' && mediaData.header.media_url ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium">{mediaData.header.filename || 'Document'}</span>
                    </div>
                  ) : mediaData.header.text ? (
                    <div className="mb-3">
                      <p className="text-base font-semibold leading-relaxed">
                        {mediaData.header.text}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Body Component */}
              {mediaData?.body && (
                <div>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {mediaData.body.text || message.content}
                  </p>
                </div>
              )}

              {/* If no structured data, show the processed content */}
              {!mediaData?.body && !mediaData?.header && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                </p>
              )}

              {/* Footer Component */}
              {mediaData?.footer && (
                <div className="mt-2">
                  <p className="text-xs opacity-75 leading-relaxed">
                    {mediaData.footer.text}
                  </p>
                </div>
              )}

              {/* Buttons Component */}
              {mediaData?.buttons && mediaData.buttons.length > 0 && (
                <div className="mt-4">
                  <div className="space-y-2">
                    {mediaData.buttons.map((button: {
                      type: string;
                      text: string;
                      url?: string;
                      phone_number?: string;
                    }, index: number) => (
                      <div
                        key={index}
                        className={`
                          px-4 py-3 rounded-lg border border-opacity-30 border-current text-center font-medium
                          ${isOwn
                            ? 'bg-white bg-opacity-20 hover:bg-opacity-30'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }
                          cursor-pointer transition-colors
                        `}
                        onClick={() => {
                          if (button.type === 'URL' && button.url) {
                            window.open(button.url, '_blank');
                          } else if (button.type === 'PHONE_NUMBER' && button.phone_number) {
                            window.open(`tel:${button.phone_number}`, '_self');
                          }
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {button.type === 'URL' && (
                            <>
                              <span className="text-base">🔗</span>
                              <span className="text-sm">{button.text}</span>
                            </>
                          )}
                          {button.type === 'PHONE_NUMBER' && (
                            <>
                              <span className="text-base">📞</span>
                              <span className="text-sm">{button.text}</span>
                            </>
                          )}
                          {button.type === 'QUICK_REPLY' && (
                            <>
                              <span className="text-base">💬</span>
                              <span className="text-sm">{button.text}</span>
                            </>
                          )}
                          {!['URL', 'PHONE_NUMBER', 'QUICK_REPLY'].includes(button.type) && (
                            <span className="text-sm">{button.text}</span>
                          )}
                        </div>
                        {button.url && (
                          <div className="text-xs opacity-60 mt-2 truncate border-t border-opacity-20 border-current pt-2">
                            {button.url}
                          </div>
                        )}
                        {button.phone_number && (
                          <div className="text-xs opacity-60 mt-2 border-t border-opacity-20 border-current pt-2">
                            {button.phone_number}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <span className={`text-xs mt-3 block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      default:
        // Text message or fallback
        const isOptimistic = message.id.startsWith('optimistic_');

        return (
          <div className={`${baseClasses} ${isOptimistic ? 'opacity-70' : ''} transition-opacity duration-300`}>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
                {formatTime(message.timestamp)}
              </span>
              {isOptimistic && isOwn && (
                <span className="text-xs text-green-200 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-green-200 rounded-full animate-pulse"></span>
                  Sending...
                </span>
              )}
            </div>
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

  // Show welcome screen only if neither individual user nor broadcast group is selected
  if (!selectedUser && !broadcastGroupName) {
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
        {broadcastGroupName ? (
          <>
            {/* Broadcast Group Header */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-green-600 text-white font-semibold">
                <Users className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                {broadcastGroupName}
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                  Broadcast
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending broadcast...
                  </span>
                ) : (
                  'Send message to all group members'
                )}
              </p>
            </div>
          </>
        ) : selectedUser ? (
          <>
            {/* Individual Chat Header */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                {selectedUser.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className="flex-1 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => setShowUserInfo(true)}
              title="View contact info"
            >
              <h2 className="font-semibold text-foreground">{getDisplayName(selectedUser)}</h2>
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
          </>
        ) : null}
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
          // No messages - show appropriate placeholder
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            {broadcastGroupName ? (
              <>
                <Users className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Broadcast to {broadcastGroupName}</p>
                <p className="text-sm text-center max-w-md">
                  Messages sent here will be delivered to all members in this group individually.
                  Each member will receive the message as a personal message from you.
                </p>
              </>
            ) : (
              <>
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm text-center">
                  Start the conversation by sending a message below
                </p>
              </>
            )}
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
                  {dayMessages.map((message, index) => {
                    // Use is_sent_by_me field instead of comparing IDs to determine message ownership
                    const isOwn = message.is_sent_by_me;

                    // Debug logging to help identify the issue
                    if (!isOwn && message.content && !message.content.startsWith('[')) {
                      console.log('Message alignment check:', {
                        id: message.id,
                        is_sent_by_me: message.is_sent_by_me,
                        sender_id: message.sender_id,
                        receiver_id: message.receiver_id,
                        content: message.content.substring(0, 30)
                      });
                    }

                    const globalIndex = messages.findIndex(m => m.id === message.id);
                    const isFirstUnread = globalIndex === firstUnreadIndex;
                    const isNewMessage = index === dayMessages.length - 1 && dayMessages.length > 0;

                    return (
                      <div
                        key={message.id}
                        className={`${isNewMessage ? 'animate-fade-in-up' : ''}`}
                      >
                        {/* Unread messages indicator */}
                        {isFirstUnread && hasUnreadMessages && (
                          <div
                            ref={unreadIndicatorRef}
                            className="flex items-center justify-center my-4 animate-fade-in"
                          >
                            <div className="flex-1 h-px bg-red-500"></div>
                            <div className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-lg">
                              {unreadMessages.length} unread message{unreadMessages.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex-1 h-px bg-red-500"></div>
                          </div>
                        )}

                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {renderMessageContent(message, isOwn)}
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
        <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
          {/* Hide media button in broadcast mode, show template button */}
          {!broadcastGroupName && (
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
          )}
          {/* Template button available for both modes */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Send template"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={
              isLoading || sendingMedia
                ? "Sending..."
                : broadcastGroupName
                  ? "Type broadcast message..."
                  : "Type a message..."
            }
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

      {/* Media Upload Modal - Only in individual chat mode */}
      {selectedUser && (
        <MediaUpload
          isOpen={showMediaUpload}
          onClose={() => setShowMediaUpload(false)}
          onSend={handleSendMedia}
          selectedUser={selectedUser}
        />
      )}

      {/* Template Selector Modal - Works in both individual and broadcast mode */}
      {(selectedUser || broadcastGroupName) && (
        <TemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSendTemplate={handleSendTemplate}
          selectedUser={selectedUser || {
            id: 'broadcast',
            name: broadcastGroupName || 'Broadcast Group',
            last_active: new Date().toISOString()
          }}
        />
      )}

      {/* User Info Dialog - Only in individual chat mode */}
      {selectedUser && (
        <UserInfoDialog
          isOpen={showUserInfo}
          onClose={() => setShowUserInfo(false)}
          user={selectedUser}
          onUpdateName={handleUpdateName}
        />
      )}
    </div>
  );
} 