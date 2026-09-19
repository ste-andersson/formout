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

// Google Fonts: cache-first, forever, in its own cache -- these are static,
// user-independent files (the app's typeface), never form data, so once
// fetched at least once during a normal online visit they stay usable
// offline indefinitely. Deliberately NOT fetched live while offline mode is
// on and nothing's cached yet -- that would quietly add a second unstated
// exception to the "all other network calls stay blocked" promise the
// consent modal makes.
const GOOGLE_FONTS_CACHE = 'google-fonts'
const GOOGLE_FONTS_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

async function handleGoogleFontsRequest(request: Request, offlineModeEnabled: boolean): Promise<Response> {
  const cache = await caches.open(GOOGLE_FONTS_CACHE)
  // Google Fonts' CSS response varies by User-Agent (different font formats
  // per browser) -- Cache.match() respects that Vary header by default, so a
  // lookup can miss even right after a successful put() if the request
  // headers differ at all between the two calls. ignoreVary makes this a
  // plain URL match, which is what we actually want here.
  const cached = await cache.match(request, { ignoreVary: true })
  if (cached) return cached

  if (offlineModeEnabled) {
    return new Response(null, { status: 503, statusText: 'Blocked by offline mode' })
  }

  const response = await fetch(request)
  // The <link> for the CSS has no `crossorigin` attribute (browsers don't
  // need one to just apply a stylesheet), and the @font-face files it
  // references are fetched the same way -- both come back as "opaque"
  // responses here: status 0, response.ok always false, since the SW isn't
  // allowed to inspect a cross-origin no-cors response. Caching opaque
  // responses is fine (the browser can still use them); response.ok is
  // simply never a usable signal for this request type, so opaque is
  // accepted alongside a normal ok response instead.
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone())
  }
  return response
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
  const url = new URL(request.url)

  if (GOOGLE_FONTS_HOSTS.includes(url.hostname)) {
    return handleGoogleFontsRequest(request, settings.enabled)
  }

  if (!settings.enabled) {
    return fetch(request)
  }

  const isOwnBackendCall = url.origin === self.location.origin && url.pathname.startsWith('/api/')

  // Same-origin requests are always the app's own code/assets -- never where
  // form data goes -- except calls to our own backend API, which is exactly
  // where it would go. Allowed regardless of precache completeness, since
  // `npm run dev` never has a real precache the way a production build does
  // (Vite serves hundreds of individual unbundled module files instead), and
  // relying on precache alone would otherwise block the app's own code the
  // moment offline mode is turned on there.
  if (url.origin === self.location.origin && !isOwnBackendCall) {
    return fetch(request)
  }

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
