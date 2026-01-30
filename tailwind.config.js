/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0d0d0d',
        'cyber-card': 'rgba(255, 255, 255, 0.05)',
        'cyan-electric': '#00f2ff',
        'green-neon': '#39ff14',
      },
      fontFamily: {
        'tactical': ['Rajdhani', 'sans-serif'],
        'display': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 5px rgba(0, 242, 255, 0.2)' },
          'to': { boxShadow: '0 0 20px rgba(0, 242, 255, 0.6)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
