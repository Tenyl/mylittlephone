import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getEmptyFirstSettings } from '../../sillytavern/database'
import { SettingsPanel } from './SettingsPanel'

function renderSettings(apiSource: 'managed' | 'custom' = 'custom') {
  const settings = getEmptyFirstSettings()
  settings.apiSource = apiSource
  settings.apiMode = 'dual'
  settings.api = {
    ...settings.api,
    baseUrl: 'https://api.example.test/v1', apiKey: 'primary-secret', model: 'model-a',
    secondary: { enabled: true, baseUrl: 'https://secondary.example.test/v1', apiKey: 'secondary-secret', model: 'model-b', temperature: 0.6, maxTokens: 4096 },
  }
  const props = { settings, onUpdate: vi.fn(), onNotice: vi.fn(), onRequestClear: vi.fn(), onExport: vi.fn(), onImport: vi.fn() }
  render(<SettingsPanel {...props} />)
  return props
}

describe('SillyTavern settings panel', () => {
  it('hides all provider configuration in managed mode and offers an explicit custom mode switch', async () => {
    const user = userEvent.setup()
    const props = renderSettings('managed')

    expect(screen.getByText('由站点安全提供')).toBeInTheDocument()
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('模型')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /自定义 API/ }))
    expect(props.onUpdate).toHaveBeenCalledWith({ apiSource: 'custom' })

    await user.click(screen.getByRole('button', { name: '次 API' }))
    expect(screen.getByText('托管模式不需要配置次 API')).toBeInTheDocument()
    expect(screen.queryByLabelText('次 API 温度')).not.toBeInTheDocument()
  })

  it('masks API secrets and exposes complete primary and secondary configuration', async () => {
    const user = userEvent.setup()
    renderSettings()
    const primaryKey = screen.getByLabelText('API Key')
    expect(primaryKey).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: '显示主 API 密钥' }))
    expect(primaryKey).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: '次 API' }))
    expect(screen.getByRole('checkbox', { name: /启用双 API/ })).toBeChecked()
    expect(screen.getByLabelText('次 API 温度')).toHaveValue(0.6)
    expect(screen.getByLabelText('次 API 最大输出 Token')).toHaveValue(4096)
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
  })

  it('keeps game tags editable with icon buttons and exposes backup controls', async () => {
    const user = userEvent.setup()
    const props = renderSettings()
    await user.click(screen.getByRole('button', { name: '游戏显示' }))
    expect(screen.getByText('maintext')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '删除标签thinking' }))
    expect(props.onUpdate).toHaveBeenCalledWith({ customTags: ['maintext', 'option', 'sum', 'vars', 'think'] })

    await user.click(screen.getByRole('button', { name: '本地数据' }))
    await user.click(screen.getByRole('button', { name: /导出安全备份/ }))
    expect(props.onExport).toHaveBeenCalledOnce()
    expect(screen.getByText('不会包含主次 API 密钥')).toBeInTheDocument()
  })
})
