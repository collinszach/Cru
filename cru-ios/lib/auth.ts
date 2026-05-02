import * as SecureStore from 'expo-secure-store';

/**
 * Clerk token cache backed by expo-secure-store.
 * Pass this to <ClerkProvider tokenCache={tokenCache}>.
 */
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};
