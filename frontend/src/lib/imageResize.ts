const MAX_DIMENSION = 2000
const JPEG_QUALITY = 0.85
const SKIP_RESIZE_BELOW_BYTES = 2 * 1024 * 1024

// Phone camera photos are routinely 5-15MB, which is both slow to upload on
// mobile data and unnecessarily large for a vision model to read text from.
// PDFs are left untouched -- there's no cheap way to downscale those client-side.
export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= SKIP_RESIZE_BELOW_BYTES) {
    return file
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) return file

    const resizedName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], resizedName, { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })
}
