import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, type as type_ } from '@/components/ui/tokens';
import { wishlistApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import type { WishlistEntry } from '@/types';

// ─── Stars ────────────────────────────────────────────────────────────────────

function PriorityStars({ priority }: { priority: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <View style={styles.starsRow}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <Text key={n} style={[styles.star, n <= priority ? styles.starFilled : styles.starEmpty]}>
          {n <= priority ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: WishlistEntry;
  onRemove: (id: string) => void;
}

function EntryCard({ entry, onRemove }: EntryCardProps) {
  const wineName = entry.wine?.full_name ?? entry.free_text ?? 'Unknown wine';
  const displayPrice = entry.market_price ?? entry.estimated_price;

  const handleRemove = () => {
    Alert.alert('Remove from wishlist', `Remove "${wineName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemove(entry.id),
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.wineName} numberOfLines={2}>
            {wineName}
            {entry.vintage ? (
              <Text style={styles.vintage}>{`  ${entry.vintage}`}</Text>
            ) : null}
          </Text>
          <PriorityStars priority={entry.priority} />
        </View>

        <TouchableOpacity onPress={handleRemove} style={styles.trashBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
        </TouchableOpacity>
      </View>

      {(displayPrice != null || entry.source) ? (
        <View style={styles.metaRow}>
          {displayPrice != null && (
            <Text style={styles.price}>${displayPrice.toFixed(0)}</Text>
          )}
          {entry.source ? (
            <Text style={styles.source} numberOfLines={1}>
              via {entry.source}
            </Text>
          ) : null}
        </View>
      ) : null}

      {entry.reason ? (
        <Text style={styles.reason} numberOfLines={2}>
          {entry.reason}
        </Text>
      ) : null}
    </GlassCard>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => wishlistApi.list(await getToken()),
  });

  const { mutate: removeEntry } = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return wishlistApi.remove(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to remove entry. Please try again.');
    },
  });

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>More</Text>
        </TouchableOpacity>
        <Text style={[type_.screenTitle, styles.navTitle]}>Wishlist</Text>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.garnet} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {entries && entries.length > 0 ? (
            entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onRemove={removeEntry} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={40} color={colors.inkSubtle} />
              <Text style={styles.emptyText}>Your wishlist is empty</Text>
            </View>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 17, color: colors.garnet },
  navTitle: {
    marginTop: 4,
    color: colors.ink,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 18, gap: 12 },

  // Entry card
  card: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitleBlock: { flex: 1, gap: 4 },
  wineName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 20,
  },
  vintage: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.inkMuted,
  },
  trashBtn: { paddingTop: 2 },

  // Stars
  starsRow: { flexDirection: 'row', gap: 1 },
  star: { fontSize: 13 },
  starFilled: { color: colors.garnet },
  starEmpty: { color: colors.inkSubtle },

  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  source: {
    fontSize: 12,
    color: colors.inkSubtle,
    flex: 1,
  },
  reason: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginTop: 6,
    lineHeight: 17,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkMuted,
  },
});
