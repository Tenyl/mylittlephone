import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const CHARACTER_KEYWORDS = new Set(['chara', 'ccv3'])

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const output = Buffer.allocUnsafe(data.length + 12)
  output.writeUInt32BE(data.length, 0)
  typeBytes.copy(output, 4)
  data.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8)
  return output
}

function readChunks(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('文件不是有效 PNG')
  const chunks = []
  let offset = 8
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const end = offset + length + 12
    if (end > buffer.length) throw new Error('PNG 数据块长度无效')
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    chunks.push({
      type,
      data: buffer.subarray(offset + 8, offset + 8 + length),
      raw: buffer.subarray(offset, end),
    })
    offset = end
    if (type === 'IEND') break
  }
  if (!chunks.some((chunk) => chunk.type === 'IEND')) throw new Error('PNG 缺少 IEND 数据块')
  return chunks
}

function decodeCharacterTextChunk(data) {
  const separator = data.indexOf(0)
  if (separator < 0) return null
  const keyword = data.subarray(0, separator).toString('latin1')
  if (!CHARACTER_KEYWORDS.has(keyword)) return null
  const encoded = data.subarray(separator + 1).toString('latin1')
  return { keyword, payload: JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) }
}

function encodeCharacterTextChunk(keyword, payload) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
  return createChunk('tEXt', Buffer.concat([
    Buffer.from(keyword, 'latin1'),
    Buffer.from([0]),
    Buffer.from(encoded, 'latin1'),
  ]))
}

export function extractChunks(buffer, type) {
  return readChunks(buffer).filter((chunk) => chunk.type === type).map((chunk) => Buffer.from(chunk.data))
}

export function extractCharacterPayloads(buffer) {
  const payloads = {}
  for (const chunk of readChunks(buffer)) {
    if (chunk.type !== 'tEXt') continue
    const decoded = decodeCharacterTextChunk(chunk.data)
    if (decoded) payloads[decoded.keyword] = decoded.payload
  }
  return payloads
}

function updateDescription(payload, prompt) {
  const next = structuredClone(payload)
  if (next?.data && typeof next.data === 'object' && !Array.isArray(next.data)) next.data.description = prompt
  else if (next && typeof next === 'object' && !Array.isArray(next)) next.description = prompt
  else throw new Error('角色卡数据格式无效')
  return next
}

export function updateCharacterPrompt(buffer, prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('提示词不能为空')
  const chunks = readChunks(buffer)
  const currentPayloads = extractCharacterPayloads(buffer)
  if (!currentPayloads.chara || !currentPayloads.ccv3) throw new Error('角色卡必须同时包含 chara 与 ccv3 数据块')
  if (JSON.stringify(currentPayloads.chara) !== JSON.stringify(currentPayloads.ccv3)) throw new Error('角色卡的 chara 与 ccv3 数据不一致')

  const updatedPayload = updateDescription(currentPayloads.chara, prompt)
  const updatedKeywords = []
  const outputChunks = [PNG_SIGNATURE]
  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      const decoded = decodeCharacterTextChunk(chunk.data)
      if (decoded) {
        outputChunks.push(encodeCharacterTextChunk(decoded.keyword, updatedPayload))
        updatedKeywords.push(decoded.keyword)
        continue
      }
    }
    outputChunks.push(chunk.raw)
  }
  return { buffer: Buffer.concat(outputChunks), updatedKeywords }
}

async function main() {
  const [cardPath, promptPath, outputPath = cardPath] = process.argv.slice(2)
  if (!cardPath || !promptPath) {
    process.stderr.write('用法：node scripts/update-character-prompt.mjs <角色卡.png> <提示词.txt> [输出.png]\n')
    process.exitCode = 1
    return
  }
  const [source, prompt] = await Promise.all([readFile(resolve(cardPath)), readFile(resolve(promptPath), 'utf8')])
  const normalizedPrompt = prompt.replace(/\r\n/g, '\n').trim()
  const updated = updateCharacterPrompt(source, normalizedPrompt)
  await writeFile(resolve(outputPath), updated.buffer)
  process.stdout.write(`Updated ${updated.updatedKeywords.join(' and ')} character prompts in ${resolve(outputPath)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
