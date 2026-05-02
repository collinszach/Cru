'use client';

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import type { WineryMapMarker } from '@/types';

// ─── CSS for marker DOM elements (injected once) ──────────────────────────────

const MARKER_STYLES = `
.winery-marker-wrap {
  position: relative;
  cursor: pointer;
}
.winery-marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.winery-marker-wrap:hover .winery-marker-dot {
  transform: scale(1.5);
}
.winery-marker-visited .winery-marker-dot {
  background: #8b1a2e;
  border: 2px solid #c9a84c;
  box-shadow: 0 0 4px rgba(139, 26, 46, 0.5);
}
.winery-marker-wishlist .winery-marker-dot {
  background: transparent;
  border: 2px solid #8b1a2e;
}
.winery-marker-skip .winery-marker-dot {
  background: transparent;
  border: 2px dashed #3d3028;
}
.winery-marker-tooltip {
  display: none;
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e1916;
  border: 1px solid #2d2420;
  border-radius: 3px;
  padding: 5px 8px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}
.winery-marker-wrap:hover .winery-marker-tooltip {
  display: block;
}
.winery-marker-tooltip-name {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  color: #e8ddd4;
  display: block;
}
.winery-marker-tooltip-producer {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  color: #8b7d74;
  display: block;
  margin-top: 1px;
}
`;

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = MARKER_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WineryMarkerProps {
  map: MaplibreMap;
  winery: WineryMapMarker;
  onClick: (wineryId: string) => void;
}

/**
 * Mounts a custom DOM marker onto the MapLibre map instance.
 * Returns null — side-effect only via useEffect.
 */
export default function WineryMarker({ map, winery, onClick }: WineryMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    injectStyles();

    const wrap = document.createElement('div');
    wrap.className = `winery-marker-wrap winery-marker-${winery.visit_status}`;

    const dot = document.createElement('div');
    dot.className = 'winery-marker-dot';
    wrap.appendChild(dot);

    const tooltip = document.createElement('div');
    tooltip.className = 'winery-marker-tooltip';

    const nameEl = document.createElement('span');
    nameEl.className = 'winery-marker-tooltip-name';
    nameEl.textContent = winery.name;
    tooltip.appendChild(nameEl);

    if (winery.producer_name) {
      const producerEl = document.createElement('span');
      producerEl.className = 'winery-marker-tooltip-producer';
      producerEl.textContent = winery.producer_name;
      tooltip.appendChild(producerEl);
    }

    wrap.appendChild(tooltip);

    wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(winery.id);
    });

    const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
      .setLngLat([winery.lng, winery.lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, winery, onClick]);

  return null;
}
