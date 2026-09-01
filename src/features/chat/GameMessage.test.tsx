import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MessageList } from '../../components/MessageList'
import type { CharacterCard, ChatMessage } from '../../sillytavern/types'

const character: CharacterCard = {
  id: 'character-render', spec: 'chara_card_v2', specVersion: '2.0', name: '顾遥', avatar: '', description: '', personality: '', scenario: '', firstMes: '', mesExample: '', creatorNotes: '', systemPrompt: '', postHistoryInstructions: '', alternateGreetings: [], tags: [], creator: '', characterVersion: '', extensions: {}, sourceFile: 'card.json', importedAt: 1, updatedAt: 1,
}

const callbacks = { onEdit: vi.fn(), onDeleteFrom: vi.fn(), onBranch: vi.fn(), onRegenerate: vi.fn() }

describe('game-mode message rendering', () => {
  it('renders only the final conversational text and hides model internals', () => {
    const message: ChatMessage = {
      id: 'answer', role: 'assistant', content: '雨声贴着窗沿落下。', timestamp: 1, status: 'sent',
      parsed: { thinking: '检查环境状态', maintext: '雨声贴着窗沿落下。', options: ['走进雨里', '继续等待'], sum: '雨夜未止', varsRaw: '{}', varsCommands: { merge: {} }, unknown: {} },
      metadata: { rawContent: '<thinking>检查环境状态</thinking><maintext>雨声贴着窗沿落下。</maintext>' },
    }
    render(<MessageList messages={[message]} character={character} {...callbacks} />)

    expect(screen.getByText('雨声贴着窗沿落下。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '思考过程' })).not.toBeInTheDocument()
    expect(screen.queryByText('检查环境状态')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /走进雨里/ })).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('<maintext>')
  })

  it('windows a very long conversation to the latest one hundred messages', () => {
    const messages: ChatMessage[] = Array.from({ length: 500 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? 'assistant' : 'user', content: `消息 ${index}`, timestamp: index + 1, status: 'sent' }))
    render(<MessageList messages={messages} character={character} {...callbacks} />)

    const log = screen.getByLabelText('聊天记录')
    expect(within(log).getAllByRole('article')).toHaveLength(100)
    expect(within(log).getByText('为保持流畅，已暂存上方 400 条较早消息。')).toBeInTheDocument()
    expect(within(log).queryByText('消息 399')).not.toBeInTheDocument()
    expect(within(log).getByText('消息 499')).toBeInTheDocument()
  })
})
