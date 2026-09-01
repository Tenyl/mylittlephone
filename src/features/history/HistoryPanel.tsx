import { ArrowSquareOut, ChatsCircle, GitBranch, PencilSimple, Trash } from '@phosphor-icons/react'
import type { ChatSession } from '../../sillytavern/types'

interface HistoryPanelProps {
  chats: ChatSession[]
  activeChatId: string | null
  onSelect: (chatId: string) => void | Promise<void>
  onRename: (chat: ChatSession) => void
  onDelete: (chat: ChatSession) => void
}

export function HistoryPanel({ chats, activeChatId, onSelect, onRename, onDelete }: HistoryPanelProps) {
  if (chats.length === 0) return <section className="library-empty"><span><ChatsCircle size={30} weight="duotone" /></span><h3>还没有聊天记录</h3><p>准备完成后创建新会话，历史和分支会保存在这里。</p></section>
  return (
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
  )
}
