import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { tokenCache } from '@/lib/auth';
import { queryClient, setupQueryPersistence } from '@/lib/queryClient';
import { meApi } from '@/lib/api';

setupQueryPersistence();

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

function AuthGuard() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    const inAuth = segments[0] === '(auth)';
    if (!isSignedIn && !inAuth) {
      router.replace('/(auth)/login');
      syncedRef.current = false;
    } else if (isSignedIn && inAuth) {
      router.replace('/(tabs)/cellar');
    }
  }, [isSignedIn, isLoaded, segments, router]);

  // Upsert Clerk user into Cru DB on first sign-in per session
  useEffect(() => {
    if (!isSignedIn || syncedRef.current) return;
    syncedRef.current = true;
    getToken()
      .then((token) => { if (token) return meApi.sync(token); })
      .catch(() => { /* non-critical — user can still use the app */ });
  }, [isSignedIn, getToken]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <AuthGuard />
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
