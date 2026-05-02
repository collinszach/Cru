// WSET-derived tasting vocabulary — static, never fetched from API.
// All structured descriptor data for tasting notes lives here.

export type DescriptorTier = 'primary' | 'secondary' | 'tertiary'
export type DescriptorIntensity = 'light' | 'medium' | 'pronounced'

export interface DescriptorItem {
  tier: DescriptorTier
  descriptor: string
  intensity?: DescriptorIntensity
}

// ─── Primary Descriptors ──────────────────────────────────────────────────────
// Fruit-forward, floral, herbal — direct from grape and fermentation

export const PRIMARY_DESCRIPTORS = {
  fruit: {
    label: 'Fruit',
    subcategories: {
      red_fruit: {
        label: 'Red Fruit',
        descriptors: [
          'red cherry', 'sour cherry', 'raspberry', 'strawberry',
          'redcurrant', 'cranberry', 'pomegranate', 'red plum',
        ],
      },
      black_fruit: {
        label: 'Black Fruit',
        descriptors: [
          'blackcurrant', 'blackberry', 'blueberry', 'black cherry',
          'black plum', 'damson', 'mulberry', 'boysenberry',
        ],
      },
      tropical: {
        label: 'Tropical',
        descriptors: [
          'pineapple', 'mango', 'papaya', 'passion fruit',
          'lychee', 'guava', 'banana', 'coconut',
        ],
      },
      citrus: {
        label: 'Citrus',
        descriptors: [
          'lemon', 'lime', 'grapefruit', 'orange', 'bergamot',
          'lemon zest', 'orange peel', 'mandarin',
        ],
      },
      stone_fruit: {
        label: 'Stone Fruit',
        descriptors: [
          'peach', 'nectarine', 'apricot', 'white peach',
          'yellow plum', 'greengage', 'mirabelle',
        ],
      },
      dried_fruit: {
        label: 'Dried Fruit',
        descriptors: [
          'raisin', 'prune', 'fig', 'date', 'dried apricot',
          'sultana', 'dried cherry', 'dried cranberry',
        ],
      },
      orchard_fruit: {
        label: 'Orchard Fruit',
        descriptors: [
          'apple', 'pear', 'quince', 'green apple', 'golden apple',
          'Williams pear', 'cooking apple',
        ],
      },
    },
  },
  floral: {
    label: 'Floral',
    subcategories: {
      floral: {
        label: 'Floral',
        descriptors: [
          'violet', 'rose', 'jasmine', 'elderflower', 'orange blossom',
          'acacia', 'lavender', 'geranium', 'iris', 'peony',
          'blossom', 'honeysuckle',
        ],
      },
    },
  },
  herbal_vegetal: {
    label: 'Herbal/Vegetal',
    subcategories: {
      green_herbal: {
        label: 'Green & Herbal',
        descriptors: [
          'grass', 'green pepper', 'tomato leaf', 'nettle', 'mint',
          'eucalyptus', 'bay leaf', 'tarragon', 'thyme', 'rosemary',
          'sage', 'fennel', 'dill',
        ],
      },
      vegetal: {
        label: 'Vegetal',
        descriptors: [
          'asparagus', 'artichoke', 'cabbage', 'mushroom',
          'truffle', 'olive', 'celery',
        ],
      },
    },
  },
  spice: {
    label: 'Spice',
    subcategories: {
      spice: {
        label: 'Spice',
        descriptors: [
          'black pepper', 'white pepper', 'clove', 'cinnamon', 'nutmeg',
          'allspice', 'cardamom', 'anise', 'star anise', 'liquorice',
          'ginger', 'cumin', 'juniper',
        ],
      },
    },
  },
  mineral: {
    label: 'Mineral',
    subcategories: {
      mineral: {
        label: 'Mineral',
        descriptors: [
          'flint', 'gunflint', 'wet stone', 'slate', 'chalk',
          'oyster shell', 'limestone', 'graphite', 'iodine', 'saline',
          'volcanic', 'petrichor',
        ],
      },
    },
  },
  earthy: {
    label: 'Earthy',
    subcategories: {
      earthy: {
        label: 'Earthy',
        descriptors: [
          'earth', 'forest floor', 'loam', 'clay', 'gravel',
          'damp soil', 'compost', 'undergrowth',
        ],
      },
    },
  },
  other: {
    label: 'Other',
    subcategories: {
      other: {
        label: 'Other',
        descriptors: [
          'honey', 'wax', 'lanolin', 'yeast', 'bread dough',
          'cream', 'butter', 'milk',
        ],
      },
    },
  },
} as const

