'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { notesApi } from '@/lib/api';
import NoteTimeline from '@/components/tasting/NoteTimeline';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { ScoringSystem } from '@/types';

type SortOption = 'date' | 'score' | 'wine';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'score', label: 'Score' },
  { value: 'wine', label: 'Wine' },
];

export default function JournalPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const scoringSystem: ScoringSystem =
    (user?.publicMetadata?.scoring_system as ScoringSystem) ?? '100pt';

  const { data, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return notesApi.list(token, { per_page: 100 });
    },
  });

  const notes = data?.items ?? [];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1
            className="font-display text-4xl text-cru-text"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Journal
          </h1>
          {data && (
            <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
              <span className="font-mono text-cru-accent-garnet">
                {data.total.toLocaleString()}
              </span>
              {' '}{data.total === 1 ? 'note' : 'notes'}
            </p>
          )}
        </div>
        <Link href="/journal/new">
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Note
          </Button>
        </Link>
      </div>

      {/* Sort controls */}
      {notes.length > 1 && (
        <div className="flex items-center gap-1.5 mb-7">
          <span className="font-ui text-xs text-cru-text-subtle mr-2">Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-ui transition-all duration-150 border ${
                sortBy === opt.value
                  ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-text font-medium'
                  : 'border-cru-border text-cru-text-muted hover:text-cru-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your first note awaits"
          description="Open a bottle and begin. Every great palate is built one note at a time."
          action={
            <Link href="/journal/new">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Write Your First Note
              </Button>
            </Link>
          }
        />
      ) : (
        <NoteTimeline
          notes={notes}
          scoringSystem={scoringSystem}
          onNoteClick={(id) => router.push(`/journal/${id}`)}
          sortBy={sortBy}
        />
      )}
    </div>
  );
}
