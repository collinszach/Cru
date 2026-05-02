# Cru iOS — Phase 1 Design Spec

**Date:** 2026-04-12
**Scope:** Phase 1 — daily-carry features
**Platform:** iPhone only (iOS 26+)
**Stack:** Expo SDK 52 + Expo Router v4 + TanStack Query v5 + MMKV + Clerk

---

## 1. Purpose

A native iPhone app for Cru — personal wine intelligence. Cellar tracking, tasting journal, and label scanning on the go. The backend is the existing FastAPI service running on the user's NUC, accessible via Cloudflare Tunnel.

Phase 1 scope: Cellar, Journal, Scanner, Discover feed, and More (Stats/Settings/Wishlist). Full feature parity with the web app is the goal across three phases; this spec covers Phase 1 only.

---

## 2. Aesthetic Direction

**iOS 26 Liquid Glass, warm mode.**

- **Background:** Warm cream gradient (`#F7F0E8` → `#E4D5C0`) with a subtle garnet blush radial at the top — like light through a glass of red wine
- **Cards:** Frosted glass (`BlurView` with `rgba(255,255,255,0.38)` tint, `backdrop-filter: blur(24px) saturate(180%)`). Elevated/featured cards get stronger opacity and a larger shadow
- **Typography:** SF Pro Display (system) at ultra-thin weight for vintage year heroes (large, garnet). SF Pro Text for all body copy. No custom fonts — the system stack is premium enough at this weight
- **Accent:** Garnet `#8b1a2e` for active states, drinking window badges, score bars. Gold `#c9a84c` for secondary highlights
- **Tab bar:** Liquid glass — transparent blur over whatever scrolls beneath it. Garnet scanner button with white ring halo floats above
- **Motion:** React Native Reanimated 3 spring physics. Deliberate and premium — no bouncy easing. Sheet presentations use standard iOS spring curves
- **Drinking window dots:** Small 8px dot, top-right of every card. Green = peak, gold = approaching, muted = hold

Do not use Inter, purple gradients, flat white cards, or any generic SaaS-style patterns. The app should feel like a private collector's ledger, not a retail wine discovery tool.

---

## 3. Architecture

### Project structure

```
cru-ios/
├── app/
│   ├── _layout.tsx                  # Root: ClerkProvider, QueryProvider
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── _layout.tsx              # Tab bar config
│       ├── cellar/
│       │   ├── index.tsx            # Cellar grid + filters
│       │   ├── [id].tsx             # Bottle detail
│       │   └── intake.tsx           # Add bottle flow
│       ├── journal/
│       │   ├── index.tsx            # Tasting note timeline
│       │   ├── [id].tsx             # Note detail
│       │   └── new.tsx              # Log new note
│       ├── scan.tsx                 # Camera → ScanConfirm sheet
│       ├── discover/
│       │   └── index.tsx            # Recommendation feed
│       └── more/
│           ├── index.tsx            # Stats summary, links
│           └── settings.tsx         # Profile, scoring system, preferences
├── components/
│   ├── cellar/
│   │   ├── BottleCard.tsx           # Glass card: vintage hero, name, window dot
│   │   ├── FilterPillBar.tsx        # Horizontal scrolling filter chips
│   │   ├── DrinkingWindowDot.tsx    # 8px status dot
│   │   └── ConsumptionSheet.tsx     # Bottom sheet: log consumption
│   ├── tasting/
│   │   ├── NoteForm.tsx             # Structured note entry (WSET)
│   │   ├── ScoreInput.tsx           # 100pt / 20pt / 5-star
│   │   └── DescriptorPicker.tsx     # Aroma/palate vocabulary picker
│   ├── scanner/
│   │   ├── CameraView.tsx           # expo-camera fullscreen viewfinder
│   │   └── ScanConfirm.tsx          # Review extracted fields, confirm
│   └── ui/
│       ├── GlassCard.tsx            # BlurView card primitive
│       ├── GlassPill.tsx            # Filter pill primitive
│       ├── Sheet.tsx                # Bottom sheet wrapper
│       └── DrinkingWindowBadge.tsx  # Pill badge variant
├── lib/
│   ├── api.ts                       # Typed API client (ported from web)
│   ├── queryClient.ts               # TanStack Query + MMKV persistence
│   └── auth.ts                      # Clerk Expo token helper
└── types/
    └── index.ts                     # Domain types (ported from web)
```

