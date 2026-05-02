import { clsx } from 'clsx';
import type { WineColor, WineStyle, DrinkingWindowStatus } from '@/types';

type BadgeVariant =
  | 'default'
  | 'garnet'
  | 'gold'
  | 'straw'
  | 'slate'
  | 'green'
  | 'red'
  | 'muted'
  | WineColor
  | DrinkingWindowStatus;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  mono?: boolean;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-cru-surface-raised text-cru-text border border-cru-border',
  garnet: 'bg-cru-accent-garnet/20 text-red-300 border border-cru-accent-garnet/30',
  gold: 'bg-cru-accent-gold/15 text-cru-accent-gold border border-cru-accent-gold/30',
  straw: 'bg-cru-accent-straw/10 text-cru-accent-straw border border-cru-accent-straw/20',
  slate: 'bg-cru-accent-slate/10 text-cru-accent-slate border border-cru-accent-slate/20',
  green: 'bg-green-900/30 text-green-400 border border-green-800/40',
  red: 'bg-red-900/30 text-red-400 border border-red-800/40',
  muted: 'bg-cru-surface text-cru-text-muted border border-cru-border',
  // Wine colors
  red_wine: 'bg-cru-red/20 text-red-300 border border-cru-red/30',
  white: 'bg-cru-accent-straw/10 text-cru-accent-straw border border-cru-accent-straw/20',
  rose: 'bg-pink-900/20 text-pink-300 border border-pink-800/30',
  orange: 'bg-orange-900/20 text-orange-300 border border-orange-800/30',
  amber: 'bg-amber-900/20 text-amber-400 border border-amber-800/30',
  // Drinking window statuses
  not_ready: 'bg-cru-accent-slate/10 text-cru-accent-slate border border-cru-accent-slate/20',
  approaching: 'bg-cru-accent-gold/15 text-cru-accent-gold border border-cru-accent-gold/30',
  in_window: 'bg-green-900/30 text-green-400 border border-green-800/40',
  peak: 'bg-cru-accent-garnet/20 text-red-300 border border-cru-accent-garnet/30',
  past_peak: 'bg-cru-surface text-cru-text-muted border border-cru-border',
  declining: 'bg-red-900/30 text-red-500 border border-red-900/40',
};

const WINE_COLOR_DOT: Record<WineColor, string> = {
  red: 'bg-cru-red',
  white: 'bg-cru-accent-straw',
  rose: 'bg-wine-rose',
  orange: 'bg-wine-orange',
  amber: 'bg-amber-500',
};

export default function Badge({
  children,
  variant = 'default',
  className,
  mono = false,
  dot = false,
}: BadgeProps) {
  // Map wine color red to red_wine key
  const variantKey = variant === 'red' ? 'red_wine' : variant;
  const variantClass =
    VARIANT_CLASSES[variantKey] ?? VARIANT_CLASSES.default;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs font-ui font-medium',
        variantClass,
        mono && 'font-mono',
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            WINE_COLOR_DOT[variant as WineColor] ?? 'bg-current',
          )}
        />
      )}
      {children}
    </span>
  );
}

export function WineStyleBadge({ style, color }: { style?: WineStyle; color?: WineColor }) {
  const label = color
    ? color.charAt(0).toUpperCase() + color.slice(1)
    : style
    ? style.charAt(0).toUpperCase() + style.slice(1)
    : 'Unknown';

  const variant =
    color === 'red'
      ? 'garnet'
      : color === 'white'
      ? 'straw'
      : color === 'rose'
      ? 'default'
      : color === 'orange'
      ? 'default'
      : 'default';

  return (
    <Badge variant={variant} dot={!!color}>
      {label}
    </Badge>
  );
}
