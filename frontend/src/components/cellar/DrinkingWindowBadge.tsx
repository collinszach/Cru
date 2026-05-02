import { clsx } from 'clsx';
import type { DrinkingWindowStatus } from '@/types';

const STATUS_CONFIG: Record<DrinkingWindowStatus, { label: string; color: string; bg: string; border: string }> = {
  not_ready:   { label: 'Not Ready',   color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  approaching: { label: 'Approaching', color: '#A08030', bg: '#FEFCE8', border: '#FDE68A' },
  in_window:   { label: 'Drink Now',   color: '#2D6B45', bg: '#F0FDF4', border: '#BBF7D0' },
  peak:        { label: 'At Peak',     color: '#6B1929', bg: '#FFF1F2', border: '#FECDD3' },
  past_peak:   { label: 'Past Peak',   color: '#7A6A5A', bg: '#F5F0EB', border: '#D6C9BE' },
  declining:   { label: 'Declining',   color: '#8B4040', bg: '#FEF2F2', border: '#FECACA' },
};

interface DrinkingWindowBadgeProps {
  status: DrinkingWindowStatus;
  compact?: boolean;
}

export default function DrinkingWindowBadge({ status, compact = false }: DrinkingWindowBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center font-ui font-medium rounded',
        compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      )}
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}
