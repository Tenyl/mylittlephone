import { useCallback, useState } from 'react'
import { AppShell, type PanelId } from './components/AppShell'
import { ConfirmDialog } from './components/ConfirmDialog'
import { FormDialog } from './components/FormDialog'
import { PanelDrawer } from './components/PanelDrawer'
import { ToastRegion, type Notice, type NoticeTone } from './components/ToastRegion'
import { CharacterPanel } from './features/character/CharacterPanel'
import { HistoryPanel } from './features/history/HistoryPanel'
import { PresetPanel } from './features/presets/PresetPanel'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { VariablesPanel } from './features/variables/VariablesPanel'
import { WorldBookPanel } from './features/worldbook/WorldBookPanel'
import { useSillytavern } from './hooks/useSillytavern'
import { exportAllData, importAllData, type FullBackup } from './sillytavern/database'
import type { CharacterCard, ChatMessage, ChatPreset, ChatSession, Lorebook } from './sillytavern/types'
import './styles/tokens.css'
import './styles/global.css'
import './styles/app.css'
import './styles/sillytavern.css'

interface AppProps { streamDelayMs?: number }

type Confirmation =
  | { kind: 'delete-character'; item: CharacterCard }
  | { kind: 'delete-lorebook'; item: Lorebook }
  | { kind: 'delete-preset'; item: ChatPreset }
  | { kind: 'delete-chat'; item: ChatSession }
  | { kind: 'delete-from-message'; item: ChatMessage; count: number }
  | { kind: 'clear-first' }
  | { kind: 'clear-final' }
  | { kind: 'import-backup'; backup: FullBackup }

type FormState =
  | { kind: 'edit-message'; item: ChatMessage }
  | { kind: 'branch-message'; item: ChatMessage }
  | { kind: 'rename-chat'; item: ChatSession }

