import { useSignIn } from '@clerk/clerk-expo';
import { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors } from '@/components/ui/tokens';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!isLoaded) return;
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/cellar');
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Sign in failed. Check your credentials.';
      setError(msg);
    }
  }

  return (
    <LinearGradient
      colors={[colors.bgTop, colors.bgBottom]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Text style={styles.heading}>Cru</Text>
        <Text style={styles.subheading}>Sign in to your cellar</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.inkMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
    gap: 12,
  },
  heading: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 48,
    color: colors.ink,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Libre Baskerville',
    fontSize: 16,
    color: colors.inkMuted,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 16,
  },
  error: {
    color: '#e05c6a',
    fontFamily: 'Libre Baskerville',
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.garnet,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
  },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: {
    color: colors.inkMuted,
    fontFamily: 'Libre Baskerville',
    fontSize: 14,
  },
});
