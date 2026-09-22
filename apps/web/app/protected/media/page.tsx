"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast, Toaster } from "@/components/ui/toast";
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
  Trash2,
  ExternalLink,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  FileUp,
  HardDrive,
  Clock,
  Sparkles,
  ShieldCheck,
  CloudUpload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { compressImageIfNeeded } from "@/lib/image-compression";
import LogoIcon from "@/components/logo-icon";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaType: string;
  createdAt: string;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl?: string;
  isTooLargeForMetaImage?: boolean;
}

const MEDIA_TYPE_FILTERS = [
  { value: "all", label: "All Assets", icon: Filter },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "document", label: "Documents", icon: FileText },
];

// WhatsApp supported types (client-side validation)
const SUPPORTED_TYPES = [
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/amr",
  "audio/ogg",
  "audio/opus",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "text/plain",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/3gpp",
];

const PRESIGNED_EXPIRY_MINUTES = 60; // 3600 seconds as configured in API & AWS S3 handler

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getFormatBadgeLabel(mimeType: string, mediaType: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("msword")) return "DOC";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLS";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "PPT";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPG";
  if (mimeType.includes("png")) return "PNG";
  if (mimeType.includes("webp")) return "WEBP";
  if (mimeType.includes("mp4")) return "MP4";
  if (mimeType.includes("3gpp")) return "3GP";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "MP3";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return "OGG";
  return mediaType.toUpperCase();
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Search state - sleek expandable search bar
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination state (20 items per page)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [presignedUrls, setPresignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Staged files & Confirmation dialog state
  const [pendingFiles, setPendingFiles] = useState<StagedFile[]>([]);
  const [isConfirmUploadOpen, setIsConfirmUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressStep, setUploadProgressStep] = useState<string>("");

  // Dropzone visibility - only shown on button click or file drag
  const [showDropzone, setShowDropzone] = useState(false);

  // Delete confirmation dialog state
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropzone drag-hover state
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Automatically reveal the upload media section when files are dragged into the browser window
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        setShowDropzone(true);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes("Files")) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      // If dropped on the page outside the dropzone component, still stage the files safely
      const isInsideDropzone = !!(e.target as HTMLElement | null)?.closest?.('[data-dropzone="true"]');
      if (!isInsideDropzone && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleStageFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  // Fetch media list from server with search across entire vault and 20 items per page
  const fetchMedia = useCallback(
    async (targetPage: number, query: string, filterType: string) => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          limit: "20",
          page: String(targetPage),
        });
        if (filterType !== "all") params.set("type", filterType);
        if (query.trim()) params.set("search", query.trim());

        const res = await fetch(`/api/media?${params.toString()}`);
        const data = await res.json();

        if (res.ok) {
          setItems(data.items || []);
          if (data.pagination) {
            setPage(data.pagination.page || targetPage);
            setTotalPages(data.pagination.totalPages || 1);
            setTotalCount(data.pagination.totalCount || 0);
          }

          // Kick off presigned URL fetching for the 20 items on the page
          if (data.items && data.items.length > 0) {
            fetchPresignedUrls(data.items.map((i: MediaItem) => i.id));
          }
        } else {
          toast(data.error || "Could not load media library.", "error");
        }
      } catch (e) {
        console.error("Error fetching media:", e);
        toast("Could not load media library. Please refresh.", "error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Batch fetch presigned URLs
  const fetchPresignedUrls = async (ids: string[]) => {
    const needed = ids.filter((id) => !presignedUrls[id] && !loadingUrls.has(id));
    if (needed.length === 0) return;

    setLoadingUrls((prev) => {
      const next = new Set(prev);
      needed.forEach((id) => next.add(id));
      return next;
    });

    try {
      const res = await fetch("/api/media/presigned-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: needed }),
      });
      const data = await res.json();

      if (res.ok && data.urls) {
        setPresignedUrls((prev) => ({ ...prev, ...data.urls }));
      }
    } catch (e) {
      console.error("Error fetching presigned URLs:", e);
    } finally {
      setLoadingUrls((prev) => {
        const next = new Set(prev);
        needed.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // Debounce search term by 350ms so typing doesn't bombard the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refetch whenever debounced search query or filter changes (resets to page 1)
  useEffect(() => {
    setPresignedUrls({});
    setPage(1);
    fetchMedia(1, debouncedSearch, filter);
  }, [debouncedSearch, filter, fetchMedia]);

  // Navigate between pages smoothly
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchMedia(newPage, debouncedSearch, filter);
    mediaContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 1. Stage files for preview before any upload happens
  const handleStageFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const valid: StagedFile[] = [];
    const seenInBatch = new Set<string>();
    let skippedCount = 0;

    for (const file of files) {
      const fileFingerprint = `${file.name}-${file.size}-${file.lastModified}`;
      if (seenInBatch.has(fileFingerprint)) {
        continue;
      }
      seenInBatch.add(fileFingerprint);

      if (file.size > 25 * 1024 * 1024 || !SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const id = `${file.name}-${file.size}-${file.lastModified}`;
      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      valid.push({
        id,
        file,
        previewUrl,
        isTooLargeForMetaImage: file.type.startsWith("image/") && file.size > 5 * 1024 * 1024,
      });
    }

    if (skippedCount > 0) {
      toast(
        `${skippedCount} file(s) skipped. Files must be supported types and under 25MB.`,
        "warning",
        5000
      );
    }

    if (valid.length === 0) {
      if (skippedCount === 0) {
        toast("No valid files detected.", "info", 3000);
      }
      return;
    }

    // Deduplicate against existing staged files so duplicates can NEVER appear
    setPendingFiles((prev) => {
      const existingKeys = new Set(prev.map((p) => `${p.file.name}-${p.file.size}-${p.file.lastModified}`));
      const uniqueNew = valid.filter(
        (v) => !existingKeys.has(`${v.file.name}-${v.file.size}-${v.file.lastModified}`)
      );
      return [...prev, ...uniqueNew];
    });
    setIsConfirmUploadOpen(true);
  };

  // Remove a single staged file before confirming upload
  const handleRemovePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const remaining = prev.filter((f) => f.id !== id);
      if (remaining.length === 0) {
        setIsConfirmUploadOpen(false);
      }
      return remaining;
    });
  };

  // Cancel staged files
  const handleCancelStagedFiles = () => {
    pendingFiles.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPendingFiles([]);
    setIsConfirmUploadOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. Execute upload ONLY AFTER EXPLICIT USER CONFIRMATION
  const handleExecuteUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setUploadProgressStep("Preparing assets...");

    try {
      // Step 1: Compress images on-the-fly if they exceed 5MB (Meta's limit)
      setUploadProgressStep("Optimizing image sizes for WhatsApp...");
      const processedFiles = await Promise.all(
        pendingFiles.map(async ({ file }) => {
          if (file.type.startsWith("image/")) {
            try {
              return await compressImageIfNeeded(file);
            } catch (err) {
              console.error("[MediaPage] Compression failed for", file.name, err);
              return file;
            }
          }
          return file;
        })
      );

      // Step 2: Request presigned S3 upload URLs from API
      setUploadProgressStep("Securing storage credentials...");
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: processedFiles.map((f) => ({
            fileName: f.name,
            fileSize: f.size,
            mimeType: f.type,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to acquire upload authorization");

      // Step 3: Put each file to S3
      setUploadProgressStep(`Transferring ${processedFiles.length} file(s) to storage...`);
      const uploadedIds: string[] = [];
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const upload = data.uploads[i];

        const putRes = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) {
          console.error(`Failed to upload ${file.name}`);
          continue;
        }
        uploadedIds.push(upload.id);
      }

      // Step 4: Confirm uploads for storage quota tracking
      if (uploadedIds.length > 0) {
        setUploadProgressStep("Finalizing storage confirmation...");
        await fetch("/api/media/confirm-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: uploadedIds }),
        });
      }

      toast(
        `Successfully uploaded ${uploadedIds.length} asset${uploadedIds.length > 1 ? "s" : ""} to Media Library!`,
        "success",
        4500
      );

      // Clean up object URLs
      pendingFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      setPendingFiles([]);
      setIsConfirmUploadOpen(false);

      // Refresh list at page 1
      setPage(1);
      fetchMedia(1, debouncedSearch, filter);
    } catch (e) {
      console.error("Upload error:", e);
      toast(e instanceof Error ? e.message : "Media upload encountered an error", "error", 5000);
    } finally {
      setUploading(false);
      setUploadProgressStep("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Copy Presigned URL with informative active duration toast
  const handleCopyUrl = async (item: MediaItem) => {
    const url = presignedUrls[item.id];
    if (!url) {
      toast("Presigned URL is still preparing. Please retry in a moment.", "info", 3000);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2200);

      toast(
        `Media URL copied to clipboard! Link remains active for ${PRESIGNED_EXPIRY_MINUTES} minutes.`,
        "success",
        5000
      );
    } catch {
      toast("Failed to copy URL to clipboard.", "error", 3000);
    }
  };

  // Execute Asset Deletion
  const handleConfirmDelete = async () => {
    if (!mediaToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/media?id=${mediaToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete media asset");
      }

      setItems((prev) => prev.filter((item) => item.id !== mediaToDelete.id));
      toast(`"${mediaToDelete.fileName}" was removed from your Media Library.`, "success", 4000);
      setMediaToDelete(null);

      // Refresh to keep 20 items per page & correct pagination counts
      const nextTargetPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextTargetPage);
      fetchMedia(nextTargetPage, debouncedSearch, filter);
    } catch (e) {
      console.error("Delete error:", e);
      toast(e instanceof Error ? e.message : "Failed to delete media asset", "error", 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalStagedSizeBytes = pendingFiles.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-900 dark:text-stone-100">
      <Toaster />

      {/* Main Full-Width Responsive Canvas */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20">
        {/* ======================================================================= */}
        {/* HEADER SECTION - Editorial Botanical Typography & Action                */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-1">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-2.5">
              <LogoIcon className="size-3.5 text-[#5F7C65]" />
              <span>Cloud Media Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Media{" "}
              <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                Library
              </span>
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Upload, inspect, and organize multimedia assets for real-time WhatsApp messaging and template campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            <Button
              type="button"
              onClick={() => setShowDropzone((prev) => !prev)}
              className={cn(
                "h-9 sm:h-10 px-4 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-[0.98]",
                showDropzone
                  ? "bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-stone-700 shadow-2xs"
                  : "bg-[#2D583F] hover:bg-[#234531] text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.25),0_1px_3px_0_rgba(0,0,0,0.12)] border border-[#2D583F]/30 hover:shadow-md"
              )}
            >
              {showDropzone ? (
                <>
                  <X className="size-3.5" />
                  <span>Hide Upload Area</span>
                </>
              ) : (
                <>
                  <CloudUpload className="size-4 text-emerald-100" />
                  <span>Upload Media</span>
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleStageFiles(e.target.files);
                }
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* INTERACTIVE DRAG & DROP ZONE (Shown only on Upload click or file drag)  */}
        {/* ======================================================================= */}
        {showDropzone && (
          <div
            data-dropzone="true"
            className={cn(
              "rounded-2xl border transition-all duration-300 p-1.5 animate-in fade-in slide-in-from-top-2 duration-250",
              isDraggingOverDropzone
                ? "border-[#5F7C65] bg-[#5F7C65]/10 shadow-lg ring-2 ring-[#5F7C65]/20"
                : "border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOverDropzone(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOverDropzone(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOverDropzone(false);
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                handleStageFiles(e.dataTransfer.files);
              }
            }}
          >
            <div
              className={cn(
                "relative rounded-[calc(1rem-0.125rem)] border-2 border-dashed transition-all p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer select-none",
                isDraggingOverDropzone
                  ? "border-[#5F7C65] bg-[#5F7C65]/15"
                  : "border-stone-300/80 dark:border-stone-700/80 hover:border-[#5F7C65] dark:hover:border-[#5F7C65] bg-[#FAF8F5]/60 dark:bg-stone-900/60"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Close Button inside dropzone */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropzone(false);
                }}
                className="absolute top-3 right-3 size-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 flex items-center justify-center transition-colors"
                title="Hide upload area"
              >
                <X className="size-4" />
              </button>

              <div className="size-11 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-2.5">
                <FileUp className="size-5 text-[#5F7C65]" />
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Drag &amp; drop files here, or <span className="text-[#2D583F] dark:text-[#8EAE95] underline underline-offset-4 font-medium">browse from your computer</span>
              </h3>

              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md leading-relaxed">
                Files will be staged safely for your preview and confirmation before uploading.
              </p>

              {/* Supported Formats Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5 text-[11px] text-stone-600 dark:text-stone-400">
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-2xs">
                  Images (JPG, PNG, WEBP)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-2xs">
                  Videos (MP4, 3GP)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-2xs">
                  Audio (MP3, AAC, OGG)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-2xs">
                  Documents (PDF, DOCX, XLSX)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-semibold font-mono text-[10px]">
                  Max 25 MB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* CONTROLS BAR: CATEGORY TABS & REAL-TIME SEARCH                          */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 sm:flex sm:inline-flex p-1 bg-stone-200/60 dark:bg-stone-800/60 rounded-xl border border-stone-300/40 dark:border-stone-700/40 h-auto">
              {MEDIA_TYPE_FILTERS.map((f) => (
                <TabsTrigger
                  key={f.value}
                  value={f.value}
                  className="gap-1.5 py-2 px-3 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-2xs font-medium text-xs text-stone-600 dark:text-stone-400"
                >
                  <f.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{f.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Animated Expandable Search Bar & Item Counter */}
          <div className="flex items-center justify-end gap-2.5">
            {/* Smooth Animated Horizontal Search Bar */}
            <div
              className={cn(
                "relative flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isSearchOpen || searchTerm
                  ? "w-full sm:w-80 md:w-96"
                  : "w-9"
              )}
            >
              {!(isSearchOpen || searchTerm) ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }}
                  className="size-9 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-all duration-200 shadow-2xs hover:border-[#5F7C65] hover:text-[#2D583F] dark:hover:text-[#8EAE95] cursor-pointer active:scale-95"
                  title="Search entire media library"
                  aria-label="Open search bar"
                >
                  <Search className="size-4 text-[#5F7C65]" />
                </button>
              ) : (
                <div className="relative w-full flex items-center animate-in fade-in slide-in-from-right-3 duration-300">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#5F7C65] pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search all media by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        if (searchTerm) {
                          setSearchTerm("");
                        } else {
                          setIsSearchOpen(false);
                        }
                      }
                    }}
                    className="pl-9 pr-8 h-9 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/95 dark:bg-stone-900/95 shadow-2xs focus-visible:ring-[#5F7C65] focus-visible:border-[#5F7C65] w-full text-stone-900 dark:text-stone-100 placeholder:text-stone-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Close search"
                    aria-label="Close search"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Total Library Assets Counter */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 text-xs text-stone-500 shrink-0 shadow-2xs font-mono">
              <HardDrive className="size-3.5 text-[#5F7C65]" />
              <span>{totalCount} item{totalCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Scroll anchor for pagination transitions */}
        <div ref={mediaContainerRef} className="scroll-mt-4" />

        {/* ======================================================================= */}
        {/* MEDIA GRID LISTING                                                      */}
        {/* ======================================================================= */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-1.5 shadow-2xs"
              >
                <div className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
            <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 py-16 px-6 text-center">
              <div className="mx-auto size-14 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 border border-stone-300/40 dark:border-stone-700/40 flex items-center justify-center text-stone-500 mb-3">
                <Paperclip className="size-6 text-stone-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                {searchTerm ? "No matching media files" : "No media files uploaded yet"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {searchTerm
                  ? `No assets match "${searchTerm}" across your media vault. Try adjusting your query or filter.`
                  : "Upload images, videos, audio, or document assets to start using them in your chats and campaigns."}
              </p>
              <div className="mt-5">
                {searchTerm ? (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setIsSearchOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-stone-300 dark:border-stone-700 text-xs font-medium gap-2 cursor-pointer"
                  >
                    <X className="size-3.5 text-stone-500" />
                    <span>Clear search</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDropzone(true)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-stone-300 dark:border-stone-700 text-xs font-medium gap-2 cursor-pointer"
                  >
                    <CloudUpload className="size-3.5 text-[#5F7C65]" />
                    <span>Choose file to upload</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => {
                const url = presignedUrls[item.id];
                const isLoadingUrl = loadingUrls.has(item.id);
                const formatLabel = getFormatBadgeLabel(item.mimeType, item.mediaType);

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200 flex flex-col"
                  >
                    <div className="rounded-[calc(1rem-0.125rem)] overflow-hidden flex flex-col flex-1 bg-[#FAF8F5]/70 dark:bg-stone-950/40">
                      {/* Media Preview Container */}
                      <div className="aspect-square relative bg-stone-100 dark:bg-stone-900/80 overflow-hidden select-none">
                        {/* Top Format Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider uppercase bg-stone-900/75 text-white backdrop-blur-xs border border-white/10 shadow-xs">
                            {formatLabel}
                          </span>
                        </div>

                        {/* External View Link (Top Right) */}
                        {url && (
                          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="size-7 rounded-lg bg-stone-900/75 hover:bg-stone-900 text-white backdrop-blur-xs border border-white/15 flex items-center justify-center transition-all shadow-xs"
                              title="Open original asset in new tab"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        )}

                        {/* Rendering Preview by Media Type */}
                        {item.mediaType === "image" ? (
                          url ? (
                            <Image
                              src={url}
                              alt={item.fileName}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                              unoptimized
                            />
                          ) : (
                            <Skeleton className="w-full h-full" />
                          )
                        ) : item.mediaType === "video" ? (
                          url ? (
                            <div className="w-full h-full relative flex items-center justify-center bg-stone-900">
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                              />
                              <div className="absolute size-10 rounded-full bg-stone-900/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                                <Video className="size-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-stone-900">
                              {isLoadingUrl ? (
                                <Skeleton className="w-full h-full" />
                              ) : (
                                <Video className="size-10 text-stone-400" />
                              )}
                            </div>
                          )
                        ) : item.mediaType === "audio" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500/10 to-[#5F7C65]/10 dark:from-amber-950/20 dark:to-[#5F7C65]/20 p-4">
                            <div className="size-12 rounded-2xl bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-[#5F7C65]">
                              <Music className="size-6" />
                            </div>
                            <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 font-mono">Audio Track</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500/10 to-[#5F7C65]/10 dark:from-blue-950/20 dark:to-[#5F7C65]/20 p-4">
                            <div className="size-12 rounded-2xl bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-[#2D583F] dark:text-[#8EAE95]">
                              <FileText className="size-6" />
                            </div>
                            <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 font-mono">{formatLabel} File</span>
                          </div>
                        )}

                        {/* Hover Actions Overlay */}
                        <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-3">
                          {/* Copy URL Button */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCopyUrl(item)}
                            className="w-full max-w-[130px] h-8 rounded-xl bg-white/95 hover:bg-white text-stone-900 dark:bg-stone-900/95 dark:hover:bg-stone-900 dark:text-stone-100 text-xs font-medium shadow-md gap-1.5 border border-stone-200/60 dark:border-stone-700/60 transition-transform active:scale-[0.97]"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="size-3.5 text-[#5F7C65]" />
                                <span className="font-semibold text-[#2D583F] dark:text-[#8EAE95]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5 text-stone-600 dark:text-stone-400" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </Button>

                          {/* Delete Button (Triggers Dialog) */}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setMediaToDelete(item)}
                            className="w-full max-w-[130px] h-8 rounded-xl bg-red-600/95 hover:bg-red-700 text-white text-xs font-medium shadow-md gap-1.5 transition-transform active:scale-[0.97]"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>

                      {/* Card Info Footer */}
                      <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                        <p
                          className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate"
                          title={item.fileName}
                        >
                          {item.fileName}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200/50 dark:border-stone-800/50 font-mono">
                          <span>{formatBytes(item.fileSize)}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =================================================================== */}
            {/* PAGINATION BAR (Only rendered if there is more than 1 page)         */}
            {/* =================================================================== */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-200/80 dark:border-stone-800/80 mt-6">
                <div className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                  Showing <span className="font-semibold text-stone-800 dark:text-stone-200">{(page - 1) * 20 + 1}</span> to{" "}
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{Math.min(page * 20, totalCount)}</span> of{" "}
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{totalCount}</span> assets
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => handlePageChange(page - 1)}
                    className="h-8 px-3 rounded-xl border-stone-300/80 dark:border-stone-700/80 text-xs font-medium gap-1 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers(page, totalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-xs text-stone-400 select-none">
                            ...
                          </span>
                        );
                      }

                      const pageNum = Number(p);
                      const isActive = pageNum === page;

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          disabled={loading}
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            "size-8 rounded-xl text-xs font-medium transition-all flex items-center justify-center cursor-pointer",
                            isActive
                              ? "bg-[#2D583F] text-white font-semibold shadow-xs"
                              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800 border border-transparent hover:border-stone-300/60 dark:hover:border-stone-700/60"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => handlePageChange(page + 1)}
                    className="h-8 px-3 rounded-xl border-stone-300/80 dark:border-stone-700/80 text-xs font-medium gap-1 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: UPLOAD CONFIRMATION & STAGING PREVIEW (STRICT CONFIRMATION)     */}
      {/* ========================================================================= */}
      <Dialog open={isConfirmUploadOpen} onOpenChange={(open) => !uploading && !open && handleCancelStagedFiles()}>
        <DialogContent className="sm:max-w-xl rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65]">
                <CloudUpload className="size-5 text-[#5F7C65]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Confirm Media Upload</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                    {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Review the staged assets below before uploading to your media vault.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Staged files list with scroll */}
          <div className="flex-1 overflow-y-auto space-y-2.5 my-4 pr-1 max-h-[340px]">
            {pendingFiles.map((staged) => (
              <div
                key={staged.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40 text-xs transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Thumbnail or type icon */}
                  <div className="size-11 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 relative flex items-center justify-center border border-stone-300/40 dark:border-stone-700/40">
                    {staged.previewUrl ? (
                      <Image
                        src={staged.previewUrl}
                        alt={staged.file.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : staged.file.type.startsWith("video/") ? (
                      <Video className="size-5 text-stone-500" />
                    ) : staged.file.type.startsWith("audio/") ? (
                      <Music className="size-5 text-stone-500" />
                    ) : (
                      <FileText className="size-5 text-stone-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {staged.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                      <span>{formatBytes(staged.file.size)}</span>
                      <span>•</span>
                      <span className="uppercase">{getFormatBadgeLabel(staged.file.type, "")}</span>
                      {staged.isTooLargeForMetaImage && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-sans">
                          Auto-compressing (&gt;5MB)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePendingFile(staged.id)}
                    className="size-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    title="Remove from upload queue"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Status / Meta Notice */}
          {uploading ? (
            <div className="p-3 rounded-xl bg-[#5F7C65]/10 border border-[#5F7C65]/20 flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-[#5F7C65] shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-stone-900 dark:text-stone-100">Uploading to S3...</p>
                <p className="text-[11px] text-[#2D583F] dark:text-[#8EAE95]">{uploadProgressStep}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800/70 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-[#5F7C65]" />
                <span>Total Staged Size: <strong className="font-mono text-stone-800 dark:text-stone-200">{formatBytes(totalStagedSizeBytes)}</strong></span>
              </div>
              <span className="text-[11px] text-stone-500">Presigned S3 link issued on complete</span>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800/70 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelStagedFiles}
              disabled={uploading}
              className="rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteUpload}
              disabled={uploading || pendingFiles.length === 0}
              className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium h-9 px-4 gap-1.5 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)]"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="size-3.5" />
                  <span>Confirm &amp; Upload {pendingFiles.length} File{pendingFiles.length > 1 ? "s" : ""}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: DELETE CONFIRMATION DIALOG                                      */}
      {/* ========================================================================= */}
      <Dialog open={!!mediaToDelete} onOpenChange={(open) => !isDeleting && !open && setMediaToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-6">
          <DialogHeader>
            <div className="mx-auto size-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Delete Media Asset?
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              Are you sure you want to delete this media file? It will be permanently removed from your WaChat Media Library.
            </DialogDescription>
          </DialogHeader>

          {mediaToDelete && (
            <div className="my-3 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40 flex items-center gap-3">
              <div className="size-11 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 relative flex items-center justify-center border border-stone-300/40 dark:border-stone-700/40">
                {presignedUrls[mediaToDelete.id] && mediaToDelete.mediaType === "image" ? (
                  <Image
                    src={presignedUrls[mediaToDelete.id]}
                    alt={mediaToDelete.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : mediaToDelete.mediaType === "video" ? (
                  <Video className="size-5 text-stone-500" />
                ) : mediaToDelete.mediaType === "audio" ? (
                  <Music className="size-5 text-stone-500" />
                ) : (
                  <FileText className="size-5 text-stone-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                  {mediaToDelete.fileName}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                  {formatBytes(mediaToDelete.fileSize)} • {formatDate(mediaToDelete.createdAt)}
                </p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Note: Existing WhatsApp chat threads that have already received this file will still display it via Meta servers.</span>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium h-9 px-4 shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  <span>Deleting...</span>
                </>
              ) : (
                "Delete Asset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
