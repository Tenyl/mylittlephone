import { BookOpenText, CaretDown, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import type { WorldBook } from '../../domain/types'
import { FileImportControl } from '../../components/FileImportControl'
import { parseWorldBook } from '../../services/importers'

interface WorldBookPanelProps {
  worldBook: WorldBook
  onToggle: (id: string) => void
  onImport: (worldBook: WorldBook) => void
  onError: (message: string) => void
}

export function WorldBookPanel({ worldBook, onToggle, onImport, onError }: WorldBookPanelProps) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const entries = worldBook.entries.filter((entry) => `${entry.title}${entry.keywords.join('')}${entry.content}`.includes(query.trim()))
  return (
    <div className="world-panel">
      <section className="world-summary"><span><BookOpenText size={24} weight="duotone" /></span><div><h3>{worldBook.name}</h3><p>{worldBook.summary}</p></div></section>
      <div className="world-metrics"><div><strong>{worldBook.entries.length}</strong><span>全部条目</span></div><div><strong>{worldBook.entries.filter((entry) => entry.enabled).length}</strong><span>当前启用</span></div><div><strong>{worldBook.entries.filter((entry) => entry.triggered).length}</strong><span>本轮触发</span></div></div>
      <label className="panel-search" htmlFor="world-entry-search"><MagnifyingGlass size={18} /><input id="world-entry-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、关键词或内容" /></label>
      <div className="world-entry-list">
        {entries.map((entry) => {
          const isExpanded = expanded === entry.id
          return (
            <article key={entry.id} className={`world-entry ${isExpanded ? 'expanded' : ''}`}>
              <div className="world-entry-head">
                <button id={`expand-entry-${entry.id}`} className="entry-expand" type="button" aria-label={`${isExpanded ? '收起' : '展开'}${entry.title}`} aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : entry.id)}>
                  <span className={`entry-category category-${entry.category}`}>{entry.category}</span>
                  <span><strong>{entry.title}</strong><small>优先级 {entry.priority} · {entry.keywords.join(' / ')}</small></span>
                  {entry.triggered && <em><Sparkle size={11} weight="fill" />已触发</em>}
                  <CaretDown size={16} className="entry-caret" />
                </button>
                <button id={`toggle-entry-${entry.id}`} className="switch" type="button" role="switch" aria-label={`启用${entry.title}`} aria-checked={entry.enabled} onClick={() => onToggle(entry.id)}><i /></button>
              </div>
              {isExpanded && <div className="entry-content"><p>{entry.content}</p><div>{entry.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>}
            </article>
          )
        })}
      </div>
      <FileImportControl id="import-worldbook-file" label="导入新的世界书" helper="将替换当前世界书，原聊天记录不受影响" onRead={(text, name) => onImport(parseWorldBook(text, name))} onError={onError} />
    </div>
  )
}
