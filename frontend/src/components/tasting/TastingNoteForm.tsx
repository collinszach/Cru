'use client';

import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import AppearancePanel from './AppearancePanel';
import AromaBuilder from './AromaBuilder';
import PalateSliders from './PalateSliders';
import ScoreInput from './ScoreInput';
import {
  WINE_FAULTS,
  NOSE_INTENSITY_LEVELS,
  NOSE_DEVELOPMENT_LEVELS,
  PALATE_INTENSITY_LEVELS,
} from '@/lib/tastingVocabulary';
import type { DescriptorItem } from '@/lib/tastingVocabulary';
import type { ScoringSystem } from '@/types';

// ─── Form data shape ──────────────────────────────────────────────────────────

export interface TastingNoteFormData {
  wine_id: string
  vintage: number
  cellar_entry_id?: string
  tasted_at: string
  // Context
  location?: string
  occasion?: string
  decant_minutes?: number
  serve_temp_c?: number
  companions?: string[]
  // Appearance
  app_clarity?: string
  app_intensity?: string
  app_color?: string
  app_other?: string
  // Nose
  nose_condition: 'clean' | 'faulty'
  nose_fault?: string
  nose_intensity?: string
  nose_development?: string
  nose_descriptors: DescriptorItem[]
  // Palate
  palate_sweetness?: string
  palate_acidity?: string
  palate_tannin?: string
  palate_tannin_nature?: string
  palate_alcohol?: string
  palate_body?: string
  palate_mousse?: string
  palate_finish?: string
  palate_finish_sec?: number
  palate_intensity?: string
  palate_descriptors: DescriptorItem[]
  // Conclusion
  quality?: string
  readiness?: string
  drink_from?: number
  drink_by?: number
  pairing_notes?: string
  // Score
  personal_score?: number
  parker_score?: number
  spectator_score?: number
  jancis_score?: number
  decanter_score?: number
  suckling_score?: number
  // Free text
  free_note?: string
}

interface TastingNoteFormProps {
  wineId: string
  wineName: string
  vintage: number
  wineColor?: string
  isSparkling?: boolean
  cellarEntryId?: string
  scoringSystem: ScoringSystem
  onSubmit: (data: TastingNoteFormData) => Promise<void>
  onCancel?: () => void
}

// ─── Section header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  number: string
  title: string
  isComplete: boolean
  isOpen: boolean
  onToggle: () => void
  sticky?: boolean
}

function SectionHeader({ number, title, isComplete, isOpen, onToggle, sticky }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'w-full flex items-center justify-between py-4 transition-colors duration-150 group',
        sticky && 'sticky z-20 bg-cru-bg',
        isOpen ? '' : 'hover:bg-cru-surface-raised/20',
      )}
      style={sticky ? { top: 0 } : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Completion indicator */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--cru-accent-garnet)' }}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : (
            <Circle className="h-5 w-5 text-cru-border" />
          )}
        </div>

        {/* Title */}
        <h3
          className="text-lg italic text-left"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          <span className="text-cru-text-muted mr-2 not-italic text-sm font-ui">
            {number}.
          </span>
          {title}
        </h3>
      </div>

      <ChevronDown
        className={clsx(
          'h-4 w-4 text-cru-text-muted transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded text-sm font-ui border transition-all duration-150',
        active
          ? 'border-cru-accent-garnet bg-cru-accent-garnet/10 text-cru-text'
          : 'border-cru-border text-cru-text-muted hover:border-cru-text-muted hover:text-cru-text',
      )}
    >
      {children}
    </button>
  );
}

// ─── Section body wrapper ─────────────────────────────────────────────────────

