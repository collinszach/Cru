'use client';

import type { CellarEntry } from '@/types';
import BottleCard from './BottleCard';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-6 px-5 py-4 border-b border-cru-border">
      <div className="w-1 self-stretch rounded-full bg-cru-border" style={{ minHeight: '40px' }} />
      <div className="w-16 skeleton h-6 rounded" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="w-20 skeleton h-4 rounded hidden md:block" />
      <div className="w-28 skeleton h-5 rounded" />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-6 px-5 py-2.5 bg-cru-surface-raised border-b border-cru-border-strong">
      <div className="w-1 flex-shrink-0" />
      <div className="w-16 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Vintage</div>
      <div className="flex-1 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Wine</div>
      <div className="w-20 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right hidden md:block">Paid</div>
      <div className="w-28 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Readiness</div>
    </div>
  );
}

export default function CellarGrid({ entries, loading = false }: { entries: CellarEntry[]; loading?: boolean }) {
  return (
    <div className="bg-cru-surface border border-cru-border rounded overflow-hidden shadow-sm">
      <Header />
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        : entries.map((entry) => <BottleCard key={entry.id} entry={entry} />)
      }
    </div>
  );
}
