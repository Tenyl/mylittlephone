import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../sillytavern/database'
import { BUNDLED_CHARACTER_ID, BUNDLED_PRESET_ID, type BundledDefaultsLoader } from '../sillytavern/default-content'
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
    temperature: 0.42,
    freq_pen_openai: 0.13,
    presence_penalty: 0.24,
    top_p_openai: 0.84,
    top_k: 40,
    top_a_openai: 0.2,
    min_p: 0.05,
    repetition_penalty_openai: 1.08,
    openai_max_tokens: 1337,
    seed: 7,
    n: 1,
    reasoning_effort: 'high',
    verbosity: 'low',
    prompt_order: [{ identifier: 'chatHistory', role: 'system', enabled: true }],
  },
  createdAt: 1,
  updatedAt: 1,
}

const bundledDefaultsLoader: BundledDefaultsLoader = async () => ({
  character: { ...character, id: BUNDLED_CHARACTER_ID, name: '迷迭香', firstMes: '嗯...我在。', sourceFile: '迷迭香.png' },
  preset: { ...preset, id: BUNDLED_PRESET_ID, name: '默认预设' },
})

async function prepareController(result: { current: ReturnType<typeof useSillytavern> }) {
  await act(async () => result.current.addCharacter(character))
  await act(async () => result.current.addPreset(preset))
  await act(async () => result.current.updateSettings({
    apiSource: 'custom',
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

  it('boots directly into the bundled Rosmontis chat while leaving API settings empty', async () => {
    const { result } = renderHook(() => useSillytavern(bundledDefaultsLoader))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    expect(result.current.characters).toHaveLength(1)
    expect(result.current.activeCharacter?.name).toBe('迷迭香')
    expect(result.current.lorebooks).toEqual([])
    expect(result.current.activePreset?.name).toBe('默认预设')
    expect(result.current.activeChat?.messages[0]?.content).toBe('嗯...我在。')
    expect(result.current.settings?.api).toMatchObject({ baseUrl: '', apiKey: '', model: '' })
    expect(result.current.readiness.canStartChat).toBe(true)
    expect(result.current.settings?.apiSource).toBe('managed')
    expect(result.current.readiness.canSend).toBe(true)
  })

  it('stores display overrides only on the active chat and protects the bundled character', async () => {
    const { result } = renderHook(() => useSillytavern(bundledDefaultsLoader))
    await waitFor(() => expect(result.current.activeCharacter?.name).toBe('迷迭香'))

    await act(async () => result.current.updateActiveChatProfile({
      characterDisplayName: '小迷',
      characterAvatar: 'data:image/png;base64,eA==',
    }))

    expect(result.current.activeChat).toMatchObject({
      characterDisplayName: '小迷',
      characterAvatar: 'data:image/png;base64,eA==',
    })
    expect(result.current.activeCharacter?.name).toBe('迷迭香')

    await act(async () => result.current.deleteCharacter(BUNDLED_CHARACTER_ID))
    expect(result.current.characters.some((item) => item.id === BUNDLED_CHARACTER_ID)).toBe(true)
  })

  it('persists active imports and a newly created chat across remounts', async () => {
    const first = renderHook(() => useSillytavern(bundledDefaultsLoader))
    await waitFor(() => expect(first.result.current.initialized).toBe(true))
    await prepareController(first.result)

    await act(async () => first.result.current.createChat('与白露的聊天'))
    await waitFor(() => expect(first.result.current.activeChat?.messages[0]?.content).toBe('晚上好。'))
    first.unmount()

    const second = renderHook(() => useSillytavern(bundledDefaultsLoader))
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
      '',
    ].join('\n')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    const { result } = renderHook(() => useSillytavern(bundledDefaultsLoader))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    await prepareController(result)
    await act(async () => result.current.createChat('测试会话'))
    await act(async () => result.current.sendGameMessage('在吗？'))

    const assistant = result.current.activeChat?.messages.at(-1)
    expect(assistant?.content).toBe('你好。')
    expect(assistant?.parsed?.thinking).toBe('')
    expect(assistant?.parsed?.options).toEqual([])
    expect(assistant?.metadata).not.toHaveProperty('rawContent')
    expect(assistant?.metadata?.summary).toBe('问候')
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(requestBody).toMatchObject({
      model: 'model',
      stream: true,
      temperature: 0.42,
      frequency_penalty: 0.13,
      presence_penalty: 0.24,
      top_p: 0.84,
      top_k: 40,
      top_a: 0.2,
      min_p: 0.05,
      repetition_penalty: 1.08,
      max_tokens: 1337,
      seed: 7,
      n: 1,
      reasoning_effort: 'high',
      verbosity: 'low',
    })

    await act(async () => result.current.branchFromMessage(assistant!.id, '问候分支'))
    expect(result.current.activeChat?.name).toBe('问候分支')
    expect(result.current.activeChat?.parentChatId).toBeTruthy()
  })

  it('restores the bundled conversation after clearing all local data', async () => {
    const { result } = renderHook(() => useSillytavern(bundledDefaultsLoader))
    await waitFor(() => expect(result.current.activeCharacter?.name).toBe('迷迭香'))

    await act(async () => result.current.resetAllData())

    await waitFor(() => expect(result.current.activeCharacter?.name).toBe('迷迭香'))
    expect(result.current.activePreset?.name).toBe('默认预设')
    expect(result.current.activeChat?.messages[0]?.content).toBe('嗯...我在。')
    expect(result.current.settings?.api).toMatchObject({ baseUrl: '', apiKey: '', model: '' })
  })
})
