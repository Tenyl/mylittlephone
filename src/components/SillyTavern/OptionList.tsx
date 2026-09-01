import { ArrowRight } from '@phosphor-icons/react'

export function OptionList({ options, disabled, onPick, idPrefix = 'story-option' }: { options: string[]; disabled: boolean; onPick: (text: string) => void; idPrefix?: string }) {
  return (
    <div className="st-options" aria-label="可选回复">
      {options.map((option, index) => <button id={`${idPrefix}-${index + 1}`} key={`${index}-${option}`} type="button" disabled={disabled} onClick={() => onPick(option)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{option}</strong><ArrowRight size={16} aria-hidden="true" /></button>)}
    </div>
  )
}
