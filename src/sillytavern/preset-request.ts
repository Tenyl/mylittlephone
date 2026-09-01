export type ChatGenerationOptions = Record<string, unknown>

function firstFiniteNumber(settings: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = settings[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

function firstNonEmptyString(settings: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = settings[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

/** Convert SillyTavern preset fields into an OpenAI-compatible chat request. */
export function buildPresetGenerationOptions(settings: Record<string, unknown>): ChatGenerationOptions {
  const options: ChatGenerationOptions = {}
  const numericMappings: Array<[target: string, sources: string[]]> = [
    ['temperature', ['temperature', 'temp_openai']],
    ['frequency_penalty', ['frequency_penalty', 'freq_pen_openai']],
    ['presence_penalty', ['presence_penalty', 'pres_pen_openai']],
    ['top_p', ['top_p', 'top_p_openai']],
    ['top_k', ['top_k', 'top_k_openai']],
    ['top_a', ['top_a', 'top_a_openai']],
    ['min_p', ['min_p', 'min_p_openai']],
    ['repetition_penalty', ['repetition_penalty', 'repetition_penalty_openai']],
  ]

  for (const [target, sources] of numericMappings) {
    const value = firstFiniteNumber(settings, sources)
    if (value !== undefined) options[target] = value
  }

  const maxTokens = firstFiniteNumber(settings, ['openai_max_tokens', 'max_tokens'])
  if (maxTokens !== undefined && maxTokens > 0) options.max_tokens = Math.floor(maxTokens)
  const maxCompletionTokens = firstFiniteNumber(settings, ['max_completion_tokens'])
  if (maxTokens === undefined && maxCompletionTokens !== undefined && maxCompletionTokens > 0) {
    options.max_completion_tokens = Math.floor(maxCompletionTokens)
  }

  const seed = firstFiniteNumber(settings, ['seed'])
  if (seed !== undefined && seed >= 0) options.seed = Math.floor(seed)
  const choiceCount = firstFiniteNumber(settings, ['n'])
  if (choiceCount !== undefined && choiceCount >= 1) options.n = Math.floor(choiceCount)

  const reasoningEffort = firstNonEmptyString(settings, ['reasoning_effort'])
  if (reasoningEffort && !['auto', 'disabled'].includes(reasoningEffort)) options.reasoning_effort = reasoningEffort
  const verbosity = firstNonEmptyString(settings, ['verbosity'])
  if (verbosity && verbosity !== 'auto') options.verbosity = verbosity

  const stop = settings.stop
  if (typeof stop === 'string' && stop.length > 0) options.stop = stop
  else if (Array.isArray(stop) && stop.every((value) => typeof value === 'string')) options.stop = stop

  if (typeof settings.logprobs === 'boolean') options.logprobs = settings.logprobs
  const topLogprobs = firstFiniteNumber(settings, ['top_logprobs'])
  if (topLogprobs !== undefined && topLogprobs >= 0) options.top_logprobs = Math.floor(topLogprobs)
  if (settings.logit_bias && typeof settings.logit_bias === 'object' && !Array.isArray(settings.logit_bias)) {
    options.logit_bias = settings.logit_bias
  }

  return options
}
