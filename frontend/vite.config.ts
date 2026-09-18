import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
