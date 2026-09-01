import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from '../domain/chatReducer'
import { loadPersistedState, savePersistedState, STORAGE_KEY } from './storage'

describe('browser persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips only durable application state', () => {
    const state = createInitialState()
    savePersistedState(localStorage, state)
    const loaded = loadPersistedState(localStorage)

    expect(loaded?.character.name).toBe('林予泽')
    expect(loaded?.messages).toHaveLength(12)
    expect(loaded).not.toHaveProperty('activePanel')
    expect(loaded).not.toHaveProperty('generation')
  })

  it('returns null when local data is malformed instead of breaking startup', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    expect(loadPersistedState(localStorage)).toBeNull()
  })
})
