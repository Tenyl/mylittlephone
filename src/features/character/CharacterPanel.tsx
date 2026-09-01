import { CalendarBlank, Check, ChatCenteredText, FileText, IdentificationCard, Trash, UserFocus } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { FileImportControl } from '../../components/FileImportControl'
import type { CharacterCard } from '../../sillytavern/types'

interface CharacterPanelProps {
  characters: CharacterCard[]
  activeCharacterId: string | null
  onSelect: (characterId: string) => void | Promise<void>
  onImport: (file: File) => void | Promise<void>
  onDelete: (character: CharacterCard) => void
  onError: (message: string) => void
}

function Avatar({ character, size = 48 }: { character: CharacterCard; size?: number }) {
  if (character.avatar) return <img src={character.avatar} alt={`${character.name}的头像`} width={size} height={size} />
  return <span className="avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">{character.name.slice(0, 1)}</span>
}

export function CharacterPanel({ characters, activeCharacterId, onSelect, onImport, onDelete, onError }: CharacterPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(activeCharacterId)
  const selected = useMemo(
    () => characters.find((item) => item.id === selectedId) ?? characters.find((item) => item.id === activeCharacterId) ?? characters[0] ?? null,
    [activeCharacterId, characters, selectedId],
  )

  return (
    <div className="character-panel library-panel">
      {characters.length === 0 ? (
        <section className="library-empty">
          <span><IdentificationCard size={30} weight="duotone" aria-hidden="true" /></span>
          <h3>角色卡库还是空的</h3>
          <p>导入 SillyTavern PNG 或 Character Card V2 JSON。角色内容只保存在当前浏览器。</p>
        </section>
      ) : (
        <div className="library-list" aria-label="角色卡列表">
          {characters.map((character) => {
            const active = character.id === activeCharacterId
            return (
              <button
                id={`character-library-item-${character.id}`}
                key={character.id}
                type="button"
                className={selected?.id === character.id ? 'selected' : ''}
                aria-pressed={active}
                onClick={() => setSelectedId(character.id)}
              >
                <Avatar character={character} />
                <span><strong>{character.name}</strong><small>{character.tags.slice(0, 2).join(' · ') || 'Character Card V2'}</small></span>
                {active && <Check size={17} weight="bold" aria-label="当前启用" />}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <>
          <section className="character-hero">
            <div className="character-cover" aria-hidden="true" />
            <Avatar character={selected} size={88} />
            <div>
              <span className="active-badge"><i />{selected.id === activeCharacterId ? '当前启用' : '角色预览'}</span>
              <h3>{selected.name}</h3>
              <p>{selected.creator ? `由 ${selected.creator} 创建` : `版本 ${selected.characterVersion || selected.specVersion}`}</p>
            </div>
          </section>
          <div className="trait-row panel-traits">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <section className="detail-section"><h4><UserFocus size={17} />角色描述</h4><p>{selected.description || '角色卡未提供描述。'}</p></section>
          <section className="detail-grid">
            <div><h4><ChatCenteredText size={17} />性格</h4><p>{selected.personality || '角色卡未提供性格说明。'}</p></div>
            <div><h4><IdentificationCard size={17} />场景</h4><p>{selected.scenario || '角色卡未提供初始场景。'}</p></div>
          </section>
          <section className="detail-section"><h4>初始消息</h4><p>{selected.firstMes || '角色卡未提供初始消息。'}</p></section>
          <section className="file-meta">
            <div><FileText size={18} /><span>来源文件<strong>{selected.sourceFile}</strong></span></div>
            <div><CalendarBlank size={18} /><span>导入时间<strong>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(selected.importedAt)}</strong></span></div>
          </section>
          <div className="library-actions">
            <button id={`character-activate-${selected.id}`} type="button" disabled={selected.id === activeCharacterId} onClick={() => void onSelect(selected.id)}><Check size={18} />{selected.id === activeCharacterId ? '正在使用' : '设为聊天对象'}</button>
            <button id={`character-delete-${selected.id}`} className="danger-action" type="button" onClick={() => onDelete(selected)}><Trash size={18} />删除角色卡</button>
          </div>
        </>
      )}

      <FileImportControl
        id="import-character-file"
        label={characters.length ? '导入另一张角色卡' : '导入角色卡'}
        helper="支持 SillyTavern PNG 与 Character Card V2 JSON，最大 10MB"
        accept="image/png,.png,application/json,.json"
        onFile={onImport}
        onError={onError}
      />
    </div>
  )
}
