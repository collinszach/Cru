// ─── Enums ──────────────────────────────────────────────────────────────────

export type WineStyle =
  | 'red' | 'white' | 'rose' | 'orange' | 'sparkling' | 'champagne'
  | 'cremant' | 'prosecco' | 'cava' | 'sekt' | 'pet-nat' | 'port'
  | 'sherry' | 'madeira' | 'vin-doux-naturel' | 'marsala' | 'sauternes'
  | 'ice-wine' | 'passito' | 'other-fortified' | 'other-dessert';

export type WineColor = 'red' | 'white' | 'rose' | 'orange' | 'amber';
export type ScoringSystem = '100pt' | '20pt' | '5star';
export type CellarStatus = 'in_cellar' | 'consumed' | 'gifted' | 'lost' | 'sold';
export type DrinkingWindowStatus =
  | 'not_ready' | 'approaching' | 'in_window' | 'peak' | 'past_peak' | 'declining';
export type WineFormat =
  | '187ml' | '375ml' | '500ml' | '750ml' | '1L' | '1.5L' | '3L' | '6L' | '9L' | '12L';
export type BottleCondition = 'perfect' | 'good' | 'unknown' | 'suspect';
export type PurchaseSource = 'winery' | 'retailer' | 'auction' | 'allocation' | 'gift' | 'other';
export type VisitStatus = 'visited' | 'wishlist' | 'skip';
export type NoseCondition = 'clean' | 'faulty';
export type QualityAssessment =
  | 'faulty' | 'poor' | 'acceptable' | 'good' | 'very_good' | 'outstanding';
export type Readiness = 'drink_now' | 'can_wait' | 'not_ready' | 'too_old';

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  home_country: string | null;
  scoring_system: ScoringSystem;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface Appellation {
  id: string;
  name: string;
  country_code: string;
  country: string;
  region: string | null;
  sub_region: string | null;
  classification: string | null;
  climate: string | null;
  soil_types: string[];
  primary_grapes: string[];
  style_notes: string | null;
  vintage_notes: string | null;
  slug: string;
}

export interface Producer {
  id: string;
  name: string;
  country_code: string | null;
  appellation_id: string | null;
  appellation?: Appellation;
  style_notes: string | null;
  natural: boolean;
  organic_cert: string | null;
  biodynamic: boolean;
  website: string | null;
  slug: string;
  ai_summary: string | null;
  updated_at: string;
}

export interface GrapeEntry {
  grape: string;
  pct: number | null;
}

export interface Wine {
  id: string;
  producer_id: string;
  producer?: Producer;
  appellation_id: string;
  appellation?: Appellation;
  name: string;
  full_name: string;
  style: WineStyle;
  color: WineColor | null;
  primary_grapes: GrapeEntry[];
  classification: string | null;
  alcohol_typical: number | null;
  description: string | null;
  slug: string;
  created_at: string;
}

export interface CellarEntry {
  id: string;
  user_id: string;
  wine_id: string;
  wine?: Wine;
  vintage: number;
  quantity: number;
  format: WineFormat;
  purchase_date: string | null;
  purchase_price: number | null;
  currency: string;
  purchase_source: PurchaseSource | null;
  bin_location: string | null;
  condition: BottleCondition;
  provenance_notes: string | null;
  drink_from: number | null;
  drink_by: number | null;
  is_featured: boolean;
  status: CellarStatus;
  consumed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  drinking_window_status?: DrinkingWindowStatus;
  drink_recommendation?: string;
}

export interface NoseDescriptor {
  tier: 'primary' | 'secondary' | 'tertiary';
  descriptor: string;
  intensity: 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced';
}

export interface PalateDescriptor {
  tier: 'primary' | 'secondary' | 'tertiary';
  descriptor: string;
  intensity: 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced';
}

export interface TastingNoteAmendment {
  text: string;
  created_at: string;
}

