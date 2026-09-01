import { GearSix } from '@phosphor-icons/react'
import type { AppSettings, CharacterCard, ChatMessage, ChatSession, Lorebook } from '../sillytavern/types'
import type { SetupReadiness } from '../sillytavern/readiness'
import { SetupGuide } from '../features/onboarding/SetupGuide'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

export type PanelId = 'character' | 'worldbook' | 'presets' | 'history' | 'variables' | 'settings'

interface AppShellProps {
  settings: AppSettings
  activeCharacter: CharacterCard | null
  activeLorebooks: Lorebook[]
  activeChat: ChatSession | null
  readiness: SetupReadiness
  generating: boolean
  onOpenPanel: (panel: PanelId) => void
  onOpenManagement: () => void
  onStart: () => void
  onSend: (content: string) => boolean | Promise<boolean>
  onStop: () => void
  onRegenerate: () => void | Promise<unknown>
  onDeleteRound: () => void
  onEditMessage: (message: ChatMessage) => void
  onDeleteFromMessage: (message: ChatMessage) => void
  onBranchMessage: (message: ChatMessage) => void
}

export function AppShell(props: AppShellProps) {
  const {
    settings, activeCharacter, activeLorebooks, activeChat, readiness, generating,
    onOpenPanel, onOpenManagement, onStart, onSend, onStop, onRegenerate,
    onDeleteRound, onEditMessage, onDeleteFromMessage, onBranchMessage,
  } = props

  return (
    <div className="app-stage">
      <div id="immersive-chat-shell" className="app-window immersive-chat-shell">
        <main className="chat-column">
          {activeChat && activeCharacter ? (
            <>
              <ChatHeader character={activeCharacter} chat={activeChat} generating={generating} onOpenHistory={() => onOpenPanel('history')} onOpenManagement={onOpenManagement} />
              <MessageList messages={activeChat.messages} character={activeCharacter} thinkingDisplay={settings.thinkingDisplay} generating={generating} onPickOption={onSend} onEdit={onEditMessage} onDeleteFrom={onDeleteFromMessage} onBranch={onBranchMessage} />
              <Composer characterName={activeCharacter.name} generating={generating} enabledLorebooks={activeLorebooks.length} onSend={onSend} onStop={onStop} onRegenerate={onRegenerate} onDeleteRound={onDeleteRound} />
            </>
          ) : (
            <div className="setup-column">
              <button id="setup-open-management" className="icon-button setup-nav-trigger" type="button" aria-label="打开管理中心" onClick={onOpenManagement}><GearSix size={21} /></button>
              <SetupGuide readiness={readiness} onOpenCharacter={() => onOpenPanel('character')} onOpenPreset={() => onOpenPanel('presets')} onOpenSettings={() => onOpenPanel('settings')} onOpenLorebooks={() => onOpenPanel('worldbook')} onStart={onStart} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
