import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cru: {
          bg:               '#F8F5F0',
          surface:          '#FFFFFF',
          'surface-raised': '#F3EFE9',
          border:           '#E2DAD0',
          'border-strong':  '#C8BDB0',
          text:             '#1C1410',
          'text-muted':     '#7A6E65',
          'text-subtle':    '#A89D94',
          accent: {
            garnet: '#6B1929',
            gold:   '#8B7355',
            straw:  '#B8A48A',
            slate:  '#6B7280',
          },
        },
        wine: {
          red:       '#6B1929',
          white:     '#8B7355',
          rose:      '#B86B6B',
          orange:    '#B86B2E',
          sparkling: '#4A7090',
          fortified: '#6B4A1A',
        },
        status: {
          'not-ready':  '#9CA3AF',
          approaching:  '#A08030',
          'in-window':  '#2D6B45',
          peak:         '#6B1929',
          'past-peak':  '#8B7A6A',
          declining:    '#8B4040',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        ui:      ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        sidebar: '200px',
      },
      borderRadius: {
        sm:      '2px',
        DEFAULT: '4px',
        md:      '6px',
        lg:      '8px',
        xl:      '12px',
      },
      boxShadow: {
        sm:            '0 1px 3px rgba(28,20,16,0.06)',
        DEFAULT:       '0 2px 8px rgba(28,20,16,0.08)',
        md:            '0 4px 16px rgba(28,20,16,0.10)',
        lg:            '0 8px 32px rgba(28,20,16,0.12)',
        'claret-ring': '0 0 0 3px rgba(107,25,41,0.12)',
        'gold-glow':   '0 0 12px 2px rgba(139,115,85,0.15)',
        'warm-sm':     '0 1px 3px rgba(28,20,16,0.06)',
        warm:          '0 2px 8px rgba(28,20,16,0.08)',
        'warm-lg':     '0 8px 32px rgba(28,20,16,0.12)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer:    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, #E2DAD0 25%, #F3EFE9 50%, #E2DAD0 75%)',
      },
    },
  },
  plugins: [],
};

export default config;
