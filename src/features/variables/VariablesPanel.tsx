import { BracketsCurly, FloppyDisk } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

interface VariablesPanelProps {
  variables: Record<string, unknown>
  disabled: boolean
  onSave: (variables: Record<string, unknown>) => void | Promise<void>
}

export function VariablesPanel({ variables, disabled, onSave }: VariablesPanelProps) {
  const [value, setValue] = useState(() => JSON.stringify(variables, null, 2))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setValue(JSON.stringify(variables, null, 2)), [variables])

  const save = async () => {
    try {
      const parsed: unknown = JSON.parse(value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('变量必须是 JSON 对象')
      await onSave(parsed as Record<string, unknown>)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '变量 JSON 无效')
    }
  }

  return (
    <div className="variables-panel">
      <section className="world-summary"><span><BracketsCurly size={24} weight="duotone" /></span><div><h3>会话变量</h3><p>模型输出的 `vars` 标签和内联 `var` 指令会自动合并，也可以在这里手动调整。</p></div></section>
      <label htmlFor="variables-json-editor">JSON 数据</label>
      <textarea id="variables-json-editor" value={value} rows={18} spellCheck={false} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? 'variables-json-error' : undefined} onChange={(event) => setValue(event.target.value)} />
      {error && <p id="variables-json-error" className="field-error" role="alert">{error}</p>}
      <button id="variables-save" className="panel-primary-action" type="button" disabled={disabled} onClick={() => void save()}><FloppyDisk size={18} />保存变量</button>
    </div>
  )
}
