'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, PlusCircle } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { winesApi } from '@/lib/api';
import type { WineAutocompleteResult, WineStyle } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface WineSearchAutocompleteProps {
  onSelect: (wine: WineAutocompleteResult) => void;
  onAddNew: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// ─── Style dot ────────────────────────────────────────────────────────────────

const STYLE_COLOR: Partial<Record<WineStyle, string>> = {
  red: 'var(--cru-red)',
  white: 'var(--cru-white)',
  rose: 'var(--cru-rose)',
  orange: 'var(--cru-orange)',
  sparkling: 'var(--cru-sparkling)',
  champagne: 'var(--cru-sparkling)',
  port: 'var(--cru-fortified)',
  sherry: 'var(--cru-fortified)',
};

function StyleDot({ style }: { style?: string | null }) {
  const color = (style && STYLE_COLOR[style as WineStyle]) ?? 'var(--cru-accent-slate)';
  return (
    <div
      className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
      style={{ backgroundColor: color }}
    />
  );
}

// ─── WineSearchAutocomplete ───────────────────────────────────────────────────

export default function WineSearchAutocomplete({
  onSelect,
  onAddNew,
  placeholder = 'Search wines…',
  autoFocus = false,
}: WineSearchAutocompleteProps) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WineAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await winesApi.autocomplete(token, query.trim());
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, getToken]);

  const handleSelect = useCallback(
    (wine: WineAutocompleteResult) => {
      setQuery(wine.full_name);
      setOpen(false);
      setResults([]);
      onSelect(wine);
    },
    [onSelect],
  );

  const handleAddNew = useCallback(() => {
    const q = query.trim();
    setOpen(false);
    setResults([]);
    onAddNew(q);
  }, [query, onAddNew]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = results.length + 1; // +1 for "add new"
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      } else if (activeIndex === results.length) {
        handleAddNew();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      {/* Input */}
      <div
        className="flex items-center gap-2.5 px-3 rounded"
        style={{
          border: '1px solid var(--cru-border)',
          backgroundColor: 'var(--cru-surface)',
          height: 38,
        }}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 text-cru-text-muted animate-spin flex-shrink-0" />
        ) : (
          <Search className="h-3.5 w-3.5 text-cru-text-muted flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onBlur={() => {
            // Small delay so clicks in dropdown register
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm font-ui text-cru-text placeholder:text-cru-text-muted outline-none"
        />
      </div>

      {/* Dropdown */}
      {open && (results.length > 0 || query.trim().length >= 2) && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded overflow-hidden z-50"
          style={{
            border: '1px solid var(--cru-border)',
            backgroundColor: 'var(--cru-surface-raised)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            maxHeight: 340,
            overflowY: 'auto',
          }}
        >
          <ul ref={listRef} role="listbox">
            {results.map((wine, idx) => (
              <li
                key={wine.id}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={() => handleSelect(wine)}
                onMouseEnter={() => setActiveIndex(idx)}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  backgroundColor: idx === activeIndex ? 'var(--cru-surface)' : 'transparent',
                  borderBottom: '1px solid var(--cru-border)',
                }}
              >
                <StyleDot style={wine.style} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display italic text-cru-text leading-snug truncate">
                    {wine.full_name}
                  </p>
                  {(wine.producer_name || wine.appellation_name) && (
                    <p className="text-xs font-ui text-cru-text-muted mt-0.5 truncate">
                      {[wine.producer_name, wine.appellation_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </li>
            ))}

            {/* Add new option */}
            {query.trim().length >= 2 && (
              <li
                role="option"
                aria-selected={activeIndex === results.length}
                onMouseDown={handleAddNew}
                onMouseEnter={() => setActiveIndex(results.length)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  backgroundColor: activeIndex === results.length ? 'var(--cru-surface)' : 'transparent',
                  color: 'var(--cru-accent-gold)',
                }}
              >
                <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-ui">
                  Can&apos;t find it? Add &ldquo;{query.trim()}&rdquo; as a new wine &rarr;
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
