'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BinLocatorProps {
  occupiedSlots: Record<string, string>; // {binLabel: wineName}
  selectedSlot?: string;
  onSelect: (binLabel: string) => void;
  columns?: number;
  rows?: number;
  readOnly?: boolean;
}

function colLabel(col: number): string {
  return String.fromCharCode(65 + col); // A, B, C...
}

function buildLabel(col: number, row: number): string {
  return `${colLabel(col)}-${row + 1}`;
}

export default function BinLocator({
  occupiedSlots,
  selectedSlot,
  onSelect,
  columns = 12,
  rows = 6,
  readOnly = false,
}: BinLocatorProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const handleSlotClick = useCallback(
    (label: string) => {
      if (!readOnly) onSelect(label);
    },
    [readOnly, onSelect],
  );

  return (
    <div className="space-y-5">
      {/* Column labels */}
      <div>
        {/* Column header row */}
        <div
          className="grid mb-1"
          style={{
            gridTemplateColumns: `20px repeat(${columns}, 1fr)`,
            gap: '3px',
          }}
        >
          <div /> {/* spacer for row labels */}
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className="text-center font-mono text-2xs"
              style={{ color: 'var(--cru-text-muted)', fontSize: '9px', letterSpacing: '0.05em' }}
            >
              {colLabel(c)}
            </div>
          ))}
        </div>

        {/* Rack grid */}
        <div className="space-y-0.5">
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="grid"
              style={{
                gridTemplateColumns: `20px repeat(${columns}, 1fr)`,
                gap: '3px',
              }}
            >
              {/* Row label */}
              <div
                className="flex items-center justify-center font-mono text-2xs"
                style={{ color: 'var(--cru-text-muted)', fontSize: '9px' }}
              >
                {row + 1}
              </div>

              {/* Slots */}
              {Array.from({ length: columns }, (_, col) => {
                const label = buildLabel(col, row);
                const isOccupied = !!occupiedSlots[label];
                const isSelected = selectedSlot === label;
                const isHovered = hoveredSlot === label;

                return (
                  <motion.button
                    key={label}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleSlotClick(label)}
                    onMouseEnter={() => setHoveredSlot(label)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    whileHover={!readOnly ? { scale: 1.08 } : undefined}
                    whileTap={!readOnly ? { scale: 0.96 } : undefined}
                    transition={{ duration: 0.1 }}
                    className="relative rounded-sm overflow-visible"
                    style={{
                      height: '32px',
                      cursor: readOnly ? 'default' : 'pointer',
                      backgroundColor: isSelected
                        ? 'rgba(201,168,76,0.15)'
                        : isOccupied
                        ? 'rgba(139,26,46,0.2)'
                        : isHovered
                        ? 'rgba(45,36,32,0.9)'
                        : 'rgba(22,18,16,0.9)',
                      border: isSelected
                        ? '1.5px solid var(--cru-accent-gold)'
                        : isOccupied
                        ? '1px solid rgba(139,26,46,0.4)'
                        : '1px solid rgba(45,36,32,0.8)',
                      boxShadow: isSelected
                        ? '0 0 0 2px rgba(201,168,76,0.15), inset 0 0 8px rgba(201,168,76,0.08)'
                        : isOccupied
                        ? 'inset 0 1px 2px rgba(0,0,0,0.4)'
                        : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                      transition: 'background-color 0.12s ease, border-color 0.12s ease',
                    }}
                    aria-label={`Slot ${label}${isOccupied ? `: ${occupiedSlots[label]}` : ' (empty)'}`}
                  >
                    {/* Occupied: bottle silhouette */}
                    {isOccupied && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ fontSize: '13px', lineHeight: 1 }}
                      >
                        <span
                          style={{
                            color: isSelected ? 'var(--cru-accent-gold)' : 'rgba(139,26,46,0.8)',
                            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
                          }}
                        >
                          {/* SVG bottle silhouette */}
                          <svg width="8" height="16" viewBox="0 0 8 16" fill="currentColor">
                            <path d="M3 0h2v2.5c1.2.4 2 1.3 2 2.5v8c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V5c0-1.2.8-2.1 2-2.5V0z" />
                          </svg>
                        </span>
                      </div>
                    )}

                    {/* Selected indicator */}
                    {isSelected && !isOccupied && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--cru-accent-gold)' }}
                        />
                      </div>
                    )}

                    {/* Hover rack texture — subtle horizontal lines suggesting wood grain */}
                    {(isHovered || isSelected) && (
                      <div
                        className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{
                          height: '1px',
                          backgroundColor: 'rgba(201,168,76,0.08)',
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip for hovered slot */}
      <AnimatePresence>
        {hoveredSlot && (
          <motion.div
            key={hoveredSlot}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="text-center"
          >
            <span
              className="inline-block px-3 py-1.5 rounded font-mono text-xs"
              style={{
                backgroundColor: 'var(--cru-surface-raised)',
                border: '1px solid var(--cru-border)',
                color: 'var(--cru-text)',
              }}
            >
              <span style={{ color: 'var(--cru-accent-gold)' }}>Slot {hoveredSlot}</span>
              {occupiedSlots[hoveredSlot] && (
                <>
                  <span className="mx-2 text-cru-text-muted">·</span>
                  <span className="font-ui text-cru-text-muted">{occupiedSlots[hoveredSlot]}</span>
                </>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        {[
          { label: 'Empty', color: 'rgba(45,36,32,0.8)', border: 'rgba(45,36,32,0.8)', dot: false },
          { label: 'Occupied', color: 'rgba(139,26,46,0.2)', border: 'rgba(139,26,46,0.4)', dot: true, dotColor: 'rgba(139,26,46,0.8)' },
          { label: 'Selected', color: 'rgba(201,168,76,0.15)', border: 'var(--cru-accent-gold)', dot: true, dotColor: 'var(--cru-accent-gold)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-4 w-5 rounded-sm flex items-center justify-center"
              style={{
                backgroundColor: item.color,
                border: `1.5px solid ${item.border}`,
              }}
            >
              {item.dot && (
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.dotColor }}
                />
              )}
            </div>
            <span className="text-2xs font-ui text-cru-text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Rack summary */}
      <div className="text-center">
        <span className="text-2xs font-ui text-cru-text-muted">
          <span className="font-mono" style={{ color: 'var(--cru-accent-garnet)' }}>
            {Object.keys(occupiedSlots).length}
          </span>
          {' '}of{' '}
          <span className="font-mono text-cru-text">{columns * rows}</span>
          {' '}slots occupied
        </span>
      </div>
    </div>
  );
}
