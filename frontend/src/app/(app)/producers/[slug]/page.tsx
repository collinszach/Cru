'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Leaf, MapPin, Loader2, ChevronRight } from 'lucide-react';
import { producersApi, winesApi } from '@/lib/api';
import type { Wine } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// ─── Style dot ────────────────────────────────────────────────────────────────

function StyleDot({ style }: { style?: string | null }) {
  const styleColorMap: Record<string, string> = {
    red:       'var(--cru-red)',
    white:     'var(--cru-white)',
    rose:      'var(--cru-rose)',
    orange:    'var(--cru-orange)',
    sparkling: 'var(--cru-sparkling)',
    champagne: 'var(--cru-sparkling)',
    port:      'var(--cru-fortified)',
    sherry:    'var(--cru-fortified)',
    madeira:   'var(--cru-fortified)',
    sauternes: 'var(--cru-white)',
  };
  const color = (style && styleColorMap[style]) ?? 'var(--cru-accent-slate)';
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={style ?? undefined}
    />
  );
}

// ─── WineCard ─────────────────────────────────────────────────────────────────

function WineCard({ wine }: { wine: Wine }) {
  return (
    <Link href={`/wines/${wine.id}`}>
      <div className="group flex items-start gap-3 p-4 rounded border border-cru-border bg-cru-surface hover:bg-cru-surface-raised hover:border-cru-accent-garnet/20 transition-all duration-150 shadow-sm">
        <StyleDot style={wine.style} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-display italic text-sm text-cru-text group-hover:text-cru-accent-garnet transition-colors leading-snug" style={{ fontWeight: 400 }}>
            {wine.name}
          </p>
          {wine.classification && (
            <span
              className="inline-block font-ui text-2xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(139,115,85,0.10)',
                border: '1px solid rgba(139,115,85,0.20)',
                color: 'var(--cru-accent-gold)',
              }}
            >
              {wine.classification}
            </span>
          )}
          {wine.appellation && (
            <p className="font-ui text-2xs text-cru-text-muted">
              {wine.appellation.name}
            </p>
          )}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-cru-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}

// ─── ProducerDetailPage ───────────────────────────────────────────────────────

