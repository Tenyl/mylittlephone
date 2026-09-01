import { Brain, CaretDown } from '@phosphor-icons/react'
import { useId, useState } from 'react'

export function ThinkingFold({ text, mode }: { text: string; mode: 'fold' | 'hide' | 'inline' }) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  if (!text || mode === 'hide') return null
  if (mode === 'inline') return <aside className="st-thinking-inline"><Brain size={16} aria-hidden="true" /><span>{text}</span></aside>
  return (
    <div className={`st-thinking ${open ? 'open' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}><Brain size={16} aria-hidden="true" /><span>思考过程</span><CaretDown size={15} aria-hidden="true" /></button>
      {open && <pre id={contentId}>{text}</pre>}
    </div>
  )
}
