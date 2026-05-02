import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type as type_ } from '@/components/ui/tokens';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
        <Text style={styles.title}>This page doesn't exist.</Text>
        <Link href="/(tabs)/cellar" style={styles.link}>
          Go to Cellar
        </Link>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { ...type_.wineName, fontSize: 17, marginBottom: 16 },
  link: { fontSize: 15, color: colors.garnet, fontWeight: '600' },
});
