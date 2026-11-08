/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f32',
          900: '#0b0f19',
          950: '#060911',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0071e3', // Stitch Apple vibrant blue
          600: '#0062c4',
          700: '#0052a3',
          800: '#003f7d',
          900: '#1e3a8a',
        },
        accent: {
          50: '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5',
        },
        // Google Stitch Design Tokens
        stitch: {
          bg: '#080c14',
          surface: '#0f1524',
          card: '#131b2e',
          glass: 'rgba(19, 27, 46, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          specular: 'rgba(255, 255, 255, 0.15)',
          blue: '#0071e3',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#06b6d4',
          indigo: '#6366f1',
        },
      },
      borderRadius: {
        'stitch-pill': '980px',
        'stitch-modal': '28px',
        'stitch-card': '20px',
        'stitch-inner': '12px',
      },
      boxShadow: {
        'stitch-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'stitch-glow': '0 0 20px rgba(0, 113, 227, 0.35)',
        'stitch-glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
      },
      transitionTimingFunction: {
        'stitch-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'stitch-snappy': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}
