'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notesApi, winesApi } from '@/lib/api';
import TastingNoteForm, { type TastingNoteFormData } from '@/components/tasting/TastingNoteForm';
import type { Wine, ScoringSystem } from '@/types';

export default function NewNotePage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const scoringSystem: ScoringSystem =
    (user?.publicMetadata?.scoring_system as ScoringSystem) ?? '100pt';

  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [vintageInput, setVintageInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['wine-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return winesApi.search(token, { query: searchQuery, per_page: 8 });
    },
    enabled: searchQuery.length >= 2,
  });

  const createNote = useMutation({
    mutationFn: async (data: TastingNoteFormData) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      // The form stores all controlled enum fields as plain strings to keep
      // react-hook-form generic. We cast here at the API boundary — the values
      // are validated by the backend against the same enum sets.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as Record<string, any>;
      return notesApi.create(token, {
        wine_id: d.wine_id,
        vintage: d.vintage,
        cellar_entry_id: d.cellar_entry_id ?? null,
        tasted_at: d.tasted_at,
        location: d.location ?? null,
        occasion: d.occasion ?? null,
        decant_minutes: d.decant_minutes ?? null,
        serve_temp_c: d.serve_temp_c ?? null,
        companions: d.companions ?? [],
        app_clarity: d.app_clarity ?? null,
        app_intensity: d.app_intensity ?? null,
        app_color: d.app_color ?? null,
        app_other: d.app_other ?? null,
        nose_condition: d.nose_condition,
        nose_fault: d.nose_fault ?? null,
        nose_intensity: d.nose_intensity ?? null,
        nose_development: d.nose_development ?? null,
        nose_descriptors: d.nose_descriptors,
        palate_sweetness: d.palate_sweetness ?? null,
        palate_acidity: d.palate_acidity ?? null,
        palate_tannin: d.palate_tannin ?? null,
        palate_tannin_nature: d.palate_tannin_nature ?? null,
        palate_alcohol: d.palate_alcohol ?? null,
        palate_body: d.palate_body ?? null,
        palate_mousse: d.palate_mousse ?? null,
        palate_finish: d.palate_finish ?? null,
        palate_finish_sec: d.palate_finish_sec ?? null,
        palate_intensity: d.palate_intensity ?? null,
        palate_descriptors: d.palate_descriptors,
        quality: d.quality ?? null,
        readiness: d.readiness ?? null,
        drink_from: d.drink_from ?? null,
        drink_by: d.drink_by ?? null,
        pairing_notes: d.pairing_notes ?? null,
        personal_score: d.personal_score ?? null,
        parker_score: d.parker_score ?? null,
        spectator_score: d.spectator_score ?? null,
        jancis_score: d.jancis_score ?? null,
        decanter_score: d.decanter_score ?? null,
        suckling_score: d.suckling_score ?? null,
        free_note: d.free_note ?? null,
        amendments: [],
        is_blind: false,
        blind_prediction: null,
      });
    },
    onSuccess: (note) => {
      router.push(`/journal/${note.id}`);
    },
  });

  const vintage = vintageInput ? parseInt(vintageInput, 10) : null;
  const isReadyForForm = selectedWine && vintage && vintage >= 1900 && vintage <= new Date().getFullYear() + 3;

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/journal"
          className="text-cru-text-muted hover:text-cru-text transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1
          className="text-3xl font-display italic"
          style={{ letterSpacing: '-0.02em' }}
        >
          New Tasting Note
        </h1>
      </div>

      {/* Step 1: Wine selection */}
      {!isReadyForForm && (
        <div
          className="p-6 rounded-lg space-y-6"
          style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
        >
          <div>
            <h2
              className="text-sm font-ui uppercase tracking-widest text-cru-text-muted mb-4"
            >
              Which wine are you tasting?
            </h2>

            {/* Wine search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cru-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search wines, producers, appellations..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60"
              />

              {/* Results dropdown */}
              {showResults && searchResults && searchResults.items.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-warm-lg overflow-hidden z-20"
                  style={{ background: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)' }}
                >
                  {searchResults.items.map((wine) => (
                    <button
                      key={wine.id}
                      type="button"
                      onClick={() => {
                        setSelectedWine(wine);
                        setSearchQuery(wine.full_name);
                        setShowResults(false);
                      }}
                      className="w-full flex items-baseline gap-3 px-4 py-3 text-left hover:bg-cru-border transition-colors"
                    >
                      <span
                        className="italic text-base text-cru-text truncate"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {wine.full_name}
                      </span>
                      {wine.appellation && (
                        <span className="text-xs font-ui text-cru-text-muted flex-shrink-0">
                          {wine.appellation.name}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showResults && isSearching && (
                <div className="absolute left-0 right-0 top-full mt-1 px-4 py-3 text-xs font-ui text-cru-text-muted rounded-lg" style={{ background: 'var(--cru-surface-raised)', border: '1px solid var(--cru-border)' }}>
                  Searching...
                </div>
              )}
            </div>

            {selectedWine && (
              <p className="mt-2 text-xs font-ui text-cru-accent-gold">
                {selectedWine.producer?.name} · {selectedWine.appellation?.name}
              </p>
            )}
          </div>

          {/* Vintage */}
          <div className="space-y-2">
            <label className="text-sm font-ui uppercase tracking-widest text-cru-text-muted">
              Vintage
            </label>
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear() + 3}
              placeholder={new Date().getFullYear().toString()}
              value={vintageInput}
              onChange={(e) => setVintageInput(e.target.value)}
              className="w-32 px-3 py-2 text-center font-mono text-2xl bg-cru-surface border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text"
              style={{ letterSpacing: '-0.04em', color: 'var(--cru-accent-garnet)' }}
            />
          </div>

          {selectedWine && vintageInput && !isReadyForForm && (
            <p className="text-xs font-ui text-red-400">
              Please enter a valid vintage year.
            </p>
          )}
        </div>
      )}

      {/* Step 2: Tasting note form */}
      {isReadyForForm && selectedWine && vintage && (
        <div>
          <TastingNoteForm
            wineId={selectedWine.id}
            wineName={selectedWine.full_name}
            vintage={vintage}
            wineColor={selectedWine.color ?? undefined}
            isSparkling={
              ['sparkling', 'champagne', 'cremant', 'prosecco', 'cava', 'sekt', 'pet-nat'].includes(
                selectedWine.style,
              )
            }
            scoringSystem={scoringSystem}
            onSubmit={async (data) => {
              await createNote.mutateAsync(data);
            }}
            onCancel={() => {
              setSelectedWine(null);
              setVintageInput('');
              setSearchQuery('');
            }}
          />
          {createNote.error && (
            <p className="mt-4 text-sm font-ui text-red-400">
              {createNote.error instanceof Error
                ? createNote.error.message
                : 'Failed to save note. Please try again.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
