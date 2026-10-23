// Mirrors the server's upload rules for quick feedback. The server re-checks
// the real file content, size and pixel dimensions.
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export function checkImageFile(file) {
  if (!file) return 'Choose a photo to upload.'
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WebP photo.'
  if (file.size > MAX_BYTES) return 'Photos must be 5 MB or smaller.'
  return null
}
