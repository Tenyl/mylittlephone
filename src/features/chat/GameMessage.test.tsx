import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MessageList } from '../../components/MessageList'
import type { ChatMessage } from '../../sillytavern/types'
import type { ResolvedChatProfile } from '../../sillytavern/chat-profile'

const callbacks = { onEdit: vi.fn(), onDeleteFrom: vi.fn(), onBranch: vi.fn(), onRegenerate: vi.fn() }
const profile: ResolvedChatProfile = { userName: '博士', userAvatar: '', characterName: '顾遥', characterAvatar: '' }

describe('game-mode message rendering', () => {
  it('renders only the final conversational text and hides model internals', () => {
    const message: ChatMessage = {
      id: 'answer', role: 'assistant', content: '雨声贴着窗沿落下。', timestamp: 1, status: 'sent',
      parsed: { thinking: '检查环境状态', maintext: '雨声贴着窗沿落下。', options: ['走进雨里', '继续等待'], sum: '雨夜未止', varsRaw: '{}', varsCommands: { merge: {} }, unknown: {} },
      metadata: { rawContent: '<thinking>检查环境状态</thinking><maintext>雨声贴着窗沿落下。</maintext>' },
    }
    render(<MessageList messages={[message]} profile={profile} {...callbacks} />)

    expect(screen.getByText('雨声贴着窗沿落下。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '思考过程' })).not.toBeInTheDocument()
    expect(screen.queryByText('检查环境状态')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /走进雨里/ })).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('<maintext>')
  })

  it('windows a very long conversation to the latest one hundred messages', () => {
    const messages: ChatMessage[] = Array.from({ length: 500 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? 'assistant' : 'user', content: `消息 ${index}`, timestamp: index + 1, status: 'sent' }))
    render(<MessageList messages={messages} profile={profile} {...callbacks} />)

    const log = screen.getByLabelText('聊天记录')
    expect(within(log).getAllByRole('article')).toHaveLength(100)
    expect(within(log).getByText('为保持流畅，已暂存上方 400 条较早消息。')).toBeInTheDocument()
    expect(within(log).queryByText('消息 399')).not.toBeInTheDocument()
    expect(within(log).getByText('消息 499')).toBeInTheDocument()
  })

  it('shows the global player profile and current-chat character profile', () => {
    const messages: ChatMessage[] = [
      { id: 'user-profile-message', role: 'user', content: '早上好', timestamp: 1, status: 'sent' },
      { id: 'assistant-profile-message', role: 'assistant', content: '早上好，博士。', timestamp: 100_000, status: 'sent' },
    ]
    render(<MessageList messages={messages} profile={{
      userName: '博士',
      userAvatar: 'data:image/png;base64,eA==',
      characterName: '小迷',
      characterAvatar: 'data:image/png;base64,eQ==',
    }} {...callbacks} />)

    expect(screen.getByText(/博士 ·/)).toBeInTheDocument()
    expect(screen.getByText(/小迷 ·/)).toBeInTheDocument()
    expect(screen.getByAltText('博士的头像')).toHaveAttribute('src', 'data:image/png;base64,eA==')
    expect(screen.getByAltText('小迷的头像')).toHaveAttribute('src', 'data:image/png;base64,eQ==')
  })
})
