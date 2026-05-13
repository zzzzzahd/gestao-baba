/** @type {import('tailwindcss').Config} */
// Fase 2.4 — Tokens semânticos agora apontam para CSS vars,
// permitindo que useAppTheme.js troque dark/light em runtime
// sem rebuild do Tailwind.

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Cores base fixas (não mudam com o tema) ─────────────
        'cyber-dark':    '#0d0d0d',
        'cyan-electric': '#00f2ff',
        'green-neon':    '#39ff14',
        'danger-red':    '#ff003c',
        'warning-gold':  '#ffbd00',
        'primary':       '#00f2ff',
        'primary-dim':   'rgba(0,242,255,0.10)',
        'primary-glow':  'rgba(0,242,255,0.30)',

        // ── Tokens semânticos → CSS vars (trocam com dark/light) ─
        // Texto
        'text-high':  'var(--color-text-primary)',
        'text-mid':   'var(--color-text-mid)',
        'text-low':   'var(--color-text-low)',
        'text-muted': 'var(--color-text-muted)',

        // Superfície
        'surface-1':  'var(--color-bg-surface-1)',
        'surface-2':  'var(--color-bg-surface-2)',
        'surface-3':  'var(--color-bg-surface-3)',

        // Borda
        'border-subtle': 'var(--color-border-subtle)',
        'border-mid':    'var(--color-border-mid)',
        'border-strong': 'var(--color-border-strong)',
      },

      fontFamily: {
        'sans':     ['Inter', 'sans-serif'],
        'tactical': ['Rajdhani', 'sans-serif'],
        'display':  ['Inter', 'sans-serif'],
      },

      fontVariantNumeric: { 'tabular': 'tabular-nums' },

      backgroundImage: {
        'gradient-dark':    'radial-gradient(circle at top, #1a1a1a 0%, #000000 100%)',
        'glass-gradient':   'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'primary-gradient': 'linear-gradient(135deg, #00f2ff, #0066ff)',
      },

      animation: {
        'glow':       'glow 2s ease-in-out infinite alternate',
        'slide-up':   'slideUp 0.3s ease-out forwards',
        'slide-in':   'slideIn 0.4s ease-out forwards',
        'fade-in':    'fadeIn 0.25s ease-out forwards',
        'pulse-neon': 'pulseNeon 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'check-pop':  'checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'page-in':    'pageIn 220ms ease-out both',
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
        pageIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
