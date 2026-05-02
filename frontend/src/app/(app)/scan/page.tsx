'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import LabelScanner from '@/components/scanner/LabelScanner';
import ScanConfirm, { type ConfirmedWineData } from '@/components/scanner/ScanConfirm';
import { cellarApi, notesApi } from '@/lib/api';
import type { LabelScanResult } from '@/types';

// ─── State machine ────────────────────────────────────────────────────────────

type FlowState = 'scanning' | 'confirming' | 'submitting';

export default function ScanPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [flowState, setFlowState] = useState<FlowState>('scanning');
  const [scanResult, setScanResult] = useState<LabelScanResult | null>(null);
  const [photoId, setPhotoId] = useState<string>('');
  const [presignedUrl, setPresignedUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleScanComplete = useCallback(
    (result: LabelScanResult, pid: string, pUrl: string) => {
      setScanResult(result);
      setPhotoId(pid);
      setPresignedUrl(pUrl);
      setFlowState('confirming');
    },
    [],
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setPhotoId('');
    setPresignedUrl('');
    setError(null);
    setFlowState('scanning');
  }, []);

  const handleConfirm = useCallback(
    async (action: 'cellar' | 'note' | 'save', data: ConfirmedWineData) => {
      setFlowState('submitting');
      setError(null);

      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');

        if (action === 'cellar') {
          // Requires a wine_id — if we have a matched wine use it, otherwise
          // create the wine first via the scanner/confirm endpoint (handled by backend).
          // For now we navigate to cellar with a toast; full create-wine flow is Phase 3b.
          if (data.matched_wine_id) {
            await cellarApi.add(token, {
              wine_id: data.matched_wine_id,
              vintage: data.vintage ?? new Date().getFullYear(),
              quantity: 1,
            });
          }
          router.push('/cellar?scanned=1');
          return;
        }

        if (action === 'note') {
          if (data.matched_wine_id) {
            const note = await notesApi.create(token, {
              wine_id: data.matched_wine_id,
              vintage: data.vintage ?? new Date().getFullYear(),
              tasted_at: new Date().toISOString(),
            });
            router.push(`/journal/${note.id}`);
            return;
          }
          router.push('/journal?scanned=1');
          return;
        }

        // 'save' — just navigate back
        router.push('/cellar?saved=1');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setFlowState('confirming');
      }
    },
    [getToken, router],
  );

  if (flowState === 'scanning') {
    return <LabelScanner onScanComplete={handleScanComplete} onCancel={handleCancel} />;
  }

  if ((flowState === 'confirming' || flowState === 'submitting') && scanResult) {
    return (
      <div className="relative">
        {flowState === 'submitting' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cru-bg/90 backdrop-blur-sm">
            <div className="text-center space-y-3 cru-card p-8 rounded">
              <div className="w-10 h-10 rounded-full border-2 border-cru-accent-garnet border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-ui text-cru-text-muted tracking-widest">
                Adding to collection…
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded text-sm font-ui border border-red-200 bg-red-50 text-red-700"
          >
            {error}
          </div>
        )}

        <ScanConfirm
          extractedData={scanResult}
          photoId={photoId}
          presignedUrl={presignedUrl}
          onConfirm={handleConfirm}
          onRescan={handleRescan}
        />
      </div>
    );
  }

  return null;
}
