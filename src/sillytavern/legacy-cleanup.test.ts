import { describe, expect, it } from 'vitest'
import { LEGACY_STORAGE_KEY, removeLegacyDemoState } from './legacy-cleanup'

describe('legacy demo cleanup', () => {
  it('removes only the old seeded chat state', () => {
    const storage = window.localStorage
    storage.clear()
    storage.setItem(LEGACY_STORAGE_KEY, '{"demo":true}')
    storage.setItem('unrelated-preference', 'keep-me')

    removeLegacyDemoState(storage)

    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('unrelated-preference')).toBe('keep-me')
  })
})
