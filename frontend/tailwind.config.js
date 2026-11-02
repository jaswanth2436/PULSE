/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        pulse: {
          primary: '#2563eb',
          teal: '#0d9488',
          amber: '#d97706',
          danger: '#dc2626',
        },
        'pulse-blue': '#2563eb',
        'pulse-teal': '#0d9488',
        'pulse-amber': '#d97706',
        sidebar: {
          bg: '#0f1e35',
          hover: 'rgba(255,255,255,0.06)',
          active: 'rgba(59,130,246,0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-signal': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-in': 'float-in .45s ease-out both',
      },
      keyframes: {
        'float-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        sidebar: '4px 0 24px rgba(0,0,0,0.25)',
        card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'card-md': '0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.05)',
      },
    },
  },
  plugins: [],
};
