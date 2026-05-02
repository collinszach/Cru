import { clsx } from 'clsx';
import { Wine } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon = Wine, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center px-8 py-24', className)}>
      <div className="mb-6 p-5 rounded-full bg-cru-surface border border-cru-border shadow-sm">
        <Icon className="h-8 w-8 text-cru-text-subtle" strokeWidth={1.25} />
      </div>
      <h3 className="font-display text-2xl text-cru-text mb-2" style={{ fontWeight: 500 }}>{title}</h3>
      {description && (
        <p className="font-ui text-sm text-cru-text-muted max-w-sm leading-relaxed mb-8">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
