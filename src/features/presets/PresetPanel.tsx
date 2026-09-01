import { Check, Gauge, PencilSimple, SlidersHorizontal, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { FileImportControl } from '../../components/FileImportControl'
import { PresetModal } from '../../components/SillyTavern/PresetModal'
import { importPreset } from '../../sillytavern/importer'
import type { ChatPreset } from '../../sillytavern/types'

interface PresetPanelProps {
  presets: ChatPreset[]
  activePresetId: string | null
  onSelect: (presetId: string) => void | Promise<void>
  onImport: (preset: ChatPreset) => void | Promise<void>
  onSave: (preset: ChatPreset) => void | Promise<void>
  onDelete: (preset: ChatPreset) => void
  onError: (message: string) => void
}

export function PresetPanel({ presets, activePresetId, onSelect, onImport, onSave, onDelete, onError }: PresetPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(activePresetId)
  const [editing, setEditing] = useState<ChatPreset | null>(null)
  const selected = presets.find((preset) => preset.id === selectedId) ?? presets.find((preset) => preset.id === activePresetId) ?? presets[0] ?? null

  useEffect(() => {
    if (activePresetId) setSelectedId(activePresetId)
  }, [activePresetId])

  const importFile = async (file: File) => {
    let raw: unknown
    try { raw = JSON.parse(await file.text()) } catch { throw new Error(`${file.name} 不是有效的 JSON 文件`) }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${file.name} 不是有效的预设`)
    const now = Date.now()
    await onImport({ ...importPreset(raw as Record<string, unknown>), id: crypto.randomUUID(), createdAt: now, updatedAt: now })
  }

  return (
    <div className="preset-panel library-panel">
      <p className="panel-intro">预设决定提示词顺序、采样参数和回复长度。项目已内置默认预设，你也可以随时导入并切换自己的配置。</p>
      {presets.length === 0 ? (
        <section className="library-empty"><span><SlidersHorizontal size={30} weight="duotone" /></span><h3>当前没有对话预设</h3><p>可以导入 SillyTavern Chat Completion 预设，或清除本地数据以恢复内置默认预设。</p></section>
      ) : (
        <div className="library-list preset-library" aria-label="对话预设列表">
          {presets.map((preset) => <button id={`preset-library-item-${preset.id}`} key={preset.id} type="button" className={selected?.id === preset.id ? 'selected' : ''} aria-pressed={preset.id === activePresetId} onClick={() => setSelectedId(preset.id)}><span className="library-glyph"><Gauge size={20} /></span><span><strong>{preset.name}</strong><small>{preset.description || 'SillyTavern 对话预设'}</small></span>{preset.id === activePresetId && <Check size={17} weight="bold" aria-label="当前启用" />}</button>)}
        </div>
      )}

      {selected && (
        <section className="preset-detail">
          <div className="preset-detail-head"><span><SlidersHorizontal size={22} /></span><div><h3>{selected.name}</h3><p>{selected.description || '这份预设未提供说明。'}</p></div></div>
          <dl className="preset-data-grid">
            <div><dt>温度</dt><dd>{String(selected.settings.temp_openai ?? selected.settings.temperature ?? '未指定')}</dd></div>
            <div><dt>最大输出</dt><dd>{String(selected.settings.openai_max_tokens ?? selected.settings.max_tokens ?? '未指定')}</dd></div>
            <div><dt>上下文</dt><dd>{String(selected.settings.openai_max_context ?? selected.settings.max_length ?? '未指定')}</dd></div>
            <div><dt>提示词节点</dt><dd>{Array.isArray(selected.settings.prompt_order) ? selected.settings.prompt_order.length : 0}</dd></div>
          </dl>
          <div className="library-actions"><button id={`preset-edit-${selected.id}`} type="button" onClick={() => setEditing(selected)}><PencilSimple size={18} />编辑对话预设</button><button id={`preset-activate-${selected.id}`} type="button" disabled={selected.id === activePresetId} onClick={() => void onSelect(selected.id)}><Check size={18} />{selected.id === activePresetId ? '正在使用' : '使用此预设'}</button><button id={`preset-delete-${selected.id}`} className="danger-action" type="button" onClick={() => onDelete(selected)}><Trash size={18} />删除预设</button></div>
        </section>
      )}
      <FileImportControl id="import-preset-file" label={presets.length ? '导入另一份预设' : '导入对话预设'} helper="支持 SillyTavern Chat Completion 预设 JSON" onFile={importFile} onError={onError} />
      {editing && <PresetModal preset={editing} onClose={() => setEditing(null)} onSave={async (preset) => { await onSave(preset); setEditing(null) }} />}
    </div>
  )
}
