import { DotsThreeOutline, SidebarSimple, Sparkle } from '@phosphor-icons/react'
import type { AppState } from '../domain/types'

interface ChatHeaderProps {
  state: AppState
  onOpenSession: () => void
  onOpenNavigation: () => void
}

export function ChatHeader({ state, onOpenSession, onOpenNavigation }: ChatHeaderProps) {
  const isGenerating = state.generation.status !== 'idle'
  return (
    <header className="chat-header">
      <button id="chat-open-navigation" className="icon-button mobile-only" type="button" aria-label="打开功能导航" onClick={onOpenNavigation}>
        <SidebarSimple size={22} weight="bold" />
      </button>
      <img className="header-avatar" src={state.character.avatar} alt="" width="42" height="42" />
      <div className="chat-heading">
        <div className="chat-title-line">
          <h1>{state.character.name}</h1>
          <Sparkle size={14} weight="fill" aria-hidden="true" />
        </div>
        <p className={isGenerating ? 'status-generating' : ''}>
          <span className="status-dot" aria-hidden="true" />
          {isGenerating ? '正在输入…' : '在线 · 今夜在白鲸书屋'}
        </p>
      </div>
      <button id="chat-open-session" className="icon-button" type="button" aria-label="打开会话详情" onClick={onOpenSession}>
        <DotsThreeOutline size={24} weight="fill" />
      </button>
    </header>
  )
}
