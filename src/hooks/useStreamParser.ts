import { useRef, useState, useCallback } from 'react';
import { StreamTagParser, type ParserEvent } from '../sillytavern/stream-parser';
import { aggregateEvents } from '../sillytavern/variables';
import type { ParsedTags } from '../sillytavern/types';

export interface StreamParserState {
  thinking: string;
  maintext: string;
  options: string[];
  sum: string;
  varsRaw: string;
  isStreaming: boolean;
}

const initialState: StreamParserState = {
  thinking: '', maintext: '', options: [], sum: '', varsRaw: '', isStreaming: false,
};

export function useStreamParser(tags: string[], opaqueTags: string[]) {
  const parserRef = useRef<StreamTagParser | null>(null);
  const eventBufRef = useRef<ParserEvent[]>([]);
  const [state, setState] = useState<StreamParserState>(initialState);
  const stateRef = useRef<StreamParserState>(initialState);

  const start = useCallback(() => {
    parserRef.current = new StreamTagParser(tags, opaqueTags);
    eventBufRef.current = [];
    stateRef.current = { ...initialState, isStreaming: true };
    setState(stateRef.current);
  }, [tags, opaqueTags]);

  const feed = useCallback((chunk: string): StreamParserState => {
    if (!parserRef.current) return stateRef.current;
    const events = parserRef.current.feed(chunk);
    eventBufRef.current.push(...events);
    stateRef.current = applyEvents(stateRef.current, events);
    setState(stateRef.current);
    return stateRef.current;
  }, []);

  const finish = useCallback((): { events: ParserEvent[]; parsed: ParsedTags } => {
    if (!parserRef.current) return { events: [], parsed: emptyParsed() };
    const tail = parserRef.current.finish();
    eventBufRef.current.push(...tail);
    stateRef.current = { ...applyEvents(stateRef.current, tail), isStreaming: false };
    setState(stateRef.current);
    const all = eventBufRef.current;
    return { events: all, parsed: aggregateEvents(all) };
  }, []);

  const reset = useCallback(() => {
    stateRef.current = initialState;
    setState(initialState);
  }, []);

  return { state, start, feed, finish, reset };
}

function applyEvents(prev: StreamParserState, events: ParserEvent[]): StreamParserState {
  let next = { ...prev };
  for (const ev of events) {
    if (ev.type === 'tag-chunk') {
      if (ev.tag === 'maintext') next.maintext += ev.chunk;
      else if (ev.tag === 'thinking' || ev.tag === 'think') next.thinking += ev.chunk;
      else if (ev.tag === 'sum') next.sum += ev.chunk;
      else if (ev.tag === 'vars') next.varsRaw += ev.chunk;
    } else if (ev.type === 'option-line') {
      next.options = [...next.options, ev.line];
    }
  }
  return next;
}

function emptyParsed(): ParsedTags {
  return {
    thinking: '', maintext: '', options: [], sum: '', varsRaw: '',
    varsCommands: { merge: {} }, unknown: {},
  };
}
