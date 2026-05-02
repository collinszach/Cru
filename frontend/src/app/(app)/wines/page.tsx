'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Search, Wine } from 'lucide-react';
import { winesApi } from '@/lib/api';
import type { Wine as WineType, WineColor } from '@/types';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { WineStyleBadge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';

const COLOR_FILTER_OPTIONS: Array<{ value: WineColor | ''; label: string; dot: string }> = [
  { value: '', label: 'All', dot: '#7A6E65' },
  { value: 'red', label: 'Red', dot: '#6B1929' },
  { value: 'white', label: 'White', dot: '#8B7355' },
  { value: 'rose', label: 'Rosé', dot: '#B86B6B' },
  { value: 'orange', label: 'Orange', dot: '#B86B2E' },
];

function WineCard({ wine }: { wine: WineType }) {
  return (
    <Link href={`/wines/${wine.id}`}>
      <div className="group flex items-start gap-4 p-4 rounded border border-cru-border bg-cru-surface hover:border-cru-accent-garnet/20 hover:bg-cru-surface-raised transition-all duration-150 cursor-pointer shadow-sm">
        {/* Color dot */}
        <div className="flex-shrink-0 pt-1">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                wine.color === 'red'
                  ? 'var(--cru-red)'
                  : wine.color === 'white'
                  ? 'var(--cru-white)'
                  : wine.color === 'rose'
                  ? 'var(--cru-rose)'
                  : wine.color === 'orange'
                  ? 'var(--cru-orange)'
                  : 'var(--cru-accent-slate)',
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Producer */}
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-wide truncate">
            {wine.producer?.name}
          </p>
          {/* Wine name */}
          <p className="text-base font-display italic text-cru-text group-hover:text-cru-accent-garnet transition-colors truncate">
            {wine.full_name}
          </p>
          {/* Appellation + classification */}
          <p className="text-xs font-ui text-cru-text-muted mt-0.5 truncate">
            {[wine.appellation?.name, wine.classification]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {/* Grapes */}
          {wine.primary_grapes.length > 0 && (
            <p className="text-2xs font-ui text-cru-text-muted mt-1">
              {wine.primary_grapes.map((g) => g.grape).join(', ')}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          <WineStyleBadge style={wine.style} color={wine.color ?? undefined} />
        </div>
      </div>
    </Link>
  );
}

function WineCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded border border-cru-border bg-cru-surface">
      <div className="skeleton h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="skeleton h-5 w-12 rounded flex-shrink-0" />
    </div>
  );
}

export default function WinesPage() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<WineColor | ''>('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Simple debounce via state
  const handleSearch = (value: string) => {
    setQuery(value);
    // Minimal debounce: just use query directly, TanStack Query handles caching
    setDebouncedQuery(value);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['wines', debouncedQuery, colorFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return winesApi.search(token, {
        query: debouncedQuery || undefined,
        color: colorFilter || undefined,
        per_page: 50,
      });
    },
  });

  const wines = data?.items ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Wine Database</h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            Search producers, appellations, and cuvées.
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <Input
          placeholder="Search by producer, wine name, or appellation…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          leftAdornment={<Search className="h-3.5 w-3.5" />}
        />

        {/* Color filters */}
        <div className="flex items-center gap-2">
          {COLOR_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setColorFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-ui transition-colors ${
                colorFilter === opt.value
                  ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
                  : 'border-cru-border text-cru-text-muted hover:text-cru-text'
              }`}
            >
              {opt.value && (
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.dot }}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && data && (
        <p className="text-xs font-ui text-cru-text-muted">
          <span className="font-mono text-cru-text">{data.total.toLocaleString()}</span>{' '}
          {data.total === 1 ? 'wine' : 'wines'}
          {query && ` matching "${query}"`}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <WineCardSkeleton key={i} />
          ))}
        </div>
      ) : wines.length === 0 ? (
        <EmptyState
          icon={Wine}
          title={query ? 'No wines found' : 'No wines yet'}
          description={
            query
              ? `No wines match "${query}". Try a different search term.`
              : 'The wine database is empty. Add wines through the cellar intake flow.'
          }
        />
      ) : (
        <div className="space-y-2">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}
    </div>
  );
}
