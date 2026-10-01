"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Loader2, X, Download, FileText, Image as ImageIcon, Play, Pause, Volume2, Paperclip, MessageSquare, Users, AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import LogoIcon from "@/components/logo-icon";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { MediaUpload } from "./media-upload";
import { UserInfoDialog } from "./user-info-dialog";
import { TemplateSelector } from "./template-selector";
import { MessageStatusIcon } from "./message-status-icon";
import { BroadcastInfoDialog, BroadcastRecipient, BroadcastStats } from "./broadcast-info-dialog";
import { EmojiReactionPicker } from "./emoji-reaction-picker";

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
  delivered_at?: string | null;
  status?: string | null;
  error_message?: string | null;
  isOptimistic?: boolean; // Flag for optimistic messages
  reactions?: ReactionEntry[] | null;
  broadcast_stats?: BroadcastStats | null;
  recipients?: BroadcastRecipient[] | null;
}

interface ReactionEntry {
  emoji: string;
  from: string;
  timestamp: string;
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
    format: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | string;
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
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY' | string;
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
  onReactToMessage?: (messageId: string, emoji: string) => void;
  currentUserId: string;
  onBack?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  isLoading?: boolean;
  onUpdateName?: (userId: string, customName: string) => Promise<void>;
  broadcastGroupName?: string | null;
  messagingDisabled?: boolean;
  messagingDisabledReason?: string | null;
  whatsappAccessToken?: string | null;
}

