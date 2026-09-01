import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const sourcePath = process.argv[2]
if (!sourcePath) {
  process.stderr.write('用法：node scripts/encode-managed-character.mjs <私有角色卡.png|json>\n')
  process.exit(1)
}

function extractPngCharacter(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error('文件不是有效 PNG')
  let offset = 8
  const payloads = new Map()
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'tEXt') {
      const separator = data.indexOf(0)
      const keyword = separator >= 0 ? data.subarray(0, separator).toString('latin1') : ''
      if (keyword === 'chara' || keyword === 'ccv3') {
        payloads.set(keyword, Buffer.from(data.subarray(separator + 1).toString('latin1'), 'base64').toString('utf8'))
      }
    }
    offset += length + 12
    if (type === 'IEND') break
  }
  const raw = payloads.get('ccv3') ?? payloads.get('chara')
  if (!raw) throw new Error('PNG 中没有找到 chara 或 ccv3 角色数据')
  if (payloads.has('chara') && payloads.has('ccv3')) {
    const left = JSON.stringify(JSON.parse(payloads.get('chara')))
    const right = JSON.stringify(JSON.parse(payloads.get('ccv3')))
    if (left !== right) throw new Error('PNG 的 chara 与 ccv3 数据不一致，请先修复角色卡')
  }
  return JSON.parse(raw)
}

const absolutePath = resolve(sourcePath)
const bytes = await readFile(absolutePath)
const payload = extname(absolutePath).toLowerCase() === '.png'
  ? extractPngCharacter(bytes)
  : JSON.parse(bytes.toString('utf8'))
const encoded = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 }).toString('base64')

process.stdout.write(encoded)
