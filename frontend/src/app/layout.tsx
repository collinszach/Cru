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
              colorPrimary:         '#6B1929',
              colorBackground:      '#FFFFFF',
              colorInputBackground: '#F8F5F0',
              colorInputText:       '#1C1410',
              colorText:            '#1C1410',
              colorTextSecondary:   '#7A6E65',
              colorNeutral:         '#E2DAD0',
              borderRadius:         '4px',
              fontFamily:           'Plus Jakarta Sans, system-ui, sans-serif',
            },
          }}
        >
          <QueryProvider>{children}</QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
