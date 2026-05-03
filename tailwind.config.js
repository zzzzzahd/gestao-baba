/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Cores base (existentes) ─────────────────────────────
        'cyber-dark':    '#0d0d0d',
        'cyan-electric': '#00f2ff',
        'green-neon':    '#39ff14',
        'danger-red':    '#ff003c',
        'warning-gold':  '#ffbd00',

        // ── Tokens semânticos de texto ──────────────────────────
        // Substituem text-white/N hardcoded em todo o projeto
        'text-high':  'rgba(255,255,255,1.00)',  // labels, valores principais
        'text-mid':   'rgba(255,255,255,0.60)',  // subtítulos, labels secundários
        'text-low':   'rgba(255,255,255,0.35)',  // placeholders, metadados
        'text-muted': 'rgba(255,255,255,0.20)',  // disabled, decorativos

        // ── Tokens semânticos de superfície ────────────────────
        // Substituem bg-white/[N] hardcoded
        'surface-1': 'rgba(255,255,255,0.02)',  // card mais escuro
        'surface-2': 'rgba(255,255,255,0.05)',  // card padrão
        'surface-3': 'rgba(255,255,255,0.10)',  // card destacado / hover

        // ── Tokens semânticos de borda ──────────────────────────
        'border-subtle': 'rgba(255,255,255,0.05)',
        'border-mid':    'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(255,255,255,0.20)',

        // ── Aliases de primary ──────────────────────────────────
        'primary':       '#00f2ff',
        'primary-dim':   'rgba(0,242,255,0.10)',
        'primary-glow':  'rgba(0,242,255,0.30)',
      },

      fontFamily: {
        'sans':     ['Inter', 'sans-serif'],
        'tactical': ['Rajdhani', 'sans-serif'],
        'display':  ['Inter', 'sans-serif'],
      },

      // Tipografia numérica tabulada (placares, contadores, avaliações)
      fontVariantNumeric: { 'tabular': 'tabular-nums' },

      backgroundImage: {
        'gradient-dark':  'radial-gradient(circle at top, #1a1a1a 0%, #000000 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'primary-gradient': 'linear-gradient(135deg, #00f2ff, #0066ff)',
      },

      animation: {
        'glow':        'glow 2s ease-in-out infinite alternate',
        'slide-up':    'slideUp 0.3s ease-out forwards',
        'slide-in':    'slideIn 0.4s ease-out forwards',
        'fade-in':     'fadeIn 0.25s ease-out forwards',
        'pulse-neon':  'pulseNeon 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'check-pop':   'checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },

      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px rgba(0,242,255,0.2)' },
          to:   { boxShadow: '0 0 20px rgba(0,242,255,0.6)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseNeon: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.7', transform: 'scale(0.98)' },
        },
        checkPop: {
          '0%':   { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      boxShadow: {
        'neon-cyan':  '0 0 15px rgba(0,242,255,0.3)',
        'neon-green': '0 0 15px rgba(57,255,20,0.3)',
        'glass':      '0 8px 32px 0 rgba(0,0,0,0.8)',
        'primary-sm': '0 0 12px rgba(0,242,255,0.25)',
      },
    },
  },
  plugins: [],
}
