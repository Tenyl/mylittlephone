import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { chatReducer, createInitialState } from '../domain/chatReducer'
import type { Notice, PersistedState } from '../domain/types'
import { streamReply } from '../services/mockLlm'
import { loadPersistedState, savePersistedState } from '../services/storage'

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function useChatApp(streamDelayMs = 42) {
  const [state, dispatch] = useReducer(chatReducer, undefined, () => {
    const initial = createInitialState()
    if (typeof window === 'undefined') return initial
    const persisted = loadPersistedState(window.localStorage)
    return persisted ? chatReducer(initial, { type: 'hydrate', state: persisted }) : initial
  })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    savePersistedState(window.localStorage, state)
  }, [state.messages, state.character, state.worldBook, state.presets, state.activePresetId, state.backgroundId, state.createdAt, state.memoryResetAt])

  useEffect(() => () => abortRef.current?.abort(), [])

  const activePreset = useMemo(
    () => state.presets.find((preset) => preset.id === state.activePresetId) ?? state.presets[0],
    [state.activePresetId, state.presets],
  )

  const pushNotice = useCallback((notice: Omit<Notice, 'id'>) => {
    const noticeId = id('notice')
    dispatch({ type: 'push-notice', notice: { ...notice, id: noticeId } })
    window.setTimeout(() => dispatch({ type: 'dismiss-notice', noticeId }), 4200)
  }, [])

  const generate = useCallback(async (userMessage: string) => {
    const replyId = id('reply')
    const controller = new AbortController()
    abortRef.current = controller
    dispatch({ type: 'start-reply', messageId: replyId })
    try {
      for await (const chunk of streamReply({
        character: state.character,
        preset: activePreset,
        userMessage,
        signal: controller.signal,
        delayMs: streamDelayMs,
      })) {
        dispatch({ type: 'append-reply', messageId: replyId, chunk })
      }
      if (!controller.signal.aborted) dispatch({ type: 'finish-reply', messageId: replyId })
    } catch {
      dispatch({ type: 'fail-message', messageId: replyId })
      pushNotice({ tone: 'error', title: '回复生成失败', message: '模拟回复未能完成，请重新生成。' })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [activePreset, pushNotice, state.character, streamDelayMs])

  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed || state.generation.status !== 'idle') return false
    dispatch({ type: 'send-message', content: trimmed })
    void generate(trimmed)
    return true
  }, [generate, state.generation.status])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    dispatch({ type: 'stop-reply' })
  }, [])

  const regenerate = useCallback(() => {
    if (state.generation.status !== 'idle') return
    const lastUser = [...state.messages].reverse().find((message) => message.role === 'user')
    if (!lastUser) return
    const trailingAssistant = [...state.messages].reverse().find((message) => message.role === 'assistant')
    if (trailingAssistant && state.messages.indexOf(trailingAssistant) > state.messages.indexOf(lastUser)) {
      dispatch({ type: 'remove-message', messageId: trailingAssistant.id })
    }
    dispatch({ type: 'send-message', content: lastUser.content })
    dispatch({ type: 'remove-message', messageId: lastUser.id })
    void generate(lastUser.content)
  }, [generate, state.generation.status, state.messages])

  const hydrate = useCallback((persisted: PersistedState) => dispatch({ type: 'hydrate', state: persisted }), [])

  return { state, activePreset, dispatch, sendMessage, stopGeneration, regenerate, pushNotice, hydrate }
}
