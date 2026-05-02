'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Sparkles, X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@clerk/nextjs';
import type { LabelScanResult, PhotoType } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface PhotoUploadProps {
  wineId?: string
  cellarEntryId?: string
  tastingNoteId?: string
  type: PhotoType
  onUpload: (photoId: string, storageKey: string) => void
  onScan?: (extractedData: LabelScanResult) => void
}

interface UploadedPhoto {
  id: string
  storageKey: string
  previewUrl: string
}

export default function PhotoUpload({
  wineId,
  cellarEntryId,
  tastingNoteId,
  type,
  onUpload,
  onScan,
}: PhotoUploadProps) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function uploadFile(file: File) {
    setError(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (wineId) formData.append('wine_id', wineId);
      if (cellarEntryId) formData.append('cellar_entry_id', cellarEntryId);
      if (tastingNoteId) formData.append('tasting_note_id', tastingNoteId);

      const response = await fetch(`${API_BASE}/api/v1/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string; storage_key: string };
      const uploaded: UploadedPhoto = {
        id: data.id,
        storageKey: data.storage_key,
        previewUrl: preview ?? '',
      };
      setPhoto(uploaded);
      onUpload(data.id, data.storage_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleScan() {
    if (!photo || !onScan) return;
    setIsScanning(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Phase 3: this triggers Claude Vision extraction
      // For Phase 2 we POST to the scan endpoint with the existing photo id
      const response = await fetch(`${API_BASE}/api/v1/scanner/label`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_id: photo.id }),
      });

      if (!response.ok) throw new Error('Scan failed');
      const data = await response.json() as LabelScanResult;
      onScan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }

  function clear() {
    setPhoto(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      {/* Drop zone / preview */}
      <div
        className={clsx(
          'relative rounded-lg overflow-hidden transition-all duration-200 cursor-pointer',
          isDragging && 'shadow-garnet-glow',
        )}
        style={{
          border: `2px dashed ${
            error
              ? '#ef4444'
              : isDragging
              ? 'var(--cru-accent-garnet)'
              : preview
              ? 'var(--cru-border)'
              : 'var(--cru-border)'
          }`,
          minHeight: preview ? 'auto' : '140px',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !preview && inputRef.current?.click()}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Uploaded"
                className="w-full object-cover rounded-lg"
                style={{ maxHeight: '300px' }}
              />

              {/* Loading shimmer */}
              {isUploading && (
                <div
                  className="absolute inset-0 rounded-lg skeleton"
                  style={{ opacity: 0.7 }}
                />
              )}

              {/* Clear button */}
              {!isUploading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clear(); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-warm"
                  style={{ background: 'rgba(13, 11, 9, 0.8)', border: '1px solid var(--cru-border)' }}
                >
                  <X className="h-3.5 w-3.5 text-cru-text" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-8 text-center"
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200',
                  isDragging
                    ? 'bg-cru-accent-garnet/20'
                    : 'bg-cru-surface-raised',
                )}
              >
                {type === 'label' ? (
                  <Camera
                    className={clsx(
                      'h-5 w-5 transition-colors duration-200',
                      isDragging ? 'text-cru-accent-garnet' : 'text-cru-text-muted',
                    )}
                  />
                ) : (
                  <Upload
                    className={clsx(
                      'h-5 w-5 transition-colors duration-200',
                      isDragging ? 'text-cru-accent-garnet' : 'text-cru-text-muted',
                    )}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-ui text-cru-text-muted">
                  {isDragging
                    ? 'Drop to upload'
                    : type === 'label'
                    ? 'Drop label photo here or click to upload'
                    : 'Drop photo here or click to upload'}
                </p>
                <p className="text-2xs font-ui text-cru-text-muted/50 mt-1">
                  JPG, PNG, HEIC up to 20MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-3 py-2 rounded"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs font-ui text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan button — Phase 3 hook */}
      {type === 'label' && onScan && photo && !isUploading && (
        <motion.button
          type="button"
          onClick={handleScan}
          disabled={isScanning}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-ui transition-all duration-150 disabled:opacity-50"
          style={{
            border: '1px solid var(--cru-accent-gold)',
            color: 'var(--cru-accent-gold)',
            background: 'rgba(201, 168, 76, 0.06)',
          }}
        >
          <Sparkles className="h-4 w-4" />
          {isScanning ? 'Scanning label...' : 'Scan with AI'}
        </motion.button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
