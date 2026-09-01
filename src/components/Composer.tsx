import { ArrowUp, MagicWand, PaperPlaneTilt, Plus, Stop, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

interface ComposerProps {
  characterName: string
  generating: boolean
  enabledLorebooks: number
  onSend: (content: string) => boolean | Promise<boolean>
  onStop: () => void
  onRegenerate: () => void | Promise<unknown>
  onDeleteRound: () => void
}

export function Composer({ characterName, generating, enabledLorebooks, onSend, onStop, onRegenerate, onDeleteRound }: ComposerProps) {
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const send = async () => {
    if (!value.trim() || sending) return
    setSending(true)
    try {
      if (await onSend(value)) { setValue(''); inputRef.current?.focus() }
    } finally { setSending(false) }
  }

  return (
    <footer className="composer-wrap">
      {menuOpen && <div id="composer-action-menu" className="composer-menu"><button id="action-regenerate" type="button" onClick={() => { void onRegenerate(); setMenuOpen(false) }}><MagicWand size={18} />重新生成上一条</button><button id="action-delete-round" type="button" onClick={() => { onDeleteRound(); setMenuOpen(false) }}><X size={18} />删除最近一轮</button><button id="action-narration" type="button" onClick={() => { setValue((current) => `${current}${current ? '\n' : ''}【场景】`); setMenuOpen(false); inputRef.current?.focus() }}><ArrowUp size={18} />插入场景描述</button></div>}
      <div className="composer-context"><span><i aria-hidden="true" />本轮调用角色卡与 {enabledLorebooks} 本世界书</span><span>{value.length}/4000</span></div>
      <div className="composer">
        <button id="composer-more-actions" className={`icon-button composer-add ${menuOpen ? 'active' : ''}`} type="button" aria-label={menuOpen ? '关闭附加操作' : '打开附加操作'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Plus size={22} weight="bold" /></button>
        <label className="sr-only" htmlFor="chat-message-input">输入聊天消息</label>
        <textarea id="chat-message-input" ref={inputRef} value={value} maxLength={4000} rows={1} aria-label="输入聊天消息" placeholder={`发消息给${characterName}`} disabled={generating || sending} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} />
        {generating ? <button id="composer-stop-generation" className="send-button stop" type="button" aria-label="停止生成" onClick={onStop}><Stop size={18} weight="fill" /></button> : <button id="composer-send-message" className="send-button" type="button" aria-label="发送消息" disabled={!value.trim() || sending} onClick={() => void send()}>{value.trim() ? <PaperPlaneTilt size={19} weight="fill" /> : <ArrowUp size={19} weight="bold" />}</button>}
      </div>
      <p className="composer-hint">Enter 发送 · Shift + Enter 换行</p>
    </footer>
  )
}
