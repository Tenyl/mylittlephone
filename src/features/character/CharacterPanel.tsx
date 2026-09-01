import { CalendarBlank, ChatCenteredText, FileText, LinkSimple, UserFocus } from '@phosphor-icons/react'
import type { CharacterCard } from '../../domain/types'
import { parseCharacterCard } from '../../services/importers'
import { FileImportControl } from '../../components/FileImportControl'

interface CharacterPanelProps {
  character: CharacterCard
  onImport: (character: CharacterCard) => void
  onError: (message: string) => void
}

export function CharacterPanel({ character, onImport, onError }: CharacterPanelProps) {
  const imported = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(character.importedAt))
  return (
    <div className="character-panel">
      <section className="character-hero">
        <div className="character-cover" aria-hidden="true" />
        <img src={character.avatar} alt={`${character.name}的头像`} width="88" height="88" />
        <div><span className="active-badge"><i />当前启用</span><h3>{character.name}</h3><p>{character.subtitle}</p></div>
      </section>
      <div className="trait-row panel-traits">{character.personality.map((trait) => <span key={trait}>{trait}</span>)}</div>
      <section className="detail-section"><h4><UserFocus size={17} />角色简介</h4><p>{character.bio}</p></section>
      <section className="detail-grid">
        <div><h4><ChatCenteredText size={17} />说话风格</h4><p>{character.speakingStyle}</p></div>
        <div><h4><LinkSimple size={17} />与你的关系</h4><p>{character.relationship}</p></div>
      </section>
      <section className="detail-section"><h4>背景资料</h4><p>{character.background}</p><blockquote>{character.note}</blockquote></section>
      <section className="file-meta"><div><FileText size={18} /><span>来源文件<strong>{character.sourceFile}</strong></span></div><div><CalendarBlank size={18} /><span>导入时间<strong>{imported}</strong></span></div></section>
      <FileImportControl id="import-character-file" label="替换当前角色卡" helper="拖入或选择 JSON 文件，最大 2MB" onRead={(text, name) => onImport(parseCharacterCard(text, name))} onError={onError} />
    </div>
  )
}
