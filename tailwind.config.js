/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Zinc dark surfaces — matches UI-UX research
        base: '#09090b',
        surface: {
          1: '#111113',
          2: '#1a1a1d',
          3: '#252528',
        },
        // Difficulty
        easy:   { DEFAULT: '#4ade80', dim: 'rgba(74,222,128,0.12)' },
        normal: { DEFAULT: '#60a5fa', dim: 'rgba(96,165,250,0.12)' },
        hard:   { DEFAULT: '#f97316', dim: 'rgba(249,115,22,0.12)' },
        expert: { DEFAULT: '#e879f9', dim: 'rgba(232,121,249,0.12)' },
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.3' }],
        xs:    ['12px', { lineHeight: '1.4' }],
        sm:    ['13px', { lineHeight: '1.5' }],
        base:  ['14px', { lineHeight: '1.5' }],
        lg:    ['16px', { lineHeight: '1.4' }],
        xl:    ['18px', { lineHeight: '1.3' }],
        '2xl': ['22px', { lineHeight: '1.2' }],
        '3xl': ['28px', { lineHeight: '1.1' }],
      },
      height: {
        topbar: '48px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.15)',
        pop:  '0 8px 24px rgba(0,0,0,0.25)',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
