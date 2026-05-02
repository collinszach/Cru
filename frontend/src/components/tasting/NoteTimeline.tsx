'use client';

import { useMemo } from 'react';
import type { TastingNote, ScoringSystem } from '@/types';

interface NoteTimelineProps {
  notes: TastingNote[];
  scoringSystem: ScoringSystem;
  onNoteClick: (noteId: string) => void;
  sortBy?: 'date' | 'score' | 'wine';
}

// ─── Individual note row ──────────────────────────────────────────────────────

function NoteRow({
  note,
  onClick,
}: {
  note: TastingNote;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex gap-6 py-5 border-b border-cru-border cursor-pointer hover:bg-cru-surface-raised transition-colors px-4 -mx-4 rounded"
    >
      {/* Date column */}
      <div className="flex-shrink-0 w-20 text-right pt-0.5">
        <p className="font-mono text-xs text-cru-text-subtle">
          {new Date(note.tasted_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <p className="font-mono text-[10px] text-cru-text-subtle opacity-60">
          {new Date(note.tasted_at).getFullYear()}
        </p>
      </div>

      {/* Vertical line */}
      <div className="flex-shrink-0 w-px bg-cru-border self-stretch" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {note.wine?.producer?.name && (
              <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle mb-0.5">
                {note.wine.producer.name}
              </p>
            )}
            <h3
              className="font-display italic text-lg text-cru-text leading-snug"
              style={{ fontWeight: 400 }}
            >
              {note.wine_name ?? note.wine?.name ?? note.wine?.full_name ?? 'Unknown Wine'}
            </h3>
            <p className="font-ui text-xs text-cru-text-muted mt-0.5">
              {note.vintage}
              {note.wine?.appellation?.name
                ? ` · ${note.wine.appellation.name}`
                : ''}
            </p>
          </div>
          {note.personal_score != null && (
            <div className="flex-shrink-0 text-right">
              <span
                className="font-mono text-2xl text-cru-accent-garnet leading-none"
                style={{ fontWeight: 500 }}
              >
                {note.personal_score}
              </span>
            </div>
          )}
        </div>

        {note.free_note && (
          <p className="mt-2 font-ui text-sm text-cru-text-muted line-clamp-2 leading-relaxed">
            {note.free_note}
          </p>
        )}

        {note.quality && (
          <p className="mt-1.5 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">
            {note.quality.replace(/_/g, ' ')}
            {note.readiness ? ` · ${note.readiness.replace(/_/g, ' ')}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Decade divider ───────────────────────────────────────────────────────────

function DecadeDivider({ decade }: { decade: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <h3 className="font-display italic text-xl text-cru-text-muted">{decade}</h3>
      <div className="flex-1 h-px bg-cru-border" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoteTimeline({
  notes,
  scoringSystem: _scoringSystem,
  onNoteClick,
  sortBy = 'date',
}: NoteTimelineProps) {
  const sorted = useMemo(() => {
    const copy = [...notes];
    if (sortBy === 'date') {
      return copy.sort(
        (a, b) => new Date(b.tasted_at).getTime() - new Date(a.tasted_at).getTime(),
      );
    }
    if (sortBy === 'score') {
      return copy.sort((a, b) => (b.personal_score ?? 0) - (a.personal_score ?? 0));
    }
    if (sortBy === 'wine') {
      return copy.sort((a, b) => (a.wine?.name ?? '').localeCompare(b.wine?.name ?? ''));
    }
    return copy;
  }, [notes, sortBy]);

  // Check if timeline spans > 10 years — use decade grouping for date sort
  const useDecadeGrouping = useMemo(() => {
    if (sortBy !== 'date' || notes.length < 2) return false;
    const years = notes.map((n) => new Date(n.tasted_at).getFullYear());
    return Math.max(...years) - Math.min(...years) > 10;
  }, [notes, sortBy]);

  if (!useDecadeGrouping) {
    return (
      <div>
        {sorted.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            onClick={() => onNoteClick(note.id)}
          />
        ))}
      </div>
    );
  }

  // Group by decade
  const byDecade: Map<string, TastingNote[]> = new Map();
  for (const note of sorted) {
    const year = new Date(note.tasted_at).getFullYear();
    const decade = `${Math.floor(year / 10) * 10}s`;
    const bucket = byDecade.get(decade) ?? [];
    bucket.push(note);
    byDecade.set(decade, bucket);
  }

  return (
    <div>
      {Array.from(byDecade.entries()).map(([decade, decadeNotes]) => (
        <div key={decade}>
          <DecadeDivider decade={decade} />
          {decadeNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onClick={() => onNoteClick(note.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
