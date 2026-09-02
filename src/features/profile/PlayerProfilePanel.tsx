import { Camera, Trash, UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { readProfileImage } from '../../sillytavern/profile-image'
import type { AppSettings } from '../../sillytavern/types'

interface PlayerProfilePanelProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void | Promise<void>
  onNotice: (tone: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void
}

export function PlayerProfilePanel({ settings, onUpdate, onNotice }: PlayerProfilePanelProps) {
  const [userName, setUserName] = useState(settings.userName)
  const [saving, setSaving] = useState(false)

  useEffect(() => setUserName(settings.userName), [settings.userName])

  const saveProfile = async () => {
    const nextName = userName.trim() || '博士'
    setSaving(true)
    try {
      await onUpdate({ userName: nextName })
      setUserName(nextName)
      onNotice('success', '资料已保存', '昵称会用于聊天显示与角色对你的称呼。')
    } catch (cause) {
      onNotice('error', '资料未保存', cause instanceof Error ? cause.message : '请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-panel player-profile-panel">
      <section className="settings-section" aria-labelledby="player-profile-heading">
        <div className="settings-heading"><span><UserCircle size={22} /></span><div><h3 id="player-profile-heading">我的资料</h3><p>昵称会进入角色对你的称呼；头像只用于本机聊天界面。</p></div></div>
        <div className="profile-editor-card">
          {settings.userAvatar ? <img src={settings.userAvatar} alt="当前玩家头像" width="72" height="72" /> : <span className="profile-avatar-fallback" aria-hidden="true"><UserCircle size={36} /></span>}
          <div>
            <strong>{userName.trim() || '博士'}</strong>
            <span>保存在当前浏览器</span>
          </div>
        </div>
        <label htmlFor="user-display-name">玩家昵称</label>
        <input id="user-display-name" value={userName} maxLength={32} autoComplete="nickname" onChange={(event) => setUserName(event.target.value)} />
        <button id="player-profile-save" className="panel-primary-action" type="button" disabled={saving} onClick={() => void saveProfile()}>{saving ? '保存中…' : '保存我的资料'}</button>
        <div className="profile-image-actions">
          <label htmlFor="player-avatar-file"><input id="player-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await onUpdate({ userAvatar: await readProfileImage(file) }); onNotice('success', '头像已更新', '新的玩家头像已保存在当前浏览器。') } catch (cause) { onNotice('error', '头像未更新', cause instanceof Error ? cause.message : '头像文件无法读取') } finally { event.target.value = '' } }} /><Camera size={18} />选择头像</label>
          {settings.userAvatar && <button id="player-avatar-remove" type="button" onClick={() => void onUpdate({ userAvatar: '' })}><Trash size={18} />移除头像</button>}
        </div>
        <p className="field-helper">支持 PNG、JPEG、WebP，最大 2MB。图片不会随聊天请求发送。</p>
      </section>
    </div>
  )
}
