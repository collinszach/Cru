'use client';

import { motion } from 'framer-motion';
import type { ScoringSystem } from '@/types';

interface FeaturedBottleProps {
  entry: {
    id: string;
    wine: {
      full_name: string;
      producer?: string;
      appellation?: string;
    };
    vintage: number;
    featured_story?: string;
    featured_occasion?: string;
    featured_companions?: string[];
    photos?: Array<{ presigned_url: string }>;
    personal_score?: number;
    parker_score?: number;
    jancis_score?: number;
    tasted_at?: string;
  };
  scoringSystem: ScoringSystem;
}

const OCCASION_LABELS: Record<string, string> = {
  anniversary: 'ANNIVERSARY',
  first_discovery: 'FIRST DISCOVERY',
  gift: 'GIFT',
  milestone: 'MILESTONE',
  winery_visit: 'WINERY VISIT',
  other: 'OCCASION',
};

function formatScore(score: number, system: ScoringSystem): string {
  if (system === '100pt') return `${Math.round(score)}`;
  if (system === '20pt') return `${score.toFixed(1)}/20`;
  return `${score}/5`;
}

export default function FeaturedBottle({ entry, scoringSystem }: FeaturedBottleProps) {
  const coverPhoto = entry.photos?.[0];
  const occasionLabel = entry.featured_occasion
    ? OCCASION_LABELS[entry.featured_occasion] ?? entry.featured_occasion.toUpperCase()
    : null;

  const tastedYear = entry.tasted_at
    ? new Date(entry.tasted_at).getFullYear()
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded"
      style={{
        background: 'var(--cru-surface)',
        border: '1px solid var(--cru-border)',
        minHeight: '520px',
      }}
    >
      <div className="flex flex-col lg:flex-row min-h-[520px]">
        {/* Left 55%: Label photo */}
        <div className="relative lg:w-[55%] min-h-[320px] lg:min-h-0 overflow-hidden flex-shrink-0">
          {coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPhoto.presigned_url}
              alt={entry.wine.full_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            /* Placeholder when no photo */
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(145deg, var(--cru-surface-raised), var(--cru-bg))',
              }}
            >
              <span
                className="font-display italic select-none"
                style={{
                  fontSize: 'clamp(5rem, 12vw, 8rem)',
                  color: 'rgba(139,26,46,0.15)',
                  letterSpacing: '-0.04em',
                }}
              >
                {entry.vintage}
              </span>
            </div>
          )}

          {/* Strong bottom vignette — draws eye to story panel */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, transparent 60%, var(--cru-surface) 100%), linear-gradient(to bottom, transparent 55%, rgba(13,11,9,0.85) 100%)',
            }}
          />

          {/* Featured badge — top left */}
          <div className="absolute top-5 left-5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-ui"
              style={{
                background: 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: 'var(--cru-accent-gold)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span>★</span>
              <span>Featured</span>
            </div>
          </div>

          {/* Vintage — bottom right, enormous */}
          <div className="absolute bottom-5 right-6">
            <span
              className="font-mono select-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                color: 'var(--cru-accent-garnet)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              }}
            >
              {entry.vintage}
            </span>
          </div>
        </div>

        {/* Right 45%: Story panel */}
        <div
          className="flex-1 flex flex-col justify-center p-8 lg:p-12 space-y-6"
          style={{ background: 'var(--cru-surface-raised)' }}
        >
          {/* Occasion type */}
          {occasionLabel && (
            <p
              className="font-ui uppercase tracking-widest text-xs"
              style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.18em' }}
            >
              {occasionLabel}
              {tastedYear && (
                <span className="ml-3 font-mono" style={{ color: 'var(--cru-border)' }}>
                  {tastedYear}
                </span>
              )}
            </p>
          )}

          {/* Wine name */}
          <div>
            <h2
              className="font-display italic"
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
                color: 'var(--cru-text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              {entry.wine.full_name}
            </h2>
            {(entry.wine.producer || entry.wine.appellation) && (
              <p
                className="font-ui mt-2"
                style={{ fontSize: '0.8rem', color: 'var(--cru-text-muted)' }}
              >
                {[entry.wine.producer, entry.wine.appellation]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          {/* Gold rule */}
          <div
            className="w-10 border-t-2"
            style={{ borderColor: 'var(--cru-accent-gold)' }}
          />

          {/* Story */}
          {entry.featured_story ? (
            <p
              className="font-body leading-loose"
              style={{
                fontSize: '0.92rem',
                color: 'var(--cru-text)',
                lineHeight: 1.85,
              }}
            >
              {entry.featured_story}
            </p>
          ) : (
            <p
              className="font-body italic"
              style={{ fontSize: '0.88rem', color: 'var(--cru-text-muted)', lineHeight: 1.75 }}
            >
              No story yet. Add one to remember why this bottle matters.
            </p>
          )}

          {/* Companions */}
          {entry.featured_companions && entry.featured_companions.length > 0 && (
            <p
              className="font-ui text-sm italic"
              style={{ color: 'var(--cru-text-muted)' }}
            >
              Shared with{' '}
              <span style={{ color: 'var(--cru-text)' }}>
                {entry.featured_companions.join(', ')}
              </span>
            </p>
          )}

          {/* Score comparison */}
          {(entry.personal_score || entry.parker_score || entry.jancis_score) && (
            <div className="pt-4 border-t border-cru-border">
              <div className="flex flex-wrap gap-4">
                {entry.personal_score && (
                  <div>
                    <p
                      className="text-2xs font-ui uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--cru-text-muted)' }}
                    >
                      Your Score
                    </p>
                    <span
                      className="font-mono text-xl"
                      style={{ color: 'var(--cru-text)' }}
                    >
                      {formatScore(entry.personal_score, scoringSystem)}
                    </span>
                  </div>
                )}
                {entry.parker_score && (
                  <div>
                    <p
                      className="text-2xs font-ui uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--cru-text-muted)' }}
                    >
                      Parker
                    </p>
                    <span
                      className="font-mono text-xl"
                      style={{ color: 'var(--cru-text-muted)' }}
                    >
                      {entry.parker_score}
                    </span>
                  </div>
                )}
                {entry.jancis_score && (
                  <div>
                    <p
                      className="text-2xs font-ui uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--cru-text-muted)' }}
                    >
                      Jancis
                    </p>
                    <span
                      className="font-mono text-xl"
                      style={{ color: 'var(--cru-text-muted)' }}
                    >
                      {entry.jancis_score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
