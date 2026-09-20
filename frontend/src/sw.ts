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

// Cache-first, forever, in its own cache -- static-ish assets that are
// never form data, so once fetched at least once during a normal online
// visit they stay usable offline indefinitely: Google Fonts (the app's
// typeface, user-independent) and the signed-in user's Clerk avatar
// (per-user, but still just profile chrome, not form/response data).
// Deliberately NOT fetched live while offline mode is on and nothing's
// cached yet -- that would quietly add an unstated exception to the "all
// other network calls stay blocked" promise the consent modal makes.
// Caveat: if the user changes their Clerk avatar, the old cached image
// keeps being served until it's fetched again online -- acceptable for a
// decorative image, not something to rely on for freshness.
const STATIC_ASSET_CACHE = 'static-assets'
const STATIC_ASSET_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'img.clerk.com']

async function handleStaticAssetRequest(request: Request, offlineModeEnabled: boolean): Promise<Response> {
  const cache = await caches.open(STATIC_ASSET_CACHE)
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
  // Neither the Google Fonts <link> nor Clerk's <img> for the avatar carry a
  // `crossorigin` attribute, so both come back as "opaque" responses here:
  // status 0, response.ok always false, since the SW isn't allowed to
  // inspect a cross-origin no-cors response. Caching opaque responses is
  // fine (the browser can still use them); response.ok is simply never a
  // usable signal for these request types, so opaque is accepted alongside
  // a normal ok response instead.
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

  if (STATIC_ASSET_HOSTS.includes(url.hostname)) {
    return handleStaticAssetRequest(request, settings.enabled)
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
