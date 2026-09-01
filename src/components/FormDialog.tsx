import { PencilSimple } from '@phosphor-icons/react'
import { useId, useRef, useState } from 'react'
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap'

interface FormDialogProps {
  title: string
  description: string
  label: string
  initialValue?: string
  submitLabel: string
  onSubmit: (value: string) => void | Promise<void>
  onCancel: () => void
  multiline?: boolean
}

export function FormDialog({ title, description, label, initialValue = '', submitLabel, onSubmit, onCancel, multiline = false }: FormDialogProps) {
  const titleId = useId()
  const inputId = useId()
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useDialogFocusTrap(dialogRef, inputRef, onCancel)

  const submit = async () => {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    try { await onSubmit(value.trim()) } finally { setSubmitting(false) }
  }

  return (
    <div className="confirm-scrim">
      <section ref={dialogRef} className="confirm-dialog form-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <span className="confirm-icon form-icon"><PencilSimple size={25} weight="duotone" /></span>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        <label htmlFor={inputId}>{label}</label>
        {multiline ? (
          <textarea id={inputId} ref={inputRef} value={value} rows={5} onChange={(event) => setValue(event.target.value)} />
        ) : (
          <input id={inputId} ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submit() } }} />
        )}
        <div className="confirm-actions">
          <button id="form-dialog-cancel" type="button" onClick={onCancel}>取消</button>
          <button id="form-dialog-submit" className="primary" type="button" disabled={!value.trim() || submitting} onClick={() => void submit()}>{submitting ? '保存中…' : submitLabel}</button>
        </div>
      </section>
    </div>
  )
}
