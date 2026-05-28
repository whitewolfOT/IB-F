/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        client:   { DEFAULT: '#1D9E75', light: '#E1F5EE', dark: '#0F6E56' },
        operator: { DEFAULT: '#378ADD', light: '#E6F1FB', dark: '#185FA5' },
        finance:  { DEFAULT: '#BA7517', light: '#FAEEDA', dark: '#854F0B' },
        shariah:  { DEFAULT: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
        comply:   { DEFAULT: '#639922', light: '#EAF3DE', dark: '#3B6D11' },
        danger:   { DEFAULT: '#E24B4A', light: '#FCEBEB', dark: '#A32D2D' },
        master:   { DEFAULT: '#534AB7', light: '#EEEDFE', dark: '#26215C' },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
