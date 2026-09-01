export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'sent' | 'sending' | 'failed' | 'streaming' | 'interrupted'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
}

export interface CharacterCard {
  id: string
  name: string
  subtitle: string
  avatar: string
  bio: string
  personality: string[]
  speakingStyle: string
  background: string
  relationship: string
  note: string
  sourceFile: string
  importedAt: string
}

export interface WorldEntry {
  id: string
  title: string
  keywords: string[]
  priority: number
  content: string
  enabled: boolean
  triggered: boolean
  category: '地点' | '组织' | '人物' | '事件' | '规则'
}

export interface WorldBook {
  id: string
  name: string
  summary: string
  sourceFile: string
  importedAt: string
  entries: WorldEntry[]
}

export interface Preset {
  id: string
  name: string
  description: string
  responseLength: string
  perspective: string
  initiative: number
  emotion: number
  actionNarration: boolean
  mobileTone: boolean
  accent: string
}

export type PanelId = 'character' | 'worldbook' | 'presets' | 'session' | null
export type NoticeTone = 'success' | 'warning' | 'error' | 'info'

export interface Notice {
  id: string
  title: string
  message: string
  tone: NoticeTone
}

export interface GenerationState {
  status: 'idle' | 'thinking' | 'streaming'
  messageId: string | null
}

export interface PersistedState {
  messages: ChatMessage[]
  character: CharacterCard
  worldBook: WorldBook
  presets: Preset[]
  activePresetId: string
  createdAt: string
  memoryResetAt: string | null
  backgroundId: string
}

export interface AppState extends PersistedState {
  generation: GenerationState
  activePanel: PanelId
  notices: Notice[]
}

export type AppAction =
  | { type: 'send-message'; content: string; messageId?: string }
  | { type: 'start-reply'; messageId: string }
  | { type: 'append-reply'; messageId: string; chunk: string }
  | { type: 'finish-reply'; messageId: string }
  | { type: 'stop-reply' }
  | { type: 'fail-message'; messageId: string }
  | { type: 'remove-message'; messageId: string }
  | { type: 'edit-message'; messageId: string; content: string }
  | { type: 'delete-last-round' }
  | { type: 'select-preset'; presetId: string }
  | { type: 'toggle-world-entry'; entryId: string }
  | { type: 'replace-character'; character: CharacterCard }
  | { type: 'replace-worldbook'; worldBook: WorldBook }
  | { type: 'replace-presets'; presets: Preset[]; activePresetId: string }
  | { type: 'open-panel'; panel: Exclude<PanelId, null> }
  | { type: 'close-panel' }
  | { type: 'push-notice'; notice: Notice }
  | { type: 'dismiss-notice'; noticeId: string }
  | { type: 'clear-session' }
  | { type: 'reset-memory'; resetAt: string }
  | { type: 'set-background'; backgroundId: string }
  | { type: 'hydrate'; state: PersistedState }
