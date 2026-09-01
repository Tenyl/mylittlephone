import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { clearAllData } from './sillytavern/database'

describe('accessibility contracts', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllData()
  })

  it('closes a panel with Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<App />)
    const trigger = await screen.findByRole('button', { name: '角色卡' })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: '角色卡库' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '角色卡库' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('exposes every configuration area through the mobile navigation', async () => {
    const { container } = render(<App />)
    await screen.findByRole('heading', { name: '从一张角色卡开始' })
    fireEvent.click(container.querySelector('#setup-mobile-navigation')!)

    const navigation = screen.getByRole('dialog', { name: '功能导航' })
    expect(within(navigation).getByRole('button', { name: /角色卡/ })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /世界书/ })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /对话预设/ })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /会话历史/ })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /系统设置/ })).toBeInTheDocument()
  })

  it('provides a polite live region and unique ids for interactive controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(await screen.findByRole('button', { name: '世界书' }))

    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
    await waitFor(() => {
      const controls = [...container.querySelectorAll<HTMLElement>('button, input, textarea, select')]
      const ids = controls.map((control) => control.id)
      expect(ids.every(Boolean)).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  it('keeps keyboard focus inside a settings dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '系统设置' }))
    const close = screen.getByRole('button', { name: '关闭系统设置' })
    const last = screen.getByRole('button', { name: '测试连接' })

    last.focus()
    await user.tab()
    expect(close).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })
})
