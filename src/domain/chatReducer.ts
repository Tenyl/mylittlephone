import { demoCharacter, demoMessages, demoPresets, demoWorldBook } from './demoData'
import type { AppAction, AppState, ChatMessage, PersistedState } from './types'

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const createInitialState = (): AppState => ({
  messages: demoMessages,
  character: demoCharacter,
  worldBook: demoWorldBook,
  presets: demoPresets,
  activePresetId: 'daily',
  createdAt: '2026-09-01T22:31:00+08:00',
  memoryResetAt: null,
  backgroundId: 'rain',
  generation: { status: 'idle', messageId: null },
  activePanel: null,
  notices: [],
})

const replacePersistedState = (state: AppState, persisted: PersistedState): AppState => ({
  ...state,
  ...persisted,
  generation: { status: 'idle', messageId: null },
})

export function chatReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'send-message': {
      const content = action.content.trim()
      if (!content || state.generation.status !== 'idle') return state
      const message: ChatMessage = {
        id: action.messageId ?? newId('user'),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
      return { ...state, messages: [...state.messages, message], generation: { status: 'thinking', messageId: null } }
    }
    case 'start-reply': {
      const reply: ChatMessage = {
        id: action.messageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'streaming',
      }
      return { ...state, messages: [...state.messages, reply], generation: { status: 'streaming', messageId: action.messageId } }
    }
    case 'append-reply':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.messageId ? { ...message, content: message.content + action.chunk } : message,
        ),
      }
    case 'finish-reply':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.messageId ? { ...message, status: 'sent' } : message,
        ),
        generation: { status: 'idle', messageId: null },
      }
    case 'stop-reply':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === state.generation.messageId ? { ...message, status: 'interrupted' } : message,
        ),
        generation: { status: 'idle', messageId: null },
      }
    case 'fail-message':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.messageId ? { ...message, status: 'failed' } : message,
        ),
        generation: { status: 'idle', messageId: null },
      }
    case 'remove-message':
      return { ...state, messages: state.messages.filter((message) => message.id !== action.messageId) }
    case 'edit-message': {
      const content = action.content.trim()
      if (!content) return state
      const index = state.messages.findIndex((message) => message.id === action.messageId && message.role === 'user')
      if (index < 0) return state
      return { ...state, messages: state.messages.slice(0, index).concat({ ...state.messages[index], content }) }
    }
    case 'delete-last-round': {
      const lastUserIndex = state.messages.findLastIndex((message) => message.role === 'user')
      if (lastUserIndex < 0) return state
      return { ...state, messages: state.messages.slice(0, lastUserIndex), generation: { status: 'idle', messageId: null } }
    }
    case 'select-preset':
      return state.presets.some((preset) => preset.id === action.presetId)
        ? { ...state, activePresetId: action.presetId }
        : state
    case 'toggle-world-entry':
      return {
        ...state,
        worldBook: {
          ...state.worldBook,
          entries: state.worldBook.entries.map((entry) =>
            entry.id === action.entryId ? { ...entry, enabled: !entry.enabled } : entry,
          ),
        },
      }
    case 'replace-character':
      return { ...state, character: action.character }
    case 'replace-worldbook':
      return { ...state, worldBook: action.worldBook }
    case 'replace-presets':
      return { ...state, presets: action.presets, activePresetId: action.activePresetId }
    case 'open-panel':
      return { ...state, activePanel: action.panel }
    case 'close-panel':
      return { ...state, activePanel: null }
    case 'push-notice':
      return { ...state, notices: [...state.notices, action.notice].slice(-3) }
    case 'dismiss-notice':
      return { ...state, notices: state.notices.filter((notice) => notice.id !== action.noticeId) }
    case 'clear-session':
      return { ...state, messages: [], generation: { status: 'idle', messageId: null } }
    case 'reset-memory':
      return { ...state, memoryResetAt: action.resetAt }
    case 'set-background':
      return { ...state, backgroundId: action.backgroundId }
    case 'hydrate':
      return replacePersistedState(state, action.state)
    default:
      return state
  }
}
