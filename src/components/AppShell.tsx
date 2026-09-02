import { GearSix } from '@phosphor-icons/react'
import type { AppSettings, CharacterCard, ChatMessage, ChatSession } from '../sillytavern/types'
import type { SetupReadiness } from '../sillytavern/readiness'
import { resolveChatProfile } from '../sillytavern/chat-profile'
import { SetupGuide } from '../features/onboarding/SetupGuide'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

export type PanelId = 'chat-profile' | 'profile' | 'character' | 'worldbook' | 'presets' | 'history' | 'variables' | 'settings'

interface AppShellProps {
  activeCharacter: CharacterCard | null
  activeChat: ChatSession | null
  settings: AppSettings
  readiness: SetupReadiness
  generating: boolean
  onOpenPanel: (panel: PanelId) => void
  onOpenManagement: () => void
  onStart: () => void
  onSend: (content: string) => boolean | Promise<boolean>
  onStop: () => void
  onRegenerate: () => void | Promise<unknown>
  onEditMessage: (message: ChatMessage) => void
  onDeleteFromMessage: (message: ChatMessage) => void
  onBranchMessage: (message: ChatMessage) => void
}

export function AppShell(props: AppShellProps) {
  const {
    activeCharacter, activeChat, settings, readiness, generating,
    onOpenPanel, onOpenManagement, onStart, onSend, onStop, onRegenerate,
    onEditMessage, onDeleteFromMessage, onBranchMessage,
  } = props
  const profile = activeCharacter && activeChat
    ? resolveChatProfile(activeCharacter, activeChat, settings)
    : null

  return (
    <div className="app-stage">
      <div id="phone-device" className="phone-device">
        <div className="phone-hardware" aria-hidden="true"><i className="phone-speaker" /><i className="phone-camera" /></div>
        <i className="phone-key phone-key-volume-up" aria-hidden="true" />
        <i className="phone-key phone-key-volume-down" aria-hidden="true" />
        <i className="phone-key phone-key-power" aria-hidden="true" />
        <div id="phone-screen" className="phone-screen">
          <div id="immersive-chat-shell" className="app-window immersive-chat-shell">
            <main className="chat-column">
              {activeChat && activeCharacter && profile ? (
                <>
                  <ChatHeader profile={profile} chat={activeChat} generating={generating} onOpenHistory={() => onOpenPanel('history')} onOpenManagement={onOpenManagement} />
                  <MessageList messages={activeChat.messages} profile={profile} onEdit={onEditMessage} onDeleteFrom={onDeleteFromMessage} onBranch={onBranchMessage} onRegenerate={onRegenerate} />
                  <Composer characterName={profile.characterName} generating={generating} onSend={onSend} onStop={onStop} />
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
      </div>
    </div>
  )
}