export interface TastingNote {
  id: string;
  user_id: string;
  wine_id: string;
  wine?: Wine;
  cellar_entry_id: string | null;
  vintage: number;
  tasted_at: string;
  location: string | null;
  occasion: string | null;
  decant_minutes: number | null;
  serve_temp_c: number | null;
  companions: string[];
  app_clarity: 'clear' | 'hazy' | 'cloudy' | null;
  app_intensity: 'pale' | 'medium' | 'deep' | null;
  app_color: string | null;
  app_other: string | null;
  nose_condition: NoseCondition;
  nose_fault: string | null;
  nose_intensity: 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced' | null;
  nose_development: 'youthful' | 'developing' | 'mature' | 'tired' | null;
  nose_descriptors: NoseDescriptor[];
  palate_sweetness:
    | 'bone_dry' | 'dry' | 'off_dry' | 'medium_dry'
    | 'medium_sweet' | 'sweet' | 'luscious' | null;
  palate_acidity: 'low' | 'medium-' | 'medium' | 'medium+' | 'high' | null;
  palate_tannin: 'low' | 'medium-' | 'medium' | 'medium+' | 'high' | null;
  palate_tannin_nature:
    | 'fine' | 'silky' | 'velvety' | 'firm' | 'grippy' | 'drying' | 'astringent' | null;
  palate_alcohol: 'low' | 'medium' | 'high' | null;
  palate_body: 'light' | 'medium-' | 'medium' | 'medium+' | 'full' | null;
  palate_mousse: 'delicate' | 'creamy' | 'aggressive' | null;
  palate_finish: 'short' | 'medium' | 'long' | 'very_long' | null;
  palate_finish_sec: number | null;
  palate_intensity: 'light' | 'medium-' | 'medium' | 'medium+' | 'pronounced' | null;
  palate_descriptors: PalateDescriptor[];
  quality: QualityAssessment | null;
  readiness: Readiness | null;
  drink_from: number | null;
  drink_by: number | null;
  pairing_notes: string | null;
  personal_score: number | null;
  parker_score: number | null;
  spectator_score: number | null;
  jancis_score: number | null;
  free_note: string | null;
  ai_enhanced_note: string | null;
  amendments: TastingNoteAmendment[];
  is_blind: boolean;
  blind_prediction: BlindPrediction | null;
  created_at: string;
}

export interface BlindPrediction {
  probable_grapes: Array<{ grape: string; confidence: number }>;
  probable_regions: Array<{ region: string; confidence: number }>;
  probable_vintage_range: { from: number; to: number };
  quality_tier: string;
  reasoning: string;
  confidence_overall: number;
}

export interface WishlistEntry {
  id: string;
  user_id: string;
  wine_id: string | null;
  wine?: Wine;
  free_text: string | null;
  vintage: number | null;
  priority: 1 | 2 | 3 | 4 | 5;
  reason: string | null;
  source: string | null;
  estimated_price: number | null;
  market_price: number | null;
  added_at: string;
}

export interface VintageQuality {
  id: string;
  appellation_id: string;
  region_slug: string;
  vintage: number;
  score: number | null;
  descriptor: string | null;
  drinking_from: number | null;
  drinking_to: number | null;
  notes: string | null;
  source: string;
  user_notes: number; // count of user's tasting notes for this vintage (from /wines/{id}/vintages)
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export type CreateTastingNoteRequest = Omit<
  TastingNote,
  'id' | 'user_id' | 'created_at' | 'amendments' | 'ai_enhanced_note' | 'blind_prediction' | 'wine'
>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface CellarFilters {
  status?: CellarStatus | 'all';
  style?: WineStyle;
  color?: WineColor;
  readiness?: DrinkingWindowStatus;
  region?: string;
  page?: number;
  per_page?: number;
}

export interface AddToCellarRequest {
  wine_id: string;
  vintage: number;
  quantity: number;
  format?: WineFormat;
  purchase_date?: string;
  purchase_price?: number;
  currency?: string;
  purchase_source?: PurchaseSource;
  bin_location?: string;
  notes?: string;
}

export interface WineAutocompleteResult {
  id: string;
  full_name: string;
  producer_name?: string;
  appellation_name?: string;
  style?: string;
  color?: string;
}

export interface CellarStats {
  total_bottles: number;
  total_value: number;
  currency: string;
  bottles_in_window: number;
  bottles_approaching: number;
  bottles_at_peak: number;
  avg_purchase_price: number;
  regions_count: number;
  producers_count: number;
  // Dashboard stats (from /stats endpoint)
  total_notes?: number;
  avg_score?: number | null;
  unique_regions?: number;
  unique_producers?: number;
  total_cellar_value?: number;
  bottle_count?: number;
}

export interface RecommendationResult {
  wine: Wine;
  similarity_score: number;
  reason: string;
  estimated_price: number | null;
}

export interface LabelScanResult {
  producer: string | null;
  wine_name: string | null;
  appellation: string | null;
  region: string | null;
  country: string | null;
  vintage: number | null;
  grapes: string[];
  alcohol_pct: number | null;
  classification: string | null;
  style: WineStyle | null;
  volume_ml: number | null;
  additional_text: string | null;
  confidence?: 'high' | 'medium' | 'low';
  photo_id?: string;
}

export interface PairingResult {
  suggestions: Array<{ name: string; reason: string; cellar_entry?: CellarEntry }>;
  notes: string;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/** Normalise any score to a 0–1 float for taste-profile weighting. */
export function normalizeScore(score: number, system: ScoringSystem): number {
  switch (system) {
    case '100pt': return Math.max(0, Math.min(1, (score - 50) / 50));
    case '20pt':  return Math.max(0, Math.min(1, (score - 10) / 10));
    case '5star': return Math.max(0, Math.min(1, (score - 1) / 4));
    default: {
      const _exhaustive: never = system;
      throw new Error(`Unhandled ScoringSystem: ${_exhaustive}`);
    }
  }
}
