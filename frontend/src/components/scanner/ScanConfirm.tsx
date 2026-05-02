'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { winesApi } from '@/lib/api';
import type { LabelScanResult, WineStyle } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmedWineData {
  producer: string;
  wine_name: string;
  appellation: string;
  region: string;
  country: string;
  vintage: number | null;
  grapes: string[];
  alcohol_pct: number | null;
  classification: string;
  style: WineStyle | null;
  volume_ml: number | null;
  matched_wine_id?: string;
}

interface ScanConfirmProps {
  extractedData: LabelScanResult;
  photoId: string;
  presignedUrl: string;
  onConfirm: (action: 'cellar' | 'note' | 'save', data: ConfirmedWineData) => void;
  onRescan: () => void;
}

// ─── Style pill config ────────────────────────────────────────────────────────

const STYLE_OPTIONS: { value: WineStyle; label: string }[] = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rose', label: 'Rosé' },
  { value: 'orange', label: 'Orange' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'port', label: 'Fortified' },
  { value: 'sauternes', label: 'Dessert' },
];

const VOLUME_OPTIONS: { value: number; label: string }[] = [
  { value: 375, label: '375ml' },
  { value: 750, label: '750ml' },
  { value: 1500, label: '1.5L' },
  { value: 3000, label: '3L' },
  { value: 6000, label: 'Magnum' },
];

// ─── GrapeTagInput ────────────────────────────────────────────────────────────

