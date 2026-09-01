export class SseEventDecoder {
  private readonly decoder = new TextDecoder()
  private buffer = ''

  feed(chunk: Uint8Array): string[] {
    this.buffer += this.decoder.decode(chunk, { stream: true })
    return this.drain()
  }

  finish(): { events: string[]; incomplete: boolean } {
    this.buffer += this.decoder.decode()
    const events = this.drain()
    return { events, incomplete: this.buffer.trim().length > 0 }
  }

  private drain(): string[] {
    const events: string[] = []
    while (true) {
      const separator = /\r\n\r\n|\n\n|\r\r/.exec(this.buffer)
      if (!separator || separator.index === undefined) break
      const block = this.buffer.slice(0, separator.index)
      this.buffer = this.buffer.slice(separator.index + separator[0].length)
      const dataLines = block
        .split(/\r\n|\r|\n/)
        .filter((line) => line === 'data' || line.startsWith('data:'))
        .map((line) => line === 'data' ? '' : line.slice(5).replace(/^ /, ''))
      if (dataLines.length > 0) events.push(dataLines.join('\n'))
    }
    return events
  }
}

function contentFromEvent(data: string): { content?: string; done?: boolean; error?: boolean } {
  if (data.trim() === '[DONE]') return { done: true }
  try {
    const parsed = JSON.parse(data)
    if (parsed?.error) return { error: true }
    const content = parsed?.choices?.[0]?.delta?.content
    return typeof content === 'string' ? { content } : {}
  } catch {
    return { error: true }
  }
}

export async function consumeOpenAiSse(
  response: Response,
  signal: AbortSignal,
  onContent: (content: string) => void,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('聊天响应没有可读取内容')
  const parser = new SseEventDecoder()

  const consumeEvents = (events: string[]): boolean => {
    for (const event of events) {
      const parsed = contentFromEvent(event)
      if (parsed.error) throw new Error('聊天服务暂时不可用')
      if (parsed.content) onContent(parsed.content)
      if (parsed.done) return true
    }
    return false
  }

  while (true) {
    if (signal.aborted) {
      await reader.cancel()
      throw new DOMException('生成已停止', 'AbortError')
    }
    const { value, done } = await reader.read()
    if (done) break
    if (consumeEvents(parser.feed(value))) {
      await reader.cancel()
      return
    }
  }

  const tail = parser.finish()
  if (consumeEvents(tail.events)) return
  throw new Error(tail.incomplete ? '聊天响应格式不完整' : '响应流意外结束')
}

export function sanitizeOpenAiSseStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader()
  const parser = new SseEventDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const closeWithError = () => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '上游聊天服务暂时不可用' })}\n\n`))
        controller.close()
        closed = true
      }
      const forward = (events: string[]): boolean => {
        for (const event of events) {
          const parsed = contentFromEvent(event)
          if (parsed.error) {
            closeWithError()
            return true
          }
          if (parsed.content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: parsed.content } }] })}\n\n`))
          }
          if (parsed.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            closed = true
            return true
          }
        }
        return false
      }

      try {
        while (!closed) {
          const { value, done } = await reader.read()
          if (done) break
          if (forward(parser.feed(value))) {
            await reader.cancel()
            return
          }
        }
        if (closed) return
        const tail = parser.finish()
        if (forward(tail.events)) return
        closeWithError()
      } catch {
        closeWithError()
      }
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })
}
