# Cru UI Revamp — Full Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark brown/garnet aesthetic with a light, editorial, modern-classy design system across every page and component in the Cru frontend.

**Architecture:** New CSS design tokens (light background, white surfaces, deep claret accent, warm stone secondary) replace all dark theme values. Typography switches to Playfair Display (display) + Plus Jakarta Sans (UI/body). Pages move from card grids toward editorial list/ledger layouts. All changes are frontend-only — no backend changes required.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Framer Motion, Recharts, Lucide React, Clerk, `@tanstack/react-query`

**Design Tokens (memorize these — every task uses them):**
```
Background:       #F8F5F0  (warm off-white)
Surface:          #FFFFFF  (white cards/panels)
Surface raised:   #F3EFE9  (hover states, secondary panels)
Border:           #E2DAD0  (hairline warm border)
Border strong:    #C8BDB0  (dividers, emphasis borders)
Primary accent:   #6B1929  (deep claret — use for CTAs, active states, key numbers)
Secondary accent: #8B7355  (warm stone — use for secondary info, hover accents)
Text:             #1C1410  (near-black, warm)
Text muted:       #7A6E65  (secondary text)
Text subtle:      #A89D94  (placeholder, disabled)
```

**Font Stack:**
```
Display:  Playfair Display — wine names, page headings, hero moments
UI/Body:  Plus Jakarta Sans — all UI labels, body text, descriptions
Mono:     Fira Code — vintage years, scores, prices, quantities
```

**Key Layout Decisions:**
- Sidebar: 200px wide, white background, right border `#E2DAD0`
- Main content: `ml-[200px]`, max-w-[1600px], `px-10 py-10`
- Cards: white bg, `border: 1px solid #E2DAD0`, `border-radius: 4px`, `box-shadow: 0 1px 3px rgba(28,20,16,0.06)`
- Active nav item: left border `2px solid #6B1929`, background `rgba(107,25,41,0.05)`
- Buttons primary: `bg-[#6B1929] text-white hover:bg-[#5a1422]`

---

## Task 1: Design System Foundation

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Update globals.css with new design tokens and font imports**

