import { describe, it, expect } from 'vitest';
import { assemblePrompt } from './prompt-assembler';
import type { CharacterCard } from './types';

const character: CharacterCard = {
  id: 'character-1',
  spec: 'chara_card_v2',
  specVersion: '2.0',
  name: '白露',
  avatar: '',
  description: '{{char}} 是一名气象记录员。',
  personality: '安静但敏锐。',
  scenario: '{{user}} 在雨夜来到观测站。',
  firstMes: '{{user}}，你终于来了。',
  mesExample: '<START>\n{{char}}：气压正在下降。',
  creatorNotes: '',
  systemPrompt: '始终扮演 {{char}}。',
  postHistoryInstructions: '不要替 {{user}} 做决定。',
  alternateGreetings: [],
  tags: [],
  creator: '',
  characterVersion: '',
  extensions: {},
  sourceFile: '白露.json',
  importedAt: 0,
  updatedAt: 0,
};

describe('assemblePrompt formatPrompt injection', () => {
  it('injects formatPrompt as a system message', () => {
    const out = assemblePrompt({
      userInput: 'hi',
      history: [],
      preset: { id: 'p', name: 'p', settings: {}, createdAt: 0, updatedAt: 0 },
      lorebooks: [],
      userName: 'Alice',
      characterName: 'Bob',
      formatPrompt: 'FORMAT_INSTRUCTIONS_HERE',
      extraVariables: { hp: 100 },
    });
    const sysJoined = out.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysJoined).toContain('FORMAT_INSTRUCTIONS_HERE');
  });

  it('exposes extraVariables in system context', () => {
    const out = assemblePrompt({
      userInput: 'hi',
      history: [],
      preset: { id: 'p', name: 'p', settings: {}, createdAt: 0, updatedAt: 0 },
      lorebooks: [],
      userName: 'Alice',
      characterName: 'Bob',
      extraVariables: { hp: 42 },
    });
    const sysJoined = out.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysJoined).toMatch(/42/);
  });
});

describe('assemblePrompt character injection', () => {
  it('injects V2 character fields and replaces macros', () => {
    const out = assemblePrompt({
      userInput: '现在安全吗？',
      history: [],
      character,
      preset: {
        id: 'p',
        name: 'p',
        settings: {
          main: '续写 {{char}} 与 {{user}} 的聊天。',
          prompt_order: [
            { identifier: 'main', role: 'system', enabled: true },
            { identifier: 'charDescription', role: 'system', enabled: true },
            { identifier: 'charPersonality', role: 'system', enabled: true },
            { identifier: 'scenario', role: 'system', enabled: true },
            { identifier: 'dialogueExamples', role: 'system', enabled: true },
            { identifier: 'chatHistory', role: 'system', enabled: true },
          ],
        },
        createdAt: 0,
        updatedAt: 0,
      },
      lorebooks: [],
      userName: '访客',
      characterName: '白露',
    });

    const system = out.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    expect(system).toContain('白露 是一名气象记录员')
    expect(system).toContain('安静但敏锐')
    expect(system).toContain('访客 在雨夜来到观测站')
    expect(system).toContain('气压正在下降')
    expect(system).toContain('始终扮演 白露')
    expect(system).toContain('不要替 访客 做决定')
  });

  it('only includes the first greeting when explicitly creating a chat', () => {
    const common = {
      userInput: '继续',
      history: [],
      character,
      preset: { id: 'p', name: 'p', settings: {}, createdAt: 0, updatedAt: 0 },
      lorebooks: [],
      userName: '访客',
      characterName: '白露',
    };

    expect(assemblePrompt(common).messages.some((message) => message.content.includes('你终于来了'))).toBe(false)
    expect(assemblePrompt({ ...common, includeFirstMessage: true }).messages)
      .toContainEqual({ role: 'assistant', content: '访客，你终于来了。' })
  });
});
