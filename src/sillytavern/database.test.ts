import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { clearAllData, getDatabase, initializeDatabase } from './database'

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
      apiMode: 'dual',
      activeCharacterId: null,
      activePresetId: null,
      activeLorebookIds: [],
      activeChatId: null,
      uiMode: 'game',
      customTags: ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'],
    })
    expect(settings?.api.baseUrl).toBe('')
    expect(settings?.api.apiKey).toBe('')
    expect(settings?.api.model).toBe('')
  })
})
