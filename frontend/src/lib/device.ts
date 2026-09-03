export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * On touch devices, an open on-screen keyboard shrinks the *visual* viewport
 * without shrinking the *layout* viewport, which corrupts touch coordinates
 * for whatever drag starts next. Call this on pointerdown for a drag handle:
 * if it blurs a focused field (closing the keyboard), the caller should
 * swallow that touch instead of letting it start a drag -- the next touch,
 * once the keyboard has actually closed, will have correct coordinates.
 */
export function blurActiveFieldIfKeyboardOpen(): boolean {
  if (!isTouchDevice()) return false
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    active.blur()
    return true
  }
  return false
}
