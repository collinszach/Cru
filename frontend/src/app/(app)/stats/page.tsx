'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Globe, Wine } from 'lucide-react';
import { statsApi, regionsApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import VintageHeatmap from '@/components/map/VintageHeatmap';
import type { VintageChartEntry } from '@/types';

const CHART_COLORS = {
  primary: '#6B1929',
  secondary: '#8B7355',
  muted: '#E2DAD0',
  text: '#7A6E65',
  grid: '#F3EFE9',
};

function StatCard({ label, value, unit, icon: Icon }: { label: string; value: string | number | null; unit?: string; icon: React.ElementType }) {
  return (
    <div className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">{label}</p>
        <Icon className="h-4 w-4 text-cru-accent-garnet opacity-40" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl text-cru-text" style={{ fontWeight: 500 }}>{value ?? '—'}</span>
        {unit && <span className="font-ui text-sm text-cru-text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { getToken } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.dashboard(token);
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['palate-radar'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.palateRadar(token);
    },
  });

  const { data: scoreDistribution } = useQuery({
    queryKey: ['score-distribution'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.scoreDistribution(token);
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['regions-breakdown'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.regionsBreakdown(token);
    },
  });

  const { data: criticAgreement } = useQuery({
    queryKey: ['critic-agreement'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.criticAgreement(token);
    },
  });

  const { data: tasteEvolution } = useQuery({
    queryKey: ['taste-evolution'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.tasteEvolution(token);
    },
  });

  const { data: blindAccuracy } = useQuery({
    queryKey: ['blind-accuracy'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return statsApi.blindAccuracy(token);
    },
  });

  // Top 5 regions for vintage heatmap
  const topRegionSlugs = (regions ?? []).slice(0, 5).map((r) => r.slug ?? r.region?.toLowerCase().replace(/\s+/g, '-') ?? r.country);

  // Fetch vintage charts for top regions in parallel
  const vintageChartResults = useQuery({
    queryKey: ['vintage-charts-top', topRegionSlugs],
    queryFn: async () => {
      if (topRegionSlugs.length === 0) return {};
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Fetch all in parallel
      const entries = await Promise.all(
        topRegionSlugs.map(async (slug) => {
          try {
            const data = await regionsApi.getVintageChart(token, slug);
            return [slug, data] as [string, VintageChartEntry[]];
          } catch {
            return [slug, []] as [string, VintageChartEntry[]];
          }
        }),
      );

      // Shape: Record<slug, Record<year, cell>>
      return Object.fromEntries(
        entries.map(([slug, rows]) => [
          slug,
          Object.fromEntries(
            rows.map((r) => [
              r.vintage,
              {
                score: r.score,
                descriptor: r.descriptor,
                drinking_from: r.drinking_from,
                drinking_to: r.drinking_to,
                notes: r.notes,
                user_note_count: r.user_notes,
              },
            ]),
          ),
        ]),
      );
    },
    enabled: topRegionSlugs.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  if (loadingStats) return <PageLoader />;

  const radarData = profile
    ? [
        { axis: 'Sweetness', value: Math.round(profile.pref_sweetness * 100) },
        { axis: 'Acidity', value: Math.round(profile.pref_acidity * 100) },
        { axis: 'Tannin', value: Math.round(profile.pref_tannin * 100) },
        { axis: 'Body', value: Math.round(profile.pref_body * 100) },
        { axis: 'Oak', value: Math.round(profile.pref_oak * 100) },
      ]
    : [];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Analytics</h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">Your palate, quantified</p>
        </div>
      </div>

      {/* Summary stats grid */}
      <div>
      <h2 className="font-display text-2xl text-cru-text mb-4" style={{ fontWeight: 500 }}>Your Collection</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bottles"
          value={stats?.total_bottles ?? null}
          icon={Wine}
        />
        <StatCard
          label="Cellar Value"
          value={
            (stats?.total_cellar_value ?? stats?.total_value) != null
              ? `$${Math.round(stats!.total_cellar_value ?? stats!.total_value ?? 0).toLocaleString()}`
              : null
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Regions"
          value={stats?.unique_regions ?? stats?.regions_count ?? null}
          icon={Globe}
        />
        <StatCard
          label="Producers"
          value={stats?.unique_producers ?? stats?.producers_count ?? null}
          icon={BarChart3}
        />
      </div>

      </div>

      {/* Drinking window summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Drink Now', value: stats.bottles_in_window, color: '#4a7c59' },
            { label: 'At Peak', value: stats.bottles_at_peak, color: '#6B1929' },
            { label: 'Approaching', value: stats.bottles_approaching, color: '#8B7355' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded border border-cru-border bg-cru-surface text-center"
            >
              <p
                className="font-mono text-2xl"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
              <p className="text-2xs font-ui text-cru-text-muted mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        {scoreDistribution && scoreDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Score Distribution</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution} barSize={20}>
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: '#7A6E65', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={{ stroke: '#E2DAD0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#7A6E65', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DAD0', borderRadius: 4, fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: '#1C1410' }}
                    cursor={{ fill: 'rgba(107,25,41,0.06)' }}
                  />
                  <Bar dataKey="count" fill="#6B1929" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}

        {/* Palate radar */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Palate Profile</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2DAD0" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: '#7A6E65', fontSize: 11 }}
                  />
                  <Radar
                    name="Your Palate"
                    dataKey="value"
                    fill="#6B1929"
                    fillOpacity={0.08}
                    stroke="#6B1929"
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Regions breakdown */}
      {regions && regions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Regions &amp; Styles</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {regions.slice(0, 10).map((r) => {
                const count = (r.bottle_count ?? 0) + (r.note_count ?? 0);
                const maxCount = Math.max(...regions.slice(0, 10).map((x) => (x.bottle_count ?? 0) + (x.note_count ?? 0)), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={`${r.country}-${r.region}`} className="flex items-center gap-3">
                    <div className="w-32 text-right flex-shrink-0">
                      <span className="text-xs font-ui text-cru-text-muted truncate block">
                        {r.region ?? r.country}
                      </span>
                    </div>
                    <div className="flex-1 h-1.5 bg-cru-surface-raised rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: 'var(--cru-accent-garnet)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-cru-text-muted w-8 text-right flex-shrink-0">
                      {r.bottle_count ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Vintage Intelligence heatmap */}
      {vintageChartResults.data && topRegionSlugs.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Vintage Intelligence</h2>
              <p className="mt-0.5 text-xs font-ui text-cru-text-muted">
                Quality scores for your top regions across vintages.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <VintageHeatmap
              data={vintageChartResults.data}
              regions={topRegionSlugs}
              regionLabels={Object.fromEntries(
                (regions ?? []).slice(0, 5).map((r) => [
                  r.slug ?? r.region?.toLowerCase().replace(/\s+/g, '-') ?? r.country,
                  r.region ?? r.country,
                ]),
              )}
            />
          </CardBody>
        </Card>
      )}

      {/* Top preferences */}
      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(profile.top_regions ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Top Regions</h2>
              </CardHeader>
              <CardBody>
                <ol className="space-y-2">
                  {(profile.top_regions ?? []).slice(0, 5).map((region, i) => (
                    <li key={region} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-cru-accent-garnet w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm font-ui text-cru-text">{region}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}

          {(profile.top_grapes ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Favourite Grapes</h2>
              </CardHeader>
              <CardBody>
                <ol className="space-y-2">
                  {(profile.top_grapes ?? []).slice(0, 5).map((grape, i) => (
                    <li key={grape} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-cru-accent-garnet w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm font-ui text-cru-text">{grape}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Critic Agreement */}
      {criticAgreement && Object.keys(criticAgreement).length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Critic Agreement</h2>
              <p className="mt-0.5 text-xs font-ui text-cru-text-muted">
                Pearson correlation between your scores and the major critics.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Object.entries(criticAgreement).filter(([critic]) => !critic.endsWith('_note_count')).map(([critic, correlation]) => {
                const pct = Math.round(correlation * 100);
                return (
                  <div key={critic} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-ui text-cru-text capitalize">{critic}</span>
                      <span className="font-mono text-sm text-cru-accent-garnet">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-cru-border">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #6B1929, #8B7355)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Taste Evolution */}
      {tasteEvolution && tasteEvolution.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Consumption</h2>
              <p className="mt-0.5 text-xs font-ui text-cru-text-muted">
                How your preferences have shifted across quarters.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tasteEvolution}>
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#7A6E65', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                  axisLine={{ stroke: '#E2DAD0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: '#7A6E65', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DAD0', borderRadius: 4, fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: '#1C1410' }}
                  formatter={(value: number) => `${Math.round(value * 100)}%`}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'Plus Jakarta Sans', fontSize: '11px', color: '#7A6E65' }}
                />
                <Line type="monotone" dataKey="acidity" stroke="#6B1929" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="tannin" stroke="#8B7355" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="body" stroke="#B8A48A" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="oak" stroke="#6B7280" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Blind Tasting Accuracy */}
      {blindAccuracy && blindAccuracy.note_count > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-2xl text-cru-text" style={{ fontWeight: 500 }}>Blind Tasting Accuracy</h2>
              <p className="mt-0.5 text-xs font-ui text-cru-text-muted">
                Based on {blindAccuracy.note_count} blind tasting{blindAccuracy.note_count !== 1 ? 's' : ''}.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Overall', value: blindAccuracy.overall_pct },
                { label: 'Grape', value: blindAccuracy.grape_pct },
                { label: 'Region', value: blindAccuracy.region_pct },
                { label: 'Vintage', value: blindAccuracy.vintage_pct },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 rounded border border-cru-border bg-cru-surface text-center"
                >
                  <p
                    className="font-mono text-3xl"
                    style={{ color: stat.value >= 70 ? 'var(--cru-accent-gold)' : 'var(--cru-text)' }}
                  >
                    {stat.value}%
                  </p>
                  <p className="text-2xs font-ui text-cru-text-muted mt-1 uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
