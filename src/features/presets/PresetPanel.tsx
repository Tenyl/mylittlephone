import { Check, ChatsTeardrop, Lightning, Quotes, Sparkle } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import type { Preset } from '../../domain/types'
import { FileImportControl } from '../../components/FileImportControl'
import { parsePreset } from '../../services/importers'

interface PresetPanelProps {
  presets: Preset[]
  activePresetId: string
  onSelect: (preset: Preset) => void
  onImport: (preset: Preset) => void
  onError: (message: string) => void
}

export function PresetPanel({ presets, activePresetId, onSelect, onImport, onError }: PresetPanelProps) {
  return (
    <div className="preset-panel">
      <p className="panel-intro">预设决定角色回复的节奏、主动性与叙事方式。切换只影响下一条新回复，不会改写已有对话。</p>
      <div className="preset-list">
        {presets.map((preset) => {
          const active = preset.id === activePresetId
          return (
            <button key={preset.id} id={`select-preset-${preset.id}`} type="button" className={`preset-card ${active ? 'active' : ''}`} aria-label={`选择${preset.name}`} aria-pressed={active} onClick={() => onSelect(preset)} style={{ '--preset-accent': preset.accent } as CSSProperties}>
              <div className="preset-card-title"><span>{preset.id === 'daily' ? <ChatsTeardrop size={20} /> : preset.id === 'immersive' ? <Sparkle size={20} /> : <Lightning size={20} />}</span><div><strong>{preset.name}</strong><small>{active ? '当前正在使用' : '点击切换'}</small></div>{active && <Check size={18} weight="bold" />}</div>
              <p>{preset.description}</p>
              <div className="preset-specs"><span><Quotes size={13} />{preset.responseLength}</span><span>{preset.perspective}</span><span>{preset.actionNarration ? '允许动作描写' : '纯聊天口吻'}</span></div>
              <div className="preset-sliders"><label>主动程度<i><b style={{ width: `${preset.initiative}%` }} /></i><em>{preset.initiative}</em></label><label>情感表达<i><b style={{ width: `${preset.emotion}%` }} /></i><em>{preset.emotion}</em></label></div>
            </button>
          )
        })}
      </div>
      <FileImportControl id="import-preset-file" label="导入自定义预设" helper="导入后将加入列表并立即选中" onRead={(text, name) => onImport(parsePreset(text, name))} onError={onError} />
    </div>
  )
}
