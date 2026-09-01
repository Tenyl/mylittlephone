import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

describe('configuration panels', () => {
  beforeEach(() => localStorage.clear())

  it('opens the character card with complete imported metadata', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)

    await user.click(screen.getByRole('button', { name: '角色卡' }))

    const dialog = screen.getByRole('dialog', { name: '角色卡' })
    expect(within(dialog).getByText('旧城书店的夜班店员')).toBeInTheDocument()
    expect(within(dialog).getByText('林予泽_角色卡.json')).toBeInTheDocument()
  })

  it('uses the imported character name in the message composer', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<App streamDelayMs={0} />)
    await user.click(screen.getByRole('button', { name: '角色卡' }))

    const input = document.querySelector<HTMLInputElement>('#import-character-file')!
    await user.upload(input, new File([
      JSON.stringify({ name: '顾遥', bio: '长期记录城市夜景。' }),
    ], '顾遥.json', { type: 'application/json' }))

    await waitFor(() => expect(screen.getByLabelText('输入聊天消息')).toHaveAttribute('placeholder', '发消息给顾遥'))
  })

  it('switches presets and announces when the change takes effect', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    await user.click(screen.getByRole('button', { name: '对话预设' }))

    await user.click(screen.getByRole('button', { name: '选择沉浸扮演' }))

    expect(screen.getByText('预设已切换')).toBeInTheDocument()
    expect(screen.getByText('“沉浸扮演”将在下一条消息中生效。')).toBeInTheDocument()
  })

  it('expands and disables a world-book entry', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    await user.click(screen.getByRole('button', { name: '世界书' }))

    await user.click(screen.getByRole('button', { name: '展开白鲸书屋' }))
    expect(screen.getByText(/凌晨一点打烊/)).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: '启用白鲸书屋' }))
    expect(screen.getByRole('switch', { name: '启用白鲸书屋' })).toHaveAttribute('aria-checked', 'false')
  })

  it('requires an in-app confirmation before clearing the conversation', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    await user.click(screen.getByRole('button', { name: '会话详情' }))
    await user.click(screen.getByRole('button', { name: '清空当前会话' }))

    const confirmation = screen.getByRole('alertdialog', { name: '清空当前会话？' })
    await user.click(within(confirmation).getByRole('button', { name: '确认清空' }))
    expect(screen.getByText('对话已经清空')).toBeInTheDocument()
  })
})
