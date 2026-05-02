import { QueryClient } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import type { TastingNote } from '@/types';

// ─── Query client ─────────────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,       // 10 minutes — serve cache before refetch
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days — keep in MMKV when offline
      retry: 1,
    },
  },
});

// ─── MMKV-backed offline persistence ─────────────────────────────────────────

const queryCache = createMMKV({ id: 'cru-query-cache' });

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => queryCache.getString(key) ?? null,
    setItem: (key, value) => queryCache.set(key, value),
    removeItem: (key) => queryCache.remove(key),
  },
});

let persistenceSetUp = false;

/** Call once at app startup (in root _layout.tsx). Safe to call multiple times. */
export function setupQueryPersistence(): void {
  if (persistenceSetUp) return;
  persistenceSetUp = true;
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// ─── Note draft storage ───────────────────────────────────────────────────────
// Auto-saved every 30 seconds while the note form is open.
// Restored on next open until submitted or discarded.

const draftStore = createMMKV({ id: 'cru-drafts' });
const DRAFT_KEY = 'note-draft';

export const noteDraftStorage = {
  save(draft: Partial<TastingNote>): void {
    draftStore.set(DRAFT_KEY, JSON.stringify(draft));
  },
  load(): Partial<TastingNote> | null {
    const raw = draftStore.getString(DRAFT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as Partial<TastingNote>; }
    catch { return null; }
  },
  clear(): void {
    draftStore.remove(DRAFT_KEY);
  },
};
