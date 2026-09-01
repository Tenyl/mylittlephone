import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { clearAllData } from '../sillytavern/database'
import { testBundledDefaultsLoader } from '../test/bundled-defaults'

const v2Card = {
  spec: 'chara_card_v2', spec_version: '2.0',
  data: {
    name: '顾遥', description: '长期记录城市夜景。', personality: '克制而敏锐。', scenario: '雨夜旧城。',
    first_mes: '窗外开始下雨了。', mes_example: '', creator_notes: '', system_prompt: '', post_history_instructions: '',
    alternate_greetings: [], tags: ['都市'], creator: '用户', character_version: '1.0', extensions: {},
  },
}

async function openManagementSection(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(await screen.findByRole('button', { name: '打开管理中心' }))
  const center = screen.getByRole('dialog', { name: '管理中心' })
  await user.click(within(center).getByRole('button', { name }))
}

describe('configuration panels with bundled defaults', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllData()
  })

  it('imports a Character Card V2 JSON and updates readiness', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await openManagementSection(user, /角色卡/)
    const dialog = screen.getByRole('dialog', { name: '角色卡库' })
    expect(within(dialog).getByRole('heading', { name: '迷迭香', level: 3 })).toBeInTheDocument()

    await user.upload(document.querySelector<HTMLInputElement>('#import-character-file')!, new File([
      JSON.stringify(v2Card),
    ], '顾遥.json', { type: 'application/json' }))

    expect(await within(dialog).findByRole('heading', { name: '顾遥' })).toBeInTheDocument()
    expect(within(dialog).getByText('顾遥.json')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByText('已选择 顾遥')).toBeInTheDocument()
  })

  it('imports and enables a SillyTavern world book', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await openManagementSection(user, /世界书/)
    const input = document.querySelector<HTMLInputElement>('#import-worldbook-file')!
    await user.upload(input, new File([JSON.stringify({
      name: '雨城档案', description: '城市背景', entries: {
        0: { uid: 0, key: ['旧城'], keysecondary: [], comment: '旧城区', content: '每天午夜封路。', constant: false, selective: false, selectiveLogic: 0, addMemo: true, order: 100, position: 0, role: 0, disable: false, probability: 100, depth: 4, group: '', useProbability: true, excluded: false, sticky: 0, cooldown: 0, delay: 0, weight: 100, scanDepth: 2, caseSensitive: false, matchWholeWords: false, excludeRecursion: false, preventRecursion: false, useGroupScoring: false, matchPersonaDescription: false, matchCharacterDescription: false, matchCharacterPersonality: false, matchCharacterDepthPrompt: false, matchScenario: false, matchCreatorNotes: false, decorators: [], characterFilter: {} },
      },
    })], '雨城.json', { type: 'application/json' }))

    expect(await screen.findByRole('heading', { name: '雨城档案' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /展开旧城区/ }))
    expect(screen.getByText('每天午夜封路。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '停用世界书' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '停用世界书' }))
    expect(screen.getByRole('button', { name: '启用世界书' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑世界书' }))
    const editor = screen.getByRole('dialog', { name: '编辑世界书' })
    const name = within(editor).getByLabelText('世界书名称')
    await user.clear(name)
    await user.type(name, '雨城纪要')
    await user.click(within(editor).getByRole('button', { name: '保存世界书' }))
    expect(await screen.findByRole('heading', { name: '雨城纪要' })).toBeInTheDocument()
  })

  it('imports and activates a SillyTavern response preset', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await openManagementSection(user, /对话预设/)
    await user.upload(document.querySelector<HTMLInputElement>('#import-preset-file')!, new File([
      JSON.stringify({ name: '沉浸扮演', main: '扮演 {{char}}。', temp_openai: 0.7, openai_max_tokens: 2048 }),
    ], '沉浸扮演.json', { type: 'application/json' }))

    expect(await screen.findByRole('heading', { name: '沉浸扮演' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '正在使用' })).toBeDisabled()
    expect(screen.getByText('预设已导入')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑对话预设' }))
    const editor = screen.getByRole('dialog', { name: '编辑对话预设' })
    const temperature = within(editor).getByLabelText('温度')
    await user.clear(temperature)
    await user.type(temperature, '0.42')
    await user.click(within(editor).getByRole('button', { name: '提示词' }))
    await user.type(within(editor).getByLabelText('主提示词'), ' 保持克制。')
    await user.click(within(editor).getByRole('button', { name: '保存对话预设' }))
    expect(screen.queryByRole('dialog', { name: '编辑对话预设' })).not.toBeInTheDocument()
  })

  it('requires two in-app confirmations before clearing all local data', async () => {
    const user = userEvent.setup()
    render(<App bundledDefaultsLoader={testBundledDefaultsLoader} />)
    await openManagementSection(user, /API 与设置/)
    await user.click(screen.getByRole('button', { name: '本地数据' }))
    await user.click(screen.getByRole('button', { name: /清除自定义本地数据/ }))

    const first = screen.getByRole('alertdialog', { name: '清除所有自定义内容？' })
    await user.click(within(first).getByRole('button', { name: '继续确认' }))
    const second = await screen.findByRole('alertdialog', { name: '最后确认重置？' })
    await user.click(within(second).getByRole('button', { name: '确认重置' }))

    await waitFor(() => expect(screen.getByText('本地内容已清空')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '迷迭香' })).toBeInTheDocument()
    expect(screen.getByText('嗯...我在。')).toBeInTheDocument()
  })
})
