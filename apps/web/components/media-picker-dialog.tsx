"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Loader2,
  X,
  Check,
  Paperclip,
} from "lucide-react";
import Image from "next/image";

interface MediaItem {
  id: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaType: string;
  createdAt: string;
}

interface MediaPickerResult {
  /** Presigned S3 URL (usable as template header URL or for sending) */
  url: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaFileId: string;
}

interface MediaPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaPickerResult) => void;
  /** Filter to a single media type, e.g. 'image', 'video', 'document' */
  mediaTypeFilter?: string;
  title?: string;
}

// WhatsApp supported types
const SUPPORTED_TYPES = [
  'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/opus',
  'application/vnd.ms-powerpoint', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf', 'text/plain', 'application/vnd.ms-excel',
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/3gpp',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function MediaPickerDialog({
  isOpen,
  onClose,
  onSelect,
  mediaTypeFilter,
  title = "Select Media",
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState<string>("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [presignedUrls, setPresignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchMedia = useCallback(async (cursor?: string | null, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '30' });
      if (mediaTypeFilter) params.set('type', mediaTypeFilter);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();

      if (res.ok) {
        const newItems = data.items as MediaItem[];
        if (append) {
          setItems(prev => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setNextCursor(data.nextCursor);

        if (newItems.length > 0) {
          fetchPresignedUrls(newItems.map((i) => i.id));
        }
      }
    } catch (e) {
      console.error('Error fetching media:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mediaTypeFilter]);

  const fetchPresignedUrls = async (ids: string[]) => {
    const needed = ids.filter(id => !presignedUrls[id] && !loadingUrls.has(id));
    if (needed.length === 0) return;

    setLoadingUrls(prev => {
      const next = new Set(prev);
      needed.forEach(id => next.add(id));
      return next;
    });

    try {
      const res = await fetch('/api/media/presigned-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: needed }),
      });
      const data = await res.json();
      if (res.ok && data.urls) {
        setPresignedUrls(prev => ({ ...prev, ...data.urls }));
      }
    } catch (e) {
      console.error('Error fetching presigned URLs:', e);
    } finally {
      setLoadingUrls(prev => {
        const next = new Set(prev);
        needed.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  // Load on open
  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setPresignedUrls({});
      setTab("library");
      fetchMedia();
    }
  }, [isOpen, fetchMedia]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!nextCursor || tab !== 'library') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchMedia(nextCursor, true);
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [nextCursor, loadingMore, tab, fetchMedia]);

  const handleConfirmSelection = () => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    const url = presignedUrls[selectedId];
    if (!item || !url) return;

    onSelect({
      url,
      s3Key: item.s3Key,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      mediaFileId: item.id,
    });
    onClose();
  };

  const handleUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    let validFiles = files.filter(f => f.size <= 25 * 1024 * 1024 && SUPPORTED_TYPES.includes(f.type.toLowerCase()));

    // If we have a type filter, apply it
    if (mediaTypeFilter) {
      validFiles = validFiles.filter(f => f.type.startsWith(mediaTypeFilter + '/'));
    }

    if (validFiles.length === 0) {
      alert('No valid files selected.');
      return;
    }

    setUploading(true);

    try {
      // Get upload URLs
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: validFiles.map(f => ({ fileName: f.name, fileSize: f.size, mimeType: f.type })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Upload to S3
      const uploadedIds: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const upload = data.uploads[i];

        const putRes = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (putRes.ok) {
          uploadedIds.push(upload.id);
        }
      }

      // Confirm storage
      if (uploadedIds.length > 0) {
        await fetch('/api/media/confirm-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: uploadedIds }),
        });
      }

      // If single file, auto-select it and return
      if (uploadedIds.length === 1) {
        const upload = data.uploads[0];
        // Generate presigned URL for the newly uploaded file
        const urlRes = await fetch('/api/media/presigned-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [upload.id] }),
        });
        const urlData = await urlRes.json();
        const url = urlData.urls?.[upload.id];

        if (url) {
          onSelect({
            url,
            s3Key: upload.s3Key,
            fileName: upload.fileName,
            mimeType: upload.mimeType,
            fileSize: validFiles[0].size,
            mediaFileId: upload.id,
          });
          onClose();
          return;
        }
      }

      // Refresh library and switch to it
      setTab("library");
      fetchMedia();
    } catch (e) {
      console.error('Upload error:', e);
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getAccept = () => {
    switch (mediaTypeFilter) {
      case 'image': return 'image/jpeg,image/png,image/webp';
      case 'video': return 'video/mp4,video/3gpp';
      case 'audio': return 'audio/*';
      case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      default: return 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
    }
  };

  const renderMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-muted-foreground/40" />;
      case 'video': return <Video className="h-8 w-8 text-muted-foreground/40" />;
      case 'audio': return <Music className="h-8 w-8 text-purple-300" />;
      default: return <FileText className="h-8 w-8 text-blue-300" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="library" className="flex-1 gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Choose from Media
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-4 w-4" />
                Upload New
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 overflow-y-auto px-5 pb-5 mt-0">
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="h-3 w-2/3 mt-2" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Paperclip className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No media files yet</p>
                <Button variant="outline" size="sm" onClick={() => setTab("upload")} className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  Upload one now
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-4">
                  {items.map((item) => {
                    const url = presignedUrls[item.id];
                    const isSelected = selectedId === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className={`text-left rounded-lg overflow-hidden border-2 transition-all ${isSelected
                            ? 'border-green-500 ring-2 ring-green-500/30'
                            : 'border-transparent hover:border-muted-foreground/20'
                          }`}
                      >
                        <div className="aspect-square relative bg-muted/50">
                          {item.mediaType === 'image' && url ? (
                            <Image
                              src={url}
                              alt={item.fileName}
                              fill
                              className="object-cover"
                              sizes="150px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {!url && (item.mediaType === 'image' || item.mediaType === 'video') ? (
                                <Skeleton className="w-full h-full" />
                              ) : (
                                renderMediaIcon(item.mediaType)
                              )}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-xs truncate text-muted-foreground">{item.fileName}</p>
                          <p className="text-[10px] text-muted-foreground/60">{formatBytes(item.fileSize)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 overflow-y-auto px-5 pb-5 mt-0">
            <div className="flex items-center justify-center h-full min-h-[300px] pt-4">
              <div
                className={`w-full border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-green-500 mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-medium mb-1">Uploading...</p>
                    <p className="text-sm text-muted-foreground">Please wait while your file is being uploaded</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-1">
                      Drop file here or click to upload
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {mediaTypeFilter
                        ? `Supports ${mediaTypeFilter} files (max 25MB)`
                        : 'Supports images, videos, audio, and documents (max 25MB)'}
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer - show when in library tab with selection */}
        {tab === 'library' && selectedId && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {items.find(i => i.id === selectedId)?.fileName}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 gap-1.5"
                onClick={handleConfirmSelection}
                disabled={!presignedUrls[selectedId]}
              >
                <Check className="h-4 w-4" />
                Use this media
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAccept()}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
}
