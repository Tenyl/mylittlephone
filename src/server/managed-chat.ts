import type { ManagedChatRequest } from '../sillytavern/managed-api'
import { BUNDLED_CHARACTER_ID, MANAGED_CHAT_VERSION } from '../sillytavern/managed-api'
import { gunzipSync } from 'node:zlib'
import { assemblePrompt } from '../sillytavern/prompt-assembler'
import { buildPresetGenerationOptions } from '../sillytavern/preset-request'
import type { CharacterCard, ChatMessage, ChatPreset, JsonValue, Lorebook } from '../sillytavern/types'
import { sanitizeOpenAiSseStream } from '../sillytavern/sse-stream'

const MAX_REQUEST_CHARS = 1_000_000
const MAX_USER_INPUT_CHARS = 20_000
const MAX_HISTORY_MESSAGES = 200
const MAX_MESSAGE_CHARS = 50_000
const MAX_IMPORTED_CHARACTER_CHARS = 300_000
const DEFAULT_MAX_OUTPUT_TOKENS = 65_535

type UnknownRecord = Record<string, unknown>

export interface ManagedEnvironment {
  MANAGED_LLM_BASE_URL?: string
  MANAGED_LLM_API_KEY?: string
  MANAGED_LLM_MODEL?: string
  MANAGED_CHARACTER_CARD_B64?: string
  MANAGED_MAX_OUTPUT_TOKENS?: string
}

interface ManagedChatDependencies {
  fetch?: typeof fetch
}

interface ManagedConfig {
  baseUrl: string
  apiKey: string
  model: string
  character: CharacterCard
  maxOutputTokens: number
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cleanText(value: unknown, maximum = MAX_MESSAGE_CHARS): string {
  return typeof value === 'string' ? value.slice(0, maximum) : ''
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, MAX_MESSAGE_CHARS))
    : []
}

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!isRecord(value)) return {}
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
  } catch {
    return {}
  }
}

function normalizeCharacter(raw: unknown, forcedId?: string): CharacterCard {
  if (!isRecord(raw)) throw new Error('角色卡格式无效')
  const data = isRecord(raw.data) ? raw.data : raw
  const name = cleanText(data.name, 200).trim()
  if (!name) throw new Error('角色卡缺少名称')
  const now = Date.now()

  return {
    id: forcedId ?? cleanText(raw.id, 200).trim(),
    spec: 'chara_card_v2',
    specVersion: cleanText(raw.specVersion ?? raw.spec_version, 50) || '2.0',
    name,
    avatar: '',
    description: cleanText(data.description),
    personality: cleanText(data.personality),
    scenario: cleanText(data.scenario),
    firstMes: cleanText(data.firstMes ?? data.first_mes),
    mesExample: cleanText(data.mesExample ?? data.mes_example),
    creatorNotes: cleanText(data.creatorNotes ?? data.creator_notes),
    systemPrompt: cleanText(data.systemPrompt ?? data.system_prompt),
    postHistoryInstructions: cleanText(data.postHistoryInstructions ?? data.post_history_instructions),
    alternateGreetings: stringList(data.alternateGreetings ?? data.alternate_greetings),
    tags: stringList(data.tags),
    creator: cleanText(data.creator, 500),
    characterVersion: cleanText(data.characterVersion ?? data.character_version, 100),
    extensions: jsonObject(data.extensions),
    sourceFile: '',
    importedAt: typeof raw.importedAt === 'number' ? raw.importedAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

function decodeBase64Json(value: string): unknown {
  const bytes = Uint8Array.from(atob(value.trim()), (character) => character.charCodeAt(0))
  const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes
  return JSON.parse(new TextDecoder().decode(decoded))
}

function loadConfig(environment: ManagedEnvironment): ManagedConfig | null {
  const baseUrl = environment.MANAGED_LLM_BASE_URL?.trim().replace(/\/+$/, '')
  const apiKey = environment.MANAGED_LLM_API_KEY?.trim()
  const model = environment.MANAGED_LLM_MODEL?.trim()
  const encodedCharacter = environment.MANAGED_CHARACTER_CARD_B64?.trim()
  if (!baseUrl || !apiKey || !model || !encodedCharacter) return null

  try {
    const configuredLimit = Number(environment.MANAGED_MAX_OUTPUT_TOKENS)
    const maxOutputTokens = Number.isFinite(configuredLimit) && configuredLimit > 0
      ? Math.min(Math.floor(configuredLimit), DEFAULT_MAX_OUTPUT_TOKENS)
      : DEFAULT_MAX_OUTPUT_TOKENS
    return {
      baseUrl,
      apiKey,
      model,
      character: normalizeCharacter(decodeBase64Json(encodedCharacter), BUNDLED_CHARACTER_ID),
      maxOutputTokens,
    }
  } catch {
    return null
  }
}

function validMessage(value: unknown): value is ChatMessage {
  return isRecord(value)
    && ['system', 'user', 'assistant'].includes(String(value.role))
    && typeof value.content === 'string'
    && value.content.length <= MAX_MESSAGE_CHARS
}

function validPreset(value: unknown): value is ChatPreset {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && isRecord(value.settings)
}

function validLorebook(value: unknown): value is Lorebook {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && Array.isArray(value.entries)
}

function parseRequest(value: unknown): { request?: ManagedChatRequest; status?: number } {
  if (!isRecord(value)
    || value.version !== MANAGED_CHAT_VERSION
    || typeof value.characterId !== 'string'
    || !value.characterId.trim()
    || typeof value.characterName !== 'string'
    || typeof value.userName !== 'string'
    || typeof value.userInput !== 'string'
    || !value.userInput.trim()
    || !Array.isArray(value.history)
    || !validPreset(value.preset)
    || !Array.isArray(value.lorebooks)
    || !isRecord(value.variables)
    || typeof value.formatPrompt !== 'string') {
    return { status: 400 }
  }
  if (value.userInput.length > MAX_USER_INPUT_CHARS
    || value.history.length > MAX_HISTORY_MESSAGES
    || !value.history.every(validMessage)
    || value.lorebooks.length > 30
    || !value.lorebooks.every(validLorebook)) {
    return { status: 413 }
  }
  if (value.characterId !== BUNDLED_CHARACTER_ID) {
    if (!isRecord(value.character) || JSON.stringify(value.character).length > MAX_IMPORTED_CHARACTER_CHARS) {
      return { status: value.character ? 413 : 400 }
    }
  }
  return { request: value as unknown as ManagedChatRequest }
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function applyOutputLimit(options: Record<string, unknown>, maximum: number): Record<string, unknown> {
  const next = { ...options }
  if (typeof next.max_tokens === 'number') next.max_tokens = Math.min(next.max_tokens, maximum)
  else if (typeof next.max_completion_tokens === 'number') next.max_completion_tokens = Math.min(next.max_completion_tokens, maximum)
  else next.max_tokens = maximum
  return next
}

function sanitizeGenerationOptions(options: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...options, n: 1 }
  const ranges: Record<string, [minimum: number, maximum: number]> = {
    temperature: [0, 2],
    frequency_penalty: [-2, 2],
    presence_penalty: [-2, 2],
    top_p: [0, 1],
    top_k: [0, 500],
    top_a: [0, 1],
    min_p: [0, 1],
    repetition_penalty: [0, 2],
    top_logprobs: [0, 20],
  }
  for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
    const value = next[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = Math.min(maximum, Math.max(minimum, value))
    }
  }
  if (typeof next.seed === 'number') next.seed = Math.min(2_147_483_647, Math.max(0, Math.floor(next.seed)))
  if (!['minimal', 'low', 'medium', 'high', 'xhigh'].includes(String(next.reasoning_effort))) delete next.reasoning_effort
  if (!['low', 'medium', 'high'].includes(String(next.verbosity))) delete next.verbosity
  if (Array.isArray(next.stop)) {
    next.stop = next.stop.filter((item): item is string => typeof item === 'string').slice(0, 4).map((item) => item.slice(0, 200))
  } else if (typeof next.stop === 'string') {
    next.stop = next.stop.slice(0, 200)
  }
  if (next.top_logprobs !== undefined && next.logprobs !== true) delete next.top_logprobs
  if (isRecord(next.logit_bias)) {
    next.logit_bias = Object.fromEntries(Object.entries(next.logit_bias).slice(0, 300).map(([key, value]) => [
      key.slice(0, 30),
      typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(-100, value)) : 0,
    ]))
  }
  return next
}

