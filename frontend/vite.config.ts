import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Self-signed HTTPS for local dev -- APIs like Web Share require a secure
  // context and have no fallback, so testing them on a phone over the LAN
  // needs https even locally (not just plain http://<lan-ip>:5173).
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