export default function ProducerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const { data: producer, isLoading } = useQuery({
    queryKey: ['producer', slug],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return producersApi.get(token, slug);
    },
    enabled: !!slug,
  });

  const { data: winesData } = useQuery({
    queryKey: ['producer-wines', slug],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return winesApi.search(token, { producer_slug: slug, per_page: 100 });
    },
    enabled: !!slug,
  });

  const briefMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return producersApi.getBrief(token, slug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producer', slug] });
    },
  });

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    try {
      await briefMutation.mutateAsync();
    } finally {
      setGeneratingBrief(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!producer) {
    return (
      <div className="text-center py-24">
        <p className="font-ui text-sm text-cru-text-muted">Producer not found.</p>
      </div>
    );
  }

  const wines = winesData?.items ?? [];

  return (
    <div className="space-y-12 animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header-rule">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <h1
              className="font-display italic text-4xl text-cru-text"
              style={{ letterSpacing: '-0.02em', lineHeight: 1.1, fontWeight: 500 }}
            >
              {producer.name}
            </h1>
            {producer.appellation && (
              <p className="font-ui text-sm text-cru-text-muted">
                {producer.appellation.name}
                {producer.appellation.region ? ` · ${producer.appellation.region}` : ''}
                {producer.appellation.country ? ` · ${producer.appellation.country}` : ''}
              </p>
            )}
          </div>

          {/* Certifications */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-2">
            {producer.biodynamic && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs bg-green-50 border border-green-200 text-green-700">
                <Leaf className="h-3 w-3" />
                Biodynamic
              </span>
            )}
            {producer.organic_cert && !producer.biodynamic && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs bg-green-50 border border-green-200 text-green-700">
                <Leaf className="h-3 w-3" />
                {producer.organic_cert}
              </span>
            )}
            {producer.natural && !producer.organic_cert && !producer.biodynamic && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs bg-green-50 border border-green-200 text-green-700">
                <Leaf className="h-3 w-3" />
                Natural
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Info strip ── */}
      <div
        className="grid grid-cols-3 gap-px rounded overflow-hidden"
        style={{ backgroundColor: 'var(--cru-border)' }}
      >
        {[
          {
            label: 'Founded',
            value: producer.founded_year ? String(producer.founded_year) : '—',
            mono: true,
          },
          {
            label: 'Country',
            value: producer.appellation?.country ?? producer.country_code ?? '—',
            mono: false,
          },
          {
            label: 'Winemaker',
            value: producer.winemaker ?? '—',
            mono: false,
          },
        ].map(({ label, value, mono }) => (
          <div
            key={label}
            className="px-5 py-4 bg-cru-surface"
          >
            <p className="font-ui text-2xs uppercase tracking-widest text-cru-text-subtle mb-1">
              {label}
            </p>
            <p className={`text-sm ${mono ? 'font-mono' : 'font-ui'} text-cru-text`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── AI Summary / Editorial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {producer.ai_summary ? (
            <div
              className="pl-5"
              style={{ borderLeft: '2px solid var(--cru-accent-garnet)' }}
            >
              <div className="space-y-3">
                {producer.ai_summary.split('\n\n').map((para, i) => (
                  <p key={i} className="font-ui text-sm text-cru-text-muted leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded border border-cru-border bg-cru-surface">
              <p className="font-ui text-sm text-cru-text-muted italic mb-4">
                No producer profile yet. Generate a brief using Claude.
              </p>
              <button
                onClick={handleGenerateBrief}
                disabled={generatingBrief}
                className="flex items-center gap-2 px-5 py-2.5 rounded font-ui text-sm transition-all duration-150 disabled:opacity-50 border border-cru-accent-garnet/40 text-cru-accent-garnet hover:bg-cru-accent-garnet/5"
              >
                {generatingBrief && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {generatingBrief ? 'Generating…' : 'Generate Profile'}
              </button>
            </div>
          )}

          {producer.style_notes && !producer.ai_summary && (
            <p className="font-ui text-sm text-cru-text-muted leading-relaxed">
              {producer.style_notes}
            </p>
          )}
        </div>

        {/* ── Right column: metadata ── */}
        <div className="space-y-4">
          {/* Website */}
          {producer.website && (
            <div className="p-4 rounded border border-cru-border bg-cru-surface space-y-1">
              <p className="font-ui text-2xs uppercase tracking-widest text-cru-text-subtle">Website</p>
              <a
                href={producer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-ui text-xs text-cru-accent-garnet hover:underline transition-colors"
              >
                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{producer.website.replace(/^https?:\/\//, '')}</span>
              </a>
            </div>
          )}

          {/* Location */}
          {producer.address && (
            <div className="p-4 rounded border border-cru-border bg-cru-surface space-y-1">
              <p className="font-ui text-2xs uppercase tracking-widest text-cru-text-subtle">Address</p>
              <p className="font-ui text-xs text-cru-text-subtle leading-relaxed">{producer.address}</p>
            </div>
          )}

          {/* Owner */}
          {producer.owner && (
            <div className="p-4 rounded border border-cru-border bg-cru-surface space-y-1">
              <p className="font-ui text-2xs uppercase tracking-widest text-cru-text-subtle">Owner</p>
              <p className="font-ui text-xs text-cru-text">{producer.owner}</p>
            </div>
          )}

          {/* Map placeholder */}
          <div
            className="rounded overflow-hidden border border-cru-border bg-cru-surface-raised"
            style={{ height: 140 }}
          >
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-cru-accent-garnet opacity-30" />
              <p className="font-ui text-xs text-cru-text-subtle text-center px-4">
                Winery location — Phase 5
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wines ledger ── */}
      {wines.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
              Wines
            </h2>
            <span className="font-mono text-xs text-cru-text-muted">{wines.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wines.map((wine) => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
