import characterAssetUrl from '../../assets/character/迷迭香.png?url'
import presetAsset from '../../assets/preset/Default.json'
import { importCharacterFile } from './character-importer'
import {
  getCharacters,
  getChats,
  getPresets,
  getSettings,
  saveCharacter,
  saveChat,
  savePreset,
  saveSettings,
} from './database'
import { importPreset } from './importer'
import { replaceMacros } from './prompt-assembler'
import type { CharacterCard, ChatPreset, ChatSession } from './types'

export const BUNDLED_CHARACTER_ID = 'builtin-character-rosmontis'
export const BUNDLED_PRESET_ID = 'builtin-preset-default'
export const BUNDLED_CHAT_ID = 'builtin-chat-rosmontis'

export interface BundledDefaults {
  character: CharacterCard
  preset: ChatPreset
}

export type BundledDefaultsLoader = () => Promise<BundledDefaults>

export async function loadBundledDefaults(fetcher: typeof fetch = globalThis.fetch): Promise<BundledDefaults> {
  const response = await fetcher(characterAssetUrl)
  if (!response.ok) throw new Error('默认角色卡资源无法读取')
  const buffer = await response.arrayBuffer()
  const character = await importCharacterFile(new File([buffer], '迷迭香.png', { type: 'image/png' }))
  const now = Date.now()
  const importedPreset = importPreset(presetAsset as Record<string, unknown>)

  return {
    character: {
      ...character,
      id: BUNDLED_CHARACTER_ID,
      extensions: { ...character.extensions, mylittlephone_builtin: true },
    },
    preset: {
      ...importedPreset,
      id: BUNDLED_PRESET_ID,
      name: '默认预设',
      description: importedPreset.description || '随小手机内置的沉浸式聊天预设',
      createdAt: now,
      updatedAt: now,
    },
  }
}

export async function seedBundledDefaults(loader: BundledDefaultsLoader = loadBundledDefaults): Promise<boolean> {
  const [characters, presets, chats, settings] = await Promise.all([
    getCharacters(), getPresets(), getChats(), getSettings(),
  ])
  if (characters.length > 0 || presets.length > 0 || chats.length > 0 || !settings) return false

  const { character, preset } = await loader()
  const now = Date.now()
  const chat: ChatSession = {
    id: BUNDLED_CHAT_ID,
    name: `与 ${character.name} 的聊天`,
    messages: character.firstMes ? [{
      id: 'builtin-message-rosmontis-greeting',
      role: 'assistant',
      content: replaceMacros(character.firstMes, {
        userName: settings.userName,
        characterName: character.name,
        userInput: '',
      }),
      timestamp: now,
      status: 'sent',
    }] : [],
    characterId: character.id,
    characterName: character.name,
    userName: settings.userName,
    presetId: preset.id,
    lorebookIds: [],
    variables: {},
    createdAt: now,
    updatedAt: now,
  }
  const nextSettings = {
    ...settings,
    apiMode: 'single' as const,
    activeCharacterId: character.id,
    activePresetId: preset.id,
    activeLorebookIds: [],
    activeChatId: chat.id,
    characterName: character.name,
    api: {
      ...settings.api,
      baseUrl: '',
      apiKey: '',
      model: '',
      secondary: {
        enabled: false,
        baseUrl: '',
        apiKey: '',
        model: '',
        temperature: settings.api.secondary?.temperature,
        maxTokens: settings.api.secondary?.maxTokens,
      },
    },
  }

  await Promise.all([
    saveCharacter(character),
    savePreset(preset),
    saveChat(chat),
    saveSettings(nextSettings),
  ])
  return true
}
