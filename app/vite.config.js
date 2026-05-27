import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
          react(),
          VitePWA({
                  // injectManifest: nosotros escribimos el SW, Workbox inyecta el precache list
                        strategies: 'injectManifest',
                  srcDir: 'src',
                  filename: 'sw.js',
                  registerType: 'autoUpdate',
                  includeAssets: ['favicon.svg', 'icons/*.png'],

                  // Manifest de la PWA
                  manifest: {
                            name: 'Sierra Padel',
                            short_name: 'Sierra Padel',
                            description: 'Reserva canchas, torneos y puntos de lealtad',
                            theme_color: '#96C800',
                            background_color: '#FAFAFA',
                            display: 'standalone',
                            orientation: 'portrait',
                            scope: '/',
                            start_url: '/',
                            icons: [
                              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                                      ],
                  },

                  // Que archivos precachear
                  injectManifest: {
                            globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
                  },
          }),
        ],
});
