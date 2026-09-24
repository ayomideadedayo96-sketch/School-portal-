import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#182231',
        navy: {
          50: '#eef2f6',
          100: '#d6e0ea',
          200: '#aec2d6',
          300: '#7f9cba',
          400: '#4f739d',
          500: '#33547c',
          600: '#243d5c',
          700: '#1b3044',
          800: '#152536',
          900: '#101c29',
        },
        gold: {
          50: '#fbf5e8',
          100: '#f3e2b8',
          200: '#e9cc86',
          300: '#dcb35a',
          400: '#c99a3c',
          500: '#ad7f2c',
          600: '#8c6522',
        },
        paper: '#f8f7f3',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
