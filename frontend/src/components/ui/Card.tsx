import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  onClick?: () => void;
  as?: React.ElementType;
}

export default function Card({ children, className, raised = false, onClick, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'border border-cru-border rounded shadow-sm',
        raised ? 'bg-cru-surface-raised' : 'bg-cru-surface',
        onClick && 'cursor-pointer transition-all hover:border-cru-accent-garnet/30 hover:shadow',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('px-5 py-4 border-b border-cru-border', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('px-5 py-3 border-t border-cru-border bg-cru-surface-raised/50', className)}>
      {children}
    </div>
  );
}
