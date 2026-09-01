import type { AppState, PersistedState } from '../domain/types'

export const STORAGE_KEY = 'luma-character-chat:v1'

export function toPersistedState(state: AppState): PersistedState {
  return {
    messages: state.messages,
    character: state.character,
    worldBook: state.worldBook,
    presets: state.presets,
    activePresetId: state.activePresetId,
    createdAt: state.createdAt,
    memoryResetAt: state.memoryResetAt,
    backgroundId: state.backgroundId,
  }
}

export function savePersistedState(storage: Storage, state: AppState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)))
}

export function loadPersistedState(storage: Storage): PersistedState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const candidate = value as Partial<PersistedState>
    if (!Array.isArray(candidate.messages) || !candidate.character || !candidate.worldBook || !Array.isArray(candidate.presets)) return null
    if (typeof candidate.activePresetId !== 'string' || typeof candidate.createdAt !== 'string') return null
    return candidate as PersistedState
  } catch {
    return null
  }
}
