'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import type { UserTasteProfile } from '@/types';

// Plain-language labels per axis per Marcus's spec
const AXIS_LABELS = {
  acidity: 'Acidity',
  tannin: 'Tannin',
  body: 'Body',
  sweetness: 'Sweetness',
  oak: 'Oak',
  finish: 'Finish',
} as const;

// Descriptor at the user's position (high end label)
function axisDescriptor(axis: keyof typeof AXIS_LABELS, value: number): string {
  if (value < 0.33) {
    const low: Record<keyof typeof AXIS_LABELS, string> = {
      acidity: 'Soft',
      tannin: 'Silky',
      body: 'Light',
      sweetness: 'Bone Dry',
      oak: 'Unoaked',
      finish: 'Short',
    };
    return low[axis];
  }
  if (value < 0.67) {
    const mid: Record<keyof typeof AXIS_LABELS, string> = {
      acidity: 'Balanced',
      tannin: 'Firm',
      body: 'Medium',
      sweetness: 'Off-Dry',
      oak: 'Lightly Oaked',
      finish: 'Medium',
    };
    return mid[axis];
  }
  const high: Record<keyof typeof AXIS_LABELS, string> = {
    acidity: 'Bright',
    tannin: 'Grippy',
    body: 'Full',
    sweetness: 'Sweet',
    oak: 'Oaky',
    finish: 'Long',
  };
  return high[axis];
}

// Custom tick label — Plus Jakarta Sans, muted, small
function CustomTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  if (x == null || y == null || !payload) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#7A6E65"
      fontSize={11}
      fontFamily="'Plus Jakarta Sans', sans-serif"
      letterSpacing="0.04em"
    >
      {payload.value}
    </text>
  );
}

export interface PalateRadarProps {
  profile: Pick<
    UserTasteProfile,
    | 'pref_acidity'
    | 'pref_tannin'
    | 'pref_body'
    | 'pref_sweetness'
    | 'pref_oak'
    | 'note_count'
    | 'flavor_affinities'
  >;
  className?: string;
}

export default function PalateRadar({ profile, className = '' }: PalateRadarProps) {
  if (profile.note_count < 3) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 rounded border border-cru-border bg-cru-surface space-y-3 ${className}`}
        style={{ minHeight: 260 }}
      >
        <h3 className="font-display italic text-lg text-cru-text">Your Palate</h3>
        <p
          className="font-body text-sm leading-relaxed"
          style={{ color: 'var(--cru-text-muted)', maxWidth: 220 }}
        >
          Log {3 - profile.note_count} more tasting note
          {3 - profile.note_count !== 1 ? 's' : ''} to reveal your palate
          profile.
        </p>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-8 rounded-full"
              style={{
                backgroundColor:
                  i < profile.note_count
                    ? 'var(--cru-accent-garnet)'
                    : 'var(--cru-border)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Build chart data — clamp values to [0.05, 1] so radar is always visible
  const clamp = (v: number | undefined) => Math.max(0.05, Math.min(1, v ?? 0.5));

  const axes: Array<{ key: keyof typeof AXIS_LABELS; value: number }> = [
    { key: 'acidity', value: clamp(profile.pref_acidity) },
    { key: 'tannin', value: clamp(profile.pref_tannin) },
    { key: 'body', value: clamp(profile.pref_body) },
    { key: 'sweetness', value: clamp(profile.pref_sweetness) },
    { key: 'oak', value: clamp(profile.pref_oak) },
    { key: 'finish', value: 0.5 }, // finish not stored in profile; default mid
  ];

  const data = axes.map(({ key, value }) => ({
    axis: AXIS_LABELS[key],
    value,
    descriptor: axisDescriptor(key, value),
  }));

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Title */}
      <h3
        className="font-display italic text-center"
        style={{ fontSize: '1.15rem', color: 'var(--cru-text)' }}
      >
        Your Palate
      </h3>

      {/* Chart */}
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 16, right: 28, bottom: 16, left: 28 }}>
            <PolarGrid
              stroke="#E2DAD0"
              strokeOpacity={0.8}
              radialLines={false}
            />
            <PolarAngleAxis
              dataKey="axis"
              tick={CustomTick as any}
              tickLine={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#6B1929"
              strokeWidth={1.5}
              fill="#6B1929"
              fillOpacity={0.08}
              dot={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Plain-language descriptor row */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
        {axes.map(({ key, value }) => (
          <span
            key={key}
            className="font-ui text-2xs"
            style={{ color: 'var(--cru-text-muted)' }}
          >
            <span style={{ color: 'var(--cru-text)' }}>{AXIS_LABELS[key]}:</span>{' '}
            {axisDescriptor(key, value)}
          </span>
        ))}
      </div>

      {/* Subtitle */}
      <p
        className="font-ui text-center"
        style={{ fontSize: '0.65rem', color: 'var(--cru-text-muted)', marginTop: 4 }}
      >
        Based on {profile.note_count} tasting note
        {profile.note_count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
