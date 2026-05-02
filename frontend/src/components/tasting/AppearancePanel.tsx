'use client';

import { clsx } from 'clsx';

interface AppearanceValue {
  clarity?: string
  intensity?: string
  color?: string
  other?: string
}

interface AppearancePanelProps {
  value: AppearanceValue
  onChange: (val: AppearanceValue) => void
  wineColor?: string
}

const CLARITY_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'hazy', label: 'Hazy' },
  { value: 'cloudy', label: 'Cloudy' },
]

const INTENSITY_OPTIONS = [
  { value: 'pale', label: 'Pale' },
  { value: 'medium', label: 'Medium' },
  { value: 'deep', label: 'Deep' },
]

// Swatch definitions: hex color + label + wine types it appears in
const COLOR_SWATCHES: Array<{
  value: string
  label: string
  hex: string
  types: string[]
}> = [
  // Reds
  { value: 'purple', label: 'Purple', hex: '#4a1a5a', types: ['red'] },
  { value: 'ruby', label: 'Ruby', hex: '#8b1a2e', types: ['red'] },
  { value: 'garnet', label: 'Garnet', hex: '#6b1a22', types: ['red'] },
  { value: 'tawny', label: 'Tawny', hex: '#8b4a2e', types: ['red'] },
  { value: 'brick', label: 'Brick', hex: '#8b3a22', types: ['red'] },
  { value: 'orange_red', label: 'Orange', hex: '#c9622c', types: ['red'] },
  // Whites
  { value: 'lemon', label: 'Lemon', hex: '#e8d884', types: ['white', 'sparkling'] },
  { value: 'gold', label: 'Gold', hex: '#c9a84c', types: ['white', 'sparkling'] },
  { value: 'amber', label: 'Amber', hex: '#b87a2e', types: ['white', 'orange'] },
  { value: 'brown', label: 'Brown', hex: '#6b4a22', types: ['white', 'orange'] },
  // Rosé
  { value: 'pink', label: 'Pink', hex: '#e8a8b8', types: ['rose'] },
  { value: 'salmon', label: 'Salmon', hex: '#d4826a', types: ['rose'] },
  { value: 'copper', label: 'Copper', hex: '#b8724a', types: ['rose'] },
  // Orange
  { value: 'deep_amber', label: 'Deep Amber', hex: '#c9824c', types: ['orange'] },
  { value: 'orange', label: 'Orange', hex: '#c9824c', types: ['orange'] },
]

function getSwatchesForType(wineColor?: string): typeof COLOR_SWATCHES {
  const type = wineColor ?? 'red'
  // Normalize various style names to swatch types
  const normalized =
    type === 'sparkling' || type === 'champagne' || type === 'cremant' || type === 'prosecco'
      ? 'sparkling'
      : type === 'rose'
      ? 'rose'
      : type === 'orange' || type === 'amber'
      ? 'orange'
      : type === 'white'
      ? 'white'
      : 'red'

  return COLOR_SWATCHES.filter((s) => s.types.includes(normalized))
}

export default function AppearancePanel({ value, onChange, wineColor }: AppearancePanelProps) {
  const swatches = getSwatchesForType(wineColor)
  const selectedSwatch = swatches.find((s) => s.value === value.color)

  return (
    <div className="space-y-8">
      {/* Clarity */}
      <div className="space-y-3">
        <h4 className="text-xs font-ui uppercase tracking-widest text-cru-text-muted">
          Clarity
        </h4>
        <div className="flex gap-2">
          {CLARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...value, clarity: opt.value })}
              className={clsx(
                'px-4 py-2 rounded text-sm font-ui transition-all duration-150 border',
                value.clarity === opt.value
                  ? 'border-cru-accent-garnet bg-cru-accent-garnet/10 text-cru-text'
                  : 'border-cru-border text-cru-text-muted hover:border-cru-text-muted hover:text-cru-text',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--cru-border)' }} />

      {/* Intensity */}
      <div className="space-y-3">
        <h4 className="text-xs font-ui uppercase tracking-widest text-cru-text-muted">
          Intensity
        </h4>
        <div className="flex gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...value, intensity: opt.value })}
              className={clsx(
                'px-4 py-2 rounded text-sm font-ui transition-all duration-150 border',
                value.intensity === opt.value
                  ? 'border-cru-accent-garnet bg-cru-accent-garnet/10 text-cru-text'
                  : 'border-cru-border text-cru-text-muted hover:border-cru-text-muted hover:text-cru-text',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--cru-border)' }} />

      {/* Color swatches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-ui uppercase tracking-widest text-cru-text-muted">
            Hue
          </h4>
          {selectedSwatch && (
            <span
              className="text-sm font-ui transition-colors duration-300"
              style={{ color: selectedSwatch.hex }}
            >
              {selectedSwatch.label}
            </span>
          )}
        </div>

        {/* Swatch grid — with color wash behind selected */}
        <div
          className="relative p-4 rounded-lg transition-all duration-500"
          style={
            selectedSwatch
              ? {
                  background: `linear-gradient(135deg, ${selectedSwatch.hex}12, ${selectedSwatch.hex}06)`,
                  borderColor: `${selectedSwatch.hex}30`,
                  border: '1px solid',
                }
              : { border: '1px solid var(--cru-border)' }
          }
        >
          <div className="flex flex-wrap gap-3">
            {swatches.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                onClick={() => onChange({ ...value, color: swatch.value })}
                title={swatch.label}
                className="group flex flex-col items-center gap-1.5 transition-transform duration-150 hover:scale-105"
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full border-2 transition-all duration-150 shadow-inner',
                    value.color === swatch.value
                      ? 'scale-110 shadow-warm'
                      : 'border-transparent opacity-80 hover:opacity-100',
                  )}
                  style={{
                    backgroundColor: swatch.hex,
                    borderColor:
                      value.color === swatch.value ? swatch.hex : 'transparent',
                    boxShadow:
                      value.color === swatch.value
                        ? `0 0 0 2px var(--cru-bg), 0 0 0 4px ${swatch.hex}`
                        : undefined,
                  }}
                />
                <span
                  className={clsx(
                    'text-2xs font-ui transition-colors duration-150',
                    value.color === swatch.value
                      ? 'text-cru-text'
                      : 'text-cru-text-muted',
                  )}
                >
                  {swatch.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Other notes */}
      <div className="space-y-2">
        <label className="text-xs font-ui uppercase tracking-widest text-cru-text-muted">
          Other observations
        </label>
        <input
          type="text"
          value={value.other ?? ''}
          onChange={(e) => onChange({ ...value, other: e.target.value })}
          placeholder="Legs, effervescence, rim variation..."
          className="w-full px-3 py-2 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60"
        />
      </div>
    </div>
  )
}
