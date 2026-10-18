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
        /*
         * Oxford blue. #002147 is the primary; the scale is built around it so
         * the brand colour is a real working step, not a one-off accent bolted
         * onto a generic grey UI.
         */
        oxford: {
          50: '#f2f6fa', 100: '#e2eaf3', 200: '#c3d3e6', 300: '#9ab3d2',
          400: '#6a8cb8', 500: '#44679c', 600: '#2a4c7f', 700: '#153663',
          800: '#002147', 900: '#001734', 950: '#000e21',
        },
        /*
         * Brass. The secondary, used for interaction, annotation and anything
         * that must stay legible on top of a blue choropleth. Navy and brass is
         * a long-standing institutional pairing and, more practically, brass is
         * the one hue that contrasts against every step of the Oxford ramp.
         */
        brass: {
          50: '#fbf7ef', 100: '#f4e9d2', 200: '#e8d1a0', 300: '#d8b468',
          400: '#c5973e', 500: '#a9791f', 600: '#8a5f17', 700: '#6b4813',
          800: '#4a3210', 900: '#2e1f0a',
        },
        /* Neutrals, very slightly warm so they sit with brass rather than fight it. */
        slate: {
          50: '#f8f8f7', 100: '#f0efed', 200: '#e3e1dd', 300: '#c9c6c0',
          400: '#a3a099', 500: '#767370', 600: '#585551', 700: '#42403c',
          800: '#2b2a27', 900: '#1a1917', 950: '#0f0e0d',
        },
        border: '#e3e1dd',
        input: '#d6d3cd',
        ring: '#8a5f17',
        background: '#ffffff',
        foreground: '#001734',
        muted: { DEFAULT: '#f5f6f8', foreground: '#585551' },
        accent: { DEFAULT: '#f4e9d2', foreground: '#6b4813' },
        destructive: { DEFAULT: '#8c2f1b', foreground: '#ffffff' },
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
