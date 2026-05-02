'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Utensils, Wine, MoonStar } from 'lucide-react';
import { pairingsApi } from '@/lib/api';
import WineSearchAutocomplete from '@/components/WineSearchAutocomplete';
import type { PairingResult } from '@/types';

// ─── Pairing Card ─────────────────────────────────────────────────────────────

function PairingCard({
  suggestion,
  index,
}: {
  suggestion: PairingResult['suggestions'][number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="cru-card rounded overflow-hidden"
    >
      <div className="p-6 space-y-5">
        {/* Wine name */}
        <div>
          <h3
            className="font-display italic"
            style={{ fontSize: '1.4rem', color: 'var(--cru-text)', letterSpacing: '-0.02em' }}
          >
            {suggestion.name}
          </h3>
          {suggestion.cellar_entry && (
            <p className="mt-1 text-xs font-mono" style={{ color: 'var(--cru-accent-gold)' }}>
              ★ In your cellar — {suggestion.cellar_entry.vintage}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="h-px"
          style={{
            background: 'linear-gradient(90deg, var(--cru-border), transparent)',
          }}
        />

        {/* Why it works */}
        <div className="space-y-1.5">
          <p className="text-2xs font-ui uppercase tracking-widest text-cru-accent-garnet" style={{ letterSpacing: '0.14em' }}>
            Why it works
          </p>
          <p
            className="font-body leading-relaxed"
            style={{ color: 'var(--cru-text)', fontSize: '0.88rem', lineHeight: 1.78 }}
          >
            {suggestion.reason}
          </p>
        </div>

        {/* Find this wine link */}
        <div className="pt-1">
          <a
            href="/discover"
            className="group inline-flex items-center gap-1.5 text-xs font-ui transition-colors"
            style={{ color: 'var(--cru-text-muted)' }}
          >
            Find this wine
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── By Dish Tab ─────────────────────────────────────────────────────────────

function ByDishTab() {
  const { getToken } = useAuth();
  const [food, setFood] = useState('');
  const [constraints, setConstraints] = useState('');
  const [result, setResult] = useState<PairingResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return pairingsApi.fromFood(token, { food, constraints });
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <label
            className="text-xs font-ui uppercase tracking-widest"
            style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
          >
            What are you cooking?
          </label>
          <textarea
            value={food}
            onChange={(e) => setFood(e.target.value)}
            rows={3}
            placeholder="Rack of lamb with rosemary and garlic, roasted potatoes…"
            className="w-full px-4 py-4 rounded border focus:outline-none resize-none transition-colors"
            style={{
              background: 'var(--cru-surface)',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text)',
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '0.95rem',
              lineHeight: 1.75,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(139, 26, 46, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cru-border)';
            }}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-ui uppercase tracking-widest"
            style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
          >
            Any preferences?
          </label>
          <input
            type="text"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Prefer Old World, budget under $80, no oak…"
            className="w-full px-4 py-3 rounded border focus:outline-none transition-colors text-sm font-ui"
            style={{
              background: 'var(--cru-surface)',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(139, 26, 46, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cru-border)';
            }}
          />
        </div>

        <motion.button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!food.trim() || mutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-7 py-3 rounded font-ui text-sm tracking-wider disabled:opacity-50"
          style={{
            background: 'var(--cru-accent-garnet)',
            color: '#fff',
            letterSpacing: '0.06em',
          }}
        >
          {mutation.isPending ? 'Finding pairings…' : 'FIND PAIRINGS'}
          {!mutation.isPending && <ArrowRight className="h-4 w-4" />}
        </motion.button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && result.suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p
              className="text-xs font-ui uppercase tracking-widest"
              style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
            >
              Suggested Pairings
            </p>
            {result.suggestions.slice(0, 3).map((s, i) => (
              <PairingCard key={i} suggestion={s} index={i} />
            ))}
            {result.notes && (
              <p
                className="font-body italic text-sm"
                style={{ color: 'var(--cru-text-muted)', lineHeight: 1.75 }}
              >
                {result.notes}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── By Wine Tab ──────────────────────────────────────────────────────────────

function ByWineTab() {
  const { getToken } = useAuth();
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [result, setResult] = useState<PairingResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token || !selectedWineId) throw new Error('Not authenticated or no wine selected');
      return pairingsApi.fromWine(token, { wine_id: selectedWineId });
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <label
            className="text-xs font-ui uppercase tracking-widest"
            style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
          >
            Select a Wine
          </label>
          <WineSearchAutocomplete
            onSelect={(wine) => setSelectedWineId(wine.id)}
            onAddNew={() => {}}
          />
        </div>

        <motion.button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!selectedWineId || mutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-7 py-3 rounded font-ui text-sm tracking-wider disabled:opacity-50"
          style={{
            background: 'var(--cru-accent-garnet)',
            color: '#fff',
            letterSpacing: '0.06em',
          }}
        >
          {mutation.isPending ? 'Finding pairings…' : 'SUGGEST PAIRINGS'}
          {!mutation.isPending && <ArrowRight className="h-4 w-4" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p
              className="text-xs font-ui uppercase tracking-widest"
              style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
            >
              Food Pairings
            </p>
            {result.suggestions.slice(0, 3).map((s, i) => (
              <PairingCard key={i} suggestion={s} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tonight's Cellar Tab ─────────────────────────────────────────────────────

function TonightTab() {
  const { getToken } = useAuth();
  const [dish, setDish] = useState('');
  const [constraints, setConstraints] = useState('');
  const [result, setResult] = useState<PairingResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return pairingsApi.tonight(token, { food: dish, constraints });
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-4">
        <div className="p-4 rounded flex items-start gap-3 bg-cru-surface-raised border border-cru-border">
          <MoonStar className="h-4 w-4 mt-0.5 flex-shrink-0 text-cru-accent-garnet opacity-60" />
          <p className="text-xs font-ui leading-relaxed text-cru-text-muted">
            This tab searches your cellar for bottles currently in their drinking window
            that pair well with your dish tonight.
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-ui uppercase tracking-widest"
            style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
          >
            What&apos;s for dinner?
          </label>
          <textarea
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            rows={2}
            placeholder="Grilled sea bass with capers and lemon butter…"
            className="w-full px-4 py-3 rounded border focus:outline-none resize-none transition-colors text-sm"
            style={{
              background: 'var(--cru-surface)',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text)',
              fontFamily: 'Libre Baskerville, Georgia, serif',
              lineHeight: 1.7,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(139, 26, 46, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cru-border)';
            }}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-ui uppercase tracking-widest"
            style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
          >
            Constraints
          </label>
          <input
            type="text"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Budget, decant time, red or white only…"
            className="w-full px-4 py-2.5 rounded border text-sm font-ui focus:outline-none transition-colors"
            style={{
              background: 'var(--cru-surface)',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(139, 26, 46, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cru-border)';
            }}
          />
        </div>

        <motion.button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!dish.trim() || mutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-7 py-3 rounded font-ui text-sm tracking-wider disabled:opacity-50"
          style={{
            background: 'var(--cru-accent-garnet)',
            color: '#fff',
            letterSpacing: '0.06em',
          }}
        >
          {mutation.isPending ? 'Searching cellar…' : 'OPEN TONIGHT'}
          {!mutation.isPending && <ArrowRight className="h-4 w-4" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p
              className="text-xs font-ui uppercase tracking-widest"
              style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
            >
              From Your Cellar — Drink Tonight
            </p>
            {result.suggestions.length === 0 ? (
              <p className="font-body text-sm" style={{ color: 'var(--cru-text-muted)' }}>
                No bottles in your cellar match this pairing right now.
              </p>
            ) : (
              result.suggestions.slice(0, 3).map((s, i) => (
                <PairingCard key={i} suggestion={s} index={i} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'dish' | 'wine' | 'tonight';

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'dish', label: 'By Dish', icon: Utensils },
  { key: 'wine', label: 'By Wine', icon: Wine },
  { key: 'tonight', label: "Tonight's Cellar", icon: MoonStar },
];

export default function PairingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dish');

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            Food &amp; Wine Pairings
          </h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            Our sommelier AI matches your dish to the perfect bottle.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-cru-border" style={{ maxWidth: '480px' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-ui transition-colors ${
                isActive ? 'text-cru-text font-medium' : 'text-cru-text-muted hover:text-cru-text'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cru-accent-garnet" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dish' && <ByDishTab />}
          {activeTab === 'wine' && <ByWineTab />}
          {activeTab === 'tonight' && <TonightTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
