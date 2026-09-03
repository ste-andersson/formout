export function isWebShareSupported(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
}

export async function shareFiles(files: File[], title: string): Promise<'shared' | 'cancelled' | 'error' | 'unsupported'> {
  if (!isWebShareSupported() || !navigator.canShare({ files })) {
    return 'unsupported'
  }

  try {
    await navigator.share({ files, title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    return 'error'
  }
}
