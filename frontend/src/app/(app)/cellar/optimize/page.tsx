'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cellarApi } from '@/lib/api';
import CellarValueChart from '@/components/cellar/CellarValueChart';
import CellarOptimizerPanel from '@/components/cellar/CellarOptimizerPanel';
import type { CellarOptimizationAdvice } from '@/types';

// Shape the CellarStats into CellarValueChartData
function buildChartData(stats: {
  total_value: number;
  avg_purchase_price?: number;
  total_bottles?: number;
  by_region?: Array<{ region: string; value: number; pct: number }>;
  by_style?: Array<{ style: string; value: number; pct: number }>;
  top_bottles?: Array<{ wine: string; vintage: number; value: number; quantity: number }>;
  history?: Array<{ date: string; value: number; cost: number }>;
  purchase_cost?: number;
}) {
  const purchaseCost = stats.purchase_cost ?? stats.total_value * 0.7;
  const gainLoss = stats.total_value - purchaseCost;
  const gainLossPct = purchaseCost > 0 ? (gainLoss / purchaseCost) * 100 : 0;

  return {
    current_value: stats.total_value,
    purchase_cost: purchaseCost,
    gain_loss: gainLoss,
    gain_loss_pct: gainLossPct,
    history: stats.history,
    by_region: stats.by_region ?? [],
    by_style: stats.by_style ?? [],
    top_bottles: stats.top_bottles ?? [],
  };
}

export default function CellarOptimizePage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['cellar-value'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.stats(token);
    },
  });

  const { data: advice, isLoading: adviceLoading } = useQuery({
    queryKey: ['cellar-optimize'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.optimize(token);
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });

  const { mutate: refreshAdvice } = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      // Clear cache then re-fetch
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cellar/optimize/cache`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return cellarApi.optimize(token);
    },
    onSuccess: (data: CellarOptimizationAdvice) => {
      queryClient.setQueryData(['cellar-optimize'], data);
    },
  });

  const chartData = stats ? buildChartData(stats as Parameters<typeof buildChartData>[0]) : null;

  return (
    <div className="max-w-4xl space-y-10 animate-fade-in">
      {/* Page header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display"
          style={{ fontSize: '2.75rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          Cellar Intelligence
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-2 font-display italic"
          style={{ fontSize: '1.1rem', color: 'var(--cru-text-muted)' }}
        >
          Master Sommelier analysis of your collection
        </motion.p>
      </div>

      {/* Portfolio value — full chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {statsLoading ? (
          <div
            className="rounded border p-7 space-y-4 animate-pulse"
            style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
          >
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-16 w-64 rounded" />
            <div className="skeleton h-40 rounded" />
          </div>
        ) : chartData ? (
          <CellarValueChart data={chartData} />
        ) : null}
      </motion.div>

      {/* Divider */}
      <div
        className="h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--cru-border), transparent)',
        }}
      />

      {/* Optimizer panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <CellarOptimizerPanel
          data={advice}
          isLoading={adviceLoading}
          onRefresh={() => refreshAdvice()}
        />
      </motion.div>
    </div>
  );
}
