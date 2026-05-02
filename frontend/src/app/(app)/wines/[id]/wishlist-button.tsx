'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Check, X } from 'lucide-react';
import { wishlistApi } from '@/lib/api';

interface WishlistButtonProps {
  wineId: string;
  wineName?: string;
}

export default function WishlistButton({ wineId, wineName }: WishlistButtonProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [added, setAdded] = useState(false);
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.add(token, {
        wine_id: wineId,
        priority,
        reason: reason || undefined,
        source: source || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setAdded(true);
      setShowForm(false);
      setTimeout(() => setAdded(false), 3000);
    },
  });

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => {
          if (!added) setShowForm((prev) => !prev);
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-ui border transition-all"
        style={
          added
            ? {
                background: 'rgba(74, 124, 89, 0.12)',
                borderColor: 'rgba(74, 124, 89, 0.3)',
                color: '#4a7c59',
              }
            : showForm
              ? {
                  background: 'var(--cru-surface-raised)',
                  borderColor: 'var(--cru-accent-gold)',
                  color: 'var(--cru-accent-gold)',
                }
              : {
                  background: 'transparent',
                  borderColor: 'var(--cru-border)',
                  color: 'var(--cru-text-muted)',
                }
        }
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            Added to Want List
          </>
        ) : (
          <>
            <BookmarkPlus className="h-4 w-4" />
            Add to Want List
          </>
        )}
      </motion.button>

      {/* Dropdown form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full left-0 mt-2 z-20 rounded p-5 space-y-4"
            style={{
              background: 'var(--cru-surface-raised)',
              border: '1px solid var(--cru-border)',
              width: '300px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Close */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-ui uppercase tracking-widest" style={{ color: 'var(--cru-text-muted)' }}>
                Add to Want List
              </p>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ color: 'var(--cru-text-muted)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {wineName && (
              <p
                className="font-display italic text-sm"
                style={{ color: 'var(--cru-text)', letterSpacing: '-0.01em' }}
              >
                {wineName}
              </p>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-2xs font-ui uppercase tracking-wider" style={{ color: 'var(--cru-text-muted)' }}>
                Priority
              </label>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="text-lg transition-all"
                    style={{
                      color: p <= priority ? 'var(--cru-accent-garnet)' : 'var(--cru-border)',
                      transform: p <= priority ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    ●
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider" style={{ color: 'var(--cru-text-muted)' }}>
                Why do you want it?
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Sommelier recommendation, article…"
                className="w-full px-3 py-2 rounded border text-xs font-ui focus:outline-none transition-colors"
                style={{
                  background: 'var(--cru-surface)',
                  borderColor: 'var(--cru-border)',
                  color: 'var(--cru-text)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(201, 168, 76, 0.4)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--cru-border)'; }}
              />
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-2xs font-ui uppercase tracking-wider" style={{ color: 'var(--cru-text-muted)' }}>
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded border text-xs font-ui focus:outline-none"
                style={{
                  background: 'var(--cru-surface)',
                  borderColor: 'var(--cru-border)',
                  color: source ? 'var(--cru-text)' : 'var(--cru-text-muted)',
                }}
              >
                <option value="">Select source…</option>
                <option value="sommelier_rec">Sommelier Recommendation</option>
                <option value="article">Article / Review</option>
                <option value="friend">Friend</option>
                <option value="winery_visit">Winery Visit</option>
                <option value="allocation">Mailing List / Allocation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <motion.button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded text-xs font-ui tracking-wider disabled:opacity-60"
              style={{
                background: 'var(--cru-accent-garnet)',
                color: '#fff',
                letterSpacing: '0.08em',
              }}
            >
              {mutation.isPending ? 'Adding…' : 'ADD TO WANT LIST'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
