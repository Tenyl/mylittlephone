import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const inputPath = resolve(process.argv[2] ?? 'assets/character/迷迭香.png')
const sensitiveTopLevelFields = ['description', 'personality', 'scenario', 'mes_example', 'creatorcomment']
const sensitiveDataFields = [
  'description',
  'personality',
  'scenario',
  'mes_example',
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
]

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
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

function sanitizePayload(payload) {
  for (const field of sensitiveTopLevelFields) payload[field] = ''
  if (!payload.data || typeof payload.data !== 'object') payload.data = {}
  for (const field of sensitiveDataFields) payload.data[field] = ''
  if (payload.data.extensions?.depth_prompt && typeof payload.data.extensions.depth_prompt === 'object') {
    payload.data.extensions.depth_prompt.prompt = ''
  }
  return payload
}

const source = await readFile(inputPath)
const chunks = [source.subarray(0, 8)]
let offset = 8
let sanitizedCount = 0

while (offset + 12 <= source.length) {
  const length = source.readUInt32BE(offset)
  const type = source.toString('ascii', offset + 4, offset + 8)
  const data = source.subarray(offset + 8, offset + 8 + length)
  let nextChunk = source.subarray(offset, offset + length + 12)

  if (type === 'tEXt') {
    const separator = data.indexOf(0)
    const keyword = separator >= 0 ? data.subarray(0, separator).toString('latin1') : ''
    if (keyword === 'chara' || keyword === 'ccv3') {
      const encoded = data.subarray(separator + 1).toString('latin1')
      const payload = sanitizePayload(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')))
      const sanitized = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
      nextChunk = createChunk('tEXt', Buffer.concat([
        Buffer.from(keyword, 'latin1'),
        Buffer.from([0]),
        Buffer.from(sanitized, 'latin1'),
      ]))
      sanitizedCount += 1
    }
  }

  chunks.push(nextChunk)
  offset += length + 12
  if (type === 'IEND') break
}

if (sanitizedCount !== 2) throw new Error(`Expected chara and ccv3 chunks, sanitized ${sanitizedCount}`)
await writeFile(inputPath, Buffer.concat(chunks))
process.stdout.write(`Sanitized ${sanitizedCount} character metadata chunks in ${inputPath}\n`)
