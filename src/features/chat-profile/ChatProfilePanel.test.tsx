import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CharacterCard, ChatSession } from '../../sillytavern/types'
import { ChatProfilePanel } from './ChatProfilePanel'

const character = {
  id: 'character-chat-profile', name: '迷迭香', avatar: 'character-avatar',
} as CharacterCard

const chat = {
  id: 'chat-profile', name: '与迷迭香的聊天', messages: [], characterName: '迷迭香', userName: '博士',
  presetId: null, lorebookIds: [], variables: {}, createdAt: 1, updatedAt: 1,
} satisfies ChatSession

describe('current chat profile panel', () => {
  it('saves a UI-only nickname and can restore character-card display data', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ChatProfilePanel chat={chat} character={character} onUpdate={onUpdate} onError={vi.fn()} />)

    expect(screen.queryByText(/真实角色/)).not.toBeInTheDocument()
    const nickname = screen.getByLabelText('角色备注名')
    await user.clear(nickname)
    await user.type(nickname, '小迷')
    await user.click(screen.getByRole('button', { name: '保存当前聊天资料' }))
    expect(onUpdate).toHaveBeenLastCalledWith({ characterDisplayName: '小迷' })

    await user.click(screen.getByRole('button', { name: '恢复角色卡资料' }))
    expect(onUpdate).toHaveBeenLastCalledWith({ characterDisplayName: '', characterAvatar: '' })
  })

  it('shows an explicit empty state without an active chat', () => {
    render(<ChatProfilePanel chat={null} character={null} onUpdate={vi.fn()} onError={vi.fn()} />)

    expect(screen.getByText('请先创建或打开一个会话')).toBeInTheDocument()
    expect(screen.queryByLabelText('角色备注名')).not.toBeInTheDocument()
  })
})
