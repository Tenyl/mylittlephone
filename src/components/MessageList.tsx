import { ArrowDown, Check, GitBranch, PencilSimple, Trash, UserCircle, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AppSettings, CharacterCard, ChatMessage } from '../sillytavern/types'
import { MainTextPane } from './SillyTavern/MainTextPane'
import { OptionList } from './SillyTavern/OptionList'
import { ThinkingFold } from './SillyTavern/ThinkingFold'

const WINDOW_SIZE = 100
const timeLabel = (timestamp: number) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)

function MessageStatus({ message }: { message: ChatMessage }) {
  if (message.status === 'failed') return <span className="message-status error"><WarningCircle size={13} />生成失败</span>
  if (message.status === 'interrupted') return <span className="message-status">回复已中断</span>
  if (message.role === 'user') return <span className="message-check" aria-label="已发送"><Check size={12} weight="bold" /></span>
  return null
}

interface MessageListProps {
  messages: ChatMessage[]
  character: CharacterCard
  thinkingDisplay: AppSettings['thinkingDisplay']
  generating: boolean
  onPickOption: (value: string) => boolean | Promise<boolean>
  onEdit: (message: ChatMessage) => void
  onDeleteFrom: (message: ChatMessage) => void
  onBranch: (message: ChatMessage) => void
}

export function MessageList({ messages, character, thinkingDisplay, generating, onPickOption, onEdit, onDeleteFrom, onBranch }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const visibleMessages = messages.length > WINDOW_SIZE ? messages.slice(-WINDOW_SIZE) : messages
  const hiddenCount = messages.length - visibleMessages.length

  useEffect(() => { if (!awayFromBottom) endRef.current?.scrollIntoView({ block: 'end' }) }, [awayFromBottom, messages])

  return (
    <section id="chat-message-region" className="message-region background-rain" aria-label="聊天记录">
      <div className="message-scroll" ref={scrollerRef} onScroll={() => { const node = scrollerRef.current; if (node) setAwayFromBottom(node.scrollHeight - node.scrollTop - node.clientHeight > 120) }}>
        <div className="date-separator"><span>本地浏览器存储 · 当前设备</span></div>
        {hiddenCount > 0 && <p className="windowing-notice">为保持流畅，已暂存上方 {hiddenCount} 条较早消息。</p>}
        {visibleMessages.map((message, index) => {
          const previous = visibleMessages[index - 1]
          const compact = previous?.role === message.role && message.timestamp - previous.timestamp < 90_000
          const assistant = message.role === 'assistant'
          return (
            <article key={message.id} data-message-id={message.id} className={`message-row ${message.role} ${compact ? 'compact' : ''}`} aria-label={message.role === 'user' ? '你的消息' : `${character.name}的消息`}>
              {assistant && !compact ? (character.avatar ? <img src={character.avatar} alt="" width="36" height="36" /> : <span className="message-avatar-fallback"><UserCircle size={24} /></span>) : <span className="avatar-space" />}
              <div className="message-stack">
                {!compact && <span className="message-meta">{message.role === 'user' ? '你' : character.name} · {timeLabel(message.timestamp)}</span>}
                <div className={`message-bubble ${message.status === 'streaming' ? 'is-streaming' : ''}`}>
                  {assistant && message.parsed ? (
                    <>
                      <ThinkingFold text={message.parsed.thinking} mode={thinkingDisplay} />
                      <MainTextPane text={message.content || message.parsed.maintext} isStreaming={message.status === 'streaming'} />
                      {message.parsed.options.length > 0 && <OptionList idPrefix={`message-option-${message.id}`} options={message.parsed.options} disabled={generating} onPick={(value) => void onPickOption(value)} />}
                    </>
                  ) : message.content ? <span className="message-text">{message.content}</span> : <span className="typing-bubble" aria-label="正在组织回复"><i /><i /><i /></span>}
                </div>
                <MessageStatus message={message} />
                <div className="message-actions" aria-label="消息操作">
                  {message.role === 'user' && <button id={`message-edit-${message.id}`} type="button" aria-label="编辑并重新生成" onClick={() => onEdit(message)}><PencilSimple size={15} /></button>}
                  <button id={`message-branch-${message.id}`} type="button" aria-label="从此消息创建分支" onClick={() => onBranch(message)}><GitBranch size={15} /></button>
                  <button id={`message-delete-from-${message.id}`} type="button" aria-label="从此消息开始删除" onClick={() => onDeleteFrom(message)}><Trash size={15} /></button>
                </div>
              </div>
            </article>
          )
        })}
        <div ref={endRef} />
      </div>
      {awayFromBottom && <button id="chat-jump-latest" className="jump-latest" type="button" onClick={() => { setAwayFromBottom(false); endRef.current?.scrollIntoView({ behavior: 'smooth' }) }}><ArrowDown size={16} weight="bold" />返回最新消息</button>}
    </section>
  )
}
