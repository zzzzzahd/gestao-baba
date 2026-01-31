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
        'danger-red': '#ff003c',
        'warning-gold': '#ffbd00',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'tactical': ['Rajdhani', 'sans-serif'],
        'display': ['Inter', 'sans-serif'], // Alterado para Inter por compatibilidade, ajuste se tiver Orbitron no index
      },
      backgroundImage: {
        'gradient-dark': 'radial-gradient(circle at top, #1a1a1a 0%, #000000 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-neon': 'pulseNeon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 5px rgba(0, 242, 255, 0.2)' },
          'to': { boxShadow: '0 0 20px rgba(0, 242, 255, 0.6)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseNeon: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.98)' },
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 242, 255, 0.3)',
        'neon-green': '0 0 15px rgba(57, 255, 20, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.8)',
      }
    },
  },
  plugins: [],
}
