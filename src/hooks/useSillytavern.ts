import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApiRouter } from './useApiRouter';
import { useStreamParser } from './useStreamParser';
import {
  DEFAULT_OPAQUE_TAGS,
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
  createDefaultPreset,
  type AppSettings,
  type CharacterCard,
  type ChatMessage,
  type ChatPreset,
  type ChatSession,
  type Lorebook,
  type ParsedTags,
} from '../sillytavern/types';
import {
  clearAllData,
  deleteCharacter as deleteCharacterDb,
  deleteChat as deleteChatDb,
  deleteLorebook as deleteLorebookDb,
  deletePreset as deletePresetDb,
  getCharacters,
  getChats,
  getEmptyFirstSettings,
  getLorebooks,
  getPresets,
  getSettings,
  initializeDatabase,
  saveCharacter,
  saveChat,
  saveLorebook,
  savePreset,
  saveSettings,
} from '../sillytavern/database';
import { createDefaultLorebook } from '../sillytavern/editor-utils';
import { importCharacterFile } from '../sillytavern/character-importer';
import { assemblePrompt, replaceMacros } from '../sillytavern/prompt-assembler';
import { getSetupReadiness } from '../sillytavern/readiness';
import { applyParsedToChat, extractVariables, mergeVariables } from '../sillytavern/variables';
import { removeLegacyDemoState } from '../sillytavern/legacy-cleanup';

type ControllerStatus = 'loading' | 'ready' | 'error';
type GenerationStatus = 'idle' | 'streaming' | 'error';

function id(prefix: string): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeStoredSettings(stored?: AppSettings): AppSettings {
  const empty = getEmptyFirstSettings();
  if (!stored) return empty;
  return {
    ...empty,
    ...stored,
    key: 'settings',
    api: {
      ...empty.api,
      ...stored.api,
      secondary: stored.api.secondary
        ? { ...empty.api.secondary, ...stored.api.secondary }
        : empty.api.secondary,
    },
    activeLorebookIds: [...(stored.activeLorebookIds ?? [])],
    customTags: [...(stored.customTags ?? DEFAULT_TAGS)],
    schemaFirst: false,
  };
}

function visibleFallback(raw: string): string {
  return raw
    .replace(/<(thinking|think)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(option|sum|vars)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?maintext>/gi, '')
    .trim();
}

function restoredVariables(messages: ChatMessage[], fallback: Record<string, unknown>): Record<string, unknown> {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const snapshot = messages[index].variablesAfter;
    if (snapshot) return structuredClone(snapshot);
  }
  return structuredClone(fallback);
}

