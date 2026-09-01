import { describe, expect, it, vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import { BUNDLED_CHARACTER_ID } from '../sillytavern/default-content'
import type { CharacterCard, ChatPreset } from '../sillytavern/types'
import { handleManagedChatRequest, type ManagedEnvironment } from './managed-chat'

function character(id: string, description: string): CharacterCard {
  return {
    id,
    spec: 'chara_card_v2',
    specVersion: '2.0',
    name: id === BUNDLED_CHARACTER_ID ? '迷迭香' : '自定义角色',
    avatar: '',
    description,
    personality: '安静',
    scenario: '',
    firstMes: '你好。',
    mesExample: '',
    creatorNotes: '',
    systemPrompt: '',
    postHistoryInstructions: '',
    alternateGreetings: [],
    tags: [],
    creator: '',
    characterVersion: '1',
    extensions: {},
    sourceFile: '',
    importedAt: 1,
    updatedAt: 1,
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
}

const hiddenCharacter = character(BUNDLED_CHARACTER_ID, 'SERVER_PRIVATE_ROSMONTIS_PROMPT')

const env: ManagedEnvironment = {
  MANAGED_LLM_BASE_URL: 'https://provider.example/v1/',
  MANAGED_LLM_API_KEY: 'server-secret',
  MANAGED_LLM_MODEL: 'server-model',
  MANAGED_CHARACTER_CARD_B64: encode(hiddenCharacter),
  MANAGED_MAX_OUTPUT_TOKENS: '512',
}

const preset: ChatPreset = {
  id: 'preset',
  name: '玩家编辑的预设',
  description: '',
  settings: {
    temp_openai: 0.33,
    openai_max_tokens: 2048,
    top_p_openai: 0.72,
    stop: ['STOP_A', 'STOP_B'],
    main: 'FRONTEND_EDITABLE_PRESET',
    prompt_order: [
      { identifier: 'main', role: 'system', enabled: true },
      { identifier: 'charDescription', role: 'system', enabled: true },
      { identifier: 'chatHistory', role: 'system', enabled: true },
    ],
  },
  createdAt: 1,
  updatedAt: 1,
}

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    characterId: BUNDLED_CHARACTER_ID,
    characterName: '迷迭香',
    userName: '博士',
    userInput: '在吗？',
    history: [],
    preset,
    lorebooks: [],
    variables: {},
    formatPrompt: '<maintext>最终聊天内容</maintext>',
    ...overrides,
  }
}

