import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  clearAllData,
  getEmptyFirstSettings,
  getChats,
  getSettings,
  initializeDatabase,
  saveCharacter,
  saveChat,
  savePreset,
  saveSettings,
} from './sillytavern/database'
import { BUNDLED_CHARACTER_ID, BUNDLED_PRESET_ID, type BundledDefaultsLoader } from './sillytavern/default-content'
import type { CharacterCard, ChatPreset, ChatSession } from './sillytavern/types'

const character: CharacterCard = {
  id: 'character-test', spec: 'chara_card_v2', specVersion: '2.0', name: '顾遥', avatar: '',
  description: '长期记录城市夜景。', personality: '克制而敏锐。', scenario: '雨夜中的旧城区。',
  firstMes: '窗外开始下雨了。', mesExample: '', creatorNotes: '', systemPrompt: '', postHistoryInstructions: '',
  alternateGreetings: [], tags: ['都市'], creator: '测试', characterVersion: '1.0', extensions: {}, sourceFile: '顾遥.json',
  importedAt: 1, updatedAt: 1,
}

const preset: ChatPreset = {
  id: 'preset-test', name: '沉浸叙事', description: '用于界面集成测试',
  settings: { main: '扮演 {{char}}。', temp_openai: 0.8, openai_max_tokens: 2048, openai_max_context: 8192 },
  createdAt: 1, updatedAt: 1,
}

const bundledDefaultsLoader: BundledDefaultsLoader = async () => ({
  character: { ...character, id: BUNDLED_CHARACTER_ID, name: '迷迭香', firstMes: '嗯...我在。', sourceFile: '迷迭香.png' },
  preset: { ...preset, id: BUNDLED_PRESET_ID, name: '默认预设' },
})

async function seedReadyChat() {
  await initializeDatabase()
  const chat: ChatSession = {
    id: 'chat-test', name: '雨夜初见', characterId: character.id, characterName: character.name, userName: '用户',
    presetId: preset.id, lorebookIds: [], variables: {},
    messages: [{ id: 'first-message', role: 'assistant', content: character.firstMes, timestamp: 1, status: 'sent' }],
    createdAt: 1, updatedAt: 1,
  }
  await Promise.all([saveCharacter(character), savePreset(preset), saveChat(chat)])
  const settings = getEmptyFirstSettings()
  settings.apiMode = 'single'
  settings.api = { ...settings.api, baseUrl: 'https://api.example.test/v1', apiKey: 'test-key', model: 'test-model' }
  settings.activeCharacterId = character.id
  settings.activePresetId = preset.id
  settings.activeChatId = chat.id
  await saveSettings(settings)
}

function sseResponse(chunks: string[], delayMs = 0) {
  let index = 0
  let cancelled = false
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    async pull(controller) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (cancelled) return
      if (index < chunks.length) {
        const content = chunks[index++]
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`))
        return
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
    cancel() { cancelled = true },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('SillyTavern character chat app', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    await clearAllData()
  })

  it('opens the bundled Rosmontis conversation immediately with API settings still empty', async () => {
    render(<App bundledDefaultsLoader={bundledDefaultsLoader} />)

    expect(await screen.findByRole('heading', { name: '迷迭香', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('嗯...我在。')).toBeInTheDocument()
    expect(screen.getByLabelText('输入聊天消息')).toBeEnabled()
    expect(screen.queryByRole('heading', { name: '从一张角色卡开始' })).not.toBeInTheDocument()
    expect(await getSettings()).toMatchObject({ api: { baseUrl: '', apiKey: '', model: '' } })
  })

  it('keeps the draft and points to settings when sending before API configuration', async () => {
    const user = userEvent.setup()
    render(<App bundledDefaultsLoader={bundledDefaultsLoader} />)
    const composer = await screen.findByLabelText('输入聊天消息')

    await user.type(composer, '你好{Enter}')

    expect(await screen.findByText('还不能发送消息')).toBeInTheDocument()
    expect(screen.getByText('请打开右上角齿轮，在“主 API”中填写地址、密钥和模型。')).toBeInTheDocument()
    expect(composer).toHaveValue('你好')
    expect(within(screen.getByLabelText('聊天记录')).queryByText('你好')).not.toBeInTheDocument()
  })

  it('uses one immersive full-window chat shell without permanent side rails', async () => {
    await seedReadyChat()
    const { container } = render(<App />)

    expect(await screen.findByRole('heading', { name: character.name, level: 1 })).toBeInTheDocument()
    expect(container.querySelector('#immersive-chat-shell')).toBeInTheDocument()
    expect(screen.queryByLabelText('主要功能')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('当前上下文')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开管理中心' })).toBeInTheDocument()
  })

  it('hides every streamed fragment and shows only the final role reply', async () => {
    await seedReadyChat()
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([
      '<thinking>核对天气</thinking><maintext>至少还要下一小时。</maintext>',
      '<option>留在这里\n撑伞离开</option><sum>雨仍在继续</sum><vars>{"天气":"雨"}</vars>',
    ], 40)))
    const user = userEvent.setup()
    render(<App />)
    const composer = await screen.findByLabelText('输入聊天消息')

    await user.type(composer, '今晚会下雨吗？{Enter}')

    const log = screen.getByLabelText('聊天记录')
    expect(await within(log).findByRole('status', { name: `${character.name}正在输入` })).toBeInTheDocument()
    expect(within(log).getByText('今晚会下雨吗？')).toBeInTheDocument()
    expect(within(log).queryByText('至少还要下一小时。')).not.toBeInTheDocument()
    await waitFor(() => expect(within(log).getByText('至少还要下一小时。')).toBeInTheDocument())
    expect(within(log).queryByRole('status', { name: `${character.name}正在输入` })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /留在这里/ })).not.toBeInTheDocument()
    expect(screen.queryByText('核对天气')).not.toBeInTheDocument()
  })

  it('uses Shift and Enter for a line break without sending', async () => {
    await seedReadyChat()
    const user = userEvent.setup()
    render(<App />)
    const composer = await screen.findByLabelText('输入聊天消息')

    await user.type(composer, '第一行{Shift>}{Enter}{/Shift}第二行')

    expect(composer).toHaveValue('第一行\n第二行')
    expect(screen.queryByText('第一行\n第二行')).not.toBeInTheDocument()
  })

  it('allows the user to stop an in-progress role reply', async () => {
    await seedReadyChat()
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(['<maintext>还没有说完'], 80)))
    const user = userEvent.setup()
    render(<App />)
    const composer = await screen.findByLabelText('输入聊天消息')

    await user.type(composer, '继续说{Enter}')
    await user.click(await screen.findByRole('button', { name: '停止生成' }))

    await waitFor(() => expect(screen.queryByRole('status', { name: `${character.name}正在输入` })).not.toBeInTheDocument())
    expect(screen.queryByText('回复已中断')).not.toBeInTheDocument()
    expect(screen.queryByText('还没有说完')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('聊天记录')).getByText('继续说')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('输入聊天消息')).toBeEnabled())
    const persisted = await getChats()
    expect(persisted[0].messages.at(-1)).toMatchObject({ role: 'user', content: '继续说' })
    expect(persisted[0].messages.some((message) => message.status === 'interrupted' || message.content.includes('还没有说完'))).toBe(false)
  })
})
