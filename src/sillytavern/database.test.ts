import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { clearAllData, exportAllData, getDatabase, getEmptyFirstSettings, importAllData, initializeDatabase, resolveApiSource, saveSettings } from './database'

describe('empty-first database initialization', () => {
  afterEach(async () => {
    await clearAllData()
  })

  it('creates neutral settings without seeding playable content', async () => {
    await initializeDatabase()

    const db = getDatabase()
    expect(await db.characters.count()).toBe(0)
    expect(await db.lorebooks.count()).toBe(0)
    expect(await db.presets.count()).toBe(0)
    expect(await db.chats.count()).toBe(0)

    const settings = await db.settings.get('settings')
    expect(settings).toMatchObject({
      apiSource: 'managed',
      apiMode: 'single',
      activeCharacterId: null,
      activePresetId: null,
      activeLorebookIds: [],
      activeChatId: null,
      userAvatar: '',
      uiMode: 'chat',
      customTags: ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'],
    })
    expect(settings?.api.baseUrl).toBe('')
    expect(settings?.api.apiKey).toBe('')
    expect(settings?.api.model).toBe('')
    expect(settings?.api.secondary).toMatchObject({ enabled: false, baseUrl: '', apiKey: '', model: '' })
  })

  it('migrates legacy complete local credentials to custom mode and blank settings to managed mode', () => {
    expect(resolveApiSource({
      api: { baseUrl: 'https://api.example/v1', apiKey: 'secret', model: 'model', timeout: 60_000 },
    })).toBe('custom')
    expect(resolveApiSource({
      api: { baseUrl: '', apiKey: '', model: '', timeout: 60_000 },
    })).toBe('managed')
    expect(resolveApiSource({
      apiSource: 'managed',
      api: { baseUrl: 'https://kept.example/v1', apiKey: 'kept', model: 'kept', timeout: 60_000 },
    })).toBe('managed')
  })

  it('strips API keys from exports and preserves current keys during import', async () => {
    await initializeDatabase()
    const settings = getEmptyFirstSettings()
    settings.api = { ...settings.api, apiKey: 'primary-secret', secondary: { ...settings.api.secondary!, apiKey: 'secondary-secret' } }
    await saveSettings(settings)

    const backup = await exportAllData()
    expect(backup.settings[0].api.apiKey).toBe('')
    expect(backup.settings[0].api.secondary?.apiKey).toBe('')

    backup.settings[0].userName = '导入后的用户'
    backup.settings[0].userAvatar = 'data:image/png;base64,eA=='
    await importAllData(backup)
    const restored = await getDatabase().settings.get('settings')
    expect(restored?.userName).toBe('导入后的用户')
    expect(restored?.userAvatar).toBe('data:image/png;base64,eA==')
    expect(restored?.api.apiKey).toBe('primary-secret')
    expect(restored?.api.secondary?.apiKey).toBe('secondary-secret')
  })
})
