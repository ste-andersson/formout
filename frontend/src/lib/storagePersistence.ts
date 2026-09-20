// Reduces the odds of the browser silently evicting this origin's IndexedDB
// (visitedForms, saved responses, ...) under storage pressure -- most
// browsers grant this automatically for an engaged/installed PWA with no
// prompt at all; Firefox may ask the user once. Does nothing against a
// deliberate user-triggered "clear site data", which no web app can prevent
// -- this only helps against silent, automatic eviction.
export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return
  try {
    const alreadyPersisted = await navigator.storage.persisted()
    if (alreadyPersisted) return
    await navigator.storage.persist()
  } catch {
    // Best-effort -- storage just isn't protected from eviction if this fails.
  }
}
