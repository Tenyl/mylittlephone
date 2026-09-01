import { CheckCircle, Info, WarningCircle, X, XCircle } from '@phosphor-icons/react'

export type NoticeTone = 'success' | 'warning' | 'error' | 'info'
export interface Notice { id: string; title: string; message: string; tone: NoticeTone }

const icons = { success: CheckCircle, warning: WarningCircle, error: XCircle, info: Info }

export function ToastRegion({ notices, onDismiss }: { notices: Notice[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {notices.map((notice) => {
        const Icon = icons[notice.tone]
        return <article key={notice.id} className={`toast ${notice.tone}`}><Icon size={22} weight="duotone" aria-hidden="true" /><div><strong>{notice.title}</strong><p>{notice.message}</p></div><button id={`dismiss-notice-${notice.id}`} type="button" aria-label={`关闭通知：${notice.title}`} onClick={() => onDismiss(notice.id)}><X size={16} /></button></article>
      })}
    </div>
  )
}
