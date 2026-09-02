import { ArrowSquareOut, ChatsCircle, GitBranch, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ChatSession } from '../../sillytavern/types'

interface HistoryPanelProps {
  chats: ChatSession[]
  activeChatId: string | null
  onSelect: (chatId: string) => void | Promise<void>
  onCreate: () => void | Promise<void>
  onRename: (chat: ChatSession) => void
  onDelete: (chat: ChatSession) => void
}

export function HistoryPanel({ chats, activeChatId, onSelect, onCreate, onRename, onDelete }: HistoryPanelProps) {
  const [creating, setCreating] = useState(false)
  const createConversation = async () => {
    if (creating) return
    setCreating(true)
    try { await onCreate() } finally { setCreating(false) }
  }

  return (
    <div className="history-panel">
      <button id="history-create-chat" className="history-create" type="button" aria-label="创建新对话" disabled={creating} onClick={() => void createConversation()}>
        <span><Plus size={22} weight="bold" aria-hidden="true" /></span>
        <span><strong>{creating ? '正在创建新对话' : '创建新对话'}</strong><small>使用当前角色与预设，开启一段独立聊天</small></span>
        <ChatsCircle size={20} weight="duotone" aria-hidden="true" />
      </button>
      {chats.length === 0 ? (
        <section className="library-empty"><span><ChatsCircle size={30} weight="duotone" /></span><h3>还没有聊天记录</h3><p>创建第一段对话后，历史和分支会保存在这里。</p></section>
      ) : (
        <div className="history-list">
          {chats.map((chat) => (
            <article key={chat.id} className={chat.id === activeChatId ? 'active' : ''}>
              <button id={`history-select-${chat.id}`} className="history-main" type="button" onClick={() => void onSelect(chat.id)}>
                <span><ChatsCircle size={21} weight={chat.id === activeChatId ? 'fill' : 'regular'} /></span>
                <div><strong>{chat.name}</strong><small>{chat.messages.length} 条消息 · {new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(chat.updatedAt)}</small>{chat.parentChatId && <em><GitBranch size={12} />由消息分支创建</em>}</div>
                <ArrowSquareOut size={17} aria-hidden="true" />
              </button>
              <div className="history-actions"><button id={`history-rename-${chat.id}`} type="button" aria-label={`重命名${chat.name}`} onClick={() => onRename(chat)}><PencilSimple size={17} /></button><button id={`history-delete-${chat.id}`} type="button" aria-label={`删除${chat.name}`} onClick={() => onDelete(chat)}><Trash size={17} /></button></div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
