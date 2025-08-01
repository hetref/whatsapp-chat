"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Image as ImageIcon, FileText, Music, Video, Send, Loader2, Paperclip } from "lucide-react";
import Image from "next/image";

interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'document' | 'audio' | 'video';
  preview?: string;
  caption?: string;
}

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (files: MediaFile[]) => Promise<void>;
  selectedUser: { id: string; name: string } | null;
}

export function MediaUpload({ isOpen, onClose, onSend, selectedUser }: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMediaFiles: MediaFile[] = [];

    for (const file of fileArray) {
      // Check file size (max 25MB for WhatsApp)
      if (file.size > 25 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 25MB.`);
        continue;
      }

      const preview = await createFilePreview(file);
      const mediaFile: MediaFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: getFileType(file),
        preview,
        caption: '',
      };

      newMediaFiles.push(mediaFile);
    }

    setMediaFiles(prev => [...prev, ...newMediaFiles]);
  };

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
  }, []);

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Drag and Drop Area */}
          {mediaFiles.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
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

        {/* Footer */}
        {mediaFiles.length > 0 && (
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
} 