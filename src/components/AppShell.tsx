import { BookOpenText, BracketsCurly, ChatsCircle, ClockCounterClockwise, GearSix, IdentificationCard, SlidersHorizontal, Sparkle, UserCircle, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, CharacterCard, ChatMessage, ChatPreset, ChatSession, Lorebook } from '../sillytavern/types'
import type { SetupReadiness } from '../sillytavern/readiness'
import { SetupGuide } from '../features/onboarding/SetupGuide'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

export type PanelId = 'character' | 'worldbook' | 'presets' | 'history' | 'variables' | 'settings'

interface AppShellProps {
  settings: AppSettings
  characters: CharacterCard[]
  activeCharacter: CharacterCard | null
  activePreset: ChatPreset | null
  activeLorebooks: Lorebook[]
  activeChat: ChatSession | null
  chats: ChatSession[]
  readiness: SetupReadiness
  generating: boolean
  onOpenPanel: (panel: PanelId) => void
  onStart: () => void
  onSend: (content: string) => boolean | Promise<boolean>
  onStop: () => void
  onRegenerate: () => void | Promise<unknown>
  onDeleteRound: () => void
  onEditMessage: (message: ChatMessage) => void
  onDeleteFromMessage: (message: ChatMessage) => void
  onBranchMessage: (message: ChatMessage) => void
}

const navItems = [
  { id: 'character' as const, label: '角色卡', helper: '导入与切换聊天对象', icon: IdentificationCard },
  { id: 'worldbook' as const, label: '世界书', helper: '背景资料与触发条目', icon: BookOpenText },
  { id: 'presets' as const, label: '对话预设', helper: '提示词与生成参数', icon: SlidersHorizontal },
  { id: 'history' as const, label: '会话历史', helper: '记录、回滚与分支', icon: ClockCounterClockwise },
  { id: 'settings' as const, label: '系统设置', helper: '主次 API 与本地数据', icon: GearSix },
]

function CharacterAvatar({ character, size }: { character: CharacterCard; size: number }) {
  return character.avatar ? <img src={character.avatar} alt="" width={size} height={size} /> : <span className="avatar-fallback" style={{ width: size, height: size }}><UserCircle size={Math.round(size * .58)} /></span>
}

