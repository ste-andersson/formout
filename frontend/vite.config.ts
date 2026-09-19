import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest, not the default generateSW -- offline mode needs its
      // own custom fetch logic (default-deny + a narrow, consent-gated
      // allowlist, see src/sw.ts), not just Workbox's built-in cache
      // strategies.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      // devOptions.enabled would in theory let the service worker run under
      // `npm run dev` too -- tried it, but dev-mode registration depends on
      // a Vite HMR round-trip (registerDevSW()) that didn't complete
      // reliably here. Left disabled: `npm run build && npm run preview`
      // (same build output as production) is the reliable way to test/demo
      // offline mode's enforcement, not `npm run dev`.
      manifest: {
        name: 'Formout',
        short_name: 'Formout',
        description: 'Digitala formulär från fotograferade pappersformulär',
        // Matches the default (terracotta) color scheme -- manifest colors
        // are static and can't follow the in-app theme picker.
        theme_color: '#ab4f2c',
        background_color: '#fbf6ee',
        display: 'standalone',
        start_url: '/',
        icons: [
          // Only source art available today is this 256x256 logo mark --
          // declared at its real size rather than claiming a 512x512 that
          // doesn't exist. Swap in a proper 512x512 asset if/when one exists.
          { src: '/favicon.png', sizes: '256x256', type: 'image/png' },
        ],
      },
      injectManifest: {
        // The default glob patterns missed .webp (the header logo images),
        // which then got 503'd by the offline-mode gate in src/sw.ts like
        // any other non-precached request -- explicit list of every
        // extension actually present in the build output instead of relying
        // on the default set.
        globPatterns: ['**/*.{css,html,js,png,svg,webmanifest,webp}'],
        // The app shell itself is small; keep the default glob patterns but
        // raise the per-file size limit slightly for the largest JS chunk.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
    // Vite rejects requests whose Host header isn't recognized, to guard
    // against DNS-rebinding attacks -- a Cloudflare quick tunnel forwards
    // the real public hostname (a fresh random *.trycloudflare.com
    // subdomain each time it's started), so it needs an explicit allowance
    // here. Suffix-wildcarded so it keeps working across tunnel restarts
    // without editing this again each time.
    allowedHosts: ['.trycloudflare.com'],
  },
})
