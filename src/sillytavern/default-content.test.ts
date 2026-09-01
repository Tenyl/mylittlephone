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
} from './database'
import {
  BUNDLED_CHARACTER_ID,
  BUNDLED_CHAT_ID,
  BUNDLED_PRESET_ID,
  loadBundledDefaults,
  seedBundledDefaults,
} from './default-content'
import type { CharacterCard } from './types'

const existingCharacter: CharacterCard = {
  id: 'existing-character', spec: 'chara_card_v2', specVersion: '2.0', name: '已有角色', avatar: '',
  description: '', personality: '', scenario: '', firstMes: '', mesExample: '', creatorNotes: '', systemPrompt: '',
  postHistoryInstructions: '', alternateGreetings: [], tags: [], creator: '', characterVersion: '', extensions: {},
  sourceFile: 'existing.json', importedAt: 1, updatedAt: 1,
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
    expect(defaults.preset).toMatchObject({ id: BUNDLED_PRESET_ID, name: '默认预设' })
    expect(defaults.preset.settings.prompts).toBeInstanceOf(Array)
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
})
