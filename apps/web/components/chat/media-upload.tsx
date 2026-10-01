"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Send,
  Loader2,
  Paperclip,
  Check,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  FolderOpen,
} from "lucide-react";
import Image from "next/image";
import { compressImageIfNeeded } from "@/lib/image-compression";

export interface MediaFile {
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

export interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (files: MediaFile[]) => Promise<void>;
  selectedUser: { id: string; name: string } | null;
}

interface LibraryItem {
  id: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaType: string;
  createdAt: string;
}

// WhatsApp supported file types
const WHATSAPP_SUPPORTED_TYPES = [
  // Audio
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
  'audio/opus',
  // Documents
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Videos
  'video/mp4',
  'video/3gpp',
];

function isWhatsAppSupportedFileType(mimeType: string): boolean {
  if (!mimeType) return false;
  return WHATSAPP_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function MediaUpload({ isOpen, onClose, onSend, selectedUser }: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryUrls, setLibraryUrls] = useState<Record<string, string>>({});
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [sendingFromLibrary, setSendingFromLibrary] = useState(false);
  const [libraryCaption, setLibraryCaption] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>("all");

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUploading && !sendingFromLibrary) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, sendingFromLibrary, onClose]);

  // Fetch library when tab switches to library
  useEffect(() => {
    if (isOpen && activeTab === "library" && libraryItems.length === 0) {
      fetchLibrary();
    }
  }, [isOpen, activeTab, libraryItems.length]);

  // Reset state when dialog opens / closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("upload");
      setSelectedLibraryId(null);
      setLibraryCaption("");
      setLibrarySearch("");
      setLibraryTypeFilter("all");
    } else {
      setMediaFiles([]);
      setLibraryItems([]);
      setLibraryUrls({});
      setSelectedLibraryId(null);
      setLibraryCaption("");
      setLibrarySearch("");
      setLibraryTypeFilter("all");
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch('/api/media?limit=50');
      const data = await res.json();
      if (res.ok) {
        setLibraryItems(data.items || []);
        if (data.items?.length > 0) {
          const ids = data.items.map((i: LibraryItem) => i.id);
          const urlRes = await fetch('/api/media/presigned-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          });
          const urlData = await urlRes.json();
          if (urlRes.ok) {
            setLibraryUrls(urlData.urls || {});
          }
        }
      }
    } catch (e) {
      console.error('[MediaUpload] Error fetching library:', e);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleSendFromLibrary = async () => {
    if (!selectedLibraryId) return;
    const item = libraryItems.find(i => i.id === selectedLibraryId);
    if (!item) return;

    setSendingFromLibrary(true);
    try {
      const type = item.mediaType === 'image' ? 'image' as const
        : item.mediaType === 'video' ? 'video' as const
          : item.mediaType === 'audio' ? 'audio' as const
            : 'document' as const;

      // Create a placeholder File — the actual data is hosted on S3 (s3Key).
      // handleSendMedia in chat-window will detect s3Key and dispatch directly without re-upload.
      const placeholder = new File([], item.fileName, { type: item.mimeType });

      const syntheticFile: MediaFile = {
        id: item.id,
        file: placeholder,
        type,
        caption: libraryCaption.trim() ? libraryCaption.trim() : undefined,
        s3Key: item.s3Key,
        s3MimeType: item.mimeType,
        s3FileSize: item.fileSize,
      };

      await onSend([syntheticFile]);
      onClose();
    } catch (error) {
      console.error('[MediaUpload] Error sending from library:', error);
      alert('Failed to send media asset. Please try again.');
    } finally {
      setSendingFromLibrary(false);
    }
  };

  const getFileType = (file: File): 'image' | 'document' | 'audio' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const validFiles: MediaFile[] = [];
    const errors: string[] = [];

    for (let file of filesArray) {
      // Compress image on-the-fly if it exceeds 5MB (WhatsApp limit)
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImageIfNeeded(file);
        } catch (err) {
          console.error('[MediaUpload] Compression failed for', file.name, err);
        }
      }

      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 25MB limit`);
        continue;
      }

      // Check if file type is supported by WhatsApp
      if (!isWhatsAppSupportedFileType(file.type)) {
        errors.push(`${file.name}: File format (${file.type || 'unknown'}) is not supported by WhatsApp.`);
        continue;
      }

      const type = getFileType(file);
      const preview = type === 'image' ? await createFilePreview(file) : undefined;

      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type,
        preview,
        caption: '',
      });
    }

    if (errors.length > 0) {
      alert('Some files could not be added:\n\n' + errors.join('\n\n'));
    }

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setMediaFiles(prev =>
      prev.map(file =>
        file.id === id ? { ...file, caption } : file
      )
    );
  };

  const handleSend = async () => {
    if (mediaFiles.length === 0) return;

    setIsUploading(true);
    try {
      await onSend(mediaFiles);
      setMediaFiles([]);
      onClose();
    } catch (error) {
      console.error('[MediaUpload] Error sending media:', error);
      alert('Failed to send media. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered library items based on client-side search and category
  const filteredLibraryItems = useMemo(() => {
    return libraryItems.filter(item => {
      const matchesType = libraryTypeFilter === "all" || item.mediaType === libraryTypeFilter;
      const matchesSearch = !librarySearch.trim() || item.fileName.toLowerCase().includes(librarySearch.toLowerCase().trim());
      return matchesType && matchesSearch;
    });
  }, [libraryItems, libraryTypeFilter, librarySearch]);

  const totalStagedBytes = useMemo(() => {
    return mediaFiles.reduce((acc, curr) => acc + curr.file.size, 0);
  }, [mediaFiles]);

  const selectedLibraryItem = useMemo(() => {
    if (!selectedLibraryId) return null;
    return libraryItems.find(i => i.id === selectedLibraryId) || null;
  }, [selectedLibraryId, libraryItems]);

  const renderMediaTypeBadge = (type: string) => {
    switch (type) {
      case 'image':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
            <ImageIcon className="size-3" /> Image
          </span>
        );
      case 'video':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Video className="size-3" /> Video
          </span>
        );
      case 'audio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Music className="size-3" /> Audio
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <FileText className="size-3" /> Document
          </span>
        );
    }
  };

  const renderLibraryIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-[#5F7C65]" />;
      case 'video': return <Video className="h-8 w-8 text-amber-600 dark:text-amber-400" />;
      case 'audio': return <Music className="h-8 w-8 text-purple-600 dark:text-purple-400" />;
      default: return <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
    }
  };

  const renderFilePreview = (mediaFile: MediaFile) => {
    const { file, type, preview } = mediaFile;

    switch (type) {
      case 'image':
        return (
          <div className="relative w-full h-36 bg-stone-100 dark:bg-stone-800/50 rounded-xl overflow-hidden border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageIcon className="h-8 w-8 text-stone-400" />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative w-full h-36 bg-stone-900 rounded-xl overflow-hidden flex flex-col items-center justify-center text-white/90 border border-stone-800 p-3">
            <div className="size-11 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-2">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-medium px-2 truncate max-w-full text-stone-200">
              {file.name}
            </span>
          </div>
        );

      case 'audio':
        return (
          <div className="w-full py-4 px-3.5 bg-stone-100/80 dark:bg-stone-800/50 rounded-xl flex items-center gap-3 border border-stone-200/60 dark:border-stone-800/60">
            <div className="size-10 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Music className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                {file.name}
              </p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                Audio Recording • {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="w-full py-4 px-3.5 bg-stone-100/80 dark:bg-stone-800/50 rounded-xl flex items-center gap-3 border border-stone-200/60 dark:border-stone-800/60">
            <div className="size-10 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                {file.name}
              </p>
              <p className="text-[10px] uppercase font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                {file.name.split('.').pop() || 'Document'} • {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={() => {
        if (!isUploading && !sendingFromLibrary) onClose();
      }}
    >
      {/* Doppelrand Double-Bezel Modal */}
      <div
        className="relative max-w-4xl w-full rounded-3xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#131915]/95 backdrop-blur-xl p-2 sm:p-2.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 border border-stone-200/70 dark:border-stone-800/70 flex flex-col flex-1 min-h-0 overflow-hidden relative">
          
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between bg-white/80 dark:bg-[#18201B]/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 flex items-center justify-center shadow-2xs shrink-0">
                <Paperclip className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Send</span>
                  <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                    Media Message
                  </span>
                </h2>
                {selectedUser ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    To recipient: <span className="font-medium text-stone-700 dark:text-stone-300">{selectedUser.name}</span>
                  </p>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Select or upload media asset to attach
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isUploading || sendingFromLibrary}
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800/60 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs Navigation & Body */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Tabs Trigger Switch */}
            <div className="px-5 sm:px-6 pt-3.5 pb-1 shrink-0">
              <TabsList className="w-full bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 grid grid-cols-2 gap-1 h-auto">
                <TabsTrigger
                  value="upload"
                  className="rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#131915] data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-2xs text-stone-600 dark:text-stone-400 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload New</span>
                  {mediaFiles.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#5F7C65] text-white">
                      {mediaFiles.length}
                    </span>
                  )}
                </TabsTrigger>
                
                <TabsTrigger
                  value="library"
                  className="rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#131915] data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-2xs text-stone-600 dark:text-stone-400 flex items-center justify-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Choose from Media</span>
                  {libraryItems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                      {libraryItems.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: UPLOAD NEW */}
            <TabsContent value="upload" className="flex-1 min-h-0 flex flex-col overflow-hidden m-0">
              <div
                className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag and Drop Empty State */}
                {mediaFiles.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center cursor-pointer ${
                      isDragging
                        ? 'border-[#5F7C65] bg-[#5F7C65]/10 ring-4 ring-[#5F7C65]/20 scale-[0.99]'
                        : 'border-stone-300 dark:border-stone-700 hover:border-[#5F7C65]/60 dark:hover:border-[#5F7C65]/60 bg-white/70 dark:bg-stone-900/40 hover:bg-[#5F7C65]/5'
                    }`}
                  >
                    <div className="size-14 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                      <Upload className="h-7 w-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-stone-900 dark:text-stone-100 mb-1">
                      Drop files here or click to browse
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6 leading-relaxed">
                      Support for images, videos, audio, and documents (max 25MB each). Images exceeding 5MB are automatically compressed for WhatsApp delivery.
                    </p>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white px-5 py-2.5 text-sm font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all active:scale-[0.97]"
                    >
                      <Paperclip className="h-4 w-4" />
                      Choose Files
                    </button>
                  </div>
                ) : (
                  /* Staged Files Preview Grid */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-stone-800/80">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
                          Staged Files ({mediaFiles.length})
                        </h3>
                        <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                          • {formatFileSize(totalStagedBytes)} total
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add More
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mediaFiles.map((mediaFile) => (
                        <div
                          key={mediaFile.id}
                          className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/80 p-3.5 shadow-2xs space-y-3 transition-all hover:border-[#5F7C65]/30 flex flex-col justify-between"
                        >
                          {/* Media Preview Box */}
                          <div>
                            {renderFilePreview(mediaFile)}

                            {/* File Info Bar */}
                            <div className="mt-3 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 truncate" title={mediaFile.file.name}>
                                  {mediaFile.file.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {renderMediaTypeBadge(mediaFile.type)}
                                  <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                                    {formatFileSize(mediaFile.file.size)}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeFile(mediaFile.id)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                                title="Remove file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Caption Input (for image and video) */}
                          {(mediaFile.type === 'image' || mediaFile.type === 'video') && (
                            <div className="pt-1">
                              <Input
                                placeholder="Add a caption for this media message..."
                                value={mediaFile.caption || ""}
                                onChange={(e) => updateCaption(mediaFile.id, e.target.value)}
                                className="text-xs border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl h-8.5"
                                maxLength={1000}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Tab Sticky Footer */}
              <div className="border-t border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 backdrop-blur-md px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {mediaFiles.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-2 rounded-full bg-[#5F7C65] animate-pulse" />
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''} ready to send
                      </span>
                    </div>
                  ) : (
                    <span>Select or drop files above to prepare transmission</span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/80 px-4 py-2 text-xs sm:text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isUploading || mediaFiles.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] px-5 py-2 text-xs sm:text-sm font-medium text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Media...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send {mediaFiles.length > 0 ? `${mediaFiles.length} File${mediaFiles.length !== 1 ? 's' : ''}` : 'Media'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CHOOSE FROM MEDIA LIBRARY */}
            <TabsContent value="library" className="flex-1 min-h-0 flex flex-col overflow-hidden m-0">
              
              {/* Search, Filter & Refresh Bar */}
              <div className="p-4 sm:p-5 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-[#18201B]/60 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
                  <Input
                    placeholder="Search library assets by filename..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="pl-10 border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl text-xs sm:text-sm h-9 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {/* Category Pills */}
                  {(['all', 'image', 'video', 'document', 'audio'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLibraryTypeFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all shrink-0 ${
                        libraryTypeFilter === filter
                          ? 'bg-[#5F7C65] text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800/70 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700/60'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={fetchLibrary}
                    disabled={libraryLoading}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors shrink-0"
                    title="Refresh media library"
                  >
                    <RefreshCw className={`h-4 w-4 ${libraryLoading ? 'animate-spin text-[#5F7C65]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Library Scrollable Area */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700">
                
                {/* Active Selection Dossier Banner */}
                {selectedLibraryItem && (
                  <div className="rounded-2xl border border-[#5F7C65]/30 bg-[#5F7C65]/8 dark:bg-[#5F7C65]/15 p-4 mb-4 space-y-3 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95]">
                          <Check className="size-3" /> Selected Asset
                        </span>
                        <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                          {formatFileSize(selectedLibraryItem.fileSize)} • {selectedLibraryItem.mediaType}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLibraryId(null);
                          setLibraryCaption("");
                        }}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title="Deselect item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="relative size-16 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-center">
                        {selectedLibraryItem.mediaType === 'image' && libraryUrls[selectedLibraryItem.id] ? (
                          <Image
                            src={libraryUrls[selectedLibraryItem.id]}
                            alt={selectedLibraryItem.fileName}
                            fill
                            className="object-cover"
                            sizes="64px"
                            unoptimized
                          />
                        ) : (
                          renderLibraryIcon(selectedLibraryItem.mediaType)
                        )}
                      </div>

                      <div className="flex-1 min-w-0 w-full space-y-2">
                        <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate" title={selectedLibraryItem.fileName}>
                          {selectedLibraryItem.fileName}
                        </p>
                        
                        {(selectedLibraryItem.mediaType === 'image' || selectedLibraryItem.mediaType === 'video') && (
                          <Input
                            placeholder="Add a caption for this media asset message..."
                            value={libraryCaption}
                            onChange={(e) => setLibraryCaption(e.target.value)}
                            className="text-xs border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl h-8.5"
                            maxLength={1000}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Library Grid States */}
                {libraryLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-stone-200/60 dark:border-stone-800/60 p-2 space-y-2 bg-white/50 dark:bg-stone-900/40">
                        <Skeleton className="aspect-square rounded-xl" />
                        <Skeleton className="h-3.5 w-3/4 rounded-md" />
                        <Skeleton className="h-2.5 w-1/2 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : filteredLibraryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mb-3 border border-stone-200/80 dark:border-stone-700/80 shadow-2xs">
                      <FolderOpen className="h-7 w-7" />
                    </div>
                    <h4 className="text-sm sm:text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
                      No Media Assets Found
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mb-5 leading-relaxed">
                      {librarySearch
                        ? `No files in your library match "${librarySearch}".`
                        : "There are no media assets in your storage library yet."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-2xs transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload New Asset Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {filteredLibraryItems.map((item) => {
                      const url = libraryUrls[item.id];
                      const isSelected = selectedLibraryId === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedLibraryId(null);
                              setLibraryCaption("");
                            } else {
                              setSelectedLibraryId(item.id);
                              setLibraryCaption("");
                            }
                          }}
                          className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-200 p-2 flex flex-col ${
                            isSelected
                              ? 'border-[#5F7C65] ring-2 ring-[#5F7C65]/30 bg-[#5F7C65]/5 dark:bg-[#5F7C65]/10 scale-[0.98] shadow-sm'
                              : 'border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 hover:border-[#5F7C65]/40 hover:bg-white dark:hover:bg-stone-900'
                          }`}
                        >
                          <div className="aspect-square relative rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800/60 mb-2 flex items-center justify-center">
                            {item.mediaType === 'image' && url ? (
                              <Image
                                src={url}
                                alt={item.fileName}
                                fill
                                className="object-cover transition-transform group-hover:scale-105 duration-200"
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                unoptimized
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-2 text-center gap-1.5">
                                {renderLibraryIcon(item.mediaType)}
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                                  {item.mediaType}
                                </span>
                              </div>
                            )}

                            {/* Selected Badge */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-[#5F7C65] text-white rounded-full p-1 shadow-md">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}

                            {/* Type Pill */}
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold uppercase bg-black/60 text-white backdrop-blur-xs">
                              {item.mediaType}
                            </div>
                          </div>

                          <div className="px-1 min-w-0 w-full">
                            <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate" title={item.fileName}>
                              {item.fileName}
                            </p>
                            <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                              {formatFileSize(item.fileSize)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Library Tab Sticky Footer */}
              <div className="border-t border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 backdrop-blur-md px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {selectedLibraryItem ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-2 rounded-full bg-[#5F7C65] animate-pulse" />
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        1 media asset selected
                      </span>
                    </div>
                  ) : (
                    <span>Click an asset in your library to select for transmission</span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLibraryId(null);
                      setLibraryCaption("");
                      onClose();
                    }}
                    disabled={sendingFromLibrary}
                    className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/80 px-4 py-2 text-xs sm:text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSendFromLibrary}
                    disabled={sendingFromLibrary || !selectedLibraryId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] px-5 py-2 text-xs sm:text-sm font-medium text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {sendingFromLibrary ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Media...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Selected Media</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Hidden Native File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/3gpp,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}