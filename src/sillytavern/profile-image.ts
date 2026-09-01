export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024

const SUPPORTED_PROFILE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function readProfileImage(file: File): Promise<string> {
  if (!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error('头像仅支持 PNG、JPEG 或 WebP'))
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return Promise.reject(new Error('头像不能超过 2MB'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('头像文件无法读取')))
    reader.readAsDataURL(file)
  })
}
