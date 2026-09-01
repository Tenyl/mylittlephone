import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SetupReadiness } from '../../sillytavern/readiness'
import { SetupGuide } from './SetupGuide'

const missing: SetupReadiness = {
  canStartChat: false,
  canSend: false,
  missingReasons: ['请先导入并选择角色卡'],
  steps: {
    character: { status: 'missing', label: '角色卡', detail: '支持 SillyTavern PNG 与 Character Card V2 JSON' },
    preset: { status: 'missing', label: '对话预设', detail: '导入一个 SillyTavern 对话预设' },
    primaryApi: { status: 'missing', label: '主 API', detail: '填写兼容 OpenAI 的地址、密钥与模型' },
    worldbook: { status: 'optional', label: '世界书', detail: '可选：导入背景设定与触发条目' },
    secondaryApi: { status: 'missing', label: '次 API', detail: '用于变量与总结' },
  },
}

describe('SetupGuide', () => {
  it('shows an actionable three-step empty state', async () => {
    const user = userEvent.setup()
    const openCharacter = vi.fn()
    const openPreset = vi.fn()
    const openSettings = vi.fn()
    render(<SetupGuide readiness={missing} onOpenCharacter={openCharacter} onOpenPreset={openPreset} onOpenSettings={openSettings} onOpenLorebooks={vi.fn()} onStart={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '从一张角色卡开始' })).toBeInTheDocument()
    expect(screen.getByText(/PNG 与 Character Card V2 JSON/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始新会话' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '导入角色卡' }))
    await user.click(screen.getByRole('button', { name: '导入对话预设' }))
    await user.click(screen.getByRole('button', { name: '配置主次 API' }))
    expect(openCharacter).toHaveBeenCalledOnce()
    expect(openPreset).toHaveBeenCalledOnce()
    expect(openSettings).toHaveBeenCalledOnce()
  })

  it('enables starting when required setup is complete', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    const ready: SetupReadiness = {
      ...missing,
      canStartChat: true,
      missingReasons: [],
      steps: {
        ...missing.steps,
        character: { status: 'complete', label: '角色卡', detail: '已选择 白露' },
        preset: { status: 'complete', label: '对话预设', detail: '已选择 日常聊天' },
        primaryApi: { status: 'complete', label: '主 API', detail: '已配置 model' },
      },
    }
    render(<SetupGuide readiness={ready} onOpenCharacter={vi.fn()} onOpenPreset={vi.fn()} onOpenSettings={vi.fn()} onOpenLorebooks={vi.fn()} onStart={onStart} />)

    await user.click(screen.getByRole('button', { name: '开始新会话' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
