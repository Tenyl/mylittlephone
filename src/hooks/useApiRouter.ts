import { useCallback, useMemo, useRef } from 'react';
import { createApiRouter, type ApiRouter } from '../sillytavern/api-router';
import type { ApiSettings, ApiTarget, Task } from '../sillytavern/types';
import type { ChatGenerationOptions } from '../sillytavern/preset-request';

export interface SendStreamArgs {
  task: Task;
  messages: Array<{ role: string; content: string }>;
  generationOptions?: ChatGenerationOptions;
  onChunk: (text: string) => void;
}

export function useApiRouter(api: ApiSettings) {
  const abortRef = useRef<AbortController | null>(null);
  const router: ApiRouter = useMemo(() => createApiRouter(api), [api]);

  const sendStream = useCallback(async (args: SendStreamArgs): Promise<ApiTarget> => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { task, messages, generationOptions, onChunk } = args;
    const { response, targetUsed } = await router.call(task, {
      ...generationOptions,
      messages,
      stream: true,
      signal: abortRef.current.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      if (abortRef.current?.signal.aborted) {
        await reader.cancel();
        throw new DOMException('生成已停止', 'AbortError');
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        const lines = part.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return targetUsed;
          try {
            const json = JSON.parse(data);
            const delta: string = json?.choices?.[0]?.delta?.content ?? '';
            if (delta) onChunk(delta);
          } catch {
            // ignore bad line
          }
        }
      }
    }
    return targetUsed;
  }, [router]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { sendStream, abort, targetFor: router.targetFor };
}
