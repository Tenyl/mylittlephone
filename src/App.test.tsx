import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  clearAllData,
  getEmptyFirstSettings,
  initializeDatabase,
  saveCharacter,
  saveChat,
  savePreset,
  saveSettings,
} from './sillytavern/database'
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

  it('starts with empty libraries and an explicit setup path', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: '从一张角色卡开始' })).toBeInTheDocument()
    expect(screen.getByText('这里没有预置人物和剧情。导入你自己的角色、预设与世界书，再把对话交给你选择的模型。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开始新会话/ })).toBeDisabled()
    expect(screen.queryByText('林予泽')).not.toBeInTheDocument()
  })

  it('sends with Enter and renders a streamed six-tag reply', async () => {
    await seedReadyChat()
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([
      '<thinking>核对天气</thinking><maintext>至少还要下一小时。</maintext>',
      '<option>留在这里\n撑伞离开</option><sum>雨仍在继续</sum><vars>{"天气":"雨"}</vars>',
    ])))
    const user = userEvent.setup()
    render(<App />)
    const composer = await screen.findByLabelText('输入聊天消息')

    await user.type(composer, '今晚会下雨吗？{Enter}')

    await waitFor(() => expect(within(screen.getByLabelText('聊天记录')).getByText('今晚会下雨吗？')).toBeInTheDocument())
    await waitFor(() => expect(within(screen.getByLabelText('聊天记录')).getByText('至少还要下一小时。')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /留在这里/ })).toBeInTheDocument()
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

    expect(await screen.findByText('回复已中断')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('输入聊天消息')).toBeEnabled())
  })
})
