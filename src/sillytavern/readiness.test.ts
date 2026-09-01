import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type CharacterCard, type ChatPreset } from './types'
import { getSetupReadiness } from './readiness'

const character = { id: 'c', name: '角色' } as CharacterCard
const preset = { id: 'p', name: '预设' } as ChatPreset

describe('setup readiness', () => {
  it('blocks an empty library from starting or sending', () => {
    const readiness = getSetupReadiness({
      character: null,
      preset: null,
      lorebookCount: 0,
      hasActiveChat: false,
      settings: DEFAULT_SETTINGS,
    })

    expect(readiness.canStartChat).toBe(false)
    expect(readiness.canSend).toBe(false)
    expect(readiness.steps.character.status).toBe('missing')
    expect(readiness.steps.primaryApi.status).toBe('complete')
  })

  it('reports secondary API separately in dual mode', () => {
    const readiness = getSetupReadiness({
      character,
      preset,
      lorebookCount: 0,
      hasActiveChat: true,
      settings: {
        ...DEFAULT_SETTINGS,
        apiSource: 'custom',
        apiMode: 'dual',
        api: { ...DEFAULT_SETTINGS.api, baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', secondary: undefined },
      },
    })

    expect(readiness.canSend).toBe(true)
    expect(readiness.steps.secondaryApi.status).toBe('missing')
    expect(readiness.steps.worldbook.status).toBe('optional')
  })

  it('allows immediate sending in managed mode without browser API credentials', () => {
    const readiness = getSetupReadiness({
      character,
      preset,
      lorebookCount: 0,
      hasActiveChat: true,
      settings: DEFAULT_SETTINGS,
    })

    expect(readiness.canStartChat).toBe(true)
    expect(readiness.canSend).toBe(true)
    expect(readiness.missingReasons).toEqual([])
    expect(readiness.steps.primaryApi.detail).toBe('使用站点托管聊天服务')
  })

  it('still requires complete browser credentials in custom API mode', () => {
    const readiness = getSetupReadiness({
      character,
      preset,
      lorebookCount: 0,
      hasActiveChat: true,
      settings: { ...DEFAULT_SETTINGS, apiSource: 'custom' } as typeof DEFAULT_SETTINGS,
    })

    expect(readiness.canSend).toBe(false)
    expect(readiness.missingReasons).toEqual(['请完整配置主 API 地址、密钥与模型'])
    expect(readiness.steps.primaryApi.status).toBe('missing')
  })

  it('allows chat when required content and primary API are ready', () => {
    const readiness = getSetupReadiness({
      character,
      preset,
      lorebookCount: 1,
      hasActiveChat: true,
      settings: {
        ...DEFAULT_SETTINGS,
        api: {
          ...DEFAULT_SETTINGS.api,
          baseUrl: 'https://example.test/v1',
          apiKey: 'secret',
          model: 'model',
          secondary: { enabled: true, baseUrl: 'https://secondary.test/v1', apiKey: 'secret-2', model: 'model-2' },
        },
      },
    })

    expect(readiness.canStartChat).toBe(true)
    expect(readiness.canSend).toBe(true)
    expect(readiness.missingReasons).toEqual([])
  })
})
