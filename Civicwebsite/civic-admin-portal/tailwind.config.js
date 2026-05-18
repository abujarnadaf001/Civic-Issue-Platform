/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'aurora':      'aurora 12s ease infinite alternate',
        'fade-up':     'fadeUp 0.6s ease forwards',
        'fade-up-d1':  'fadeUp 0.6s ease 0.1s forwards',
        'fade-up-d2':  'fadeUp 0.6s ease 0.2s forwards',
        'fade-up-d3':  'fadeUp 0.6s ease 0.3s forwards',
        'fade-up-d4':  'fadeUp 0.6s ease 0.4s forwards',
        'fade-up-d5':  'fadeUp 0.6s ease 0.5s forwards',
        'dock-in':     'dockIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        aurora: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dockIn: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
