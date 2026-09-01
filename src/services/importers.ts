import type { CharacterCard, Preset, WorldBook, WorldEntry } from '../domain/types'
import avatarLin from '../assets/avatar-lin.svg'

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024

const now = () => new Date().toISOString()
const importedId = () => `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function readJson(text: string, fileName: string): Record<string, unknown> {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) throw new Error(`${fileName} 不能超过 2MB`)
  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root')
    return value as Record<string, unknown>
  } catch {
    throw new Error(`${fileName} 不是有效的 JSON 文件`)
  }
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`缺少必填字段“${label}”`)
  return value.trim()
}

const optionalText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

export function parseCharacterCard(text: string, fileName: string): CharacterCard {
  const data = readJson(text, fileName)
  return {
    id: importedId(),
    name: requiredText(data.name, '角色名称'),
    subtitle: optionalText(data.subtitle, '新导入的聊天对象'),
    avatar: optionalText(data.avatar, avatarLin),
    bio: requiredText(data.bio, '角色简介'),
    personality: Array.isArray(data.personality)
      ? data.personality.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
      : [],
    speakingStyle: optionalText(data.speakingStyle, '自然、口语化'),
    background: optionalText(data.background, '未提供更多背景资料。'),
    relationship: optionalText(data.relationship, '刚刚认识'),
    note: optionalText(data.note, '暂无附加备注。'),
    sourceFile: fileName,
    importedAt: now(),
  }
}

function parseEntry(value: unknown, index: number): WorldEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entry = value as Record<string, unknown>
  if (typeof entry.title !== 'string' || typeof entry.content !== 'string') return null
  const allowedCategories = ['地点', '组织', '人物', '事件', '规则'] as const
  const category = allowedCategories.includes(entry.category as (typeof allowedCategories)[number])
    ? (entry.category as WorldEntry['category'])
    : '规则'
  return {
    id: typeof entry.id === 'string' ? entry.id : `entry-${index}-${Date.now()}`,
    title: entry.title.trim(),
    category,
    keywords: Array.isArray(entry.keywords)
      ? entry.keywords.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [],
    priority: typeof entry.priority === 'number' ? Math.max(0, Math.min(100, entry.priority)) : 50,
    content: entry.content.trim(),
    enabled: typeof entry.enabled === 'boolean' ? entry.enabled : true,
    triggered: false,
  }
}

export function parseWorldBook(text: string, fileName: string): WorldBook {
  const data = readJson(text, fileName)
  const entries = Array.isArray(data.entries)
    ? data.entries.map(parseEntry).filter((entry): entry is WorldEntry => Boolean(entry?.title && entry.content))
    : []
  if (!entries.length) throw new Error('世界书至少需要一个有效条目')
  return {
    id: importedId(),
    name: requiredText(data.name, '世界书名称'),
    summary: optionalText(data.summary, '这份世界书尚未提供简介。'),
    sourceFile: fileName,
    importedAt: now(),
    entries,
  }
}

export function parsePreset(text: string, fileName: string): Preset {
  const data = readJson(text, fileName)
  const clamp = (value: unknown, fallback: number) =>
    typeof value === 'number' ? Math.max(0, Math.min(100, value)) : fallback
  return {
    id: importedId(),
    name: requiredText(data.name, '预设名称'),
    description: requiredText(data.description, '预设说明'),
    responseLength: optionalText(data.responseLength, '适中'),
    perspective: optionalText(data.perspective, '第一人称'),
    initiative: clamp(data.initiative, 50),
    emotion: clamp(data.emotion, 50),
    actionNarration: Boolean(data.actionNarration),
    mobileTone: data.mobileTone !== false,
    accent: optionalText(data.accent, '#4f8cff'),
  }
}
