import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        // Sun Orange - Primary CTA, accent & brand highlights
        'sun-orange': {
          DEFAULT: '#FF7A1A',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF7A1A',
          600: '#EA6C13',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        'orange-cta': '#FF7A1A',

        // Aqua - Secondary brand accents, vendor verified badges
        aqua: {
          DEFAULT: '#00B8C8',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#00B8C8',
          600: '#009EAD',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },

        // Coral - Urgency, discounts, errors, alerts
        coral: {
          DEFAULT: '#FF4D6D',
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#FF4D6D',
          600: '#E63D5C',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },

        // Lemon - Warnings, stars, ratings, highlights
        lemon: {
          DEFAULT: '#FFD43B',
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#FFD43B',
          600: '#ECC128',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
        },

        // Ink - High-contrast text, dark surfaces, dialog masks
        ink: {
          DEFAULT: '#0F172A',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },

        // Mist - Ultra-clean backgrounds, light cards
        mist: {
          DEFAULT: '#F8FAFC',
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
        },

        // Catmin & shadcn design tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        pill: '9999px',
        card: '1.25rem',
        modal: '1.5rem',
      },
      backdropBlur: {
        glass: '16px',
        'glass-sm': '8px',
        'glass-lg': '24px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        'glass-pill': '0 4px 16px 0 rgba(0, 0, 0, 0.06)',
        'glass-hover': '0 12px 36px 0 rgba(15, 23, 42, 0.12)',
        'orange-glow': '0 4px 20px 0 rgba(255, 122, 26, 0.35)',
        card: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
      },
      animation: {
        shimmer: 'vendora-shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'vendora-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
