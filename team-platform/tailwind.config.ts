import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14120F',
        paper: '#F6F2EA',
        cream: '#FBF8F2',
        ember: { DEFAULT: '#DE4B1F', dark: '#B93A13', soft: '#FBEAE2' },
        moss: { DEFAULT: '#1F6B4A', soft: '#E4F1E9' },
        sand: '#E7DFD2',
        muted: '#6E675C',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(20,18,15,0.04), 0 12px 36px -18px rgba(20,18,15,0.25)',
        lift: '0 24px 60px -28px rgba(20,18,15,0.35)',
      },
      borderRadius: { xl2: '1.15rem' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: { rise: 'rise .35s ease both', fade: 'fade .25s ease both' },
    },
  },
  plugins: [],
}

export default config
