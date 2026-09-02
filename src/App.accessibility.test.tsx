import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { clearAllData } from './sillytavern/database'
import { testBundledDefaultsLoader } from './test/bundled-defaults'

describe('accessibility contracts', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllData()
  })

  it('closes the management center with Escape and restores focus to the gear', async () => {
    const user = userEvent.setup()
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    const trigger = await screen.findByRole('button', { name: '打开管理中心' })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: '管理中心' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '管理中心' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('exposes every configuration area through one management center', async () => {
    const user = userEvent.setup()
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await screen.findByRole('heading', { name: '迷迭香' })
    await user.click(screen.getByRole('button', { name: '打开管理中心' }))

    const center = screen.getByRole('dialog', { name: '管理中心' })
    const managementItems = within(within(center).getByRole('navigation', { name: '管理项目' })).getAllByRole('button')
    expect(managementItems[0]).toHaveAccessibleName(/当前聊天/)
    expect(managementItems[1]).toHaveAccessibleName(/我的资料/)
    expect(within(center).getByRole('button', { name: /角色卡/ })).toBeInTheDocument()
    expect(within(center).getByRole('button', { name: /世界书/ })).toBeInTheDocument()
    expect(within(center).getByRole('button', { name: /对话预设/ })).toBeInTheDocument()
    expect(within(center).getByRole('button', { name: /API 与设置/ })).toBeInTheDocument()
    expect(within(center).getByRole('button', { name: /会话变量/ })).toBeInTheDocument()
    expect(within(center).getByRole('button', { name: /本地数据/ })).toBeInTheDocument()
  })

  it('moves focus to the back control when entering a management section', async () => {
    const user = userEvent.setup()
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await user.click(await screen.findByRole('button', { name: '打开管理中心' }))
    await user.click(within(screen.getByRole('dialog', { name: '管理中心' })).getByRole('button', { name: /世界书/ }))

    const back = screen.getByRole('button', { name: '返回管理中心' })
    expect(back).toHaveFocus()
    await user.click(back)
    expect(screen.getByRole('button', { name: '关闭管理中心' })).toHaveFocus()
  })

  it('provides a polite live region and unique ids for interactive controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await user.click(await screen.findByRole('button', { name: '打开管理中心' }))
    await user.click(within(screen.getByRole('dialog', { name: '管理中心' })).getByRole('button', { name: /世界书/ }))

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
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await user.click(await screen.findByRole('button', { name: '打开管理中心' }))
    await user.click(within(screen.getByRole('dialog', { name: '管理中心' })).getByRole('button', { name: /API 与设置/ }))
    const first = screen.getByRole('button', { name: '返回管理中心' })
    const last = screen.getByRole('radio', { name: /自定义 API/ })

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })
})
