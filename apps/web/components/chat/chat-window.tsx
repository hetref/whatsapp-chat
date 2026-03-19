"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2, X, Download, FileText, Image as ImageIcon, Play, Pause, Volume2, Paperclip, MessageSquare, Users, AlertTriangle } from "lucide-react";
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
  phone_number: string;
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
  s3_owner_id?: string;
  upload_timestamp?: string;
  url_refreshed_at?: string;
  template_name?: string;
  language?: string;
  header?: {
    format: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    media_url?: string;
    text?: string;
    filename?: string;
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
  /** When set, file is already on S3 — skip re-upload */
  s3Key?: string;
  s3MimeType?: string;
  s3FileSize?: number;
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
  messagingDisabled?: boolean;
  messagingDisabledReason?: string | null;
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
  broadcastGroupName,
  messagingDisabled = false,
  messagingDisabledReason = null,
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [processingMedia, setProcessingMedia] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<{ [key: string]: string }>({});
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

  // SessionStorage helpers for caching presigned URLs
  const MEDIA_CACHE_PREFIX = 'media_url_';
  const PRESIGNED_URL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  const getCachedMediaUrl = useCallback((messageId: string): string | null => {
    try {
      const cached = sessionStorage.getItem(`${MEDIA_CACHE_PREFIX}${messageId}`);
      if (!cached) return null;
      const parsed: { url: string; expiresAt: number } = JSON.parse(cached);
      if (Date.now() < parsed.expiresAt) {
        return parsed.url;
      }
      // Expired - remove from cache
      sessionStorage.removeItem(`${MEDIA_CACHE_PREFIX}${messageId}`);
      return null;
    } catch {
      return null;
    }
  }, []);

  const setCachedMediaUrl = useCallback((messageId: string, url: string) => {
    try {
      const entry = {
        url,
        expiresAt: Date.now() + PRESIGNED_URL_DURATION_MS,
      };
      sessionStorage.setItem(`${MEDIA_CACHE_PREFIX}${messageId}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Error caching media URL:', error);
    }
  }, []);

  const isCachedUrlExpired = useCallback((messageId: string): boolean => {
    try {
      const cached = sessionStorage.getItem(`${MEDIA_CACHE_PREFIX}${messageId}`);
      if (!cached) return false; // No cache = not expired, just not processed
      const parsed: { url: string; expiresAt: number } = JSON.parse(cached);
      return Date.now() >= parsed.expiresAt;
    } catch {
      return false;
    }
  }, []);

  // Handle template message sending
  const handleSendTemplate = async (templateName: string, templateData: WhatsAppTemplate, variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }, mediaUrl?: string) => {
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
        mediaUrl,
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
          to: selectedUser.phone_number,
          templateName,
          templateData,
          variables,
          mediaUrl,
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

  // Load cached media URLs from sessionStorage when messages change
  useEffect(() => {
    if (messages.length === 0) return;

    const cachedUrls: { [key: string]: string } = {};
    messages.forEach(message => {
      if (message.message_type && ['image', 'video', 'audio', 'document'].includes(message.message_type)) {
        const cachedUrl = getCachedMediaUrl(message.id);
        if (cachedUrl) {
          cachedUrls[message.id] = cachedUrl;
        }
      }
    });

    if (Object.keys(cachedUrls).length > 0) {
      setMediaUrls(prev => ({ ...prev, ...cachedUrls }));
    }
  }, [messages, getCachedMediaUrl]);
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
      // Separate files that are already on S3 (from library) vs new uploads
      const libraryFiles = mediaFiles.filter(mf => mf.s3Key);
      const newFiles = mediaFiles.filter(mf => !mf.s3Key);

      // Handle library files — already on S3, send directly
      if (libraryFiles.length > 0) {
        const s3Files = libraryFiles.map(mf => ({
          s3Key: mf.s3Key!,
          mediaId: mf.id,
          fileName: mf.file.name,
          mimeType: mf.s3MimeType || mf.file.type,
          fileSize: mf.s3FileSize || mf.file.size,
          caption: mf.caption || '',
        }));

        const response = await fetch('/api/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedUser.phone_number,
            files: s3Files,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send media');
        }

        if (result.failureCount > 0) {
          alert(`Failed to send ${result.failureCount} files. Please try again.`);
        }
      }

      // Handle new uploads — save to media library first, then send
      if (newFiles.length > 0) {
        // Step 1: Get presigned upload URLs from media library API (creates DB records)
        const mediaRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: newFiles.map(mf => ({
              fileName: mf.file.name,
              fileSize: mf.file.size,
              mimeType: mf.file.type,
            })),
          }),
        });

        const mediaData = await mediaRes.json();
        if (!mediaRes.ok) {
          throw new Error(mediaData.error || 'Failed to prepare upload');
        }

        // Step 2: Upload each file directly to S3 via presigned PUT URL
        const s3Files = [];
        const uploadedIds: string[] = [];
        for (let i = 0; i < newFiles.length; i++) {
          const mf = newFiles[i];
          const upload = mediaData.uploads[i];

          const uploadRes = await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mf.file.type },
            body: mf.file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${mf.file.name} to storage`);
          }

          uploadedIds.push(upload.id);
          s3Files.push({
            s3Key: upload.s3Key,
            mediaId: upload.mediaId,
            fileName: mf.file.name,
            mimeType: mf.file.type,
            fileSize: mf.file.size,
            caption: mf.caption || '',
          });
        }

        // Step 3: Confirm storage usage
        if (uploadedIds.length > 0) {
          await fetch('/api/media/confirm-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: uploadedIds }),
          });
          alert(`Media saved to your library successfully!`);
        }

        // Step 4: Send message via server with S3 references
        const response = await fetch('/api/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedUser.phone_number,
            files: s3Files,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send media');
        }

        if (result.failureCount > 0) {
          alert(`Failed to send ${result.failureCount} files. Please try again.`);
        }
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
    return user.custom_name || user.whatsapp_name || user.name || user.phone_number;
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

    // Use cached URL
    const currentAudioUrl = mediaUrls[messageId] || audioUrl;

    // Toggle play/pause for the clicked audio
    const audio = audioRefs.current[messageId];
    if (audio) {
      if (playingAudio === messageId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        if (audio.src !== currentAudioUrl) {
          audio.src = currentAudioUrl;
        }
        audio.play().catch((error) => {
          console.error('Error playing audio:', error);
        });
        setPlayingAudio(messageId);
      }
    } else {
      // Create new audio element
      const newAudio = new Audio(currentAudioUrl);

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
        console.error('Error playing audio for message:', messageId);
        setPlayingAudio(null);
      };

      audioRefs.current[messageId] = newAudio;
      newAudio.play().catch((error) => {
        console.error('Error starting audio playback:', error);
      });
      setPlayingAudio(messageId);
    }
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading media:', error);
      // Fallback: open in new tab
      try {
        window.open(url, '_blank');
      } catch {
        alert('Unable to download file. The URL may have expired. Please refresh the media and try again.');
      }
    }
  };

  const processMediaUrl = async (messageId: string) => {
    if (processingMedia.has(messageId)) return;

    setProcessingMedia(prev => new Set(prev).add(messageId));

    try {
      const response = await fetch('/api/media/refresh-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.mediaUrl) {
        // Store in state
        setMediaUrls(prev => ({ ...prev, [messageId]: result.mediaUrl }));
        // Cache in sessionStorage
        setCachedMediaUrl(messageId, result.mediaUrl);
      } else {
        const serverMessage = result?.error || result?.message || `Request failed (${response.status})`;
        console.error('Failed to generate media URL:', serverMessage);
        alert(`Failed to process media: ${serverMessage}`);
      }
    } catch (error) {
      console.error('Error processing media URL:', error);
      alert('Network error. Please try again.');
    } finally {
      setProcessingMedia(prev => {
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

    const isProcessing = processingMedia.has(message.id);

    switch (messageType) {
      case 'image':
        const currentImageUrl = mediaUrls[message.id];
        const hasImageUrl = !!currentImageUrl;

        return (
          <div className={baseClasses}>
            {hasImageUrl ? (
              <div className="mb-2 relative overflow-hidden rounded-xl">
                <Image
                  key={`${message.id}-${currentImageUrl}`}
                  src={currentImageUrl}
                  alt={mediaData?.caption || "Shared image"}
                  width={300}
                  height={200}
                  className="max-w-[300px] max-h-[400px] w-auto h-auto object-cover cursor-pointer rounded-xl"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  onClick={() => window.open(currentImageUrl, '_blank')}
                  onError={() => {
                    // URL likely expired - clear from state and cache
                    setMediaUrls(prev => {
                      const updated = { ...prev };
                      delete updated[message.id];
                      return updated;
                    });
                    sessionStorage.removeItem(`${MEDIA_CACHE_PREFIX}${message.id}`);
                  }}
                  priority={false}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq19G9D/Z"
                  unoptimized={true}
                />
              </div>
            ) : mediaData?.s3_uploaded ? (
              <button
                onClick={() => processMediaUrl(message.id)}
                disabled={isProcessing}
                className={`w-full rounded-xl mb-2 transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-750'}`}
              >
                <div className="flex flex-col items-center justify-center gap-3 py-10 px-8">
                  <div className={`p-4 rounded-full transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-white/[0.08]' : 'bg-gray-100 dark:bg-gray-700/60'}`}>
                    {isProcessing
                      ? <Loader2 className={`h-6 w-6 animate-spin ${isOwn ? 'text-white/50' : 'text-gray-400'}`} />
                      : <ImageIcon className={`h-6 w-6 ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`} />
                    }
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className={`text-[13px] font-medium ${isOwn ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>Photo</p>
                    <p className={`text-[11px] ${isOwn ? 'text-white/40' : 'text-gray-400 dark:text-gray-500'}`}>
                      {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 px-8 bg-gray-50 dark:bg-gray-800/80 rounded-xl mb-2">
                <div className={`p-4 rounded-full ${isOwn ? 'bg-white/[0.08]' : 'bg-gray-100 dark:bg-gray-700/60'}`}>
                  <ImageIcon className={`h-6 w-6 ${isOwn ? 'text-white/60' : 'text-gray-300 dark:text-gray-600'}`} />
                </div>
                <p className={`text-[11px] ${isOwn ? 'text-white/30' : 'text-gray-300 dark:text-gray-600'}`}>Upload pending</p>
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
        const currentDocUrl = mediaUrls[message.id];
        const hasDocUrl = !!currentDocUrl;

        return (
          <div className={baseClasses}>
            {hasDocUrl ? (
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
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-2 h-10 w-10 ${isOwn ? 'hover:bg-green-600' : 'hover:bg-gray-200'}`}
                  onClick={() => downloadMedia(currentDocUrl, mediaData?.filename || 'document')}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ) : mediaData?.s3_uploaded ? (
              <button
                onClick={() => processMediaUrl(message.id)}
                disabled={isProcessing}
                className={`flex items-center gap-4 p-3 rounded-xl mb-2 min-w-[280px] max-w-[400px] w-full transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-750'}`}
              >
                <div className={`p-3 rounded-full shrink-0 transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-green-600' : 'bg-blue-500'}`}>
                  {isProcessing
                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                    : <FileText className="h-6 w-6 text-white" />
                  }
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white/90' : 'text-gray-800 dark:text-gray-200'}`}>
                    {mediaData?.filename || 'Document'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'}`}>
                    {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                  </p>
                </div>
                {!isProcessing && (
                  <Download className={`h-4 w-4 shrink-0 ${isOwn ? 'text-white/40' : 'text-gray-400'}`} />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 min-w-[280px] max-w-[400px]">
                <div className={`p-3 rounded-full ${isOwn ? 'bg-green-600/50' : 'bg-blue-500/50'}`}>
                  <FileText className="h-6 w-6 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">
                    {mediaData?.filename || 'Document'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/30' : 'text-gray-300 dark:text-gray-600'}`}>Upload pending</p>
                </div>
              </div>
            )}
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'audio':
        const duration = audioDurations[message.id] || 0;
        const currentTime = audioCurrentTime[message.id] || 0;
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        const currentAudioUrl = mediaUrls[message.id];
        const hasAudioUrl = !!currentAudioUrl;

        return (
          <div className={baseClasses}>
            {hasAudioUrl ? (
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 min-w-[300px] max-w-[400px]">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-3 rounded-full ${isOwn ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                  onClick={() => handleAudioPlay(message.id, currentAudioUrl)}
                >
                  {playingAudio === message.id ? (
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
                  </div>
                  <div className="relative">
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isOwn ? 'bg-green-300' : 'bg-blue-400'}`}
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
                </div>
              </div>
            ) : mediaData?.s3_uploaded ? (
              <button
                onClick={() => processMediaUrl(message.id)}
                disabled={isProcessing}
                className={`flex items-center gap-4 p-4 rounded-xl mb-2 min-w-[300px] max-w-[400px] w-full transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-750'}`}
              >
                <div className={`p-3 rounded-full shrink-0 transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-green-600' : 'bg-blue-500'}`}>
                  {isProcessing
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Play className="h-5 w-5 text-white" />
                  }
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {mediaData?.voice ? 'Voice Message' : 'Audio'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isOwn ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'}`}>
                    {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 min-w-[300px] max-w-[400px]">
                <div className={`p-3 rounded-full ${isOwn ? 'bg-green-600/50' : 'bg-blue-500/50'}`}>
                  <Volume2 className="h-5 w-5 text-white/70" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                      {mediaData?.voice ? 'Voice Message' : 'Audio'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/30' : 'text-gray-300 dark:text-gray-600'}`}>Upload pending</p>
                </div>
              </div>
            )}
            <span className={`text-xs block ${isOwn ? 'text-green-100' : 'text-muted-foreground'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        );

      case 'video':
        const currentVideoUrl = mediaUrls[message.id];
        const hasVideoUrl = !!currentVideoUrl;

        return (
          <div className={baseClasses}>
            {hasVideoUrl ? (
              <div className="mb-2 relative overflow-hidden rounded-xl max-w-[400px] max-h-[300px]">
                <video
                  key={`${message.id}-${currentVideoUrl}`}
                  controls
                  className="max-w-[400px] max-h-[300px] w-auto h-auto rounded-xl"
                  preload="metadata"
                  onError={() => {
                    // URL likely expired - clear from state and cache
                    setMediaUrls(prev => {
                      const updated = { ...prev };
                      delete updated[message.id];
                      return updated;
                    });
                    sessionStorage.removeItem(`${MEDIA_CACHE_PREFIX}${message.id}`);
                  }}
                >
                  <source src={currentVideoUrl} type={mediaData?.mime_type || 'video/mp4'} />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : mediaData?.s3_uploaded ? (
              <button
                onClick={() => processMediaUrl(message.id)}
                disabled={isProcessing}
                className={`w-full rounded-xl mb-2 transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-750'}`}
              >
                <div className="flex flex-col items-center justify-center gap-3 py-10 px-8">
                  <div className={`p-4 rounded-full transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-white/[0.08]' : 'bg-gray-100 dark:bg-gray-700/60'}`}>
                    {isProcessing
                      ? <Loader2 className={`h-6 w-6 animate-spin ${isOwn ? 'text-white/50' : 'text-gray-400'}`} />
                      : <Play className={`h-6 w-6 ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`} />
                    }
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className={`text-[13px] font-medium ${isOwn ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>Video</p>
                    <p className={`text-[11px] ${isOwn ? 'text-white/40' : 'text-gray-400 dark:text-gray-500'}`}>
                      {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 px-8 bg-gray-50 dark:bg-gray-800/80 rounded-xl mb-2">
                <div className={`p-4 rounded-full ${isOwn ? 'bg-white/[0.08]' : 'bg-gray-100 dark:bg-gray-700/60'}`}>
                  <Play className={`h-6 w-6 ${isOwn ? 'text-white/60' : 'text-gray-300 dark:text-gray-600'}`} />
                </div>
                <p className={`text-[11px] ${isOwn ? 'text-white/30' : 'text-gray-300 dark:text-gray-600'}`}>Upload pending</p>
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
                    // if (!isOwn && message.content && !message.content.startsWith('[')) {
                    //   console.log('Message alignment check:', {
                    //     id: message.id,
                    //     is_sent_by_me: message.is_sent_by_me,
                    //     sender_id: message.sender_id,
                    //     receiver_id: message.receiver_id,
                    //     content: message.content.substring(0, 30)
                    //   });
                    // }

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
        {messagingDisabled ? (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Messaging unavailable</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{messagingDisabledReason || 'Your subscription does not allow sending messages.'}</p>
            </div>
            <a href="/protected/billing" className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline flex-shrink-0">
              Manage Plan
            </a>
          </div>
        ) : (
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
        )}
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