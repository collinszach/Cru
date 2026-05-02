'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const SYNC_SESSION_KEY = 'cru:user_synced';

interface CruUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  home_country: string | null;
  scoring_system: string;
  preferences: Record<string, unknown>;
  created_at: string;
}

export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // ── Sync mutation — POST /api/v1/me/sync ────────────────────────────────
  const syncMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/me/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
      return res.json() as Promise<CruUser>;
    },
    onSuccess: (data) => {
      // Seed the profile cache immediately from the sync response
      queryClient.setQueryData(['cru-user'], data);
      sessionStorage.setItem(SYNC_SESSION_KEY, '1');
    },
  });

  // ── Fire sync once per browser session ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) return;
    if (sessionStorage.getItem(SYNC_SESSION_KEY)) return;
    syncMutation.mutate();
    // syncMutation is stable — intentionally omitted from deps to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // ── Profile query — GET /api/v1/me ──────────────────────────────────────
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<CruUser>({
    queryKey: ['cru-user'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
      return res.json() as Promise<CruUser>;
    },
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry 404 — user record may not exist yet (sync in flight)
      if (error instanceof Error && error.message.includes('404')) return false;
      return failureCount < 2;
    },
  });

  const scoringSystem = user?.scoring_system ?? '100pt';

  return { user, isLoading, scoringSystem, refetch };
}
