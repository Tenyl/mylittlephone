import { describe, expect, it } from 'vitest'
import { MAX_PROFILE_IMAGE_BYTES, readProfileImage } from './profile-image'

describe('profile image import', () => {
  it.each([
    ['avatar.png', 'image/png'],
    ['avatar.jpg', 'image/jpeg'],
    ['avatar.webp', 'image/webp'],
  ])('returns a local data URL for %s', async (name, type) => {
    const result = await readProfileImage(new File(['x'], name, { type }))

    expect(result).toBe(`data:${type};base64,eA==`)
  })

  it('rejects unsupported image formats', async () => {
    await expect(readProfileImage(new File(['x'], 'avatar.svg', { type: 'image/svg+xml' })))
      .rejects.toThrow('头像仅支持 PNG、JPEG 或 WebP')
  })

  it('rejects an image above the local storage boundary', async () => {
    const file = new File([new Uint8Array(MAX_PROFILE_IMAGE_BYTES + 1)], 'huge.png', { type: 'image/png' })

    await expect(readProfileImage(file)).rejects.toThrow('头像不能超过 2MB')
  })
})
