'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CellarValueChartData {
  current_value: number;
  purchase_cost: number;
  gain_loss: number;
  gain_loss_pct: number;
  history?: Array<{ date: string; value: number; cost: number }>;
  by_region: Array<{ region: string; value: number; pct: number }>;
  by_style: Array<{ style: string; value: number; pct: number }>;
  top_bottles: Array<{ wine: string; vintage: number; value: number; quantity: number }>;
}

interface CellarValueChartProps {
  data: CellarValueChartData;
  compact?: boolean;
}

function fmt(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { date: string; value: number; cost: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const gain = d.value - d.cost;
  const isGain = gain >= 0;
  return (
    <div
      className="rounded border p-3 space-y-1.5"
      style={{
        backgroundColor: 'var(--cru-surface-raised)',
        border: '1px solid var(--cru-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        minWidth: '180px',
      }}
    >
      <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">
        {fmtDate(d.date)}
      </p>
      <p className="font-mono text-lg" style={{ color: 'var(--cru-accent-gold)' }}>
        {fmt(d.value)}
      </p>
      <div className="flex items-center gap-1.5">
        <span
          className="font-mono text-xs"
          style={{ color: isGain ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-slate)' }}
        >
          {isGain ? '+' : ''}{fmt(gain)}
        </span>
        <span className="text-2xs font-ui text-cru-text-muted">vs cost</span>
      </div>
    </div>
  );
}

const STYLE_COLORS: Record<string, string> = {
  red: '#8b1a2e',
  white: '#d4b896',
  rose: '#c97a7a',
  orange: '#c9824c',
  sparkling: '#a8b8c8',
  champagne: '#c9a84c',
  fortified: '#7a5a2e',
  other: '#4a4440',
};

export default function CellarValueChart({ data, compact = false }: CellarValueChartProps) {
  const isGain = data.gain_loss >= 0;

  // Build chart history; if not provided, stub with two datapoints
  const chartData = useMemo(() => {
    if (data.history && data.history.length > 1) return data.history;
    return [
      { date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), value: data.purchase_cost, cost: data.purchase_cost },
      { date: new Date().toISOString(), value: data.current_value, cost: data.purchase_cost },
    ];
  }, [data]);

  if (compact) {
    return (
      <div
        className="rounded border p-5 flex items-center justify-between gap-6"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        <div>
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest mb-1">
            Portfolio Value
          </p>
          <p
            className="font-mono leading-none"
            style={{ fontSize: '2.25rem', color: 'var(--cru-accent-gold)', letterSpacing: '-0.03em' }}
          >
            {fmt(data.current_value)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isGain ? (
              <TrendingUp className="h-3 w-3" style={{ color: 'var(--cru-accent-garnet)' }} />
            ) : (
              <TrendingDown className="h-3 w-3" style={{ color: 'var(--cru-accent-slate)' }} />
            )}
            <span
              className="font-mono text-sm"
              style={{ color: isGain ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-slate)' }}
            >
              {isGain ? '+' : ''}{fmt(data.gain_loss)} ({isGain ? '+' : ''}{data.gain_loss_pct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0" style={{ height: '56px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="goldGradientCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(201,168,76,0.4)" />
                  <stop offset="100%" stopColor="rgba(201,168,76,0)" />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--cru-accent-gold)"
                strokeWidth={1.5}
                fill="url(#goldGradientCompact)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero value display */}
      <div
        className="rounded border p-7"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        {/* Portfolio value */}
        <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest mb-2">
          Portfolio Value
        </p>
        <p
          className="font-mono leading-none"
          style={{
            fontSize: '3.75rem',
            color: 'var(--cru-accent-gold)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          {fmt(data.current_value)}
        </p>

        {/* Gain/loss */}
        <div className="flex items-center gap-2 mt-3">
          {isGain ? (
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--cru-accent-garnet)' }} />
          ) : (
            <TrendingDown className="h-4 w-4" style={{ color: 'var(--cru-accent-slate)' }} />
          )}
          <span
            className="font-mono text-xl"
            style={{ color: isGain ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-slate)', letterSpacing: '-0.02em' }}
          >
            {isGain ? '+' : ''}{fmt(data.gain_loss)}{' '}
          </span>
          <span
            className="font-mono text-base"
            style={{ color: isGain ? 'rgba(139,26,46,0.7)' : 'rgba(107,114,128,0.7)' }}
          >
            ({isGain ? '+' : ''}{data.gain_loss_pct.toFixed(1)}%)
          </span>
        </div>

        {/* Area chart */}
        <div style={{ height: '160px', marginTop: '28px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGradientFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(201,168,76,0.4)" />
                  <stop offset="100%" stopColor="rgba(201,168,76,0)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fill: 'var(--cru-text-muted)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fontFamily: 'Fira Code, monospace', fill: 'var(--cru-text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(201,168,76,0.2)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--cru-accent-gold)"
                strokeWidth={2}
                fill="url(#goldGradientFull)"
                dot={false}
                activeDot={{ r: 3, fill: 'var(--cru-accent-gold)', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'var(--cru-border)' }}>
          {[
            { label: 'Purchase Cost', value: fmt(data.purchase_cost) },
            { label: 'Current Value', value: fmt(data.current_value) },
            {
              label: 'Total Return',
              value: `${isGain ? '+' : ''}${data.gain_loss_pct.toFixed(1)}%`,
              accent: isGain ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-slate)',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center px-3 py-3 rounded"
              style={{ backgroundColor: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)' }}
            >
              <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest mb-1">
                {stat.label}
              </p>
              <p
                className="font-mono text-sm font-medium"
                style={{ color: stat.accent ?? 'var(--cru-text)', letterSpacing: '-0.01em' }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* By Region + By Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Region */}
        <div
          className="rounded border p-5 space-y-4"
          style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
        >
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">By Region</p>
          <div className="space-y-2.5">
            {data.by_region.slice(0, 6).map((r) => (
              <div key={r.region} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-ui text-cru-text truncate max-w-[180px]">{r.region}</span>
                  <span className="font-mono text-xs text-cru-text-muted flex-shrink-0">{fmt(r.value)}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cru-surface-raised)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${r.pct}%`,
                      background: 'linear-gradient(90deg, var(--cru-accent-garnet), rgba(139,26,46,0.5))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Style */}
        <div
          className="rounded border p-5 space-y-4"
          style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
        >
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">By Style</p>
          <div className="flex items-center gap-4">
            {/* Donut chart */}
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.by_style}
                    dataKey="value"
                    nameKey="style"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    strokeWidth={0}
                  >
                    {data.by_style.map((entry) => (
                      <Cell
                        key={entry.style}
                        fill={STYLE_COLORS[entry.style.toLowerCase()] ?? STYLE_COLORS.other}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              {data.by_style.map((s) => (
                <div key={s.style} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STYLE_COLORS[s.style.toLowerCase()] ?? STYLE_COLORS.other }}
                  />
                  <span className="text-xs font-ui text-cru-text capitalize flex-1 truncate">{s.style}</span>
                  <span className="font-mono text-xs text-cru-text-muted">{s.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top bottles by value */}
      {data.top_bottles.length > 0 && (
        <div
          className="rounded border p-5 space-y-4"
          style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
        >
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">Highest Value Bottles</p>
          <div className="space-y-2">
            {data.top_bottles.slice(0, 5).map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-2.5 border-b"
                style={{ borderColor: 'var(--cru-border)' }}
              >
                <span className="font-mono text-xs text-cru-text-muted w-4 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display italic text-cru-text truncate">{b.wine}</p>
                  <p className="text-2xs font-mono text-cru-accent-garnet">{b.vintage}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm" style={{ color: 'var(--cru-accent-gold)' }}>
                    {fmt(b.value)}
                  </p>
                  {b.quantity > 1 && (
                    <p className="text-2xs font-ui text-cru-text-muted">×{b.quantity}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
