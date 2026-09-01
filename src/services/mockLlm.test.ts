import { describe, expect, it } from 'vitest'
import { demoCharacter, demoPresets } from '../domain/demoData'
import { streamReply } from './mockLlm'

describe('mock LLM stream', () => {
  it('returns a role-aware complete response in chunks', async () => {
    const chunks: string[] = []
    for await (const chunk of streamReply({
      character: demoCharacter,
      preset: demoPresets[0],
      userMessage: '今晚会下雨吗？',
      delayMs: 0,
    })) chunks.push(chunk)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toContain('雨')
  })

  it('stops yielding after its abort signal is cancelled', async () => {
    const controller = new AbortController()
    const chunks: string[] = []
    for await (const chunk of streamReply({
      character: demoCharacter,
      preset: demoPresets[1],
      userMessage: '继续说',
      signal: controller.signal,
      delayMs: 0,
    })) {
      chunks.push(chunk)
      controller.abort()
    }

    expect(chunks).toHaveLength(1)
  })
})
