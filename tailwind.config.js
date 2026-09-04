/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#eab308',
          500: '#a16207',
        },
        surface: {
          light: '#fafaf9',
          DEFAULT: '#f5f5f4',
          dark: '#e7e5e4',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans SC',
          'sans-serif',
        ],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06)',
        'card-hover': '0 2px 6px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.10)',
        'card-lg': '0 2px 4px rgba(0,0,0,.03), 0 12px 28px rgba(0,0,0,.08)',
        'btn': '0 1px 2px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
