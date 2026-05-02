'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { scannerApi } from '@/lib/api';
import type { LabelScanResult } from '@/types';

interface LabelScannerProps {
  onScanComplete: (result: LabelScanResult, photoId: string, presignedUrl: string) => void;
  onCancel: () => void;
}

type ScannerState = 'idle' | 'camera' | 'captured' | 'scanning' | 'complete' | 'error';

export default function LabelScanner({ onScanComplete, onCancel }: LabelScannerProps) {
  const { getToken } = useAuth();
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('camera');
    } catch {
      setErrorMessage('Camera access denied. Please use the upload option instead.');
      setState('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();

    // Convert data URL to File
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'label.jpg', { type: 'image/jpeg' });
        setCapturedFile(file);
      }
    }, 'image/jpeg', 0.92);

    setState('captured');
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setCapturedFile(file);
    setState('captured');
  }, []);

  const runScan = useCallback(async () => {
    if (!capturedFile) return;
    setState('scanning');
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await scannerApi.scanLabel(token, capturedFile);
      setState('complete');
      // The API should return photo_id and presigned_url alongside the scan result
      const photoId = (result as LabelScanResult & { photo_id?: string }).photo_id ?? '';
      const presignedUrl = capturedImage ?? '';
      setTimeout(() => {
        onScanComplete(result, photoId, presignedUrl);
      }, 600);
    } catch {
      setErrorMessage("Couldn't read this label. Try a clearer photo.");
      setState('error');
    }
  }, [capturedFile, capturedImage, getToken, onScanComplete]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setCapturedFile(null);
    setErrorMessage('');
    stopCamera();
    setState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(13, 11, 9, 0.97)' }}
    >
      {/* Close button */}
      <button
        onClick={() => { stopCamera(); onCancel(); }}
        className="absolute top-6 right-6 p-2 rounded-full text-cru-text-muted hover:text-cru-text transition-colors"
        style={{ backgroundColor: 'var(--cru-surface-raised)' }}
        aria-label="Cancel"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm font-ui uppercase tracking-widest text-cru-text-muted">
          Label Scanner
        </p>
      </div>

      {/* Viewfinder */}
      <div className="relative" style={{ width: 340, height: 460 }}>
        {/* Gold corner markers */}
        <CornerMarkers active={state === 'camera'} />

        {/* Media container */}
        <div
          className="absolute inset-3 overflow-hidden"
          style={{ borderRadius: '2px' }}
        >
          {/* Video feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: state === 'camera' ? 'block' : 'none' }}
            playsInline
            muted
          />

          {/* Captured still */}
          {capturedImage && state !== 'camera' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImage}
              alt="Captured label"
              className="w-full h-full object-cover"
            />
          )}

          {/* Idle placeholder */}
          {state === 'idle' && (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--cru-surface)' }}
            >
              <div className="text-center space-y-3">
                <Camera className="h-12 w-12 mx-auto" style={{ color: 'var(--cru-accent-garnet)', opacity: 0.4 }} />
              </div>
            </div>
          )}

          {/* Scan sweep animation */}
          {state === 'scanning' && (
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden
            >
              <div className="scan-sweep" />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(139,26,46,0.06) 0%, transparent 100%)',
                }}
              />
            </div>
          )}

          {/* Complete flash */}
          {state === 'complete' && (
            <div
              className="absolute inset-0 flex items-center justify-center animate-fade-in"
              style={{ backgroundColor: 'rgba(201, 168, 76, 0.12)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--cru-accent-gold)', color: '#0d0b09' }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Scanning progress label */}
        {state === 'scanning' && (
          <div className="absolute -bottom-10 left-0 right-0 text-center">
            <p className="text-xs font-ui text-cru-text-muted tracking-widest animate-pulse">
              Reading the label&hellip;
            </p>
          </div>
        )}
      </div>

      {/* Caption (idle/camera state) */}
      {(state === 'idle' || state === 'camera') && (
        <p
          className="mt-8 text-xl font-display italic"
          style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.01em' }}
        >
          {state === 'idle' ? 'Reveal the label' : 'Point at the label'}
        </p>
      )}

      {/* Canvas (off-screen) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Action controls */}
      <div className="mt-10 flex flex-col items-center gap-4">
        {state === 'idle' && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-3 px-8 py-3.5 rounded font-ui text-sm transition-all duration-150"
              style={{
                backgroundColor: 'var(--cru-accent-garnet)',
                color: 'var(--cru-text)',
                letterSpacing: '0.04em',
              }}
            >
              <Camera className="h-4 w-4" />
              Open Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-ui text-cru-text-muted hover:text-cru-text transition-colors underline underline-offset-4"
              style={{ textDecorationColor: 'var(--cru-border)' }}
            >
              or upload a photo
            </button>
          </>
        )}

        {state === 'camera' && (
          <button
            onClick={capturePhoto}
            className="rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              width: 72,
              height: 72,
              backgroundColor: 'var(--cru-accent-garnet)',
              boxShadow: '0 0 0 3px rgba(139,26,46,0.3), 0 0 0 6px rgba(139,26,46,0.1)',
            }}
            aria-label="Capture photo"
          />
        )}

        {state === 'captured' && (
          <div className="flex items-center gap-4">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 rounded font-ui text-sm text-cru-text-muted hover:text-cru-text transition-colors"
              style={{ border: '1px solid var(--cru-border)' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retake
            </button>
            <button
              onClick={runScan}
              className="px-8 py-2.5 rounded font-ui text-sm transition-all duration-150"
              style={{
                backgroundColor: 'var(--cru-accent-garnet)',
                color: 'var(--cru-text)',
                letterSpacing: '0.04em',
              }}
            >
              Scan Label
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 max-w-xs text-center">
            <p className="text-sm font-body" style={{ color: 'var(--cru-rose)' }}>
              {errorMessage}
            </p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-2.5 rounded font-ui text-sm text-cru-text-muted hover:text-cru-text transition-colors"
              style={{ border: '1px solid var(--cru-border)' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        )}
      </div>

      <style>{`
        .scan-sweep {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, var(--cru-accent-garnet), transparent);
          box-shadow: 0 0 12px 4px rgba(139, 26, 46, 0.5);
          animation: scan-sweep 3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        @keyframes scan-sweep {
          0%   { top: 0%;   opacity: 1; }
          90%  { top: 95%;  opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Corner Markers ───────────────────────────────────────────────────────────

function CornerMarkers({ active }: { active: boolean }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: active ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-gold)',
    transition: 'border-color 0.4s ease',
    opacity: active ? 1 : 0.7,
  };

  return (
    <>
      <div style={{ ...style, top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }} />
      <div style={{ ...style, top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }} />
      <div style={{ ...style, bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }} />
      <div style={{ ...style, bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }} />
    </>
  );
}
