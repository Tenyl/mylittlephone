import 'fake-indexeddb/auto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllData,
  getCharacters,
  getChats,
  getPresets,
  getSettings,
  initializeDatabase,
  saveCharacter,
  saveSettings,
} from './database'
import {
  BUNDLED_CHARACTER_ID,
  BUNDLED_CHARACTER_VERSION,
  BUNDLED_CHAT_ID,
  BUNDLED_PRESET_ID,
  loadBundledDefaults,
  seedBundledDefaults,
} from './default-content'
import { assemblePrompt } from './prompt-assembler'
import { buildPresetGenerationOptions } from './preset-request'
import type { CharacterCard } from './types'

const existingCharacter: CharacterCard = {
  id: 'existing-character', spec: 'chara_card_v2', specVersion: '2.0', name: '已有角色', avatar: '',
  description: '', personality: '', scenario: '', firstMes: '', mesExample: '', creatorNotes: '', systemPrompt: '',
  postHistoryInstructions: '', alternateGreetings: [], tags: [], creator: '', characterVersion: '', extensions: {},
  sourceFile: 'existing.json', importedAt: 1, updatedAt: 1,
}

function readPngTextChunk(bytes: Buffer, keyword: string): string {
  let offset = 8
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    const separator = data.indexOf(0)
    if (type === 'tEXt' && separator >= 0 && data.subarray(0, separator).toString('latin1') === keyword) {
      return data.subarray(separator + 1).toString('latin1')
    }
    offset += length + 12
  }
  throw new Error(`PNG metadata chunk not found: ${keyword}`)
}

