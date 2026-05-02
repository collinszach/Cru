
// ─── Color Palette ───────────────────────────────────────────────────────────
// iOS 26 Liquid Glass, warm mode.
// Background: warm cream gradient. Cards: frosted glass.
// Accent: garnet #8b1a2e. Secondary: gold #c9a84c.

export const colors = {
  // Background
  bgTop: '#F7F0E8',
  bgBottom: '#E4D5C0',
  blush: 'rgba(139,26,46,0.35)',

  // Glass cards
  glass: 'rgba(255,255,255,0.38)',
  glassFeatured: 'rgba(255,255,255,0.52)',
  glassFeaturedBorder: 'rgba(255,255,255,0.75)',
  glassBorder: 'rgba(255,255,255,0.65)',
  glassBorderSubtle: 'rgba(255,255,255,0.6)',
  glassPill: 'rgba(255,255,255,0.45)',
  glassPillBorder: 'rgba(255,255,255,0.7)',

  // Tab bar
  tabBar: 'rgba(247,240,232,0.65)',
  tabBarBorder: 'rgba(255,255,255,0.7)',
  tabBarHeader: 'rgba(247,240,232,0.72)',
  tabBarHeaderBorder: 'rgba(255,255,255,0.5)',

  // Accent
  garnet: '#8b1a2e',
  garnetDim: 'rgba(139,26,46,0.12)',
  garnetBorder: 'rgba(139,26,46,0.2)',
  garnetShadow: 'rgba(139,26,46,0.4)',
  gold: '#c9a84c',
  goldDim: 'rgba(201,168,76,0.15)',

  // Text
  ink: '#1a0c08',
  inkMuted: 'rgba(60,30,15,0.55)',
  inkSubtle: 'rgba(60,30,15,0.4)',
  inkCaption: 'rgba(90,55,35,0.6)',

  // Drinking window dots
  windowPeak: '#4caf50',
  windowPeakGlow: 'rgba(76,175,80,0.5)',
  windowApproaching: '#c9a84c',
  windowApproachingGlow: 'rgba(201,168,76,0.4)',
  windowHold: 'rgba(100,80,60,0.35)',

  // Divider
  dividerGarnet: 'rgba(139,26,46,0.25)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  pill: 20,
  card: 20,
  cardFeatured: 24,
  badge: 8,
  stat: 10,
  tab: 10,
} as const;

export const type = {
  vintageHero: {
    fontSize: 40,
    fontWeight: '100' as const,
    color: colors.garnet,
    letterSpacing: -3,
    lineHeight: 40,
  },
  vintageCard: {
    fontSize: 32,
    fontWeight: '200' as const,
    color: colors.garnet,
    letterSpacing: -2,
    lineHeight: 32,
  },
  dateHeader: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: colors.ink,
    letterSpacing: -1,
  },
  wineNameFeatured: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  wineName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  producer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: colors.inkMuted,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  screenMeta: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: colors.inkCaption,
    letterSpacing: 0.3,
  },
  pill: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.garnet,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '500' as const,
    color: colors.inkSubtle,
    letterSpacing: 0.3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
  },
  tabLabelActive: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: colors.garnet,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: colors.garnet,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.ink,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.inkMuted,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: 'rgba(100,50,30,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardFeatured: {
    shadowColor: colors.garnet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  scanBtn: {
    shadowColor: colors.garnet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
