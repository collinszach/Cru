'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, Leaf } from 'lucide-react';
import { producersApi } from '@/lib/api';
import type { Producer } from '@/types';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';

function ProducerCard({ producer }: { producer: Producer }) {
  return (
    <Link href={`/producers/${producer.slug}`}>
      <div className="group p-4 rounded border border-cru-border bg-cru-surface hover:border-cru-accent-garnet/20 hover:bg-cru-surface-raised transition-all duration-150 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-display italic text-cru-text group-hover:text-cru-accent-garnet transition-colors leading-snug">
              {producer.name}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {producer.biodynamic && (
                <span
                  className="text-2xs font-ui px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(74, 124, 89, 0.2)',
                    color: '#6aae7a',
                    border: '1px solid rgba(74, 124, 89, 0.3)',
                  }}
                >
                  BD
                </span>
              )}
              {producer.organic_cert && (
                <Leaf className="h-3 w-3 text-green-500 opacity-70" />
              )}
            </div>
          </div>

          {producer.appellation && (
            <p className="text-xs font-ui text-cru-text-muted">
              {producer.appellation.name}
              {producer.appellation.country && ` · ${producer.appellation.country}`}
            </p>
          )}

          {producer.winemaker && (
            <p className="text-2xs font-ui text-cru-text-muted">
              {producer.winemaker}
            </p>
          )}

          {producer.style_notes && (
            <p className="text-xs font-body text-cru-text-muted line-clamp-2 leading-relaxed mt-1">
              {producer.style_notes}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ProducersPage() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['producers', query],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return producersApi.search(token, query || undefined);
    },
  });

  const producers = data?.items ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Producers</h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            Châteaux, domaines, estates. The hands behind the wine.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by name or region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftAdornment={<Search className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Count */}
      {!isLoading && data && (
        <p className="text-xs font-ui text-cru-text-muted">
          <span className="font-mono text-cru-text">{data.total.toLocaleString()}</span>{' '}
          {data.total === 1 ? 'producer' : 'producers'}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <PageLoader />
      ) : producers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={query ? 'No producers found' : 'No producers yet'}
          description={
            query
              ? `No producers match "${query}".`
              : 'Producers appear here as you add wines to your cellar.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {producers.map((producer) => (
            <ProducerCard key={producer.id} producer={producer} />
          ))}
        </div>
      )}
    </div>
  );
}
