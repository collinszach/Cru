'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';

interface MemoryEntryProps {
  cellarEntryId: string;
  currentStory?: string;
  currentOccasion?: string;
  currentCompanions?: string[];
  onSave: (story: string, occasion: string, companions: string[]) => Promise<void>;
}

const OCCASION_OPTIONS = [
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'first_discovery', label: 'First Discovery' },
  { value: 'gift', label: 'Gift' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'winery_visit', label: 'Winery Visit' },
  { value: 'other', label: 'Other' },
];

export default function MemoryEntry({
  cellarEntryId: _cellarEntryId,
  currentStory = '',
  currentOccasion = '',
  currentCompanions = [],
  onSave,
}: MemoryEntryProps) {
  const [story, setStory] = useState(currentStory);
  const [occasion, setOccasion] = useState(currentOccasion);
  const [companions, setCompanions] = useState<string[]>(currentCompanions);
  const [companionInput, setCompanionInput] = useState('');
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addCompanion() {
    const name = companionInput.trim();
    if (name && !companions.includes(name)) {
      setCompanions((prev) => [...prev, name]);
    }
    setCompanionInput('');
  }

  function removeCompanion(name: string) {
    setCompanions((prev) => prev.filter((c) => c !== name));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(story, occasion, companions);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded space-y-8 p-8"
      style={{
        background: 'var(--cru-surface)',
        border: '1px solid var(--cru-border)',
      }}
    >
      {/* Header */}
      <div className="space-y-1">
        <h2
          className="font-display italic"
          style={{ fontSize: '1.9rem', color: 'var(--cru-text)', letterSpacing: '-0.02em' }}
        >
          What&apos;s the story behind this bottle?
        </h2>
        <p className="font-body text-sm" style={{ color: 'var(--cru-text-muted)' }}>
          Every great bottle has a memory attached to it.
        </p>
      </div>

      {/* Occasion pill selector */}
      <div className="space-y-3">
        <label
          className="text-xs font-ui uppercase tracking-widest"
          style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
        >
          Occasion
        </label>
        <div className="flex flex-wrap gap-2">
          {OCCASION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOccasion(opt.value === occasion ? '' : opt.value)}
              className="px-4 py-2 rounded-full text-sm font-ui transition-all duration-200 border"
              style={
                occasion === opt.value
                  ? {
                      background: 'rgba(201, 168, 76, 0.12)',
                      borderColor: 'rgba(201, 168, 76, 0.5)',
                      color: 'var(--cru-accent-gold)',
                    }
                  : {
                      background: 'transparent',
                      borderColor: 'var(--cru-border)',
                      color: 'var(--cru-text-muted)',
                    }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Story textarea */}
      <div className="space-y-2">
        <label
          className="text-xs font-ui uppercase tracking-widest"
          style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
        >
          The Story
        </label>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={6}
          placeholder="The night we opened this in Beaune, the fog had rolled in from the vineyards…"
          className="w-full px-4 py-4 rounded border focus:outline-none resize-none transition-colors duration-200"
          style={{
            background: 'var(--cru-surface-raised)',
            borderColor: 'var(--cru-border)',
            color: 'var(--cru-text)',
            fontFamily: 'Libre Baskerville, Georgia, serif',
            fontSize: '0.92rem',
            lineHeight: 1.8,
            // Focus border via pseudo-class not possible inline; handle with focus class
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(201, 168, 76, 0.4)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--cru-border)';
          }}
        />
      </div>

      {/* Companions */}
      <div className="space-y-3">
        <label
          className="text-xs font-ui uppercase tracking-widest"
          style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.14em' }}
        >
          Who was there?
        </label>

        {/* Tag input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={companionInput}
            onChange={(e) => setCompanionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addCompanion();
              }
            }}
            placeholder="Add a name, press Enter"
            className="flex-1 px-3 py-2.5 rounded border text-sm font-ui focus:outline-none transition-colors"
            style={{
              background: 'var(--cru-surface-raised)',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(201, 168, 76, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cru-border)';
              addCompanion();
            }}
          />
          <button
            type="button"
            onClick={addCompanion}
            className="px-4 py-2.5 rounded text-sm font-ui border transition-colors"
            style={{
              background: 'transparent',
              borderColor: 'var(--cru-border)',
              color: 'var(--cru-text-muted)',
            }}
          >
            Add
          </button>
        </div>

        {/* Companion chips */}
        <AnimatePresence>
          {companions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2"
            >
              {companions.map((name) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-ui"
                  style={{
                    background: 'rgba(201, 168, 76, 0.08)',
                    border: '1px solid rgba(201, 168, 76, 0.2)',
                    color: 'var(--cru-text)',
                  }}
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeCompanion(name)}
                    className="transition-colors"
                    style={{ color: 'var(--cru-text-muted)' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Star toggle */}
      <div className="flex items-center gap-4 pt-2 border-t border-cru-border">
        <button
          type="button"
          onClick={() => setStarred((prev) => !prev)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded border transition-all duration-200"
          style={
            starred
              ? {
                  background: 'rgba(201, 168, 76, 0.1)',
                  borderColor: 'rgba(201, 168, 76, 0.4)',
                  color: 'var(--cru-accent-gold)',
                }
              : {
                  background: 'transparent',
                  borderColor: 'var(--cru-border)',
                  color: 'var(--cru-text-muted)',
                }
          }
        >
          <Star
            className="h-4 w-4 transition-all"
            style={starred ? { fill: 'var(--cru-accent-gold)' } : {}}
          />
          <span className="text-sm font-ui">Star This Bottle</span>
        </button>
        <p className="text-xs font-body italic" style={{ color: 'var(--cru-text-muted)' }}>
          {starred ? 'Added to your highlight reel.' : 'Feature in The Collection.'}
        </p>
      </div>

      {/* Save button */}
      <motion.button
        type="button"
        onClick={handleSave}
        disabled={saving}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-8 py-3 rounded font-ui text-sm tracking-wider transition-all disabled:opacity-60"
        style={
          saved
            ? {
                background: 'rgba(74, 124, 89, 0.2)',
                border: '1px solid rgba(74, 124, 89, 0.4)',
                color: '#4a7c59',
                letterSpacing: '0.06em',
              }
            : {
                background: 'var(--cru-accent-garnet)',
                color: '#fff',
                letterSpacing: '0.06em',
              }
        }
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Memory'}
      </motion.button>
    </div>
  );
}
