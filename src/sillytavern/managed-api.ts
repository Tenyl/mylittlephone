import type { CharacterCard, ChatMessage, ChatPreset, Lorebook } from './types.js'

export const MANAGED_CHAT_ENDPOINT = '/api/chat'
export const MANAGED_CHAT_VERSION = 1 as const
export const BUNDLED_CHARACTER_ID = 'builtin-character-rosmontis'

export interface ManagedChatRequest {
  version: typeof MANAGED_CHAT_VERSION
  characterId: string
  characterName: string
  /** Included only for player-imported characters. The built-in card is always resolved server-side. */
  character?: CharacterCard
  userName: string
  userInput: string
  history: ChatMessage[]
  preset: ChatPreset
  lorebooks: Lorebook[]
  variables: Record<string, unknown>
  formatPrompt: string
}

export function toManagedCharacterPayload(character: CharacterCard): CharacterCard {
  return {
    ...character,
    avatar: '',
    sourceFile: '',
  }
}
