import { ArrowDown, Check, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AppState, ChatMessage } from '../domain/types'

const timeLabel = (iso: string) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

function MessageStatus({ message }: { message: ChatMessage }) {
  if (message.status === 'failed') return <span className="message-status error"><WarningCircle size={13} />发送失败</span>
  if (message.status === 'interrupted') return <span className="message-status">回复已中断</span>
  if (message.role === 'user') return <span className="message-check" aria-label="已发送"><Check size={12} weight="bold" /></span>
  return null
}

export function MessageList({ state }: { state: AppState }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)

  useEffect(() => {
    if (!awayFromBottom) endRef.current?.scrollIntoView({ block: 'end' })
  }, [awayFromBottom, state.messages])

  const handleScroll = () => {
    const node = scrollerRef.current
    if (!node) return
    setAwayFromBottom(node.scrollHeight - node.scrollTop - node.clientHeight > 120)
  }

  return (
    <section id="chat-message-region" className={`message-region background-${state.backgroundId}`} aria-label="聊天记录">
      <div className="message-scroll" ref={scrollerRef} onScroll={handleScroll}>
        <div className="date-separator"><span>今天 22:31</span></div>
        {state.messages.length === 0 ? (
          <div className="empty-chat">
            <span className="empty-orbit" aria-hidden="true" />
            <h2>对话已经清空</h2>
            <p>说一句晚上好，重新开始这段故事。</p>
          </div>
        ) : state.messages.map((message, index) => {
          const previous = state.messages[index - 1]
          const compact = previous?.role === message.role && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 90_000
          return (
            <article key={message.id} className={`message-row ${message.role} ${compact ? 'compact' : ''}`} aria-label={message.role === 'user' ? '你的消息' : `${state.character.name}的消息`}>
              {message.role === 'assistant' && !compact ? <img src={state.character.avatar} alt="" width="36" height="36" /> : <span className="avatar-space" />}
              <div className="message-stack">
                {!compact && <span className="message-meta">{message.role === 'user' ? '你' : state.character.name} · {timeLabel(message.createdAt)}</span>}
                <div className={`message-bubble ${message.status === 'streaming' ? 'is-streaming' : ''}`}>
                  {message.content || <span className="typing-bubble" aria-label="正在组织回复"><i /><i /><i /></span>}
                </div>
                <MessageStatus message={message} />
              </div>
            </article>
          )
        })}
        <div ref={endRef} />
      </div>
      {awayFromBottom && (
        <button id="chat-jump-latest" className="jump-latest" type="button" onClick={() => { setAwayFromBottom(false); endRef.current?.scrollIntoView({ behavior: 'smooth' }) }}>
          <ArrowDown size={16} weight="bold" />返回最新消息
        </button>
      )}
    </section>
  )
}
