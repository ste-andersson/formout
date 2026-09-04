// Absolute backend URL for cross-origin deploys (e.g. frontend and backend as
// separate Railway services). Falls back to '' (relative paths) for local dev,
// where Vite proxies /api, and for same-origin deploys.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
