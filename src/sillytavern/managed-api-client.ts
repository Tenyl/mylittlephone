import { MANAGED_CHAT_ENDPOINT, type ManagedChatRequest } from './managed-api'

export function callManagedChat(
  request: ManagedChatRequest,
  signal: AbortSignal,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Response> {
  return fetchImpl(MANAGED_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
}
