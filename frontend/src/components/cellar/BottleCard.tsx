'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import type { CellarEntry } from '@/types';
import DrinkingWindowBadge from './DrinkingWindowBadge';

const WINE_COLOR_ACCENT: Record<string, string> = {
  red:       '#6B1929',
  white:     '#8B7355',
  rose:      '#B86B6B',
  orange:    '#B86B2E',
  sparkling: '#4A7090',
  fortified: '#6B4A1A',
};

export default function BottleCard({ entry }: { entry: CellarEntry }) {
  const wine = entry.wine;
  const accent = WINE_COLOR_ACCENT[wine?.color ?? 'red'] ?? '#6B1929';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Link href={`/cellar/${entry.id}`} className="block group">
        <div className="flex items-center gap-6 px-5 py-4 bg-cru-surface border-b border-cru-border transition-colors duration-150 hover:bg-cru-surface-raised">
          {/* Color stripe */}
          <div
            className="flex-shrink-0 w-1 self-stretch rounded-full opacity-70"
            style={{ backgroundColor: accent, minHeight: '40px' }}
          />

          {/* Vintage — hero number */}
          <div
            className="flex-shrink-0 font-mono text-2xl font-medium leading-none w-16 text-right"
            style={{ color: accent }}
          >
            {entry.vintage}
          </div>

          {/* Wine info */}
          <div className="flex-1 min-w-0">
            {wine?.producer && (
              <p className="font-ui text-[11px] uppercase tracking-wider text-cru-text-subtle mb-0.5">
                {wine.producer.name}
              </p>
            )}
            <p className="font-display italic text-[15px] text-cru-text leading-snug truncate" style={{ fontWeight: 400 }}>
              {wine?.name ?? 'Unknown Wine'}
            </p>
            {wine?.appellation && (
              <p className="mt-0.5 font-ui text-xs text-cru-text-muted truncate">{wine.appellation.name}</p>
            )}
          </div>

          {/* Format + quantity */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            <p className="font-ui text-xs text-cru-text-subtle">{entry.format ?? '750ml'}</p>
            {entry.quantity > 1 && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Package className="h-2.5 w-2.5 text-cru-text-subtle" />
                <span className="font-mono text-[11px] text-cru-text-muted">×{entry.quantity}</span>
              </div>
            )}
          </div>

          {/* Price */}
          {entry.purchase_price != null && (
            <div className="flex-shrink-0 text-right hidden md:block w-20">
              <p className="font-mono text-sm text-cru-text-muted">${entry.purchase_price.toLocaleString()}</p>
            </div>
          )}

          {/* Drinking window */}
          <div className="flex-shrink-0 w-28 text-right">
            {entry.drinking_window_status ? (
              <DrinkingWindowBadge status={entry.drinking_window_status} compact />
            ) : (
              <span className="font-ui text-xs text-cru-text-subtle">—</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
