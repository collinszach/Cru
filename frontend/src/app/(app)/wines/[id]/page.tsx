'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus, ExternalLink, Grape } from 'lucide-react';
import { winesApi, cellarApi, notesApi, discoverApi, statsApi } from '@/lib/api';
import RecommendationCard from '@/components/discover/RecommendationCard';
import { WineStyleBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import DrinkingWindowBadge from '@/components/cellar/DrinkingWindowBadge';

export default function WineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const { data: wine, isLoading } = useQuery({
    queryKey: ['wine', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return winesApi.get(token, id);
    },
    enabled: !!id,
  });

  const { data: cellarData } = useQuery({
    queryKey: ['cellar', { wine_id: id }],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.list(token, { status: 'all', per_page: 20 });
    },
    enabled: !!id,
    select: (data) => data.items.filter((e) => e.wine_id === id),
  });

  const { data: notesData } = useQuery({
    queryKey: ['notes', { wine_id: id }],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return notesApi.list(token, { wine_id: id, per_page: 10 });
    },
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['palate-radar'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.palateRadar(token);
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: similarWines } = useQuery({
    queryKey: ['similar', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return discoverApi.similar(token, id);
    },
    enabled: !!id && (profile?.note_count ?? 0) >= 3,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return <PageLoader />;
  if (!wine) {
    return (
      <div className="text-sm font-ui text-cru-text-muted">Wine not found.</div>
    );
  }

  const cellarEntries = cellarData ?? [];
  const notes = notesData?.items ?? [];
  const totalBottles = cellarEntries
    .filter((e) => e.status === 'in_cellar')
    .reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="max-w-4xl space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
        <Link href="/wines" className="hover:text-cru-text transition-colors">
          Wines
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-cru-text truncate max-w-xs">{wine.full_name}</span>
      </nav>

      {/* Hero section */}
      <div className="page-header-rule space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            {/* Producer */}
            {wine.producer && (
              <p className="font-ui text-sm uppercase tracking-wider text-cru-text-muted mb-2">
                {wine.producer.name}
              </p>
            )}

            {/* Wine name */}
            <h1
              className="font-display italic text-5xl leading-tight text-cru-text"
              style={{ letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              {wine.name}
            </h1>

            {/* Appellation + classification */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {wine.appellation && (
                <span className="font-ui text-sm text-cru-text-muted">
                  {wine.appellation.name}
                </span>
              )}
              {wine.classification && (
                <>
                  <span className="text-cru-border">·</span>
                  <span className="font-ui text-sm text-cru-accent-gold">
                    {wine.classification}
                  </span>
                </>
              )}
              {wine.appellation?.country && (
                <>
                  <span className="text-cru-border">·</span>
                  <span className="font-ui text-sm text-cru-text-muted">
                    {wine.appellation.country}
                  </span>
                </>
              )}
            </div>

            {/* Style badge + grapes */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <WineStyleBadge style={wine.style} color={wine.color ?? undefined} />
              {wine.primary_grapes.map((g) => (
                <span
                  key={g.grape}
                  className="flex items-center gap-1 font-ui text-xs text-cru-text-muted"
                >
                  <Grape className="h-3 w-3" />
                  {g.grape}
                  {g.pct != null && (
                    <span className="font-mono text-2xs ml-0.5">{g.pct}%</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Add to cellar CTA */}
          <div className="flex-shrink-0">
            <Link href={`/cellar/intake?wine_id=${wine.id}`}>
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Add to Cellar
              </Button>
            </Link>
          </div>
        </div>

        {/* Description */}
        {wine.description && (
          <div className="mt-4 p-5 rounded border border-cru-border bg-cru-surface">
            <p className="font-ui text-sm text-cru-text-muted leading-relaxed">
              {wine.description}
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="divider-garnet" />

      {/* Your cellar entries for this wine */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-cru-text mb-4" style={{ fontWeight: 500 }}>
            In Your Cellar
            {totalBottles > 0 && (
              <span className="ml-3 font-mono text-xl text-cru-accent-garnet">
                {totalBottles}
              </span>
            )}
          </h2>
        </div>

        {cellarEntries.length === 0 ? (
          <p className="font-ui text-sm text-cru-text-muted">
            You don&apos;t have this wine in your cellar.{' '}
            <Link
              href={`/cellar/intake?wine_id=${wine.id}`}
              className="text-cru-accent-garnet hover:underline transition-colors"
            >
              Add a bottle.
            </Link>
          </p>
        ) : (
          <div className="bg-cru-surface border border-cru-border rounded overflow-hidden shadow-sm">
            {cellarEntries.map((entry) => (
              <Link key={entry.id} href={`/cellar/${entry.id}`}>
                <div className="flex items-center gap-4 p-4 border-b border-cru-border hover:bg-cru-surface-raised transition-colors last:border-b-0">
                  {/* Vintage hero */}
                  <span className="font-mono text-5xl text-cru-accent-garnet w-24 flex-shrink-0 leading-none" style={{ fontWeight: 500 }}>
                    {entry.vintage}
                  </span>
                  <div className="flex-1">
                    <p className="font-ui text-xs text-cru-text-muted">
                      {entry.quantity} × {entry.format ?? '750ml'}
                      {entry.bin_location && ` · ${entry.bin_location}`}
                    </p>
                    {entry.purchase_price != null && (
                      <p className="font-mono text-xs text-cru-text-muted">
                        {entry.currency} {entry.purchase_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {entry.drinking_window_status && (
                    <DrinkingWindowBadge
                      status={entry.drinking_window_status}
                      compact
                    />
                  )}
                  <span
                    className={`font-ui text-xs px-2 py-0.5 rounded border ${
                      entry.status === 'in_cellar'
                        ? 'text-green-700 border-green-200 bg-green-50'
                        : 'text-cru-text-muted border-cru-border bg-cru-surface'
                    }`}
                  >
                    {entry.status === 'in_cellar' ? 'In Cellar' : entry.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tasting notes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>
            Your Notes
          </h2>
          <Link href={`/journal/new?wine_id=${wine.id}`}>
            <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Note
            </Button>
          </Link>
        </div>

        {notes.length === 0 ? (
          <p className="font-ui text-sm text-cru-text-muted">
            No tasting notes yet for this wine.{' '}
            <Link
              href={`/journal/new?wine_id=${wine.id}`}
              className="text-cru-accent-garnet hover:underline transition-colors"
            >
              Write your first note.
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-5xl text-cru-accent-garnet leading-none" style={{ fontWeight: 500 }}>
                      {note.vintage}
                    </span>
                    <span className="font-ui text-xs text-cru-text-muted">
                      {new Date(note.tasted_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {note.personal_score != null && (
                    <div className="text-right">
                      <span className="font-mono text-2xl text-cru-text" style={{ fontWeight: 500 }}>
                        {note.personal_score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Critic scores row */}
                {(note.parker_score || note.spectator_score || note.jancis_score || note.decanter_score) && (
                  <div className="flex items-center gap-6 pt-2 border-t border-cru-border">
                    {note.parker_score && (
                      <div>
                        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Parker</p>
                        <p className="font-mono text-2xl text-cru-text">{note.parker_score}</p>
                      </div>
                    )}
                    {note.spectator_score && (
                      <div>
                        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Spectator</p>
                        <p className="font-mono text-2xl text-cru-text">{note.spectator_score}</p>
                      </div>
                    )}
                    {note.jancis_score && (
                      <div>
                        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Jancis</p>
                        <p className="font-mono text-2xl text-cru-text">{note.jancis_score}</p>
                      </div>
                    )}
                    {note.decanter_score && (
                      <div>
                        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Decanter</p>
                        <p className="font-mono text-2xl text-cru-text">{note.decanter_score}</p>
                      </div>
                    )}
                  </div>
                )}

                {note.free_note && (
                  <p className="font-ui text-sm text-cru-text leading-relaxed">
                    {note.free_note}
                  </p>
                )}

                {note.ai_enhanced_note && (
                  <div
                    className="mt-2 pt-3 border-t border-cru-border"
                    style={{ borderStyle: 'dashed' }}
                  >
                    <p className="font-ui text-2xs text-cru-accent-gold uppercase tracking-wider mb-1">
                      Enhanced
                    </p>
                    <p className="font-ui text-sm text-cru-text-muted leading-relaxed italic">
                      {note.ai_enhanced_note}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Similar Wines — only when user has taste profile */}
      {(profile?.note_count ?? 0) >= 3 && similarWines && similarWines.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display italic text-2xl text-cru-text" style={{ fontWeight: 500 }}>
            Wines like this one
          </h2>

          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none' }}
          >
            {similarWines.slice(0, 4).map((result) => (
              <div
                key={result.wine_id}
                className="flex-shrink-0 cursor-pointer"
                style={{ width: 280 }}
                onClick={() =>
                  (window.location.href = `/wines/${result.wine_id}`)
                }
              >
                <RecommendationCard
                  wine={{
                    id: result.wine_id,
                    full_name: result.full_name,
                    producer: undefined,
                    appellation: undefined,
                    style: result.style,
                    color: result.color ?? undefined,
                    distance: result.distance,
                  }}
                  onAddToWishlist={() => {}}
                  onAddToCellar={() => {}}
                  condensed
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Appellation + producer links */}
      {(wine.appellation || wine.producer) && (
        <section className="flex items-center gap-4 pt-4 border-t border-cru-border">
          {wine.appellation && (
            <Link
              href={`/regions/${wine.appellation.slug}`}
              className="flex items-center gap-1.5 font-ui text-xs text-cru-text-muted hover:text-cru-accent-garnet transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {wine.appellation.name} Region
            </Link>
          )}
          {wine.producer && (
            <Link
              href={`/producers/${wine.producer.slug}`}
              className="flex items-center gap-1.5 font-ui text-xs text-cru-text-muted hover:text-cru-accent-garnet transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {wine.producer.name}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
