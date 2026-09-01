import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  IdentificationCard,
  PlugsConnected,
  SlidersHorizontal,
  WarningCircle,
} from '@phosphor-icons/react'
import type { SetupReadiness, SetupStep } from '../../sillytavern/readiness'

interface SetupGuideProps {
  readiness: SetupReadiness
  onOpenCharacter: () => void
  onOpenPreset: () => void
  onOpenSettings: () => void
  onOpenLorebooks: () => void
  onStart: () => void
}

function Status({ step }: { step: SetupStep }) {
  const complete = step.status === 'complete'
  return (
    <span className={`setup-status ${step.status}`}>
      {complete ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : <WarningCircle size={16} weight="duotone" aria-hidden="true" />}
      {complete ? '已完成' : step.status === 'optional' ? '可选' : '待完成'}
    </span>
  )
}

export function SetupGuide({ readiness, onOpenCharacter, onOpenPreset, onOpenSettings, onOpenLorebooks, onStart }: SetupGuideProps) {
  return (
    <section className="setup-guide" aria-labelledby="setup-guide-title">
      <header className="setup-hero">
        <span className="setup-kicker">LOCAL CHARACTER CHAT</span>
        <h1 id="setup-guide-title">从一张角色卡开始</h1>
        <p>当前没有可用的聊天对象。你可以导入自己的角色与预设，或在本地数据设置中恢复内置的迷迭香会话。</p>
      </header>

      <ol className="setup-steps">
        <li className={readiness.steps.character.status === 'complete' ? 'complete' : ''}>
          <span className="setup-step-index">01</span>
          <span className="setup-step-icon"><IdentificationCard size={24} weight="duotone" aria-hidden="true" /></span>
          <div>
            <div className="setup-step-heading"><h2>导入聊天对象</h2><Status step={readiness.steps.character} /></div>
            <p>{readiness.steps.character.detail}</p>
            <button id="setup-open-character-library" type="button" onClick={onOpenCharacter}>导入角色卡<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </li>

        <li className={readiness.steps.preset.status === 'complete' && readiness.steps.primaryApi.status === 'complete' ? 'complete' : ''}>
          <span className="setup-step-index">02</span>
          <span className="setup-step-icon"><SlidersHorizontal size={24} weight="duotone" aria-hidden="true" /></span>
          <div>
            <div className="setup-step-heading"><h2>决定回复方式</h2><Status step={readiness.steps.preset.status === 'complete' ? readiness.steps.primaryApi : readiness.steps.preset} /></div>
            <p>{readiness.steps.preset.detail}；{readiness.steps.primaryApi.detail}。</p>
            <div className="setup-step-actions">
              <button id="setup-open-preset-library" type="button" onClick={onOpenPreset}>导入对话预设<ArrowRight size={17} aria-hidden="true" /></button>
              <button id="setup-open-api-settings" type="button" className="secondary" onClick={onOpenSettings}><PlugsConnected size={17} aria-hidden="true" />配置主次 API</button>
            </div>
          </div>
        </li>

        <li className={readiness.steps.worldbook.status === 'complete' && readiness.steps.secondaryApi.status === 'complete' ? 'complete' : ''}>
          <span className="setup-step-index">03</span>
          <span className="setup-step-icon"><BookOpenText size={24} weight="duotone" aria-hidden="true" /></span>
          <div>
            <div className="setup-step-heading"><h2>扩展世界与记忆</h2><Status step={readiness.steps.worldbook} /></div>
            <p>{readiness.steps.worldbook.detail}；{readiness.steps.secondaryApi.detail}。</p>
            <button id="setup-open-lorebook-library" type="button" onClick={onOpenLorebooks}>管理世界书<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </li>
      </ol>

      <footer className="setup-start">
        <div>
          <strong>{readiness.canStartChat ? '准备完成' : '还差一点'}</strong>
          <span>{readiness.canStartChat ? '创建一段只属于你的新对话。' : readiness.missingReasons[0]}</span>
        </div>
        <button id="setup-start-chat" type="button" disabled={!readiness.canStartChat} onClick={onStart}>开始新会话<ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
      </footer>
    </section>
  )
}