function post(body: unknown): Request {
  return new Request('https://phone.example/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('managed Vercel chat endpoint', () => {
  it('injects the private built-in card and server model while applying the complete frontend preset', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      'data: {"id":"provider-request-id","model":"provider-private-model","system_fingerprint":"secret-fingerprint","choices":[{"delta":{"content":"<maintext>嗯。</maintext>"}}]}\n\ndata: {"usage":{"prompt_tokens":999}}\n\ndata: [DONE]\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream', 'X-Provider-Secret': 'do-not-forward' } },
    ))

    const response = await handleManagedChatRequest(post(requestBody({
      character: character(BUNDLED_CHARACTER_ID, 'CLIENT_FORGED_DEFAULT_PROMPT'),
      model: 'client-forged-model',
      apiKey: 'client-forged-key',
    })), env, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Provider-Secret')).toBeNull()
    const filteredStream = await response.text()
    expect(filteredStream).toContain('<maintext>嗯。</maintext>')
    expect(filteredStream).not.toContain('provider-request-id')
    expect(filteredStream).not.toContain('provider-private-model')
    expect(filteredStream).not.toContain('secret-fingerprint')
    expect(filteredStream).not.toContain('prompt_tokens')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://provider.example/v1/chat/completions')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer server-secret')
    const upstream = JSON.parse(String(init.body))
    expect(upstream.model).toBe('server-model')
    expect(upstream.temperature).toBe(0.33)
    expect(upstream.top_p).toBe(0.72)
    expect(upstream.max_tokens).toBe(512)
    expect(upstream.stop).toEqual(['STOP_A', 'STOP_B'])
    expect(JSON.stringify(upstream.messages)).toContain('FRONTEND_EDITABLE_PRESET')
    expect(JSON.stringify(upstream.messages)).toContain('SERVER_PRIVATE_ROSMONTIS_PROMPT')
    expect(JSON.stringify(upstream.messages)).not.toContain('CLIENT_FORGED_DEFAULT_PROMPT')
    expect(JSON.stringify(upstream)).not.toContain('client-forged-model')
    expect(JSON.stringify(upstream)).not.toContain('client-forged-key')
  })

  it('accepts a validated player-imported character in managed mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    const imported = character('player-card', 'PLAYER_IMPORTED_CHARACTER_PROMPT')
    const response = await handleManagedChatRequest(post(requestBody({
      characterId: imported.id,
      characterName: imported.name,
      character: imported,
    })), env, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(200)
    const upstream = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(JSON.stringify(upstream.messages)).toContain('PLAYER_IMPORTED_CHARACTER_PROMPT')
    expect(JSON.stringify(upstream.messages)).not.toContain('SERVER_PRIVATE_ROSMONTIS_PROMPT')
  })

  it('preserves the frontend preset maximum output when no stricter server limit is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    const unrestrictedPreset = {
      ...preset,
      settings: { ...preset.settings, openai_max_tokens: 65_535 },
    }

    await handleManagedChatRequest(post(requestBody({ preset: unrestrictedPreset })), {
      ...env,
      MANAGED_MAX_OUTPUT_TOKENS: undefined,
    }, { fetch: fetchMock as typeof fetch })

    const upstream = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(upstream.max_tokens).toBe(65_535)
  })

  it('forces a single completion and bounds client-controlled generation parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    const abusivePreset = {
      ...preset,
      settings: {
        ...preset.settings,
        n: 999,
        temperature: 99,
        frequency_penalty: 9,
        presence_penalty: -9,
        top_p: -1,
        top_k: 99_999,
        logprobs: true,
        top_logprobs: 999,
        reasoning_effort: 'reveal-provider-mode',
        verbosity: 'unbounded',
        stop: ['a'.repeat(500), 'b', 'c', 'd', 'e'],
      },
    }

    await handleManagedChatRequest(post(requestBody({ preset: abusivePreset })), env, { fetch: fetchMock as typeof fetch })

    const upstream = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(upstream).toMatchObject({
      n: 1,
      temperature: 2,
      frequency_penalty: 2,
      presence_penalty: -2,
      top_p: 0,
      top_k: 500,
      top_logprobs: 20,
    })
    expect(upstream.reasoning_effort).toBeUndefined()
    expect(upstream.verbosity).toBeUndefined()
    expect(upstream.stop).toHaveLength(4)
    expect(upstream.stop[0]).toHaveLength(200)
  })

  it('loads a gzip-compressed private character card to stay below Vercel environment limits', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    const response = await handleManagedChatRequest(post(requestBody()), {
      ...env,
      MANAGED_CHARACTER_CARD_B64: gzipSync(Buffer.from(JSON.stringify(hiddenCharacter), 'utf8')).toString('base64'),
    }, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(200)
    const upstream = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(JSON.stringify(upstream.messages)).toContain('SERVER_PRIVATE_ROSMONTIS_PROMPT')
  })

  it('fails closed when managed secrets are missing', async () => {
    const fetchMock = vi.fn()
    const response = await handleManagedChatRequest(post(requestBody()), {
      ...env,
      MANAGED_LLM_API_KEY: undefined,
    }, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: '站点聊天服务尚未配置完成' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not expose upstream error bodies or configuration', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('provider says server-secret is invalid', { status: 401 }))
    const response = await handleManagedChatRequest(post(requestBody()), env, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toContain('上游聊天服务暂时不可用')
    expect(text).not.toContain('server-secret')
    expect(text).not.toContain('provider.example')
  })

  it('filters stream-level errors and rejects non-SSE upstream responses', async () => {
    const streamErrorFetch = vi.fn().mockResolvedValue(new Response(
      'data: {"error":{"message":"server-secret provider diagnostic"}}\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    ))
    const streamErrorResponse = await handleManagedChatRequest(post(requestBody()), env, { fetch: streamErrorFetch as typeof fetch })
    const streamErrorText = await streamErrorResponse.text()
    expect(streamErrorText).toContain('上游聊天服务暂时不可用')
    expect(streamErrorText).not.toContain('server-secret')
    expect(streamErrorText).not.toContain('provider diagnostic')

    const jsonFetch = vi.fn().mockResolvedValue(new Response('{"result":"not a stream"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const jsonResponse = await handleManagedChatRequest(post(requestBody()), env, { fetch: jsonFetch as typeof fetch })
    expect(jsonResponse.status).toBe(502)
    expect(await jsonResponse.json()).toEqual({ error: '上游聊天服务暂时不可用' })
  })

  it('rejects malformed and oversized client requests before calling upstream', async () => {
    const fetchMock = vi.fn()
    const malformed = await handleManagedChatRequest(post({ version: 1, userInput: '' }), env, { fetch: fetchMock as typeof fetch })
    const oversized = await handleManagedChatRequest(post(requestBody({ userInput: 'a'.repeat(20_001) })), env, { fetch: fetchMock as typeof fetch })

    expect(malformed.status).toBe(400)
    expect(oversized.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a generic client error when nested lorebook data cannot be assembled', async () => {
    const fetchMock = vi.fn()
    const response = await handleManagedChatRequest(post(requestBody({
      lorebooks: [{ id: 'bad-book', name: '损坏的世界书', entries: [{}] }],
    })), env, { fetch: fetchMock as typeof fetch })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: '聊天上下文内容无效' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
