import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('accessibility contracts', () => {
  beforeEach(() => localStorage.clear())

  it('closes a panel with Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    const trigger = screen.getByRole('button', { name: '角色卡' })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: '角色卡' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '角色卡' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('exposes every configuration area through the mobile navigation', async () => {
    const { container } = render(<App streamDelayMs={0} />)
    fireEvent.click(container.querySelector('#chat-open-navigation')!)

    const navigation = screen.getByRole('dialog', { name: '功能导航' })
    expect(within(navigation).getByRole('button', { name: '角色卡' })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: '世界书' })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: '对话预设' })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: '会话详情' })).toBeInTheDocument()
  })

  it('provides a polite live region and unique ids for interactive controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<App streamDelayMs={0} />)
    await user.click(screen.getByRole('button', { name: '世界书' }))

    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
    const controls = [...container.querySelectorAll<HTMLElement>('button, input, textarea')]
    const ids = controls.map((control) => control.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