// ─── Secondary Descriptors ────────────────────────────────────────────────────
// From winemaking: lees contact, MLF, oak treatment

export const SECONDARY_DESCRIPTORS = {
  lees: {
    label: 'Lees Contact',
    subcategories: {
      lees: {
        label: 'Lees',
        descriptors: [
          'biscuit', 'brioche', 'bread', 'yeast', 'sourdough',
          'toast', 'cracker', 'pastry', 'autolytic',
        ],
      },
    },
  },
  mlf: {
    label: 'Malolactic Fermentation',
    subcategories: {
      mlf: {
        label: 'MLF',
        descriptors: [
          'butter', 'cream', 'creme brulee', 'buttermilk',
          'yoghurt', 'cheese rind', 'lactic',
        ],
      },
    },
  },
  oak: {
    label: 'Oak',
    subcategories: {
      new_oak: {
        label: 'New Oak',
        descriptors: [
          'vanilla', 'cedar', 'sandalwood', 'coconut', 'new wood',
          'oak', 'sawdust', 'resinous',
        ],
      },
      seasoned_oak: {
        label: 'Seasoned Oak',
        descriptors: [
          'chocolate', 'mocha', 'coffee', 'caramel', 'toffee',
          'fudge', 'marzipan', 'tobacco',
        ],
      },
      heavily_toasted: {
        label: 'Heavily Toasted',
        descriptors: [
          'char', 'smoke', 'dark chocolate', 'espresso', 'tar',
          'charcoal', 'burnt wood', 'campfire',
        ],
      },
    },
  },
} as const

// ─── Tertiary Descriptors ─────────────────────────────────────────────────────
// Age and development: oxidative, reductive, evolved fruit, earthy/complex

export const TERTIARY_DESCRIPTORS = {
  oxidative: {
    label: 'Oxidative',
    subcategories: {
      oxidative: {
        label: 'Oxidative',
        descriptors: [
          'dried nuts', 'walnut', 'almond', 'hazelnut', 'toffee',
          'caramel', 'dried fruit', 'orange marmalade', 'rancio',
          'maderised', 'sherry-like',
        ],
      },
    },
  },
  reductive: {
    label: 'Reductive',
    subcategories: {
      reductive: {
        label: 'Reductive',
        descriptors: [
          'reduction', 'struck match', 'rubber', 'flint',
          'gun smoke', 'sulphur', 'petrol', 'kerosene',
        ],
      },
    },
  },
  fruit_development: {
    label: 'Fruit Development',
    subcategories: {
      fruit_development: {
        label: 'Evolved Fruit',
        descriptors: [
          'dried cherry', 'dried plum', 'fig jam', 'prune',
          'leather', 'tobacco', 'pot pourri', 'dried rose',
          'dried violet', 'potpourri', 'jam',
        ],
      },
    },
  },
  earthy_tertiary: {
    label: 'Earthy/Tertiary',
    subcategories: {
      earthy_tertiary: {
        label: 'Tertiary Earthy',
        descriptors: [
          'sous-bois', 'forest floor', 'game', 'leather', 'saddle',
          'earth', 'truffle', 'mushroom', 'iron', 'blood', 'barnyard',
          'brett', 'cigar box',
        ],
      },
    },
  },
} as const

export const ALL_DESCRIPTORS = {
  primary: PRIMARY_DESCRIPTORS,
  secondary: SECONDARY_DESCRIPTORS,
  tertiary: TERTIARY_DESCRIPTORS,
} as const

// ─── Palate Structure Values ──────────────────────────────────────────────────

export const SWEETNESS_LEVELS = [
  'bone_dry', 'dry', 'off_dry', 'medium_dry', 'medium_sweet', 'sweet', 'luscious',
] as const

export const ACIDITY_LEVELS = ['low', 'medium-', 'medium', 'medium+', 'high'] as const

export const TANNIN_LEVELS = ['low', 'medium-', 'medium', 'medium+', 'high'] as const

export const BODY_LEVELS = ['light', 'medium-', 'medium', 'medium+', 'full'] as const

export const ALCOHOL_LEVELS = ['low', 'medium', 'high'] as const

export const FINISH_LEVELS = ['short', 'medium', 'long', 'very_long'] as const

export const TANNIN_NATURES = [
  'fine', 'silky', 'velvety', 'firm', 'grippy', 'drying', 'astringent',
] as const

export const NOSE_INTENSITY_LEVELS = [
  'light', 'medium-', 'medium', 'medium+', 'pronounced',
] as const