function GrapeTagInput({ grapes, onChange }: { grapes: string[]; onChange: (g: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !grapes.includes(v)) onChange([...grapes, v]);
    setInput('');
  };

  const remove = (g: string) => onChange(grapes.filter((x) => x !== g));

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 rounded min-h-[38px]"
      style={{ border: '1px solid var(--cru-border)', backgroundColor: 'var(--cru-surface)' }}
    >
      {grapes.map((g) => (
        <span
          key={g}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-ui"
          style={{ backgroundColor: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)', color: 'var(--cru-text)' }}
        >
          {g}
          <button
            onClick={() => remove(g)}
            className="text-cru-text-muted hover:text-cru-text transition-colors ml-0.5"
            aria-label={`Remove ${g}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={grapes.length === 0 ? 'Add grape variety, press Enter' : ''}
        className="flex-1 min-w-[140px] bg-transparent text-xs font-ui text-cru-text placeholder:text-cru-text-muted outline-none"
        style={{ minWidth: 0 }}
      />
    </div>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 rounded text-sm font-ui bg-cru-surface text-cru-text placeholder:text-cru-text-muted outline-none transition-colors focus:ring-1';
const inputStyle: React.CSSProperties = {
  border: '1px solid var(--cru-border)',
};

// ─── WineMatchPanel ───────────────────────────────────────────────────────────

function WineMatchPanel({
  producer,
  wineName,
  onMatch,
  matchedId,
}: {
  producer: string;
  wineName: string;
  onMatch: (id: string | null) => void;
  matchedId: string | null;
}) {
  const { getToken } = useAuth();
  const query = [producer, wineName].filter(Boolean).join(' ').trim();

  const { data: results, isLoading } = useQuery({
    queryKey: ['wine-autocomplete', query],
    queryFn: async () => {
      if (!query) return [];
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return winesApi.autocomplete(token, query);
    },
    enabled: query.length > 2,
    staleTime: 30_000,
  });

  if (!query || query.length <= 2) return null;

  return (
    <div
      className="rounded p-4 space-y-3"
      style={{ border: '1px solid var(--cru-border)', backgroundColor: 'var(--cru-surface)' }}
    >
      <p className="text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
        Database Match
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching…
        </div>
      )}

      {!isLoading && results && results.length === 0 && (
        <p className="text-xs font-body text-cru-text-muted italic">
          New to our cellar — will be added to the database.
        </p>
      )}

      {!isLoading && results && results.length > 0 && (
        <ul className="space-y-2">
          {results.slice(0, 3).map((wine) => (
            <li key={wine.id}>
              <button
                onClick={() => onMatch(matchedId === wine.id ? null : wine.id)}
                className="w-full flex items-start gap-3 p-2.5 rounded text-left transition-all duration-150"
                style={{
                  border: `1px solid ${matchedId === wine.id ? 'var(--cru-accent-gold)' : 'var(--cru-border)'}`,
                  backgroundColor: matchedId === wine.id ? 'rgba(201,168,76,0.08)' : 'var(--cru-surface-raised)',
                }}
              >
                {matchedId === wine.id && (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--cru-accent-gold)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display italic text-cru-text leading-snug">
                    {wine.full_name}
                  </p>
                  {wine.producer_name && (
                    <p className="text-xs font-ui text-cru-text-muted">
                      {wine.producer_name}
                      {wine.appellation_name ? ` · ${wine.appellation_name}` : ''}
                    </p>
                  )}
                </div>
                <StyleDot style={wine.style as WineStyle | undefined} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── StyleDot ─────────────────────────────────────────────────────────────────

function StyleDot({ style }: { style?: WineStyle | null }) {
  const colorMap: Partial<Record<WineStyle, string>> = {
    red: 'var(--cru-red)',
    white: 'var(--cru-white)',
    rose: 'var(--cru-rose)',
    orange: 'var(--cru-orange)',
    sparkling: 'var(--cru-sparkling)',
    champagne: 'var(--cru-sparkling)',
    port: 'var(--cru-fortified)',
  };
  const color = (style && colorMap[style]) ?? 'var(--cru-accent-slate)';
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
      style={{ backgroundColor: color }}
      title={style ?? undefined}
    />
  );
}

// ─── ScanConfirm ──────────────────────────────────────────────────────────────

export default function ScanConfirm({ extractedData, presignedUrl, onConfirm, onRescan }: ScanConfirmProps) {
  const [form, setForm] = useState<ConfirmedWineData>({
    producer: extractedData.producer ?? '',
    wine_name: extractedData.wine_name ?? '',
    appellation: extractedData.appellation ?? '',
    region: extractedData.region ?? '',
    country: extractedData.country ?? '',
    vintage: extractedData.vintage ?? null,
    grapes: extractedData.grapes ?? [],
    alcohol_pct: extractedData.alcohol_pct ?? null,
    classification: extractedData.classification ?? '',
    style: extractedData.style as WineStyle | null ?? null,
    volume_ml: extractedData.volume_ml ?? 750,
    matched_wine_id: undefined,
  });

  const [matchedId, setMatchedId] = useState<string | null>(null);

  const set = useCallback(<K extends keyof ConfirmedWineData>(key: K, value: ConfirmedWineData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleMatch = useCallback((id: string | null) => {
    setMatchedId(id);
    setForm((prev) => ({ ...prev, matched_wine_id: id ?? undefined }));
  }, []);

  const submit = (action: 'cellar' | 'note' | 'save') => {
    onConfirm(action, form);
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: 'var(--cru-bg)' }}
    >
      {/* ── Left: Label photo ── */}
      <div
        className="relative md:w-[45%] md:min-h-screen flex-shrink-0 overflow-hidden"
        style={{ minHeight: '360px' }}
      >
        {presignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={presignedUrl}
            alt="Wine label"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--cru-surface)' }}
          >
            <p className="text-xs font-ui text-cru-text-muted">No photo</p>
          </div>
        )}

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(13,11,9,0.7) 100%)',
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(13,11,9,0.95) 0%, transparent 100%)',
          }}
        />

        {/* Producer overlay */}
        {form.producer && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p
              className="font-display italic leading-tight"
              style={{
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                color: 'var(--cru-accent-gold)',
                textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              }}
            >
              {form.producer}
            </p>
            {form.vintage && (
              <p
                className="font-mono mt-1"
                style={{
                  fontSize: '1rem',
                  color: 'rgba(232,221,212,0.7)',
                  letterSpacing: '0.08em',
                }}
              >
                {form.vintage}
              </p>
            )}
          </div>
        )}

        {/* Vintage large — bottom right */}
        {form.vintage && (
          <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
            <span
              className="font-mono font-medium"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                color: 'rgba(232,221,212,0.15)',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              {form.vintage}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Extracted fields ── */}
      <div
        className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10"
        style={{ backgroundColor: 'var(--cru-bg)' }}
      >
        {/* Back + header */}
        <div className="mb-8">
          <button
            onClick={onRescan}
            className="flex items-center gap-1.5 text-xs font-ui text-cru-text-muted hover:text-cru-text transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Rescan
          </button>

          <p
            className="font-display italic mb-2"
            style={{ fontSize: '1.6rem', color: 'var(--cru-text)', letterSpacing: '-0.01em' }}
          >
            We found this wine
          </p>
          <div style={{ width: 32, height: 1, backgroundColor: 'var(--cru-accent-garnet)' }} />
          <p className="mt-3 text-xs font-body text-cru-text-muted">
            Review and correct the extracted fields before adding to your collection.
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Producer">
              <input
                className={inputClass}
                style={inputStyle}
                value={form.producer}
                onChange={(e) => set('producer', e.target.value)}
                placeholder="Domaine Rousseau"
              />
            </FieldRow>
            <FieldRow label="Vintage">
              <input
                className={`${inputClass} font-mono`}
                style={inputStyle}
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                value={form.vintage ?? ''}
                onChange={(e) => set('vintage', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="2018"
              />
            </FieldRow>
          </div>

          <FieldRow label="Wine Name / Cuvée">
            <input
              className={inputClass}
              style={inputStyle}
              value={form.wine_name}
              onChange={(e) => set('wine_name', e.target.value)}
              placeholder="Chambertin Grand Cru"
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Appellation">
              <input
                className={inputClass}
                style={inputStyle}
                value={form.appellation}
                onChange={(e) => set('appellation', e.target.value)}
                placeholder="Chambertin"
              />
            </FieldRow>
            <FieldRow label="Region">
              <input
                className={inputClass}
                style={inputStyle}
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="Burgundy"
              />
            </FieldRow>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Country">
              <input
                className={inputClass}
                style={inputStyle}
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="France"
              />
            </FieldRow>
            <FieldRow label="Classification">
              <input
                className={inputClass}
                style={inputStyle}
                value={form.classification}
                onChange={(e) => set('classification', e.target.value)}
                placeholder="Grand Cru"
              />
            </FieldRow>
          </div>

          <FieldRow label="Grapes">
            <GrapeTagInput
              grapes={form.grapes}
              onChange={(g) => set('grapes', g)}
            />
          </FieldRow>

          <FieldRow label="Alcohol %">
            <input
              className={`${inputClass} font-mono`}
              style={inputStyle}
              type="number"
              step={0.1}
              min={0}
              max={25}
              value={form.alcohol_pct ?? ''}
              onChange={(e) => set('alcohol_pct', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="13.5"
            />
          </FieldRow>

          {/* Style pills */}
          <FieldRow label="Style">
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('style', form.style === opt.value ? null : opt.value)}
                  className="px-3 py-1 rounded-full text-xs font-ui transition-all duration-150"
                  style={{
                    border: `1px solid ${form.style === opt.value ? 'var(--cru-accent-garnet)' : 'var(--cru-border)'}`,
                    backgroundColor: form.style === opt.value ? 'rgba(139,26,46,0.18)' : 'transparent',
                    color: form.style === opt.value ? 'var(--cru-text)' : 'var(--cru-text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FieldRow>

          {/* Volume pills */}
          <FieldRow label="Volume">
            <div className="flex flex-wrap gap-2">
              {VOLUME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('volume_ml', opt.value)}
                  className="px-3 py-1 rounded-full text-xs font-mono transition-all duration-150"
                  style={{
                    border: `1px solid ${form.volume_ml === opt.value ? 'var(--cru-accent-gold)' : 'var(--cru-border)'}`,
                    backgroundColor: form.volume_ml === opt.value ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: form.volume_ml === opt.value ? 'var(--cru-accent-gold)' : 'var(--cru-text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FieldRow>

          {/* Database match */}
          <WineMatchPanel
            producer={form.producer}
            wineName={form.wine_name}
            onMatch={handleMatch}
            matchedId={matchedId}
          />

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--cru-border)', paddingTop: '1.5rem' }}>
            {/* Action buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => submit('cellar')}
                className="w-full py-3 rounded font-ui text-sm tracking-wide transition-all duration-150 hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: 'var(--cru-accent-garnet)',
                  color: 'var(--cru-text)',
                  letterSpacing: '0.06em',
                }}
              >
                Add to Cellar
              </button>
              <button
                onClick={() => submit('note')}
                className="w-full py-3 rounded font-ui text-sm tracking-wide transition-all duration-150"
                style={{
                  border: '1px solid var(--cru-border)',
                  color: 'var(--cru-text)',
                  backgroundColor: 'var(--cru-surface)',
                }}
              >
                Log a Tasting Note
              </button>
              <button
                onClick={() => submit('save')}
                className="w-full py-2.5 rounded font-ui text-xs text-cru-text-muted hover:text-cru-text transition-colors"
              >
                Save for Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
