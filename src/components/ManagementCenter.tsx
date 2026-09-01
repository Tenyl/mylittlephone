import {
  ArrowLeft,
  BookOpenText,
  BracketsCurly,
  Database,
  GearSix,
  IdentificationCard,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import { useRef, type ReactNode } from 'react'
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap'

export type ManagementSection = 'home' | 'character' | 'worldbook' | 'presets' | 'variables' | 'settings'

interface ManagementCenterProps {
  section: ManagementSection
  onSelectSection: (section: ManagementSection) => void
  onClose: () => void
  children?: ReactNode
}

const sectionTitles: Record<ManagementSection, string> = {
  home: '管理中心',
  character: '角色卡库',
  worldbook: '世界书',
  presets: '对话预设',
  variables: '会话变量',
  settings: '系统设置',
}

const managementEntries = [
  { id: 'character', section: 'character' as const, label: '角色卡', helper: '导入、查看与切换聊天对象', icon: IdentificationCard },
  { id: 'worldbook', section: 'worldbook' as const, label: '世界书', helper: '管理背景资料与触发条目', icon: BookOpenText },
  { id: 'presets', section: 'presets' as const, label: '对话预设', helper: '调整提示词与生成参数', icon: SlidersHorizontal },
  { id: 'api', section: 'settings' as const, label: 'API 与设置', helper: '连接模型并配置回复方式', icon: GearSix },
  { id: 'variables', section: 'variables' as const, label: '会话变量', helper: '查看当前会话的运行数据', icon: BracketsCurly },
  { id: 'local-data', section: 'settings' as const, label: '本地数据', helper: '备份、导入或清理本机内容', icon: Database },
]

export function ManagementCenter({ section, onSelectSection, onClose, children }: ManagementCenterProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const title = sectionTitles[section]
  useDialogFocusTrap(dialogRef, closeRef, onClose)

  return createPortal(
    <div className="management-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className="management-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="management-center-title"
        tabIndex={-1}
      >
        <header className="management-header">
          <div className="management-heading">
            {section !== 'home' && (
              <button id="management-back-home" className="icon-button" type="button" aria-label="返回管理中心" onClick={() => onSelectSection('home')}>
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <span className="eyebrow">CHAT CONTROL</span>
              <h2 id="management-center-title">{title}</h2>
            </div>
          </div>
          <button ref={closeRef} id="management-center-close" className="icon-button" type="button" aria-label={`关闭${title}`} onClick={onClose}>
            <X size={21} />
          </button>
        </header>

        {section === 'home' ? (
          <div className="management-home">
            <p>聊天之外的配置都集中在这里。关闭后，界面只保留你和对方的消息。</p>
            <nav className="management-grid" aria-label="管理项目">
              {managementEntries.map(({ id, section: target, label, helper, icon: Icon }) => (
                <button id={`management-open-${id}`} key={id} type="button" onClick={() => onSelectSection(target)}>
                  <span className="management-entry-icon"><Icon size={22} weight="duotone" /></span>
                  <span><strong>{label}</strong><small>{helper}</small></span>
                </button>
              ))}
            </nav>
          </div>
        ) : (
          <div className="management-content">{children}</div>
        )}
      </section>
    </div>,
    document.body,
  )
}