export function AppShell(props: AppShellProps) {
  const { settings, characters, activeCharacter, activePreset, activeLorebooks, activeChat, chats, readiness, generating, onOpenPanel, onStart, onSend, onStop, onRegenerate, onDeleteRound, onEditMessage, onDeleteFromMessage, onBranchMessage } = props
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const contextUsed = useMemo(() => activeChat?.messages.reduce((total, message) => total + message.content.length, 0) ?? 0, [activeChat])
  const contextMax = Number(activePreset?.settings.openai_max_context ?? 8192) * 4
  const contextPercent = Math.min(100, Math.round((contextUsed / contextMax) * 100))

  return (
    <div className="app-stage">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <div className="app-window">
        <aside className="nav-rail" aria-label="主要功能">
          <div className="brand-mark" aria-label="澄语"><span><ChatsCircle size={25} weight="duotone" /></span><div><strong>澄语</strong><small>本地角色聊天</small></div></div>
          <nav>
            <button id="nav-current-chat" className="nav-item active" type="button"><ChatsCircle size={20} weight="fill" /><span>当前对话</span><i /></button>
            {navItems.map(({ id, label, icon: Icon }) => <button key={id} id={`nav-${id}`} className="nav-item" type="button" onClick={() => onOpenPanel(id)}><Icon size={20} /><span>{label}</span></button>)}
          </nav>
          {activeCharacter ? <div className="nav-conversation-card"><span className="eyebrow">正在交谈</span><div className="mini-person"><CharacterAvatar character={activeCharacter} size={38} /><div><strong>{activeCharacter.name}</strong><span>{activeChat ? '会话已连接' : '等待创建会话'}</span></div></div><p>{activeChat?.messages.at(-1)?.content || '角色已就绪，创建一段新对话。'}</p></div> : <div className="nav-conversation-card empty"><span className="eyebrow">尚未开始</span><p>导入一张角色卡，让这里出现你的聊天对象。</p></div>}
          <div className="nav-footer"><span className="local-dot" />所有内容只保存在当前设备</div>
        </aside>

        <main className="chat-column">
          {activeChat && activeCharacter ? (
            <>
              <ChatHeader character={activeCharacter} chat={activeChat} generating={generating} onOpenHistory={() => onOpenPanel('history')} onOpenNavigation={() => setMobileMenuOpen(true)} />
              <MessageList messages={activeChat.messages} character={activeCharacter} thinkingDisplay={settings.thinkingDisplay} generating={generating} onPickOption={onSend} onEdit={onEditMessage} onDeleteFrom={onDeleteFromMessage} onBranch={onBranchMessage} />
              <Composer characterName={activeCharacter.name} generating={generating} enabledLorebooks={activeLorebooks.length} onSend={onSend} onStop={onStop} onRegenerate={onRegenerate} onDeleteRound={onDeleteRound} />
            </>
          ) : (
            <div className="setup-column"><button id="setup-mobile-navigation" className="icon-button mobile-only setup-nav-trigger" type="button" aria-label="打开功能导航" onClick={() => setMobileMenuOpen(true)}><GearSix size={21} /></button><SetupGuide readiness={readiness} onOpenCharacter={() => onOpenPanel('character')} onOpenPreset={() => onOpenPanel('presets')} onOpenSettings={() => onOpenPanel('settings')} onOpenLorebooks={() => onOpenPanel('worldbook')} onStart={onStart} /></div>
          )}
        </main>

        <aside className="context-rail" aria-label="当前上下文">
          <div className="context-top"><span className="eyebrow">当前上下文</span><span className="context-live"><i />IndexedDB 已连接</span></div>
          {activeCharacter ? <section className="profile-card"><div className="profile-glow" aria-hidden="true" /><CharacterAvatar character={activeCharacter} size={72} /><h2>{activeCharacter.name}</h2><p>{activeCharacter.personality || 'Character Card V2'}</p><div className="trait-row">{activeCharacter.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><button id="context-open-character" type="button" onClick={() => onOpenPanel('character')}>查看角色卡</button></section> : <section className="context-empty"><IdentificationCard size={25} /><strong>没有当前角色</strong><span>{characters.length ? '请选择一张角色卡' : '从导入角色卡开始'}</span></section>}
          <section className="context-block"><div className="block-title"><BookOpenText size={18} /><div><span>世界书</span><strong>{activeLorebooks.length ? `${activeLorebooks.length} 本已启用` : '未启用'}</strong></div></div><div className="context-stat"><span>活跃条目</span><strong>{activeLorebooks.reduce((total, book) => total + book.entries.length, 0)}</strong></div></section>
          <section className="context-block preset-summary"><div className="block-title"><Sparkle size={18} weight="fill" /><div><span>回复预设</span><strong>{activePreset?.name || '未选择'}</strong></div></div><p>{activePreset?.description || '导入预设以确定提示词与生成参数。'}</p><button id="context-open-presets" type="button" onClick={() => onOpenPanel('presets')}>管理预设</button></section>
          {activeChat && <><section className="token-card"><div><span>上下文估算</span><strong>{contextPercent}%</strong></div><div className="token-track"><i style={{ width: `${contextPercent}%` }} /></div><p>{contextUsed.toLocaleString('zh-CN')} / {contextMax.toLocaleString('zh-CN')} 字符</p></section><button id="context-open-variables" className="context-variable-button" type="button" onClick={() => onOpenPanel('variables')}><BracketsCurly size={18} /><span><strong>会话变量</strong><small>{Object.keys(activeChat.variables).length} 个字段</small></span></button></>}
          <div className="context-session-count"><ChatsCircle size={16} /><span>{chats.length} 个本地会话</span></div>
        </aside>
      </div>
      {mobileMenuOpen && <MobileNavigation onClose={() => setMobileMenuOpen(false)} onOpenPanel={(panel) => { setMobileMenuOpen(false); onOpenPanel(panel) }} />}
    </div>
  )
}

function MobileNavigation({ onClose, onOpenPanel }: { onClose: () => void; onOpenPanel: (panel: PanelId) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; closeRef.current?.focus(); const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKeyDown); return () => { window.removeEventListener('keydown', onKeyDown); previous?.focus() } }, [onClose])
  return <div className="mobile-nav-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="mobile-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title"><header><div><span className="eyebrow">Luma Chat</span><h2 id="mobile-navigation-title">功能导航</h2></div><button ref={closeRef} id="mobile-navigation-close" className="icon-button" type="button" aria-label="关闭功能导航" onClick={onClose}><X size={21} /></button></header><nav aria-label="移动功能导航">{navItems.map(({ id, label, helper, icon: Icon }) => <button key={id} id={`mobile-nav-${id}`} type="button" onClick={() => onOpenPanel(id)}><span><Icon size={21} /></span><div><strong>{label}</strong><small>{helper}</small></div></button>)}</nav></section></div>
}
