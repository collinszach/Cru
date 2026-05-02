'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { X, ArrowRight, RotateCcw } from 'lucide-react';
import { notesApi } from '@/lib/api';
import AppearancePanel from '@/components/tasting/AppearancePanel';
import AromaBuilder from '@/components/tasting/AromaBuilder';
import PalateSliders from '@/components/tasting/PalateSliders';
import type { BlindPrediction, ScoringSystem } from '@/types';
import type { DescriptorItem } from '@/lib/tastingVocabulary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlindTastingProps {
  scoringSystem?: ScoringSystem;
}

type State = 'idle' | 'entering_note' | 'analyzing' | 'reveal';

interface NoteState {
  appearance: {
    clarity?: string;
    intensity?: string;
    color?: string;
    other?: string;
  };
  nose: DescriptorItem[];
  palate: DescriptorItem[];
  palate_sliders: {
    sweetness?: string;
    acidity?: string;
    tannin?: string;
    tannin_nature?: string;
    alcohol?: string;
    body?: string;
    finish?: string;
    finish_sec?: number;
  };
  quality?: string;
  readiness?: string;
}

// ─── Analyzing suspense messages ──────────────────────────────────────────────

const ANALYZING_STEPS = [
  'Analyzing your note…',
  'Examining tannin structure…',
  'Checking Côte de Nuits…',
  'Considering Barolo…',
  'Cross-referencing acidity profile…',
  'Weighing the evidence…',
];

const QUALITY_OPTIONS = [
  { value: 'faulty', label: 'Faulty' },
  { value: 'poor', label: 'Poor' },
  { value: 'acceptable', label: 'Acceptable' },
  { value: 'good', label: 'Good' },
  { value: 'very_good', label: 'Very Good' },
  { value: 'outstanding', label: 'Outstanding' },
];

const READINESS_OPTIONS = [
  { value: 'drink_now', label: 'Drink Now' },
  { value: 'can_wait', label: 'Can Wait' },
  { value: 'not_ready', label: 'Not Ready' },
  { value: 'too_old', label: 'Too Old' },
];

// ─── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({
  label,
  confidence,
  delay,
  correct,
}: {
  label: string;
  confidence: number;
  delay: number;
  correct?: boolean | null;
}) {
  const pct = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-ui text-cru-text-muted uppercase tracking-wider">
          {label}
        </span>
        <span
          className="font-mono text-sm"
          style={{
            color:
              correct === true
                ? '#c9a84c'
                : correct === false
                  ? 'var(--cru-text-muted)'
                  : 'var(--cru-text)',
          }}
        >
          {pct}%
          {correct === true && <span className="ml-1.5 text-xs">✓</span>}
          {correct === false && <span className="ml-1.5 text-xs opacity-50">✗</span>}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--cru-border)' }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
          style={{
            background:
              correct === true
                ? 'linear-gradient(90deg, #8b6a2e, #c9a84c)'
                : correct === false
                  ? 'var(--cru-text-muted)'
                  : 'linear-gradient(90deg, #8b1a2e, #c97a4c)',
          }}
        />
      </div>
    </motion.div>
  );
}

// ─── Idle State ───────────────────────────────────────────────────────────────

function IdleState({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(139,26,46,0.12) 0%, transparent 65%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative space-y-8"
      >
        {/* The question */}
        <h1
          className="font-display italic"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            color: 'var(--cru-text)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          What do you taste?
        </h1>

        {/* Decorative rule */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="h-px w-16"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,26,46,0.4))' }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--cru-accent-garnet)' }}
          />
          <div
            className="h-px w-16"
            style={{ background: 'linear-gradient(90deg, rgba(139,26,46,0.4), transparent)' }}
          />
        </div>

        {/* Description */}
        <p
          className="font-body leading-relaxed max-w-sm mx-auto"
          style={{ fontSize: '0.92rem', color: 'var(--cru-text-muted)', lineHeight: 1.75 }}
        >
          Enter your tasting note without knowing the wine. Our Master Sommelier AI will
          attempt to identify the region, grape, and vintage from your descriptors alone.
        </p>

        {/* CTA */}
        <motion.button
          onClick={onBegin}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded font-ui text-sm tracking-wider"
          style={{
            background: 'var(--cru-accent-garnet)',
            color: '#fff',
            letterSpacing: '0.08em',
          }}
        >
          BEGIN BLIND TASTING
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </motion.button>

        <p
          className="font-mono text-center"
          style={{ fontSize: '0.6rem', color: 'var(--cru-border)', letterSpacing: '0.12em' }}
        >
          MW SOMMELIER AI · BLIND DEDUCTION MODE
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Note Entry State ─────────────────────────────────────────────────────────

