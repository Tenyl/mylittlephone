import { ClockCounterClockwise, GearSix, UserCircle } from '@phosphor-icons/react'
import type { ChatSession } from '../sillytavern/types'
import type { ResolvedChatProfile } from '../sillytavern/chat-profile'

interface ChatHeaderProps {
  profile: ResolvedChatProfile
  chat: ChatSession
  generating: boolean
  onOpenHistory: () => void
  onOpenManagement: () => void
}

export function ChatHeader({ profile, chat, generating, onOpenHistory, onOpenManagement }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      {profile.characterAvatar ? <img className="header-avatar" src={profile.characterAvatar} alt={`${profile.characterName}的头像`} width="42" height="42" /> : <span className="header-avatar avatar-fallback" aria-hidden="true"><UserCircle size={26} /></span>}
      <div className="chat-heading">
        <div className="chat-title-line"><h1>{profile.characterName}</h1></div>
        <p className={generating ? 'status-generating' : ''}><span className="status-dot" aria-hidden="true" />{generating ? '对方正在输入…' : '在线'}</p>
      </div>
      <span className="sr-only">当前会话：{chat.name}</span>
      <button id="chat-open-history" className="icon-button" type="button" aria-label="打开会话历史" onClick={onOpenHistory}><ClockCounterClockwise size={21} /></button>
      <button id="chat-open-management" className="icon-button" type="button" aria-label="打开管理中心" onClick={onOpenManagement}><GearSix size={21} /></button>
    </header>
  )
}