export async function handleManagedChatRequest(
  request: Request,
  environment: ManagedEnvironment,
  dependencies: ManagedChatDependencies = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } })
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return jsonError(415, '请求格式不受支持')
  }

  const config = loadConfig(environment)
  if (!config) return jsonError(503, '站点聊天服务尚未配置完成')

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return jsonError(400, '请求内容无法读取')
  }
  if (rawBody.length > MAX_REQUEST_CHARS) return jsonError(413, '请求内容过大')

  let unknownBody: unknown
  try {
    unknownBody = JSON.parse(rawBody)
  } catch {
    return jsonError(400, '请求内容无效')
  }

  const parsed = parseRequest(unknownBody)
  if (!parsed.request) {
    return jsonError(parsed.status ?? 400, parsed.status === 413 ? '请求内容过大' : '请求内容无效')
  }

  let character: CharacterCard
  try {
    character = parsed.request.characterId === BUNDLED_CHARACTER_ID
      ? config.character
      : normalizeCharacter(parsed.request.character, parsed.request.characterId)
  } catch {
    return jsonError(400, '角色卡内容无效')
  }

  let assembled: ReturnType<typeof assemblePrompt>
  let generationOptions: Record<string, unknown>
  try {
    assembled = assemblePrompt({
      userInput: parsed.request.userInput.trim(),
      history: parsed.request.history,
      preset: parsed.request.preset,
      lorebooks: parsed.request.lorebooks,
      userName: parsed.request.userName,
      characterName: character.name,
      character,
      extraVariables: parsed.request.variables,
      formatPrompt: parsed.request.formatPrompt,
    })
    generationOptions = applyOutputLimit(
      sanitizeGenerationOptions(buildPresetGenerationOptions(parsed.request.preset.settings)),
      config.maxOutputTokens,
    )
  } catch {
    return jsonError(400, '聊天上下文内容无效')
  }

  let upstream: Response
  try {
    upstream = await (dependencies.fetch ?? globalThis.fetch)(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        ...generationOptions,
        model: config.model,
        messages: assembled.messages,
        stream: true,
      }),
      signal: request.signal,
    })
  } catch {
    return jsonError(502, '上游聊天服务暂时不可用')
  }

  const upstreamContentType = upstream.headers.get('content-type')?.toLowerCase() ?? ''
  if (!upstream.ok || !upstream.body || !upstreamContentType.includes('text/event-stream')) {
    return jsonError(502, '上游聊天服务暂时不可用')
  }

  return new Response(sanitizeOpenAiSseStream(upstream.body), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
