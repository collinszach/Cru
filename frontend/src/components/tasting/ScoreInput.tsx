'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { getScoreLabel } from '@/lib/tastingVocabulary';

interface CriticScores {
  parker?: number
  spectator?: number
  jancis?: number
  decanter?: number
  suckling?: number
}

interface ScoreInputProps {
  value?: number
  onChange: (score: number) => void
  system: '100pt' | '20pt' | '5star'
  criticScores?: CriticScores
  onCriticScoresChange?: (scores: CriticScores) => void
}

// ─── Star component ───────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  function getFill(starIndex: number): 'full' | 'half' | 'empty' {
    const v = display;
    if (v >= starIndex) return 'full';
    if (v >= starIndex - 0.5) return 'half';
    return 'empty';
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>, star: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHover(x < rect.width / 2 ? star - 0.5 : star);
  }

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = getFill(star);
        return (
          <svg
            key={star}
            width="36"
            height="36"
            viewBox="0 0 24 24"
            className="cursor-pointer"
            onMouseMove={(e) => handleMouseMove(e, star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(hover ?? star)}
          >
            <defs>
              <linearGradient id={`star-grad-${star}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="50%" stopColor="#8b1a2e" />
                <stop offset="50%" stopColor={fill === 'full' ? '#8b1a2e' : 'transparent'} />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={
                fill === 'full'
                  ? '#8b1a2e'
                  : fill === 'half'
                  ? `url(#star-grad-${star})`
                  : 'transparent'
              }
              stroke={fill === 'empty' ? '#2d2420' : '#8b1a2e'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

// ─── Critic score input row ───────────────────────────────────────────────────

function CriticScoreRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cru-border last:border-0">
      <span className="text-xs font-ui text-cru-text-muted">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value ? parseFloat(e.target.value) : undefined)
        }
        placeholder="—"
        className="w-16 px-2 py-1 text-center font-mono text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScoreInput({
  value,
  onChange,
  system,
  criticScores,
  onCriticScoresChange,
}: ScoreInputProps) {
  const [showCritics, setShowCritics] = useState(false);

  const { min, max, step } = system === '100pt'
    ? { min: 50, max: 100, step: 1 }
    : system === '20pt'
    ? { min: 10, max: 20, step: 0.5 }
    : { min: 0.5, max: 5, step: 0.5 };

  const scoreLabel = value != null ? getScoreLabel(value, system) : null;

  function increment() {
    const current = value ?? (system === '100pt' ? 87 : system === '20pt' ? 16 : 3);
    onChange(Math.min(max, current + step));
  }

  function decrement() {
    const current = value ?? (system === '100pt' ? 87 : system === '20pt' ? 16 : 3);
    onChange(Math.max(min, current - step));
  }

  return (
    <div className="space-y-4">
      {/* Main score display */}
      {system === '5star' ? (
        <div className="space-y-3">
          <StarRating value={value} onChange={onChange} />
          {value != null && (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl text-cru-text">
                {'★'.repeat(Math.floor(value))}
                {value % 1 === 0.5 ? '½' : ''}
              </span>
              <span className="text-sm font-ui text-cru-text-muted">{scoreLabel}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Decrement */}
          <button
            type="button"
            onClick={decrement}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-cru-border text-cru-text-muted hover:text-cru-text hover:border-cru-accent-garnet hover:bg-cru-accent-garnet/10 transition-all duration-150"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Score display + input */}
          <div className="flex-1 text-center">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= min && v <= max) onChange(v);
              }}
              placeholder={system === '100pt' ? '87' : '16.5'}
              className="w-full text-center font-mono bg-transparent border-none outline-none focus:outline-none"
              style={{
                fontSize: '4rem',
                lineHeight: 1,
                color: value != null ? 'var(--cru-text)' : 'var(--cru-text-muted)',
                letterSpacing: '-0.04em',
              }}
            />
            {scoreLabel && (
              <motion.p
                key={scoreLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm font-ui"
                style={{ color: 'var(--cru-accent-gold)' }}
              >
                {scoreLabel}
              </motion.p>
            )}
          </div>

          {/* Increment */}
          <button
            type="button"
            onClick={increment}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-cru-border text-cru-text-muted hover:text-cru-text hover:border-cru-accent-garnet hover:bg-cru-accent-garnet/10 transition-all duration-150"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Range label */}
      {system !== '5star' && (
        <p className="text-center text-2xs font-ui text-cru-text-muted">
          {min} – {max} · {step === 1 ? '1pt increments' : `${step}pt increments`}
        </p>
      )}

      {/* Critic scores expander */}
      {onCriticScoresChange && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowCritics((p) => !p)}
            className="flex items-center gap-2 text-xs font-ui text-cru-text-muted hover:text-cru-text transition-colors"
          >
            {showCritics ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showCritics ? 'Hide' : 'Add'} critic scores
          </button>

          <AnimatePresence>
            {showCritics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-lg p-1 mt-2"
                  style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
                >
                  <CriticScoreRow
                    label="Robert Parker / Wine Advocate"
                    value={criticScores?.parker}
                    onChange={(v) => onCriticScoresChange({ ...criticScores, parker: v })}
                    min={50} max={100} step={1}
                  />
                  <CriticScoreRow
                    label="Wine Spectator"
                    value={criticScores?.spectator}
                    onChange={(v) => onCriticScoresChange({ ...criticScores, spectator: v })}
                    min={50} max={100} step={1}
                  />
                  <CriticScoreRow
                    label="Jancis Robinson"
                    value={criticScores?.jancis}
                    onChange={(v) => onCriticScoresChange({ ...criticScores, jancis: v })}
                    min={10} max={20} step={0.5}
                  />
                  <CriticScoreRow
                    label="Decanter"
                    value={criticScores?.decanter}
                    onChange={(v) => onCriticScoresChange({ ...criticScores, decanter: v })}
                    min={50} max={100} step={1}
                  />
                  <CriticScoreRow
                    label="James Suckling"
                    value={criticScores?.suckling}
                    onChange={(v) => onCriticScoresChange({ ...criticScores, suckling: v })}
                    min={50} max={100} step={1}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
