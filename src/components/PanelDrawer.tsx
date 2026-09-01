import { X } from '@phosphor-icons/react'
import { useRef, type ReactNode } from 'react'
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap'

interface PanelDrawerProps {
  title: string
  eyebrow: string
  children: ReactNode
  onClose: () => void
}

export function PanelDrawer({ title, eyebrow, children, onClose }: PanelDrawerProps) {
  const titleId = `panel-title-${title}`
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useDialogFocusTrap(dialogRef, closeRef, onClose)

  return (
    <div className="drawer-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="panel-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="panel-header">
          <div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
          <button ref={closeRef} id={`close-${title}`} className="icon-button" type="button" aria-label={`关闭${title}`} onClick={onClose}><X size={22} /></button>
        </header>
        <div className="panel-content">{children}</div>
      </section>
    </div>
  )
}
