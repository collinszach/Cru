'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { regionsApi, wineriesApi } from '@/lib/api';
import type { Appellation } from '@/types';
import Input from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// Dynamic import — MapLibre cannot run during SSR
const WineRegionMap = dynamic(
  () => import('@/components/map/WineRegionMap'),
  { ssr: false, loading: () => <div className="w-full h-full bg-cru-bg animate-pulse" /> },
);

// ─── Region list item ─────────────────────────────────────────────────────────

function RegionListItem({ appellation }: { appellation: Appellation }) {
  // We don't have user_status on Appellation directly — the list is supplemental.
  // Status comes from the GeoJSON layer. Here we just link through.
  return (
    <Link
      href={`/regions/${appellation.slug}`}
      className="group flex items-center gap-3 px-3 py-2.5 rounded hover:bg-cru-surface-raised transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-display italic text-sm text-cru-text group-hover:text-cru-accent-garnet transition-colors truncate">
          {appellation.name}
        </p>
        {appellation.region && (
          <p className="text-2xs font-ui text-cru-text-muted truncate">{appellation.region}</p>
        )}
      </div>
      {appellation.classification && (
        <span className="flex-shrink-0 text-2xs font-ui text-cru-accent-gold/70">
          {appellation.classification}
        </span>
      )}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegionsPage() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');

  // Appellations list (for the sidebar grid)
  const { data: appellations, isLoading: loadingAppellations } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regionsApi.list(token);
    },
    staleTime: 60 * 60 * 1000,
  });

  // GeoJSON for the map choropleth
  const { data: geoJSON } = useQuery({
    queryKey: ['regions-geojson'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regionsApi.getGeoJSON(token);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Winery map markers
  const { data: wineries } = useQuery({
    queryKey: ['wineries-map'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wineriesApi.getMapMarkers(token);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stats overlay text derived from GeoJSON
  const statsText = useMemo(() => {
    if (!geoJSON) return undefined;
    const counts = geoJSON.features.reduce(
      (acc, f) => {
        acc[f.properties.user_status] = (acc[f.properties.user_status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const parts: string[] = [];
    if (counts['in_cellar']) parts.push(`${counts['in_cellar']} in cellar`);
    if (counts['visited']) parts.push(`${counts['visited']} visited`);
    if (counts['wishlisted']) parts.push(`${counts['wishlisted']} wishlisted`);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [geoJSON]);

  // Filtered / grouped list for sidebar
  const filtered = useMemo(
    () =>
      (appellations ?? []).filter(
        (a) =>
          !query ||
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.country.toLowerCase().includes(query.toLowerCase()) ||
          (a.region ?? '').toLowerCase().includes(query.toLowerCase()),
      ),
    [appellations, query],
  );

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, Appellation[]>>((acc, a) => {
        if (!acc[a.country]) acc[a.country] = [];
        acc[a.country].push(a);
        return acc;
      }, {}),
    [filtered],
  );

  return (
    /*
     * Break out of the layout's max-w + padding constraints.
     * The layout wraps children in max-w-[1600px] px-8 py-8.
     * We use -mx-8 -my-8 to reclaim that space, then lay out our own structure.
     */
    <div className="-mx-8 -my-8 flex h-[calc(100vh-0px)]" style={{ height: 'calc(100vh - 0px)' }}>
      {/* ── Map (primary interface) ─────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0" style={{ height: '100vh' }}>
        <WineRegionMap
          className="w-full h-full"
          geoJSON={geoJSON}
          wineries={wineries ?? []}
          statsText={statsText}
          onRegionClick={(_slug) => {
            // Panel is handled inside WineRegionMap's slide-in panel
          }}
          onWineryClick={(_id) => {
            // Future: open winery modal
          }}
          onWishlistRegion={(_slug) => {
            // Future: open wishlist-add dialog
          }}
        />
      </div>

      {/* ── Sidebar list (secondary) ────────────────────────────────────── */}
      <div
        className="w-72 flex-shrink-0 flex flex-col border-l border-cru-border overflow-hidden"
        style={{ backgroundColor: 'var(--cru-surface)', height: '100vh' }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-cru-border flex-shrink-0">
          <h1
            className="font-display text-3xl text-cru-text"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Regions
          </h1>
          <p className="mt-1 font-ui text-xs text-cru-text-muted">
            The geography of wine.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-cru-border flex-shrink-0">
          <Input
            placeholder="Search regions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftAdornment={<Search className="h-3 w-3" />}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loadingAppellations ? (
            <PageLoader />
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([country, apps]) => (
                  <section key={country}>
                    <div className="flex items-center gap-2 px-3 pb-1.5 mb-1">
                      <h2 className="text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
                        {country}
                      </h2>
                      <span className="font-mono text-2xs text-cru-text-muted opacity-60">
                        {apps.length}
                      </span>
                    </div>
                    <div>
                      {apps.map((a) => (
                        <RegionListItem key={a.id} appellation={a} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
