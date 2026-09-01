import { ArrowDown, ArrowUp, Check, Plus, SlidersHorizontal, Trash, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap'
import { clampNumber, movePromptItem } from '../../sillytavern/editor-utils'
import type { ChatPreset } from '../../sillytavern/types'

interface PresetModalProps {
  preset: ChatPreset
  onSave: (preset: ChatPreset) => void | Promise<void>
  onClose: () => void
}

type Tab = 'sampling' | 'prompts' | 'custom' | 'order'
interface CustomPrompt { identifier: string; role?: 'system' | 'user' | 'assistant'; content?: string; name?: string }
interface PromptOrder { identifier: string; name?: string; role?: 'system' | 'user' | 'assistant'; enabled?: boolean }

const promptFields: Array<[string, string]> = [
  ['main', '主提示词'], ['nsfw', 'NSFW 提示词'], ['jailbreak', '越狱提示词'],
  ['enhanceDefinitions', '定义增强'], ['new_chat_prompt', '新会话提示词'],
  ['continue_nudge_prompt', '继续回复提示词'], ['wi_format', '世界书格式'],
  ['scenario_format', '场景格式'], ['personality_format', '性格格式'],
]

export function PresetModal({ preset, onSave, onClose }: PresetModalProps) {
  const [draft, setDraft] = useState<ChatPreset>(() => structuredClone(preset))
  const [tab, setTab] = useState<Tab>('sampling')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialogFocusTrap(dialogRef, closeRef, onClose)

  const patch = (settings: Record<string, unknown>) => setDraft((current) => ({ ...current, settings: { ...current.settings, ...settings }, updatedAt: Date.now() }))
  const customPrompts = Array.isArray(draft.settings.prompts) ? draft.settings.prompts as CustomPrompt[] : []
  const order = Array.isArray(draft.settings.prompt_order) ? draft.settings.prompt_order as PromptOrder[] : []
  const updateCustom = (index: number, next: Partial<CustomPrompt>) => patch({ prompts: customPrompts.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item) })

  const save = async () => {
    if (!draft.name.trim()) { setError('预设名称不能为空。'); return }
    const identifiers = customPrompts.map((item) => item.identifier.trim()).filter(Boolean)
    if (new Set(identifiers).size !== identifiers.length) { setError('自定义 Prompt 的 identifier 不能重复。'); return }
    setSaving(true); setError('')
    try { await onSave({ ...draft, name: draft.name.trim(), updatedAt: Date.now() }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '对话预设保存失败。') }
    finally { setSaving(false) }
  }

  const numberField = (id: string, label: string, key: string, fallback: number, min: number, max: number, step: number) => (
    <label htmlFor={id}><span>{label}</span><input id={id} type="number" step={step} min={min} max={max} value={Number(draft.settings[key] ?? fallback)} onChange={(event) => patch({ [key]: clampNumber(event.target.value, min, max, fallback) })} /></label>
  )

  return createPortal(
    <div className="management-modal-scrim">
      <section ref={dialogRef} className="management-modal preset-editor-modal" role="dialog" aria-modal="true" aria-labelledby="preset-editor-title" tabIndex={-1}>
        <header className="management-modal-header"><span className="management-modal-icon"><SlidersHorizontal size={24} weight="duotone" /></span><div><span className="eyebrow">Response Preset Editor</span><h2 id="preset-editor-title">编辑对话预设</h2></div><button ref={closeRef} id="preset-editor-close" className="icon-button" type="button" aria-label="关闭预设编辑器" onClick={onClose}><X size={21} /></button></header>
        <div className="preset-editor-name"><label htmlFor="preset-editor-name-input">预设名称</label><input id="preset-editor-name-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /><label htmlFor="preset-editor-description">说明</label><input id="preset-editor-description" value={draft.description ?? ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></div>

        <nav className="editor-tabs" aria-label="预设编辑分类">
          {([['sampling', '采样参数'], ['prompts', '提示词'], ['custom', '自定义 Prompts'], ['order', '提示词排序']] as const).map(([id, label]) => <button id={`preset-editor-tab-${id}`} key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
        </nav>

        <div className="preset-editor-content">
          {tab === 'sampling' && <section className="sampling-grid" aria-labelledby="sampling-title"><div className="editor-section-heading"><h3 id="sampling-title">采样与上下文</h3><p>这些参数会随主 API 请求发送；未写入的高级字段继续原样保留。</p></div>{numberField('preset-temperature', '温度', 'temp_openai', 0.8, 0, 2, 0.01)}{numberField('preset-top-p', 'Top P', 'top_p_openai', 1, 0, 1, 0.01)}{numberField('preset-frequency-penalty', '频率惩罚', 'freq_pen_openai', 0, -2, 2, 0.01)}{numberField('preset-presence-penalty', '存在惩罚', 'pres_pen_openai', 0, -2, 2, 0.01)}{numberField('preset-max-tokens', '最大输出 Token', 'openai_max_tokens', 2048, 1, 200000, 1)}{numberField('preset-max-context', '最大上下文 Token', 'openai_max_context', 8192, 256, 2000000, 1)}</section>}
          {tab === 'prompts' && <section className="prompt-fields" aria-labelledby="prompt-fields-title"><div className="editor-section-heading"><h3 id="prompt-fields-title">标准提示词区块</h3><p>支持 SillyTavern 宏，例如 {'{{char}}'} 与 {'{{user}}'}。</p></div>{promptFields.map(([key, label], index) => <label key={key} htmlFor={`preset-prompt-${key}`}><span>{label}</span><textarea id={`preset-prompt-${key}`} aria-label={label} rows={index === 0 ? 7 : 4} value={String(draft.settings[key] ?? '')} onChange={(event) => patch({ [key]: event.target.value })} /></label>)}</section>}
          {tab === 'custom' && <section className="custom-prompt-list" aria-labelledby="custom-prompts-title"><div className="editor-section-heading with-action"><div><h3 id="custom-prompts-title">自定义 Prompts</h3><p>创建具名提示词，再到排序页决定是否启用与注入顺序。</p></div><button id="preset-add-custom-prompt" type="button" onClick={() => patch({ prompts: [...customPrompts, { identifier: `custom_${customPrompts.length + 1}`, role: 'system', content: '' }] })}><Plus size={17} />添加 Prompt</button></div>{customPrompts.length === 0 ? <p className="editor-empty-copy">当前预设没有自定义 Prompt。</p> : customPrompts.map((item, index) => <article key={`${item.identifier}-${index}`}><div><label htmlFor={`custom-prompt-id-${index}`}>Identifier</label><input id={`custom-prompt-id-${index}`} value={item.identifier} onChange={(event) => updateCustom(index, { identifier: event.target.value.replace(/\s/g, '_') })} /><label htmlFor={`custom-prompt-role-${index}`}>角色</label><select id={`custom-prompt-role-${index}`} value={item.role ?? 'system'} onChange={(event) => updateCustom(index, { role: event.target.value as CustomPrompt['role'] })}><option value="system">系统</option><option value="user">用户</option><option value="assistant">助手</option></select><button id={`delete-custom-prompt-${index}`} type="button" aria-label={`删除 Prompt ${item.identifier}`} onClick={() => patch({ prompts: customPrompts.filter((_, itemIndex) => itemIndex !== index) })}><Trash size={17} /></button></div><label htmlFor={`custom-prompt-content-${index}`}>Prompt 内容</label><textarea id={`custom-prompt-content-${index}`} rows={5} value={item.content ?? ''} onChange={(event) => updateCustom(index, { content: event.target.value })} /></article>)}</section>}
          {tab === 'order' && <section className="prompt-order-list" aria-labelledby="prompt-order-title"><div className="editor-section-heading"><h3 id="prompt-order-title">提示词排序</h3><p>顺序越靠前，越早进入组装后的上下文。</p></div>{order.length === 0 ? <p className="editor-empty-copy">当前预设没有 prompt_order；原始提示词仍会按兼容顺序组装。</p> : order.map((item, index) => <div key={`${item.identifier}-${index}`}><input id={`prompt-order-enabled-${index}`} type="checkbox" checked={item.enabled !== false} onChange={(event) => patch({ prompt_order: order.map((entry, entryIndex) => entryIndex === index ? { ...entry, enabled: event.target.checked } : entry) })} /><label htmlFor={`prompt-order-enabled-${index}`}><code>{item.identifier}</code><span>{item.name ?? item.identifier}</span></label><button id={`prompt-order-up-${index}`} type="button" aria-label={`上移 ${item.identifier}`} disabled={index === 0} onClick={() => patch({ prompt_order: movePromptItem(order, index, index - 1) })}><ArrowUp size={16} /></button><button id={`prompt-order-down-${index}`} type="button" aria-label={`下移 ${item.identifier}`} disabled={index === order.length - 1} onClick={() => patch({ prompt_order: movePromptItem(order, index, index + 1) })}><ArrowDown size={16} /></button></div>)}</section>}
        </div>

        {error && <p id="preset-editor-error" className="editor-error" role="alert">{error}</p>}
        <footer className="management-modal-footer"><span>未识别的 SillyTavern 字段会被完整保留</span><div><button id="preset-editor-cancel" type="button" onClick={onClose}>取消</button><button id="preset-editor-save" className="primary" type="button" disabled={saving} onClick={() => void save()}><Check size={18} />{saving ? '保存中…' : '保存对话预设'}</button></div></footer>
      </section>
    </div>, document.body,
  )
}
