'use client';

import { clsx } from 'clsx';
import {
  SWEETNESS_LEVELS,
  ACIDITY_LEVELS,
  TANNIN_LEVELS,
  BODY_LEVELS,
  ALCOHOL_LEVELS,
  FINISH_LEVELS,
  TANNIN_NATURES,
  MOUSSE_LEVELS,
  SWEETNESS_LABELS,
  ACIDITY_DESCRIPTIVE,
  TANNIN_DESCRIPTIVE,
  BODY_DESCRIPTIVE,
  FINISH_DESCRIPTIVE,
} from '@/lib/tastingVocabulary';

interface PalateValue {
  sweetness?: string
  acidity?: string
  tannin?: string
  tannin_nature?: string
  alcohol?: string
  body?: string
  mousse?: string
  finish?: string
  finish_sec?: number
  intensity?: string
}

interface PalateSlidersProps {
  value: PalateValue
  onChange: (val: PalateValue) => void
  isSparkling?: boolean
}

// ─── Individual slider ────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string
  levels: readonly string[]
  value?: string
  onChange: (val: string) => void
  rightLabelFn?: (val: string) => string
}

function SliderRow({ label, levels, value, onChange, rightLabelFn }: SliderRowProps) {
  const index = value ? levels.indexOf(value) : -1;
  const pct = index >= 0 ? (index / (levels.length - 1)) * 100 : 0;
  const hasValue = index >= 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const i = parseInt(e.target.value, 10);
    onChange(levels[i] ?? levels[0]);
  }

  const displayLabel = hasValue && rightLabelFn ? rightLabelFn(levels[index]) : (hasValue ? levels[index] : '—');

  return (
    <div className="group space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-ui uppercase tracking-wider text-cru-text-muted">
          {label}
        </span>
        <span
          className={clsx(
            'font-mono text-xs transition-colors duration-200',
            hasValue ? 'text-cru-text' : 'text-cru-text-muted',
          )}
        >
          {displayLabel}
        </span>
      </div>

      <div className="relative h-8 flex items-center">
        {/* Track background */}
        <div
          className="absolute inset-x-0 h-[3px] rounded-full"
          style={{ background: 'var(--cru-border)' }}
        />
        {/* Filled portion */}
        {hasValue && (
          <div
            className="absolute left-0 h-[3px] rounded-full transition-all duration-200"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #8b1a2e, #c9a84c)',
            }}
          />
        )}
        {/* Native range input — styled via webkit overrides */}
        <input
          type="range"
          min={0}
          max={levels.length - 1}
          step={1}
          value={hasValue ? index : 0}
          onChange={handleChange}
          onMouseDown={() => {
            if (!hasValue) onChange(levels[Math.floor(levels.length / 2)]);
          }}
          className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-8"
          style={{ zIndex: 1 }}
        />
        {/* Custom thumb */}
        <div
          className={clsx(
            'absolute w-4 h-4 rounded-full border-2 transition-all duration-200 pointer-events-none',
            hasValue ? 'border-cru-accent-garnet' : 'border-cru-border',
          )}
          style={{
            left: `calc(${pct}% - 8px)`,
            background: hasValue ? 'var(--cru-accent-garnet)' : 'var(--cru-surface-raised)',
            boxShadow: hasValue ? '0 0 6px 1px rgba(139, 26, 46, 0.35)' : undefined,
          }}
        />
      </div>

      {/* Level ticks */}
      <div className="flex justify-between">
        {levels.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            className={clsx(
              'text-2xs font-ui transition-colors duration-150 hover:text-cru-text',
              index === i ? 'text-cru-accent-garnet' : 'text-cru-text-muted/50',
            )}
            style={{ minWidth: 0 }}
          >
            {l.replace('_', ' ').replace('-', '−')}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PalateSliders({ value, onChange, isSparkling = false }: PalateSlidersProps) {
  const showTanninNature =
    !isSparkling &&
    value.tannin &&
    ['medium', 'medium+', 'high'].includes(value.tannin);

  return (
    <div className="space-y-6">
      {/* Sweetness */}
      <SliderRow
        label="Sweetness"
        levels={SWEETNESS_LEVELS}
        value={value.sweetness}
        onChange={(v) => onChange({ ...value, sweetness: v })}
        rightLabelFn={(v) => SWEETNESS_LABELS[v] ?? v}
      />

      {/* Acidity */}
      <SliderRow
        label="Acidity"
        levels={ACIDITY_LEVELS}
        value={value.acidity}
        onChange={(v) => onChange({ ...value, acidity: v })}
        rightLabelFn={(v) => ACIDITY_DESCRIPTIVE[v] ?? v}
      />

      {/* Tannin or Mousse */}
      {isSparkling ? (
        <SliderRow
          label="Mousse"
          levels={MOUSSE_LEVELS}
          value={value.mousse}
          onChange={(v) => onChange({ ...value, mousse: v })}
        />
      ) : (
        <>
          <SliderRow
            label="Tannin"
            levels={TANNIN_LEVELS}
            value={value.tannin}
            onChange={(v) => onChange({ ...value, tannin: v })}
            rightLabelFn={(v) => TANNIN_DESCRIPTIVE[v] ?? v}
          />

          {/* Tannin nature — appears when medium+ or high */}
          {showTanninNature && (
            <div className="space-y-2 pl-4 border-l-2" style={{ borderColor: 'var(--cru-accent-garnet)' }}>
              <p className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Tannin Nature
              </p>
              <div className="flex flex-wrap gap-2">
                {TANNIN_NATURES.map((nature) => (
                  <button
                    key={nature}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        tannin_nature: value.tannin_nature === nature ? undefined : nature,
                      })
                    }
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-ui border transition-all duration-150',
                      value.tannin_nature === nature
                        ? 'border-cru-accent-garnet bg-cru-accent-garnet/10 text-cru-text'
                        : 'border-cru-border text-cru-text-muted hover:border-cru-text-muted hover:text-cru-text',
                    )}
                  >
                    {nature}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Body */}
      <SliderRow
        label="Body"
        levels={BODY_LEVELS}
        value={value.body}
        onChange={(v) => onChange({ ...value, body: v })}
        rightLabelFn={(v) => BODY_DESCRIPTIVE[v] ?? v}
      />

      {/* Alcohol */}
      <SliderRow
        label="Alcohol"
        levels={ALCOHOL_LEVELS}
        value={value.alcohol}
        onChange={(v) => onChange({ ...value, alcohol: v })}
      />

      {/* Finish */}
      <SliderRow
        label="Finish"
        levels={FINISH_LEVELS}
        value={value.finish}
        onChange={(v) => onChange({ ...value, finish: v })}
        rightLabelFn={(v) => FINISH_DESCRIPTIVE[v] ?? v}
      />

      {/* Finish seconds (optional) */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-ui uppercase tracking-wider text-cru-text-muted whitespace-nowrap">
          Finish length
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={120}
            step={1}
            value={value.finish_sec ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                finish_sec: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            placeholder="—"
            className="w-16 px-2 py-1.5 text-center font-mono text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
          />
          <span className="text-xs font-ui text-cru-text-muted">sec</span>
        </div>
      </div>
    </div>
  );
}