function SectionBody({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pb-8 space-y-6">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function TastingNoteForm({
  wineId,
  wineName,
  vintage,
  wineColor,
  isSparkling = false,
  cellarEntryId,
  scoringSystem,
  onSubmit,
  onCancel,
}: TastingNoteFormProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    context: false,
    appearance: true,
    nose: false,
    palate: false,
    conclusions: false,
    score: false,
    freeNote: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, watch, setValue, getValues } = useForm<TastingNoteFormData>({
    defaultValues: {
      wine_id: wineId,
      vintage,
      cellar_entry_id: cellarEntryId,
      tasted_at: new Date().toISOString().slice(0, 16),
      nose_condition: 'clean',
      nose_descriptors: [],
      palate_descriptors: [],
    },
  });

  const formValues = watch();

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openNext(current: string) {
    const order = ['context', 'appearance', 'nose', 'palate', 'conclusions', 'score', 'freeNote'];
    const idx = order.indexOf(current);
    if (idx < order.length - 1) {
      const next = order[idx + 1];
      setOpenSections((prev) => ({
        ...prev,
        [current]: false,
        ...(next ? { [next]: true } : {}),
      }));
    }
  }

  // Completion checks
  const isAppearanceComplete = !!(formValues.app_clarity && formValues.app_intensity && formValues.app_color);
  const isNoseComplete = formValues.nose_descriptors.length > 0;
  const isPalateComplete = !!(formValues.palate_acidity && formValues.palate_body);
  const isConclusionsComplete = !!(formValues.quality && formValues.readiness);
  const isScoreComplete = formValues.personal_score != null;
  const isFreeNoteComplete = !!(formValues.free_note && formValues.free_note.length > 20);

  async function handleFormSubmit(data: TastingNoteFormData) {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-0">
      {/* Wine identity bar */}
      <div
        className="mb-8 p-4 rounded-lg"
        style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
      >
        <div className="flex items-baseline gap-4">
          <span
            className="font-mono text-3xl"
            style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.04em' }}
          >
            {vintage}
          </span>
          <span
            className="text-xl italic text-cru-text"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {wineName}
          </span>
        </div>
      </div>

      {/* ─── Section 0: Context ─────────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="0"
          title="Context"
          isComplete={!!(formValues.location || formValues.occasion)}
          isOpen={openSections.context}
          onToggle={() => toggleSection('context')}
        />
        <SectionBody isOpen={openSections.context}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Date & Time
              </label>
              <Controller
                control={control}
                name="tasted_at"
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    {...field}
                    className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Occasion
              </label>
              <Controller
                control={control}
                name="occasion"
                render={({ field }) => (
                  <input
                    type="text"
                    placeholder="Dinner, blind tasting, winery visit..."
                    {...field}
                    value={field.value ?? ''}
                    className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Location
              </label>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <input
                    type="text"
                    placeholder="Restaurant, home, winery..."
                    {...field}
                    value={field.value ?? ''}
                    className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Decant time (min)
              </label>
              <Controller
                control={control}
                name="decant_minutes"
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    max={720}
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
                  />
                )}
              />
            </div>
          </div>
        </SectionBody>
      </div>

      {/* ─── Section I: Appearance ──────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="I"
          title="Appearance"
          isComplete={isAppearanceComplete}
          isOpen={openSections.appearance}
          onToggle={() => toggleSection('appearance')}
          sticky
        />
        <SectionBody isOpen={openSections.appearance}>
          <Controller
            control={control}
            name="app_clarity"
            render={() => (
              <AppearancePanel
                value={{
                  clarity: formValues.app_clarity,
                  intensity: formValues.app_intensity,
                  color: formValues.app_color,
                  other: formValues.app_other,
                }}
                onChange={(v) => {
                  setValue('app_clarity', v.clarity);
                  setValue('app_intensity', v.intensity);
                  setValue('app_color', v.color);
                  setValue('app_other', v.other);
                }}
                wineColor={wineColor}
              />
            )}
          />
          <button
            type="button"
            onClick={() => openNext('appearance')}
            className="text-xs font-ui text-cru-text-muted hover:text-cru-accent-gold transition-colors"
          >
            Continue to Nose →
          </button>
        </SectionBody>
      </div>

      {/* ─── Section II: Nose ───────────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="II"
          title="Nose"
          isComplete={isNoseComplete}
          isOpen={openSections.nose}
          onToggle={() => toggleSection('nose')}
          sticky
        />
        <SectionBody isOpen={openSections.nose}>
          {/* Condition toggle */}
          <div className="space-y-3">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Condition
            </p>
            <div className="flex gap-2">
              <Controller
                control={control}
                name="nose_condition"
                render={({ field }) => (
                  <>
                    <PillButton
                      active={field.value === 'clean'}
                      onClick={() => field.onChange('clean')}
                    >
                      Clean
                    </PillButton>
                    <PillButton
                      active={field.value === 'faulty'}
                      onClick={() => field.onChange('faulty')}
                    >
                      Faulty
                    </PillButton>
                  </>
                )}
              />
            </div>

            {/* Fault selector */}
            {formValues.nose_condition === 'faulty' && (
              <Controller
                control={control}
                name="nose_fault"
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value ?? ''}
                    className="px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
                  >
                    <option value="">Select fault...</option>
                    {WINE_FAULTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            )}
          </div>

          {/* Intensity + development */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
                Intensity
              </p>
              <div className="flex flex-wrap gap-2">
                {NOSE_INTENSITY_LEVELS.map((level) => (
                  <PillButton
                    key={level}
                    active={formValues.nose_intensity === level}
                    onClick={() =>
                      setValue(
                        'nose_intensity',
                        formValues.nose_intensity === level ? undefined : level,
                      )
                    }
                  >
                    {level}
                  </PillButton>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
                Development
              </p>
              <div className="flex flex-wrap gap-2">
                {NOSE_DEVELOPMENT_LEVELS.map((level) => (
                  <PillButton
                    key={level}
                    active={formValues.nose_development === level}
                    onClick={() =>
                      setValue(
                        'nose_development',
                        formValues.nose_development === level ? undefined : level,
                      )
                    }
                  >
                    {level}
                  </PillButton>
                ))}
              </div>
            </div>
          </div>

          {/* Aroma builder */}
          <Controller
            control={control}
            name="nose_descriptors"
            render={({ field }) => (
              <AromaBuilder
                label="Nose"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <button
            type="button"
            onClick={() => openNext('nose')}
            className="text-xs font-ui text-cru-text-muted hover:text-cru-accent-gold transition-colors"
          >
            Continue to Palate →
          </button>
        </SectionBody>
      </div>

      {/* ─── Section III: Palate ────────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="III"
          title="Palate"
          isComplete={isPalateComplete}
          isOpen={openSections.palate}
          onToggle={() => toggleSection('palate')}
          sticky
        />
        <SectionBody isOpen={openSections.palate}>
          {/* Sliders */}
          <Controller
            control={control}
            name="palate_sweetness"
            render={() => (
              <PalateSliders
                value={{
                  sweetness: formValues.palate_sweetness,
                  acidity: formValues.palate_acidity,
                  tannin: formValues.palate_tannin,
                  tannin_nature: formValues.palate_tannin_nature,
                  alcohol: formValues.palate_alcohol,
                  body: formValues.palate_body,
                  mousse: formValues.palate_mousse,
                  finish: formValues.palate_finish,
                  finish_sec: formValues.palate_finish_sec,
                  intensity: formValues.palate_intensity,
                }}
                onChange={(v) => {
                  setValue('palate_sweetness', v.sweetness);
                  setValue('palate_acidity', v.acidity);
                  setValue('palate_tannin', v.tannin);
                  setValue('palate_tannin_nature', v.tannin_nature);
                  setValue('palate_alcohol', v.alcohol);
                  setValue('palate_body', v.body);
                  setValue('palate_mousse', v.mousse);
                  setValue('palate_finish', v.finish);
                  setValue('palate_finish_sec', v.finish_sec);
                  setValue('palate_intensity', v.intensity);
                }}
                isSparkling={isSparkling}
              />
            )}
          />

          {/* Palate intensity */}
          <div className="space-y-2">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Palate Intensity
            </p>
            <div className="flex flex-wrap gap-2">
              {PALATE_INTENSITY_LEVELS.map((level) => (
                <PillButton
                  key={level}
                  active={formValues.palate_intensity === level}
                  onClick={() =>
                    setValue(
                      'palate_intensity',
                      formValues.palate_intensity === level ? undefined : level,
                    )
                  }
                >
                  {level}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Palate descriptors */}
          <div className="space-y-2">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Palate Descriptors
            </p>
            <Controller
              control={control}
              name="palate_descriptors"
              render={({ field }) => (
                <AromaBuilder
                  label="Palate"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <button
            type="button"
            onClick={() => openNext('palate')}
            className="text-xs font-ui text-cru-text-muted hover:text-cru-accent-gold transition-colors"
          >
            Continue to Conclusions →
          </button>
        </SectionBody>
      </div>

      {/* ─── Section IV: Conclusions ────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="IV"
          title="Conclusions"
          isComplete={isConclusionsComplete}
          isOpen={openSections.conclusions}
          onToggle={() => toggleSection('conclusions')}
          sticky
        />
        <SectionBody isOpen={openSections.conclusions}>
          {/* Quality */}
          <div className="space-y-3">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Quality Assessment
            </p>
            <div className="flex flex-wrap gap-2">
              {(['faulty', 'poor', 'acceptable', 'good', 'very_good', 'outstanding'] as const).map(
                (q) => (
                  <PillButton
                    key={q}
                    active={formValues.quality === q}
                    onClick={() =>
                      setValue('quality', formValues.quality === q ? undefined : q)
                    }
                  >
                    {q.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </PillButton>
                ),
              )}
            </div>
          </div>

          {/* Readiness */}
          <div className="space-y-3">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Readiness
            </p>
            <div className="flex flex-wrap gap-2">
              {(['not_ready', 'can_wait', 'drink_now', 'too_old'] as const).map((r) => (
                <PillButton
                  key={r}
                  active={formValues.readiness === r}
                  onClick={() =>
                    setValue('readiness', formValues.readiness === r ? undefined : r)
                  }
                >
                  {r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Drink window */}
          <div className="space-y-2">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Drinking Window
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-ui text-cru-text-muted">From</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  placeholder={new Date().getFullYear().toString()}
                  value={formValues.drink_from ?? ''}
                  onChange={(e) =>
                    setValue('drink_from', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-20 px-2 py-1.5 font-mono text-sm text-center bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
                />
              </div>
              <span className="text-cru-text-muted">–</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-ui text-cru-text-muted">To</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  placeholder={(new Date().getFullYear() + 5).toString()}
                  value={formValues.drink_by ?? ''}
                  onChange={(e) =>
                    setValue('drink_by', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-20 px-2 py-1.5 font-mono text-sm text-center bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
                />
              </div>
            </div>
          </div>

          {/* Pairing notes */}
          <div className="space-y-2">
            <label className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Food Pairing
            </label>
            <input
              type="text"
              placeholder="Rack of lamb, aged comte, duck confit..."
              value={formValues.pairing_notes ?? ''}
              onChange={(e) => setValue('pairing_notes', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60"
            />
          </div>

          <button
            type="button"
            onClick={() => openNext('conclusions')}
            className="text-xs font-ui text-cru-text-muted hover:text-cru-accent-gold transition-colors"
          >
            Continue to Score →
          </button>
        </SectionBody>
      </div>

      {/* ─── Section V: Score ───────────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="V"
          title="Score"
          isComplete={isScoreComplete}
          isOpen={openSections.score}
          onToggle={() => toggleSection('score')}
          sticky
        />
        <SectionBody isOpen={openSections.score}>
          <Controller
            control={control}
            name="personal_score"
            render={({ field }) => (
              <ScoreInput
                value={field.value}
                onChange={field.onChange}
                system={scoringSystem}
                criticScores={{
                  parker: formValues.parker_score,
                  spectator: formValues.spectator_score,
                  jancis: formValues.jancis_score,
                  decanter: formValues.decanter_score,
                  suckling: formValues.suckling_score,
                }}
                onCriticScoresChange={(scores) => {
                  setValue('parker_score', scores?.parker);
                  setValue('spectator_score', scores?.spectator);
                  setValue('jancis_score', scores?.jancis);
                  setValue('decanter_score', scores?.decanter);
                  setValue('suckling_score', scores?.suckling);
                }}
              />
            )}
          />
          <button
            type="button"
            onClick={() => openNext('score')}
            className="text-xs font-ui text-cru-text-muted hover:text-cru-accent-gold transition-colors"
          >
            Continue to Notes →
          </button>
        </SectionBody>
      </div>

      {/* ─── Section VI: Free Note ──────────────────────────────────────── */}
      <div className="border-b border-cru-border">
        <SectionHeader
          number="VI"
          title="Notes"
          isComplete={isFreeNoteComplete}
          isOpen={openSections.freeNote}
          onToggle={() => toggleSection('freeNote')}
          sticky
        />
        <SectionBody isOpen={openSections.freeNote}>
          <div className="space-y-2">
            <p className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
              Your narrative
            </p>
            <Controller
              control={control}
              name="free_note"
              render={({ field }) => (
                <textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={8}
                  placeholder="A wine that speaks of place and time. The first sip reveals..."
                  className="w-full px-4 py-3 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/50 leading-relaxed resize-none"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                />
              )}
            />
            {formValues.free_note && (
              <p className="text-2xs font-ui text-cru-text-muted text-right">
                {formValues.free_note.length} characters
              </p>
            )}
          </div>
        </SectionBody>
      </div>

      {/* ─── Submit ─────────────────────────────────────────────────────── */}
      <div className="pt-8 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 rounded text-sm font-ui font-medium text-white transition-all duration-150 disabled:opacity-50"
          style={{
            background: isSubmitting
              ? 'var(--cru-text-muted)'
              : 'var(--cru-accent-garnet)',
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save Tasting Note'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded text-sm font-ui text-cru-text-muted hover:text-cru-text border border-cru-border hover:border-cru-text-muted transition-all duration-150"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
