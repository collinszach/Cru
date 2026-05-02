'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Compass, Search } from 'lucide-react';
import { discoverApi, statsApi } from '@/lib/api';
import type { RecommendationResult, WineStyle } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import RecommendationCard, { type RecommendationCardProps } from '@/components/discover/RecommendationCard';
import PalateRadar from '@/components/discover/PalateRadar';

// Style filter options
const STYLE_FILTERS: { label: string; value: WineStyle | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Red', value: 'red' },
  { label: 'White', value: 'white' },
  { label: 'Rosé', value: 'rose' },
  { label: 'Sparkling', value: 'sparkling' },
  { label: 'Fortified', value: 'port' },
];

function StyleFilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-ui px-3 py-1.5 rounded-full border transition-all duration-150 ${
        active
          ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
          : 'border-cru-border text-cru-text-muted hover:text-cru-text'
      }`}
    >
      {label}
    </button>
  );
}

// Shape from API — backend returns flat fields on result
function toCardWine(result: RecommendationResult): RecommendationCardProps['wine'] {
  return {
    id: result.wine_id,
    full_name: result.full_name,
    producer: undefined,
    appellation: undefined,
    style: result.style,
    color: result.color ?? undefined,
    distance: result.distance,
  };
}

export default function DiscoverPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [styleFilter, setStyleFilter] = useState<WineStyle | 'all'>('all');
  const [nlQuery, setNlQuery] = useState('');
  const [nlResults, setNlResults] = useState<RecommendationResult[] | null>(null);

  // Recommendations
  const { data: recommendations, isLoading: loadingRecs, isError: recsError } = useQuery({
    queryKey: ['recommendations', styleFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return discoverApi.recommendations(token, {
        style: styleFilter === 'all' ? undefined : styleFilter,
      });
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Palate profile (for sidebar radar)
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['palate-radar'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.palateRadar(token);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Natural language search
  const nlMutation = useMutation({
    mutationFn: async (query: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return discoverApi.naturalLanguageSearch(token, query);
    },
    onSuccess: (data) => setNlResults(data),
  });

  const handleNlSearch = () => {
    if (nlQuery.trim()) {
      nlMutation.mutate(nlQuery.trim());
    }
  };

  const displayRecs = nlResults ?? recommendations ?? [];
  const isLoading = loadingRecs && !nlResults;
  const noProfile = recsError && !nlResults;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1
            className="font-display text-4xl text-cru-text"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Discover
          </h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            Wines matched to your palate
          </p>
        </div>
        <Link href="/discover/blind">
          <Button variant="outline" size="sm">
            Blind Tasting Mode
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Left: Recommendations list */}
        <div>
          {/* Style filter pills */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {STYLE_FILTERS.map((f) => (
              <StyleFilterPill
                key={f.value}
                label={f.label}
                active={styleFilter === f.value}
                onClick={() => setStyleFilter(f.value)}
              />
            ))}
          </div>

          {/* Natural language search */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Find something like… "a structured Burgundy under $80"`}
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNlSearch()}
                className="flex-1 h-9 px-3 text-sm font-ui bg-cru-surface border border-cru-border rounded focus:border-cru-accent-garnet focus:ring-2 focus:ring-[rgba(107,25,41,0.08)] outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Search className="h-3.5 w-3.5" />}
                loading={nlMutation.isPending}
                onClick={handleNlSearch}
              >
                Search
              </Button>
            </div>
            {nlResults !== null && (
              <button
                onClick={() => {
                  setNlResults(null);
                  setNlQuery('');
                }}
                className="mt-2 font-ui text-xs text-cru-text-subtle hover:text-cru-text-muted transition-colors"
              >
                Clear search
              </button>
            )}
            {nlMutation.isError && (
              <p className="mt-2 font-ui text-xs text-red-700">
                Search failed. Please try again.
              </p>
            )}
          </div>

          {/* Recommendation list */}
          {isLoading ? (
            <div className="bg-cru-surface border border-cru-border rounded shadow-sm overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-5 px-5 py-4 border-b border-cru-border"
                >
                  <div className="skeleton h-4 w-4 rounded" />
                  <div
                    className="w-1 self-stretch skeleton rounded-full"
                    style={{ minHeight: 36 }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-24 rounded" />
                    <div className="skeleton h-4 w-48 rounded" />
                  </div>
                  <div className="skeleton h-5 w-10 rounded" />
                </div>
              ))}
            </div>
          ) : noProfile ? (
            <EmptyState
              icon={Compass}
              title="Building your taste profile"
              description="Your tasting notes are being processed. Recommendations will appear once your palate profile is ready — this usually takes a few minutes after logging notes."
            />
          ) : displayRecs.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Not enough data yet"
              description="Add tasting notes to build your palate profile. Recommendations improve with every wine you rate."
            />
          ) : (
            <div className="bg-cru-surface border border-cru-border rounded shadow-sm overflow-hidden">
              {displayRecs.map((rec, i) => (
                <div
                  key={rec.wine_id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/wines/${rec.wine_id}`)}
                >
                  <RecommendationCard
                    wine={toCardWine(rec)}
                    rank={i + 1}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Palate radar */}
        <div className="space-y-4">
          <div className="bg-cru-surface border border-cru-border rounded shadow-sm p-5">
            <h2
              className="font-display text-lg text-cru-text mb-4"
              style={{ fontWeight: 500 }}
            >
              Your Palate
            </h2>
            {loadingProfile ? (
              <div className="skeleton rounded" style={{ height: 260 }} />
            ) : profile ? (
              <PalateRadar profile={profile} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
