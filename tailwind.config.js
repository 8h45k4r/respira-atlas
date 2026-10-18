/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem' },
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Chart and figure labels: tabular, highly legible, never Outfit.
        figure: ['"IBM Plex Sans"', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        navy: {
          50: '#f3f6fa', 100: '#e4eaf3', 200: '#c6d3e6', 300: '#9bb0d1',
          400: '#6c86b6', 500: '#4b659c', 600: '#3a5082', 700: '#2f4069',
          800: '#1f2d4d', 900: '#141f36', 950: '#0b1322',
        },
        slate: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        teal: {
          50: '#effbf9', 100: '#d6f4ef', 200: '#ade8e0', 300: '#7bd5cc',
          400: '#49b9b1', 500: '#2f9d97', 600: '#237e7b', 700: '#1f6563',
          800: '#1d5151', 900: '#1b4344', 950: '#0a2628',
        },
        border: 'hsl(214 28% 88%)',
        input: 'hsl(214 28% 88%)',
        ring: 'hsl(187 58% 34%)',
        background: '#ffffff',
        foreground: '#141f36',
        muted: { DEFAULT: '#f3f6fa', foreground: '#475569' },
        accent: { DEFAULT: '#effbf9', foreground: '#1f6563' },
        destructive: { DEFAULT: '#9f1239', foreground: '#ffffff' },
      },
      borderRadius: { lg: '0.375rem', md: '0.25rem', sm: '0.125rem' },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 140ms ease-out',
        'slide-up': 'slide-up 160ms ease-out',
      },
    },
  },
  plugins: [],
};
