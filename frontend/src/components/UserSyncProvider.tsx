'use client';

/**
 * Mounts useCurrentUser at the app shell level so the user record is
 * upserted in our DB immediately after first login — before any page
 * that depends on scoring_system, home_country, or preferences renders.
 *
 * Renders no UI; purely a sync side-effect wrapper.
 */
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function UserSyncProvider({ children }: { children: React.ReactNode }) {
  // Calling the hook here fires the once-per-session sync on mount.
  // The result is also seeded into the React Query cache for the rest of the app.
  useCurrentUser();
  return <>{children}</>;
}
