import { handleManagedChatRequest, type ManagedEnvironment } from '../src/server/managed-chat.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleManagedChatRequest(request, process.env as ManagedEnvironment)
  },
}
