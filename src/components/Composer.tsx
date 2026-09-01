import { PaperPlaneTilt, Stop } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

interface ComposerProps {
  characterName: string
  generating: boolean
  onSend: (content: string) => boolean | Promise<boolean>
  onStop: () => void
}

export function Composer({ characterName, generating, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const send = async () => {
    if (!value.trim() || sending) return
    const outgoing = value
    setValue('')
    setSending(true)
    try {
      const accepted = await onSend(outgoing)
      if (!accepted) setValue(outgoing)
      inputRef.current?.focus()
    } catch (cause) {
      setValue(outgoing)
      throw cause
    } finally { setSending(false) }
  }

  return (
    <footer className="composer-wrap">
      <div className="composer immersive-composer">
        <label className="sr-only" htmlFor="chat-message-input">输入聊天消息</label>
        <textarea id="chat-message-input" ref={inputRef} value={value} maxLength={4000} rows={1} aria-label="输入聊天消息" placeholder={`发消息给 ${characterName}`} disabled={generating || sending} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} />
        {generating ? <button id="composer-stop-generation" className="send-button stop" type="button" aria-label="停止生成" onClick={onStop}><Stop size={18} weight="fill" /></button> : <button id="composer-send-message" className="send-button" type="button" aria-label="发送消息" disabled={!value.trim() || sending} onClick={() => void send()}><PaperPlaneTilt size={19} weight="fill" /></button>}
      </div>
    </footer>
  )
}
