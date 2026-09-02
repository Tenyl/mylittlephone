import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'

let characterPng
try {
  const updaterPath = './update-character-prompt.mjs'
  characterPng = await import(updaterPath)
} catch {
  characterPng = null
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const output = Buffer.alloc(data.length + 12)
  output.writeUInt32BE(data.length, 0)
  typeBytes.copy(output, 4)
  data.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8)
  return output
}

function characterTextChunk(keyword, payload) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
  return chunk('tEXt', Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.from([0]), Buffer.from(encoded, 'latin1')]))
}

function fixturePng(payload) {
  const pixels = Buffer.from('PIXELS_MUST_STAY_BYTE_IDENTICAL')
  return {
    pixels,
    png: Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      characterTextChunk('chara', payload),
      chunk('IDAT', pixels),
      characterTextChunk('ccv3', payload),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  }
}

describe('private character prompt updater', () => {
  it('updates both character payloads while preserving pixels and every other card field', () => {
    expect(characterPng, '角色卡更新工具尚未实现').not.toBeNull()
    const original = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: '迷迭香',
        description: '旧提示词',
        first_mes: '嗯...我在。',
        extensions: { depth_prompt: { prompt: '保留内容' } },
      },
    }
    const { png, pixels } = fixturePng(original)

    const updated = characterPng.updateCharacterPrompt(png, '称呼 {{user}}，身份是博士。')
    const payloads = characterPng.extractCharacterPayloads(updated.buffer)

    expect(updated.updatedKeywords).toEqual(['chara', 'ccv3'])
    expect(payloads.chara).toEqual({ ...original, data: { ...original.data, description: '称呼 {{user}}，身份是博士。' } })
    expect(payloads.ccv3).toEqual(payloads.chara)
    expect(characterPng.extractChunks(updated.buffer, 'IDAT')).toEqual([pixels])
  })

  it('rejects cards that do not contain both synchronized payloads', () => {
    expect(characterPng, '角色卡更新工具尚未实现').not.toBeNull()
    const payload = { data: { name: '迷迭香', description: '旧提示词' } }
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      characterTextChunk('chara', payload),
      chunk('IEND', Buffer.alloc(0)),
    ])

    expect(() => characterPng.updateCharacterPrompt(png, '新提示词')).toThrow(/chara.*ccv3/i)
  })
})
