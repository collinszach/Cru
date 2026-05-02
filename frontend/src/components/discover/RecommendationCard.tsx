'use client';

import { motion } from 'framer-motion';

const WINE_COLOR_ACCENT: Record<string, string> = {
  red: '#6B1929',
  white: '#8B7355',
  rose: '#B86B6B',
  orange: '#B86B2E',
  sparkling: '#4A7090',
  fortified: '#6B4A1A',
  port: '#6B4A1A',
  sherry: '#6B4A1A',
  madeira: '#6B4A1A',
};

export interface RecommendationCardProps {
  wine: {
    id: string;
    full_name: string;
    producer?: string;
    appellation?: string;
    style?: string;
    color?: string;
    distance: number;
  };
  rank?: number;
  reason?: string;
  onAddToWishlist?: (wineId: string) => void;
  onAddToCellar?: (wineId: string) => void;
  condensed?: boolean;
  onAdd?: () => void;
  adding?: boolean;
}

export default function RecommendationCard({
  wine,
  rank,
  onAdd,
  adding,
}: RecommendationCardProps) {
  const accent =
    WINE_COLOR_ACCENT[wine.color ?? wine.style ?? 'red'] ?? '#6B1929';
  const matchPct =
    wine.distance != null ? Math.round((1 - wine.distance) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: (rank ?? 0) * 0.04 }}
      className="flex items-center gap-5 px-5 py-4 bg-cru-surface border-b border-cru-border hover:bg-cru-surface-raised transition-colors"
    >
      {/* Rank */}
      {rank != null && (
        <span className="flex-shrink-0 font-mono text-sm text-cru-text-subtle w-5 text-right">
          {rank}
        </span>
      )}

      {/* Color stripe */}
      <div
        className="flex-shrink-0 w-1 self-stretch rounded-full opacity-60"
        style={{ backgroundColor: accent, minHeight: '36px' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        {wine.producer && (
          <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle mb-0.5">
            {wine.producer}
          </p>
        )}
        <p
          className="font-display italic text-[15px] text-cru-text leading-snug truncate"
          style={{ fontWeight: 400 }}
        >
          {wine.full_name}
        </p>
        {wine.appellation && (
          <p className="font-ui text-xs text-cru-text-muted mt-0.5">
            {wine.appellation}
          </p>
        )}
      </div>

      {/* Match score */}
      {matchPct != null && (
        <div className="flex-shrink-0 text-right hidden sm:block">
          <span
            className="font-mono text-lg text-cru-accent-garnet"
            style={{ fontWeight: 500 }}
          >
            {matchPct}
          </span>
          <span className="font-ui text-[10px] text-cru-text-subtle">%</span>
        </div>
      )}

      {/* Add button */}
      {onAdd && (
        <button
          onClick={onAdd}
          disabled={adding}
          className="flex-shrink-0 px-3 py-1.5 rounded border border-cru-border text-xs font-ui text-cru-text-muted hover:border-cru-accent-garnet hover:text-cru-accent-garnet transition-colors disabled:opacity-40"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      )}
    </motion.div>
  );
}
