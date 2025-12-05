/**
 * ResourceUploader Component
 *
 * Drag-and-drop file upload with type detection.
 *
 * @module components/resources/ResourceUploader
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResourceTypeIcon } from './ResourceTypeIcon';
import type { ResourceType } from '@/types/resource.types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const mimeToType: Record<string, ResourceType> = {
  'text/plain': 'document',
  'text/markdown': 'prompt',
  'application/json': 'data',
  'text/csv': 'data',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'document',
};

const acceptedMimeTypes = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/pdf': ['.pdf'],
};

interface ResourceUploaderProps {
  onFileSelect: (file: File, detectedType: ResourceType) => void;
  uploadProgress?: number;
  disabled?: boolean;
}

export function ResourceUploader({
  onFileSelect,
  uploadProgress,
  disabled,
}: ResourceUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<ResourceType | null>(null);

  const detectType = (file: File): ResourceType => {
    // Check MIME type first
    if (mimeToType[file.type]) {
      return mimeToType[file.type];
    }

    // Fallback to extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'md') return 'prompt';
    if (ext === 'json' || ext === 'csv') return 'data';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (ext === 'pdf' || ext === 'txt') return 'document';

    return 'document'; // Default fallback
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(`File exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
        } else {
          setError('File type not allowed');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const type = detectType(file);
        setSelectedFile(file);
        setDetectedType(type);
        onFileSelect(file, type);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedMimeTypes,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled,
  });

  const clearFile = () => {
    setSelectedFile(null);
    setDetectedType(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive && 'border-primary bg-primary/5',
          isDragAccept && 'border-green-500 bg-green-500/5',
          isDragReject && 'border-destructive bg-destructive/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && 'hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg">Drop file here...</p>
        ) : (
          <>
            <p className="text-lg mb-1">Drag and drop a file, or click to select</p>
            <p className="text-sm text-muted-foreground">
              Images, audio, documents, JSON, CSV up to {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedFile && detectedType && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          <ResourceTypeIcon type={detectedType} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)} • Detected as {detectedType}
            </p>
          </div>
          {uploadProgress !== undefined ? (
            <div className="w-24">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={clearFile}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceUploader;
