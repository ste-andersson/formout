const STORAGE_KEY = 'formout:offline-mode'

export function getStoredOfflineMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setStoredOfflineMode(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // localStorage kan vara otillgängligt (privat läge, låsta iframes) -- läget
    // tillämpas ändå för den här sidladdningen, det bara sparas inte till nästa.
  }
}
