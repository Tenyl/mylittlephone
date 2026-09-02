/**
 * IndexedDB Database Layer
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Lorebook, ChatPreset, AppSettings, ChatSession, CharacterCard, ApiSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

const DB_NAME = 'SillyTavernWebDB';
const DB_VERSION = 7;

export function resolveApiSource(settings: { apiSource?: unknown; api?: Partial<ApiSettings> }): AppSettings['apiSource'] {
  if (settings.apiSource === 'managed' || settings.apiSource === 'custom') return settings.apiSource;
  const api = settings.api;
  return api?.baseUrl?.trim() && api.apiKey?.trim() && api.model?.trim() ? 'custom' : 'managed';
}

export class AppDatabase extends Dexie {
  characters!: Table<CharacterCard>;
  lorebooks!: Table<Lorebook>;
  presets!: Table<ChatPreset>;
  settings!: Table<AppSettings>;
  chats!: Table<ChatSession>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (s.uiMode === undefined) s.uiMode = 'game';
        if (s.customTags === undefined) s.customTags = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
        if (s.thinkingDisplay === undefined) s.thinkingDisplay = 'fold';
        if (s.formatPromptTemplate === undefined) s.formatPromptTemplate = '';
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }
        await tx.table('settings').put(s);
      }
    });
    this.version(4).stores({
      characters: 'id, name, importedAt, updatedAt',
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const setting of settings) {
        setting.activeCharacterId ??= null;
        setting.activeChatId ??= null;
        setting.schemaFirst = false;
        await tx.table('settings').put(setting);
      }
    });
    this.version(5).stores({
      characters: 'id, name, importedAt, updatedAt',
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const setting of settings) {
        setting.apiSource = resolveApiSource(setting);
        await tx.table('settings').put(setting);
      }
    });
    this.version(6).stores({
      characters: 'id, name, importedAt, updatedAt',
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const setting of settings) {
        setting.userAvatar ??= '';
        await tx.table('settings').put(setting);
      }
    });
    this.version(7).stores({
      characters: 'id, name, importedAt, updatedAt',
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const setting of settings) {
        if (!setting.userName?.trim() || setting.userName === '用户') setting.userName = '博士';
        await tx.table('settings').put(setting);
      }
      const chats = await tx.table('chats').toCollection().toArray();
      for (const chat of chats) {
        if (!chat.userName?.trim() || chat.userName === '用户') chat.userName = '博士';
        await tx.table('chats').put(chat);
      }
    });
  }
}

let dbInstance: AppDatabase | null = null;

export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put(getEmptyFirstSettings());
  }
}

export function getEmptyFirstSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    key: 'settings',
    api: {
      ...DEFAULT_SETTINGS.api,
      secondary: DEFAULT_SETTINGS.api.secondary
        ? { ...DEFAULT_SETTINGS.api.secondary }
        : undefined,
    },
    activeLorebookIds: [],
    customTags: [...DEFAULT_SETTINGS.customTags],
  };
}

export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

export interface FullBackup {
  version: number;
  exportedAt: number;
  characters: CharacterCard[];
  lorebooks: Lorebook[];
  presets: ChatPreset[];
  settings: AppSettings[];
  chats: ChatSession[];
}

export async function exportAllData(): Promise<FullBackup> {
  const db = getDatabase();
  const [characters, lorebooks, presets, settings, chats] = await Promise.all([
    db.characters.toArray(),
    db.lorebooks.toArray(),
    db.presets.toArray(),
    db.settings.toArray(),
    db.chats.toArray(),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: Date.now(),
    characters,
    lorebooks,
    presets,
    settings: settings.map((setting) => ({
      ...setting,
      api: {
        ...setting.api,
        apiKey: '',
        secondary: setting.api.secondary ? { ...setting.api.secondary, apiKey: '' } : undefined,
      },
    })),
    chats,
  };
}

export async function importAllData(backup: FullBackup): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('备份格式无效');
  }
  const db = getDatabase();
  const currentSettings = await getSettings();
  const incomingSettings = Array.isArray(backup.settings)
    ? backup.settings.map((setting) => ({
        ...setting,
        apiSource: resolveApiSource(setting),
        api: {
          ...setting.api,
          apiKey: currentSettings?.api.apiKey ?? '',
          secondary: setting.api.secondary
            ? { ...setting.api.secondary, apiKey: currentSettings?.api.secondary?.apiKey ?? '' }
            : undefined,
        },
      }))
    : [];
  await db.transaction('rw', db.characters, db.lorebooks, db.presets, db.settings, db.chats, async () => {
    await db.characters.clear();
    await db.lorebooks.clear();
    await db.presets.clear();
    await db.settings.clear();
    await db.chats.clear();
    if (Array.isArray(backup.characters)) await db.characters.bulkPut(backup.characters);
    if (Array.isArray(backup.lorebooks)) await db.lorebooks.bulkPut(backup.lorebooks);
    if (Array.isArray(backup.presets)) await db.presets.bulkPut(backup.presets);
    if (incomingSettings.length > 0) await db.settings.bulkPut(incomingSettings);
    if (Array.isArray(backup.chats)) await db.chats.bulkPut(backup.chats);
  });
  if (await db.settings.count() === 0) await db.settings.put(getEmptyFirstSettings());
}

export async function getCharacters(): Promise<CharacterCard[]> {
  return getDatabase().characters.orderBy('updatedAt').reverse().toArray();
}

export async function saveCharacter(character: CharacterCard): Promise<string> {
  await getDatabase().characters.put(character);
  return character.id;
}

export async function deleteCharacter(id: string): Promise<void> {
  await getDatabase().characters.delete(id);
}

export async function getLorebooks(): Promise<Lorebook[]> {
  return getDatabase().lorebooks.toArray();
}

export async function saveLorebook(lorebook: Lorebook): Promise<string> {
  await getDatabase().lorebooks.put(lorebook);
  return lorebook.id;
}

export async function deleteLorebook(id: string): Promise<void> {
  await getDatabase().lorebooks.delete(id);
}

export async function getPresets(): Promise<ChatPreset[]> {
  return getDatabase().presets.toArray();
}

export async function savePreset(preset: ChatPreset): Promise<string> {
  await getDatabase().presets.put(preset);
  return preset.id;
}

export async function deletePreset(id: string): Promise<void> {
  await getDatabase().presets.delete(id);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const all = await getDatabase().settings.toArray();
  return all[0];
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await getDatabase().settings.put({ ...settings, key: 'settings' });
}

export async function getChats(): Promise<ChatSession[]> {
  return getDatabase().chats.toArray();
}

export async function saveChat(chat: ChatSession): Promise<string> {
  await getDatabase().chats.put(chat);
  return chat.id;
}

export async function deleteChat(id: string): Promise<void> {
  await getDatabase().chats.delete(id);
}

export async function setVariables(chatId: string, variables: Record<string, any>): Promise<void> {
  const db = getDatabase();
  const chat = await db.chats.get(chatId);
  if (!chat) return;
  chat.variables = variables;
  chat.updatedAt = Date.now();
  await db.chats.put(chat);
}