export const PALATE_INTENSITY_LEVELS = [
  'light', 'medium-', 'medium', 'medium+', 'pronounced',
] as const

export const NOSE_DEVELOPMENT_LEVELS = [
  'youthful', 'developing', 'mature', 'tired',
] as const

export const MOUSSE_LEVELS = ['delicate', 'creamy', 'aggressive'] as const

// ─── Wine Faults ─────────────────────────────────────────────────────────────

export const WINE_FAULTS = [
  { value: 'TCA', label: 'TCA (Cork taint)' },
  { value: 'oxidation', label: 'Oxidation' },
  { value: 'reduction', label: 'Reduction' },
  { value: 'brett', label: 'Brettanomyces' },
  { value: 'VA', label: 'Volatile acidity' },
  { value: 'heat_damage', label: 'Heat damage / cooked' },
  { value: 'refermentation', label: 'Refermentation' },
  { value: 'SO2', label: 'Excess SO₂' },
  { value: 'light_strike', label: 'Light strike' },
  { value: 'other', label: 'Other fault' },
] as const

// ─── Readable Label Maps ──────────────────────────────────────────────────────

export const SWEETNESS_LABELS: Record<string, string> = {
  bone_dry: 'Bone Dry',
  dry: 'Dry',
  off_dry: 'Off-Dry',
  medium_dry: 'Medium-Dry',
  medium_sweet: 'Medium-Sweet',
  sweet: 'Sweet',
  luscious: 'Luscious',
}

export const ACIDITY_LABELS: Record<string, string> = {
  'low': 'Low',
  'medium-': 'Medium−',
  'medium': 'Medium',
  'medium+': 'Medium+',
  'high': 'High',
}

export const TANNIN_LABELS: Record<string, string> = {
  'low': 'Low',
  'medium-': 'Medium−',
  'medium': 'Medium',
  'medium+': 'Medium+',
  'high': 'High',
}

export const BODY_LABELS: Record<string, string> = {
  'light': 'Light',
  'medium-': 'Medium−',
  'medium': 'Medium',
  'medium+': 'Medium+',
  'full': 'Full',
}

export const FINISH_LABELS: Record<string, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  very_long: 'Very Long',
}

export const ACIDITY_DESCRIPTIVE: Record<string, string> = {
  'low': 'Flat',
  'medium-': 'Soft',
  'medium': 'Crisp',
  'medium+': 'Bright',
  'high': 'Zesty',
}

export const TANNIN_DESCRIPTIVE: Record<string, string> = {
  'low': 'Silky',
  'medium-': 'Smooth',
  'medium': 'Firm',
  'medium+': 'Grippy',
  'high': 'Drying',
}

export const BODY_DESCRIPTIVE: Record<string, string> = {
  'light': 'Light',
  'medium-': 'Light-Medium',
  'medium': 'Medium',
  'medium+': 'Medium-Full',
  'full': 'Full-Bodied',
}

export const FINISH_DESCRIPTIVE: Record<string, string> = {
  short: '< 5 sec',
  medium: '5–10 sec',
  long: '10–15 sec',
  very_long: '15 sec+',
}

// ─── Score Labels ─────────────────────────────────────────────────────────────

export function getScoreLabel(score: number, system: '100pt' | '20pt' | '5star'): string {
  if (system === '100pt') {
    if (score >= 97) return 'Exceptional'
    if (score >= 93) return 'Outstanding'
    if (score >= 90) return 'Very Good+'
    if (score >= 87) return 'Very Good'
    if (score >= 83) return 'Good+'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Acceptable'
    return 'Below Average'
  }

  if (system === '20pt') {
    if (score >= 19.5) return 'Exceptional'
    if (score >= 18.5) return 'Outstanding'
    if (score >= 17.5) return 'Very Good+'
    if (score >= 16.5) return 'Very Good'
    if (score >= 15.5) return 'Good+'
    if (score >= 14) return 'Good'
    if (score >= 12) return 'Acceptable'
    return 'Below Average'
  }

  // 5star
  if (score >= 4.5) return 'Exceptional'
  if (score >= 4) return 'Outstanding'
  if (score >= 3.5) return 'Very Good'
  if (score >= 3) return 'Good'
  if (score >= 2) return 'Acceptable'
  return 'Below Average'
}

// ─── Tier Colors ──────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<DescriptorTier, string> = {
  primary: '#8b1a2e',   // garnet
  secondary: '#c9a84c', // gold
  tertiary: '#8b7d74',  // muted
}

export const TIER_LABELS: Record<DescriptorTier, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
}
