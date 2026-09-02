import { ArrowClockwise, ArrowDown, Check, Copy, DotsThree, GitBranch, PencilSimple, Trash, UserCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../sillytavern/types'
import type { ResolvedChatProfile } from '../sillytavern/chat-profile'

const WINDOW_SIZE = 100
const timeLabel = (timestamp: number) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)

interface MessageListProps {
  messages: ChatMessage[]
  profile: ResolvedChatProfile
  onEdit: (message: ChatMessage) => void
  onDeleteFrom: (message: ChatMessage) => void
  onBranch: (message: ChatMessage) => void
  onRegenerate: () => void | Promise<unknown>
}

function TypingIndicator({ characterName }: { characterName: string }) {
  return (
    <div className="message-bubble typing-indicator" role="status" aria-label={`${characterName}正在输入`}>
      <span className="typing-bubble" aria-hidden="true"><i /><i /><i /></span>
      <span>对方正在输入</span>
    </div>
  )
}

function MessageAvatar({ name, avatar }: { name: string; avatar: string }) {
  return avatar
    ? <img src={avatar} alt={`${name}的头像`} width="36" height="36" />
    : <span className="message-avatar-fallback" aria-hidden="true"><UserCircle size={24} /></span>
}

export function MessageList({ messages, profile, onEdit, onDeleteFrom, onBranch, onRegenerate }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const [openActions, setOpenActions] = useState<string | null>(null)
  const visibleMessages = messages.length > WINDOW_SIZE ? messages.slice(-WINDOW_SIZE) : messages
  const hiddenCount = messages.length - visibleMessages.length

  useEffect(() => { if (!awayFromBottom) endRef.current?.scrollIntoView({ block: 'end' }) }, [awayFromBottom, messages])

  useEffect(() => {
    if (!openActions) return
    const toolbar = document.getElementById(`message-actions-menu-${openActions}`)
    toolbar?.scrollIntoView({ block: 'nearest' })
    toolbar?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target
      const actionRegion = target instanceof Element ? target.closest<HTMLElement>('[data-message-actions-for]') : null
      if (actionRegion?.dataset.messageActionsFor !== openActions) setOpenActions(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenActions(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openActions])

  const finishAction = (action: () => void) => {
    action()
    setOpenActions(null)
  }

  return (
    <section id="chat-message-region" className="message-region background-rain" aria-label="聊天记录">
      <div className="message-scroll" ref={scrollerRef} onScroll={() => { const node = scrollerRef.current; if (node) setAwayFromBottom(node.scrollHeight - node.scrollTop - node.clientHeight > 120) }}>
        <div className="date-separator"><span>今天</span></div>
        {hiddenCount > 0 && <p className="windowing-notice">为保持流畅，已暂存上方 {hiddenCount} 条较早消息。</p>}
        {visibleMessages.map((message, index) => {
          const previous = visibleMessages[index - 1]
          const compact = previous?.role === message.role && message.timestamp - previous.timestamp < 90_000
          const assistant = message.role === 'assistant'
          const streaming = assistant && message.status === 'streaming'
          const menuId = `message-actions-menu-${message.id}`
          return (
            <article key={message.id} data-message-id={message.id} className={`message-row ${message.role} ${compact ? 'compact' : ''}`} aria-label={`${message.role === 'user' ? profile.userName : profile.characterName}的消息`}>
              {assistant && (compact ? <span className="avatar-space" /> : <MessageAvatar name={profile.characterName} avatar={profile.characterAvatar} />)}
              <div className="message-stack">
                {!compact && <span className="message-meta">{message.role === 'user' ? profile.userName : profile.characterName} · {timeLabel(message.timestamp)}</span>}
                {streaming ? <TypingIndicator characterName={profile.characterName} /> : <div className="message-bubble"><span className="message-text">{message.content || message.parsed?.maintext}</span></div>}
                {!streaming && message.role === 'user' && <span className="message-check" aria-label="已发送"><Check size={12} weight="bold" /></span>}
                {!streaming && (
                  <div className="message-action-wrap" data-message-actions-for={message.id}>
                    {openActions === message.id ? (
                      <div id={menuId} className="message-action-toolbar" role="menu" aria-label="消息操作菜单" aria-orientation="horizontal">
                        <button id={`message-copy-${message.id}`} type="button" role="menuitem" aria-label="复制消息" title="复制消息" onClick={() => finishAction(() => void navigator.clipboard?.writeText(message.content))}><Copy size={17} aria-hidden="true" /></button>
                        {message.role === 'user' ? <button id={`message-edit-${message.id}`} type="button" role="menuitem" aria-label="编辑并重新生成" title="编辑并重新生成" onClick={() => finishAction(() => onEdit(message))}><PencilSimple size={17} aria-hidden="true" /></button> : <button id={`message-regenerate-${message.id}`} type="button" role="menuitem" aria-label="重新生成回复" title="重新生成回复" onClick={() => finishAction(() => void onRegenerate())}><ArrowClockwise size={17} aria-hidden="true" /></button>}
                        <button id={`message-branch-${message.id}`} type="button" role="menuitem" aria-label="从此消息创建分支" title="从此消息创建分支" onClick={() => finishAction(() => onBranch(message))}><GitBranch size={17} aria-hidden="true" /></button>
                        <button id={`message-delete-from-${message.id}`} className="danger" type="button" role="menuitem" aria-label="从此消息开始删除" title="从此消息开始删除" onClick={() => finishAction(() => onDeleteFrom(message))}><Trash size={17} aria-hidden="true" /></button>
                      </div>
                    ) : (
                      <button id={`message-more-${message.id}`} className="message-more" type="button" aria-label="更多消息操作" aria-expanded="false" aria-controls={menuId} onClick={() => setOpenActions(message.id)}><DotsThree size={18} weight="bold" aria-hidden="true" /></button>
                    )}
                  </div>
                )}
              </div>
              {!assistant && (compact ? <span className="avatar-space" /> : <MessageAvatar name={profile.userName} avatar={profile.userAvatar} />)}
            </article>
          )
        })}
        <div ref={endRef} />
      </div>
      {awayFromBottom && <button id="chat-jump-latest" className="jump-latest" type="button" onClick={() => { setAwayFromBottom(false); endRef.current?.scrollIntoView({ behavior: 'smooth' }) }}><ArrowDown size={16} weight="bold" />返回最新消息</button>}
    </section>
  )
}
