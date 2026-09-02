import type { AppSettings, CharacterCard, ChatSession } from './types'

export interface ResolvedChatProfile {
  userName: string
  userAvatar: string
  characterName: string
  characterAvatar: string
}

export function resolveChatProfile(
  character: CharacterCard,
  chat: ChatSession,
  settings: AppSettings,
): ResolvedChatProfile {
  return {
    userName: settings.userName.trim() || '博士',
    userAvatar: settings.userAvatar || '',
    characterName: chat.characterDisplayName?.trim() || character.name,
    characterAvatar: chat.characterAvatar || character.avatar,
  }
}
