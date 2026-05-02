'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, ChevronRight, Wine, Check } from 'lucide-react';
import { cellarApi, winesApi } from '@/lib/api';
import type { Wine as WineType, WineFormat, PurchaseSource } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({
  wine_id: z.string().min(1, 'Select a wine'),
  vintage: z
    .number({ invalid_type_error: 'Enter a valid year' })
    .int()
    .min(1900)
    .max(new Date().getFullYear()),
  quantity: z.number().int().min(1).max(999).default(1),
  format: z.enum(['187ml', '375ml', '500ml', '750ml', '1L', '1.5L', '3L', '6L', '9L', '12L']).default('750ml'),
  purchase_date: z.string().optional(),
  purchase_price: z.number().positive().optional(),
  currency: z.string().default('USD'),
  purchase_source: z.enum(['winery', 'retailer', 'auction', 'allocation', 'gift', 'other']).optional(),
  retailer: z.string().optional(),
  bin_location: z.string().optional(),
  provenance_notes: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FORMATS: WineFormat[] = ['375ml', '750ml', '1.5L', '3L', '6L'];
const SOURCES: Array<{ value: PurchaseSource; label: string }> = [
  { value: 'winery', label: 'Winery Direct' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'auction', label: 'Auction' },
  { value: 'allocation', label: 'Allocation' },
  { value: 'gift', label: 'Gift' },
  { value: 'other', label: 'Other' },
];

export default function CellarIntakePage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [wineSearch, setWineSearch] = useState('');
  const [selectedWine, setSelectedWine] = useState<WineType | null>(null);
  const [showSearch, setShowSearch] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      format: '750ml',
      currency: 'USD',
    },
  });

  // Wine search
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['wine-search', wineSearch],
    queryFn: async () => {
      const token = await getToken();
      if (!token || wineSearch.length < 2) return { items: [], total: 0, page: 1, per_page: 10, has_more: false };
      return winesApi.search(token, { query: wineSearch, per_page: 8 });
    },
    enabled: wineSearch.length >= 2,
  });

  // Add to cellar mutation
  const { mutate: addTocellar, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.add(token, data);
    },
    onSuccess: () => {
      router.push('/cellar');
    },
  });

  function selectWine(wine: WineType) {
    setSelectedWine(wine);
    setValue('wine_id', wine.id);
    setShowSearch(false);
    setWineSearch('');
  }

  function onSubmit(data: FormData) {
    addTocellar(data);
  }

  const selectedFormat = watch('format');
  const selectedSource = watch('purchase_source');

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs font-ui text-cru-text-muted mb-4">
          <a href="/cellar" className="hover:text-cru-text transition-colors">
            Cellar
          </a>
          <ChevronRight className="h-3 w-3" />
          <span className="text-cru-text">Add Bottle</span>
        </nav>
        <h1 className="text-4xl font-display" style={{ letterSpacing: '-0.02em' }}>
          Add to Cellar
        </h1>
        <p className="mt-1 text-sm font-body text-cru-text-muted">
          Search for a wine, then fill in the details.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Wine selection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display">Wine</h2>
            {selectedWine && (
              <button
                type="button"
                className="text-xs font-ui text-cru-accent-gold hover:text-cru-accent-straw transition-colors"
                onClick={() => {
                  setSelectedWine(null);
                  setValue('wine_id', '');
                  setShowSearch(true);
                }}
              >
                Change
              </button>
            )}
          </div>

          {/* Selected wine display */}
          {selectedWine && (
            <div
              className="flex items-start gap-4 p-4 rounded border"
              style={{
                backgroundColor: 'var(--cru-surface-raised)',
                borderColor: 'var(--cru-accent-gold)',
                opacity: 0.9,
              }}
            >
              <div className="h-10 w-10 rounded flex items-center justify-center flex-shrink-0 bg-cru-surface">
                <Wine className="h-5 w-5 text-cru-accent-garnet opacity-60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-ui text-cru-text-muted uppercase tracking-wide truncate">
                  {selectedWine.producer?.name}
                </p>
                <p className="text-base font-display italic text-cru-text truncate">
                  {selectedWine.name}
                </p>
                <p className="text-xs font-ui text-cru-text-muted mt-0.5">
                  {selectedWine.appellation?.name}
                </p>
              </div>
              <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-1" />
            </div>
          )}

          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Input
                label="Search wines"
                placeholder="Producer, wine name, or appellation…"
                value={wineSearch}
                onChange={(e) => setWineSearch(e.target.value)}
                leftAdornment={<Search className="h-3.5 w-3.5" />}
              />
              {errors.wine_id && (
                <p className="mt-1 text-xs font-ui text-red-400">
                  {errors.wine_id.message}
                </p>
              )}

              {/* Results dropdown */}
              {wineSearch.length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-10 rounded border border-cru-border overflow-hidden shadow-warm-lg"
                  style={{ backgroundColor: 'var(--cru-surface-raised)' }}
                >
                  {searching && (
                    <div className="px-4 py-3 text-xs font-ui text-cru-text-muted">
                      Searching…
                    </div>
                  )}
                  {!searching &&
                    searchResults?.items.length === 0 && (
                      <div className="px-4 py-3 text-xs font-ui text-cru-text-muted">
                        No wines found.{' '}
                        <span className="text-cru-accent-gold cursor-pointer hover:text-cru-accent-straw">
                          Add new wine
                        </span>
                      </div>
                    )}
                  {searchResults?.items.map((wine) => (
                    <button
                      key={wine.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-cru-surface transition-colors border-b border-cru-border last:border-0"
                      onClick={() => selectWine(wine)}
                    >
                      <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-wide">
                        {wine.producer?.name}
                      </p>
                      <p className="text-sm font-display italic text-cru-text">
                        {wine.name}
                      </p>
                      <p className="text-2xs font-ui text-cru-text-muted mt-0.5">
                        {wine.appellation?.name} ·{' '}
                        {wine.color ?? wine.style}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Vintage + Quantity */}
        <section className="space-y-4">
          <h2 className="text-lg font-display">Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vintage"
              type="number"
              placeholder="2019"
              mono
              error={errors.vintage?.message}
              {...register('vintage', { valueAsNumber: true })}
            />
            <Input
              label="Quantity"
              type="number"
              placeholder="1"
              error={errors.quantity?.message}
              {...register('quantity', { valueAsNumber: true })}
            />
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
              Format
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setValue('format', fmt)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                    selectedFormat === fmt
                      ? 'border-cru-accent-gold/50 bg-cru-accent-gold/10 text-cru-accent-gold'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text hover:border-cru-border'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Bin location */}
          <Input
            label="Bin Location"
            placeholder="e.g. A-3, Rack 2 Row 4"
            hint="Where is this bottle physically stored?"
            {...register('bin_location')}
          />
        </section>

        {/* Purchase details */}
        <section className="space-y-4">
          <h2 className="text-lg font-display">Purchase</h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              {...register('purchase_date')}
            />
            <div className="space-y-1.5">
              <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Price
              </label>
              <div className="flex gap-2">
                <input
                  className="w-16 h-9 px-2 text-xs font-ui rounded border border-cru-border bg-cru-surface text-cru-text focus:outline-none focus:border-cru-accent-gold"
                  defaultValue="USD"
                  {...register('currency')}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="flex-1 h-9 px-3 text-sm font-mono rounded border border-cru-border bg-cru-surface text-cru-text focus:outline-none focus:border-cru-accent-gold placeholder:text-cru-text-muted"
                  {...register('purchase_price', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
              Source
            </label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setValue('purchase_source', s.value)}
                  className={`px-3 py-1.5 text-xs font-ui rounded border transition-colors ${
                    selectedSource === s.value
                      ? 'border-cru-accent-gold/50 bg-cru-accent-gold/10 text-cru-accent-gold'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Retailer"
            placeholder="Wine shop, auction house, etc."
            {...register('retailer')}
          />
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <h2 className="text-lg font-display">Notes</h2>
          <div className="space-y-1.5">
            <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
              Provenance Notes
            </label>
            <textarea
              rows={3}
              placeholder="Storage history, purchase context, condition observations…"
              className="w-full px-3 py-2.5 text-sm font-body rounded border border-cru-border bg-cru-surface text-cru-text placeholder:text-cru-text-muted focus:outline-none focus:border-cru-accent-gold resize-none"
              {...register('provenance_notes')}
            />
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2 border-t border-cru-border">
          <Button type="submit" variant="primary" size="lg" loading={isPending}>
            Add to Cellar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push('/cellar')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
