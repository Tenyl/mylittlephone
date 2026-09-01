import { ArrowCounterClockwise, DownloadSimple, Eraser, ImageSquare, ShieldCheck, Trash } from '@phosphor-icons/react'
import type { AppState, Preset } from '../../domain/types'

interface SessionPanelProps {
  state: AppState
  activePreset: Preset
  onBackground: (id: string) => void
  onExport: () => void
  onResetMemory: () => void
  onClear: () => void
}

export function SessionPanel({ state, activePreset, onBackground, onExport, onResetMemory, onClear }: SessionPanelProps) {
  const started = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(state.createdAt))
  return (
    <div className="session-panel">
      <section className="session-overview"><img src={state.character.avatar} alt="" width="54" height="54" /><div><span className="eyebrow">当前会话</span><h3>与 {state.character.name} 的夜间对话</h3><p>创建于 {started}</p></div></section>
      <div className="session-stats"><div><strong>{state.messages.length}</strong><span>消息</span></div><div><strong>34%</strong><span>上下文</span></div><div><strong>{state.worldBook.entries.filter((item) => item.triggered).length}</strong><span>触发条目</span></div></div>
      <section className="session-config"><h4><ShieldCheck size={18} />正在使用的设定</h4><div><span>角色卡</span><strong>{state.character.name}</strong></div><div><span>世界书</span><strong>{state.worldBook.name}</strong></div><div><span>对话预设</span><strong>{activePreset.name}</strong></div></section>
      <section className="background-picker"><h4><ImageSquare size={18} />聊天背景</h4><div>{[['rain','夜雨'],['dawn','晨雾'],['plain','素净']].map(([id, label]) => <button key={id} id={`background-${id}`} type="button" aria-label={`使用${label}背景`} aria-pressed={state.backgroundId === id} onClick={() => onBackground(id)}><i className={`swatch-${id}`} /><span>{label}</span></button>)}</div></section>
      <section className="session-actions">
        <button id="session-export" type="button" aria-label="导出聊天记录" onClick={onExport}><DownloadSimple size={19} /><span><strong>导出聊天记录</strong><small>保存为本地 JSON 文件</small></span></button>
        <button id="session-reset-memory" type="button" aria-label="重置角色记忆" onClick={onResetMemory}><ArrowCounterClockwise size={19} /><span><strong>重置角色记忆</strong><small>保留记录，但忘记此前上下文</small></span></button>
        <button id="session-clear" className="danger-action" type="button" aria-label="清空当前会话" onClick={onClear}><Eraser size={19} /><span><strong>清空当前会话</strong><small>移除全部消息，无法自动恢复</small></span><Trash size={16} /></button>
      </section>
    </div>
  )
}
