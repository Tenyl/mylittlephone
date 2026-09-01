import { Warning } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = `confirm-title-${title}`
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])
  return (
    <div className="confirm-scrim">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-description`}>
        <span className="confirm-icon"><Warning size={26} weight="duotone" /></span>
        <h2 id={titleId}>{title}</h2>
        <p id={`${titleId}-description`}>{description}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} id="confirm-cancel" type="button" onClick={onCancel}>暂不操作</button>
          <button id="confirm-accept" className="danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
