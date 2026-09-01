import { FileArrowUp, SpinnerGap } from '@phosphor-icons/react'
import { useState, type DragEvent } from 'react'

interface FileImportControlProps {
  id: string
  label: string
  helper: string
  accept?: string
  onRead?: (text: string, fileName: string) => void | Promise<void>
  onFile?: (file: File) => void | Promise<void>
  onError: (message: string) => void
}

export function FileImportControl({ id, label, helper, accept = 'application/json,.json', onRead, onFile, onError }: FileImportControlProps) {
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)

  const read = async (file?: File) => {
    if (!file) return
    setReading(true)
    try {
      if (onFile) {
        await onFile(file)
      } else if (onRead) {
        if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择扩展名为 .json 的文件。')
        await onRead(await file.text(), file.name)
      } else {
        throw new Error('导入控件尚未配置处理方式。')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : '文件读取失败，请重试。')
    } finally {
      setReading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void read(event.dataTransfer.files[0])
  }

  return (
    <label
      htmlFor={id}
      className={`import-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input id={id} type="file" accept={accept} onChange={(event) => void read(event.target.files?.[0])} />
      <span>{reading ? <SpinnerGap className="spin" size={22} /> : <FileArrowUp size={22} />}</span>
      <div><strong>{reading ? '正在读取文件…' : label}</strong><small>{helper}</small></div>
    </label>
  )
}