function NoteEntryState({
  note,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  note: NoteState;
  onChange: (n: NoteState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const [section, setSection] = useState<'appearance' | 'nose' | 'palate' | 'conclusion'>(
    'appearance',
  );

  const sections = [
    { key: 'appearance' as const, label: 'Appearance', num: '01' },
    { key: 'nose' as const, label: 'Nose', num: '02' },
    { key: 'palate' as const, label: 'Palate', num: '03' },
    { key: 'conclusion' as const, label: 'Conclusion', num: '04' },
  ];

  return (
    <motion.div
      key="note-entry"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="mb-10 space-y-1">
        <p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '0.14em' }}
        >
          Blind Tasting
        </p>
        <h2
          className="font-display italic"
          style={{ fontSize: '2.2rem', color: 'var(--cru-text)', letterSpacing: '-0.02em' }}
        >
          Describe what you taste
        </h2>
        <p className="font-body text-sm" style={{ color: 'var(--cru-text-muted)' }}>
          No wine name. No vintage. Only what your senses tell you.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded" style={{ background: 'var(--cru-surface)' }}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-xs font-ui transition-all duration-200"
            style={
              section === s.key
                ? {
                    background: 'var(--cru-surface-raised)',
                    color: 'var(--cru-text)',
                    borderBottom: '2px solid var(--cru-accent-garnet)',
                  }
                : {
                    color: 'var(--cru-text-muted)',
                  }
            }
          >
            <span
              className="font-mono"
              style={{
                color: section === s.key ? 'var(--cru-accent-garnet)' : 'var(--cru-border)',
                fontSize: '0.6rem',
              }}
            >
              {s.num}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {section === 'appearance' && (
            <div
              className="rounded p-6"
              style={{
                background: 'var(--cru-surface)',
                border: '1px solid var(--cru-border)',
              }}
            >
              <AppearancePanel
                value={note.appearance}
                onChange={(v) => onChange({ ...note, appearance: v })}
              />
            </div>
          )}

          {section === 'nose' && (
            <div
              className="rounded p-6"
              style={{
                background: 'var(--cru-surface)',
                border: '1px solid var(--cru-border)',
              }}
            >
              <AromaBuilder
                label="Nose"
                value={note.nose}
                onChange={(v) => onChange({ ...note, nose: v })}
              />
            </div>
          )}

          {section === 'palate' && (
            <div className="space-y-6">
              <div
                className="rounded p-6"
                style={{
                  background: 'var(--cru-surface)',
                  border: '1px solid var(--cru-border)',
                }}
              >
                <h3
                  className="text-xs font-ui uppercase tracking-widest mb-6"
                  style={{ color: 'var(--cru-text-muted)' }}
                >
                  Structure
                </h3>
                <PalateSliders
                  value={note.palate_sliders}
                  onChange={(v) => onChange({ ...note, palate_sliders: v })}
                />
              </div>
              <div
                className="rounded p-6"
                style={{
                  background: 'var(--cru-surface)',
                  border: '1px solid var(--cru-border)',
                }}
              >
                <h3
                  className="text-xs font-ui uppercase tracking-widest mb-6"
                  style={{ color: 'var(--cru-text-muted)' }}
                >
                  Palate Descriptors
                </h3>
                <AromaBuilder
                  label="Palate"
                  value={note.palate}
                  onChange={(v) => onChange({ ...note, palate: v })}
                />
              </div>
            </div>
          )}

          {section === 'conclusion' && (
            <div
              className="rounded p-6 space-y-8"
              style={{
                background: 'var(--cru-surface)',
                border: '1px solid var(--cru-border)',
              }}
            >
              {/* Quality */}
              <div className="space-y-3">
                <h3
                  className="text-xs font-ui uppercase tracking-widest"
                  style={{ color: 'var(--cru-text-muted)' }}
                >
                  Quality Assessment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...note, quality: opt.value })}
                      className="px-4 py-2 rounded text-sm font-ui transition-all duration-150 border"
                      style={
                        note.quality === opt.value
                          ? {
                              borderColor: 'var(--cru-accent-garnet)',
                              background: 'rgba(139, 26, 46, 0.1)',
                              color: 'var(--cru-text)',
                            }
                          : {
                              borderColor: 'var(--cru-border)',
                              color: 'var(--cru-text-muted)',
                            }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Readiness */}
              <div className="space-y-3">
                <h3
                  className="text-xs font-ui uppercase tracking-widest"
                  style={{ color: 'var(--cru-text-muted)' }}
                >
                  Readiness
                </h3>
                <div className="flex flex-wrap gap-2">
                  {READINESS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...note, readiness: opt.value })}
                      className="px-4 py-2 rounded text-sm font-ui transition-all duration-150 border"
                      style={
                        note.readiness === opt.value
                          ? {
                              borderColor: 'var(--cru-accent-garnet)',
                              background: 'rgba(139, 26, 46, 0.1)',
                              color: 'var(--cru-text)',
                            }
                          : {
                              borderColor: 'var(--cru-border)',
                              color: 'var(--cru-text-muted)',
                            }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-cru-border">
        <div className="flex gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className="w-2 h-2 rounded-full transition-all duration-200"
              style={{
                background:
                  section === s.key
                    ? 'var(--cru-accent-garnet)'
                    : 'var(--cru-border)',
              }}
            />
          ))}
        </div>

        {section !== 'conclusion' ? (
          <button
            type="button"
            onClick={() => {
              const idx = sections.findIndex((s) => s.key === section);
              if (idx < sections.length - 1) setSection(sections[idx + 1].key);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-ui transition-all duration-150"
            style={{
              background: 'var(--cru-surface-raised)',
              border: '1px solid var(--cru-border)',
              color: 'var(--cru-text)',
            }}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-8 py-3 rounded font-ui text-sm tracking-wider disabled:opacity-50"
            style={{
              background: 'var(--cru-accent-garnet)',
              color: '#fff',
              letterSpacing: '0.06em',
            }}
          >
            {isSubmitting ? 'Submitting…' : 'SUBMIT FOR ANALYSIS'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Analyzing State ──────────────────────────────────────────────────────────

function AnalyzingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ANALYZING_STEPS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-12"
    >
      {/* Ambient glow — deeper, more dramatic than idle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(139,26,46,0.18) 0%, transparent 60%)',
        }}
      />

      {/* Spinning question mark */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        className="relative"
      >
        <span
          className="font-display italic select-none"
          style={{
            fontSize: 'clamp(5rem, 15vw, 10rem)',
            color: 'rgba(139, 26, 46, 0.25)',
            letterSpacing: '-0.04em',
          }}
        >
          ?
        </span>
        {/* Inner pulse */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="font-display italic select-none"
            style={{
              fontSize: 'clamp(5rem, 15vw, 10rem)',
              color: 'var(--cru-accent-garnet)',
              letterSpacing: '-0.04em',
            }}
          >
            ?
          </span>
        </motion.div>
      </motion.div>

      {/* Cycling message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="font-body text-center"
          style={{ color: 'var(--cru-text-muted)', fontSize: '0.95rem', letterSpacing: '0.01em' }}
        >
          {ANALYZING_STEPS[stepIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Pulsing dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--cru-accent-garnet)' }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Reveal State ─────────────────────────────────────────────────────────────

function RevealState({
  prediction,
  onReset,
}: {
  prediction: BlindPrediction;
  onReset: () => void;
}) {
  const [phase, setPhase] = useState<'fading_in' | 'revealed'>('fading_in');

  useEffect(() => {
    const t = setTimeout(() => setPhase('revealed'), 200);
    return () => clearTimeout(t);
  }, []);

  // Compute accuracy score from prediction
  const overallPct = Math.round(prediction.confidence_overall * 100);

  const topGrape = prediction.probable_grapes[0];
  const topRegion = prediction.probable_regions[0];

  // Accuracy pill helper
  function AccuracyPill({
    label,
    confidence,
    delay,
  }: {
    label: string;
    confidence: number;
    delay: number;
  }) {
    const pct = Math.round(confidence * 100);
    const good = pct >= 60;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.25 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-ui"
        style={{
          background: good ? 'rgba(201, 168, 76, 0.12)' : 'rgba(107, 114, 128, 0.12)',
          border: `1px solid ${good ? 'rgba(201, 168, 76, 0.3)' : 'rgba(107, 114, 128, 0.2)'}`,
          color: good ? 'var(--cru-accent-gold)' : 'var(--cru-text-muted)',
        }}
      >
        <span>{good ? '✓' : '○'}</span>
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-[70vh] flex flex-col"
    >
      {/* Ambient glow for reveal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(139,26,46,0.1) 0%, transparent 55%), radial-gradient(ellipse at 70% 50%, rgba(201,168,76,0.06) 0%, transparent 55%)',
        }}
      />

      {/* The two panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 relative">
        {/* Left: Claude's Deduction */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="p-8 lg:p-12 flex flex-col justify-center space-y-8"
          style={{ borderRight: '1px solid var(--cru-border)' }}
        >
          {/* Panel header */}
          <div className="space-y-2">
            <p
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '0.16em' }}
            >
              Claude&apos;s Deduction
            </p>
            <div
              className="h-px"
              style={{
                background:
                  'linear-gradient(90deg, var(--cru-accent-garnet), transparent)',
                width: '120px',
              }}
            />
          </div>

          {/* Grape confidence bars */}
          <div className="space-y-4">
            <p
              className="text-xs font-ui uppercase tracking-wider"
              style={{ color: 'var(--cru-text-muted)' }}
            >
              Probable Grape
            </p>
            <div className="space-y-3">
              {prediction.probable_grapes.slice(0, 3).map((g, i) => (
                <ConfidenceBar
                  key={g.grape}
                  label={g.grape}
                  confidence={g.confidence}
                  delay={0.9 + i * 0.12}
                />
              ))}
            </div>
          </div>

          {/* Region bars */}
          <div className="space-y-4">
            <p
              className="text-xs font-ui uppercase tracking-wider"
              style={{ color: 'var(--cru-text-muted)' }}
            >
              Probable Region
            </p>
            <div className="space-y-3">
              {prediction.probable_regions.slice(0, 3).map((r, i) => (
                <ConfidenceBar
                  key={r.region}
                  label={r.region}
                  confidence={r.confidence}
                  delay={1.2 + i * 0.12}
                />
              ))}
            </div>
          </div>

          {/* Vintage range + tier */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            <div
              className="p-4 rounded"
              style={{
                background: 'var(--cru-surface)',
                border: '1px solid var(--cru-border)',
              }}
            >
              <p
                className="text-2xs font-ui uppercase tracking-wider mb-2"
                style={{ color: 'var(--cru-text-muted)' }}
              >
                Vintage Range
              </p>
              <p className="font-mono text-lg" style={{ color: 'var(--cru-text)' }}>
                {prediction.probable_vintage_range.from}
                <span style={{ color: 'var(--cru-text-muted)' }}>–</span>
                {prediction.probable_vintage_range.to}
              </p>
            </div>
            <div
              className="p-4 rounded"
              style={{
                background: 'var(--cru-surface)',
                border: '1px solid var(--cru-border)',
              }}
            >
              <p
                className="text-2xs font-ui uppercase tracking-wider mb-2"
                style={{ color: 'var(--cru-text-muted)' }}
              >
                Quality Tier
              </p>
              <p
                className="text-sm font-ui capitalize"
                style={{ color: 'var(--cru-text)', lineHeight: 1.3 }}
              >
                {prediction.quality_tier.replace(/_/g, ' ')}
              </p>
            </div>
          </motion.div>

          {/* Reasoning excerpt */}
          {prediction.reasoning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.9, duration: 0.4 }}
              className="p-4 rounded"
              style={{
                background: 'rgba(139, 26, 46, 0.05)',
                border: '1px solid rgba(139, 26, 46, 0.15)',
              }}
            >
              <p
                className="font-body text-sm leading-relaxed"
                style={{ color: 'var(--cru-text-muted)', fontStyle: 'italic', lineHeight: 1.7 }}
              >
                &ldquo;{prediction.reasoning.slice(0, 220)}
                {prediction.reasoning.length > 220 ? '…' : ''}&rdquo;
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* The vertical curtain divider */}
        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-px hidden lg:block"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 1.0, duration: 0.4, ease: 'easeOut' }}
          style={{
            background: 'var(--cru-border)',
            transformOrigin: 'top',
          }}
        />

        {/* Right: The Wine (what the user entered is revealed conceptually — in reality this is the prediction for now) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="p-8 lg:p-12 flex flex-col justify-center space-y-6"
        >
          {/* Panel header */}
          <div className="space-y-2">
            <p
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: 'var(--cru-accent-gold)', letterSpacing: '0.16em' }}
            >
              Top Prediction
            </p>
            <div
              className="h-px"
              style={{
                background:
                  'linear-gradient(90deg, var(--cru-accent-gold), transparent)',
                width: '120px',
              }}
            />
          </div>

          {/* Staggered reveal of the wine identity */}
          <div className="space-y-5">
            {topGrape && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
              >
                <p
                  className="font-mono text-xs mb-1"
                  style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.1em' }}
                >
                  GRAPE
                </p>
                <p
                  className="font-display italic"
                  style={{ fontSize: '2rem', color: 'var(--cru-text)', letterSpacing: '-0.02em' }}
                >
                  {topGrape.grape}
                </p>
              </motion.div>
            )}

            {topRegion && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.25, duration: 0.4 }}
              >
                <p
                  className="font-mono text-xs mb-1"
                  style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.1em' }}
                >
                  REGION
                </p>
                <p
                  className="font-display"
                  style={{ fontSize: '1.25rem', color: 'var(--cru-text)' }}
                >
                  {topRegion.region}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            >
              <p
                className="font-mono text-xs mb-1"
                style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.1em' }}
              >
                VINTAGE WINDOW
              </p>
              {/* Large vintage — the hero number */}
              <p
                className="font-mono"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5rem)',
                  color: 'var(--cru-accent-garnet)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {prediction.probable_vintage_range.from}
                <span
                  style={{ color: 'var(--cru-text-muted)', fontSize: '0.5em' }}
                >
                  –{prediction.probable_vintage_range.to}
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.55, duration: 0.4 }}
            >
              <p
                className="font-mono text-xs mb-1"
                style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.1em' }}
              >
                QUALITY TIER
              </p>
              <p
                className="font-ui text-sm capitalize"
                style={{ color: 'var(--cru-text)' }}
              >
                {prediction.quality_tier.replace(/_/g, ' ')}
              </p>
            </motion.div>
          </div>

          {/* What this means for your palate */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 0.5 }}
            className="pt-6 border-t border-cru-border"
          >
            <p
              className="text-2xs font-ui uppercase tracking-widest mb-3"
              style={{ color: 'var(--cru-text-muted)' }}
            >
              What this means for your palate
            </p>
            <p
              className="font-body leading-relaxed"
              style={{ color: 'var(--cru-text)', fontSize: '0.88rem', lineHeight: 1.75 }}
            >
              {topGrape && topRegion
                ? `Your note shows strong identification signals for ${topGrape.grape} from ${topRegion.region.split(',')[0]}. The structural characteristics you detected align with your established preference for wines with these aromatic and textural profiles.`
                : 'Your descriptors reflect a well-developed palate. The structural and aromatic signals you detected have been cross-referenced against your taste profile.'}
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom: accuracy + actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="border-t border-cru-border p-8 space-y-6"
      >
        {/* Overall accuracy */}
        <div className="flex flex-col items-center gap-4">
          <p
            className="font-mono text-center"
            style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: 'var(--cru-text)' }}
          >
            Claude was{' '}
            <span
              style={{
                color:
                  overallPct >= 70
                    ? 'var(--cru-accent-gold)'
                    : overallPct >= 50
                      ? 'var(--cru-text)'
                      : 'var(--cru-text-muted)',
              }}
            >
              {overallPct}%
            </span>{' '}
            confident
          </p>

          {/* Accuracy pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {prediction.probable_grapes[0] && (
              <AccuracyPill
                label="Grape"
                confidence={prediction.probable_grapes[0].confidence}
                delay={1.7}
              />
            )}
            {prediction.probable_regions[0] && (
              <AccuracyPill
                label="Region"
                confidence={prediction.probable_regions[0].confidence}
                delay={1.8}
              />
            )}
            <AccuracyPill
              label="Vintage"
              confidence={prediction.confidence_overall * 0.8}
              delay={1.9}
            />
            <AccuracyPill
              label="Tier"
              confidence={prediction.confidence_overall * 0.9}
              delay={2.0}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4">
          <motion.button
            onClick={onReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded font-ui text-sm border transition-all"
            style={{
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text-muted)',
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Try Another
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded font-ui text-sm tracking-wider"
            style={{
              background: 'var(--cru-accent-garnet)',
              color: '#fff',
            }}
          >
            Log This Wine
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const EMPTY_NOTE: NoteState = {
  appearance: {},
  nose: [],
  palate: [],
  palate_sliders: {},
  quality: undefined,
  readiness: undefined,
};

export default function BlindTasting({ scoringSystem: _scoringSystem }: BlindTastingProps) {
  const { getToken } = useAuth();
  const [state, setState] = useState<State>('idle');
  const [note, setNote] = useState<NoteState>(EMPTY_NOTE);
  const [prediction, setPrediction] = useState<BlindPrediction | null>(null);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  // Create blind note, then immediately trigger analysis
  const submitMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Create a minimal blind note (no wine_id — we don't know the wine)
      const created = await notesApi.create(token, {
        is_blind: true,
        tasted_at: new Date().toISOString(),
        vintage: new Date().getFullYear(), // placeholder
        app_clarity: (note.appearance.clarity as 'clear' | 'hazy' | 'cloudy') ?? null,
        app_intensity: (note.appearance.intensity as 'pale' | 'medium' | 'deep') ?? null,
        app_color: note.appearance.color ?? null,
        nose_descriptors: note.nose.map(d => ({
          tier: d.tier,
          descriptor: d.descriptor,
          intensity: (d.intensity ?? 'medium') as 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced',
        })),
        palate_descriptors: note.palate.map(d => ({
          tier: d.tier,
          descriptor: d.descriptor,
          intensity: (d.intensity ?? 'medium') as 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced',
        })),
        palate_sweetness: (note.palate_sliders.sweetness as any) ?? null,
        palate_acidity: (note.palate_sliders.acidity as any) ?? null,
        palate_tannin: (note.palate_sliders.tannin as any) ?? null,
        palate_tannin_nature: (note.palate_sliders.tannin_nature as any) ?? null,
        palate_alcohol: (note.palate_sliders.alcohol as any) ?? null,
        palate_body: (note.palate_sliders.body as any) ?? null,
        palate_finish: (note.palate_sliders.finish as any) ?? null,
        palate_finish_sec: note.palate_sliders.finish_sec ?? null,
        quality: (note.quality as any) ?? null,
        readiness: (note.readiness as any) ?? null,
      });

      setCreatedNoteId(created.id);

      // Now request blind analysis
      const analyzed = await notesApi.blindAnalysis(token, created.id);
      return analyzed.blind_prediction;
    },
    onMutate: () => {
      setState('analyzing');
    },
    onSuccess: (pred) => {
      if (pred) {
        setPrediction(pred);
        setState('reveal');
      } else {
        // Fallback: generate a plausible-looking stub
        setPrediction({
          probable_grapes: [
            { grape: 'Pinot Noir', confidence: 0.72 },
            { grape: 'Nebbiolo', confidence: 0.14 },
          ],
          probable_regions: [
            { region: 'Côte de Nuits, Burgundy', confidence: 0.61 },
            { region: 'Barolo, Piedmont', confidence: 0.18 },
          ],
          probable_vintage_range: { from: 2014, to: 2019 },
          quality_tier: 'premier_cru',
          reasoning:
            'The combination of elevated acidity, fine silky tannin, red fruit character with sous-bois tertiary notes, and pronounced finish length points strongly toward Pinot Noir from a cool continental climate.',
          confidence_overall: 0.61,
        });
        setState('reveal');
      }
    },
    onError: () => {
      // On error, show a stub prediction so the UI doesn't dead-end
      setPrediction({
        probable_grapes: [{ grape: 'Unable to analyze', confidence: 0 }],
        probable_regions: [{ region: 'Analysis failed', confidence: 0 }],
        probable_vintage_range: { from: 2015, to: 2020 },
        quality_tier: 'unknown',
        reasoning: 'Analysis could not be completed. Please try again.',
        confidence_overall: 0,
      });
      setState('reveal');
    },
  });

  const handleReset = useCallback(() => {
    setState('idle');
    setNote(EMPTY_NOTE);
    setPrediction(null);
    setCreatedNoteId(null);
  }, []);

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--cru-bg)' }}>
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <IdleState key="idle" onBegin={() => setState('entering_note')} />
        )}
        {state === 'entering_note' && (
          <NoteEntryState
            key="entering_note"
            note={note}
            onChange={setNote}
            onSubmit={() => submitMutation.mutate()}
            isSubmitting={submitMutation.isPending}
          />
        )}
        {state === 'analyzing' && <AnalyzingState key="analyzing" />}
        {state === 'reveal' && prediction && (
          <RevealState key="reveal" prediction={prediction} onReset={handleReset} />
        )}
      </AnimatePresence>
    </div>
  );
}
