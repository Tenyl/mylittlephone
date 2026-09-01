import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MessageList } from '../../components/MessageList'
import type { CharacterCard, ChatMessage } from '../../sillytavern/types'

const character = { id: 'character-actions', spec: 'chara_card_v2', specVersion: '2.0', name: '顾遥', avatar: '', description: '', personality: '', scenario: '', firstMes: '', mesExample: '', creatorNotes: '', systemPrompt: '', postHistoryInstructions: '', alternateGreetings: [], tags: [], creator: '', characterVersion: '', extensions: {}, sourceFile: 'card.json', importedAt: 1, updatedAt: 1 } satisfies CharacterCard
const message = { id: 'user-turn', role: 'user', content: '我推开门。', timestamp: 1, status: 'sent' } satisfies ChatMessage

describe('message action contracts', () => {
  it('routes edit, branch, and delete-from-point actions with the exact message', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn(); const onBranch = vi.fn(); const onDeleteFrom = vi.fn()
    render(<MessageList messages={[message]} character={character} onEdit={onEdit} onBranch={onBranch} onDeleteFrom={onDeleteFrom} onRegenerate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '更多消息操作' }))
    await user.click(screen.getByRole('menuitem', { name: '编辑并重新生成' }))
    await user.click(screen.getByRole('button', { name: '更多消息操作' }))
    await user.click(screen.getByRole('menuitem', { name: '从此消息创建分支' }))
    await user.click(screen.getByRole('button', { name: '更多消息操作' }))
    await user.click(screen.getByRole('menuitem', { name: '从此消息开始删除' }))

    expect(onEdit).toHaveBeenCalledWith(message)
    expect(onBranch).toHaveBeenCalledWith(message)
    expect(onDeleteFrom).toHaveBeenCalledWith(message)
  })
})
