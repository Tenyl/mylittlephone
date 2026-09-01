import { describe, expect, it } from 'vitest'
import { getEmptyFirstSettings } from './database'
import type { CharacterCard, ChatSession } from './types'
import { resolveChatProfile } from './chat-profile'

const character = {
  id: 'character-profile', name: '迷迭香', avatar: 'character-avatar',
} as CharacterCard

const chat = {
  id: 'chat-profile', name: '会话', messages: [], characterName: '迷迭香', userName: '用户',
  presetId: null, lorebookIds: [], variables: {}, createdAt: 1, updatedAt: 1,
} satisfies ChatSession

describe('chat display profile', () => {
  it('prefers global player data and current-chat character overrides', () => {
    const settings = { ...getEmptyFirstSettings(), userName: '博士', userAvatar: 'player-avatar' }

    expect(resolveChatProfile(character, {
      ...chat,
      characterDisplayName: '小迷',
      characterAvatar: 'chat-avatar',
    }, settings)).toEqual({
      userName: '博士',
      userAvatar: 'player-avatar',
      characterName: '小迷',
      characterAvatar: 'chat-avatar',
    })
  })

  it('falls back to stable names and the character-card avatar', () => {
    const settings = { ...getEmptyFirstSettings(), userName: '   ', userAvatar: '' }

    expect(resolveChatProfile(character, {
      ...chat,
      characterDisplayName: '   ',
      characterAvatar: '',
    }, settings)).toEqual({
      userName: '用户',
      userAvatar: '',
      characterName: '迷迭香',
      characterAvatar: 'character-avatar',
    })
  })
})
