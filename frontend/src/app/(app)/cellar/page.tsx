'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Plus, Wine, SlidersHorizontal, Sparkles, CalendarDays } from 'lucide-react';
import { cellarApi } from '@/lib/api';
import type { CellarFilters, DrinkingWindowStatus, WineColor } from '@/types';
import CellarGrid from '@/components/cellar/CellarGrid';
import CellarValueChart from '@/components/cellar/CellarValueChart';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_FILTERS: Array<{ value: CellarFilters['status']; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'in_cellar', label: 'In Cellar' },
  { value: 'consumed',  label: 'Consumed' },
  { value: 'gifted',    label: 'Gifted' },
];

const READINESS_FILTERS: Array<{ value: DrinkingWindowStatus | ''; label: string }> = [
  { value: '',            label: 'Any' },
  { value: 'in_window',  label: 'Drink Now' },
  { value: 'peak',       label: 'At Peak' },
  { value: 'approaching', label: 'Approaching' },
  { value: 'not_ready',  label: 'Not Ready' },
  { value: 'past_peak',  label: 'Past Peak' },
];

const COLOR_FILTERS: Array<{ value: WineColor | ''; label: string }> = [
  { value: '',       label: 'All' },
  { value: 'red',    label: 'Red' },
  { value: 'white',  label: 'White' },
  { value: 'rose',   label: 'Rosé' },
  { value: 'orange', label: 'Orange' },
];

export default function CellarPage() {
  const { getToken } = useAuth();

  const [filters, setFilters] = useState<CellarFilters>({
    status: 'in_cellar',
    page: 1,
    per_page: 48,
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cellar', filters],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.list(token, filters);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['cellar-value'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.stats(token);
    },
    enabled: !isLoading && (data?.total ?? 0) > 0,
  });

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;

  function setFilter<K extends keyof CellarFilters>(key: K, value: CellarFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Page header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1
            className="font-display text-4xl text-cru-text"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Cellar
          </h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            {isLoading ? (
              <span className="skeleton inline-block h-4 w-16 rounded" />
            ) : (
              <>
                <span className="font-mono text-cru-accent-garnet">{total.toLocaleString()}</span>
                {' '}
                {total === 1 ? 'bottle' : 'bottles'}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cellar/calendar">
            <Button variant="ghost" size="sm" leftIcon={<CalendarDays className="h-3.5 w-3.5" />}>
              Calendar
            </Button>
          </Link>
          <Link href="/cellar/optimize">
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
              Optimize
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filter
          </Button>
          <Link href="/cellar/intake">
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Bottle
            </Button>
          </Link>
        </div>
      </div>

      {/* Compact portfolio value card */}
      {stats && stats.total_value > 0 && (() => {
        const purchaseCost = stats.avg_purchase_price > 0
          ? stats.avg_purchase_price * stats.total_bottles
          : stats.total_value * 0.85;
        const gainLoss = stats.total_value - purchaseCost;
        return (
          <CellarValueChart
            data={{
              current_value: stats.total_value,
              purchase_cost: purchaseCost,
              gain_loss: gainLoss,
              gain_loss_pct: purchaseCost > 0 ? (gainLoss / purchaseCost) * 100 : 0,
              by_region: [],
              by_style: [],
              top_bottles: [],
            }}
            compact
          />
        );
      })()}

      {/* Status tabs */}
      <div className="flex items-center gap-0 border-b border-cru-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setFilter('status', f.value)}
            className={`px-4 py-2.5 text-[13px] font-ui transition-colors relative ${
              filters.status === f.value
                ? 'text-cru-text font-medium'
                : 'text-cru-text-muted hover:text-cru-text'
            }`}
          >
            {f.label}
            {filters.status === f.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cru-accent-garnet" />
            )}
          </button>
        ))}
      </div>

      {/* Secondary filters — collapsible */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-6 p-4 rounded border border-cru-border bg-cru-surface shadow-sm animate-slide-up">
          <div className="space-y-2">
            <label className="block font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">
              Readiness
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {READINESS_FILTERS.map((f) => (
                <button
                  key={String(f.value)}
                  onClick={() =>
                    setFilter('readiness', f.value ? (f.value as DrinkingWindowStatus) : undefined)
                  }
                  className={`px-2.5 py-1 text-xs font-ui rounded border transition-colors ${
                    (filters.readiness ?? '') === f.value
                      ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">
              Color
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_FILTERS.map((f) => (
                <button
                  key={String(f.value)}
                  onClick={() =>
                    setFilter('color', f.value ? (f.value as WineColor) : undefined)
                  }
                  className={`px-2.5 py-1 text-xs font-ui rounded border transition-colors ${
                    (filters.color ?? '') === f.value
                      ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-sm font-ui text-red-700">
          Failed to load cellar. Please try again.
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && entries.length === 0 ? (
        <EmptyState
          icon={Wine}
          title="Your cellar awaits"
          description="Add your first bottle to begin tracking your collection — where it came from, when to drink it, and what it's worth."
          action={
            <Link href="/cellar/intake">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Add Your First Bottle
              </Button>
            </Link>
          }
        />
      ) : (
        <CellarGrid entries={entries} loading={isLoading} />
      )}

      {/* Load more */}
      {data?.has_more && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setFilter('page', (filters.page ?? 1) + 1)}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