### Key dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | SDK 52 | Runtime, targets iOS 26 |
| `expo-router` | v4 | File-based navigation |
| `@tanstack/react-query` | v5 | Server state + offline cache |
| `@tanstack/query-sync-storage-persister` | v5 | MMKV persistence adapter (sync) |
| `react-native-mmkv` | latest | Fast synchronous KV store |
| `@clerk/clerk-expo` | latest | Auth + JWT for API calls |
| `react-native-reanimated` | v3 | Spring animations |
| `expo-blur` | latest | BlurView for glass cards |
| `expo-camera` | latest | Label scanner viewfinder |
| `@expo/vector-icons` | latest | SF Symbol-style icons |

### API client

`lib/api.ts` is a direct port of the web frontend's API client. Same typed functions, same endpoints, same domain types. Auth token injected via `getToken()` from Clerk Expo SDK. Base URL from `EXPO_PUBLIC_API_URL` env variable (points to `https://api.cru.yourdomain.com`).

---

## 4. Navigation

**Tab bar:** Cellar · Journal · [Scan] · Discover · More

```
(tabs)/
  cellar/     → Cellar grid, filter by region/style/readiness
  journal/    → Chronological tasting note timeline
  scan        → Camera fullscreen, no nested navigation
  discover/   → Recommendation feed + NL search
  more/       → Stats overview, Wishlist, Pairings, Settings
```

- Scan tab is a fullscreen camera — no header, no nested stack. On capture it presents `ScanConfirm` as a modal sheet
- More tab is a simple list screen linking to sub-screens, not a nested tab
- All stack navigators use standard iOS push/pop with the default glass navigation bar (iOS 26 native)
- Deep links: `cru://cellar/:id`, `cru://journal/:id`

---

## 5. Screens — Phase 1

### 5.1 Cellar (`cellar/index.tsx`)

**Layout:** Vertical scroll list with a featured top card (most urgent drinking window) followed by standard glass cards. No masonry grid — single column is correct for mobile.

**Filter pills:** Horizontal scroll row below the navigation bar. Options: All, In Window, Approaching, On Hold, by region (dynamic from cellar contents). Active pill is garnet-filled; inactive pills are glass.

**BottleCard contents:**
- Vintage year: large thin SF Pro Display, garnet
- Wine name: medium weight, dark
- Producer · Region: caption, warm gray
- Drinking window dot: top-right corner
- Quantity badge: bottom-right if > 1 bottle

**Featured card (top):** First `peak` or `in_window` bottle. Larger card with stats row: Score · Bottles · Drink By. Garnet "PEAK" / "DRINK NOW" badge.

**Pull to refresh:** Refetches cellar. Offline state shows cached data with a subtle "last updated" note in the header.

**FAB-style add button:** Garnet `+` button, bottom-right, above tab bar. Opens `cellar/intake.tsx` as a full-screen modal.

### 5.2 Bottle Detail (`cellar/[id].tsx`)

**Layout:** Scroll view with large header region (label photo if available, else a wine-colored gradient with the vintage year enormous behind the wine name).

**Sections:**
1. Header: vintage, wine name, producer, region, appellation
2. Drinking window: visual timeline bar, status badge, recommendation text
3. Your notes: last 3 tasting notes with score and date, "See all" link
4. Cellar info: quantity, bin location, purchase price, purchase date
5. Food pairings: 3 AI suggestions (lazy-loaded, cached 7 days)
6. Actions: Consume bottle (sheet), Edit, Add note

**Swipe-to-consume:** Left swipe on the card in the cellar list opens the `ConsumptionSheet` directly without navigating away.

### 5.3 Add Bottle (`cellar/intake.tsx`)

**Flow:** Two steps presented as a paged scroll, not separate screens.

1. **Find wine:** Search autocomplete (`/api/v1/wines/autocomplete`). If not found, "Add manually" expands inline fields (name, producer, appellation, style, vintage).
2. **Purchase details:** Vintage (if not from wine record), quantity, format, purchase price, purchase date, bin location, notes.

Submit → POST `/api/v1/cellar` → dismiss modal → cellar refreshes with the new bottle visible.

### 5.4 Journal (`journal/index.tsx`)

**Layout:** Chronological timeline. Each entry shows: tasting date (SF Pro Display italic, large, garnet), wine name, score pill, first 2 aroma descriptors as small chips.

