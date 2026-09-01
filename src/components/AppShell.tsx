import { BookOpenText, ChatsCircle, GearSix, IdentificationCard, SlidersHorizontal, Sparkle, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AppState, PanelId, Preset } from '../domain/types'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

interface AppShellProps {
  state: AppState
  activePreset: Preset
  onOpenPanel: (panel: Exclude<PanelId, null>) => void
  onSend: (content: string) => boolean
  onStop: () => void
  onRegenerate: () => void
  onDeleteRound: () => void
}

const navItems = [
  { id: 'character' as const, label: '角色卡', icon: IdentificationCard },
  { id: 'worldbook' as const, label: '世界书', icon: BookOpenText },
  { id: 'presets' as const, label: '对话预设', icon: SlidersHorizontal },
  { id: 'session' as const, label: '会话详情', icon: GearSix },
]

export function AppShell(props: AppShellProps) {
  const { state, activePreset, onOpenPanel, onSend, onStop, onRegenerate, onDeleteRound } = props
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const enabledEntries = state.worldBook.entries.filter((entry) => entry.enabled).length
  return (
    <div className="app-stage">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="app-window">
        <aside className="nav-rail" aria-label="主要功能">
          <div className="brand-mark" aria-label="澄语">
            <span><ChatsCircle size={25} weight="duotone" /></span>
            <div><strong>澄语</strong><small>角色聊天</small></div>
          </div>
          <nav>
            <button id="nav-current-chat" className="nav-item active" type="button"><ChatsCircle size={20} weight="fill" /><span>当前对话</span><i /></button>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} id={`nav-${id}`} className="nav-item" type="button" onClick={() => onOpenPanel(id)}><Icon size={20} /><span>{label}</span></button>
            ))}
          </nav>
          <div className="nav-conversation-card">
            <span className="eyebrow">正在交谈</span>
            <div className="mini-person"><img src={state.character.avatar} alt="" width="38" height="38" /><div><strong>{state.character.name}</strong><span>刚刚</span></div></div>
            <p>{state.messages.at(-1)?.content || '等待新的消息'}</p>
          </div>
          <div className="nav-footer"><span className="local-dot" />所有数据仅保存在本机</div>
        </aside>

        <main className="chat-column">
          <ChatHeader state={state} onOpenSession={() => onOpenPanel('session')} onOpenNavigation={() => setMobileMenuOpen(true)} />
          <MessageList state={state} />
          <Composer characterName={state.character.name} generating={state.generation.status !== 'idle'} onSend={onSend} onStop={onStop} onRegenerate={onRegenerate} onDeleteRound={onDeleteRound} />
        </main>

        <aside className="context-rail" aria-label="当前上下文">
          <div className="context-top"><span className="eyebrow">当前上下文</span><span className="context-live"><i />已同步</span></div>
          <section className="profile-card">
            <div className="profile-glow" aria-hidden="true" />
            <img src={state.character.avatar} alt={`${state.character.name}的头像`} width="72" height="72" />
            <h2>{state.character.name}</h2>
            <p>{state.character.subtitle}</p>
            <div className="trait-row">{state.character.personality.slice(0, 3).map((trait) => <span key={trait}>{trait}</span>)}</div>
            <button id="context-open-character" type="button" onClick={() => onOpenPanel('character')}>查看角色卡</button>
          </section>
          <section className="context-block">
            <div className="block-title"><BookOpenText size={18} /><div><span>世界书</span><strong>{state.worldBook.name}</strong></div></div>
            <div className="context-stat"><span>已启用条目</span><strong>{enabledEntries} / {state.worldBook.entries.length}</strong></div>
            <div className="triggered-list">{state.worldBook.entries.filter((entry) => entry.triggered).map((entry) => <span key={entry.id}><i />{entry.title}</span>)}</div>
          </section>
          <section className="context-block preset-summary">
            <div className="block-title"><Sparkle size={18} weight="fill" /><div><span>回复预设</span><strong>{activePreset.name}</strong></div></div>
            <p>{activePreset.description}</p>
            <button id="context-open-presets" type="button" onClick={() => onOpenPanel('presets')}>调整预设</button>
          </section>
          <section className="token-card">
            <div><span>上下文占用</span><strong>34%</strong></div>
            <div className="token-track"><i /></div>
            <p>8,704 / 25,600 字符</p>
          </section>
        </aside>
      </div>
      {mobileMenuOpen && <MobileNavigation onClose={() => setMobileMenuOpen(false)} onOpenPanel={(panel) => { setMobileMenuOpen(false); onOpenPanel(panel) }} />}
    </div>
  )
}

function MobileNavigation({ onClose, onOpenPanel }: { onClose: () => void; onOpenPanel: (panel: Exclude<PanelId, null>) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="mobile-nav-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mobile-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title">
        <header><div><span className="eyebrow">Luma Chat</span><h2 id="mobile-navigation-title">功能导航</h2></div><button ref={closeRef} id="mobile-navigation-close" className="icon-button" type="button" aria-label="关闭功能导航" onClick={onClose}><X size={21} /></button></header>
        <nav aria-label="移动功能导航">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} id={`mobile-nav-${id}`} type="button" aria-label={label} onClick={() => onOpenPanel(id)}><span><Icon size={21} /></span><div><strong>{label}</strong><small>{id === 'character' ? '身份、性格与关系' : id === 'worldbook' ? '背景资料与触发条目' : id === 'presets' ? '回复节奏与叙事方式' : '记录、背景与数据操作'}</small></div></button>)}
        </nav>
      </section>
    </div>
  )
}
