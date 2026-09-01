import { useCallback, useMemo, useRef } from 'react';
import { createApiRouter, type ApiRouter } from '../sillytavern/api-router';
import { callManagedChat } from '../sillytavern/managed-api-client';
import type { ManagedChatRequest } from '../sillytavern/managed-api';
import type { ApiTarget, AppSettings, Task } from '../sillytavern/types';
import type { ChatGenerationOptions } from '../sillytavern/preset-request';
import { consumeOpenAiSse } from '../sillytavern/sse-stream';

interface StreamCallbacks {
  onChunk: (text: string) => void;
}

export interface CustomSendStreamArgs extends StreamCallbacks {
  mode: 'custom';
  task: Task;
  messages: Array<{ role: string; content: string }>;
  generationOptions?: ChatGenerationOptions;
}

export interface ManagedSendStreamArgs extends StreamCallbacks {
  mode: 'managed';
  request: ManagedChatRequest;
}

export type SendStreamArgs = CustomSendStreamArgs | ManagedSendStreamArgs;

export function useApiRouter(settings: Pick<AppSettings, 'api' | 'apiSource'>) {
  const abortRef = useRef<AbortController | null>(null);
  const router: ApiRouter = useMemo(() => createApiRouter(settings.api), [settings.api]);

  const sendStream = useCallback(async (args: SendStreamArgs): Promise<ApiTarget> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { onChunk } = args;
    const { response, targetUsed } = args.mode === 'managed'
      ? { response: await callManagedChat(args.request, controller.signal), targetUsed: 'primary' as const }
      : await router.call(args.task, {
          ...args.generationOptions,
          messages: args.messages,
          stream: true,
          signal: controller.signal,
        });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await consumeOpenAiSse(response, controller.signal, onChunk);
    return targetUsed;
  }, [router]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  const targetFor = useCallback((task: Task): ApiTarget => (
    settings.apiSource === 'managed' ? 'primary' : router.targetFor(task)
  ), [router, settings.apiSource]);

  return { sendStream, abort, targetFor };
}
