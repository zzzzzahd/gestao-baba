import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Fase 5 — Sentry sourcemaps + release tracking + Vitest.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

return {
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.npm_package_version ?? '1.3.0'
    ),
  },

  plugins: [
    react(),
    sentryVitePlugin({
  org: 'zdias',
  project: 'javascript-react',
  authToken: process.env.SENTRY_AUTH_TOKEN,
}),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'logo.png', 'offline.html'],
      manifest: {
        name:             'Draft Play - Gestão de Baba',
        short_name:       'Draft Play',
        description:      'Sistema profissional de gestão de peladas e babas.',
        start_url:        '/',
        scope:            '/',
        display:          'standalone',
        background_color: '#000000',
        theme_color:      '#00f2ff',
        orientation:      'portrait-primary',
        lang:             'pt-BR',
        icons: [
          { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name:      'Próximo Jogo',
            short_name: 'Jogo',
            url:       '/home',
            icons:     [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name:      'Rankings',
            short_name: 'Rankings',
            url:       '/rankings',
            icons:     [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
          },
        ],
        categories:                  ['sports', 'utilities'],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.supabase\.co\/storage/,
            handler:    'NetworkFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'local-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['lucide-react', 'react-hot-toast'],
          'vendor-sentry':   ['@sentry/react'],
        },
      },
    },
  },

  server: {
    port: 3000,
    host: true,
  },

  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/__tests__/setup.js'],
    include:     ['src/**/*.{test,spec}.{js,jsx}', 'src/__tests__/**/*.{test,spec}.{js,jsx}'],
    exclude:     ['node_modules', 'dist'],
    testTimeout: 10000,
    reporters:   process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile:  process.env.CI ? 'test-results/junit.xml' : undefined,
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov', 'html', 'json-summary', 'json'],
      include:   ['src/utils/**', 'src/services/**', 'src/hooks/**', 'src/contexts/**', 'src/components/**'],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
}; });