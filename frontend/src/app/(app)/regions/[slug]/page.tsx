'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { regionsApi } from '@/lib/api';
import type { VintageChartEntry } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// ─── Vintage score coloring (light theme) ────────────────────────────────────

function vintageColor(score: number): string {
  if (score >= 97) return 'var(--cru-accent-gold)';
  if (score >= 93) return 'var(--cru-accent-garnet)';
  if (score >= 89) return 'var(--cru-text)';
  if (score >= 85) return 'var(--cru-text-muted)';
  return 'var(--cru-text-subtle)';
}

function vintageBg(score: number): string {
  if (score >= 97) return 'rgba(139,115,85,0.10)';
  if (score >= 93) return 'rgba(107,25,41,0.08)';
  if (score >= 89) return 'rgba(28,20,16,0.04)';
  if (score >= 85) return 'rgba(122,110,101,0.06)';
  return 'rgba(168,157,148,0.06)';
}

// ─── VintageCell ──────────────────────────────────────────────────────────────

function VintageCell({ entry }: { entry: VintageChartEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded((x) => !x)}
        className="w-full text-left rounded transition-all duration-150"
        style={{
          border: `1px solid ${expanded ? vintageColor(entry.score) + '60' : 'var(--cru-border)'}`,
          backgroundColor: expanded ? vintageBg(entry.score) : 'var(--cru-surface)',
          padding: '12px',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className="font-mono font-medium"
              style={{ fontSize: '1.1rem', color: 'var(--cru-text)', letterSpacing: '0.04em' }}
            >
              {entry.vintage}
            </p>
            {entry.descriptor && (
              <p className="font-ui text-2xs text-cru-text-muted mt-0.5 leading-tight">
                {entry.descriptor}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className="font-mono font-medium"
              style={{ fontSize: '1.5rem', color: vintageColor(entry.score), lineHeight: 1 }}
            >
              {entry.score}
            </p>
            {entry.user_notes !== undefined && entry.user_notes > 0 && (
              <p className="font-ui text-2xs text-cru-text-muted mt-0.5">
                {entry.user_notes} note{entry.user_notes !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded notes */}
      {expanded && (entry.notes || entry.drinking_from || entry.drinking_to) && (
        <div
          className="mt-1 px-3 py-2.5 rounded font-ui text-xs text-cru-text-muted leading-relaxed"
          style={{ backgroundColor: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)' }}
        >
          {entry.drinking_from && entry.drinking_to && (
            <p className="mb-1.5">
              <span className="text-cru-text-muted">Drink: </span>
              <span className="font-mono text-cru-text">
                {entry.drinking_from}–{entry.drinking_to}
              </span>
            </p>
          )}
          {entry.notes && <p>{entry.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ─── RegionDetailPage ─────────────────────────────────────────────────────────

export default function RegionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();

  const { data: region, isLoading } = useQuery({
    queryKey: ['region', slug],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regionsApi.get(token, slug);
    },
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
  });

  const { data: vintageChart } = useQuery({
    queryKey: ['vintage-chart', slug],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regionsApi.getVintageChart(token, slug);
    },
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
  });

  const { data: regionWines } = useQuery({
    queryKey: ['region-wines', slug],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regionsApi.getWines(token, slug);
    },
    enabled: !!slug,
  });

  if (isLoading) return <PageLoader />;
  if (!region) {
    return (
      <div className="text-center py-24">
        <p className="font-ui text-sm text-cru-text-muted">Region not found.</p>
      </div>
    );
  }

  const chart = vintageChart ?? [];
  const sortedChart = [...chart].sort((a, b) => b.vintage - a.vintage);
  const wines = regionWines ?? [];

  return (
    <div className="space-y-12 animate-fade-in">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 font-ui text-xs text-cru-text-muted">
        <Link href="/regions" className="hover:text-cru-text transition-colors">
          Regions
        </Link>
        {region.country && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{region.country}</span>
          </>
        )}
        {region.region && region.region !== region.name && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{region.region}</span>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-cru-text">{region.name}</span>
      </nav>

      {/* ── Header ── */}
      <div className="page-header-rule space-y-4">
        <div className="flex flex-wrap items-start gap-4">
          <h1
            className="font-display text-4xl text-cru-text"
            style={{ letterSpacing: '-0.02em', lineHeight: 1.1, fontWeight: 500 }}
          >
            {region.name}
          </h1>
          {region.classification && (
            <span
              className="mt-2 inline-block px-3 py-1 rounded font-ui text-xs"
              style={{
                border: '1px solid rgba(139,115,85,0.35)',
                backgroundColor: 'rgba(139,115,85,0.08)',
                color: 'var(--cru-accent-gold)',
              }}
            >
              {region.classification}
            </span>
          )}
        </div>

        {/* Style notes lead paragraph */}
        {region.style_notes && (
          <div className="max-w-2xl">
            <p className="font-ui text-sm text-cru-text-muted leading-relaxed">
              {region.style_notes}
            </p>
          </div>
        )}
      </div>

      {/* ── Data panels row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Soils & Climate */}
        <div className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-4">
          <h3 className="font-ui text-xs uppercase tracking-widest text-cru-text-subtle">
            Soils &amp; Climate
          </h3>
          {region.climate && (
            <div>
              <p className="font-ui text-2xs text-cru-text-muted mb-1">Climate</p>
              <span
                className="inline-block px-2 py-0.5 rounded font-ui text-xs text-cru-text-muted capitalize"
                style={{ border: '1px solid var(--cru-border)', backgroundColor: 'var(--cru-surface-raised)' }}
              >
                {region.climate}
              </span>
            </div>
          )}
          {region.soil_types.length > 0 && (
            <div>
              <p className="font-ui text-2xs text-cru-text-muted mb-2">Soils</p>
              <div className="flex flex-wrap gap-1.5">
                {region.soil_types.map((soil) => (
                  <span
                    key={soil}
                    className="px-2 py-0.5 rounded font-ui text-xs text-cru-text-muted capitalize"
                    style={{
                      border: '1px solid var(--cru-border)',
                      backgroundColor: 'var(--cru-surface-raised)',
                    }}
                  >
                    {soil}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!region.climate && region.soil_types.length === 0 && (
            <p className="font-ui text-xs text-cru-text-subtle italic">No data available.</p>
          )}
        </div>

        {/* Primary Grapes */}
        <div className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-4">
          <h3 className="font-ui text-xs uppercase tracking-widest text-cru-text-subtle">
            Primary Grapes
          </h3>
          {region.primary_grapes.length > 0 ? (
            <div className="space-y-2">
              {region.primary_grapes.map((grape) => (
                <div key={grape} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'var(--cru-accent-garnet)' }}
                  />
                  <span className="font-ui text-sm text-cru-text">{grape}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-ui text-xs text-cru-text-subtle italic">No data available.</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-4">
          <h3 className="font-ui text-xs uppercase tracking-widest text-cru-text-subtle">
            Your Collection
          </h3>
          <div className="space-y-3">
            <div>
              <p className="font-ui text-2xs text-cru-text-muted">Wines tasted</p>
              <p className="font-mono text-2xl text-cru-text" style={{ letterSpacing: '0.04em' }}>
                {wines.length}
              </p>
            </div>
            {chart.length > 0 && (
              <div>
                <p className="font-ui text-2xs text-cru-text-muted">Vintage chart years</p>
                <p className="font-mono text-xl text-cru-text" style={{ letterSpacing: '0.04em' }}>
                  {chart.length}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Vintage Chart (hero section) ── */}
      {sortedChart.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
              Vintage Chart
            </h2>
            <span className="font-ui text-xs text-cru-text-muted">
              Click a year to expand notes
            </span>
          </div>

          {/* Score legend */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: '97+', color: 'var(--cru-accent-gold)', desc: 'Exceptional' },
              { label: '93–96', color: 'var(--cru-accent-garnet)', desc: 'Outstanding' },
              { label: '89–92', color: 'var(--cru-text)', desc: 'Very Good' },
              { label: '85–88', color: 'var(--cru-text-muted)', desc: 'Good' },
              { label: '<85', color: 'var(--cru-text-subtle)', desc: 'Fair' },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-mono text-2xs" style={{ color }}>{label}</span>
                <span className="font-ui text-2xs text-cru-text-muted">{desc}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {sortedChart.map((entry) => (
              <VintageCell key={entry.vintage} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* ── User's wines from this region ── */}
      {wines.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
            Your Wines Here
          </h2>
          <div className="bg-cru-surface border border-cru-border rounded shadow-sm overflow-hidden">
            {wines.map((wine) => (
              <Link key={wine.id} href={`/wines/${wine.id}`}>
                <div className="group flex items-center justify-between p-4 border-b border-cru-border last:border-b-0 hover:bg-cru-surface-raised transition-colors">
                  <div className="min-w-0">
                    <p className="font-display italic text-sm text-cru-text group-hover:text-cru-accent-garnet transition-colors leading-snug" style={{ fontWeight: 400 }}>
                      {wine.full_name}
                    </p>
                    {wine.producer && (
                      <p className="font-ui text-xs text-cru-text-muted mt-0.5">
                        {wine.producer.name}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-cru-text-muted flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Vintage notes ── */}
      {region.vintage_notes && (
        <section className="p-6 rounded border border-cru-border bg-cru-surface shadow-sm">
          <h3 className="font-ui text-xs uppercase tracking-widest text-cru-text-subtle mb-3">
            Vintage Notes
          </h3>
          <p className="font-ui text-sm text-cru-text-muted leading-relaxed">
            {region.vintage_notes}
          </p>
        </section>
      )}
    </div>
  );
}
