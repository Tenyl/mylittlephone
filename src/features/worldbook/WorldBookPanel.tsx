import { BookOpenText, CaretDown, Check, MagnifyingGlass, PencilSimple, Trash } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { FileImportControl } from '../../components/FileImportControl'
import { LorebookEditorModal } from '../../components/SillyTavern/LorebookEditorModal'
import { importLorebook } from '../../sillytavern/importer'
import type { Lorebook, SillyTavernLorebookExport } from '../../sillytavern/types'

interface WorldBookPanelProps {
  lorebooks: Lorebook[]
  activeIds: string[]
  onToggle: (bookId: string) => void | Promise<void>
  onImport: (book: Lorebook) => void | Promise<void>
  onSave: (book: Lorebook) => void | Promise<void>
  onDelete: (book: Lorebook) => void
  onError: (message: string) => void
}

export function WorldBookPanel({ lorebooks, activeIds, onToggle, onImport, onSave, onDelete, onError }: WorldBookPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(lorebooks[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Lorebook | null>(null)
  const selected = lorebooks.find((book) => book.id === selectedId) ?? lorebooks[0] ?? null
  const entries = useMemo(() => selected?.entries.filter((entry) => `${entry.comment ?? ''}${entry.keys.join('')}${entry.content}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [], [query, selected])

  const importFile = async (file: File) => {
    let raw: unknown
    try { raw = JSON.parse(await file.text()) } catch { throw new Error(`${file.name} 不是有效的 JSON 文件`) }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${file.name} 不是有效的世界书`)
    const now = Date.now()
    await onImport({ ...importLorebook(raw as SillyTavernLorebookExport), id: crypto.randomUUID(), createdAt: now, updatedAt: now })
  }

  return (
    <div className="world-panel library-panel">
      {lorebooks.length === 0 ? (
        <section className="library-empty"><span><BookOpenText size={30} weight="duotone" /></span><h3>尚未导入世界书</h3><p>世界书是可选内容，用关键词在对话中唤醒地点、人物和规则。</p></section>
      ) : (
        <div className="library-list" aria-label="世界书列表">
          {lorebooks.map((book) => <button id={`lorebook-library-item-${book.id}`} key={book.id} type="button" className={selected?.id === book.id ? 'selected' : ''} aria-pressed={activeIds.includes(book.id)} onClick={() => setSelectedId(book.id)}><span className="library-glyph"><BookOpenText size={20} /></span><span><strong>{book.name}</strong><small>{book.entries.length} 个条目</small></span>{activeIds.includes(book.id) && <Check size={17} weight="bold" aria-label="已启用" />}</button>)}
        </div>
      )}

      {selected && (
        <>
          <section className="world-summary"><span><BookOpenText size={24} weight="duotone" /></span><div><h3>{selected.name}</h3><p>{selected.description || '这份世界书没有提供说明。'}</p></div></section>
          <div className="world-metrics"><div><strong>{selected.entries.length}</strong><span>全部条目</span></div><div><strong>{selected.entries.filter((entry) => entry.constant).length}</strong><span>常驻条目</span></div><div><strong>{selected.recursiveScanning ? '开' : '关'}</strong><span>递归扫描</span></div></div>
          <label className="panel-search" htmlFor="world-entry-search"><MagnifyingGlass size={18} /><input id="world-entry-search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索世界书条目" placeholder="搜索备注、关键词或内容" /></label>
          <div className="world-entry-list">
            {entries.map((entry) => {
              const isExpanded = expanded === entry.id
              return <article key={entry.id} className={`world-entry ${isExpanded ? 'expanded' : ''}`}><button id={`expand-entry-${entry.id}`} className="entry-expand" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? '收起' : '展开'}${entry.comment || entry.keys[0] || '世界书条目'}`} onClick={() => setExpanded(isExpanded ? null : entry.id)}><span className="entry-category">{entry.constant ? '常驻' : '触发'}</span><span><strong>{entry.comment || entry.keys[0] || '未命名条目'}</strong><small>顺序 {entry.order} · {entry.keys.join(' / ') || '无关键词'}</small></span><CaretDown size={16} className="entry-caret" /></button>{isExpanded && <div className="entry-content"><p>{entry.content}</p><div>{entry.keys.map((key) => <span key={key}>{key}</span>)}</div></div>}</article>
            })}
          </div>
          <div className="library-actions"><button id={`lorebook-edit-${selected.id}`} type="button" onClick={() => setEditing(selected)}><PencilSimple size={18} />编辑世界书</button><button id={`lorebook-toggle-${selected.id}`} type="button" onClick={() => void onToggle(selected.id)}><Check size={18} />{activeIds.includes(selected.id) ? '停用世界书' : '启用世界书'}</button><button id={`lorebook-delete-${selected.id}`} className="danger-action" type="button" onClick={() => onDelete(selected)}><Trash size={18} />删除世界书</button></div>
        </>
      )}
      <FileImportControl id="import-worldbook-file" label={lorebooks.length ? '导入另一份世界书' : '导入世界书'} helper="支持 SillyTavern 世界书 JSON" onFile={importFile} onError={onError} />
      {editing && <LorebookEditorModal lorebook={editing} onClose={() => setEditing(null)} onSave={async (book) => { await onSave(book); setEditing(null) }} />}
    </div>
  )
}