export function useSillytavern() {
  const [status, setStatus] = useState<ControllerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [generation, setGeneration] = useState<{ status: GenerationStatus; messageId: string | null; error: string | null }>({ status: 'idle', messageId: null, error: null });

  const [showSettings, setShowSettings] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === settings?.activeCharacterId) ?? null,
    [characters, settings?.activeCharacterId],
  );
  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === settings?.activePresetId) ?? null,
    [presets, settings?.activePresetId],
  );
  const activeLorebooks = useMemo(() => {
    const ids = new Set(settings?.activeLorebookIds ?? []);
    return lorebooks.filter((book) => ids.has(book.id));
  }, [lorebooks, settings?.activeLorebookIds]);
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === settings?.activeChatId) ?? null,
    [chats, settings?.activeChatId],
  );
  const readiness = useMemo(
    () => getSetupReadiness({
      character: activeCharacter,
      preset: activePreset,
      lorebookCount: activeLorebooks.length,
      hasActiveChat: Boolean(activeChat),
      settings: settings ?? DEFAULT_SETTINGS,
    }),
    [activeCharacter, activePreset, activeLorebooks.length, activeChat, settings],
  );

  const parser = useStreamParser(settings?.customTags ?? [...DEFAULT_TAGS], [...DEFAULT_OPAQUE_TAGS]);
  const router = useApiRouter(settings?.api ?? DEFAULT_SETTINGS.api);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (typeof window !== 'undefined') removeLegacyDemoState(window.localStorage);
        await initializeDatabase();
        const [loadedCharacters, loadedLorebooks, loadedPresets, storedSettings, loadedChats] = await Promise.all([
          getCharacters(), getLorebooks(), getPresets(), getSettings(), getChats(),
        ]);
        if (cancelled) return;
        const nextSettings = mergeStoredSettings(storedSettings);
        if (!loadedCharacters.some((item) => item.id === nextSettings.activeCharacterId)) nextSettings.activeCharacterId = null;
        if (!loadedPresets.some((item) => item.id === nextSettings.activePresetId)) nextSettings.activePresetId = null;
        nextSettings.activeLorebookIds = nextSettings.activeLorebookIds.filter((bookId) => loadedLorebooks.some((item) => item.id === bookId));
        if (!loadedChats.some((item) => item.id === nextSettings.activeChatId)) nextSettings.activeChatId = null;
        await saveSettings(nextSettings);
        setCharacters(loadedCharacters);
        setLorebooks(loadedLorebooks);
        setPresets(loadedPresets);
        setChats(loadedChats.sort((a, b) => b.updatedAt - a.updatedAt));
        setSettings(nextSettings);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : '本地数据初始化失败');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      router.abort();
    };
    // Boot is deliberately one-shot; API routing changes must not reload IndexedDB.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadData = useCallback(async () => {
    setStatus('loading');
    await initializeDatabase();
    const [loadedCharacters, loadedLorebooks, loadedPresets, storedSettings, loadedChats] = await Promise.all([
      getCharacters(), getLorebooks(), getPresets(), getSettings(), getChats(),
    ]);
    const nextSettings = mergeStoredSettings(storedSettings);
    if (!loadedCharacters.some((item) => item.id === nextSettings.activeCharacterId)) nextSettings.activeCharacterId = null;
    if (!loadedPresets.some((item) => item.id === nextSettings.activePresetId)) nextSettings.activePresetId = null;
    nextSettings.activeLorebookIds = nextSettings.activeLorebookIds.filter((bookId) => loadedLorebooks.some((item) => item.id === bookId));
    if (!loadedChats.some((item) => item.id === nextSettings.activeChatId)) nextSettings.activeChatId = null;
    await saveSettings(nextSettings);
    setCharacters(loadedCharacters);
    setLorebooks(loadedLorebooks);
    setPresets(loadedPresets);
    setChats(loadedChats.sort((a, b) => b.updatedAt - a.updatedAt));
    setSettings(nextSettings);
    setError(null);
    setStatus('ready');
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = mergeStoredSettings({ ...settings, ...patch });
    await saveSettings(next);
    setSettings(next);
  }, [settings]);

  const addCharacter = useCallback(async (character: CharacterCard) => {
    await saveCharacter(character);
    setCharacters((current) => [character, ...current.filter((item) => item.id !== character.id)]);
    if (settings) {
      const next = { ...settings, activeCharacterId: character.id, activeChatId: null, characterName: character.name };
      await saveSettings(next);
      setSettings(next);
    }
    return character;
  }, [settings]);

  const importCharacter = useCallback(async (file: File) => addCharacter(await importCharacterFile(file)), [addCharacter]);

  const selectCharacter = useCallback(async (characterId: string) => {
    const character = characters.find((item) => item.id === characterId);
    if (!settings || !character) return;
    const next = { ...settings, activeCharacterId: character.id, activeChatId: null, characterName: character.name };
    await saveSettings(next);
    setSettings(next);
  }, [characters, settings]);

  const deleteCharacter = useCallback(async (characterId: string) => {
    await deleteCharacterDb(characterId);
    setCharacters((current) => current.filter((item) => item.id !== characterId));
    if (settings?.activeCharacterId === characterId) {
      const next = { ...settings, activeCharacterId: null, activeChatId: null, characterName: '' };
      await saveSettings(next);
      setSettings(next);
    }
  }, [settings]);

  const addPreset = useCallback(async (preset: ChatPreset) => {
    await savePreset(preset);
    setPresets((current) => [preset, ...current.filter((item) => item.id !== preset.id)]);
    if (settings) {
      const next = { ...settings, activePresetId: preset.id };
      await saveSettings(next);
      setSettings(next);
    }
    return preset;
  }, [settings]);

  const selectPreset = useCallback(async (presetId: string) => {
    if (!settings || !presets.some((item) => item.id === presetId)) return;
    const next = { ...settings, activePresetId: presetId };
    await saveSettings(next);
    setSettings(next);
  }, [presets, settings]);

  const updatePreset = useCallback(async (preset: ChatPreset) => {
    const next = { ...preset, updatedAt: Date.now() };
    await savePreset(next);
    setPresets((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const deletePreset = useCallback(async (presetId: string) => {
    await deletePresetDb(presetId);
    setPresets((current) => current.filter((item) => item.id !== presetId));
    if (settings?.activePresetId === presetId) {
      const next = { ...settings, activePresetId: null, activeChatId: null };
      await saveSettings(next);
      setSettings(next);
    }
  }, [settings]);

  const addPresetFromDefault = useCallback(async (name: string) => {
    const now = Date.now();
    return addPreset({ ...createDefaultPreset(), id: id('preset'), name, createdAt: now, updatedAt: now });
  }, [addPreset]);

  const addLorebook = useCallback(async (book: Lorebook) => {
    await saveLorebook(book);
    setLorebooks((current) => [book, ...current.filter((item) => item.id !== book.id)]);
    if (settings && !settings.activeLorebookIds.includes(book.id)) {
      const next = { ...settings, activeLorebookIds: [...settings.activeLorebookIds, book.id] };
      await saveSettings(next);
      setSettings(next);
    }
    return book;
  }, [settings]);

  const updateLorebook = useCallback(async (book: Lorebook) => {
    const next = { ...book, updatedAt: Date.now() };
    await saveLorebook(next);
    setLorebooks((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const deleteLorebook = useCallback(async (bookId: string) => {
    await deleteLorebookDb(bookId);
    setLorebooks((current) => current.filter((item) => item.id !== bookId));
    if (settings?.activeLorebookIds.includes(bookId)) {
      const next = { ...settings, activeLorebookIds: settings.activeLorebookIds.filter((idValue) => idValue !== bookId) };
      await saveSettings(next);
      setSettings(next);
    }
  }, [settings]);

  const addLorebookFromDefault = useCallback((name: string) => addLorebook(createDefaultLorebook(name)), [addLorebook]);

  const toggleLorebook = useCallback(async (bookId: string) => {
    if (!settings || !lorebooks.some((book) => book.id === bookId)) return;
    const ids = new Set(settings.activeLorebookIds);
    if (ids.has(bookId)) ids.delete(bookId);
    else ids.add(bookId);
    const next = { ...settings, activeLorebookIds: [...ids] };
    await saveSettings(next);
    setSettings(next);
  }, [lorebooks, settings]);

  const createChat = useCallback(async (name?: string, options?: { presetId?: string; lorebookIds?: string[] }) => {
    if (!settings || !activeCharacter || !activePreset || !readiness.canStartChat) {
      throw new Error(readiness.missingReasons[0] ?? '尚未完成聊天准备');
    }
    const now = Date.now();
    const firstMessage: ChatMessage[] = activeCharacter.firstMes ? [{
      id: id('message'),
      role: 'assistant',
      content: replaceMacros(activeCharacter.firstMes, { userName: settings.userName, characterName: activeCharacter.name, userInput: '' }),
      timestamp: now,
      status: 'sent',
    }] : [];
    const chat: ChatSession = {
      id: id('chat'),
      name: name?.trim() || `与 ${activeCharacter.name} 的聊天`,
      messages: firstMessage,
      characterId: activeCharacter.id,
      characterName: activeCharacter.name,
      userName: settings.userName,
      presetId: options?.presetId ?? activePreset.id,
      lorebookIds: options?.lorebookIds ?? settings.activeLorebookIds,
      variables: {},
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(chat);
    const nextSettings = { ...settings, activeChatId: chat.id };
    await saveSettings(nextSettings);
    setChats((current) => [chat, ...current]);
    setSettings(nextSettings);
    return chat.id;
  }, [activeCharacter, activePreset, readiness, settings]);

  const selectChat = useCallback(async (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!settings || !chat) return;
    const character = characters.find((item) => item.id === chat.characterId);
    const next = {
      ...settings,
      activeChatId: chat.id,
      activeCharacterId: chat.characterId ?? settings.activeCharacterId,
      activePresetId: chat.presetId,
      activeLorebookIds: [...chat.lorebookIds],
      characterName: character?.name ?? chat.characterName,
    };
    await saveSettings(next);
    setSettings(next);
  }, [characters, chats, settings]);

  const renameChat = useCallback(async (chatId: string, name: string) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat || !name.trim()) return;
    const next = { ...chat, name: name.trim(), updatedAt: Date.now() };
    await saveChat(next);
    setChats((current) => current.map((item) => item.id === chatId ? next : item));
  }, [chats]);

  const removeChat = useCallback(async (chatId: string) => {
    await deleteChatDb(chatId);
    const remaining = chats.filter((item) => item.id !== chatId);
    setChats(remaining);
    if (settings?.activeChatId === chatId) {
      const next = { ...settings, activeChatId: remaining[0]?.id ?? null };
      await saveSettings(next);
      setSettings(next);
    }
  }, [chats, settings]);

  const replaceChat = useCallback(async (chat: ChatSession) => {
    await saveChat(chat);
    setChats((current) => current.map((item) => item.id === chat.id ? chat : item));
  }, []);

  const sendMessage = useCallback(async (content: string, role: ChatMessage['role'] = 'user') => {
    if (!activeChat || !content.trim()) return false;
    const next: ChatSession = {
      ...activeChat,
      messages: [...activeChat.messages, { id: id('message'), role, content: content.trim(), timestamp: Date.now(), status: 'sent' }],
      updatedAt: Date.now(),
    };
    await replaceChat(next);
    return true;
  }, [activeChat, replaceChat]);

  const sendGameMessage = useCallback(async (userText: string, sourceChat?: ChatSession) => {
    const baseChat = sourceChat ?? activeChat;
    const trimmed = userText.trim();
    if (!baseChat || !trimmed || !settings || !activeCharacter || !activePreset || generation.status === 'streaming') return false;
    const currentReadiness = getSetupReadiness({ character: activeCharacter, preset: activePreset, lorebookCount: activeLorebooks.length, hasActiveChat: true, settings });
    if (!currentReadiness.canSend) throw new Error(currentReadiness.missingReasons[0] ?? '尚未完成聊天准备');

    const startedAt = Date.now();
    const userMessage: ChatMessage = { id: id('message'), role: 'user', content: trimmed, timestamp: startedAt, status: 'sent' };
    const assistantId = id('message');
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: startedAt, status: 'streaming' };
    const userOnlyChat: ChatSession = { ...baseChat, messages: [...baseChat.messages, userMessage], updatedAt: startedAt };
    let workingChat: ChatSession = { ...userOnlyChat, messages: [...userOnlyChat.messages, assistantMessage] };
    await replaceChat(userOnlyChat);
    setChats((current) => current.map((chat) => chat.id === workingChat.id ? workingChat : chat));
    setGeneration({ status: 'streaming', messageId: assistantId, error: null });

    const assembled = assemblePrompt({
      userInput: trimmed,
      history: baseChat.messages,
      preset: activePreset,
      lorebooks: lorebooks.filter((book) => baseChat.lorebookIds.includes(book.id)),
      userName: settings.userName,
      characterName: activeCharacter.name,
      character: activeCharacter,
      extraVariables: baseChat.variables,
      formatPrompt: settings.formatPromptTemplate,
    });

    let raw = '';
    parser.start();
    try {
      const apiUsed = await router.sendStream({
        task: 'story',
        messages: assembled.messages,
        onChunk: (delta) => {
          raw += delta;
          parser.feed(delta);
        },
      });
      const { parsed } = parser.finish();
      const { cleanedText, updates } = extractVariables(parsed.maintext || visibleFallback(raw));
      const fromTaggedVars = applyParsedToChat(baseChat.variables ?? {}, parsed).nextVariables;
      const nextVariables = mergeVariables(fromTaggedVars, updates);
      const visibleParsed: ParsedTags = {
        ...parsed,
        thinking: '',
        maintext: cleanedText,
        options: [],
        varsRaw: '',
        varsCommands: { merge: {} },
        unknown: {},
      };
      const finalAssistant: ChatMessage = {
        ...assistantMessage,
        content: cleanedText,
        status: 'sent',
        parsed: visibleParsed,
        variablesAfter: structuredClone(nextVariables),
        apiUsed,
        metadata: {
          summary: parsed.sum,
          lorebookEntries: assembled.matchedEntries.map((entry) => entry.entry.id),
          processingTime: Date.now() - startedAt,
        },
      };
      workingChat = { ...workingChat, messages: workingChat.messages.map((message) => message.id === assistantId ? finalAssistant : message), variables: nextVariables, updatedAt: Date.now() };
      await replaceChat(workingChat);
      setGeneration({ status: 'idle', messageId: null, error: null });
      return true;
    } catch (cause) {
      const aborted = cause instanceof DOMException && cause.name === 'AbortError';
      const message = cause instanceof Error ? cause.message : '回复生成失败';
      parser.finish();
      await replaceChat({ ...userOnlyChat, updatedAt: Date.now() });
      setGeneration({ status: aborted ? 'idle' : 'error', messageId: null, error: aborted ? null : message });
      if (!aborted) showToast(`回复生成失败：${message}`);
      return false;
    }
  }, [activeCharacter, activeChat, activeLorebooks.length, activePreset, generation.status, lorebooks, parser, replaceChat, router, settings, showToast]);

  const stopGeneration = useCallback(() => router.abort(), [router]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!activeChat) return;
    await replaceChat({ ...activeChat, messages: activeChat.messages.filter((message) => message.id !== messageId), updatedAt: Date.now() });
  }, [activeChat, replaceChat]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!activeChat || !newContent.trim()) return;
    await replaceChat({ ...activeChat, messages: activeChat.messages.map((message) => message.id === messageId ? { ...message, content: newContent.trim() } : message), updatedAt: Date.now() });
  }, [activeChat, replaceChat]);

  const deleteFromMessage = useCallback(async (messageId: string, includeMessage = true) => {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    const messages = activeChat.messages.slice(0, includeMessage ? index : index + 1);
    await replaceChat({ ...activeChat, messages, variables: restoredVariables(messages, {}), updatedAt: Date.now() });
  }, [activeChat, replaceChat]);

  const rollbackTo = useCallback((messageId: string) => deleteFromMessage(messageId, false), [deleteFromMessage]);
  const jumpToFloor = rollbackTo;

  const editAndRegenerate = useCallback(async (messageId: string, content: string) => {
    if (!activeChat || !content.trim()) return false;
    const index = activeChat.messages.findIndex((message) => message.id === messageId && message.role === 'user');
    if (index < 0) return false;
    const base = { ...activeChat, messages: activeChat.messages.slice(0, index), updatedAt: Date.now() };
    await replaceChat(base);
    return sendGameMessage(content.trim(), base);
  }, [activeChat, replaceChat, sendGameMessage]);

  const regenerateLast = useCallback(async () => {
    if (!activeChat) return false;
    const index = activeChat.messages.findLastIndex((message) => message.role === 'user');
    if (index < 0) return false;
    const content = activeChat.messages[index].content;
    const base = { ...activeChat, messages: activeChat.messages.slice(0, index), updatedAt: Date.now() };
    await replaceChat(base);
    return sendGameMessage(content, base);
  }, [activeChat, replaceChat, sendGameMessage]);

  const branchFromMessage = useCallback(async (messageId: string, name: string) => {
    if (!activeChat || !settings) return null;
    const index = activeChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) return null;
    const now = Date.now();
    const messages = activeChat.messages.slice(0, index + 1).map((message) => ({ ...message }));
    const branch: ChatSession = {
      ...activeChat,
      id: id('chat'),
      name: name.trim() || `${activeChat.name} · 分支`,
      messages,
      variables: restoredVariables(messages, activeChat.variables),
      parentChatId: activeChat.id,
      branchedFromMessageId: messageId,
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(branch);
    const nextSettings = { ...settings, activeChatId: branch.id };
    await saveSettings(nextSettings);
    setChats((current) => [branch, ...current]);
    setSettings(nextSettings);
    return branch.id;
  }, [activeChat, settings]);

  const setChatVariables = useCallback(async (variables: Record<string, unknown>) => {
    if (!activeChat) return;
    await replaceChat({ ...activeChat, variables, updatedAt: Date.now() });
  }, [activeChat, replaceChat]);

  const resetAllData = useCallback(async () => {
    router.abort();
    await clearAllData();
    await initializeDatabase();
    const nextSettings = getEmptyFirstSettings();
    setCharacters([]);
    setLorebooks([]);
    setPresets([]);
    setChats([]);
    setSettings(nextSettings);
    setGeneration({ status: 'idle', messageId: null, error: null });
  }, [router]);

  return {
    status, error, initialized: status !== 'loading', settings,
    characters, presets, lorebooks, chats,
    activeCharacter, activePreset, activeLorebooks, activeChat, readiness, generation,
    streamState: parser.state,
    updateSettings,
    addCharacter, importCharacter, selectCharacter, deleteCharacter,
    addPreset, selectPreset, updatePreset, deletePreset, addPresetFromDefault,
    addLorebook, toggleLorebook, updateLorebook, deleteLorebook, addLorebookFromDefault,
    createChat, selectChat, renameChat, removeChat,
    sendMessage, sendGameMessage, stopGeneration, abortStream: stopGeneration,
    deleteMessage, editMessage, editAndRegenerate, deleteFromMessage, rollbackTo, jumpToFloor, regenerateLast, branchFromMessage,
    setChatVariables, resetAllData, reloadData,
    openSettings: () => setShowSettings(true), openCharacters: () => setShowCharacters(true), openLorebooks: () => setShowLorebooks(true), openPresets: () => setShowPresets(true), openVariables: () => setShowVariables(true), openHistory: () => setShowHistory(true),
    showSettings, setShowSettings, showCharacters, setShowCharacters, showLorebooks, setShowLorebooks, showPresets, setShowPresets, showVariables, setShowVariables, showHistory, setShowHistory,
    toast, showToast,
  };
}
