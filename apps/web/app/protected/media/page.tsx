"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Loader2,
  Paperclip,
  Copy,
  Check,
  Filter,
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

const MEDIA_TYPE_FILTERS = [
  { value: "all", label: "All", icon: Filter },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "document", label: "Documents", icon: FileText },
];

// WhatsApp supported types (client-side validation)
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [presignedUrls, setPresignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch media list
  const fetchMedia = useCallback(async (cursor?: string | null, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '30' });
      if (filter !== 'all') params.set('type', filter);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();

      if (res.ok) {
        if (append) {
          setItems(prev => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);

        // Kick off presigned URL fetching for the new items
        if (data.items.length > 0) {
          fetchPresignedUrls(data.items.map((i: MediaItem) => i.id));
        }
      }
    } catch (e) {
      console.error('Error fetching media:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  // Batch fetch presigned URLs
  const fetchPresignedUrls = async (ids: string[]) => {
    // Filter out already loaded
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

  // Initial load & filter change
  useEffect(() => {
    setPresignedUrls({});
    fetchMedia();
  }, [fetchMedia]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    if (!nextCursor) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchMedia(nextCursor, true);
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [nextCursor, loadingMore, fetchMedia]);

  // Upload handler
  const handleUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(f => {
      if (f.size > 25 * 1024 * 1024) return false;
      return SUPPORTED_TYPES.includes(f.type.toLowerCase());
    });

    if (validFiles.length === 0) {
      alert('No valid files selected. Ensure files are under 25MB and a supported type.');
      return;
    }

    if (validFiles.length < files.length) {
      alert(`${files.length - validFiles.length} file(s) were skipped (unsupported type or >25MB).`);
    }

    setUploading(true);

    try {
      // Step 1: Get presigned upload URLs
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: validFiles.map(f => ({
            fileName: f.name,
            fileSize: f.size,
            mimeType: f.type,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get upload URLs');

      // Step 2: Upload each file to S3
      const uploadedIds: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const upload = data.uploads[i];

        const putRes = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!putRes.ok) {
          console.error(`Failed to upload ${file.name}`);
          continue;
        }
        uploadedIds.push(upload.id);
      }

      // Step 3: Confirm uploads for storage tracking
      if (uploadedIds.length > 0) {
        await fetch('/api/media/confirm-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: uploadedIds }),
        });
      }

      // Refresh list
      fetchMedia();
    } catch (e) {
      console.error('Upload error:', e);
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyUrl = async (id: string) => {
    const url = presignedUrls[id];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMediaCard = (item: MediaItem) => {
    const url = presignedUrls[item.id];
    const isLoadingUrl = loadingUrls.has(item.id);

    return (
      <div
        key={item.id}
        className="group border border-border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow"
      >
        {/* Preview */}
        <div className="aspect-square relative bg-muted/50 overflow-hidden">
          {item.mediaType === 'image' ? (
            url ? (
              <Image
                src={url}
                alt={item.fileName}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
                unoptimized
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )
          ) : item.mediaType === 'video' ? (
            url ? (
              <video
                src={url}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isLoadingUrl ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <Video className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
            )
          ) : item.mediaType === 'audio' ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
              <Music className="h-10 w-10 text-purple-400" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
              <FileText className="h-10 w-10 text-blue-400" />
            </div>
          )}

          {/* Copy URL overlay */}
          {url && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 text-xs"
                onClick={() => copyUrl(item.id)}
              >
                {copiedId === item.id ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy URL</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-medium truncate" title={item.fileName}>
            {item.fileName}
          </p>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>{formatBytes(item.fileSize)}</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container max-w-6xl mx-auto p-6 space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Media Library</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your media files for chats and templates
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-4 w-4" /> Upload Media</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {MEDIA_TYPE_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
                <f.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{f.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Media Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Paperclip className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-1">No media files yet</h3>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Upload images, videos, documents, or audio files to get started
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload your first file
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map(renderMediaCard)}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
