import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BlindTasting = dynamic(() => import('@/components/discover/BlindTasting'), { ssr: false });

// Full-page immersive layout — no padding from the parent shell, just the component
// Exit button top-left, everything else surrendered to the blind tasting experience

export default function BlindTastingPage() {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--cru-bg)', marginLeft: '240px' }}
    >
      {/* Exit button — always visible, top-left */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/discover"
          className="group flex items-center gap-2 text-xs font-ui uppercase tracking-wider transition-colors"
          style={{ color: 'var(--cru-text-muted)', letterSpacing: '0.1em' }}
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            style={{ color: 'var(--cru-text-muted)' }}
          />
          Exit
        </Link>
      </div>

      {/* Subtle grain texture overlay for atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }}
      />

      <div className="relative px-6 py-6 max-w-5xl mx-auto">
        <BlindTasting scoringSystem="100pt" />
      </div>
    </div>
  );
}
