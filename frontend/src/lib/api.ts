import type {
  CellarEntry,
  CellarFilters,
  AddToCellarRequest,
  UpdateCellarEntryRequest,
  PaginatedResponse,
  Wine,
  WineSearchFilters,
  CreateWineRequest,
  Producer,
  Appellation,
  TastingNote,
  CellarStats,
  RecommendationResult,
  CellarOptimizationAdvice,
  LabelScanResult,
  NaturalLanguageQueryRequest,
  PairingRequest,
  PairingResult,
  VintageQuality,
  WishlistEntry,
  Winery,
  UserTasteProfile,
  WineAutocompleteResult,
  VintageChartEntry,
  GeoJSONFeatureCollection,
  WineryMapMarker,
} from '@/types';

// ─── API Client ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}/api/v1${path}`;
  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(response.status, response.statusText, body || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── Cellar ──────────────────────────────────────────────────────────────────

export const cellarApi = {
  list: (token: string, filters?: CellarFilters) =>
    request<PaginatedResponse<CellarEntry>>(
      `/cellar${filters ? buildQuery(filters as Record<string, unknown>) : ''}`,
      { token },
    ),

  add: (token: string, data: AddToCellarRequest) =>
    request<CellarEntry>('/cellar', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: UpdateCellarEntryRequest) =>
    request<CellarEntry>(`/cellar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  remove: (token: string, id: string) =>
    request<void>(`/cellar/${id}`, { method: 'DELETE', token }),

  consume: (token: string, id: string) =>
    request<CellarEntry>(`/cellar/${id}/consume`, { method: 'POST', token }),

  consumeWithDetails: (
    token: string,
    id: string,
    data: { occasion?: string; notes?: string },
  ) =>
    request<CellarEntry>(`/cellar/${id}/consume`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  stats: (token: string) => request<CellarStats>('/cellar/value', { token }),

  getValue: (token: string) => request<CellarStats>('/cellar/value', { token }),

  optimize: (token: string) =>
    request<CellarOptimizationAdvice>('/cellar/optimize', { token }),

  calendar: (token: string) =>
    request<CellarEntry[]>('/cellar/calendar', { token }),
};

// ─── Wines ───────────────────────────────────────────────────────────────────

export const winesApi = {
  search: (token: string, filters?: WineSearchFilters) =>
    request<PaginatedResponse<Wine>>(
      `/wines${filters ? buildQuery(filters as Record<string, unknown>) : ''}`,
      { token },
    ),

  get: (token: string, id: string) => request<Wine>(`/wines/${id}`, { token }),

  create: (token: string, data: CreateWineRequest) =>
    request<Wine>('/wines', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  vintages: (token: string, id: string) =>
    request<VintageQuality[]>(`/wines/${id}/vintages`, { token }),

  naturalLanguageSearch: (token: string, body: NaturalLanguageQueryRequest) =>
    request<Wine[]>('/discover/natural-language', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),

  autocomplete: (token: string, q: string, limit = 8) =>
    request<WineAutocompleteResult[]>(
      `/wines/autocomplete${buildQuery({ q, limit })}`,
      { token },
    ),
};

// ─── Tasting Notes ───────────────────────────────────────────────────────────

export const notesApi = {
  list: (
    token: string,
    params?: { wine_id?: string; page?: number; per_page?: number },
  ) =>
    request<PaginatedResponse<TastingNote>>(
      `/notes${params ? buildQuery(params as Record<string, unknown>) : ''}`,
      { token },
    ),

  get: (token: string, id: string) => request<TastingNote>(`/notes/${id}`, { token }),

  create: (token: string, data: Partial<TastingNote>) =>
    request<TastingNote>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: Partial<TastingNote>) =>
    request<TastingNote>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  amend: (token: string, id: string, text: string) =>
    request<TastingNote>(`/notes/${id}/amend`, {
      method: 'POST',
      body: JSON.stringify({ text }),
      token,
    }),

  blindAnalysis: (token: string, id: string) =>
    request<TastingNote>(`/notes/${id}/blind-analysis`, { token }),

  blindReveal: (token: string, id: string, data: { wine_id: string; vintage: number }) =>
    request<TastingNote>(`/notes/${id}/blind-reveal`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// ─── Producers ───────────────────────────────────────────────────────────────

export const producersApi = {
  search: (token: string, query?: string) =>
    request<PaginatedResponse<Producer>>(
      `/producers${query ? `?query=${encodeURIComponent(query)}` : ''}`,
      { token },
    ),

  get: (token: string, slug: string) =>
    request<Producer>(`/producers/${slug}`, { token }),

  brief: (token: string, slug: string) =>
    request<{ brief: string }>(`/producers/${slug}/brief`, { token }),

  getBrief: (token: string, slug: string) =>
    request<Producer>(`/producers/${slug}/brief`, { token }),
};

// ─── Regions ─────────────────────────────────────────────────────────────────

export const regionsApi = {
  list: (token: string) => request<Appellation[]>('/regions', { token }),

  get: (token: string, slug: string) =>
    request<Appellation>(`/regions/${slug}`, { token }),

  vintageChart: (token: string, slug: string) =>
    request<VintageQuality[]>(`/regions/${slug}/vintage-chart`, { token }),

  getVintageChart: (token: string, slug: string) =>
    request<VintageChartEntry[]>(`/regions/${slug}/vintage-chart`, { token }),

  getWines: (token: string, slug: string) =>
    request<Wine[]>(`/regions/${slug}/wines`, { token }),

  /** GeoJSON FeatureCollection of all appellations with user_status annotations. */
  getGeoJSON: (token: string) =>
    request<GeoJSONFeatureCollection>('/regions/geojson', { token }),
};

// ─── Wineries ────────────────────────────────────────────────────────────────

export const wineriesApi = {
  list: (token: string, filter?: { visit_status?: string }) =>
    request<Winery[]>(
      `/wineries${filter ? buildQuery(filter as Record<string, unknown>) : ''}`,
      { token },
    ),

  /** Lightweight markers for the map layer (no full Winery object). */
  getMapMarkers: (token: string) =>
    request<WineryMapMarker[]>('/wineries/map', { token }),

  add: (token: string, data: Partial<Winery>) =>
    request<Winery>('/wineries', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  create: (token: string, data: Partial<Winery>) =>
    request<Winery>('/wineries', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: Partial<Winery>) =>
    request<Winery>(`/wineries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
};

// ─── Discovery ───────────────────────────────────────────────────────────────

export const discoverApi = {
  recommendations: (
    token: string,
    filters?: { style?: string; limit?: number },
  ) =>
    request<RecommendationResult[]>(
      `/discover/recommendations${filters ? buildQuery(filters as Record<string, unknown>) : ''}`,
      { token },
    ),

  similar: (token: string, wineId: string) =>
    request<RecommendationResult[]>(`/discover/similar/${wineId}`, { token }),

  naturalLanguageSearch: (token: string, query: string) =>
    request<RecommendationResult[]>('/discover/natural-language', {
      method: 'POST',
      body: JSON.stringify({ query }),
      token,
    }),

  valuePicks: (token: string) =>
    request<RecommendationResult[]>('/discover/value-picks', { token }),

  emergingRegions: (token: string) =>
    request<Appellation[]>('/discover/emerging-regions', { token }),
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export const statsApi = {
  dashboard: (token: string) =>
    request<CellarStats>('/stats', { token }),

  palateRadar: (token: string) =>
    request<UserTasteProfile>('/stats/palate-radar', { token }),

  regionsBreakdown: (token: string) =>
    request<Array<{ country: string; region: string; slug: string; bottle_count: number; note_count: number; avg_score: number | null }>>(
      '/stats/regions-breakdown',
      { token },
    ),

  scoreDistribution: (token: string) =>
    request<Array<{ bucket: string; count: number }>>('/stats/score-distribution', {
      token,
    }),

  consumptionRate: (token: string) =>
    request<Array<{ period: string; bottles: number }>>('/stats/consumption-rate', {
      token,
    }),

  criticAgreement: (token: string) =>
    request<Record<string, number>>('/stats/critic-agreement', { token }),

  tasteEvolution: (token: string) =>
    request<Array<{ period: string; acidity: number; tannin: number; body: number; sweetness: number; oak: number }>>(
      '/stats/taste-evolution',
      { token },
    ),

  blindAccuracy: (token: string) =>
    request<{
      overall_pct: number;
      grape_pct: number;
      region_pct: number;
      vintage_pct: number;
      note_count: number;
    }>('/stats/blind-accuracy', { token }),
};

// ─── Pairings ────────────────────────────────────────────────────────────────

export const pairingsApi = {
  fromFood: (token: string, data: PairingRequest) =>
    request<PairingResult>('/pairings/from-food', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  fromWine: (token: string, data: PairingRequest) =>
    request<PairingResult>('/pairings/from-wine', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  tonight: (token: string, data: PairingRequest) =>
    request<PairingResult>('/pairings/tonight', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// ─── Scanner ─────────────────────────────────────────────────────────────────

export const scannerApi = {
  scanLabel: async (token: string, file: File): Promise<LabelScanResult> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/api/v1/scanner/label`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Label scan failed');
    }

    return response.json() as Promise<LabelScanResult>;
  },

  confirm: (token: string, data: LabelScanResult & { wine_id?: string }) =>
    request<Wine>('/scanner/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// ─── Wishlist ────────────────────────────────────────────────────────────────

export const wishlistApi = {
  list: (token: string) => request<WishlistEntry[]>('/wishlist', { token }),

  add: (token: string, data: Partial<WishlistEntry>) =>
    request<WishlistEntry>('/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  create: (token: string, data: Partial<WishlistEntry>) =>
    request<WishlistEntry>('/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: Partial<WishlistEntry>) =>
    request<WishlistEntry>(`/wishlist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  remove: (token: string, id: string) =>
    request<void>(`/wishlist/${id}`, { method: 'DELETE', token }),

  getAlerts: (token: string) =>
    request<WishlistEntry[]>('/wishlist/alerts', { token }),
};

export { ApiError };
