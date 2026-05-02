'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Score → visual (light theme) ────────────────────────────────────────────

function getScoreStyle(score: number): { bg: string; opacity: number } {
  if (score >= 97) {
    return { bg: '#6B1929', opacity: 1 };
  }
  if (score >= 93) {
    return { bg: '#9B3A4A', opacity: 1 };
  }
  if (score >= 89) {
    return { bg: '#D4A8A8', opacity: 1 };
  }
  if (score >= 85) {
    return { bg: '#C8BDB0', opacity: 0.9 };
  }
  return { bg: '#F3EFE9', opacity: 1 };
}

function getCellTextColor(score: number): string {
  // Dark text on light cells, light text on dark cells
  return score >= 88 ? '#F8F5F0' : '#1C1410';
}

function getScoreLabel(score: number): string {
  if (score >= 97) return 'Exceptional';
  if (score >= 93) return 'Outstanding';
  if (score >= 89) return 'Very Good';
  if (score >= 85) return 'Good';
  return 'Average';
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipData {
  region: string;
  regionLabel: string;
  vintage: number;
  score: number;
  descriptor: string;
  drinking_from?: number;
  drinking_to?: number;
  notes?: string;
  user_note_count?: number;
  x: number;
  y: number;
}

function CellTooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: data.x + 12, top: data.y - 8 }}
    >
      <div
        className="rounded px-3 py-2.5 space-y-1.5 text-left"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DAD0',
          boxShadow: '0 4px 16px rgba(28,20,16,0.12)',
          minWidth: '180px',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono text-xl text-cru-accent-garnet"
            style={{ fontFamily: 'Fira Code, monospace' }}
          >
            {data.vintage}
          </span>
          <span className="font-ui text-2xs text-cru-text-muted">{data.regionLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-base text-cru-text"
            style={{ fontFamily: 'Fira Code, monospace' }}
          >
            {data.score}
          </span>
          <span
            className="font-ui text-2xs text-cru-accent-garnet"
          >
            {data.descriptor || getScoreLabel(data.score)}
          </span>
        </div>
        {(data.drinking_from || data.drinking_to) && (
          <p className="font-ui text-2xs text-cru-text-muted">
            Drink {data.drinking_from ?? '?'}–{data.drinking_to ?? '?'}
          </p>
        )}
        {data.notes && (
          <p
            className="font-ui text-2xs text-cru-text-muted border-t border-cru-border pt-1.5 mt-1"
            style={{ maxWidth: '200px', fontSize: '10px', lineHeight: '1.5' }}
          >
            {data.notes}
          </p>
        )}
        {data.user_note_count != null && data.user_note_count > 0 && (
          <div className="flex items-center gap-1 border-t border-cru-border pt-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cru-accent-garnet" />
            <span className="font-ui text-2xs text-cru-text-muted">
              {data.user_note_count} note{data.user_note_count !== 1 ? 's' : ''} in journal
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

interface CellProps {
  region: string;
  regionLabel: string;
  vintage: number;
  score: number;
  descriptor: string;
  drinking_from?: number;
  drinking_to?: number;
  notes?: string;
  user_note_count?: number;
  size: number;
  onTooltip: (data: TooltipData | null) => void;
  onClick?: (region: string, vintage: number) => void;
  animDelay: number;
}

function HeatCell({
  region, regionLabel, vintage, score,
  descriptor, drinking_from, drinking_to, notes, user_note_count,
  size, onTooltip, onClick, animDelay,
}: CellProps) {
  const { bg, opacity } = getScoreStyle(score);
  const hasUserNotes = (user_note_count ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity, scale: 1 }}
      transition={{ delay: animDelay, duration: 0.25, ease: 'easeOut' }}
      whileHover={{ scale: 1.15, opacity: 1, zIndex: 10 }}
      className="relative cursor-default flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderRadius: '3px',
        border: '1px solid rgba(226,218,208,0.5)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) =>
        onTooltip({
          region, regionLabel, vintage, score,
          descriptor, drinking_from, drinking_to, notes, user_note_count,
          x: e.clientX,
          y: e.clientY,
        })
      }
      onMouseLeave={() => onTooltip(null)}
      onMouseMove={(e) =>
        onTooltip({
          region, regionLabel, vintage, score,
          descriptor, drinking_from, drinking_to, notes, user_note_count,
          x: e.clientX,
          y: e.clientY,
        })
      }
      onClick={() => onClick?.(region, vintage)}
    >
      {/* User note dot — bottom-right corner */}
      {hasUserNotes && (
        <div
          className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#6B1929', boxShadow: '0 0 3px rgba(107,25,41,0.6)' }}
        />
      )}
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VintageHeatmapProps {
  data: Record<
    string,
    Record<
      number,
      {
        score: number;
        descriptor: string;
        drinking_from?: number;
        drinking_to?: number;
        notes?: string;
        user_note_count?: number;
      }
    >
  >;
  regions: string[];
  regionLabels: Record<string, string>;
  years?: number[];
  onCellClick?: (region: string, vintage: number) => void;
  /** 'full' = default 36px cells, 'compact' = 24px for embedded use */
  variant?: 'full' | 'compact';
}

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from(
  { length: CURRENT_YEAR - 2009 },
  (_, i) => 2010 + i,
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function VintageHeatmap({
  data,
  regions,
  regionLabels,
  years = DEFAULT_YEARS,
  onCellClick,
  variant = 'full',
}: VintageHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const cellSize = variant === 'compact' ? 24 : 36;
  const gap = 2;

  return (
    <div className="relative w-full overflow-x-auto">
      {/* Grid */}
      <div style={{ display: 'inline-block', minWidth: '100%' }}>
        {/* Year header row */}
        <div className="flex items-center" style={{ gap, marginBottom: gap }}>
          {/* Region label column spacer */}
          <div className="flex-shrink-0" style={{ width: variant === 'compact' ? 100 : 140 }} />
          {years.map((year) => (
            <div
              key={year}
              className="flex-shrink-0 text-center font-mono text-cru-text-subtle"
              style={{
                width: cellSize,
                fontFamily: 'Fira Code, monospace',
                fontSize: variant === 'compact' ? 9 : 11,
                lineHeight: 1,
                paddingBottom: 4,
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
              }}
            >
              {year}
            </div>
          ))}
        </div>

        {/* Region rows */}
        {regions.map((regionSlug, rowIndex) => {
          const regionData = data[regionSlug] ?? {};
          const label = regionLabels[regionSlug] ?? regionSlug;

          return (
            <div
              key={regionSlug}
              className="flex items-center"
              style={{ gap, marginBottom: gap }}
            >
              {/* Region label */}
              <div
                className="flex-shrink-0 text-right pr-2 truncate font-ui text-cru-text-muted"
                style={{
                  width: variant === 'compact' ? 100 : 140,
                  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
                  fontSize: variant === 'compact' ? 10 : 11,
                }}
                title={label}
              >
                {label}
              </div>

              {/* Cells */}
              {years.map((year, colIndex) => {
                const cell = regionData[year];
                if (!cell) {
                  return (
                    <div
                      key={year}
                      className="flex-shrink-0"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: '#F3EFE9',
                        borderRadius: '3px',
                        border: '1px solid rgba(226,218,208,0.5)',
                        opacity: 0.6,
                      }}
                    />
                  );
                }

                return (
                  <HeatCell
                    key={year}
                    region={regionSlug}
                    regionLabel={label}
                    vintage={year}
                    score={cell.score}
                    descriptor={cell.descriptor}
                    drinking_from={cell.drinking_from}
                    drinking_to={cell.drinking_to}
                    notes={cell.notes}
                    user_note_count={cell.user_note_count}
                    size={cellSize}
                    onTooltip={setTooltip}
                    onClick={onCellClick}
                    animDelay={rowIndex * 0.02 + colIndex * 0.005}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Score legend */}
      {variant === 'full' && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-cru-border">
          {[
            { label: '97–100 Exceptional', color: '#6B1929' },
            { label: '93–96 Outstanding',  color: '#9B3A4A' },
            { label: '89–92 Very Good',    color: '#D4A8A8' },
            { label: '85–88 Good',         color: '#C8BDB0' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: color,
                  border: '1px solid rgba(226,218,208,0.8)',
                  flexShrink: 0,
                }}
              />
              <span className="font-ui text-2xs text-cru-text-muted">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#6B1929',
                boxShadow: '0 0 3px rgba(107,25,41,0.5)',
                flexShrink: 0,
              }}
            />
            <span className="font-ui text-2xs text-cru-text-muted">Your notes</span>
          </div>
        </div>
      )}

      {/* Floating tooltip */}
      {tooltip && <CellTooltip data={tooltip} />}
    </div>
  );
}
