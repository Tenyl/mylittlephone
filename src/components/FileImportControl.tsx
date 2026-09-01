import { FileArrowUp, SpinnerGap } from '@phosphor-icons/react'
import { useState, type DragEvent } from 'react'

interface FileImportControlProps {
  id: string
  label: string
  helper: string
  onRead: (text: string, fileName: string) => void
  onError: (message: string) => void
}

export function FileImportControl({ id, label, helper, onRead, onError }: FileImportControlProps) {
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)

  const read = async (file?: File) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) return onError('请选择扩展名为 .json 的文件。')
    setReading(true)
    try {
      onRead(await file.text(), file.name)
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
      <input id={id} type="file" accept="application/json,.json" onChange={(event) => void read(event.target.files?.[0])} />
      <span>{reading ? <SpinnerGap className="spin" size={22} /> : <FileArrowUp size={22} />}</span>
      <div><strong>{reading ? '正在读取文件…' : label}</strong><small>{helper}</small></div>
    </label>
  )
}
