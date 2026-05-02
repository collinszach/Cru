'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cellarApi } from '@/lib/api';
import FeaturedBottle from '@/components/featured/FeaturedBottle';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function FeaturedPage() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['cellar-featured'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await cellarApi.list(token, { status: 'in_cellar' });
      // Filter to only featured entries
      return result.items.filter((e) => e.is_featured);
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl text-cru-text"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            The Collection
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-1.5 font-ui text-sm text-cru-text-muted"
          >
            Your most significant bottles. The ones with stories.
          </motion.p>
        </div>
      </div>

      {/* Featured list or empty state */}
      {!data || data.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          {/* Decorative empty state */}
          <div className="relative mb-8">
            <span
              className="font-display italic select-none"
              style={{
                fontSize: '6rem',
                color: 'rgba(107,25,41,0.10)',
                letterSpacing: '-0.04em',
              }}
            >
              ★
            </span>
          </div>

          <h2
            className="font-display text-2xl text-cru-text mb-3"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            No featured bottles yet.
          </h2>
          <p
            className="font-ui text-sm text-cru-text-muted leading-relaxed max-w-md"
          >
            Star a bottle in your cellar to begin your highlight reel. Featured bottles
            are the ones with a story — a birth-year vintage, a winery visit, a unicorn
            allocation. The ones you&apos;ll always remember.
          </p>

          <div className="mt-8">
            <a
              href="/cellar"
              className="px-6 py-3 rounded font-ui text-sm border border-cru-border text-cru-text-muted hover:border-cru-accent-garnet/30 hover:text-cru-text transition-colors"
            >
              Go to Cellar →
            </a>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {data.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <FeaturedBottle
                entry={{
                  id: entry.id,
                  wine: {
                    full_name: entry.wine?.full_name ?? 'Unknown Wine',
                    producer: entry.wine?.producer?.name,
                    appellation: entry.wine?.appellation?.name,
                  },
                  vintage: entry.vintage,
                  featured_story: entry.featured_story ?? undefined,
                  featured_occasion: entry.featured_occasion ?? undefined,
                  featured_companions: entry.featured_companions,
                  photos: undefined, // photos would come from a separate query
                }}
                scoringSystem="100pt"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
