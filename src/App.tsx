import { useCallback, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PanelDrawer } from './components/PanelDrawer'
import { ToastRegion } from './components/ToastRegion'
import { CharacterPanel } from './features/character/CharacterPanel'
import { PresetPanel } from './features/presets/PresetPanel'
import { SessionPanel } from './features/session/SessionPanel'
import { WorldBookPanel } from './features/worldbook/WorldBookPanel'
import { useChatApp } from './hooks/useChatApp'
import './styles/tokens.css'
import './styles/global.css'
import './styles/app.css'

interface AppProps {
  streamDelayMs?: number
}

export default function App({ streamDelayMs = 42 }: AppProps) {
  const chat = useChatApp(streamDelayMs)
  const [confirmation, setConfirmation] = useState<'clear' | 'memory' | null>(null)
  const closePanel = useCallback(() => chat.dispatch({ type: 'close-panel' }), [chat.dispatch])
  const errorNotice = useCallback((message: string) => chat.pushNotice({ tone: 'error', title: '导入未完成', message }), [chat.pushNotice])

  const exportSession = () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      character: chat.state.character.name,
      preset: chat.activePreset.name,
      messages: chat.state.messages,
    }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `与${chat.state.character.name}的聊天记录.json`
    anchor.click()
    URL.revokeObjectURL(url)
    chat.pushNotice({ tone: 'success', title: '聊天记录已导出', message: '文件已保存到浏览器的默认下载位置。' })
  }

  const panel = chat.state.activePanel === 'character' ? (
    <PanelDrawer title="角色卡" eyebrow="Character Profile" onClose={closePanel}>
      <CharacterPanel
        character={chat.state.character}
        onError={errorNotice}
        onImport={(character) => {
          chat.dispatch({ type: 'replace-character', character })
          chat.pushNotice({ tone: 'success', title: '角色卡已导入', message: `现在由“${character.name}”与你对话。` })
        }}
      />
    </PanelDrawer>
  ) : chat.state.activePanel === 'worldbook' ? (
    <PanelDrawer title="世界书" eyebrow="World Context" onClose={closePanel}>
      <WorldBookPanel
        worldBook={chat.state.worldBook}
        onToggle={(entryId) => chat.dispatch({ type: 'toggle-world-entry', entryId })}
        onError={errorNotice}
        onImport={(worldBook) => {
          chat.dispatch({ type: 'replace-worldbook', worldBook })
          chat.pushNotice({ tone: 'success', title: '世界书已更新', message: `已载入 ${worldBook.entries.length} 个背景条目。` })
        }}
      />
    </PanelDrawer>
  ) : chat.state.activePanel === 'presets' ? (
    <PanelDrawer title="对话预设" eyebrow="Response Preset" onClose={closePanel}>
      <PresetPanel
        presets={chat.state.presets}
        activePresetId={chat.state.activePresetId}
        onError={errorNotice}
        onSelect={(preset) => {
          chat.dispatch({ type: 'select-preset', presetId: preset.id })
          chat.pushNotice({ tone: 'info', title: '预设已切换', message: `“${preset.name}”将在下一条消息中生效。` })
        }}
        onImport={(preset) => {
          chat.dispatch({ type: 'replace-presets', presets: [...chat.state.presets, preset], activePresetId: preset.id })
          chat.pushNotice({ tone: 'success', title: '自定义预设已导入', message: `“${preset.name}”已加入列表并启用。` })
        }}
      />
    </PanelDrawer>
  ) : chat.state.activePanel === 'session' ? (
    <PanelDrawer title="会话详情" eyebrow="Session Details" onClose={closePanel}>
      <SessionPanel
        state={chat.state}
        activePreset={chat.activePreset}
        onBackground={(backgroundId) => chat.dispatch({ type: 'set-background', backgroundId })}
        onExport={exportSession}
        onResetMemory={() => setConfirmation('memory')}
        onClear={() => setConfirmation('clear')}
      />
    </PanelDrawer>
  ) : null

  return (
    <>
      <AppShell
        state={chat.state}
        activePreset={chat.activePreset}
        onOpenPanel={(nextPanel) => chat.dispatch({ type: 'open-panel', panel: nextPanel })}
        onSend={chat.sendMessage}
        onStop={chat.stopGeneration}
        onRegenerate={chat.regenerate}
        onDeleteRound={() => chat.dispatch({ type: 'delete-last-round' })}
      />
      {panel}
      <ToastRegion notices={chat.state.notices} onDismiss={(noticeId) => chat.dispatch({ type: 'dismiss-notice', noticeId })} />
      {confirmation === 'clear' && (
        <ConfirmDialog
          title="清空当前会话？"
          description="这会移除当前会话中的全部消息。角色卡、世界书和预设仍会保留，但消息无法自动恢复。"
          confirmLabel="确认清空"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            chat.dispatch({ type: 'clear-session' })
            setConfirmation(null)
            closePanel()
            chat.pushNotice({ tone: 'success', title: '会话已清空', message: '角色仍在这里，你可以随时开始新的对话。' })
          }}
        />
      )}
      {confirmation === 'memory' && (
        <ConfirmDialog
          title="重置角色记忆？"
          description="现有聊天记录仍会显示，但后续回复将不再参考此前对话。"
          confirmLabel="确认重置"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            chat.dispatch({ type: 'reset-memory', resetAt: new Date().toISOString() })
            setConfirmation(null)
            chat.pushNotice({ tone: 'warning', title: '角色记忆已重置', message: '下一条消息将作为新的上下文起点。' })
          }}
        />
      )}
    </>
  )
}
