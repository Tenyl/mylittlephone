import { describe, expect, it } from 'vitest'
import { chatReducer, createInitialState } from './chatReducer'

describe('chatReducer', () => {
  it('adds a trimmed user message and enters generation state', () => {
    const state = createInitialState()
    const next = chatReducer(state, { type: 'send-message', content: '  今晚还会下雨吗？  ' })

    expect(next.messages.at(-1)).toMatchObject({ role: 'user', content: '今晚还会下雨吗？', status: 'sent' })
    expect(next.generation.status).toBe('thinking')
  })

  it('ignores an empty message without changing generation state', () => {
    const state = createInitialState()
    const next = chatReducer(state, { type: 'send-message', content: '   ' })

    expect(next).toBe(state)
  })

  it('streams text into one assistant message and can stop it', () => {
    const state = chatReducer(createInitialState(), { type: 'send-message', content: '说点什么' })
    const started = chatReducer(state, { type: 'start-reply', messageId: 'reply-1' })
    const streamed = chatReducer(started, { type: 'append-reply', messageId: 'reply-1', chunk: '我在。' })
    const stopped = chatReducer(streamed, { type: 'stop-reply' })

    expect(stopped.messages.at(-1)).toMatchObject({ id: 'reply-1', content: '我在。', status: 'interrupted' })
    expect(stopped.generation.status).toBe('idle')
  })

  it('switches the active preset without mutating the preset catalog', () => {
    const state = createInitialState()
    const next = chatReducer(state, { type: 'select-preset', presetId: 'immersive' })

    expect(next.activePresetId).toBe('immersive')
    expect(next.presets).toHaveLength(3)
  })

  it('toggles a world-book entry by id', () => {
    const state = createInitialState()
    const entry = state.worldBook.entries[0]
    const next = chatReducer(state, { type: 'toggle-world-entry', entryId: entry.id })

    expect(next.worldBook.entries[0].enabled).toBe(!entry.enabled)
  })
})
