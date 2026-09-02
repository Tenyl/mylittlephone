import { ArrowCounterClockwise, Camera, ChatCircleText, Trash, UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { readProfileImage } from '../../sillytavern/profile-image'
import type { CharacterCard, ChatSession } from '../../sillytavern/types'

interface ChatProfilePanelProps {
  chat: ChatSession | null
  character: CharacterCard | null
  onUpdate: (patch: Partial<Pick<ChatSession, 'characterDisplayName' | 'characterAvatar'>>) => void | Promise<void>
  onError: (message: string) => void
}

export function ChatProfilePanel({ chat, character, onUpdate, onError }: ChatProfilePanelProps) {
  const [displayName, setDisplayName] = useState(chat?.characterDisplayName ?? '')
  useEffect(() => setDisplayName(chat?.characterDisplayName ?? ''), [chat?.id, chat?.characterDisplayName])

  if (!chat || !character) {
    return <div className="chat-profile-panel"><div className="panel-empty-state"><strong>请先创建或打开一个会话</strong><span>角色备注与头像只会保存在指定会话中。</span></div></div>
  }

  const avatar = chat.characterAvatar || character.avatar
  const visibleName = chat.characterDisplayName?.trim() || character.name

  return (
    <div className="chat-profile-panel">
      <section className="world-summary"><span><ChatCircleText size={24} weight="duotone" /></span><div><h3>当前聊天资料</h3><p>这里的备注和头像只改变“{chat.name}”的显示，不会修改角色卡或提示词。</p></div></section>
      <div className="profile-editor-card">
        {avatar ? <img src={avatar} alt={`${visibleName}的当前头像`} width="72" height="72" /> : <span className="profile-avatar-fallback" aria-hidden="true"><UserCircle size={36} /></span>}
        <div><strong>{visibleName}</strong></div>
      </div>
      <label htmlFor="chat-character-display-name">角色备注名</label>
      <input id="chat-character-display-name" value={displayName} maxLength={32} placeholder={character.name} onChange={(event) => setDisplayName(event.target.value)} />
      <div className="profile-image-actions">
        <label htmlFor="chat-character-avatar-file"><input id="chat-character-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await onUpdate({ characterAvatar: await readProfileImage(file) }) } catch (cause) { onError(cause instanceof Error ? cause.message : '头像文件无法读取') } finally { event.target.value = '' } }} /><Camera size={18} />更换本会话头像</label>
        {chat.characterAvatar && <button id="chat-character-avatar-remove" type="button" onClick={() => void onUpdate({ characterAvatar: '' })}><Trash size={18} />移除替换头像</button>}
      </div>
      <button id="chat-profile-save" className="panel-primary-action" type="button" onClick={() => void onUpdate({ characterDisplayName: displayName })}>保存当前聊天资料</button>
      <button id="chat-profile-reset" className="secondary-action profile-reset" type="button" onClick={() => { setDisplayName(''); void onUpdate({ characterDisplayName: '', characterAvatar: '' }) }}><ArrowCounterClockwise size={18} />恢复角色卡资料</button>
    </div>
  )
}
