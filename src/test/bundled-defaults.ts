import { BUNDLED_CHARACTER_ID, BUNDLED_CHARACTER_VERSION, BUNDLED_PRESET_ID, type BundledDefaultsLoader } from '../sillytavern/default-content'
import type { CharacterCard, ChatPreset } from '../sillytavern/types'

const character: CharacterCard = {
  id: BUNDLED_CHARACTER_ID,
  spec: 'chara_card_v2',
  specVersion: '2.0',
  name: '迷迭香',
  avatar: '',
  description: '罗德岛精英干员。',
  personality: '安静、认真。',
  scenario: '通过私人终端聊天。',
  firstMes: '嗯...我在。',
  mesExample: '',
  creatorNotes: '',
  systemPrompt: '',
  postHistoryInstructions: '',
  alternateGreetings: [],
  tags: ['明日方舟'],
  creator: '',
  characterVersion: '1',
  extensions: { mylittlephone_builtin: true, mylittlephone_builtin_version: BUNDLED_CHARACTER_VERSION },
  sourceFile: '迷迭香.png',
  importedAt: 1,
  updatedAt: 1,
}

const preset: ChatPreset = {
  id: BUNDLED_PRESET_ID,
  name: '默认预设',
  description: '测试用内置预设',
  settings: { main: '扮演 {{char}}。', stream_openai: true, prompts: [] },
  createdAt: 1,
  updatedAt: 1,
}

export const testBundledDefaultsLoader: BundledDefaultsLoader = async () => ({ character, preset })
