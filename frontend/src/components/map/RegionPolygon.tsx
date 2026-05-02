/**
 * RegionPolygon — MapLibre layer config constants + status utilities.
 * No rendering here. These configs are consumed by WineRegionMap.
 */

import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

export const APPELLATION_FILL_LAYER: FillLayerSpecification = {
  id: 'appellations-fill',
  type: 'fill',
  source: 'appellations',
  paint: {
    'fill-color': [
      'match',
      ['get', 'user_status'],
      'in_cellar',   '#6B1929',  // deep claret — 30% opacity
      'visited',     '#8B7355',  // warm stone — 25% opacity
      'wishlisted',  '#4A7090',  // slate blue — 25% opacity
      /* default */  '#E2DAD0',  // warm border — unexplored
    ],
    'fill-opacity': [
      'match',
      ['get', 'user_status'],
      'in_cellar',   0.30,
      'visited',     0.25,
      'wishlisted',  0.25,
      /* default */  0.30,
    ],
  },
};

export const APPELLATION_OUTLINE_LAYER: LineLayerSpecification = {
  id: 'appellations-outline',
  type: 'line',
  source: 'appellations',
  paint: {
    'line-color': [
      'match',
      ['get', 'user_status'],
      'in_cellar',  '#6B1929',
      'visited',    '#8B7355',
      /* default */ '#C8BDB0',
    ],
    'line-width': [
      'match',
      ['get', 'user_status'],
      'in_cellar',  1.5,
      'visited',    1.0,
      /* default */ 0.5,
    ],
  },
};

export const APPELLATION_HOVER_LAYER: FillLayerSpecification = {
  id: 'appellations-hover',
  type: 'fill',
  source: 'appellations',
  paint: {
    'fill-color': '#1C1410',
    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.06,
      0,
    ],
  },
};

// ─── Status utilities ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  in_cellar:  'In Cellar',
  visited:    'Visited',
  wishlisted: 'Wishlisted',
  unexplored: 'Unexplored',
};

const STATUS_COLORS: Record<string, string> = {
  in_cellar:  '#6B1929',
  visited:    '#8B7355',
  wishlisted: '#4A7090',
  unexplored: '#C8BDB0',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#C8BDB0';
}
