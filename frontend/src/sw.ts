/// <reference lib="webworker" />
import { cleanupOutdatedCaches, matchPrecache, precache } from 'workbox-precaching'
import { getOfflineModeSettings } from './lib/offlineMode'

declare const self: ServiceWorkerGlobalScope

// Populates the precache cache storage only -- deliberately NOT
// precacheAndRoute(), which would also register its own competing `fetch`
// listener. Everything (app shell + the offline-mode gate below) goes
// through the single handler below instead, so there's never a risk of two
// listeners both calling event.respondWith() on the same event.
precache(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// The only domains a request is ever allowed to reach while offline mode is
// on, and only once the admin has explicitly granted the exception (see
// OfflineAuthExceptionModal.tsx) -- Clerk itself (session refresh) and
// Cloudflare Turnstile (Clerk's bot check). Neither ever carries form or
// response data; both are required to keep a signed-in session alive.
const ALLOWED_AUTH_HOSTS = ['concrete-grouse-746.clerk.accounts.dev', 'clerk.formout.se', 'challenges.cloudflare.com']

function isAllowedAuthHost(hostname: string): boolean {
  return ALLOWED_AUTH_HOSTS.includes(hostname) || hostname.endsWith('.protect.clerk.com')
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request))
})

async function handleFetch(request: Request): Promise<Response> {
  const precached = await matchPrecache(request)
  if (precached) return precached

  // Client-side routing (react-router): a navigation to a deep link like
  // /admin/forms/abc/edit isn't itself a precached file, only the app shell
  // (index.html) is -- serve that instead so the router can take over.
  if (request.mode === 'navigate') {
    const shell = await matchPrecache('/index.html')
    if (shell) return shell
  }

  const settings = await getOfflineModeSettings()
  if (!settings.enabled) {
    return fetch(request)
  }

  const url = new URL(request.url)
  if (settings.authExceptionsAllowed && isAllowedAuthHost(url.hostname)) {
    return fetch(request)
  }

  return new Response(null, { status: 503, statusText: 'Blocked by offline mode' })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
