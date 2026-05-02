import { useAuth } from '@clerk/clerk-expo';

/**
 * Returns an async function that resolves to the current Clerk JWT.
 * Throws if the user is not signed in.
 *
 * Usage in a query:
 *   const getToken = useToken();
 *   useQuery({ queryFn: async () => cellarApi.list(await getToken()) });
 */
export function useToken(): () => Promise<string> {
  const { getToken, isSignedIn } = useAuth();
  return async () => {
    if (!isSignedIn) throw new Error('Not authenticated');
    const token = await getToken();
    if (!token) throw new Error('Token unavailable');
    return token;
  };
}