const noticeId = () => `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export default function App({ streamDelayMs: _streamDelayMs }: AppProps) {
  const chat = useSillytavern()
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])

  const pushNotice = useCallback((tone: NoticeTone, title: string, message: string) => {
    const notice: Notice = { id: noticeId(), tone, title, message }
    setNotices((current) => [...current, notice].slice(-4))
    window.setTimeout(() => setNotices((current) => current.filter((item) => item.id !== notice.id)), 4200)
  }, [])

  const fileError = useCallback((message: string) => pushNotice('error', '导入未完成', message), [pushNotice])

  const createChat = async () => {
    try {
      await chat.createChat()
      pushNotice('success', '新会话已创建', '角色的初始消息已经写入本地会话。')
    } catch (cause) {
      pushNotice('warning', '还不能开始聊天', cause instanceof Error ? cause.message : '请先完成准备步骤。')
    }
  }

  const exportBackup = async () => {
    const backup = await exportAllData()
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `澄语安全备份-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    pushNotice('success', '安全备份已导出', '主次 API 密钥没有写入备份文件。')
  }

  const requestBackupImport = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('备份根节点必须是对象')
      setConfirmation({ kind: 'import-backup', backup: parsed as FullBackup })
    } catch (cause) {
      pushNotice('error', '备份无法读取', cause instanceof Error ? cause.message : '文件不是有效 JSON。')
    }
  }

  const executeConfirmation = async () => {
    if (!confirmation) return
    if (confirmation.kind === 'clear-first') { setConfirmation({ kind: 'clear-final' }); return }
    if (confirmation.kind === 'clear-final') {
      await chat.resetAllData(); setConfirmation(null); setActivePanel(null); pushNotice('success', '本地内容已清空', '现在可以从自己的角色卡重新开始。'); return
    }
    if (confirmation.kind === 'import-backup') {
      await importAllData(confirmation.backup); await chat.reloadData(); setConfirmation(null); setActivePanel(null); pushNotice('success', '备份已导入', '内容库与会话已从本地备份恢复。'); return
    }
    if (confirmation.kind === 'delete-character') { await chat.deleteCharacter(confirmation.item.id); pushNotice('success', '角色卡已删除', `“${confirmation.item.name}”已从本机移除。`) }
    if (confirmation.kind === 'delete-lorebook') { await chat.deleteLorebook(confirmation.item.id); pushNotice('success', '世界书已删除', `“${confirmation.item.name}”已从本机移除。`) }
    if (confirmation.kind === 'delete-preset') { await chat.deletePreset(confirmation.item.id); pushNotice('success', '预设已删除', `“${confirmation.item.name}”已从本机移除。`) }
    if (confirmation.kind === 'delete-chat') { await chat.removeChat(confirmation.item.id); pushNotice('success', '会话已删除', `“${confirmation.item.name}”已从历史中移除。`) }
    if (confirmation.kind === 'delete-from-message') { await chat.deleteFromMessage(confirmation.item.id); pushNotice('success', '消息已截断', `已删除该消息及其后的 ${confirmation.count - 1} 条消息。`) }
    setConfirmation(null)
  }

  const confirmationCopy = confirmation ? (() => {
    if (confirmation.kind === 'delete-character') return { title: '删除角色卡？', description: `将从本机删除“${confirmation.item.name}”。与它关联的历史会话仍保留，但在重新导入前无法继续生成。`, label: '删除角色卡' }
    if (confirmation.kind === 'delete-lorebook') return { title: '删除世界书？', description: `“${confirmation.item.name}”及其中 ${confirmation.item.entries.length} 个条目会被删除。`, label: '删除世界书' }
    if (confirmation.kind === 'delete-preset') return { title: '删除对话预设？', description: `“${confirmation.item.name}”会从本机移除，已有消息不会改变。`, label: '删除预设' }
    if (confirmation.kind === 'delete-chat') return { title: '删除整个会话？', description: `“${confirmation.item.name}”中的 ${confirmation.item.messages.length} 条消息与变量快照将被删除。`, label: '删除会话' }
    if (confirmation.kind === 'delete-from-message') return { title: '从这里截断会话？', description: `将删除当前消息以及后续共 ${confirmation.count} 条消息，并恢复此前的变量快照。`, label: '确认截断' }
    if (confirmation.kind === 'clear-first') return { title: '清除所有本地内容？', description: '此操作会删除角色卡、世界书、预设、会话和设置。下一步还会要求再次确认。', label: '继续确认' }
    if (confirmation.kind === 'clear-final') return { title: '最后确认清空？', description: '清除后无法自动恢复。建议先导出安全备份。', label: '永久清空' }
    const backup = confirmation.backup
    return { title: '导入并覆盖本地内容？', description: `备份包含 ${backup.characters?.length ?? 0} 张角色卡、${backup.lorebooks?.length ?? 0} 本世界书、${backup.presets?.length ?? 0} 份预设与 ${backup.chats?.length ?? 0} 个会话。现有 API 密钥会保留。`, label: '导入备份' }
  })() : null

  const panel = !activePanel ? null : activePanel === 'character' ? (
    <PanelDrawer title="角色卡库" eyebrow="Character Library" onClose={() => setActivePanel(null)}><CharacterPanel characters={chat.characters} activeCharacterId={chat.settings?.activeCharacterId ?? null} onSelect={async (id) => { await chat.selectCharacter(id); pushNotice('info', '聊天对象已切换', '请创建新会话以使用这张角色卡。') }} onImport={async (file) => { const character = await chat.importCharacter(file); pushNotice('success', '角色卡已导入', `“${character.name}”已加入本地角色卡库。`) }} onDelete={(item) => setConfirmation({ kind: 'delete-character', item })} onError={fileError} /></PanelDrawer>
  ) : activePanel === 'worldbook' ? (
    <PanelDrawer title="世界书" eyebrow="World Information" onClose={() => setActivePanel(null)}><WorldBookPanel lorebooks={chat.lorebooks} activeIds={chat.settings?.activeLorebookIds ?? []} onToggle={chat.toggleLorebook} onImport={async (book) => { await chat.addLorebook(book); pushNotice('success', '世界书已导入', `“${book.name}”与 ${book.entries.length} 个条目已保存。`) }} onDelete={(item) => setConfirmation({ kind: 'delete-lorebook', item })} onError={fileError} /></PanelDrawer>
  ) : activePanel === 'presets' ? (
    <PanelDrawer title="对话预设" eyebrow="Response Presets" onClose={() => setActivePanel(null)}><PresetPanel presets={chat.presets} activePresetId={chat.settings?.activePresetId ?? null} onSelect={async (id) => { await chat.selectPreset(id); pushNotice('info', '预设已切换', '下一次生成会使用新的提示词与参数。') }} onImport={async (preset) => { await chat.addPreset(preset); pushNotice('success', '预设已导入', `“${preset.name}”已保存并启用。`) }} onDelete={(item) => setConfirmation({ kind: 'delete-preset', item })} onError={fileError} /></PanelDrawer>
  ) : activePanel === 'history' ? (
    <PanelDrawer title="会话历史" eyebrow="Local Sessions" onClose={() => setActivePanel(null)}><HistoryPanel chats={chat.chats} activeChatId={chat.settings?.activeChatId ?? null} onSelect={async (id) => { await chat.selectChat(id); setActivePanel(null) }} onRename={(item) => setForm({ kind: 'rename-chat', item })} onDelete={(item) => setConfirmation({ kind: 'delete-chat', item })} /></PanelDrawer>
  ) : activePanel === 'variables' ? (
    <PanelDrawer title="会话变量" eyebrow="Runtime Variables" onClose={() => setActivePanel(null)}><VariablesPanel variables={chat.activeChat?.variables ?? {}} disabled={!chat.activeChat} onSave={async (variables) => { await chat.setChatVariables(variables); pushNotice('success', '变量已保存', '新的变量值会在下一轮提示词中生效。') }} /></PanelDrawer>
  ) : chat.settings ? (
    <PanelDrawer title="系统设置" eyebrow="Local Runtime" onClose={() => setActivePanel(null)}><SettingsPanel settings={chat.settings} onUpdate={chat.updateSettings} onNotice={pushNotice} onRequestClear={() => setConfirmation({ kind: 'clear-first' })} onExport={exportBackup} onImport={requestBackupImport} /></PanelDrawer>
  ) : null

  if (chat.status === 'loading' || !chat.settings) return <main className="boot-screen"><span className="boot-mark" /><h1>正在打开本地聊天空间</h1><p>读取角色卡、世界书、预设与会话索引。</p></main>
  if (chat.status === 'error') return <main className="boot-screen error"><h1>本地数据无法打开</h1><p>{chat.error}</p><button id="reload-after-storage-error" type="button" onClick={() => window.location.reload()}>重新加载</button></main>

  return (
    <>
      <AppShell settings={chat.settings} characters={chat.characters} activeCharacter={chat.activeCharacter} activePreset={chat.activePreset} activeLorebooks={chat.activeLorebooks} activeChat={chat.activeChat} chats={chat.chats} readiness={chat.readiness} generating={chat.generation.status === 'streaming'} onOpenPanel={setActivePanel} onStart={() => void createChat()} onSend={chat.sendGameMessage} onStop={chat.stopGeneration} onRegenerate={chat.regenerateLast} onDeleteRound={() => { const item = chat.activeChat?.messages.findLast((message) => message.role === 'user'); if (item && chat.activeChat) setConfirmation({ kind: 'delete-from-message', item, count: chat.activeChat.messages.length - chat.activeChat.messages.indexOf(item) }) }} onEditMessage={(item) => setForm({ kind: 'edit-message', item })} onDeleteFromMessage={(item) => { if (chat.activeChat) setConfirmation({ kind: 'delete-from-message', item, count: chat.activeChat.messages.length - chat.activeChat.messages.indexOf(item) }) }} onBranchMessage={(item) => setForm({ kind: 'branch-message', item })} />
      {panel}
      <ToastRegion notices={notices} onDismiss={(id) => setNotices((current) => current.filter((notice) => notice.id !== id))} />
      {confirmation && confirmationCopy && <ConfirmDialog title={confirmationCopy.title} description={confirmationCopy.description} confirmLabel={confirmationCopy.label} onCancel={() => setConfirmation(null)} onConfirm={() => void executeConfirmation()} />}
      {form?.kind === 'edit-message' && <FormDialog title="编辑并重新生成" description="保存后会删除这条消息之后的内容，并从编辑后的文本重新请求模型。" label="消息内容" initialValue={form.item.content} submitLabel="保存并生成" multiline onCancel={() => setForm(null)} onSubmit={async (value) => { await chat.editAndRegenerate(form.item.id, value); setForm(null) }} />}
      {form?.kind === 'branch-message' && <FormDialog title="创建对话分支" description="新会话会保留当前消息以及此前的变量快照。" label="分支名称" initialValue={`${chat.activeChat?.name || '新会话'} · 分支`} submitLabel="创建分支" onCancel={() => setForm(null)} onSubmit={async (value) => { await chat.branchFromMessage(form.item.id, value); setForm(null); pushNotice('success', '分支已创建', '现在正在新的本地会话中。') }} />}
      {form?.kind === 'rename-chat' && <FormDialog title="重命名会话" description="名称只用于本地会话列表，不会进入提示词。" label="会话名称" initialValue={form.item.name} submitLabel="保存名称" onCancel={() => setForm(null)} onSubmit={async (value) => { await chat.renameChat(form.item.id, value); setForm(null) }} />}
    </>
  )
}
