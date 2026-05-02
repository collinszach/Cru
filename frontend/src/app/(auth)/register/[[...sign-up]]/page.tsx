import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create Account' };

export default function RegisterPage() {
  return (
    <SignUp
      path="/register"
      routing="path"
      signInUrl="/login"
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
