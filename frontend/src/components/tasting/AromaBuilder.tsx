'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import {
  PRIMARY_DESCRIPTORS,
  SECONDARY_DESCRIPTORS,
  TERTIARY_DESCRIPTORS,
  TIER_COLORS,
  TIER_LABELS,
  type DescriptorItem,
  type DescriptorTier,
} from '@/lib/tastingVocabulary';

interface AromaBuilderProps {
  label: 'Nose' | 'Palate'
  value: DescriptorItem[]
  onChange: (descriptors: DescriptorItem[]) => void
}

type TierKey = DescriptorTier

type AnyDescriptorGroup = Record<string, { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> }>

const TIER_DATA: Record<TierKey, AnyDescriptorGroup> = {
  primary: PRIMARY_DESCRIPTORS as unknown as AnyDescriptorGroup,
  secondary: SECONDARY_DESCRIPTORS as unknown as AnyDescriptorGroup,
  tertiary: TERTIARY_DESCRIPTORS as unknown as AnyDescriptorGroup,
}

// ─── Intensity popup ──────────────────────────────────────────────────────────

interface IntensityPopupProps {
  onSelect: (intensity: DescriptorItem['intensity']) => void
  onClose: () => void
}

function IntensityPopup({ onSelect, onClose }: IntensityPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.12 }}
      className="absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 rounded-lg shadow-warm-lg"
      style={{ background: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)' }}
    >
      {(['light', 'medium', 'pronounced'] as const).map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => { onSelect(i); onClose(); }}
          className="px-2.5 py-1.5 rounded text-xs font-ui text-cru-text-muted hover:text-cru-text hover:bg-cru-border transition-colors capitalize whitespace-nowrap"
        >
          {i}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Selected chip ────────────────────────────────────────────────────────────

interface ChipProps {
  item: DescriptorItem
  onRemove: () => void
  onSetIntensity: (intensity: DescriptorItem['intensity']) => void
}

function DescriptorChip({ item, onRemove, onSetIntensity }: ChipProps) {
  const [showIntensity, setShowIntensity] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tierColor = TIER_COLORS[item.tier];

  function handleMouseDown() {
    longPressTimer.current = setTimeout(() => setShowIntensity(true), 500);
  }

  function handleMouseUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setShowIntensity((prev) => !prev);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-ui text-cru-text select-none"
      style={{
        background: `${tierColor}18`,
        border: `1px solid ${tierColor}40`,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Tier dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: tierColor }}
      />
      <span>{item.descriptor}</span>
      {item.intensity && (
        <span
          className="text-2xs px-1 py-0.5 rounded"
          style={{ background: `${tierColor}30`, color: tierColor }}
        >
          {item.intensity}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-cru-text-muted hover:text-cru-text transition-colors"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <X className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {showIntensity && (
          <IntensityPopup
            onSelect={onSetIntensity}
            onClose={() => setShowIntensity(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AromaBuilder({ label, value, onChange }: AromaBuilderProps) {
  const [activeTier, setActiveTier] = useState<TierKey>('primary');
  const [activeCategory, setActiveCategory] = useState<string | null>('fruit');
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);

  const tierData = TIER_DATA[activeTier];
  const categories = Object.entries(tierData);
  const activeCategData = activeCategory
    ? (tierData as Record<string, { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> }>)[activeCategory]
    : null;

  function toggleDescriptor(descriptor: string) {
    const exists = value.find(
      (d) => d.descriptor === descriptor && d.tier === activeTier,
    );
    if (exists) {
      onChange(value.filter((d) => !(d.descriptor === descriptor && d.tier === activeTier)));
    } else {
      onChange([...value, { tier: activeTier, descriptor }]);
    }
  }

  function isSelected(descriptor: string) {
    return value.some((d) => d.descriptor === descriptor && d.tier === activeTier);
  }

  function removeDescriptor(descriptor: string, tier: TierKey) {
    onChange(value.filter((d) => !(d.descriptor === descriptor && d.tier === tier)));
  }

  function setIntensity(descriptor: string, tier: TierKey, intensity: DescriptorItem['intensity']) {
    onChange(
      value.map((d) =>
        d.descriptor === descriptor && d.tier === tier ? { ...d, intensity } : d,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3" style={{ minHeight: '320px' }}>
        {/* Left: tier tabs + category list */}
        <div className="w-40 flex-shrink-0 flex flex-col gap-1">
          {/* Tier selector */}
          <div
            className="flex flex-col gap-0.5 p-1.5 rounded-lg mb-3"
            style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
          >
            {(['primary', 'secondary', 'tertiary'] as TierKey[]).map((tier) => {
              const count = value.filter((d) => d.tier === tier).length;
              const isActive = activeTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setActiveTier(tier);
                    const firstCat = Object.keys(TIER_DATA[tier])[0];
                    setActiveCategory(firstCat ?? null);
                    setExpandedSubcategory(null);
                  }}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded text-xs font-ui transition-all duration-150',
                    isActive
                      ? 'text-cru-text'
                      : 'text-cru-text-muted hover:text-cru-text',
                  )}
                  style={
                    isActive
                      ? {
                          background: `${TIER_COLORS[tier]}18`,
                          borderLeft: `2px solid ${TIER_COLORS[tier]}`,
                          paddingLeft: '10px',
                        }
                      : {}
                  }
                >
                  <span>{TIER_LABELS[tier]}</span>
                  {count > 0 && (
                    <span
                      className="text-2xs font-mono w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: TIER_COLORS[tier],
                        color: '#fff',
                        fontSize: '10px',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category list */}
          <div className="flex flex-col gap-0.5">
            {categories.map(([key, cat]) => {
              const typedCat = cat as { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> };
              const isActive = activeCategory === key;
              const countInCat = value.filter(
                (d) =>
                  d.tier === activeTier &&
                  Object.values(typedCat.subcategories)
                    .flatMap((s) => s.descriptors)
                    .includes(d.descriptor),
              ).length;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(key);
                    setExpandedSubcategory(null);
                  }}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded text-xs font-ui transition-all duration-150 text-left',
                    isActive
                      ? 'bg-cru-surface-raised text-cru-text'
                      : 'text-cru-text-muted hover:text-cru-text hover:bg-cru-surface',
                  )}
                >
                  <span>{typedCat.label}</span>
                  {countInCat > 0 && (
                    <span
                      className="text-2xs font-mono"
                      style={{ color: TIER_COLORS[activeTier] }}
                    >
                      {countInCat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: descriptors */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeCategData && (
              <motion.div
                key={`${activeTier}-${activeCategory}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                {Object.entries(
                  (activeCategData as { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> }).subcategories,
                ).map(([subKey, subcat]) => {
                  const isExpanded =
                    expandedSubcategory === subKey ||
                    Object.keys(
                      (activeCategData as { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> }).subcategories,
                    ).length === 1;

                  return (
                    <div
                      key={subKey}
                      className="rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--cru-border)' }}
                    >
                      {/* Subcategory header — only show toggle if multiple subcategories */}
                      {Object.keys(
                        (activeCategData as { label: string; subcategories: Record<string, { label: string; descriptors: readonly string[] }> }).subcategories,
                      ).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSubcategory(
                              expandedSubcategory === subKey ? null : subKey,
                            )
                          }
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-ui text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised transition-colors"
                          style={{ background: 'var(--cru-surface)' }}
                        >
                          <span className="uppercase tracking-wider">{subcat.label}</span>
                          <ChevronRight
                            className={clsx(
                              'h-3.5 w-3.5 transition-transform duration-200',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </button>
                      )}

                      {/* Descriptors */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 flex flex-wrap gap-2" style={{ background: 'var(--cru-surface-raised)' }}>
                              {subcat.descriptors.map((desc) => {
                                const selected = isSelected(desc);
                                const tierColor = TIER_COLORS[activeTier];
                                return (
                                  <motion.button
                                    key={desc}
                                    type="button"
                                    layout
                                    onClick={() => toggleDescriptor(desc)}
                                    className={clsx(
                                      'px-3 py-1.5 rounded-full text-xs font-ui transition-all duration-150 border',
                                    )}
                                    style={
                                      selected
                                        ? {
                                            background: `${tierColor}20`,
                                            borderColor: tierColor,
                                            color: 'var(--cru-text)',
                                          }
                                        : {
                                            background: 'transparent',
                                            borderColor: 'var(--cru-border)',
                                            color: 'var(--cru-text-muted)',
                                          }
                                    }
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {selected && (
                                      <span
                                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                                        style={{ background: tierColor }}
                                      />
                                    )}
                                    {desc}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected tray */}
      <AnimatePresence>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg p-4 space-y-3"
            style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
                Your {label} —{' '}
                <span style={{ color: TIER_COLORS['primary'] }}>
                  {value.length} descriptor{value.length !== 1 ? 's' : ''}
                </span>
              </p>
              <p className="text-2xs font-ui text-cru-text-muted">
                Right-click to set intensity
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {value.map((item) => (
                  <DescriptorChip
                    key={`${item.tier}-${item.descriptor}`}
                    item={item}
                    onRemove={() => removeDescriptor(item.descriptor, item.tier)}
                    onSetIntensity={(intensity) =>
                      setIntensity(item.descriptor, item.tier, intensity)
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
