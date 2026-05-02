'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Wine } from 'lucide-react';
import type { CellarOptimizationAdvice, CellarEntry } from '@/types';
import DrinkingWindowBadge from './DrinkingWindowBadge';

interface CellarOptimizerPanelProps {
  data?: CellarOptimizationAdvice;
  isLoading: boolean;
  onRefresh: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function entryLabel(entry: CellarEntry): string {
  const wine = entry.wine;
  if (!wine) return `Bottle ${entry.id.slice(0, 6)}`;
  const producer = wine.producer?.name ?? '';
  const name = wine.name;
  return `${producer ? producer + ' ' : ''}${name} ${entry.vintage}`;
}

function SectionDivider() {
  return (
    <div
      className="my-8 h-px"
      style={{
        background: 'linear-gradient(90deg, transparent, var(--cru-accent-gold), transparent)',
        opacity: 0.2,
      }}
    />
  );
}

interface OpenSoonItemProps {
  item: CellarOptimizationAdvice['open_soon'][number];
  index: number;
}

function OpenSoonItem({ item, index }: OpenSoonItemProps) {
  const urgencyColors = {
    low: 'var(--cru-text-muted)',
    medium: 'var(--cru-accent-gold)',
    high: 'var(--cru-accent-garnet)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      className="flex gap-5 py-4 border-b"
      style={{ borderColor: 'rgba(45,36,32,0.5)' }}
    >
      <span
        className="font-mono text-2xl leading-none flex-shrink-0 pt-0.5"
        style={{ color: 'var(--cru-accent-garnet)', width: '28px' }}
      >
        {index + 1}
      </span>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display italic text-base text-cru-text leading-snug">
            {entryLabel(item.entry)}
          </p>
          {item.entry.drinking_window_status && (
            <DrinkingWindowBadge status={item.entry.drinking_window_status} compact />
          )}
        </div>
        <p
          className="font-body text-sm leading-relaxed"
          style={{ color: 'var(--cru-text-muted)' }}
        >
          {item.reason}
        </p>
        {item.urgency === 'high' && (
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: urgencyColors.high }}
            />
            <span
              className="font-mono text-2xs uppercase tracking-widest"
              style={{ color: urgencyColors.high }}
            >
              Act Soon
            </span>
          </div>
        )}
        {item.entry.current_value && (
          <p className="font-mono text-xs text-cru-text-muted">
            Est. value: <span style={{ color: 'var(--cru-accent-gold)' }}>{fmt(item.entry.current_value)}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

interface HoldItemProps {
  item: CellarOptimizationAdvice['hold_longer'][number];
  index: number;
}

function HoldItem({ item, index }: HoldItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      className="flex gap-5 py-4 border-b"
      style={{ borderColor: 'rgba(45,36,32,0.5)' }}
    >
      <span
        className="font-mono text-2xl leading-none flex-shrink-0 pt-0.5"
        style={{ color: 'rgba(201,168,76,0.4)', width: '28px' }}
      >
        {index + 1}
      </span>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display italic text-base text-cru-text leading-snug">
            {entryLabel(item.entry)}
          </p>
          {item.entry.drink_from && item.entry.drink_by && (
            <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--cru-text-muted)' }}>
              {item.entry.drink_from}–{item.entry.drink_by}
            </span>
          )}
        </div>
        <p
          className="font-body text-sm leading-relaxed"
          style={{ color: 'var(--cru-text-muted)' }}
        >
          {item.reason}
        </p>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-3">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-3 w-40 rounded" />
      </div>

      {/* Gold rule */}
      <div className="h-px rounded" style={{ background: 'var(--cru-border)' }} />

      {/* Consulting message */}
      <div className="text-center py-8 space-y-3">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <p
            className="font-display italic"
            style={{ fontSize: '1.5rem', color: 'var(--cru-accent-gold)', opacity: 0.7 }}
          >
            Consulting your cellar…
          </p>
        </motion.div>
        <p className="text-sm font-ui text-cru-text-muted">
          Your Master Sommelier is reviewing every bottle in your collection.
        </p>
      </div>

      {/* Skeleton lines */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-5">
          <div className="skeleton h-7 w-7 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CellarOptimizerPanel({ data, isLoading, onRefresh }: CellarOptimizerPanelProps) {
  const generatedDate = useMemo(() => {
    if (!data?.generated_at) return null;
    return new Date(data.generated_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [data?.generated_at]);

  if (isLoading) {
    return (
      <div
        className="rounded border p-8"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="rounded border p-12 text-center space-y-4"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        <Wine className="h-12 w-12 mx-auto opacity-10" style={{ color: 'var(--cru-accent-garnet)' }} />
        <div className="space-y-2">
          <p className="font-display italic text-xl text-cru-text">Your cellar awaits</p>
          <p className="text-sm font-body text-cru-text-muted max-w-sm mx-auto leading-relaxed">
            Add wines to your cellar to unlock cellar intelligence — your personal Master Sommelier
            will review every bottle and tell you what to open, what to hold, and what to acquire.
          </p>
        </div>
      </div>
    );
  }

  const hasPastPeak = data.past_peak.length > 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="optimizer"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="rounded border overflow-hidden"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2
                className="font-display italic"
                style={{ fontSize: '2rem', letterSpacing: '-0.01em', lineHeight: 1.1 }}
              >
                Cellar Intelligence
              </h2>
              {generatedDate && (
                <p className="font-mono text-xs mt-2" style={{ color: 'var(--cru-text-muted)' }}>
                  Generated {generatedDate}
                </p>
              )}
            </div>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-ui transition-all"
              style={{
                color: 'var(--cru-text-muted)',
                border: '1px solid var(--cru-border)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = 'var(--cru-text)';
                el.style.borderColor = 'var(--cru-accent-gold)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = 'var(--cru-text-muted)';
                el.style.borderColor = 'var(--cru-border)';
              }}
              title="Refresh analysis (clears 24h cache)"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats pill row */}
          <div className="flex items-center gap-4 mt-4">
            <span className="font-mono text-xs text-cru-text-muted">
              <span style={{ color: 'var(--cru-text)' }}>{data.open_soon.length + data.hold_longer.length + data.past_peak.length}</span>
              {' '}bottles analysed
            </span>
            <span className="text-cru-border">·</span>
            <span className="font-mono text-xs text-cru-text-muted">
              {data.past_peak.length > 0 && (
                <>
                  <span style={{ color: 'var(--cru-accent-garnet)' }}>{data.past_peak.length}</span>
                  {' '}urgent
                  <span className="mx-2 text-cru-border">·</span>
                </>
              )}
              <span style={{ color: 'var(--cru-accent-gold)' }}>{data.open_soon.length}</span>
              {' '}to open soon
            </span>
          </div>

          {/* Gold horizontal rule */}
          <div
            className="mt-8 mb-8 h-px"
            style={{
              background: 'linear-gradient(90deg, var(--cru-accent-gold), transparent)',
              opacity: 0.35,
            }}
          />

          {/* Section 1: Open Soon */}
          {data.open_soon.length > 0 && (
            <section className="mb-2">
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--cru-accent-garnet)' }}
                />
                <h3
                  className="font-ui text-2xs uppercase tracking-widest"
                  style={{ color: 'var(--cru-accent-garnet)' }}
                >
                  Open in the Next 6 Months
                </h3>
              </div>
              <div>
                {data.open_soon.map((item, i) => (
                  <OpenSoonItem key={item.entry.id} item={item} index={i} />
                ))}
              </div>
            </section>
          )}

          {data.open_soon.length > 0 && data.hold_longer.length > 0 && <SectionDivider />}

          {/* Section 2: Hold Longer */}
          {data.hold_longer.length > 0 && (
            <section className="mb-2">
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'rgba(201,168,76,0.5)' }}
                />
                <h3
                  className="font-ui text-2xs uppercase tracking-widest"
                  style={{ color: 'var(--cru-accent-gold)' }}
                >
                  Hold — These Benefit From More Time
                </h3>
              </div>
              <div>
                {data.hold_longer.map((item, i) => (
                  <HoldItem key={item.entry.id} item={item} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Past Peak — urgent red card */}
          {hasPastPeak && (
            <>
              <SectionDivider />
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-sm p-5 space-y-4"
                style={{
                  border: '1px solid rgba(139,26,46,0.35)',
                  backgroundColor: 'rgba(139,26,46,0.06)',
                  boxShadow: '0 0 24px rgba(139,26,46,0.08)',
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'var(--cru-accent-garnet)' }}
                  />
                  <h3
                    className="font-ui text-2xs uppercase tracking-widest"
                    style={{ color: 'var(--cru-accent-garnet)' }}
                  >
                    Urgent — Bottles Past or Near Peak
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.past_peak.map((item) => (
                    <div
                      key={item.entry.id}
                      className="flex items-start justify-between gap-4 py-2 border-b"
                      style={{ borderColor: 'rgba(139,26,46,0.2)' }}
                    >
                      <div className="flex-1">
                        <p className="font-display italic text-sm text-cru-text">{entryLabel(item.entry)}</p>
                        {item.entry.drink_recommendation && (
                          <p className="text-xs font-body text-cru-text-muted mt-1 leading-relaxed">
                            {item.entry.drink_recommendation}
                          </p>
                        )}
                      </div>
                      <span
                        className="font-mono text-2xs uppercase tracking-widest flex-shrink-0 px-2 py-0.5 rounded"
                        style={{
                          color: 'var(--cru-accent-garnet)',
                          backgroundColor: 'rgba(139,26,46,0.1)',
                          border: '1px solid rgba(139,26,46,0.3)',
                        }}
                      >
                        {item.urgency === 'high' ? 'Critical' : 'Urgent'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.section>
            </>
          )}

          {/* Section 4: Composition note */}
          {data.composition_note && (
            <>
              <SectionDivider />
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="h-3 w-3 rounded flex-shrink-0"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1.5px solid rgba(201,168,76,0.4)',
                    }}
                  />
                  <h3
                    className="font-ui text-2xs uppercase tracking-widest"
                    style={{ color: 'var(--cru-text-muted)' }}
                  >
                    Cellar Composition
                  </h3>
                </div>
                <div
                  className="pl-5"
                  style={{ borderLeft: '2px solid rgba(201,168,76,0.2)' }}
                >
                  <p className="font-body text-sm text-cru-text leading-7">
                    {data.composition_note}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Section 5: Acquisition suggestion */}
          {data.acquisition_suggestion && (
            <>
              <SectionDivider />
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="h-3 w-3 rounded flex-shrink-0"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1.5px solid rgba(201,168,76,0.4)',
                    }}
                  />
                  <h3
                    className="font-ui text-2xs uppercase tracking-widest"
                    style={{ color: 'var(--cru-text-muted)' }}
                  >
                    Acquisition Suggestion
                  </h3>
                </div>
                <div
                  className="pl-5"
                  style={{ borderLeft: '2px solid rgba(201,168,76,0.2)' }}
                >
                  <p className="font-body text-sm text-cru-text leading-7">
                    {data.acquisition_suggestion}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Footer signature */}
          <div className="mt-10 pt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--cru-border)' }}>
            <p className="text-2xs font-body italic" style={{ color: 'rgba(139,139,130,0.5)' }}>
              Analysis generated by Claude · refreshes every 24 hours
            </p>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 text-2xs font-ui transition-colors"
              style={{ color: 'var(--cru-text-muted)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--cru-accent-gold)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--cru-text-muted)')}
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Request fresh analysis
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