**NoteCard tap:** Navigate to `journal/[id].tsx` — full note detail with all structured fields displayed read-only, amendments list, AI-enhanced prose note.

### 5.5 Log Note (`journal/new.tsx`)

Full WSET-structured tasting note form, optimized for mobile:

- Appearance: color swatch grid (tap to select)
- Nose: descriptor picker — accordion by tier (Primary / Secondary / Tertiary). Search filter at top
- Palate: sliders for acidity, tannin, body, finish
- Score: large tap target, adapts to user's scoring system (100pt / 20pt / 5-star)
- Free text: single large textarea at the bottom
- Submit → POST `/api/v1/notes` → back to Journal

Wine selector at top of form — search autocomplete or link from a cellar entry.

### 5.6 Scanner (`scan.tsx`)

Fullscreen camera with:
- Garnet corner brackets as viewfinder guide
- "Point at a wine label" instruction text
- Tap to capture (or auto-capture when label fills the frame)
- On capture → present `ScanConfirm` as a bottom sheet (60% height, can expand full)

`ScanConfirm` shows:
- Thumbnail of captured image (left)
- Extracted fields (right): producer, wine name, vintage, appellation, style
- Confidence indicators on uncertain fields (light gold tint)
- "Find in database" button → autocomplete search to link to existing wine record
- "Add to cellar" / "Log tasting note" action buttons

### 5.7 Discover (`discover/index.tsx`)

**Layout:** Feed of recommendation cards. Each card: wine name, region, similarity reason (one line, italic), similarity percentage pill.

**NL search bar** at the top: text input → POST `/api/v1/discover/natural-language` → results replace feed temporarily.

**Profile gate:** If user has fewer than 3 tasting notes, show an empty state explaining the recommendations engine needs more notes to calibrate.

### 5.8 More (`more/index.tsx`)

Simple list screen with glass card sections:

- **Stats:** Cellar count, total notes, top region, avg score — tappable row leading to a full stats screen (Phase 2 detail)
- **Wishlist:** Count badge, tap to full wishlist list screen
- **Pairings:** "What goes with dinner tonight?" entry point
- **Settings:** Scoring system, home country, Clerk account, sign out

---

## 6. Offline Strategy

**Mechanism:** `persistQueryClient` from TanStack Query writes the full query cache to MMKV on every mutation. On app launch, the cache is rehydrated before the first network request.

**Read-only offline:** All GET queries (cellar, notes, discover) serve from cache when the network is unavailable. Stale time: 10 minutes. Cache time: 7 days.

**Write offline:** Mutations (add bottle, consume, log note) are **not** queued offline — they fail gracefully with an inline error state ("You're offline — save your note and try again when connected"). Notes in progress are stored in MMKV as drafts until submitted.

**Network status banner:** A thin gold banner at the top of the screen when offline. Dismisses automatically when connection is restored and cache is refreshed.

**Note drafts:** The note form auto-saves to MMKV every 30 seconds. On reopen, prompts to restore the draft.

---

## 7. Auth

Clerk Expo SDK. On app launch:
- `ClerkProvider` wraps the root layout
- `useAuth()` determines route: push to `(auth)/login` if unauthenticated
- `getToken()` is called per-request in `api.ts` — tokens are cached by Clerk for 60s
- `/api/v1/me/sync` is called once per app session (AsyncStorage guard, same pattern as web `UserSyncProvider`)

---

## 8. Out of Scope — Phase 1

These features are designed for Phase 2 and Phase 3:

- Wine region map (MapLibre React Native)
- Blind tasting mode
- Cellar optimizer (Claude)
- Full stats / palate radar / taste evolution
- Featured bottles editorial view
- CellarTracker CSV import
- Food pairing engine (full)
- Winery visit tracking

---

## 9. Phase 1 Deliverables

1. `cru-ios/` Expo project with Expo Router, TanStack Query, MMKV, Clerk configured
2. `lib/api.ts` + `lib/queryClient.ts` + `types/index.ts` ported from web
3. All screens listed in Section 5 (Cellar, Bottle Detail, Add Bottle, Journal, Note Detail, Log Note, Scanner, Discover, More/Settings)
4. All components listed in the project structure (Section 3)
5. Glass UI primitives (`GlassCard`, `GlassPill`, `Sheet`)
6. Offline cache + draft save
7. Auth flow (login, register, session sync)
8. `.env.example` with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
