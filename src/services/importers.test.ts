import { describe, expect, it } from 'vitest'
import { parseCharacterCard, parsePreset, parseWorldBook } from './importers'

describe('JSON importers', () => {
  it('parses a complete character card and records its source', () => {
    const card = parseCharacterCard(JSON.stringify({
      name: '顾遥',
      subtitle: '独立摄影师',
      bio: '长期记录城市夜景。',
      personality: ['直接', '细心'],
      speakingStyle: '自然简洁',
      background: '来自北方沿海城市。',
      relationship: '刚刚认识',
      note: '喜欢黑咖啡',
    }), '顾遥.json')

    expect(card).toMatchObject({ name: '顾遥', sourceFile: '顾遥.json', personality: ['直接', '细心'] })
  })

  it('rejects malformed and oversized character imports with a recoverable message', () => {
    expect(() => parseCharacterCard('{bad json', '损坏.json')).toThrow('不是有效的 JSON')
    expect(() => parseCharacterCard('x'.repeat(2 * 1024 * 1024 + 1), '过大.json')).toThrow('不能超过 2MB')
  })

  it('requires at least one valid world-book entry', () => {
    expect(() => parseWorldBook(JSON.stringify({ name: '空世界书', entries: [] }), '空.json')).toThrow('至少需要一个有效条目')
  })

  it('normalizes a single imported preset into the shared preset shape', () => {
    const preset = parsePreset(JSON.stringify({
      name: '安静倾听',
      description: '少说，多听。',
      responseLength: '简短',
      perspective: '第一人称',
      initiative: 20,
      emotion: 45,
      actionNarration: false,
      mobileTone: true,
    }), '安静倾听.json')

    expect(preset.id).toContain('imported-')
    expect(preset.initiative).toBe(20)
  })
})