export function ChatWindow({
  selectedUser,
  messages,
  onSendMessage,
  onReactToMessage,
  currentUserId,
  onBack,
  onClose,
  isMobile = false,
  isLoading = false,
  onUpdateName,
  broadcastGroupName,
  messagingDisabled = false,
  messagingDisabledReason = null,
  whatsappAccessToken,
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
  const [activeWhatsappToken, setActiveWhatsappToken] = useState<string | null>(whatsappAccessToken || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (whatsappAccessToken) {
      setActiveWhatsappToken(whatsappAccessToken);
      return;
    }

    const fetchTokenFromSettings = async () => {
      try {
        const response = await fetch('/api/settings/save');
        if (response.ok) {
          const data = await response.json();
          const token = data?.settings?.access_token || null;
          setActiveWhatsappToken(token);
        }
      } catch (err) {
        console.error('[ChatWindow] Error fetching connected WhatsApp account settings:', err);
      }
    };

    fetchTokenFromSettings();
  }, [whatsappAccessToken]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const unreadIndicatorRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // State for broadcast seen info dialog
  const [selectedBroadcastMessage, setSelectedBroadcastMessage] = useState<Message | null>(null);
  const [showBroadcastInfo, setShowBroadcastInfo] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);

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

  const getReactionSummary = useCallback((raw?: ReactionEntry[] | null | string) => {
    const reactions = normalizeReactions(raw);
    const counts = reactions.reduce((acc: Record<string, { emoji: string; count: number; senders: string[] }>, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, senders: [] };
      }
      acc[reaction.emoji].count += 1;
      acc[reaction.emoji].senders.push(reaction.from);
      return acc;
    }, {});

    return Object.values(counts);
  }, [normalizeReactions]);

  const getUserReaction = useCallback((raw?: ReactionEntry[] | null | string) => {
    const reactions = normalizeReactions(raw);
    return reactions.find((reaction) => reaction.from === currentUserId) || null;
  }, [currentUserId, normalizeReactions]);

  const handleReactionClick = useCallback((message: Message, emoji: string) => {
    if (!onReactToMessage || message.isOptimistic || broadcastGroupName) return;
    const currentReaction = getUserReaction(message.reactions);
    const nextEmoji = currentReaction?.emoji === emoji ? '' : emoji;
    onReactToMessage(message.id, nextEmoji);
    setEmojiPickerMessageId(null);
  }, [broadcastGroupName, getUserReaction, onReactToMessage]);

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
    // Resolve the token used to send the WhatsApp template messages for connected WhatsApp account on setup page
    let tokenUsed = activeWhatsappToken || whatsappAccessToken;
    if (!tokenUsed) {
      try {
        const res = await fetch('/api/settings/save');
        if (res.ok) {
          const data = await res.json();
          tokenUsed = data?.settings?.access_token || null;
          if (tokenUsed) {
            setActiveWhatsappToken(tokenUsed);
          }
        }
      } catch (err) {
        console.error('[ChatWindow] Failed to load WhatsApp token from setup before sending template:', err);
      }
    }

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

    const recipientPhone =
      selectedUser.phone_number ||
      (selectedUser as unknown as { phoneNumber?: string }).phoneNumber ||
      (selectedUser as unknown as { phone?: string }).phone;

    try {
      const response = await fetch('/api/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientPhone,
          contactId: selectedUser.id,
          contactName: selectedUser.custom_name || selectedUser.whatsapp_name || selectedUser.name,
          templateName,
          templateData,
          variables,
          mediaUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg =
          result.error ||
          result.message ||
          result.details?.error_data?.details ||
          result.details?.error_user_msg ||
          result.details?.message ||
          'Failed to send template';
        console.error('[ChatWindow] Meta WhatsApp send-template failed:', errorMsg);
        throw new Error(errorMsg);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('whatsapp:message-sent', { detail: result }));
      }
    } catch (error) {
      console.error('[ChatWindow] Error sending template:', error);
      throw error; // Let the template selector handle the error display
    }
  };

  // Load cached media URLs from sessionStorage when messages change
  useEffect(() => {
    if (messages.length === 0) return;

    const cachedUrls: { [key: string]: string } = {};
    const mediaToLoad: string[] = [];

    messages.forEach(message => {
      if (message.message_type && ['image', 'video', 'audio', 'document'].includes(message.message_type)) {
        const cachedUrl = getCachedMediaUrl(message.id);
        if (cachedUrl) {
          cachedUrls[message.id] = cachedUrl;
        } else if (!mediaUrls[message.id]) {
          mediaToLoad.push(message.id);
        }
      }
    });

    if (Object.keys(cachedUrls).length > 0) {
      setMediaUrls(prev => ({ ...prev, ...cachedUrls }));
    }

    // Auto-fetch presigned URLs for recent uncached media files (up to 8)
    if (mediaToLoad.length > 0) {
      const recent = mediaToLoad.slice(-8);
      recent.forEach(id => {
        processMediaUrl(id);
      });
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

        const recipientPhone =
          selectedUser.phone_number ||
          (selectedUser as unknown as { phoneNumber?: string }).phoneNumber ||
          (selectedUser as unknown as { phone?: string }).phone;

        const response = await fetch('/api/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone,
            contactId: selectedUser.id,
            files: s3Files,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send media');
        }

        if (result.failureCount > 0) {
          const firstErr = result.results?.find((r: { success: boolean; error?: string }) => !r.success)?.error;
          alert(firstErr || `Failed to send ${result.failureCount} file(s). Please try again.`);
        }

        // Cache any returned media URLs and pre-load into state immediately
        if (result.results && Array.isArray(result.results)) {
          for (const item of result.results) {
            if (item.success && item.messageId && item.mediaUrl) {
              setMediaUrls(prev => ({ ...prev, [item.messageId]: item.mediaUrl }));
              setCachedMediaUrl(item.messageId, item.mediaUrl);
            }
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('whatsapp:message-sent', { detail: result }));
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

        // Step 3: Confirm storage usage without intrusive popups
        if (uploadedIds.length > 0) {
          await fetch('/api/media/confirm-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: uploadedIds }),
          });
        }

        // Step 4: Send message via server with S3 references
        const recipientPhone =
          selectedUser.phone_number ||
          (selectedUser as unknown as { phoneNumber?: string }).phoneNumber ||
          (selectedUser as unknown as { phone?: string }).phone;

        const response = await fetch('/api/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone,
            contactId: selectedUser.id,
            files: s3Files,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send media');
        }

        if (result.failureCount > 0) {
          const firstErr = result.results?.find((r: { success: boolean; error?: string }) => !r.success)?.error;
          alert(firstErr || `Failed to send ${result.failureCount} file(s). Please try again.`);
        }

        // Cache any returned media URLs and pre-load into state immediately
        if (result.results && Array.isArray(result.results)) {
          for (const item of result.results) {
            if (item.success && item.messageId && item.mediaUrl) {
              setMediaUrls(prev => ({ ...prev, [item.messageId]: item.mediaUrl }));
              setCachedMediaUrl(item.messageId, item.mediaUrl);
            }
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('whatsapp:message-sent', { detail: result }));
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
      }
    } catch (error) {
      console.error('Error processing media URL:', error);
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

    const baseClasses = `w-fit max-w-full px-4 py-3 rounded-2xl shadow-2xs transition-all ${isOwn
      ? 'bg-[#2D583F] dark:bg-[#1E3E2B] text-white rounded-tr-xs border border-[#2D583F]/30 ml-auto'
      : 'bg-white dark:bg-[#18201B] text-stone-900 dark:text-stone-100 rounded-tl-xs border border-stone-200/80 dark:border-stone-800/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] mr-auto'
      }`;

    const isProcessing = processingMedia.has(message.id);

    const renderStatusFooter = () => {
      const isBroadcast = Boolean(broadcastGroupName || message.broadcast_stats);
      return (
        <div className={`flex items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'} mt-1.5`}>
          <span className={`text-[11px] leading-none select-none font-mono ${isOwn ? 'text-white/70' : 'text-stone-500 dark:text-stone-400'}`}>
            {formatTime(message.timestamp)}
          </span>
          {isOwn && (
            <MessageStatusIcon
              status={message.status}
              isOptimistic={message.isOptimistic || message.id.startsWith('optimistic_')}
              isBroadcast={isBroadcast}
              broadcastStats={message.broadcast_stats}
              timestamp={message.timestamp}
              readAt={message.read_at}
              deliveredAt={message.delivered_at}
              errorMessage={message.error_message}
              isOwn={isOwn}
              onClick={() => {
                if (isBroadcast) {
                  setSelectedBroadcastMessage(message);
                  setShowBroadcastInfo(true);
                }
              }}
            />
          )}
        </div>
      );
    };

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
            {renderStatusFooter()}
          </div>
        );

      case 'document':
        const currentDocUrl = mediaUrls[message.id];
        const hasDocUrl = !!currentDocUrl;

        return (
          <div className={baseClasses}>
            {hasDocUrl ? (
              <div className={`flex items-center gap-4 p-3 rounded-xl mb-2 min-w-[280px] max-w-[400px] ${isOwn ? 'bg-black/15 border border-white/10' : 'bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800'}`}>
                <div className={`p-3 rounded-xl shrink-0 ${isOwn ? 'bg-black/25 text-white' : 'bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95]'}`}>
                  <FileText className="h-6 w-6 text-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white' : 'text-stone-900 dark:text-stone-100'}`}>
                    {mediaData?.filename || 'Document'}
                  </p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-stone-500 dark:text-stone-400'}`}>
                    {mediaData?.mime_type}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-2 h-10 w-10 rounded-xl ${isOwn ? 'hover:bg-white/15 text-white' : 'hover:bg-stone-200/70 dark:hover:bg-stone-700/70 text-stone-700 dark:text-stone-300'}`}
                  onClick={() => downloadMedia(currentDocUrl, mediaData?.filename || 'document')}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ) : mediaData?.s3_uploaded ? (
              <button
                onClick={() => processMediaUrl(message.id)}
                disabled={isProcessing}
                className={`flex items-center gap-4 p-3 rounded-xl mb-2 min-w-[280px] max-w-[400px] w-full transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-750'}`}
              >
                <div className={`p-3 rounded-xl shrink-0 transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-black/25 text-white' : 'bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95]'}`}>
                  {isProcessing
                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                    : <FileText className="h-6 w-6 text-current" />
                  }
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white/90' : 'text-stone-800 dark:text-stone-200'}`}>
                    {mediaData?.filename || 'Document'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/50' : 'text-stone-400 dark:text-stone-500'}`}>
                    {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                  </p>
                </div>
                {!isProcessing && (
                  <Download className={`h-4 w-4 shrink-0 ${isOwn ? 'text-white/40' : 'text-stone-400'}`} />
                )}
              </button>
            ) : (
              <div className={`flex items-center gap-4 p-3 rounded-xl mb-2 min-w-[280px] max-w-[400px] ${isOwn ? 'bg-black/15 border border-white/10' : 'bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800'}`}>
                <div className={`p-3 rounded-xl ${isOwn ? 'bg-black/20 text-white/70' : 'bg-[#5F7C65]/10 text-[#2D583F]/70 dark:text-[#8EAE95]/70'}`}>
                  <FileText className="h-6 w-6 text-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white' : 'text-stone-900 dark:text-stone-100'}`}>
                    {mediaData?.filename || 'Document'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/30' : 'text-stone-400 dark:text-stone-600'}`}>Upload pending</p>
                </div>
              </div>
            )}
            {renderStatusFooter()}
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
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-2 min-w-[300px] max-w-[400px] ${isOwn ? 'bg-black/15 border border-white/10' : 'bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800'}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-3 rounded-full ${isOwn ? 'bg-black/25 hover:bg-black/35 text-white' : 'bg-[#5F7C65] hover:bg-[#526D57] text-white'}`}
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
                    <Volume2 className={`h-4 w-4 ${isOwn ? 'text-white/80' : 'text-stone-600 dark:text-stone-400'}`} />
                    <span className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-stone-800 dark:text-stone-200'}`}>
                      {mediaData?.voice ? 'Voice Message' : 'Audio'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className={`h-2 rounded-full overflow-hidden ${isOwn ? 'bg-white/20' : 'bg-stone-200 dark:bg-stone-700'}`}>
                      <div
                        className={`h-full transition-all duration-300 ${isOwn ? 'bg-[#8EAE95]' : 'bg-[#5F7C65]'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs font-mono ${isOwn ? 'text-white/60' : 'text-stone-500'}`}>
                        {formatAudioDuration(currentTime)}
                      </span>
                      <span className={`text-xs font-mono ${isOwn ? 'text-white/60' : 'text-stone-500'}`}>
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
                className={`flex items-center gap-4 p-4 rounded-xl mb-2 min-w-[300px] max-w-[400px] w-full transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isOwn ? 'bg-white/[0.08] hover:bg-white/[0.14]' : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-750'}`}
              >
                <div className={`p-3 rounded-full shrink-0 transition-transform duration-300 ${isProcessing ? 'animate-pulse' : ''} ${isOwn ? 'bg-black/25 text-white' : 'bg-[#5F7C65] text-white'}`}>
                  {isProcessing
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Play className="h-5 w-5 text-white" />
                  }
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <Volume2 className={`h-4 w-4 ${isOwn ? 'text-white/80' : 'text-stone-600 dark:text-stone-400'}`} />
                    <span className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}>
                      {mediaData?.voice ? 'Voice Message' : 'Audio'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isOwn ? 'text-white/50' : 'text-stone-400 dark:text-stone-500'}`}>
                    {isProcessing ? 'Loading...' : isCachedUrlExpired(message.id) ? 'Tap to refresh' : 'Tap to load'}
                  </p>
                </div>
              </button>
            ) : (
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-2 min-w-[300px] max-w-[400px] ${isOwn ? 'bg-black/15 border border-white/10' : 'bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800'}`}>
                <div className={`p-3 rounded-full ${isOwn ? 'bg-black/20 text-white/70' : 'bg-[#5F7C65]/10 text-[#2D583F]/70'}`}>
                  <Volume2 className="h-5 w-5 text-current" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className={`h-4 w-4 ${isOwn ? 'text-white/40' : 'text-stone-400'}`} />
                    <span className={`text-sm font-medium ${isOwn ? 'text-white/50' : 'text-stone-400 dark:text-stone-500'}`}>
                      {mediaData?.voice ? 'Voice Message' : 'Audio'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/30' : 'text-stone-300 dark:text-stone-600'}`}>Upload pending</p>
                </div>
              </div>
            )}
            {renderStatusFooter()}
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
            {renderStatusFooter()}
          </div>
        );

      case 'template':
        // Template message - display final rendered content cleanly
        return (
          <div className={`${baseClasses} select-text w-full`}>
            {/* Template Content - Clean Display */}
            <div className="space-y-2.5">
              {/* Header Component */}
              {mediaData?.header && (
                <div>
                  {mediaData.header.format === 'IMAGE' && (mediaData.header.media_url || mediaUrls[message.id]) ? (
                    <div className="mb-2.5 rounded-xl overflow-hidden shadow-sm">
                      <Image
                        src={mediaData.header.media_url || mediaUrls[message.id]}
                        alt="Template header image"
                        width={400}
                        height={240}
                        className="max-w-full h-auto object-cover rounded-xl"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                  ) : mediaData.header.format === 'VIDEO' && (mediaData.header.media_url || mediaUrls[message.id]) ? (
                    <div className="mb-2.5 rounded-xl overflow-hidden shadow-sm">
                      <video
                        controls
                        className="max-w-full h-auto rounded-xl"
                        preload="metadata"
                      >
                        <source src={mediaData.header.media_url || mediaUrls[message.id]} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : mediaData.header.format === 'DOCUMENT' ? (
                    <div className="flex items-center gap-3 p-3 bg-black/10 dark:bg-white/10 rounded-xl mb-2.5">
                      <FileText className="h-5 w-5 opacity-80 shrink-0" />
                      <span className="text-sm font-medium truncate">{mediaData.header.filename || 'Document'}</span>
                    </div>
                  ) : mediaData.header.text ? (
                    <div className="mb-2">
                      <p className="text-base font-bold leading-snug">
                        {mediaData.header.text}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Body Component */}
              <div>
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-normal">
                  {mediaData?.body?.text || message.content}
                </p>
              </div>

              {/* Footer Component */}
              {mediaData?.footer?.text && (
                <div className="pt-1">
                  <p className="text-[11px] opacity-75 leading-tight">
                    {mediaData.footer.text}
                  </p>
                </div>
              )}

              {/* Buttons Component */}
              {mediaData?.buttons && mediaData.buttons.length > 0 && (
                <div className="mt-3 pt-2 border-t border-current/15 space-y-1.5">
                  {mediaData.buttons.map((button: {
                    type: string;
                    text: string;
                    url?: string;
                    phone_number?: string;
                  }, index: number) => {
                    const isUrl = button.type === 'URL';
                    const isPhone = button.type === 'PHONE_NUMBER';
                    return (
                      <div
                        key={index}
                        className={`
                          w-full px-3.5 py-2 rounded-xl text-center font-medium text-xs sm:text-sm
                          flex items-center justify-center gap-2 transition-all cursor-pointer select-none
                          ${isOwn
                            ? 'bg-black/20 hover:bg-black/30 text-white border border-white/10 active:bg-black/40'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-stone-800/80 dark:hover:bg-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-800'
                          }
                        `}
                        onClick={() => {
                          if (isUrl && button.url) {
                            window.open(button.url, '_blank');
                          } else if (isPhone && button.phone_number) {
                            window.open(`tel:${button.phone_number}`, '_self');
                          }
                        }}
                      >
                        {isUrl && <span>🔗</span>}
                        {isPhone && <span>📞</span>}
                        {!isUrl && !isPhone && <span>💬</span>}
                        <span>{button.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timestamp & Status */}
            {renderStatusFooter()}
          </div>
        );

      default:
        // Text message or fallback
        const isOptimistic = message.id.startsWith('optimistic_');
        const isButtonReply = message.content?.trim() === '[button]' || message.content?.trim().startsWith('[button]');

        return (
          <div className={`${baseClasses} ${isOptimistic ? 'opacity-70' : ''} transition-opacity duration-300`}>
            {isButtonReply ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-current opacity-60"></span>
                <span className="text-sm italic opacity-90">Quick Reply Response</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            )}
            {renderStatusFooter()}
          </div>
        );
    }
  };

  // Group messages by date (filtering out any phantom reaction messages)
  const groupedMessages = messages
    .filter((m) => m.message_type !== 'reaction' && m.content !== '[reaction]')
    .reduce((groups: { [key: string]: Message[] }, message) => {
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
      <div className="h-full flex flex-col items-center justify-center p-6 sm:p-10 bg-[#FAF8F5]/60 dark:bg-[#0C0F0D] relative overflow-hidden select-none">
        {/* Ambient botanical background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[320px] bg-[#5F7C65]/8 dark:bg-[#5F7C65]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Doppelrand Center Card Container */}
        <div className="relative max-w-lg w-full rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/75 dark:bg-[#131915]/80 backdrop-blur-xl p-2 sm:p-2.5 shadow-[0_8px_30px_-6px_rgba(30,45,35,0.08)]">
          <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 p-8 sm:p-10 border border-stone-200/60 dark:border-stone-800/60 flex flex-col items-center text-center">
            
            {/* Logo Badge */}
            <div className="size-16 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-center p-3.5 mb-5 ring-4 ring-[#5F7C65]/10">
              <LogoIcon className="size-full text-[#5F7C65]" />
            </div>

            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-3.5 shadow-2xs">
              <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
              <span>Official Cloud API Workspace</span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Welcome to <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">WaChat</span>
            </h2>

            {/* Description */}
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-2 max-w-md leading-relaxed">
              Select a conversation from the sidebar to start messaging, or create a new chat.
            </p>

            {/* Footer with Security & Keyboard Hint */}
            <div className="mt-8 pt-6 border-t border-stone-200/70 dark:border-stone-800/70 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[#5F7C65]" />
                <span>Enterprise Cloud API Infrastructure</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-[10px] font-mono text-stone-700 dark:text-stone-300 border border-stone-300/70 dark:border-stone-700">ESC</kbd>
                <span>to close active chat</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-[#FAF8F5]/30 dark:bg-[#0C0F0D] relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/85 dark:bg-[#131915]/85 backdrop-blur-md flex items-center gap-3 sticky top-0 z-10 transition-colors">
        {isMobile && onBack && (
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-300 transition-colors"
            title="Back to contacts"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {broadcastGroupName ? (
          <>
            {/* Broadcast Group Header */}
            <div className="shrink-0 size-10 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 flex items-center justify-center shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate">
                  {broadcastGroupName}
                </h2>
                <span className="text-[11px] font-semibold bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 px-2 py-0.5 rounded-full">
                  Broadcast
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {isLoading ? (
                  <span className="flex items-center gap-1 text-[#2D583F] dark:text-[#8EAE95]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending broadcast...
                  </span>
                ) : (
                  'Send message to all group members individually'
                )}
              </p>
            </div>
          </>
        ) : selectedUser ? (
          <>
            {/* Individual Chat Header */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group/header hover:bg-stone-100/70 dark:hover:bg-stone-800/50 rounded-2xl p-1 -m-1 transition-all duration-150"
              onClick={() => setShowUserInfo(true)}
              title="Click to view contact information"
            >
              <Avatar className="h-10 w-10 rounded-xl border border-stone-200/80 dark:border-stone-800 shrink-0 shadow-2xs ring-2 ring-[#5F7C65]/10">
                <AvatarFallback className="rounded-xl bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95] font-semibold text-sm">
                  {getDisplayName(selectedUser).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate group-hover/header:text-[#2D583F] dark:group-hover/header:text-[#8EAE95] transition-colors">
                    {getDisplayName(selectedUser)}
                  </h2>
                  <span className="hidden sm:inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 opacity-0 group-hover/header:opacity-100 transition-opacity">
                    View Info
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5 flex items-center gap-1.5">
                  {isLoading || sendingMedia ? (
                    <span className="flex items-center gap-1 text-[#2D583F] dark:text-[#8EAE95]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {sendingMedia ? 'Sending media...' : 'Sending message...'}
                    </span>
                  ) : (
                    <>
                      <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse shrink-0" />
                      <span className="font-mono">Last active {formatTime(selectedUser.last_active)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </>
        ) : null}
        {!isMobile && onClose && (
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 select-none">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Close chat (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700"
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
                  <span className="bg-white/85 dark:bg-[#18201B]/85 backdrop-blur-md text-stone-600 dark:text-stone-400 text-[11px] font-medium px-3.5 py-1 rounded-full border border-stone-200/70 dark:border-stone-800/70 shadow-2xs tracking-wide">
                    {formatDate(dayMessages[0].timestamp)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dayMessages.map((message, index) => {
                    // Use is_sent_by_me field instead of comparing IDs to determine message ownership
                    const isOwn = message.is_sent_by_me;

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
                            className="flex items-center justify-center my-4 animate-in fade-in duration-200"
                          >
                            <div className="flex-1 h-px bg-red-200 dark:bg-red-950/60"></div>
                            <div className="px-3.5 py-1 bg-red-50 dark:bg-red-950/50 text-[#B91C1C] dark:text-red-300 border border-red-200 dark:border-red-900/40 text-[11px] font-semibold rounded-full shadow-2xs">
                              {unreadMessages.length} unread message{unreadMessages.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex-1 h-px bg-red-200 dark:bg-red-950/60"></div>
                          </div>
                        )}

                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`group relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                            {renderMessageContent(message, isOwn)}
                            {getReactionSummary(message.reactions).length > 0 && (
                              <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                {getReactionSummary(message.reactions).map((reaction) => {
                                  const isMyReaction = reaction.senders.some(s => s === currentUserId);
                                  const senderNames = reaction.senders.map(s => {
                                    if (s === currentUserId) return 'You';
                                    return selectedUser?.custom_name || selectedUser?.whatsapp_name || selectedUser?.name || selectedUser?.phone_number || s;
                                  }).join(', ');

                                  return (
                                    <button
                                      key={`${message.id}-${reaction.emoji}`}
                                      type="button"
                                      onClick={() => handleReactionClick(message, reaction.emoji)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                        isMyReaction
                                          ? 'bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95] border-[#5F7C65]/30 font-medium'
                                          : 'bg-white/90 dark:bg-[#18201B]/90 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800'
                                      }`}
                                      title={`${senderNames} reacted with ${reaction.emoji}`}
                                    >
                                      <span className="text-sm leading-none">{reaction.emoji}</span>
                                      {reaction.count > 1 && (
                                        <span className="text-[11px] font-medium font-mono text-stone-500 dark:text-stone-400">{reaction.count}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {onReactToMessage && !broadcastGroupName && !message.isOptimistic && (
                              <div className={`mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                {REACTION_EMOJIS.map((emoji) => {
                                  const current = getUserReaction(message.reactions);
                                  const isSelected = current?.emoji === emoji;
                                  return (
                                    <button
                                      key={`${message.id}-${emoji}`}
                                      type="button"
                                      className={`px-2 py-0.5 text-sm rounded-full border transition-all ${isSelected ? 'bg-[#5F7C65]/20 border-[#5F7C65]/40 shadow-2xs' : 'bg-white/90 dark:bg-[#18201B]/90 border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                                      onClick={() => handleReactionClick(message, emoji)}
                                      title={isSelected ? 'Remove reaction' : 'React'}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}

                                {/* Plus button for full emoji picker */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    className="h-6 w-6 flex items-center justify-center text-xs rounded-full border bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                                    onClick={() => setEmojiPickerMessageId(emojiPickerMessageId === message.id ? null : message.id)}
                                    title="More reactions"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>

                                  {emojiPickerMessageId === message.id && (
                                    <EmojiReactionPicker
                                      isOpen={true}
                                      onClose={() => setEmojiPickerMessageId(null)}
                                      onSelectEmoji={(emoji) => {
                                        handleReactionClick(message, emoji);
                                        setEmojiPickerMessageId(null);
                                      }}
                                      anchorPosition="top"
                                      className={isOwn ? "right-0" : "left-0"}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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
      <div className="p-3 sm:p-3.5 border-t border-stone-200/80 dark:border-stone-800/80 bg-white/85 dark:bg-[#131915]/85 backdrop-blur-md">
        {messagingDisabled ? (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">Messaging unavailable</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 truncate mt-0.5">{messagingDisabledReason || 'Your subscription does not allow sending messages.'}</p>
            </div>
            <a href="/protected/billing" className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0">
              Manage Plan
            </a>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-center">
            {/* Hide media button in broadcast mode, show template button */}
            {!broadcastGroupName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaUpload(true)}
                className="h-10 w-10 p-0 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shrink-0"
                title="Attach media"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>
            )}
            {/* Template button available for both modes */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateSelector(true)}
              className="h-10 w-10 p-0 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-colors shrink-0"
              title="Send template"
            >
              <MessageSquare className="h-4.5 w-4.5" />
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
              className="flex-1 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#18201B] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 shadow-2xs h-10"
              maxLength={1000}
              disabled={isLoading || sendingMedia}
              autoFocus
            />
            <Button
              type="submit"
              disabled={!messageInput.trim() || isLoading || sendingMedia}
              className="bg-[#5F7C65] hover:bg-[#526D57] text-white px-4 sm:px-5 h-10 rounded-xl shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 font-medium text-xs sm:text-sm"
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
        <div className="absolute inset-0 bg-[#5F7C65]/15 flex items-center justify-center z-40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#18201B] rounded-3xl p-8 shadow-2xl border-2 border-[#5F7C65] border-dashed text-center max-w-sm w-full">
            <Paperclip className="h-12 w-12 text-[#5F7C65] mx-auto mb-3" />
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Drop files to send
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Release to stage and send media via WhatsApp Cloud API
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
          whatsappAccessToken={activeWhatsappToken || whatsappAccessToken}
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
          onOpenTemplateSelector={() => {
            setShowUserInfo(false);
            setShowTemplateSelector(true);
          }}
        />
      )}

      {/* Broadcast Message Delivery & Seen Info Modal */}
      <BroadcastInfoDialog
        open={showBroadcastInfo}
        onOpenChange={setShowBroadcastInfo}
        messageContent={selectedBroadcastMessage?.content}
        timestamp={selectedBroadcastMessage?.timestamp}
        groupName={broadcastGroupName}
        stats={selectedBroadcastMessage?.broadcast_stats}
        recipients={selectedBroadcastMessage?.recipients}
      />
    </div>
  );
} 