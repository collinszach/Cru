'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Wine, Package, MapPin, Calendar, DollarSign, Grid3X3 } from 'lucide-react';
import Link from 'next/link';
import { cellarApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import DrinkingWindowBadge from '@/components/cellar/DrinkingWindowBadge';
import BinLocator from '@/components/cellar/BinLocator';
import ConsumptionLog from '@/components/cellar/ConsumptionLog';

export default function CellarEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showBinLocator, setShowBinLocator] = useState(false);
  const [showConsumptionLog, setShowConsumptionLog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cellar-entry', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      // Load full cellar and find this entry
      const result = await cellarApi.list(token, { status: 'all', per_page: 200 });
      const entry = result.items.find((e) => e.id === id);
      if (!entry) throw new Error('Entry not found');
      return entry;
    },
    enabled: !!id,
  });

  const { mutate: updateBin } = useMutation({
    mutationFn: async (binLabel: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.update(token, id, { bin_location: binLabel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cellar-entry', id] });
      setShowBinLocator(false);
    },
  });

  const handleConsume = useCallback(
    async (occasion?: string, notes?: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await cellarApi.consumeWithDetails(token, id, { occasion, notes });
      queryClient.invalidateQueries({ queryKey: ['cellar'] });
      queryClient.invalidateQueries({ queryKey: ['cellar-entry', id] });
      setShowConsumptionLog(false);
    },
    [getToken, id, queryClient],
  );

  if (isLoading) return <PageLoader />;
  if (!data) {
    return (
      <div className="text-sm font-ui text-cru-text-muted">
        Entry not found.{' '}
        <Link href="/cellar" className="text-cru-accent-gold">
          Return to cellar
        </Link>
      </div>
    );
  }

  const entry = data;
  const wine = entry.wine;

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
        <Link href="/cellar" className="hover:text-cru-text transition-colors">
          Cellar
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-cru-text truncate max-w-xs">
          {wine?.name ?? 'Unknown Wine'} {entry.vintage}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {wine?.producer && (
            <p className="text-sm font-ui text-cru-text-muted uppercase tracking-widest mb-2">
              {wine.producer.name}
            </p>
          )}
          <div className="flex items-baseline gap-4">
            <h1
              className="text-4xl font-display italic"
              style={{ letterSpacing: '-0.02em' }}
            >
              {wine?.name ?? 'Unknown Wine'}
            </h1>
            <span className="font-mono text-3xl text-cru-accent-garnet flex-shrink-0">
              {entry.vintage}
            </span>
          </div>
          {wine?.appellation && (
            <p className="mt-2 text-sm font-ui text-cru-text-muted">
              {wine.appellation.name}
            </p>
          )}
        </div>

        {/* Drinking window */}
        {entry.drinking_window_status && (
          <div className="flex-shrink-0">
            <DrinkingWindowBadge
              status={entry.drinking_window_status}
              recommendation={entry.drink_recommendation}
            />
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Package,
            label: 'Quantity',
            value: `${entry.quantity} × ${entry.format ?? '750ml'}`,
          },
          {
            icon: MapPin,
            label: 'Bin Location',
            value: entry.bin_location ?? '—',
          },
          {
            icon: Calendar,
            label: 'Purchased',
            value: entry.purchase_date
              ? new Date(entry.purchase_date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : '—',
          },
          {
            icon: DollarSign,
            label: 'Purchase Price',
            value:
              entry.purchase_price != null
                ? `${entry.currency} ${entry.purchase_price.toLocaleString()}`
                : '—',
          },
          {
            icon: DollarSign,
            label: 'Current Value',
            value:
              entry.current_value != null
                ? `${entry.currency} ${entry.current_value.toLocaleString()}`
                : '—',
          },
          {
            icon: Wine,
            label: 'Condition',
            value:
              entry.condition.charAt(0).toUpperCase() + entry.condition.slice(1),
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="p-4 rounded border border-cru-border bg-cru-surface space-y-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-cru-text-muted" />
                <p className="text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                  {item.label}
                </p>
              </div>
              <p className="text-sm font-ui text-cru-text">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Drinking window */}
      {(entry.drink_from ?? entry.drink_by) && (
        <div className="p-5 rounded border border-cru-border bg-cru-surface space-y-2">
          <h2 className="text-base font-display">Drinking Window</h2>
          <div className="flex items-center gap-4">
            {entry.drink_from && (
              <div>
                <p className="text-2xs font-ui text-cru-text-muted">From</p>
                <p className="font-mono text-xl text-cru-text">{entry.drink_from}</p>
              </div>
            )}
            {entry.drink_from && entry.drink_by && (
              <div className="h-px flex-1 bg-cru-border" />
            )}
            {entry.drink_by && (
              <div className="text-right">
                <p className="text-2xs font-ui text-cru-text-muted">By</p>
                <p className="font-mono text-xl text-cru-text">{entry.drink_by}</p>
              </div>
            )}
          </div>
          {entry.drink_recommendation && (
            <p className="text-sm font-body text-cru-text-muted italic">
              {entry.drink_recommendation}
            </p>
          )}
        </div>
      )}

      {/* Provenance notes */}
      {entry.provenance_notes && (
        <div className="p-5 rounded border border-cru-border bg-cru-surface space-y-2">
          <h2 className="text-base font-display">Provenance</h2>
          <p className="text-sm font-body text-cru-text-muted leading-relaxed">
            {entry.provenance_notes}
          </p>
        </div>
      )}

      {/* Featured story */}
      {entry.is_featured && entry.featured_story && (
        <div
          className="p-5 rounded border space-y-3"
          style={{
            backgroundColor: 'rgba(201, 168, 76, 0.04)',
            borderColor: 'rgba(201, 168, 76, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xs font-ui uppercase tracking-widest text-cru-accent-gold">
              Featured
            </span>
            {entry.featured_occasion && (
              <span className="text-2xs font-ui text-cru-text-muted">
                · {entry.featured_occasion}
              </span>
            )}
          </div>
          <p className="text-base font-body text-cru-text leading-relaxed">
            {entry.featured_story}
          </p>
          {(entry.featured_companions ?? []).length > 0 && (
            <p className="text-xs font-ui text-cru-text-muted">
              With {entry.featured_companions!.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Bin Locator section */}
      <div
        className="p-5 rounded border space-y-3"
        style={{ backgroundColor: 'var(--cru-surface)', borderColor: 'var(--cru-border)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-cru-text-muted" />
            <h2 className="text-base font-display">Rack Location</h2>
          </div>
          {entry.bin_location ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm" style={{ color: 'var(--cru-accent-gold)' }}>
                {entry.bin_location}
              </span>
              <button
                onClick={() => setShowBinLocator((v) => !v)}
                className="text-2xs font-ui text-cru-text-muted hover:text-cru-text transition-colors"
              >
                {showBinLocator ? 'Cancel' : 'Reassign'}
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBinLocator((v) => !v)}
            >
              {showBinLocator ? 'Cancel' : 'Assign Location'}
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showBinLocator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t" style={{ borderColor: 'var(--cru-border)' }}>
                <BinLocator
                  occupiedSlots={entry.bin_location ? { [entry.bin_location]: wine?.name ?? 'This bottle' } : {}}
                  selectedSlot={entry.bin_location ?? undefined}
                  onSelect={(label) => updateBin(label)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-cru-border">
        <Button
          variant="primary"
          onClick={() => setShowConsumptionLog(true)}
        >
          Open a Bottle
        </Button>
        <Link href={`/journal/new?cellar_entry_id=${entry.id}`}>
          <Button variant="outline">Add Tasting Note</Button>
        </Link>
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {/* Consumption Log modal */}
      <AnimatePresence>
        {showConsumptionLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConsumptionLog(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <ConsumptionLog
                cellarEntryId={entry.id}
                wineName={wine?.name ?? 'Unknown Wine'}
                vintage={entry.vintage}
                currentQuantity={entry.quantity}
                onConsume={handleConsume}
                onCancel={() => setShowConsumptionLog(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
