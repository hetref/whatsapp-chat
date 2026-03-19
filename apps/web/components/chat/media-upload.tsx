"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Upload, Image as ImageIcon, FileText, Music, Video, Send, Loader2, Paperclip, Check } from "lucide-react";
import Image from "next/image";

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

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (files: MediaFile[]) => Promise<void>;
  selectedUser: { id: string; name: string } | null;
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
  return WHATSAPP_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
}

export function MediaUpload({ isOpen, onClose, onSend, selectedUser }: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  interface LibraryItem {
    id: string;
    s3Key: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    mediaType: string;
    createdAt: string;
  }
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryUrls, setLibraryUrls] = useState<Record<string, string>>({});
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [sendingFromLibrary, setSendingFromLibrary] = useState(false);
  const [libraryCaption, setLibraryCaption] = useState("");

  // Fetch library when tab switches to library
  useEffect(() => {
    if (isOpen && activeTab === "library" && libraryItems.length === 0) {
      fetchLibrary();
    }
  }, [isOpen, activeTab]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("upload");
      setSelectedLibraryId(null);
      setLibraryCaption("");
    } else {
      setMediaFiles([]);
      setLibraryItems([]);
      setLibraryUrls({});
      setSelectedLibraryId(null);
      setLibraryCaption("");
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
          if (urlRes.ok) setLibraryUrls(urlData.urls || {});
        }
      }
    } catch (e) {
      console.error('Error fetching library:', e);
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

      // Create a minimal placeholder File — the actual data is on S3 (s3Key).
      // handleSendMedia in chat-window will detect s3Key and skip re-upload.
      const placeholder = new File([], item.fileName, { type: item.mimeType });

      const syntheticFile: MediaFile = {
        id: item.id,
        file: placeholder,
        type,
        caption: libraryCaption,
        s3Key: item.s3Key,
        s3MimeType: item.mimeType,
        s3FileSize: item.fileSize,
      };

      await onSend([syntheticFile]);
      onClose();
    } catch (error) {
      console.error('Error sending from library:', error);
      alert('Failed to send media. Please try again.');
    } finally {
      setSendingFromLibrary(false);
    }
  };

  const renderLibraryIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-muted-foreground/40" />;
      case 'video': return <Video className="h-8 w-8 text-muted-foreground/40" />;
      case 'audio': return <Music className="h-8 w-8 text-purple-300" />;
      default: return <FileText className="h-8 w-8 text-blue-300" />;
    }
  };

  const getFileType = (file: File): 'image' | 'document' | 'audio' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';

    // Enhanced document type detection
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript'
    ];

    if (documentTypes.includes(file.type) || file.type.startsWith('text/')) {
      return 'document';
    }

    // Default to document for unknown types
    return 'document';
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
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

    for (const file of filesArray) {
      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 25MB limit`);
        continue;
      }

      // Check if file type is supported by WhatsApp
      if (!isWhatsAppSupportedFileType(file.type)) {
        errors.push(`${file.name}: File type '${file.type}' is not supported by WhatsApp. Supported types include: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, WEBP, MP4, 3GP, AAC, MP3, MPEG, AMR, OGG, OPUS`);
        continue;
      }

      const type = getFileType(file);
      // Generate preview before adding to state so it's immediately visible
      const preview = type === 'image' ? await createFilePreview(file) : undefined;

      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
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
      console.error('Error sending media:', error);
      alert('Failed to send media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderFilePreview = (mediaFile: MediaFile) => {
    const { file, type, preview } = mediaFile;

    switch (type) {
      case 'image':
        return (
          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
            {preview ? (
              <Image
                src={preview}
                alt={file.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <Video className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-sm text-gray-600">{file.name}</span>
          </div>
        );

      case 'audio':
        return (
          <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <Music className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600 truncate">{file.name}</span>
          </div>
        );

      case 'document':
        return (
          <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600 truncate">{file.name}</span>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Send Media
            </h2>
            {selectedUser && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                To: {selectedUser.name}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-4 w-4" />
                Upload New
              </TabsTrigger>
              <TabsTrigger value="library" className="flex-1 gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Choose from Media
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 overflow-y-auto px-6 pb-6 mt-0">
            <div className="pt-4">
              {/* Drag and Drop Area */}
              {mediaFiles.length === 0 && (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drop files here or click to upload
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Support for images, videos, audio, and documents (max 25MB each)
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              )}

              {/* File Previews */}
              {mediaFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Selected Files ({mediaFiles.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Add More
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mediaFiles.map((mediaFile) => (
                      <div
                        key={mediaFile.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3"
                      >
                        {/* File Preview */}
                        {renderFilePreview(mediaFile)}

                        {/* File Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {mediaFile.file.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(mediaFile.id)}
                              className="p-1 h-8 w-8 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="text-xs text-gray-500">
                            {(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB • {mediaFile.type}
                          </p>

                          {/* Caption Input */}
                          {(mediaFile.type === 'image' || mediaFile.type === 'video') && (
                            <Input
                              placeholder="Add a caption..."
                              value={mediaFile.caption}
                              onChange={(e) => updateCaption(mediaFile.id, e.target.value)}
                              className="text-sm"
                              maxLength={1000}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop Zone Overlay */}
              {isDragging && (
                <div
                  className="fixed inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center z-10"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
                    <Upload className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white text-center">
                      Drop files to upload
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 overflow-y-auto px-6 pb-6 mt-0">
            {libraryLoading ? (
              <div className="grid grid-cols-3 gap-4 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-3 w-2/3 mt-2" />
                  </div>
                ))}
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Paperclip className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No media files in your library</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("upload")} className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  Upload one now
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {/* Selected media preview + caption */}
                {selectedLibraryId && (() => {
                  const item = libraryItems.find(i => i.id === selectedLibraryId);
                  const url = libraryUrls[selectedLibraryId];
                  if (!item) return null;
                  return (
                    <div className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-4">
                        {/* Preview */}
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted/50 shrink-0">
                          {item.mediaType === 'image' && url ? (
                            <Image
                              src={url}
                              alt={item.fileName}
                              fill
                              className="object-cover"
                              sizes="128px"
                              unoptimized
                            />
                          ) : item.mediaType === 'video' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Video className="h-10 w-10 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground">Video</span>
                            </div>
                          ) : item.mediaType === 'audio' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Music className="h-10 w-10 text-purple-300" />
                              <span className="text-[10px] text-muted-foreground">Audio</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <FileText className="h-10 w-10 text-blue-300" />
                              <span className="text-[10px] text-muted-foreground">Document</span>
                            </div>
                          )}
                        </div>
                        {/* Info + Caption */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{item.fileName}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedLibraryId(null); setLibraryCaption(""); }}
                              className="p-1 h-7 w-7 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(item.fileSize / 1024 / 1024).toFixed(2)} MB &bull; {item.mediaType}
                          </p>
                          {(item.mediaType === 'image' || item.mediaType === 'video') && (
                            <Input
                              placeholder="Add a caption..."
                              value={libraryCaption}
                              onChange={(e) => setLibraryCaption(e.target.value)}
                              className="text-sm"
                              maxLength={1000}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {libraryItems.map((item) => {
                    const url = libraryUrls[item.id];
                    const isSelected = selectedLibraryId === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLibraryId(null);
                            setLibraryCaption("");
                          } else {
                            setSelectedLibraryId(item.id);
                            setLibraryCaption("");
                          }
                        }}
                        className={`text-left rounded-xl overflow-hidden border-2 transition-all ${isSelected
                            ? 'border-green-500 ring-2 ring-green-500/30 scale-[0.97]'
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
                              sizes="250px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              {!url && (item.mediaType === 'image' || item.mediaType === 'video') ? (
                                <Skeleton className="w-full h-full" />
                              ) : (
                                renderLibraryIcon(item.mediaType)
                              )}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
                              <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{item.fileName}</p>
                          <p className="text-[11px] text-muted-foreground/60">
                            {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        {activeTab === 'upload' && mediaFiles.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''} ready to send
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        {activeTab === 'library' && selectedLibraryId && (
          <div className="flex items-center justify-end p-4 border-t bg-muted/30 gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSelectedLibraryId(null); setLibraryCaption(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 gap-1.5"
              onClick={handleSendFromLibrary}
              disabled={sendingFromLibrary}
            >
              {sendingFromLibrary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send this media
            </Button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.xml"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
} 