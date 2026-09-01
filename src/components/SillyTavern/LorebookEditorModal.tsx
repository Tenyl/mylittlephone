import { BookOpenText, Check, Plus, Trash, X } from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap'
import { createDefaultEntry } from '../../sillytavern/editor-utils'
import type { Lorebook, LorebookEntry } from '../../sillytavern/types'

interface LorebookEditorModalProps {
  lorebook: Lorebook
  onSave: (lorebook: Lorebook) => void | Promise<void>
  onClose: () => void
}

const positions: Array<[LorebookEntry['position'], string]> = [
  ['before_char', '角色设定前'], ['after_char', '角色设定后'], ['before_example', '示例对话前'],
  ['after_example', '示例对话后'], ['at_depth', '指定深度'], ['example_msg_top', '示例消息顶部'],
  ['example_msg_bottom', '示例消息底部'], ['outlet', '扩展出口'],
]

const splitKeys = (value: string) => value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)

export function LorebookEditorModal({ lorebook, onSave, onClose }: LorebookEditorModalProps) {
  const [draft, setDraft] = useState<Lorebook>(() => structuredClone(lorebook))
  const [selectedId, setSelectedId] = useState<string | null>(lorebook.entries[0]?.id ?? null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialogFocusTrap(dialogRef, closeRef, onClose)

  const selected = useMemo(() => draft.entries.find((entry) => entry.id === selectedId) ?? null, [draft.entries, selectedId])
  const patchBook = (patch: Partial<Lorebook>) => setDraft((current) => ({ ...current, ...patch, updatedAt: Date.now() }))
  const patchEntry = (patch: Partial<LorebookEntry>) => {
    if (!selectedId) return
    patchBook({ entries: draft.entries.map((entry) => entry.id === selectedId ? { ...entry, ...patch } : entry) })
  }

  const addEntry = () => {
    const entry = createDefaultEntry()
    patchBook({ entries: [...draft.entries, entry] })
    setSelectedId(entry.id)
  }

  const removeSelected = () => {
    if (!deletingId) return
    const entries = draft.entries.filter((entry) => entry.id !== deletingId)
    patchBook({ entries })
    setSelectedId(entries[0]?.id ?? null)
    setDeletingId(null)
  }

  const save = async () => {
    if (!draft.name.trim()) { setError('世界书名称不能为空。'); return }
    setSaving(true); setError('')
    try { await onSave({ ...draft, name: draft.name.trim(), updatedAt: Date.now() }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '世界书保存失败。') }
    finally { setSaving(false) }
  }

  return createPortal(
    <div className="management-modal-scrim">
      <section ref={dialogRef} className="management-modal lorebook-editor-modal" role="dialog" aria-modal="true" aria-labelledby="lorebook-editor-title" tabIndex={-1}>
        <header className="management-modal-header">
          <span className="management-modal-icon"><BookOpenText size={24} weight="duotone" /></span>
          <div><span className="eyebrow">World Information Editor</span><h2 id="lorebook-editor-title">编辑世界书</h2></div>
          <button ref={closeRef} id="lorebook-editor-close" className="icon-button" type="button" aria-label="关闭世界书编辑器" onClick={onClose}><X size={21} /></button>
        </header>

        <div className="editor-book-fields">
          <label htmlFor="lorebook-editor-name">世界书名称</label>
          <input id="lorebook-editor-name" value={draft.name} onChange={(event) => patchBook({ name: event.target.value })} />
          <label htmlFor="lorebook-editor-description">说明</label>
          <input id="lorebook-editor-description" value={draft.description ?? ''} onChange={(event) => patchBook({ description: event.target.value })} />
          <div className="editor-toggle-grid">
            <label><input id="lorebook-editor-recursive" type="checkbox" checked={draft.recursiveScanning} onChange={(event) => patchBook({ recursiveScanning: event.target.checked })} />递归扫描</label>
            <label><input id="lorebook-editor-case-sensitive" type="checkbox" checked={draft.caseSensitive} onChange={(event) => patchBook({ caseSensitive: event.target.checked })} />区分大小写</label>
            <label><input id="lorebook-editor-whole-words" type="checkbox" checked={draft.matchWholeWords} onChange={(event) => patchBook({ matchWholeWords: event.target.checked })} />完整词匹配</label>
          </div>
        </div>

        <div className="lorebook-editor-grid">
          <aside className="editor-entry-index" aria-label="世界书条目">
            <div><strong>{draft.entries.length} 个条目</strong><button id="lorebook-editor-add-entry" type="button" onClick={addEntry}><Plus size={17} />新建条目</button></div>
            {draft.entries.length === 0 ? <p>新建第一个条目后，可设置关键词与注入位置。</p> : draft.entries.map((entry, index) => (
              <button id={`lorebook-editor-entry-${entry.id}`} key={entry.id} type="button" className={selectedId === entry.id ? 'selected' : ''} aria-pressed={selectedId === entry.id} onClick={() => setSelectedId(entry.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{entry.comment || entry.keys[0] || '未命名条目'}</strong><small>{entry.constant ? '常驻' : `${entry.keys.length} 个关键词`}</small></div></button>
            ))}
          </aside>

          <div className="editor-entry-form">
            {selected ? (
              <>
                <div className="editor-form-heading"><div><span className="eyebrow">Entry Configuration</span><h3>{selected.comment || selected.keys[0] || '未命名条目'}</h3></div><button id={`lorebook-editor-delete-entry-${selected.id}`} className="danger-action" type="button" onClick={() => setDeletingId(selected.id)}><Trash size={17} />删除条目</button></div>
                <div className="editor-form-grid">
                  <label htmlFor={`entry-comment-${selected.id}`}>条目备注</label><input id={`entry-comment-${selected.id}`} value={selected.comment ?? ''} onChange={(event) => patchEntry({ comment: event.target.value })} />
                  <label htmlFor={`entry-primary-keys-${selected.id}`}>主关键词</label><input id={`entry-primary-keys-${selected.id}`} value={selected.keys.join(', ')} onChange={(event) => patchEntry({ keys: splitKeys(event.target.value) })} />
                  <label htmlFor={`entry-secondary-keys-${selected.id}`}>次关键词</label><input id={`entry-secondary-keys-${selected.id}`} value={selected.secondaryKeys.join(', ')} onChange={(event) => patchEntry({ secondaryKeys: splitKeys(event.target.value) })} />
                  <label htmlFor={`entry-content-${selected.id}`}>注入内容</label><textarea id={`entry-content-${selected.id}`} rows={8} value={selected.content} onChange={(event) => patchEntry({ content: event.target.value })} />
                  <label htmlFor={`entry-position-${selected.id}`}>注入位置</label><select id={`entry-position-${selected.id}`} value={selected.position} onChange={(event) => patchEntry({ position: event.target.value as LorebookEntry['position'] })}>{positions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <label htmlFor={`entry-order-${selected.id}`}>优先顺序</label><input id={`entry-order-${selected.id}`} type="number" value={selected.order} onChange={(event) => patchEntry({ order: Number(event.target.value) || 0 })} />
                  <label htmlFor={`entry-probability-${selected.id}`}>触发概率</label><input id={`entry-probability-${selected.id}`} type="number" min="0" max="100" value={selected.probability} onChange={(event) => patchEntry({ probability: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
                </div>
                <details className="editor-advanced"><summary>高级匹配设置</summary><div className="editor-toggle-grid"><label><input id={`entry-constant-${selected.id}`} type="checkbox" checked={selected.constant} onChange={(event) => patchEntry({ constant: event.target.checked })} />始终激活</label><label><input id={`entry-selective-${selected.id}`} type="checkbox" checked={selected.selective} onChange={(event) => patchEntry({ selective: event.target.checked })} />启用次关键词</label><label><input id={`entry-whole-word-${selected.id}`} type="checkbox" checked={selected.matchWholeWords ?? false} onChange={(event) => patchEntry({ matchWholeWords: event.target.checked })} />完整词匹配</label><label><input id={`entry-no-recursion-${selected.id}`} type="checkbox" checked={selected.preventRecursion ?? false} onChange={(event) => patchEntry({ preventRecursion: event.target.checked })} />阻止递归激活</label></div></details>
              </>
            ) : <div className="editor-no-entry"><BookOpenText size={30} weight="duotone" /><h3>没有可编辑条目</h3><p>新建条目后，在这里填写关键词、正文和注入规则。</p></div>}
          </div>
        </div>

        {error && <p id="lorebook-editor-error" className="editor-error" role="alert">{error}</p>}
        <footer className="management-modal-footer"><span>修改仅在保存后写入 IndexedDB</span><div><button id="lorebook-editor-cancel" type="button" onClick={onClose}>取消</button><button id="lorebook-editor-save" className="primary" type="button" disabled={saving} onClick={() => void save()}><Check size={18} />{saving ? '保存中…' : '保存世界书'}</button></div></footer>

        {deletingId && <div className="inline-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-lorebook-entry-title"><div><Trash size={24} /><h3 id="delete-lorebook-entry-title">删除这个条目？</h3><p>删除会在保存世界书后生效。</p><div><button id="delete-lorebook-entry-cancel" type="button" onClick={() => setDeletingId(null)}>保留条目</button><button id="delete-lorebook-entry-confirm" className="danger" type="button" onClick={removeSelected}>删除条目</button></div></div></div>}
      </section>
    </div>, document.body,
  )
}
