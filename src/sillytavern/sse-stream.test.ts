import { describe, expect, it } from 'vitest'
import { consumeOpenAiSse } from './sse-stream'

function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let index = 0
  return new Response(new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index++]))
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('OpenAI SSE consumer', () => {
  it('supports CRLF separators split across chunks and waits for DONE', async () => {
    const received: string[] = []
    const response = chunkedResponse([
      'data: {"choices":[{"delta":{"content":"你',
      '好"}}]}\r',
      '\n\r\ndata: [DONE]\r\n',
      '\r\n',
    ])

    await consumeOpenAiSse(response, new AbortController().signal, (content) => received.push(content))
    expect(received).toEqual(['你好'])
  })

  it('fails instead of accepting an upstream stream that closes before DONE', async () => {
    const response = chunkedResponse(['data: {"choices":[{"delta":{"content":"半截"}}]}\n\n'])

    await expect(consumeOpenAiSse(response, new AbortController().signal, () => undefined))
      .rejects.toThrow('响应流意外结束')
  })

  it('turns a stream-level error into a generic client error', async () => {
    const response = chunkedResponse([
      'data: {"error":"provider-secret-diagnostic"}\n\n',
      'data: [DONE]\n\n',
    ])

    await expect(consumeOpenAiSse(response, new AbortController().signal, () => undefined))
      .rejects.toThrow('聊天服务暂时不可用')
  })
})
