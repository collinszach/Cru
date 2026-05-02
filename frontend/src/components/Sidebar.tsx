'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import {
  Wine, BookOpen, Search, Compass, Map, Building2,
  BarChart3, Settings, LogOut, Camera, Star, Utensils, Bookmark,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/scan',      label: 'Scan Label',    icon: Camera,    group: 'capture' },
  { href: '/cellar',    label: 'Cellar',         icon: Wine,      group: 'core' },
  { href: '/journal',   label: 'Journal',        icon: BookOpen,  group: 'core' },
  { href: '/featured',  label: 'The Collection', icon: Star,      group: 'core' },
  { href: '/wines',     label: 'Wines',          icon: Search,    group: 'explore' },
  { href: '/discover',  label: 'Discover',       icon: Compass,   group: 'explore' },
  { href: '/pairings',  label: 'Pairings',       icon: Utensils,  group: 'explore' },
  { href: '/wishlist',  label: 'Want List',      icon: Bookmark,  group: 'explore' },
  { href: '/regions',   label: 'Regions',        icon: Map,       group: 'reference' },
  { href: '/producers', label: 'Producers',      icon: Building2, group: 'reference' },
  { href: '/stats',     label: 'Analytics',      icon: BarChart3, group: 'reference' },
  { href: '/settings',  label: 'Settings',       icon: Settings,  group: 'meta' },
];

const GROUP_LABELS: Record<string, string> = {
  capture:   'Quick Add',
  core:      'My Wine',
  explore:   'Explore',
  reference: 'Reference',
  meta:      '',
};

const GROUP_ORDER = ['capture', 'core', 'explore', 'reference', 'meta'];

function groupItems(items: NavItem[]) {
  const groups: Record<string, NavItem[]> = {};
  for (const item of items) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }
  return groups;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const groups = groupItems(NAV_ITEMS);

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40 bg-cru-surface"
      style={{ width: '200px', borderRight: '1px solid var(--cru-border)' }}
    >
      {/* Wordmark */}
      <div className="px-5 pt-7 pb-5" style={{ borderBottom: '1px solid var(--cru-border)' }}>
        <Link href="/cellar" className="block">
          <span
            className="font-display text-3xl italic"
            style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.02em', fontWeight: 500 }}
          >
            Cru
          </span>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[0.15em] text-cru-text-subtle">
            Wine Intelligence
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
        {GROUP_ORDER.map((groupKey) => {
          const items = groups[groupKey];
          if (!items) return null;
          const label = GROUP_LABELS[groupKey];
          return (
            <div key={groupKey}>
              {label && (
                <p className="px-3 mb-1 font-ui text-[10px] uppercase tracking-[0.12em] text-cru-text-subtle">
                  {label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={clsx(
                          'group flex items-center gap-2.5 px-3 py-2 rounded-r text-[13px] font-ui transition-all duration-150',
                          isActive
                            ? 'text-cru-text font-medium'
                            : 'text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised',
                        )}
                        style={
                          isActive
                            ? {
                                backgroundColor: 'rgba(107, 25, 41, 0.06)',
                                borderLeft: '2px solid var(--cru-accent-garnet)',
                                paddingLeft: '10px',
                              }
                            : {}
                        }
                      >
                        <Icon
                          className={clsx(
                            'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                            isActive
                              ? 'text-cru-accent-garnet'
                              : 'text-cru-text-subtle group-hover:text-cru-text-muted',
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2 pb-4 pt-3" style={{ borderTop: '1px solid var(--cru-border)' }}>
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.imageUrl}
                alt={user.fullName ?? 'User'}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-cru-border"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-cru-surface-raised border border-cru-border flex items-center justify-center">
                <span className="text-[10px] font-ui text-cru-text-muted">
                  {(user.fullName ?? user.emailAddresses[0]?.emailAddress ?? 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-ui text-cru-text truncate font-medium">
                {user.fullName ?? 'Collector'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ redirectUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-ui text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised transition-colors group"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0 group-hover:text-cru-accent-garnet transition-colors" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
