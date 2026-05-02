'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, TrendingUp } from 'lucide-react';
import { wishlistApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { WishlistEntry } from '@/types';

// ─── Priority dots ────────────────────────────────────────────────────────────

function PriorityDots({ priority }: { priority: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3, 4, 5] as const).map((p) => (
        <span
          key={p}
          className="text-xs"
          style={{
            color: p <= priority ? 'var(--cru-accent-garnet)' : 'var(--cru-border)',
          }}
        >
          ●
        </span>
      ))}
    </div>
  );
}

// ─── Price delta ──────────────────────────────────────────────────────────────

function PriceDelta({ entry }: { entry: WishlistEntry }) {
  if (!entry.estimated_price || !entry.market_price) return null;

  const delta = entry.market_price - entry.estimated_price;
  const cheaper = delta < 0;
  const absDelta = Math.abs(delta);

  return (
    <div
      className={`flex items-center gap-1 text-xs font-mono ${cheaper ? 'text-green-700' : 'text-cru-text-muted'}`}
    >
      {cheaper ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {cheaper ? '↓' : '↑'} ${absDelta.toFixed(0)}{' '}
      {cheaper ? 'cheaper' : 'pricier'} than estimate
    </div>
  );
}

// ─── Wishlist Item ────────────────────────────────────────────────────────────

function WishlistItem({
  entry,
  onRemove,
}: {
  entry: WishlistEntry;
  onRemove: (id: string) => void;
}) {
  const wineName = entry.wine_name ?? entry.wine?.full_name ?? entry.free_text ?? 'Unknown Wine';
  const producer = entry.wine?.producer?.name;
  const appellation = entry.wine?.appellation?.name;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="group relative cru-card rounded p-5"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: wine info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name */}
          <div>
            <h3 className="font-display italic text-lg text-cru-text" style={{ fontWeight: 400, letterSpacing: '-0.015em' }}>
              {wineName}
              {entry.vintage && (
                <span className="font-mono ml-2 not-italic text-cru-accent-garnet" style={{ fontSize: '0.9em' }}>
                  {entry.vintage}
                </span>
              )}
            </h3>
            {(producer || appellation) && (
              <p
                className="font-ui text-xs mt-0.5"
                style={{ color: 'var(--cru-text-muted)' }}
              >
                {[producer, appellation].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Priority */}
          <PriorityDots priority={entry.priority} />

          {/* Pricing row */}
          <div className="flex items-center gap-5">
            {entry.estimated_price && (
              <div>
                <p className="text-2xs font-ui uppercase tracking-wider mb-0.5" style={{ color: 'var(--cru-text-muted)' }}>
                  Your Estimate
                </p>
                <span className="font-mono text-base" style={{ color: 'var(--cru-text)' }}>
                  ${entry.estimated_price.toFixed(0)}
                </span>
              </div>
            )}
            {entry.market_price && (
              <div>
                <p className="text-2xs font-ui uppercase tracking-wider mb-0.5" style={{ color: 'var(--cru-text-muted)' }}>
                  Market Price
                </p>
                <span className="font-mono text-base" style={{ color: 'var(--cru-text)' }}>
                  ${entry.market_price.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          {/* Price delta */}
          <PriceDelta entry={entry} />

          {/* Reason */}
          {entry.reason && (
            <p
              className="font-body italic text-sm leading-relaxed"
              style={{ color: 'var(--cru-text-muted)', lineHeight: 1.7 }}
            >
              &ldquo;{entry.reason}&rdquo;
            </p>
          )}

          {/* Source */}
          {entry.source && (
            <p
              className="text-2xs font-ui uppercase tracking-widest"
              style={{ color: 'var(--cru-border)', letterSpacing: '0.12em' }}
            >
              Via {entry.source.replace(/_/g, ' ')}
            </p>
          )}
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1"
          style={{ color: 'var(--cru-text-muted)' }}
          title="Remove from want list"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.list(token);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.remove(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  if (isLoading) return <PageLoader />;

  // Find items with price drops (market_price < estimated_price)
  const priceAlerts = (wishlist ?? []).filter(
    (e) => e.market_price && e.estimated_price && e.market_price < e.estimated_price,
  );

  // Sort by priority desc
  const sorted = [...(wishlist ?? [])].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Want List</h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            The bottles you&apos;re hunting. Sorted by priority.
          </p>
        </div>
      </div>

      {/* Price alert banner */}
      <AnimatePresence>
        {priceAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-4 rounded border border-green-200 bg-green-50"
          >
            <TrendingDown className="h-4 w-4 flex-shrink-0 text-green-700" />
            <p className="text-sm font-ui text-green-700">
              {priceAlerts.length} bottle{priceAlerts.length !== 1 ? 's have' : ' has'} dropped
              in price since you added them.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span
            className="font-display italic select-none mb-6"
            style={{ fontSize: '4rem', color: 'rgba(107,25,41,0.08)' }}
          >
            ○
          </span>
          <h2 className="font-display text-2xl text-cru-text mb-2" style={{ fontWeight: 500 }}>
            Your want list is empty.
          </h2>
          <p className="font-ui text-sm text-cru-text-muted max-w-sm" style={{ lineHeight: 1.75 }}>
            Add bottles from the wine database. They&apos;ll be tracked here with price alerts
            when market prices shift.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          <AnimatePresence>
            {sorted.map((entry) => (
              <WishlistItem
                key={entry.id}
                entry={entry}
                onRemove={(id) => removeMutation.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
