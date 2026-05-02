'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  PlusCircle,
  MapPin,
  Clock,
  Thermometer,
  Users,
} from 'lucide-react';
import { notesApi } from '@/lib/api';
import { getScoreLabel, TIER_COLORS } from '@/lib/tastingVocabulary';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { ScoringSystem } from '@/types';

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, system }: { score: number; system: ScoringSystem }) {
  const label = getScoreLabel(score, system);

  return (
    <div className="text-center">
      <div
        className="font-mono leading-none"
        style={{
          fontSize: '5rem',
          letterSpacing: '-0.05em',
          color: 'var(--cru-text)',
        }}
      >
        {system === '5star'
          ? `${'★'.repeat(Math.floor(score))}${score % 1 >= 0.5 ? '½' : ''}`
          : system === '20pt'
          ? score.toFixed(1)
          : Math.round(score)}
      </div>
      <p className="mt-1 text-sm font-ui" style={{ color: 'var(--cru-accent-gold)' }}>
        {label}
      </p>
    </div>
  );
}

// ─── Section display ──────────────────────────────────────────────────────────

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3
        className="text-sm italic border-b pb-2"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: 'var(--cru-text-muted)',
          borderColor: 'var(--cru-border)',
          fontSize: '1.1rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-ui text-cru-text-muted uppercase tracking-wide w-28 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-body text-cru-text capitalize">
        {value.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

// ─── Descriptor chips display ─────────────────────────────────────────────────

function DescriptorDisplay({
  descriptors,
}: {
  descriptors: Array<{ tier: string; descriptor: string; intensity?: string }>
}) {
  if (!descriptors.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {descriptors.map((d, i) => {
        const color = TIER_COLORS[d.tier as keyof typeof TIER_COLORS] ?? '#8b7d74';
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-ui text-cru-text"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {d.descriptor}
            {d.intensity && (
              <span className="text-2xs" style={{ color: color }}>
                {d.intensity}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Amendment modal ──────────────────────────────────────────────────────────

function AmendmentModal({
  noteId,
  onClose,
}: {
  noteId: string
  onClose: () => void
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const amend = useMutation({
    mutationFn: async (amendText: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return notesApi.amend(token, noteId, amendText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(13, 11, 9, 0.8)' }}>
      <div
        className="w-full max-w-lg rounded-xl p-6 space-y-4 shadow-warm-lg"
        style={{ background: 'var(--cru-surface)', border: '1px solid var(--cru-border)' }}
      >
        <h3
          className="text-xl italic"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Add Amendment
        </h3>
        <p className="text-xs font-ui text-cru-text-muted">
          Amendments are appended to the note with a timestamp. The original note is preserved.
        </p>
        <textarea
          autoFocus
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="After another year, this wine has..."
          className="w-full px-4 py-3 text-sm bg-cru-bg border border-cru-border rounded focus:border-cru-accent-gold focus:outline-none text-cru-text placeholder:text-cru-text-muted/60 leading-relaxed resize-none"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => text.trim() && amend.mutate(text.trim())}
            disabled={!text.trim() || amend.isPending}
            className="flex-1 py-2.5 rounded text-sm font-ui font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--cru-accent-garnet)' }}
          >
            {amend.isPending ? 'Saving...' : 'Save Amendment'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded text-sm font-ui text-cru-text-muted border border-cru-border hover:text-cru-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [showAmendModal, setShowAmendModal] = useState(false);

  const scoringSystem: ScoringSystem =
    (user?.publicMetadata?.scoring_system as ScoringSystem) ?? '100pt';

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return notesApi.get(token, id);
    },
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!note) {
    return (
      <div className="max-w-2xl pt-16 text-center">
        <p className="text-cru-text-muted font-body">Note not found.</p>
        <Link href="/journal" className="mt-4 inline-block text-sm font-ui text-cru-accent-gold hover:text-cru-text">
          Back to Journal
        </Link>
      </div>
    );
  }

  const tastedAt = new Date(note.tasted_at);
  const createdAt = new Date(note.created_at);
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const canEdit = hoursSinceCreation < 24;

  return (
    <div className="max-w-2xl space-y-10 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-ui text-cru-text-muted hover:text-cru-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Journal
        </button>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`/journal/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-ui text-cru-text-muted border border-cru-border hover:text-cru-text hover:border-cru-text-muted transition-all"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowAmendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-ui text-cru-text-muted border border-cru-border hover:text-cru-text hover:border-cru-text-muted transition-all"
          >
            <PlusCircle className="h-3 w-3" />
            Add Amendment
          </button>
        </div>
      </div>

      {/* Hero: vintage + wine */}
      <div className="space-y-2">
        {note.wine?.producer && (
          <p className="text-xs font-ui text-cru-text-muted uppercase tracking-widest">
            {note.wine.producer.name}
          </p>
        )}
        <div className="flex items-baseline gap-5">
          <span
            className="font-mono leading-none flex-shrink-0"
            style={{
              fontSize: '4.5rem',
              color: 'var(--cru-accent-garnet)',
              letterSpacing: '-0.05em',
            }}
          >
            {note.vintage}
          </span>
          <h1
            className="text-3xl italic leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {note.wine_name ?? note.wine?.name ?? 'Unknown Wine'}
          </h1>
        </div>
        {note.wine?.appellation && (
          <p className="text-sm font-ui text-cru-text-muted">
            {note.wine.appellation.name}
            {note.wine.appellation.country && ` · ${note.wine.appellation.country}`}
          </p>
        )}
      </div>

      {/* Score + date */}
      <div className="flex items-center justify-between py-6 border-y border-cru-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
            <Clock className="h-3.5 w-3.5" />
            {tastedAt.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          {note.location && (
            <div className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {note.location}
            </div>
          )}
          {note.serve_temp_c && (
            <div className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
              <Thermometer className="h-3.5 w-3.5" />
              {note.serve_temp_c}°C
            </div>
          )}
          {note.companions && note.companions.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-ui text-cru-text-muted">
              <Users className="h-3.5 w-3.5" />
              {note.companions.join(', ')}
            </div>
          )}
          {note.occasion && (
            <p className="text-xs font-ui text-cru-text-muted italic">{note.occasion}</p>
          )}
        </div>

        {note.personal_score != null && (
          <ScoreBadge score={note.personal_score} system={scoringSystem} />
        )}
      </div>

      {/* Blind tasting badge */}
      {note.is_blind && (
        <div
          className="px-4 py-3 rounded-lg text-sm font-ui"
          style={{
            background: 'rgba(201, 168, 76, 0.08)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            color: 'var(--cru-accent-gold)',
          }}
        >
          Blind tasting
          {note.blind_prediction && (
            <span className="text-cru-text-muted ml-2">
              · Predicted: {note.blind_prediction.probable_grapes[0]?.grape ?? 'Unknown'} from{' '}
              {note.blind_prediction.probable_regions[0]?.region ?? 'Unknown'}
            </span>
          )}
        </div>
      )}

      {/* Appearance */}
      {(note.app_clarity || note.app_intensity || note.app_color) && (
        <SectionBlock title="I. Appearance">
          <div className="space-y-2">
            <DataRow label="Clarity" value={note.app_clarity} />
            <DataRow label="Intensity" value={note.app_intensity} />
            <DataRow label="Colour" value={note.app_color} />
            {note.app_other && (
              <DataRow label="Other" value={note.app_other} />
            )}
          </div>
        </SectionBlock>
      )}

      {/* Nose */}
      {(note.nose_descriptors.length > 0 || note.nose_intensity) && (
        <SectionBlock title="II. Nose">
          <div className="space-y-4">
            {note.nose_condition === 'faulty' && (
              <div
                className="px-3 py-2 rounded text-xs font-ui text-red-400"
                style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
              >
                Faulty: {note.nose_fault ?? 'unspecified fault'}
              </div>
            )}
            <div className="space-y-2">
              <DataRow label="Intensity" value={note.nose_intensity} />
              <DataRow label="Development" value={note.nose_development} />
            </div>
            {note.nose_descriptors.length > 0 && (
              <DescriptorDisplay descriptors={note.nose_descriptors} />
            )}
          </div>
        </SectionBlock>
      )}

      {/* Palate */}
      {(note.palate_acidity || note.palate_body || note.palate_descriptors.length > 0) && (
        <SectionBlock title="III. Palate">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <DataRow label="Sweetness" value={note.palate_sweetness?.replace(/_/g, '-')} />
              <DataRow label="Acidity" value={note.palate_acidity} />
              {!['sparkling', 'champagne', 'cremant', 'prosecco'].includes(note.wine?.style ?? '') ? (
                <>
                  <DataRow label="Tannin" value={note.palate_tannin} />
                  <DataRow label="Tannin nature" value={note.palate_tannin_nature} />
                </>
              ) : (
                <DataRow label="Mousse" value={note.palate_mousse} />
              )}
              <DataRow label="Body" value={note.palate_body} />
              <DataRow label="Alcohol" value={note.palate_alcohol} />
              <DataRow label="Intensity" value={note.palate_intensity} />
              <DataRow
                label="Finish"
                value={
                  note.palate_finish
                    ? note.palate_finish_sec
                      ? `${note.palate_finish.replace('_', ' ')} (${note.palate_finish_sec}s)`
                      : note.palate_finish.replace('_', ' ')
                    : null
                }
              />
            </div>
            {note.palate_descriptors.length > 0 && (
              <DescriptorDisplay descriptors={note.palate_descriptors} />
            )}
          </div>
        </SectionBlock>
      )}

      {/* Conclusions */}
      {(note.quality || note.readiness || note.drink_from || note.drink_by) && (
        <SectionBlock title="IV. Conclusions">
          <div className="space-y-2">
            <DataRow label="Quality" value={note.quality?.replace('_', ' ')} />
            <DataRow label="Readiness" value={note.readiness?.replace(/_/g, ' ')} />
            {(note.drink_from || note.drink_by) && (
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-ui text-cru-text-muted uppercase tracking-wide w-28">
                  Drink window
                </span>
                <span className="font-mono text-sm text-cru-text">
                  {note.drink_from ?? '?'} – {note.drink_by ?? '?'}
                </span>
              </div>
            )}
            {note.pairing_notes && (
              <DataRow label="Pairing" value={note.pairing_notes} />
            )}
          </div>
        </SectionBlock>
      )}

      {/* Score breakdown (critics) */}
      {(note.parker_score || note.spectator_score || note.jancis_score || note.decanter_score || note.suckling_score) && (
        <SectionBlock title="V. Scores">
          <div className="space-y-2">
            {note.parker_score && <DataRow label="Parker" value={`${note.parker_score}/100`} />}
            {note.spectator_score && <DataRow label="Spectator" value={`${note.spectator_score}/100`} />}
            {note.jancis_score && <DataRow label="Jancis" value={`${note.jancis_score}/20`} />}
            {note.decanter_score && <DataRow label="Decanter" value={`${note.decanter_score}/100`} />}
            {note.suckling_score && <DataRow label="Suckling" value={`${note.suckling_score}/100`} />}
          </div>
        </SectionBlock>
      )}

      {/* Free note */}
      {note.free_note && (
        <SectionBlock title="VI. Notes">
          <div
            className="prose max-w-none"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            <p
              className="text-base leading-loose text-cru-text"
              style={{ lineHeight: '1.9', letterSpacing: '0.01em' }}
            >
              {note.free_note}
            </p>
          </div>
        </SectionBlock>
      )}

      {/* AI enhanced note */}
      {note.ai_enhanced_note && (
        <div
          className="p-5 rounded-lg space-y-3"
          style={{
            background: 'rgba(201, 168, 76, 0.04)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
          }}
        >
          <p className="text-2xs font-ui uppercase tracking-widest text-cru-accent-gold">
            AI Enhanced Note
          </p>
          <p
            className="text-sm text-cru-text leading-relaxed"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", lineHeight: '1.85' }}
          >
            {note.ai_enhanced_note}
          </p>
        </div>
      )}

      {/* Amendments */}
      {note.amendments && note.amendments.length > 0 && (
        <SectionBlock title="Amendments">
          <div className="space-y-4">
            {note.amendments.map((amendment, i) => (
              <div
                key={i}
                className="pl-4 space-y-2"
                style={{ borderLeft: '2px solid var(--cru-border)' }}
              >
                <p className="text-2xs font-mono text-cru-text-muted">
                  {new Date(amendment.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p
                  className="text-sm text-cru-text leading-relaxed"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  {amendment.text}
                </p>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Footer metadata */}
      <div
        className="pt-6 pb-2 border-t border-cru-border"
        style={{ borderColor: 'var(--cru-border)' }}
      >
        <p className="text-2xs font-ui text-cru-text-muted">
          Note recorded {createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {canEdit && ' · Editable for another ' + Math.round(24 - hoursSinceCreation) + 'h'}
        </p>
      </div>

      {/* Amendment modal */}
      {showAmendModal && (
        <AmendmentModal noteId={id} onClose={() => setShowAmendModal(false)} />
      )}
    </div>
  );
}
