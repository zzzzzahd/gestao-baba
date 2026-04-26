import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ARCH-005: substituindo o service-worker manual pelo Workbox gerado automaticamente.
// Benefícios: precaching com hash, atualização automática e score Lighthouse mais alto.

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'logo.png', 'offline.html'],

      // Manifest gerado pelo plugin (substitui public/manifest.json)
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

      // Workbox: estratégia de cache por tipo de recurso
      workbox: {
        // Precache todos os assets gerados pelo Vite (com hash no nome)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Nunca cacheia chamadas ao Supabase ou APIs externas
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],

        runtimeCaching: [
          // Fontes Google: cache por 1 ano
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Font Awesome CDN: cache por 30 dias
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Imagens do Supabase Storage: NetworkFirst com fallback de cache
          {
            urlPattern: /\.supabase\.co\/storage/,
            handler:    'NetworkFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
            },
          },
          // Imagens locais: CacheFirst
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

      // Modo desenvolvimento: desabilita PWA para não interferir no hot-reload
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    port: 3000,
    host: true,
  },
});
