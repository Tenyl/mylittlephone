import { describe, expect, it, vi } from 'vitest'
import { callManagedChat } from './managed-api-client'
import type { ManagedChatRequest } from './managed-api'
import { toManagedCharacterPayload } from './managed-api'
import type { CharacterCard } from './types'

describe('managed API client', () => {
  it('posts only the managed request contract to the same-origin endpoint', async () => {
    const payload = {
      version: 1,
      characterId: 'builtin-character-rosmontis',
      characterName: '迷迭香',
      userName: '博士',
      userInput: '晚上好',
      history: [],
      preset: { id: 'p', name: '可编辑预设', settings: { temp_openai: 0.5 }, createdAt: 1, updatedAt: 1 },
      lorebooks: [],
      variables: {},
      formatPrompt: '<maintext>内容</maintext>',
    } satisfies ManagedChatRequest
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }))

    await callManagedChat(payload, new AbortController().signal, fetchMock as typeof fetch)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/chat')
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual(payload)
    expect(String(init.body)).not.toContain('apiKey')
    expect(String(init.body)).not.toContain('baseUrl')
    expect(String(init.body)).not.toContain('model')
  })

  it('removes the imported avatar binary before a player card is sent to Vercel', () => {
    const card = {
      id: 'custom',
      name: '自定义角色',
      avatar: `data:image/png;base64,${'a'.repeat(900_000)}`,
      sourceFile: 'private-character.png',
      description: '玩家自己的角色设定',
    } as CharacterCard

    expect(toManagedCharacterPayload(card)).toMatchObject({
      id: 'custom',
      avatar: '',
      sourceFile: '',
      description: '玩家自己的角色设定',
    })
  })
})
