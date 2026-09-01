import { describe, expect, it } from 'vitest'
import { MAX_CHARACTER_FILE_BYTES, importCharacterFile, parseCharacterCardV2 } from './character-importer'

const cardData = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: '测试角色',
    description: '住在海边的记录员。',
    personality: '沉静、敏锐',
    scenario: '雨夜的港口。',
    first_mes: '你好。',
    mes_example: '<START>\n{{char}}：海风很冷。',
    creator_notes: '保持克制。',
    system_prompt: '始终扮演 {{char}}。',
    post_history_instructions: '不要代替 {{user}} 行动。',
    alternate_greetings: ['你来了。'],
    tags: ['现代', '日常'],
    creator: 'tester',
    character_version: '1.2',
    extensions: { talkativeness: 0.6 },
  },
}

function makePngWithText(keyword: string, text: string): Uint8Array {
  const encoder = new TextEncoder()
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const makeChunk = (type: string, data: Uint8Array) => {
    const chunk = new Uint8Array(12 + data.length)
    const view = new DataView(chunk.buffer)
    view.setUint32(0, data.length)
    chunk.set(encoder.encode(type), 4)
    chunk.set(data, 8)
    return chunk
  }
  const payload = encoder.encode(`${keyword}\0${text}`)
  const textChunk = makeChunk('tEXt', payload)
  const endChunk = makeChunk('IEND', new Uint8Array())
  const png = new Uint8Array(signature.length + textChunk.length + endChunk.length)
  png.set(signature)
  png.set(textChunk, signature.length)
  png.set(endChunk, signature.length + textChunk.length)
  return png
}

function encodeBase64Utf8(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

describe('Character Card V2 importer', () => {
  it('normalizes a wrapped V2 card', () => {
    const card = parseCharacterCardV2(cardData, 'card.json')

    expect(card).toMatchObject({
      name: '测试角色',
      firstMes: '你好。',
      spec: 'chara_card_v2',
      specVersion: '2.0',
      sourceFile: 'card.json',
    })
    expect(card.extensions.talkativeness).toBe(0.6)
  })

  it('extracts chara metadata and uses the PNG itself as avatar', async () => {
    const png = makePngWithText('chara', encodeBase64Utf8(JSON.stringify(cardData)))
    const file = new File([toArrayBuffer(png)], 'card.png', { type: 'image/png' })

    const card = await importCharacterFile(file)

    expect(card.name).toBe('测试角色')
    expect(card.avatar.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('rejects PNG files without SillyTavern metadata', async () => {
    const png = makePngWithText('note', 'not-a-card')
    await expect(importCharacterFile(new File([toArrayBuffer(png)], 'plain.png', { type: 'image/png' })))
      .rejects.toThrow('未找到 SillyTavern 角色数据')
  })

  it('rejects unsupported and oversized files', async () => {
    await expect(importCharacterFile(new File(['x'], 'card.txt', { type: 'text/plain' })))
      .rejects.toThrow('仅支持 PNG 或 JSON')
    await expect(importCharacterFile(new File([new ArrayBuffer(MAX_CHARACTER_FILE_BYTES + 1)], 'huge.png')))
      .rejects.toThrow('不能超过 10MB')
  })

  it('rejects cards without a character name', () => {
    expect(() => parseCharacterCardV2({ ...cardData, data: { ...cardData.data, name: '' } }, 'bad.json'))
      .toThrow('缺少角色名称')
  })
})
