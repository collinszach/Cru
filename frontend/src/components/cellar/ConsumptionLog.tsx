'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ConsumptionLogProps {
  cellarEntryId: string;
  wineName: string;
  vintage: number;
  currentQuantity: number;
  onConsume: (occasion?: string, notes?: string) => Promise<void>;
  onCancel: () => void;
}

export default function ConsumptionLog({
  wineName,
  vintage,
  currentQuantity,
  onConsume,
  onCancel,
}: ConsumptionLogProps) {
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [didPop, setDidPop] = useState(false);
  const [step, setStep] = useState<'idle' | 'confirm'>('idle');

  const isLastBottle = currentQuantity <= 1;

  const handleOpenBottle = useCallback(() => {
    setDidPop(true);
    setTimeout(() => setDidPop(false), 600);
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsPending(true);
    try {
      await onConsume(occasion || undefined, notes || undefined);
    } finally {
      setIsPending(false);
    }
  }, [onConsume, occasion, notes]);

  return (
    <div
      className="rounded border overflow-hidden"
      style={{
        backgroundColor: 'var(--cru-surface)',
        borderColor: 'var(--cru-border)',
        maxWidth: '440px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--cru-border)' }}
      >
        <div>
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">Open a Bottle</p>
          <p className="text-sm font-display italic text-cru-text mt-0.5">
            {wineName}{' '}
            <span className="font-mono not-italic" style={{ color: 'var(--cru-accent-garnet)' }}>
              {vintage}
            </span>
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--cru-text-muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--cru-text)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--cru-text-muted)')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Quantity display */}
        <div className="text-center space-y-2">
          <p className="text-2xs font-ui text-cru-text-muted uppercase tracking-widest">
            Bottles Remaining
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={step === 'confirm' ? 'after' : 'before'}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <span
                className="font-mono block leading-none"
                style={{
                  fontSize: '5rem',
                  color: step === 'confirm'
                    ? (currentQuantity - 1 === 0 ? 'var(--cru-accent-garnet)' : 'var(--cru-accent-gold)')
                    : 'var(--cru-text)',
                  letterSpacing: '-0.05em',
                }}
              >
                {step === 'confirm' ? currentQuantity - 1 : currentQuantity}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Last bottle warning */}
          <AnimatePresence>
            {isLastBottle && step === 'idle' && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-body italic"
                style={{ color: 'var(--cru-accent-gold)' }}
              >
                This is your last bottle.
              </motion.p>
            )}
            {step === 'confirm' && currentQuantity - 1 === 0 && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-body italic"
                style={{ color: 'var(--cru-accent-garnet)' }}
              >
                The last bottle has been opened.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Open button or form */}
        <AnimatePresence mode="wait">
          {step === 'idle' ? (
            <motion.div
              key="open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                onClick={handleOpenBottle}
                animate={didPop ? { rotate: [-3, 3, -2, 0], scale: [1, 1.04, 0.98, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="w-full py-3.5 rounded font-ui font-medium text-sm transition-all duration-200"
                style={{
                  backgroundColor: 'var(--cru-accent-garnet)',
                  color: 'var(--cru-text)',
                  border: '1px solid rgba(139,26,46,0.6)',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(139,26,46,0.85)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(139,26,46,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cru-accent-garnet)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                Open a Bottle
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Gold rule */}
              <div
                className="h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent, var(--cru-accent-gold), transparent)',
                  opacity: 0.3,
                }}
              />

              {/* Occasion */}
              <div className="space-y-1.5">
                <label className="block text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
                  Occasion <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Anniversary dinner, blind tasting, Tuesday..."
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{
                    backgroundColor: 'var(--cru-surface-raised)',
                    border: '1px solid var(--cru-border)',
                    color: 'var(--cru-text)',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--cru-accent-gold)')}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--cru-border)')}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-2xs font-ui uppercase tracking-widest text-cru-text-muted">
                  Notes <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Decanted 2h, paired with..."
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{
                    backgroundColor: 'var(--cru-surface-raised)',
                    border: '1px solid var(--cru-border)',
                    color: 'var(--cru-text)',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--cru-accent-gold)')}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--cru-border)')}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="primary"
                  loading={isPending}
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep('idle')}
                  disabled={isPending}
                >
                  Back
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
