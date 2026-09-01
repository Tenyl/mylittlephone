import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../sillytavern/database'
import type { CharacterCard, ChatPreset } from '../sillytavern/types'
import { useSillytavern } from './useSillytavern'

const character: CharacterCard = {
  id: 'character-controller',
  spec: 'chara_card_v2',
  specVersion: '2.0',
  name: '白露',
  avatar: '',
  description: '气象记录员。',
  personality: '冷静',
  scenario: '观测站',
  firstMes: '晚上好。',
  mesExample: '',
  creatorNotes: '',
  systemPrompt: '扮演白露。',
  postHistoryInstructions: '',
  alternateGreetings: [],
  tags: [],
  creator: '',
  characterVersion: '1',
  extensions: {},
  sourceFile: '白露.json',
  importedAt: 1,
  updatedAt: 1,
}

const preset: ChatPreset = {
  id: 'preset-controller',
  name: '日常聊天',
  settings: {
    stream_openai: true,
    prompt_order: [{ identifier: 'chatHistory', role: 'system', enabled: true }],
  },
  createdAt: 1,
  updatedAt: 1,
}

async function prepareController(result: { current: ReturnType<typeof useSillytavern> }) {
  await act(async () => result.current.addCharacter(character))
  await act(async () => result.current.addPreset(preset))
  await act(async () => result.current.updateSettings({
    api: {
      ...result.current.settings!.api,
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'secret',
      model: 'model',
    },
  }))
  await waitFor(() => expect(result.current.readiness.canStartChat).toBe(true))
}

describe('useSillytavern controller', () => {
  beforeEach(async () => {
    await clearAllData()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('boots with empty user-owned libraries', async () => {
    const { result } = renderHook(() => useSillytavern())
    await waitFor(() => expect(result.current.initialized).toBe(true))

    expect(result.current.characters).toEqual([])
    expect(result.current.lorebooks).toEqual([])
    expect(result.current.presets).toEqual([])
    expect(result.current.chats).toEqual([])
    expect(result.current.activeChat).toBeNull()
    expect(result.current.readiness.canStartChat).toBe(false)
  })

  it('persists active imports and a newly created chat across remounts', async () => {
    const first = renderHook(() => useSillytavern())
    await waitFor(() => expect(first.result.current.initialized).toBe(true))
    await prepareController(first.result)

    await act(async () => first.result.current.createChat('与白露的聊天'))
    await waitFor(() => expect(first.result.current.activeChat?.messages[0]?.content).toBe('晚上好。'))
    first.unmount()

    const second = renderHook(() => useSillytavern())
    await waitFor(() => expect(second.result.current.initialized).toBe(true))
    expect(second.result.current.activeCharacter?.name).toBe('白露')
    expect(second.result.current.activePreset?.name).toBe('日常聊天')
    expect(second.result.current.activeChat?.name).toBe('与白露的聊天')
  })

  it('streams a tagged assistant reply and creates a branch', async () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"<maintext>你"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"好。</maintext><option>继续</option><sum>问候</sum>"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    const { result } = renderHook(() => useSillytavern())
    await waitFor(() => expect(result.current.initialized).toBe(true))
    await prepareController(result)
    await act(async () => result.current.createChat('测试会话'))
    await act(async () => result.current.sendGameMessage('在吗？'))

    const assistant = result.current.activeChat?.messages.at(-1)
    expect(assistant?.content).toBe('你好。')
    expect(assistant?.parsed?.options).toEqual(['继续'])
    expect(assistant?.metadata?.summary).toBe('问候')

    await act(async () => result.current.branchFromMessage(assistant!.id, '问候分支'))
    expect(result.current.activeChat?.name).toBe('问候分支')
    expect(result.current.activeChat?.parentChatId).toBeTruthy()
  })
})
