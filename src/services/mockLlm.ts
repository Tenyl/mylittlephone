import type { CharacterCard, Preset } from '../domain/types'

export interface StreamReplyInput {
  character: CharacterCard
  preset: Preset
  userMessage: string
  signal?: AbortSignal
  delayMs?: number
}

const wait = (delayMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, delayMs))

function composeReply({ character, preset, userMessage }: StreamReplyInput): string {
  const mentionsRain = /雨|天气|伞/.test(userMessage)
  if (preset.id === 'story') {
    return mentionsRain
      ? `雨还会下一阵。刚才有人把一把没有名字的黑伞留在书店门口，伞柄上却刻着我的姓。你要是愿意过来，我们可以一起看看是谁留下的。`
      : `我刚听见二楼传来书页翻动的声音，但店里明明只剩我一个人。先别笑——我准备上去看看，你要继续陪我说话吗？`
  }
  if (preset.id === 'immersive') {
    return mentionsRain
      ? `我抬头看了一眼窗外，雨线把对面的路灯切得很碎。还会下一阵，不过七号电车应该照常来。你要出门的话，记得带那把深色伞。`
      : `我在。书店里很安静，能听见雨敲在二楼窗沿上。你慢慢说，我今晚不急着走。`
  }
  return mentionsRain
    ? `会，至少还要下一小时。你如果准备出门，别拿那把总是漏雨的透明伞。`
    : `${character.name}没有走开。我在听，你可以慢一点说。`
}

function chunkText(text: string): string[] {
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += 4) chunks.push(text.slice(index, index + 4))
  return chunks
}

export async function* streamReply(input: StreamReplyInput): AsyncGenerator<string> {
  const chunks = chunkText(composeReply(input))
  for (const chunk of chunks) {
    if (input.signal?.aborted) return
    if ((input.delayMs ?? 42) > 0) await wait(input.delayMs ?? 42)
    if (input.signal?.aborted) return
    yield chunk
  }
}
