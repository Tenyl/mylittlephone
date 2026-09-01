import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MessageList } from '../../components/MessageList'
import type { CharacterCard, ChatMessage } from '../../sillytavern/types'

const character: CharacterCard = {
  id: 'character-render', spec: 'chara_card_v2', specVersion: '2.0', name: '顾遥', avatar: '', description: '', personality: '', scenario: '', firstMes: '', mesExample: '', creatorNotes: '', systemPrompt: '', postHistoryInstructions: '', alternateGreetings: [], tags: [], creator: '', characterVersion: '', extensions: {}, sourceFile: 'card.json', importedAt: 1, updatedAt: 1,
}

const callbacks = { onEdit: vi.fn(), onDeleteFrom: vi.fn(), onBranch: vi.fn() }

describe('game-mode message rendering', () => {
  it('renders parsed content, folded thinking, and numbered choices without raw tags', async () => {
    const user = userEvent.setup()
    const onPickOption = vi.fn()
    const message: ChatMessage = {
      id: 'answer', role: 'assistant', content: '雨声贴着窗沿落下。', timestamp: 1, status: 'sent',
      parsed: { thinking: '检查环境状态', maintext: '雨声贴着窗沿落下。', options: ['走进雨里', '继续等待'], sum: '雨夜未止', varsRaw: '{}', varsCommands: { merge: {} }, unknown: {} },
      metadata: { rawContent: '<thinking>检查环境状态</thinking><maintext>雨声贴着窗沿落下。</maintext>' },
    }
    render(<MessageList messages={[message]} character={character} thinkingDisplay="fold" generating={false} onPickOption={onPickOption} {...callbacks} />)

    expect(screen.getByText('雨声贴着窗沿落下。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '思考过程' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('检查环境状态')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('<maintext>')
    await user.click(screen.getByRole('button', { name: /走进雨里/ }))
    expect(onPickOption).toHaveBeenCalledWith('走进雨里')
  })

  it('windows a very long conversation to the latest one hundred messages', () => {
    const messages: ChatMessage[] = Array.from({ length: 500 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? 'assistant' : 'user', content: `消息 ${index}`, timestamp: index + 1, status: 'sent' }))
    render(<MessageList messages={messages} character={character} thinkingDisplay="fold" generating={false} onPickOption={vi.fn()} {...callbacks} />)

    const log = screen.getByLabelText('聊天记录')
    expect(within(log).getAllByRole('article')).toHaveLength(100)
    expect(within(log).getByText('为保持流畅，已暂存上方 400 条较早消息。')).toBeInTheDocument()
    expect(within(log).queryByText('消息 399')).not.toBeInTheDocument()
    expect(within(log).getByText('消息 499')).toBeInTheDocument()
  })
})
