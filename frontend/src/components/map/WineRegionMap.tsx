'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  APPELLATION_FILL_LAYER,
  APPELLATION_OUTLINE_LAYER,
  APPELLATION_HOVER_LAYER,
  getStatusLabel,
  getStatusColor,
} from './RegionPolygon';
import WineryMarker from './WineryMarker';
import type { GeoJSONFeature, GeoJSONFeatureCollection, WineryMapMarker } from '@/types';

// ─── Map Style ────────────────────────────────────────────────────────────────

/**
 * Build MapLibre style.
 * - When NEXT_PUBLIC_MAPTILES_URL is set (Protomaps PMTiles), use full vector style.
 * - Otherwise fall back to a light CartoDB raster base — no API key required,
 *   appellation GeoJSON polygons render on top either way.
 */
function buildMapStyle(tilesUrl: string | null): maplibregl.StyleSpecification {
  if (tilesUrl) {
    // Full Protomaps vector style
    return {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        protomaps: {
          type: 'vector',
          url: tilesUrl,
          attribution: '© Protomaps © OpenStreetMap',
        },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#F8F5F0' } },
        { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#C8D8E8' } },
        { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#EDE8E0' } },
        { id: 'land', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#F3EFE9' } },
        { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#E2DAD0', 'line-width': 0.5 } },
        {
          id: 'places', type: 'symbol', source: 'protomaps', 'source-layer': 'places',
          layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
          paint: { 'text-color': '#7A6E65', 'text-halo-color': '#F8F5F0', 'text-halo-width': 1 },
        },
      ],
    };
  }

  // Raster fallback — CartoDB Positron Light (no API key, CC BY 3.0)
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap © CartoDB',
        maxzoom: 19,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#F8F5F0' } },
      {
        id: 'carto-raster',
        type: 'raster',
        source: 'carto-light',
        paint: { 'raster-opacity': 0.85 },
      },
    ],
  };
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { status: 'in_cellar',  label: 'In Cellar',  color: '#6B1929' },
  { status: 'visited',    label: 'Visited',     color: '#8B7355' },
  { status: 'wishlisted', label: 'Wishlisted',  color: '#4A7090' },
  { status: 'unexplored', label: 'Unexplored',  color: '#E2DAD0' },
] as const;

function MapLegend() {
  return (
    <div
      className="absolute bottom-8 left-4 z-10 rounded border border-cru-border px-3 py-2.5 space-y-1.5 bg-cru-surface shadow"
    >
      {LEGEND_ITEMS.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color, border: '1px solid rgba(28,20,16,0.12)' }}
          />
          <span className="font-ui text-2xs text-cru-text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Region Slide-in Panel ────────────────────────────────────────────────────

interface RegionPanelProps {
  feature: GeoJSONFeature;
  onClose: () => void;
  onWishlist?: (slug: string) => void;
}

function RegionPanel({ feature, onClose, onWishlist }: RegionPanelProps) {
  const { name, country, region, user_status, bottle_count, note_count, avg_score, slug } =
    feature.properties;

  return (
    <motion.div
      key={slug}
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="absolute top-4 right-4 bottom-4 w-72 z-20 flex flex-col rounded border border-cru-border overflow-hidden shadow-md"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-cru-border">
        <div className="space-y-1 pr-2">
          <h2
            className="text-xl font-display italic leading-tight"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            {name}
          </h2>
          <p className="text-xs font-ui text-cru-text-muted">
            {[region, country].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-cru-surface-raised transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4 text-cru-text-muted" />
        </button>
      </div>

      {/* Status badge */}
      <div className="px-5 py-3 border-b border-cru-border">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getStatusColor(user_status) }}
          />
          <span className="text-xs font-ui" style={{ color: getStatusColor(user_status) }}>
            {getStatusLabel(user_status)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-cru-border">
        <div className="text-center">
          <p className="font-mono text-lg text-cru-text">{bottle_count}</p>
          <p className="text-2xs font-ui text-cru-text-muted mt-0.5">Bottles</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg text-cru-text">{note_count}</p>
          <p className="text-2xs font-ui text-cru-text-muted mt-0.5">Notes</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg text-cru-text">
            {avg_score ? avg_score.toFixed(0) : '—'}
          </p>
          <p className="text-2xs font-ui text-cru-text-muted mt-0.5">Avg Score</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 space-y-2 mt-auto">
        <Link
          href={`/regions/${slug}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded border border-cru-accent-garnet/40 text-xs font-ui text-cru-accent-straw hover:border-cru-accent-garnet hover:bg-cru-accent-garnet/10 transition-all"
        >
          <span>Explore Region</span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        {user_status === 'unexplored' && onWishlist && (
          <button
            onClick={() => onWishlist(slug)}
            className="w-full px-4 py-2.5 rounded border border-cru-border text-xs font-ui text-cru-text-muted hover:border-cru-accent-gold/30 hover:text-cru-accent-gold/80 transition-all"
          >
            Add to Wishlist
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Popup (hover) ────────────────────────────────────────────────────────────

function buildHoverPopup(feature: GeoJSONFeature): string {
  const { name, country, user_status, bottle_count, note_count } = feature.properties;
  const color = getStatusColor(user_status);
  const label = getStatusLabel(user_status);
  return `
    <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 2px 0;">
      <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 14px; color: #1C1410; margin-bottom: 4px;">${name}</div>
      <div style="font-size: 11px; color: #7A6E65; margin-bottom: 6px;">${country}</div>
      <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></div>
        <span style="font-size: 10px; color: ${color};">${label}</span>
      </div>
      <div style="font-size: 10px; color: #7A6E65; font-family: 'Fira Code', monospace;">
        ${bottle_count} bottles · ${note_count} notes
      </div>
    </div>
  `;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WineRegionMapProps {
  className?: string;
  geoJSON?: GeoJSONFeatureCollection | null;
  wineries?: WineryMapMarker[];
  onRegionClick?: (slug: string) => void;
  onWineryClick?: (wineryId: string) => void;
  onWishlistRegion?: (slug: string) => void;
  /** Stats overlay text e.g. "12 regions in your cellar · 8 visited" */
  statsText?: string;
}

export default function WineRegionMap({
  className,
  geoJSON,
  wineries = [],
  onRegionClick,
  onWineryClick,
  onWishlistRegion,
  statsText,
}: WineRegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);

  // Mount map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tilesUrl = process.env.NEXT_PUBLIC_MAPTILES_URL ?? null;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(tilesUrl),
      center: [2, 46],
      zoom: 4,
      minZoom: 1,
      maxZoom: 14,
      attributionControl: false,
    });

    // Navigation control — top right
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Attribution — unobtrusive, bottom right
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Add / update appellation GeoJSON source + layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !geoJSON) return;

    if (map.getSource('appellations')) {
      (map.getSource('appellations') as maplibregl.GeoJSONSource).setData(
        geoJSON as GeoJSON.FeatureCollection,
      );
      return;
    }

    map.addSource('appellations', {
      type: 'geojson',
      data: geoJSON as GeoJSON.FeatureCollection,
      generateId: true,
      promoteId: 'slug',
    });

    // Fill, outline, hover layers — order matters
    map.addLayer(APPELLATION_FILL_LAYER);
    map.addLayer(APPELLATION_OUTLINE_LAYER);
    map.addLayer(APPELLATION_HOVER_LAYER);

    // Hover — feature-state
    map.on('mousemove', 'appellations-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const id = feat.id;

      if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
        map.setFeatureState(
          { source: 'appellations', id: hoveredIdRef.current },
          { hover: false },
        );
      }
      hoveredIdRef.current = id ?? null;
      if (id !== undefined) {
        map.setFeatureState({ source: 'appellations', id }, { hover: true });
      }

      map.getCanvas().style.cursor = 'pointer';

      // Hover popup
      if (popupRef.current) {
        popupRef.current.remove();
      }

      const props = feat.properties as GeoJSONFeature['properties'];
      const syntheticFeature: GeoJSONFeature = {
        type: 'Feature',
        id: String(id),
        geometry: feat.geometry,
        properties: props,
      };

      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'cru-map-popup',
        maxWidth: '220px',
      })
        .setLngLat(e.lngLat)
        .setHTML(buildHoverPopup(syntheticFeature))
        .addTo(map);
    });

    map.on('mouseleave', 'appellations-fill', () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: 'appellations', id: hoveredIdRef.current },
          { hover: false },
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    // Click → select region
    map.on('click', 'appellations-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const props = feat.properties as GeoJSONFeature['properties'];

      const syntheticFeature: GeoJSONFeature = {
        type: 'Feature',
        id: String(feat.id),
        geometry: feat.geometry,
        properties: props,
      };

      setSelectedFeature(syntheticFeature);
      onRegionClick?.(props.slug);
      popupRef.current?.remove();
    });
  }, [mapReady, geoJSON, onRegionClick]);

  // Fit to user's appellations when data arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !geoJSON || geoJSON.features.length === 0) return;

    const userFeatures = geoJSON.features.filter(
      (f) => f.properties.user_status !== 'unexplored',
    );
    if (userFeatures.length === 0) return;

    // Compute bounding box of user-relevant features
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    function processCoords(coords: unknown) {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords as [number, number];
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        coords.forEach(processCoords);
      }
    }

    userFeatures.forEach((f) => {
      if (f.geometry) processCoords((f.geometry as { coordinates: unknown }).coordinates);
    });

    if (isFinite(minLng)) {
      // If bounds span > 60° longitude (cross-continental), fall back to Europe view
      const lngSpan = maxLng - minLng;
      if (lngSpan > 60) {
        map.flyTo({ center: [2, 46], zoom: 4, duration: 800 });
      } else {
        map.fitBounds(
          [
            [minLng - 1, minLat - 1],
            [maxLng + 1, maxLat + 1],
          ],
          { padding: 60, duration: 800, maxZoom: 7 },
        );
      }
    }
  // Only run when data first arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, !!geoJSON]);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo({ center: [2, 46], zoom: 4, duration: 800 });
    setSelectedFeature(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Inject popup styles */}
      <style>{`
        .cru-map-popup .maplibregl-popup-content {
          background: #FFFFFF;
          border: 1px solid #E2DAD0;
          border-radius: 4px;
          padding: 10px 12px;
          box-shadow: 0 4px 16px rgba(28,20,16,0.12);
        }
        .cru-map-popup .maplibregl-popup-tip {
          border-top-color: #E2DAD0;
          border-bottom-color: #E2DAD0;
        }
        .maplibregl-ctrl-group {
          background: #FFFFFF !important;
          border: 1px solid #E2DAD0 !important;
          border-radius: 3px !important;
          box-shadow: 0 1px 4px rgba(28,20,16,0.08) !important;
        }
        .maplibregl-ctrl-group button {
          background-color: transparent !important;
          border-bottom: 1px solid #E2DAD0 !important;
        }
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .maplibregl-ctrl-icon {
          filter: none;
          opacity: 0.6;
        }
        .maplibregl-ctrl-attrib {
          background: rgba(248,245,240,0.85) !important;
          color: #7A6E65 !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-attrib a {
          color: #7A6E65 !important;
        }
      `}</style>

      {/* Stats overlay — top left */}
      {statsText && (
        <div
          className="absolute top-4 left-4 z-10 px-3 py-2 rounded border border-cru-border bg-cru-surface shadow"
        >
          <p className="text-xs font-ui text-cru-text-muted">{statsText}</p>
        </div>
      )}

      {/* Reset view button — top right, below nav controls */}
      <button
        onClick={handleResetView}
        title="Reset view"
        className="absolute top-24 right-2.5 z-10 flex items-center justify-center w-[29px] h-[29px] rounded"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DAD0',
        }}
      >
        <RotateCcw className="h-3.5 w-3.5 text-cru-text-muted" />
      </button>

      {/* Legend — bottom left */}
      <MapLegend />

      {/* Winery markers */}
      {mapReady &&
        mapRef.current &&
        wineries.map((w) => (
          <WineryMarker
            key={w.id}
            map={mapRef.current!}
            winery={w}
            onClick={onWineryClick ?? (() => {})}
          />
        ))}

      {/* Region slide-in panel */}
      <AnimatePresence>
        {selectedFeature && (
          <RegionPanel
            feature={selectedFeature}
            onClose={handleClosePanel}
            onWishlist={onWishlistRegion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
