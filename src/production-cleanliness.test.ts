import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = join(process.cwd(), 'src')
const forbiddenFiles = [
  'domain/demoData.ts', 'domain/chatReducer.ts', 'hooks/useChatApp.ts',
  'services/mockLlm.ts', 'services/storage.ts', 'assets/avatar-lin.svg',
]

function productionFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return productionFiles(path)
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(name)) return []
    return /\.[cm]?[jt]sx?$/.test(name) ? [path] : []
  })
}

describe('production source cleanliness', () => {
  it('contains no legacy mock-chat modules or seeded character assets', () => {
    for (const file of forbiddenFiles) expect(existsSync(join(sourceRoot, file)), file).toBe(false)
  })

  it('contains no browser-native dialogs, emoji, or seeded demo names', () => {
    const violations: string[] = []
    for (const file of productionFiles(sourceRoot)) {
      const rel = relative(sourceRoot, file).replaceAll('\\', '/')
      const source = readFileSync(file, 'utf8')
      if (/\b(?:alert|confirm|prompt)\s*\(/.test(source)) violations.push(`${rel}: native dialog`)
      if (/[\u{1F300}-\u{1FAFF}]/u.test(source)) violations.push(`${rel}: emoji`)
      if (/(林予泽|白鲸书屋|沉浸扮演|demoCharacter|demoMessages|demoPresets|demoWorldBook|mockLlm|streamReply)/.test(source)) violations.push(`${rel}: seeded or mock content`)
    }
    expect(violations).toEqual([])
  })
})