Replace the entire contents of `frontend/src/app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --cru-bg:              #F8F5F0;
  --cru-surface:         #FFFFFF;
  --cru-surface-raised:  #F3EFE9;
  --cru-border:          #E2DAD0;
  --cru-border-strong:   #C8BDB0;
  --cru-accent-garnet:   #6B1929;
  --cru-accent-gold:     #8B7355;
  --cru-accent-straw:    #B8A48A;
  --cru-accent-slate:    #6B7280;
  --cru-text:            #1C1410;
  --cru-text-muted:      #7A6E65;
  --cru-text-subtle:     #A89D94;

  --cru-red:       #6B1929;
  --cru-white:     #8B7355;
  --cru-rose:      #B86B6B;
  --cru-orange:    #B86B2E;
  --cru-sparkling: #4A7090;
  --cru-fortified: #6B4A1A;
}

@layer base {
  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    background-color: var(--cru-bg);
    color: var(--cru-text);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: var(--cru-text);
  }

  p {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    line-height: 1.7;
  }

  ::selection {
    background-color: rgba(107, 25, 41, 0.15);
    color: var(--cru-text);
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--cru-bg); }
  ::-webkit-scrollbar-thumb { background: var(--cru-border-strong); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--cru-text-subtle); }

  input, textarea, select {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background-color: var(--cru-surface);
    color: var(--cru-text);
    border: 1px solid var(--cru-border);
    border-radius: 4px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  input:focus, textarea:focus, select:focus {
    border-color: var(--cru-accent-garnet);
    box-shadow: 0 0 0 3px rgba(107, 25, 41, 0.08);
  }

  input::placeholder, textarea::placeholder {
    color: var(--cru-text-subtle);
  }

  a { color: inherit; text-decoration: none; }
}

@layer components {
  .font-display { font-family: 'Playfair Display', Georgia, serif; }
  .font-body    { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
  .font-ui      { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
  .font-mono    { font-family: 'Fira Code', Menlo, monospace; }

  .text-display        { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; }
  .text-display-italic { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; font-style: italic; }

  /* Skeleton loading */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--cru-border) 25%,
      var(--cru-surface-raised) 50%,
      var(--cru-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 3px;
  }

  /* Card base */
  .cru-card {
    background-color: var(--cru-surface);
    border: 1px solid var(--cru-border);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(28, 20, 16, 0.06);
  }

  /* Claret divider */
  .divider-garnet {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cru-accent-garnet), transparent);
    opacity: 0.25;
  }

  /* Section divider */
  .divider {
    height: 1px;
    background-color: var(--cru-border);
  }

  /* Gold text gradient — now stone gradient */
  .text-gradient-gold {
    background: linear-gradient(135deg, var(--cru-accent-garnet), #9B4A5A);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Vintage year hero display */
  .vintage-hero {
    font-family: 'Fira Code', Menlo, monospace;
    font-size: 2.5rem;
    font-weight: 500;
    color: var(--cru-accent-garnet);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  /* Subtle paper texture overlay */
  .paper-texture {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  }

  /* Nav item active */
  .nav-active {
    background-color: rgba(107, 25, 41, 0.06);
    border-left: 2px solid var(--cru-accent-garnet);
    color: var(--cru-text);
  }

  /* Page header rule */
  .page-header-rule {
    border-bottom: 1px solid var(--cru-border);
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }
}

@layer utilities {
  .border-warm       { border-color: var(--cru-border); }
  .bg-surface        { background-color: var(--cru-surface); }
  .bg-surface-raised { background-color: var(--cru-surface-raised); }
  .text-garnet       { color: var(--cru-accent-garnet); }
  .text-gold         { color: var(--cru-accent-gold); }
  .text-straw        { color: var(--cru-accent-straw); }
  .text-muted        { color: var(--cru-text-muted); }
  .text-subtle       { color: var(--cru-text-subtle); }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fadeIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes slideUp {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Update tailwind.config.ts with new color tokens and font families**

Replace the entire contents of `frontend/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cru: {
          bg:             '#F8F5F0',
          surface:        '#FFFFFF',
          'surface-raised': '#F3EFE9',
          border:         '#E2DAD0',
          'border-strong': '#C8BDB0',
          text:           '#1C1410',
          'text-muted':   '#7A6E65',
          'text-subtle':  '#A89D94',
          accent: {
            garnet: '#6B1929',
            gold:   '#8B7355',
            straw:  '#B8A48A',
            slate:  '#6B7280',
          },
        },
        wine: {
          red:       '#6B1929',
          white:     '#8B7355',
          rose:      '#B86B6B',
          orange:    '#B86B2E',
          sparkling: '#4A7090',
          fortified: '#6B4A1A',
        },
        status: {
          'not-ready':  '#9CA3AF',
          approaching:  '#A08030',
          'in-window':  '#2D6B45',
          peak:         '#6B1929',
          'past-peak':  '#8B7A6A',
          declining:    '#8B4040',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        ui:      ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        sidebar: '200px',
      },
      borderRadius: {
        sm:      '2px',
        DEFAULT: '4px',
        md:      '6px',
        lg:      '8px',
        xl:      '12px',
      },
      boxShadow: {
        sm:           '0 1px 3px rgba(28,20,16,0.06)',
        DEFAULT:      '0 2px 8px rgba(28,20,16,0.08)',
        md:           '0 4px 16px rgba(28,20,16,0.10)',
        lg:           '0 8px 32px rgba(28,20,16,0.12)',
        'claret-ring': '0 0 0 3px rgba(107,25,41,0.12)',
        'gold-glow':   '0 0 12px 2px rgba(139,115,85,0.15)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer:    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, #E2DAD0 25%, #F3EFE9 50%, #E2DAD0 75%)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Update root layout.tsx — light mode, new fonts, Clerk light appearance**

Replace the entire contents of `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import QueryProvider from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Cru',
    template: '%s — Cru',
  },
  description: 'Personal wine intelligence. Cellar, journal, and discovery for serious drinkers.',
  keywords: ['wine', 'cellar', 'tasting notes', 'wine journal', 'wine recommendations'],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#F8F5F0',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary:        '#6B1929',
              colorBackground:     '#FFFFFF',
              colorInputBackground: '#F8F5F0',
              colorInputText:      '#1C1410',
              colorText:           '#1C1410',
              colorTextSecondary:  '#7A6E65',
              colorNeutral:        '#E2DAD0',
              borderRadius:        '4px',
              fontFamily:          'Plus Jakarta Sans, system-ui, sans-serif',
            },
          }}
        >
          <QueryProvider>{children}</QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css frontend/tailwind.config.ts frontend/src/app/layout.tsx
git commit -m "feat(design): light editorial design system — Playfair Display + Plus Jakarta Sans, warm off-white palette"
```

---

## Task 2: UI Primitives

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Card.tsx`
- Modify: `frontend/src/components/ui/Badge.tsx`
- Modify: `frontend/src/components/ui/EmptyState.tsx`
- Modify: `frontend/src/components/ui/LoadingSpinner.tsx`

*Depends on Task 1.*

- [ ] **Step 1: Update Button.tsx for light theme**

Replace `frontend/src/components/ui/Button.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-cru-accent-garnet text-white hover:bg-[#5a1422] active:bg-[#4a1019] border border-transparent shadow-sm',
  secondary:
    'bg-cru-surface text-cru-text hover:bg-cru-surface-raised border border-cru-border shadow-sm',
  outline:
    'bg-transparent text-cru-text border border-cru-border hover:border-cru-accent-garnet hover:text-cru-accent-garnet',
  ghost:
    'bg-transparent text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised border border-transparent',
  danger:
    'bg-transparent text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, disabled, children, className, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-ui font-medium rounded transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cru-accent-garnet focus-visible:ring-offset-2 focus-visible:ring-offset-cru-bg',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          isDisabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
```

- [ ] **Step 2: Update Card.tsx for light theme**

Replace `frontend/src/components/ui/Card.tsx`:

```tsx
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
```

- [ ] **Step 3: Update EmptyState.tsx for light theme**

Read current `frontend/src/components/ui/EmptyState.tsx` first, then replace:

```tsx
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 p-5 rounded-full bg-cru-surface-raised border border-cru-border">
        <Icon className="h-8 w-8 text-cru-text-subtle" strokeWidth={1.25} />
      </div>
      <h3 className="font-display text-2xl text-cru-text mb-2">{title}</h3>
      {description && (
        <p className="font-ui text-sm text-cru-text-muted max-w-sm leading-relaxed mb-8">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Update LoadingSpinner.tsx for light theme**

Read current `frontend/src/components/ui/LoadingSpinner.tsx` first, then replace:

```tsx
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  return (
    <Loader2
      className={clsx('animate-spin text-cru-text-subtle', sizeClass, className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size="md" />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat(design): update UI primitives for light editorial theme"
```

---

## Task 3: Sidebar + App Layout

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/app/(app)/layout.tsx`

*Depends on Task 2.*

- [ ] **Step 1: Redesign Sidebar.tsx — refined, light, 200px**

Replace the entire contents of `frontend/src/components/Sidebar.tsx`:

```tsx
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
  group?: string;
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

function groupItems(items: NavItem[]) {
  const groups: Record<string, NavItem[]> = {};
  for (const item of items) {
    const g = item.group ?? 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }
  return groups;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  const groups = groupItems(NAV_ITEMS);
  const groupOrder = ['capture', 'core', 'explore', 'reference', 'meta'];

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
        {groupOrder.map((groupKey) => {
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
                            ? 'nav-active text-cru-text font-medium'
                            : 'text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised',
                        )}
                        style={isActive ? { borderLeft: '2px solid var(--cru-accent-garnet)', paddingLeft: '10px' } : {}}
                      >
                        <Icon
                          className={clsx(
                            'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                            isActive ? 'text-cru-accent-garnet' : 'text-cru-text-subtle group-hover:text-cru-text-muted',
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
              <div className="h-6 w-6 rounded-full bg-cru-surface-raised flex items-center justify-center ring-1 ring-cru-border">
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
```

- [ ] **Step 2: Update app layout to match new sidebar width**

Replace `frontend/src/app/(app)/layout.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import UserSyncProvider from '@/components/UserSyncProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  return (
    <UserSyncProvider>
      <div className="flex min-h-screen bg-cru-bg">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto" style={{ marginLeft: '200px' }}>
          <div className="max-w-[1600px] mx-auto px-10 py-10">{children}</div>
        </main>
      </div>
    </UserSyncProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/app/(app)/layout.tsx
git commit -m "feat(design): redesign sidebar — 200px, light, grouped nav, editorial wordmark"
```

---

## Task 4: Auth Pages — Light Theme

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx`
- Modify: `frontend/src/app/(auth)/login/[[...sign-in]]/page.tsx`
- Modify: `frontend/src/app/(auth)/register/[[...sign-up]]/page.tsx`

*Depends on Task 1.*

- [ ] **Step 1: Update auth layout.tsx**

Read `frontend/src/app/(auth)/layout.tsx` first, then replace:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cru-bg px-4 py-12"
    >
      {/* Wordmark */}
      <div className="mb-10 text-center">
        <span
          className="font-display text-5xl italic"
          style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.02em', fontWeight: 500 }}
        >
          Cru
        </span>
        <p className="mt-1.5 font-ui text-xs uppercase tracking-[0.18em] text-cru-text-subtle">
          Personal Wine Intelligence
        </p>
      </div>

      {children}

      <p className="mt-10 font-ui text-xs text-cru-text-subtle">
        Private. For serious drinkers.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update login page.tsx**

Replace `frontend/src/app/(auth)/login/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign In' };

export default function LoginPage() {
  return (
    <SignIn
      path="/login"
      routing="path"
      signUpUrl="/register"
      fallbackRedirectUrl="/cellar"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'bg-cru-surface border border-cru-border shadow-md rounded',
          headerTitle: 'font-display text-2xl text-cru-text',
          headerSubtitle: 'font-ui text-sm text-cru-text-muted',
          formButtonPrimary:
            'bg-cru-accent-garnet hover:bg-[#5a1422] font-ui text-sm tracking-wide transition-colors',
          formFieldInput:
            'bg-cru-bg border-cru-border text-cru-text font-ui focus:border-cru-accent-garnet',
          formFieldLabel: 'font-ui text-xs text-cru-text-muted uppercase tracking-wider',
          footerActionLink: 'text-cru-accent-garnet hover:text-[#5a1422]',
          dividerLine: 'bg-cru-border',
          dividerText: 'font-ui text-xs text-cru-text-muted',
          socialButtonsBlockButton:
            'bg-cru-surface border border-cru-border text-cru-text hover:bg-cru-surface-raised font-ui text-sm',
          socialButtonsBlockButtonText: 'font-ui text-sm text-cru-text',
          alertText: 'font-ui text-sm',
        },
      }}
    />
  );
}
```

- [ ] **Step 3: Update register page.tsx**

Read `frontend/src/app/(auth)/register/[[...sign-up]]/page.tsx` first. If it uses `SignUp`, apply same appearance object as login but swap `SignIn` for `SignUp`, `path="/register"`, `signInUrl="/login"`, `fallbackRedirectUrl="/cellar"`. Apply identical `appearance.elements` object as login page above.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(auth)/
git commit -m "feat(design): light editorial auth pages, fix deprecated Clerk redirectUrl props"
```

---

## Task 5: Cellar Page — Ledger View

**Files:**
- Modify: `frontend/src/app/(app)/cellar/page.tsx`
- Modify: `frontend/src/components/cellar/BottleCard.tsx`
- Modify: `frontend/src/components/cellar/CellarGrid.tsx`
- Modify: `frontend/src/components/cellar/DrinkingWindowBadge.tsx`

*Depends on Tasks 1–3.*

- [ ] **Step 1: Redesign DrinkingWindowBadge.tsx for light theme**

Read `frontend/src/components/cellar/DrinkingWindowBadge.tsx` first, then replace:

```tsx
import { clsx } from 'clsx';
import type { DrinkingWindowStatus } from '@/types';

const STATUS_CONFIG: Record<DrinkingWindowStatus, { label: string; color: string; bg: string; border: string }> = {
  not_ready:  { label: 'Not Ready',  color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  approaching: { label: 'Approaching', color: '#A08030', bg: '#FEFCE8', border: '#FDE68A' },
  in_window:  { label: 'Drink Now',  color: '#2D6B45', bg: '#F0FDF4', border: '#BBF7D0' },
  peak:       { label: 'At Peak',    color: '#6B1929', bg: '#FFF1F2', border: '#FECDD3' },
  past_peak:  { label: 'Past Peak',  color: '#7A6A5A', bg: '#F5F0EB', border: '#D6C9BE' },
  declining:  { label: 'Declining',  color: '#8B4040', bg: '#FEF2F2', border: '#FECACA' },
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
```

- [ ] **Step 2: Redesign BottleCard.tsx — editorial list row style**

Replace `frontend/src/components/cellar/BottleCard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { clsx } from 'clsx';
import type { CellarEntry } from '@/types';
import DrinkingWindowBadge from './DrinkingWindowBadge';

const WINE_COLOR_ACCENT: Record<string, string> = {
  red:       '#6B1929',
  white:     '#8B7355',
  rose:      '#B86B6B',
  orange:    '#B86B2E',
  sparkling: '#4A7090',
  fortified: '#6B4A1A',
};

interface BottleCardProps {
  entry: CellarEntry;
}

export default function BottleCard({ entry }: BottleCardProps) {
  const wine = entry.wine;
  const accent = WINE_COLOR_ACCENT[wine?.color ?? 'red'] ?? '#6B1929';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/cellar/${entry.id}`} className="block group">
        <div
          className={clsx(
            'flex items-center gap-6 px-5 py-4 bg-cru-surface',
            'border-b border-cru-border',
            'transition-colors duration-150',
            'hover:bg-cru-surface-raised',
          )}
        >
          {/* Color stripe */}
          <div
            className="flex-shrink-0 w-1 self-stretch rounded-full opacity-70"
            style={{ backgroundColor: accent, minHeight: '40px' }}
          />

          {/* Vintage — hero number */}
          <div
            className="flex-shrink-0 font-mono text-2xl font-medium leading-none w-16 text-right"
            style={{ color: accent }}
          >
            {entry.vintage}
          </div>

          {/* Wine info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              {wine?.producer && (
                <span className="font-ui text-[11px] uppercase tracking-wider text-cru-text-subtle">
                  {wine.producer.name}
                </span>
              )}
            </div>
            <p className="font-display italic text-[15px] text-cru-text leading-snug truncate" style={{ fontWeight: 400 }}>
              {wine?.name ?? 'Unknown Wine'}
            </p>
            {wine?.appellation && (
              <p className="mt-0.5 font-ui text-xs text-cru-text-muted truncate">
                {wine.appellation.name}
              </p>
            )}
          </div>

          {/* Format + quantity */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            <p className="font-ui text-xs text-cru-text-subtle">{entry.format ?? '750ml'}</p>
            {entry.quantity > 1 && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Package className="h-2.5 w-2.5 text-cru-text-subtle" />
                <span className="font-mono text-[11px] text-cru-text-muted">×{entry.quantity}</span>
              </div>
            )}
          </div>

          {/* Price */}
          {entry.purchase_price != null && (
            <div className="flex-shrink-0 text-right hidden md:block w-20">
              <p className="font-mono text-sm text-cru-text-muted">
                ${entry.purchase_price.toLocaleString()}
              </p>
            </div>
          )}

          {/* Drinking window */}
          <div className="flex-shrink-0 w-28 text-right">
            {entry.drinking_window_status ? (
              <DrinkingWindowBadge status={entry.drinking_window_status} compact />
            ) : (
              <span className="font-ui text-xs text-cru-text-subtle">—</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 3: Redesign CellarGrid.tsx — ledger list with header row**

Read `frontend/src/components/cellar/CellarGrid.tsx` first, then replace:

```tsx
'use client';

import type { CellarEntry } from '@/types';
import BottleCard from './BottleCard';

interface CellarGridProps {
  entries: CellarEntry[];
  loading?: boolean;
}

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
      <div className="w-20 skeleton h-4 rounded" />
      <div className="w-24 skeleton h-5 rounded" />
    </div>
  );
}

export default function CellarGrid({ entries, loading = false }: CellarGridProps) {
  if (loading) {
    return (
      <div className="bg-cru-surface border border-cru-border rounded overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-6 px-5 py-2.5 bg-cru-surface-raised border-b border-cru-border">
          <div className="w-1 flex-shrink-0" />
          <div className="w-16 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Vintage</div>
          <div className="flex-1 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Wine</div>
          <div className="w-20 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right hidden md:block">Paid</div>
          <div className="w-28 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Readiness</div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  return (
    <div className="bg-cru-surface border border-cru-border rounded overflow-hidden shadow-sm">
      {/* Header row */}
      <div className="flex items-center gap-6 px-5 py-2.5 bg-cru-surface-raised border-b border-cru-border-strong">
        <div className="w-1 flex-shrink-0" />
        <div className="w-16 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Vintage</div>
        <div className="flex-1 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Wine</div>
        <div className="w-20 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right hidden md:block">Paid</div>
        <div className="w-28 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle text-right">Readiness</div>
      </div>
      {entries.map((entry) => (
        <BottleCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Redesign cellar/page.tsx — editorial page header + ledger layout**

Replace `frontend/src/app/(app)/cellar/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Sparkles, CalendarDays } from 'lucide-react';
import { cellarApi } from '@/lib/api';
import type { CellarFilters, CellarStatus, DrinkingWindowStatus, WineColor } from '@/types';
import CellarGrid from '@/components/cellar/CellarGrid';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Wine } from 'lucide-react';

const STATUS_FILTERS: Array<{ value: CellarFilters['status']; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'in_cellar', label: 'In Cellar' },
  { value: 'consumed',  label: 'Consumed' },
  { value: 'gifted',    label: 'Gifted' },
];

const READINESS_FILTERS: Array<{ value: DrinkingWindowStatus | ''; label: string }> = [
  { value: '',           label: 'Any' },
  { value: 'in_window',  label: 'Drink Now' },
  { value: 'peak',       label: 'At Peak' },
  { value: 'approaching',label: 'Approaching' },
  { value: 'not_ready',  label: 'Not Ready' },
  { value: 'past_peak',  label: 'Past Peak' },
];

const COLOR_FILTERS: Array<{ value: WineColor | ''; label: string }> = [
  { value: '',       label: 'All' },
  { value: 'red',    label: 'Red' },
  { value: 'white',  label: 'White' },
  { value: 'rose',   label: 'Rosé' },
  { value: 'orange', label: 'Orange' },
];

export default function CellarPage() {
  const { getToken } = useAuth();
  const [filters, setFilters] = useState<CellarFilters>({ status: 'in_cellar', page: 1, per_page: 50 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cellar', filters],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cellarApi.list(token, filters);
    },
  });

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;

  function setFilter<K extends keyof CellarFilters>(key: K, value: CellarFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Page header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            Cellar
          </h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            {isLoading ? (
              <span className="skeleton inline-block h-4 w-16 rounded" />
            ) : (
              <>
                <span className="font-mono text-cru-accent-garnet">{total.toLocaleString()}</span>
                {' '}
                {total === 1 ? 'bottle' : 'bottles'}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cellar/calendar">
            <Button variant="ghost" size="sm" leftIcon={<CalendarDays className="h-3.5 w-3.5" />}>
              Calendar
            </Button>
          </Link>
          <Link href="/cellar/optimize">
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
              Optimize
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filter
          </Button>
          <Link href="/cellar/intake">
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Bottle
            </Button>
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-0 border-b border-cru-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setFilter('status', f.value)}
            className={`px-4 py-2.5 text-[13px] font-ui transition-colors relative ${
              filters.status === f.value
                ? 'text-cru-text font-medium'
                : 'text-cru-text-muted hover:text-cru-text'
            }`}
          >
            {f.label}
            {filters.status === f.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cru-accent-garnet" />
            )}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-6 p-4 rounded border border-cru-border bg-cru-surface shadow-sm animate-slide-up">
          <div className="space-y-2">
            <label className="block font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Readiness</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {READINESS_FILTERS.map((f) => (
                <button
                  key={String(f.value)}
                  onClick={() => setFilter('readiness', f.value ? (f.value as DrinkingWindowStatus) : undefined)}
                  className={`px-2.5 py-1 text-xs font-ui rounded border transition-colors ${
                    (filters.readiness ?? '') === f.value
                      ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">Color</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_FILTERS.map((f) => (
                <button
                  key={String(f.value)}
                  onClick={() => setFilter('color', f.value ? (f.value as WineColor) : undefined)}
                  className={`px-2.5 py-1 text-xs font-ui rounded border transition-colors ${
                    (filters.color ?? '') === f.value
                      ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet'
                      : 'border-cru-border text-cru-text-muted hover:text-cru-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-sm font-ui text-red-700">
          Failed to load cellar. Please try again.
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && entries.length === 0 ? (
        <EmptyState
          icon={Wine}
          title="Your cellar awaits"
          description="Add your first bottle to begin tracking your collection — where it came from, when to drink it, and what it's worth."
          action={
            <Link href="/cellar/intake">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Add Your First Bottle
              </Button>
            </Link>
          }
        />
      ) : (
        <CellarGrid entries={entries} loading={isLoading} />
      )}

      {/* Load more */}
      {data?.has_more && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setFilter('page', (filters.page ?? 1) + 1)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/cellar/ frontend/src/components/cellar/
git commit -m "feat(design): cellar redesign — editorial ledger view, light theme components"
```

---

## Task 6: Journal Page — Editorial Timeline

**Files:**
- Modify: `frontend/src/app/(app)/journal/page.tsx`
- Modify: `frontend/src/components/tasting/NoteTimeline.tsx`

*Depends on Tasks 1–3.*

- [ ] **Step 1: Redesign journal/page.tsx**

Replace `frontend/src/app/(app)/journal/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { notesApi } from '@/lib/api';
import NoteTimeline from '@/components/tasting/NoteTimeline';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { ScoringSystem } from '@/types';

type SortOption = 'date' | 'score' | 'wine';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'date',  label: 'Date' },
  { value: 'score', label: 'Score' },
  { value: 'wine',  label: 'Wine' },
];

export default function JournalPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const scoringSystem: ScoringSystem =
    (user?.publicMetadata?.scoring_system as ScoringSystem) ?? '100pt';

  const { data, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return notesApi.list(token, { per_page: 100 });
    },
  });

  const notes = data?.items ?? [];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            Journal
          </h1>
          {data && (
            <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
              <span className="font-mono text-cru-accent-garnet">{data.total.toLocaleString()}</span>
              {' '}{data.total === 1 ? 'note' : 'notes'}
            </p>
          )}
        </div>
        <Link href="/journal/new">
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Note
          </Button>
        </Link>
      </div>

      {/* Sort controls */}
      {notes.length > 1 && (
        <div className="flex items-center gap-1.5 mb-7">
          <span className="font-ui text-xs text-cru-text-subtle mr-2">Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-ui transition-all duration-150 border ${
                sortBy === opt.value
                  ? 'border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-text font-medium'
                  : 'border-cru-border text-cru-text-muted hover:text-cru-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your first note awaits"
          description="Open a bottle and begin. Every great palate is built one note at a time."
          action={
            <Link href="/journal/new">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Write Your First Note
              </Button>
            </Link>
          }
        />
      ) : (
        <NoteTimeline
          notes={notes}
          scoringSystem={scoringSystem}
          onNoteClick={(id) => router.push(`/journal/${id}`)}
          sortBy={sortBy}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Redesign NoteTimeline.tsx for light editorial style**

Read `frontend/src/components/tasting/NoteTimeline.tsx` fully first. Then find and replace the card/row rendering to use this pattern for each note entry (adapt to existing props/types — do not change the component's external interface or data sorting logic, only the JSX):

Each note row should render as:
```tsx
<div
  key={note.id}
  onClick={() => onNoteClick(note.id)}
  className="group flex gap-6 py-5 border-b border-cru-border cursor-pointer hover:bg-cru-surface-raised transition-colors px-4 -mx-4 rounded"
>
  {/* Date column */}
  <div className="flex-shrink-0 w-24 text-right pt-0.5">
    <p className="font-mono text-xs text-cru-text-subtle">
      {new Date(note.tasted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </p>
    <p className="font-mono text-[10px] text-cru-text-subtle opacity-60">
      {new Date(note.tasted_at).getFullYear()}
    </p>
  </div>

  {/* Accent line */}
  <div className="flex-shrink-0 w-px bg-cru-border self-stretch" />

  {/* Content */}
  <div className="flex-1 min-w-0">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle mb-0.5">
          {note.wine?.producer?.name ?? ''}
        </p>
        <h3 className="font-display italic text-lg text-cru-text leading-snug" style={{ fontWeight: 400 }}>
          {note.wine?.name ?? 'Unknown Wine'}
        </h3>
        <p className="font-ui text-xs text-cru-text-muted mt-0.5">
          {note.vintage} · {note.wine?.appellation?.name ?? ''}
        </p>
      </div>
      {note.personal_score != null && (
        <div className="flex-shrink-0 text-right">
          <span className="font-mono text-2xl text-cru-accent-garnet leading-none" style={{ fontWeight: 500 }}>
            {note.personal_score}
          </span>
        </div>
      )}
    </div>
    {note.free_note && (
      <p className="mt-2 font-ui text-sm text-cru-text-muted line-clamp-2 leading-relaxed">
        {note.free_note}
      </p>
    )}
    {note.quality && (
      <p className="mt-1.5 font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">
        {note.quality.replace('_', ' ')}
        {note.readiness ? ` · ${note.readiness.replace(/_/g, ' ')}` : ''}
      </p>
    )}
  </div>
</div>
```

Wrap the list in `<div className="space-y-0">` (no gap — rows touch, separated by border-b).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(app)/journal/ frontend/src/components/tasting/NoteTimeline.tsx
git commit -m "feat(design): journal redesign — editorial timeline, light theme"
```

---

## Task 7: Discover Page

**Files:**
- Modify: `frontend/src/app/(app)/discover/page.tsx`
- Modify: `frontend/src/components/discover/RecommendationCard.tsx`
- Modify: `frontend/src/components/discover/PalateRadar.tsx`

*Depends on Tasks 1–3.*

- [ ] **Step 1: Redesign RecommendationCard.tsx**

Read `frontend/src/components/discover/RecommendationCard.tsx` first, then replace:

```tsx
'use client';

import { motion } from 'framer-motion';

export interface RecommendationCardProps {
  wine: {
    id: string;
    full_name: string;
    producer?: string;
    appellation?: string;
    style?: string;
    color?: string;
    distance?: number;
  };
  rank?: number;
  onAdd?: () => void;
  adding?: boolean;
}

const WINE_COLOR_ACCENT: Record<string, string> = {
  red:       '#6B1929',
  white:     '#8B7355',
  rose:      '#B86B6B',
  orange:    '#B86B2E',
  sparkling: '#4A7090',
  fortified: '#6B4A1A',
};

export default function RecommendationCard({ wine, rank, onAdd, adding }: RecommendationCardProps) {
  const accent = WINE_COLOR_ACCENT[wine.color ?? 'red'] ?? '#6B1929';
  const matchPct = wine.distance != null ? Math.round((1 - wine.distance) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: (rank ?? 0) * 0.04 }}
      className="flex items-center gap-5 px-5 py-4 bg-cru-surface border-b border-cru-border hover:bg-cru-surface-raised transition-colors group"
    >
      {/* Rank */}
      {rank != null && (
        <span className="flex-shrink-0 font-mono text-sm text-cru-text-subtle w-5 text-right">
          {rank}
        </span>
      )}

      {/* Color stripe */}
      <div
        className="flex-shrink-0 w-1 self-stretch rounded-full opacity-60"
        style={{ backgroundColor: accent, minHeight: '36px' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        {wine.producer && (
          <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle mb-0.5">
            {wine.producer}
          </p>
        )}
        <p className="font-display italic text-[15px] text-cru-text leading-snug truncate" style={{ fontWeight: 400 }}>
          {wine.full_name}
        </p>
        {wine.appellation && (
          <p className="font-ui text-xs text-cru-text-muted mt-0.5">{wine.appellation}</p>
        )}
      </div>

      {/* Match score */}
      {matchPct != null && (
        <div className="flex-shrink-0 text-right hidden sm:block">
          <span className="font-mono text-lg text-cru-accent-garnet" style={{ fontWeight: 500 }}>
            {matchPct}
          </span>
          <span className="font-ui text-[10px] text-cru-text-subtle">%</span>
        </div>
      )}

      {/* Add button */}
      {onAdd && (
        <button
          onClick={onAdd}
          disabled={adding}
          className="flex-shrink-0 px-3 py-1.5 rounded border border-cru-border text-xs font-ui text-cru-text-muted hover:border-cru-accent-garnet hover:text-cru-accent-garnet transition-colors disabled:opacity-40"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Redesign discover/page.tsx — two-column editorial layout**

Read the full current `frontend/src/app/(app)/discover/page.tsx` to understand the query logic and state. Preserve all query logic, state variables, and data-fetching exactly. Only replace the JSX return value. The new JSX:

```tsx
return (
  <div className="animate-fade-in">
    {/* Header */}
    <div className="page-header-rule flex items-end justify-between">
      <div>
        <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
          Discover
        </h1>
        <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
          Wines matched to your palate
        </p>
      </div>
      <Link href="/discover/blind">
        <Button variant="outline" size="sm">
          Blind Tasting Mode
        </Button>
      </Link>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      {/* Left: Recommendations list */}
      <div>
        {/* Style filter pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {STYLE_FILTERS.map((f) => (
            <StyleFilterPill
              key={f.value}
              label={f.label}
              active={selectedStyle === f.value}
              onClick={() => setSelectedStyle(f.value)}
            />
          ))}
        </div>

        {/* Natural language search */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Find something like… "a structured Burgundy under $80""
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNlSearch()}
              className="flex-1 h-9 px-3 text-sm font-ui bg-cru-surface border border-cru-border rounded focus:border-cru-accent-garnet focus:ring-2 focus:ring-cru-accent-garnet/10 outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Search className="h-3.5 w-3.5" />}
              loading={nlMutation.isPending}
              onClick={handleNlSearch}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Recommendation list */}
        {isLoading ? (
          <div className="bg-cru-surface border border-cru-border rounded shadow-sm overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-cru-border">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="w-1 self-stretch skeleton rounded-full" style={{ minHeight: 36 }} />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-4 w-48 rounded" />
                </div>
                <div className="skeleton h-5 w-10 rounded" />
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Not enough data yet"
            description="Add tasting notes to build your palate profile. Recommendations improve with every wine you rate."
          />
        ) : (
          <div className="bg-cru-surface border border-cru-border rounded shadow-sm overflow-hidden">
            {recommendations.map((rec, i) => (
              <RecommendationCard
                key={rec.wine.id}
                wine={toCardWine(rec)}
                rank={i + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: Palate radar */}
      <div className="space-y-4">
        <div className="bg-cru-surface border border-cru-border rounded shadow-sm p-5">
          <h2 className="font-display text-lg text-cru-text mb-4" style={{ fontWeight: 500 }}>
            Your Palate
          </h2>
          <PalateRadar />
        </div>
      </div>
    </div>
  </div>
);
```

Note: preserve all existing state/query variables (`recommendations`, `isLoading`, `nlQuery`, `nlMutation`, `selectedStyle`, `setSelectedStyle`, `setNlQuery`, `handleNlSearch`). Add any missing imports (`Search`, `Compass`). The `nlQuery`, `nlMutation`, `handleNlSearch` and natural language search flow must remain intact.

- [ ] **Step 3: Update PalateRadar.tsx chart colors for light theme**

Read `frontend/src/components/discover/PalateRadar.tsx` first. Find all dark-theme color values (`#8b1a2e`, `#c9a84c`, `#2d2420`, `#e8ddd4`, `#8b7d74`, `#161210`, `#0d0b09`) and replace with light-theme equivalents:
- `#8b1a2e` → `#6B1929`
- `#c9a84c` → `#8B7355`
- `#2d2420` → `#E2DAD0`
- `#e8ddd4` → `#1C1410`
- `#8b7d74` → `#7A6E65`
- `#161210` → `#FFFFFF`
- `#0d0b09` → `#F8F5F0`

Also set `fill="#6B1929"` with `fillOpacity={0.08}` and `stroke="#6B1929"` on the Radar component. Set `PolarGrid` stroke to `#E2DAD0`. Set `PolarAngleAxis` tick fill to `#7A6E65`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/discover/ frontend/src/components/discover/
git commit -m "feat(design): discover redesign — editorial two-column layout, light theme"
```

---

## Task 8: Stats Page — Editorial Dashboard

**Files:**
- Modify: `frontend/src/app/(app)/stats/page.tsx`

*Depends on Tasks 1–3.*

- [ ] **Step 1: Update chart colors and stat cards throughout stats/page.tsx**

Read the full `frontend/src/app/(app)/stats/page.tsx`. Make the following targeted changes:

**1. Replace `CHART_COLORS` constant:**
```tsx
const CHART_COLORS = {
  primary: '#6B1929',
  secondary: '#8B7355',
  muted: '#E2DAD0',
  text: '#7A6E65',
  grid: '#F3EFE9',
};
```

**2. Replace the `StatCard` component:**
```tsx
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="p-5 rounded border border-cru-border bg-cru-surface shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-ui text-[10px] uppercase tracking-wider text-cru-text-subtle">{label}</p>
        <Icon className="h-4 w-4 text-cru-accent-garnet opacity-40" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl text-cru-text" style={{ fontWeight: 500 }}>
          {value ?? '—'}
        </span>
        {unit && <span className="font-ui text-sm text-cru-text-muted">{unit}</span>}
      </div>
    </div>
  );
}
```

**3. Add page header before the first grid:**
```tsx
<div className="page-header-rule flex items-end justify-between">
  <div>
    <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
      Analytics
    </h1>
    <p className="mt-1.5 font-ui text-sm text-cru-text-muted">Your palate, quantified</p>
  </div>
</div>
```

**4. Update all Recharts components** — find every `XAxis`, `YAxis`, `Tooltip`, `PolarGrid`, `PolarAngleAxis`, `Legend` and set:
- `XAxis`: `tick={{ fill: '#7A6E65', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}` `axisLine={{ stroke: '#E2DAD0' }}` `tickLine={false}`
- `YAxis`: same tick style, `axisLine={false}` `tickLine={false}`
- `Tooltip`: `contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DAD0', borderRadius: 4, fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: '#1C1410' }}`
- `PolarGrid`: `stroke="#E2DAD0"`
- `PolarAngleAxis`: `tick={{ fill: '#7A6E65', fontSize: 11 }}`
- `Bar fill`: `#6B1929`
- `Line stroke`: `#6B1929`
- `Radar fill="#6B1929" fillOpacity={0.08} stroke="#6B1929"`

**5. Update Card usage** — replace any `bg-cru-surface border border-cru-border` inline styles with `className="cru-card"`.

**6. Add section headings** — before each chart section, add:
```tsx
<h2 className="font-display text-2xl text-cru-text mb-4" style={{ fontWeight: 500 }}>
  [Section Name]
</h2>
```
Use appropriate section names: "Score Distribution", "Regions", "Palate Profile", "Consumption", "Critic Agreement".

- [ ] **Step 2: Wrap the entire return in animate-fade-in and add page header**

The root div of the return should be:
```tsx
<div className="space-y-10 animate-fade-in">
  {/* page header + stat cards + sections */}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(app)/stats/page.tsx
git commit -m "feat(design): stats redesign — editorial dashboard, light chart theme"
```

---

## Task 9: Remaining Pages — Light Theme Pass

**Files:**
- Modify: `frontend/src/app/(app)/wines/page.tsx`
- Modify: `frontend/src/app/(app)/producers/page.tsx`
- Modify: `frontend/src/app/(app)/regions/page.tsx`
- Modify: `frontend/src/app/(app)/featured/page.tsx`
- Modify: `frontend/src/app/(app)/pairings/page.tsx`
- Modify: `frontend/src/app/(app)/wishlist/page.tsx`
- Modify: `frontend/src/app/(app)/settings/page.tsx`
- Modify: `frontend/src/app/(app)/scan/page.tsx`

*Depends on Tasks 1–3.*

For each page in this task, apply the same consistent treatment:

**Pattern to apply to every page:**

1. **Page header**: Replace `<h1>` styling with:
   ```tsx
   <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
   ```
   Wrap header + subtitle in `<div className="page-header-rule ...">`.

2. **Color replacements** — find all hardcoded dark-theme colors and replace:
   - `var(--cru-bg)` backgrounds → `var(--cru-surface-raised)` or remove
   - `text-cru-text` on dark inputs → already correct (text color unchanged in semantics)  
   - `border-cru-border` → keep (value updated via CSS variable)
   - `bg-cru-surface` → keep
   - Error states: `border-red-900/40 bg-red-950/20 text-red-400` → `border-red-200 bg-red-50 text-red-700`
   - Success states: `border-green-900/40 bg-green-950/20 text-green-400` → `border-green-200 bg-green-50 text-green-700`
   - Info states: `border-blue-900/40 bg-blue-950/20 text-blue-400` → `border-blue-200 bg-blue-50 text-blue-700`

3. **Tab/filter bars**: Apply the same pattern as cellar page — `border-b border-cru-border` with `h-0.5 bg-cru-accent-garnet` underline for active tabs.

4. **Active filter pills**: `border-cru-accent-garnet/50 bg-[rgba(107,25,41,0.06)] text-cru-accent-garnet`

5. **Section headings** (h2, h3): `font-display text-2xl text-cru-text` with `fontWeight: 500`

6. **Root div**: Add `animate-fade-in` class.

**Page-specific notes:**

- `wines/page.tsx` — Apply standard treatment. The search input should use the light focus ring.
- `producers/page.tsx` — Apply standard treatment.
- `regions/page.tsx` — The MapLibre map needs its style updated. Find the `mapStyle` prop and if it currently references a dark Protomaps style or demotiles, change to `https://demotiles.maplibre.org/style.json` (light basemap) temporarily. The overlay colors for appellation polygons: visited = `#6B1929` at 30% opacity, in_cellar = `#8B7355` at 25% opacity, wishlist = `#4A7090` at 25% opacity, unexplored = `#E2DAD0` at 30% opacity.
- `featured/page.tsx` — Hero card background: `bg-cru-surface border border-cru-border`. Story text in `font-display italic`.
- `pairings/page.tsx` — Apply standard treatment. Result cards use `cru-card` class.
- `wishlist/page.tsx` — Apply ledger-row pattern matching BottleCard (list with color stripe, wine name in display italic, price in mono).
- `settings/page.tsx` — Section headers use `font-display text-xl`. Form groups: `bg-cru-surface border border-cru-border rounded shadow-sm p-5`.
- `scan/page.tsx` — Camera/upload area: `border-2 border-dashed border-cru-border rounded-lg bg-cru-surface hover:bg-cru-surface-raised`. Extracted data panel: `cru-card`.

- [ ] **Step 1: Apply light theme to wines/page.tsx, producers/page.tsx**

Read each file fully, apply the pattern above, save.

- [ ] **Step 2: Apply light theme to regions/page.tsx, featured/page.tsx**

Read each file fully, apply the pattern above (including map style update), save.

- [ ] **Step 3: Apply light theme to pairings/page.tsx, wishlist/page.tsx**

Read each file fully, apply the pattern above, save.

- [ ] **Step 4: Apply light theme to settings/page.tsx, scan/page.tsx**

Read each file fully, apply the pattern above, save.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/wines/ frontend/src/app/(app)/producers/ \
        frontend/src/app/(app)/regions/ frontend/src/app/(app)/featured/ \
        frontend/src/app/(app)/pairings/ frontend/src/app/(app)/wishlist/ \
        frontend/src/app/(app)/settings/ frontend/src/app/(app)/scan/
git commit -m "feat(design): light editorial theme pass on all remaining pages"
```

---

## Task 10: Wine Detail + Producer Detail + Region Detail

**Files:**
- Modify: `frontend/src/app/(app)/wines/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/producers/[slug]/page.tsx`
- Modify: `frontend/src/app/(app)/regions/[slug]/page.tsx`
- Modify: `frontend/src/components/map/VintageHeatmap.tsx`

*Depends on Tasks 1–3.*

- [ ] **Step 1: Update wines/[id]/page.tsx**

Read fully. Apply standard light theme treatment (page-header-rule, font-display headings, light error/success states). The vintage year display: `font-mono text-5xl text-cru-accent-garnet` with `fontWeight: 500`. Critic scores section: small `font-mono text-2xl` numbers in `text-cru-text`, label in `text-cru-text-subtle text-[10px] uppercase tracking-wider`.

- [ ] **Step 2: Update producers/[slug]/page.tsx**

Read fully. Apply standard light theme treatment. Producer name: `font-display text-4xl italic`. AI brief section: serif body text `font-ui text-sm text-cru-text-muted leading-relaxed`.

- [ ] **Step 3: Update regions/[slug]/page.tsx**

Read fully. Apply standard light theme treatment. Region name: `font-display text-4xl`. Vintage chart heatmap: update colors for light theme.

- [ ] **Step 4: Update VintageHeatmap.tsx for light theme**

Read `frontend/src/components/map/VintageHeatmap.tsx` fully. Replace all dark color values with light equivalents using the same substitution map from Task 7 Step 3. The heatmap cell color scale should go from `#F3EFE9` (low score) through `#D4A8A8` to `#6B1929` (highest score). Cell text: `#1C1410` for dark cells, `#F8F5F0` for cells with score > 88.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/wines/[id]/ frontend/src/app/(app)/producers/ \
        frontend/src/app/(app)/regions/[slug]/ frontend/src/components/map/VintageHeatmap.tsx
git commit -m "feat(design): detail pages and heatmap — light editorial theme"
```

---

## Task 11: Seed Data — Appellations + Wines

**Files:**
- Run: `backend/scripts/seed_appellations.py`
- Run: `backend/scripts/seed_wines.py`
- Run: `backend/scripts/seed_vintage_charts.py`

*Independent — can run in parallel with UI tasks.*

- [ ] **Step 1: Check seed scripts exist and are runnable**

```bash
docker exec cru-backend python -c "from app.database import engine; print('db ok')"
```
Expected: `db ok`

- [ ] **Step 2: Run appellation seed**

```bash
docker exec cru-backend python scripts/seed_appellations.py
```
Expected: output showing appellations inserted/skipped.

- [ ] **Step 3: Run wine seed**

```bash
docker exec cru-backend python scripts/seed_wines.py
```
Expected: output showing wines inserted.

- [ ] **Step 4: Run vintage chart seed**

```bash
docker exec cru-backend python scripts/seed_vintage_charts.py
```
Expected: output showing vintage quality rows inserted.

- [ ] **Step 5: Verify data**

```bash
docker exec cru-db psql -U cru_user -d cru_db -c "SELECT count(*) FROM appellations; SELECT count(*) FROM wines; SELECT count(*) FROM vintage_quality;"
```
Expected: nonzero counts for all three tables.

- [ ] **Step 6: Commit note**

No code changes — data only. No commit needed. Proceed to verification.

---

## Execution Order

**Sequential:**
- Task 1 → Task 2 → Task 3 (design system foundation, then primitives, then layout)

**Parallel after Task 3:**
- Task 4 (auth pages)
- Task 5 (cellar + components)
- Task 6 (journal)
- Task 7 (discover)
- Task 8 (stats)
- Task 9 (remaining pages)
- Task 10 (detail pages)
- Task 11 (seed data) — fully independent, start immediately

**Verification after all tasks:**
- Run dev server, open Chrome, sign in, check every page for visual regressions
- Confirm no TypeScript errors: `docker exec cru-frontend npx tsc --noEmit`
