import { DotsThreeOutline, SidebarSimple, Sparkle, UserCircle } from '@phosphor-icons/react'
import type { CharacterCard, ChatSession } from '../sillytavern/types'

interface ChatHeaderProps {
  character: CharacterCard
  chat: ChatSession
  generating: boolean
  onOpenHistory: () => void
  onOpenNavigation: () => void
}

export function ChatHeader({ character, chat, generating, onOpenHistory, onOpenNavigation }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <button id="chat-open-navigation" className="icon-button mobile-only" type="button" aria-label="打开功能导航" onClick={onOpenNavigation}><SidebarSimple size={22} weight="bold" /></button>
      {character.avatar ? <img className="header-avatar" src={character.avatar} alt="" width="42" height="42" /> : <span className="header-avatar avatar-fallback" aria-hidden="true"><UserCircle size={26} /></span>}
      <div className="chat-heading">
        <div className="chat-title-line"><h1>{character.name}</h1><Sparkle size={14} weight="fill" aria-hidden="true" /></div>
        <p className={generating ? 'status-generating' : ''}><span className="status-dot" aria-hidden="true" />{generating ? '正在输入…' : `${chat.name} · 本地会话`}</p>
      </div>
      <button id="chat-open-history" className="icon-button" type="button" aria-label="打开会话历史" onClick={onOpenHistory}><DotsThreeOutline size={24} weight="fill" /></button>
    </header>
  )
}
