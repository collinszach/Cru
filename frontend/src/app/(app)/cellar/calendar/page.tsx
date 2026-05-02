'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cellarApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import DrinkingWindowBadge from '@/components/cellar/DrinkingWindowBadge';
import type { CellarEntry, DrinkingWindowStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();

interface CalendarSection {
  id: 'urgent' | 'this_year' | 'next_three' | 'hold';
  title: string;
  subtitle: string;
  statuses: DrinkingWindowStatus[];
  entries: CellarEntry[];
}

function entryDisplayName(entry: CellarEntry): string {
  const wine = entry.wine;
  if (!wine) return 'Unknown Wine';
  return wine.name;
}

function entryProducer(entry: CellarEntry): string | null {
  return entry.wine?.producer?.name ?? null;
}

// ─── Urgent Card ─────────────────────────────────────────────────────────────

function UrgentCard({ entry }: { entry: CellarEntry }) {
  return (
    <Link href={`/cellar/${entry.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
        className="flex items-start gap-4 p-4 rounded-sm"
        style={{
          backgroundColor: 'rgba(139,26,46,0.06)',
          border: '1px solid rgba(139,26,46,0.25)',
        }}
      >
        {/* Vintage */}
        <span
          className="font-mono text-2xl leading-none flex-shrink-0 pt-0.5"
          style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.03em' }}
        >
          {entry.vintage}
        </span>

        <div className="flex-1 min-w-0 space-y-1">
          {entryProducer(entry) && (
            <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-wider">
              {entryProducer(entry)}
            </p>
          )}
          <p className="font-display italic text-base text-cru-text leading-snug truncate">
            {entryDisplayName(entry)}
          </p>
          {entry.wine?.appellation && (
            <p className="text-2xs font-ui text-cru-text-muted">{entry.wine.appellation.name}</p>
          )}
          {entry.drink_recommendation && (
            <p className="text-xs font-body text-cru-text-muted leading-relaxed mt-1.5">
              {entry.drink_recommendation}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="font-mono text-2xs uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              color: 'var(--cru-accent-garnet)',
              backgroundColor: 'rgba(139,26,46,0.15)',
              border: '1px solid rgba(139,26,46,0.3)',
            }}
          >
            URGENT
          </span>
          {entry.quantity > 1 && (
            <span className="font-mono text-xs text-cru-text-muted">×{entry.quantity}</span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Window Card ─────────────────────────────────────────────────────────────

function WindowCard({ entry, muted = false }: { entry: CellarEntry; muted?: boolean }) {
  return (
    <Link href={`/cellar/${entry.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="p-4 rounded-sm space-y-3 h-full"
        style={{
          backgroundColor: 'var(--cru-surface)',
          border: `1px solid ${muted ? 'var(--cru-border)' : 'rgba(201,168,76,0.12)'}`,
          opacity: muted ? 0.8 : 1,
        }}
      >
        {/* Vintage */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-mono text-2xl leading-none"
            style={{ color: muted ? 'var(--cru-text-muted)' : 'var(--cru-accent-garnet)', letterSpacing: '-0.03em' }}
          >
            {entry.vintage}
          </span>
          {entry.drinking_window_status && (
            <DrinkingWindowBadge status={entry.drinking_window_status} compact />
          )}
        </div>

        {/* Producer + name */}
        <div className="space-y-0.5">
          {entryProducer(entry) && (
            <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-wider truncate">
              {entryProducer(entry)}
            </p>
          )}
          <p className="font-display italic text-sm text-cru-text leading-snug line-clamp-2">
            {entryDisplayName(entry)}
          </p>
        </div>

        {/* Bottom */}
        <div className="flex items-end justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--cru-border)' }}>
          <p className="text-2xs font-ui text-cru-text-muted">
            {entry.format ?? '750ml'}
            {entry.quantity > 1 && ` × ${entry.quantity}`}
          </p>
          {entry.drink_from && entry.drink_by && (
            <p className="font-mono text-2xs text-cru-text-muted">
              {entry.drink_from}–{entry.drink_by}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Hold Row ─────────────────────────────────────────────────────────────────

function HoldRow({ entry }: { entry: CellarEntry }) {
  const yearsToWindow = entry.drink_from ? Math.max(0, entry.drink_from - CURRENT_YEAR) : null;

  return (
    <Link href={`/cellar/${entry.id}`}>
      <div
        className="flex items-center gap-4 py-3 px-4 rounded-sm transition-colors"
        style={{ borderBottom: '1px solid var(--cru-border)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--cru-surface-raised)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent')}
      >
        <span
          className="font-mono text-base flex-shrink-0"
          style={{ color: 'var(--cru-text-muted)', width: '44px' }}
        >
          {entry.vintage}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display italic text-sm text-cru-text truncate">
            {entryDisplayName(entry)}
          </p>
          {entryProducer(entry) && (
            <p className="text-2xs font-ui text-cru-text-muted">{entryProducer(entry)}</p>
          )}
        </div>
        {yearsToWindow !== null && (
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-xs" style={{ color: 'var(--cru-text-muted)' }}>
              {yearsToWindow === 0
                ? 'Opens soon'
                : `${yearsToWindow}y away`}
            </p>
          </div>
        )}
        {entry.quantity > 1 && (
          <span className="font-mono text-2xs text-cru-text-muted flex-shrink-0">×{entry.quantity}</span>
        )}
      </div>
    </Link>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  section: CalendarSection;
  accentColor?: string;
  variant?: 'urgent' | 'grid' | 'list';
  delay?: number;
}

function CalendarSection({ section, accentColor, variant = 'grid', delay = 0 }: SectionProps) {
  if (section.entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-5"
    >
      {/* Section header */}
      <div className="flex items-baseline gap-4">
        <h2
          className="font-display"
          style={{ fontSize: '1.35rem', letterSpacing: '-0.01em' }}
        >
          {section.title}
        </h2>
        <span
          className="font-mono text-xs"
          style={{ color: accentColor ?? 'var(--cru-text-muted)' }}
        >
          {section.entries.length} {section.entries.length === 1 ? 'bottle' : 'bottles'}
        </span>
      </div>
      {section.subtitle && (
        <p className="text-xs font-ui text-cru-text-muted -mt-3">{section.subtitle}</p>
      )}

      {variant === 'urgent' && (
        <div className="space-y-2.5">
          {section.entries.map((entry) => (
            <UrgentCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {section.entries.map((entry) => (
            <WindowCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div
          className="rounded-sm overflow-hidden"
          style={{ border: '1px solid var(--cru-border)' }}
        >
          {section.entries.map((entry) => (
            <HoldRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CellarCalendarPage() {
  const { getToken } = useAuth();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['cellar-calendar'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.calendar(token);
    },
  });

  const sections = useMemo<CalendarSection[]>(() => {
    if (!entries) return [];

    const bucket = (statuses: DrinkingWindowStatus[]) =>
      entries.filter((e) => e.drinking_window_status && statuses.includes(e.drinking_window_status));

    return [
      {
        id: 'urgent',
        title: "Drink Now — These Can't Wait",
        subtitle: 'Past peak or declining. Every month matters.',
        statuses: ['past_peak', 'declining'],
        entries: bucket(['past_peak', 'declining']),
      },
      {
        id: 'this_year',
        title: `Open This Year`,
        subtitle: `In window or at peak — ${CURRENT_YEAR} is the right time.`,
        statuses: ['in_window', 'peak'],
        entries: bucket(['in_window', 'peak']),
      },
      {
        id: 'next_three',
        title: 'Approaching Their Window',
        subtitle: 'Opening within 1–3 years. Start planning.',
        statuses: ['approaching'],
        entries: bucket(['approaching']),
      },
      {
        id: 'hold',
        title: 'Still Sleeping',
        subtitle: 'Patience required. Do not disturb.',
        statuses: ['not_ready'],
        entries: bucket(['not_ready']),
      },
    ];
  }, [entries]);

  const hasAny = sections.some((s) => s.entries.length > 0);

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-5xl space-y-12 animate-fade-in">
      {/* Header */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-baseline gap-4"
        >
          <h1 className="font-display" style={{ fontSize: '2.75rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Drinking Calendar
          </h1>
          <span
            className="font-mono text-3xl"
            style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.03em' }}
          >
            {CURRENT_YEAR}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-2 text-sm font-body italic text-cru-text-muted"
        >
          Your cellar, organised by when to open it.
        </motion.p>
      </div>

      {/* Gold divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, var(--cru-accent-gold), transparent)',
          opacity: 0.3,
          transformOrigin: 'left',
        }}
      />

      {!hasAny && (
        <div className="text-center py-16 space-y-3">
          <p className="font-display italic text-xl text-cru-text">No drinking windows yet</p>
          <p className="text-sm font-body text-cru-text-muted max-w-sm mx-auto leading-relaxed">
            Drinking windows are calculated as you add bottles to your cellar. Add your first bottles
            to see when they should be opened.
          </p>
        </div>
      )}

      {/* Urgent section */}
      {sections[0]?.entries.length > 0 && (
        <div
          className="p-1 rounded-sm"
          style={{
            boxShadow: '0 0 40px rgba(139,26,46,0.08)',
          }}
        >
          <CalendarSection
            section={sections[0]}
            accentColor="var(--cru-accent-garnet)"
            variant="urgent"
            delay={0.1}
          />
        </div>
      )}

      {/* This year */}
      <CalendarSection
        section={sections[1]}
        accentColor="var(--cru-accent-gold)"
        variant="grid"
        delay={0.15}
      />

      {/* Approaching */}
      <CalendarSection
        section={sections[2]}
        accentColor="var(--cru-text-muted)"
        variant="grid"
        delay={0.2}
      />

      {/* Hold */}
      <CalendarSection
        section={sections[3]}
        accentColor="var(--cru-text-muted)"
        variant="list"
        delay={0.25}
      />
    </div>
  );
}
