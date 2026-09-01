import { Eye, EyeSlash, FloppyDisk, PlugsConnected, SlidersHorizontal, Trash, Wrench, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { fetchModels, testConnection } from '../../sillytavern/api-tools'
import { DEFAULT_FORMAT_PROMPT, type AppSettings } from '../../sillytavern/types'

type Tab = 'primary' | 'secondary' | 'game' | 'data'

interface SettingsPanelProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void | Promise<void>
  onNotice: (tone: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void
  onRequestClear: () => void
  onExport: () => void | Promise<void>
  onImport: (file: File) => void | Promise<void>
  initialTab?: Tab
}

export function SettingsPanel({ settings, onUpdate, onNotice, onRequestClear, onExport, onImport, initialTab = 'primary' }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [busy, setBusy] = useState<string | null>(null)
  const [primaryModels, setPrimaryModels] = useState<string[]>([])
  const [secondaryModels, setSecondaryModels] = useState<string[]>([])
  const [showPrimaryKey, setShowPrimaryKey] = useState(false)
  const [showSecondaryKey, setShowSecondaryKey] = useState(false)
  const [newTag, setNewTag] = useState('')
  const secondary = settings.api.secondary ?? { enabled: true, baseUrl: '', apiKey: '', model: '', temperature: 0.7, maxTokens: 8000 }

  const updateApi = (patch: Partial<AppSettings['api']>) => onUpdate({ api: { ...settings.api, ...patch } })
  const updateSecondary = (patch: Partial<typeof secondary>) => updateApi({ secondary: { ...secondary, ...patch } })

  const loadModels = async (target: 'primary' | 'secondary') => {
    setBusy(`models-${target}`)
    try {
      const config = target === 'primary' ? settings.api : secondary
      const result = await fetchModels(config)
      if (target === 'primary') setPrimaryModels(result.models)
      else setSecondaryModels(result.models)
      onNotice(result.source === 'remote' ? 'success' : 'warning', result.source === 'remote' ? '模型列表已更新' : '正在使用常用模型列表', result.error ? `远端获取失败：${result.error}` : `发现 ${result.models.length} 个模型。`)
    } finally { setBusy(null) }
  }

  const checkConnection = async (target: 'primary' | 'secondary') => {
    setBusy(`test-${target}`)
    try {
      const config = target === 'primary' ? settings.api : secondary
      const result = await testConnection(config)
      if (result.ok) onNotice('success', `${target === 'primary' ? '主' : '次'} API 连接正常`, '测试请求已成功返回。')
      else onNotice('error', '连接测试失败', result.status ? `HTTP ${result.status}：${result.errorBody || '服务未返回错误说明'}` : result.error || '请检查地址、密钥、模型与浏览器 CORS 设置。')
    } finally { setBusy(null) }
  }

  return (
    <div className="settings-panel">
      <nav className="settings-tabs" aria-label="设置分类">
        {([['primary', '主 API'], ['secondary', '次 API'], ['game', '游戏显示'], ['data', '本地数据']] as const).map(([id, label]) => <button id={`settings-tab-${id}`} key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'primary' && (
        <section className="settings-section" aria-labelledby="primary-api-heading">
          <div className="settings-heading"><span><PlugsConnected size={22} /></span><div><h3 id="primary-api-heading">主 API</h3><p>负责角色回复与剧情正文，必须完整配置后才能开始聊天。</p></div></div>
          <label htmlFor="primary-api-base-url">Base URL</label><input id="primary-api-base-url" value={settings.api.baseUrl} onChange={(event) => void updateApi({ baseUrl: event.target.value })} autoComplete="url" />
          <label htmlFor="primary-api-key">API Key</label><div className="password-field"><input id="primary-api-key" type={showPrimaryKey ? 'text' : 'password'} value={settings.api.apiKey} onChange={(event) => void updateApi({ apiKey: event.target.value })} autoComplete="off" /><button id="primary-api-key-visibility" type="button" aria-label={showPrimaryKey ? '隐藏主 API 密钥' : '显示主 API 密钥'} aria-pressed={showPrimaryKey} onClick={() => setShowPrimaryKey((value) => !value)}>{showPrimaryKey ? <EyeSlash size={18} /> : <Eye size={18} />}</button></div>
          <label htmlFor="primary-api-model">模型</label><input id="primary-api-model" list="primary-model-options" value={settings.api.model} onChange={(event) => void updateApi({ model: event.target.value })} /><datalist id="primary-model-options">{primaryModels.map((model) => <option key={model} value={model} />)}</datalist>
          <p className="field-helper">密钥只保存在当前浏览器；请求会直接发送到此端点。</p>
          <div className="settings-actions"><button id="primary-fetch-models" type="button" disabled={Boolean(busy)} onClick={() => void loadModels('primary')}>{busy === 'models-primary' ? '获取中…' : '获取模型'}</button><button id="primary-test-connection" className="primary" type="button" disabled={Boolean(busy)} onClick={() => void checkConnection('primary')}>{busy === 'test-primary' ? '测试中…' : '测试连接'}</button></div>
        </section>
      )}

      {tab === 'secondary' && (
        <section className="settings-section" aria-labelledby="secondary-api-heading">
          <div className="settings-heading"><span><Wrench size={22} /></span><div><h3 id="secondary-api-heading">次 API</h3><p>用于变量与总结任务；失败时自动回退到主 API。</p></div></div>
          <label className="toggle-row"><span><strong>启用双 API</strong><small>主模型负责叙事，次模型处理结构化任务。</small></span><input id="secondary-api-enabled" type="checkbox" checked={settings.apiMode === 'dual'} onChange={(event) => void onUpdate({ apiMode: event.target.checked ? 'dual' : 'single' })} /></label>
          <label htmlFor="secondary-api-base-url">Base URL</label><input id="secondary-api-base-url" value={secondary.baseUrl} onChange={(event) => void updateSecondary({ baseUrl: event.target.value, enabled: true })} />
          <label htmlFor="secondary-api-key">API Key</label><div className="password-field"><input id="secondary-api-key" type={showSecondaryKey ? 'text' : 'password'} value={secondary.apiKey} onChange={(event) => void updateSecondary({ apiKey: event.target.value, enabled: true })} autoComplete="off" /><button id="secondary-api-key-visibility" type="button" aria-label={showSecondaryKey ? '隐藏次 API 密钥' : '显示次 API 密钥'} aria-pressed={showSecondaryKey} onClick={() => setShowSecondaryKey((value) => !value)}>{showSecondaryKey ? <EyeSlash size={18} /> : <Eye size={18} />}</button></div>
          <label htmlFor="secondary-api-model">模型</label><input id="secondary-api-model" list="secondary-model-options" value={secondary.model} onChange={(event) => void updateSecondary({ model: event.target.value, enabled: true })} /><datalist id="secondary-model-options">{secondaryModels.map((model) => <option key={model} value={model} />)}</datalist>
          <div className="settings-field-pair"><label htmlFor="secondary-api-temperature">次 API 温度<input id="secondary-api-temperature" type="number" min="0" max="2" step="0.01" value={secondary.temperature ?? 0.7} onChange={(event) => void updateSecondary({ temperature: Math.min(2, Math.max(0, Number(event.target.value) || 0)), enabled: true })} /></label><label htmlFor="secondary-api-max-tokens">次 API 最大输出 Token<input id="secondary-api-max-tokens" type="number" min="1" step="1" value={secondary.maxTokens ?? 8000} onChange={(event) => void updateSecondary({ maxTokens: Math.max(1, Number(event.target.value) || 1), enabled: true })} /></label></div>
          <div className="settings-actions"><button id="secondary-fetch-models" type="button" disabled={Boolean(busy)} onClick={() => void loadModels('secondary')}>{busy === 'models-secondary' ? '获取中…' : '获取模型'}</button><button id="secondary-test-connection" className="primary" type="button" disabled={Boolean(busy)} onClick={() => void checkConnection('secondary')}>{busy === 'test-secondary' ? '测试中…' : '测试连接'}</button></div>
        </section>
      )}

      {tab === 'game' && (
        <section className="settings-section" aria-labelledby="game-settings-heading">
          <div className="settings-heading"><span><SlidersHorizontal size={22} /></span><div><h3 id="game-settings-heading">回复格式与标签</h3><p>聊天窗口只展示最终回复；总结与变量仅用于会话内部状态。</p></div></div>
          <label htmlFor="user-display-name">玩家名称</label><input id="user-display-name" value={settings.userName} onChange={(event) => void onUpdate({ userName: event.target.value })} />
          <fieldset><legend>解析标签</legend><div className="tag-editor">{settings.customTags.map((tag) => <span key={tag}>{tag}<button id={`remove-custom-tag-${tag}`} type="button" aria-label={`删除标签${tag}`} onClick={() => void onUpdate({ customTags: settings.customTags.filter((item) => item !== tag) })}><X size={13} weight="bold" /></button></span>)}</div><div className="tag-add"><label className="sr-only" htmlFor="new-custom-tag">新标签名</label><input id="new-custom-tag" value={newTag} onChange={(event) => setNewTag(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} /><button id="add-custom-tag" type="button" disabled={!newTag || settings.customTags.includes(newTag)} onClick={() => { void onUpdate({ customTags: [...settings.customTags, newTag] }); setNewTag('') }}>添加标签</button></div></fieldset>
          <label htmlFor="format-prompt-template">格式提示词</label><textarea id="format-prompt-template" value={settings.formatPromptTemplate} rows={12} onChange={(event) => void onUpdate({ formatPromptTemplate: event.target.value })} />
          <button id="restore-format-prompt" className="secondary-action" type="button" onClick={() => void onUpdate({ formatPromptTemplate: DEFAULT_FORMAT_PROMPT })}><FloppyDisk size={17} />恢复沉浸聊天默认格式</button>
          <div className="schema-notice"><strong>Schema-first 状态系统</strong><span>当前技能版本保留此能力但不启用。</span></div>
        </section>
      )}

      {tab === 'data' && (
        <section className="settings-section data-settings" aria-labelledby="data-settings-heading">
          <div className="settings-heading"><span><FloppyDisk size={22} /></span><div><h3 id="data-settings-heading">本地数据</h3><p>角色、世界书、预设和聊天全部保存在此浏览器的 IndexedDB。</p></div></div>
          <button id="settings-export-backup" type="button" onClick={() => void onExport()}><FloppyDisk size={18} /><span><strong>导出安全备份</strong><small>不会包含主次 API 密钥</small></span></button>
          <label className="data-import" htmlFor="settings-import-backup"><input id="settings-import-backup" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file) }} /><FloppyDisk size={18} /><span><strong>导入完整备份</strong><small>覆盖前会显示影响范围</small></span></label>
          <button id="settings-clear-all" className="danger-action" type="button" onClick={onRequestClear}><Trash size={18} /><span><strong>清除自定义本地数据</strong><small>删除现有内容后恢复内置角色、预设与初始会话</small></span></button>
        </section>
      )}
    </div>
  )
}