describe('bundled default content', () => {
  afterEach(async () => {
    await clearAllData()
    vi.restoreAllMocks()
  })

  it('parses the bundled Rosmontis PNG and preset JSON', async () => {
    const bytes = await readFile(resolve(process.cwd(), 'assets/character/迷迭香.png'))
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const defaults = await loadBundledDefaults(async () => new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }))

    expect(defaults.character).toMatchObject({
      id: BUNDLED_CHARACTER_ID,
      name: '迷迭香',
      firstMes: '嗯...我在。',
      sourceFile: '迷迭香.png',
    })
    expect(defaults.character.avatar).toMatch(/^data:image\/png;base64,/)
    expect(defaults.character.description).toContain('你扮演的是《明日方舟》世界观中的罗德岛精英干员')
    expect(defaults.character.description).toContain('{{user}} 固定扮演“博士”')
    expect(defaults.character.description).toContain('博士是迷迭香最信赖、最亲近的人')
    const charaPayload = JSON.parse(Buffer.from(readPngTextChunk(bytes, 'chara'), 'base64').toString('utf8')) as {
      description: string
      data: { description: string }
    }
    const v3Payload = JSON.parse(Buffer.from(readPngTextChunk(bytes, 'ccv3'), 'base64').toString('utf8')) as typeof charaPayload
    expect(v3Payload).toEqual(charaPayload)
    expect(v3Payload.description).toBe(v3Payload.data.description)
    expect(v3Payload.data.description).toContain('你扮演的是《明日方舟》世界观中的罗德岛精英干员')
    expect(v3Payload.data.description).toContain('{{user}} 固定扮演“博士”')
    expect(v3Payload.data.description).toContain('博士是迷迭香最信赖、最亲近的人')
    expect(defaults.preset).toMatchObject({ id: BUNDLED_PRESET_ID, name: '默认预设' })
    expect(defaults.preset.settings.prompts).toBeInstanceOf(Array)
    expect(buildPresetGenerationOptions(defaults.preset.settings)).toEqual({
      temperature: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 1,
      top_k: 0,
      top_a: 0,
      min_p: 0,
      repetition_penalty: 1,
      max_tokens: 65535,
      n: 1,
      reasoning_effort: 'high',
    })
  })

  it('assembles the bundled grouped prompt order with the Rosmontis role definition', async () => {
    const bytes = await readFile(resolve(process.cwd(), 'assets/character/迷迭香.png'))
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const defaults = await loadBundledDefaults(async () => new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }))

    const assembled = assemblePrompt({
      userInput: '你今天做了什么？',
      history: [],
      preset: defaults.preset,
      lorebooks: [],
      userName: '用户',
      characterName: defaults.character.name,
      character: defaults.character,
    })

    expect(assembled.systemPrompt).toContain('私人移动终端')
    expect(assembled.systemPrompt).toContain('你将始终扮演“迷迭香”迷迭香')
    expect(assembled.systemPrompt).toContain("Write 迷迭香's next reply")
  })

  it('seeds a fresh database with an active chat while keeping every API field empty', async () => {
    await initializeDatabase()
    const defaults = await loadBundledDefaults(async () => {
      const bytes = await readFile(resolve(process.cwd(), 'assets/character/迷迭香.png'))
      const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      return new Response(body, { status: 200, headers: { 'Content-Type': 'image/png' } })
    })

    expect(await seedBundledDefaults(async () => defaults)).toBe(true)

    const [characters, presets, chats, settings] = await Promise.all([
      getCharacters(), getPresets(), getChats(), getSettings(),
    ])
    expect(characters.map((item) => item.id)).toEqual([BUNDLED_CHARACTER_ID])
    expect(presets.map((item) => item.id)).toEqual([BUNDLED_PRESET_ID])
    expect(chats).toHaveLength(1)
    expect(chats[0]).toMatchObject({ id: BUNDLED_CHAT_ID, characterId: BUNDLED_CHARACTER_ID, presetId: BUNDLED_PRESET_ID })
    expect(chats[0].messages[0].content).toBe('嗯...我在。')
    expect(settings).toMatchObject({
      activeCharacterId: BUNDLED_CHARACTER_ID,
      activePresetId: BUNDLED_PRESET_ID,
      activeChatId: BUNDLED_CHAT_ID,
      characterName: '迷迭香',
      apiMode: 'single',
      api: { baseUrl: '', apiKey: '', model: '', secondary: { enabled: false, baseUrl: '', apiKey: '', model: '' } },
    })
  })

  it('does not load or overwrite bundled content when the user already owns content', async () => {
    await initializeDatabase()
    await saveCharacter(existingCharacter)
    const loader = vi.fn(async () => { throw new Error('loader must not run') })

    expect(await seedBundledDefaults(loader)).toBe(false)
    expect(loader).not.toHaveBeenCalled()
    expect((await getCharacters()).map((item) => item.id)).toEqual(['existing-character'])
  })

  it('refreshes an outdated bundled character without overwriting the user API settings', async () => {
    await initializeDatabase()
    const settings = await getSettings()
    expect(settings).toBeDefined()
    await saveSettings({
      ...settings!,
      api: { ...settings!.api, baseUrl: 'https://api.example.test/v1', apiKey: 'private-key', model: 'roleplay-model' },
    })
    await saveCharacter({
      ...existingCharacter,
      id: BUNDLED_CHARACTER_ID,
      name: '迷迭香',
      description: '旧版内置提示词',
      extensions: { mylittlephone_builtin: true, mylittlephone_builtin_version: 1 },
    })
    const refreshedCharacter: CharacterCard = {
      ...existingCharacter,
      id: BUNDLED_CHARACTER_ID,
      name: '迷迭香',
      description: '新版博士关系提示词',
      extensions: { mylittlephone_builtin: true, mylittlephone_builtin_version: BUNDLED_CHARACTER_VERSION },
    }
    const loader = vi.fn(async () => ({
      character: refreshedCharacter,
      preset: {
        id: BUNDLED_PRESET_ID,
        name: '默认预设',
        description: '',
        settings: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }))

    expect(await seedBundledDefaults(loader)).toBe(true)
    expect(loader).toHaveBeenCalledOnce()
    expect((await getCharacters()).find((item) => item.id === BUNDLED_CHARACTER_ID)).toMatchObject({
      description: '新版博士关系提示词',
      importedAt: existingCharacter.importedAt,
      extensions: { mylittlephone_builtin_version: BUNDLED_CHARACTER_VERSION },
    })
    expect(await getSettings()).toMatchObject({
      api: { baseUrl: 'https://api.example.test/v1', apiKey: 'private-key', model: 'roleplay-model' },
    })
  })
})
