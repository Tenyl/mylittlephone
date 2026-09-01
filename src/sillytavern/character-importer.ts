import type { CharacterCard, JsonValue } from './types';

export const MAX_CHARACTER_FILE_BYTES = 10 * 1024 * 1024;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!isRecord(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
  } catch {
    return {};
  }
}

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `character-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseCharacterCardV2(raw: unknown, sourceFile: string): CharacterCard {
  if (!isRecord(raw)) throw new Error(`${sourceFile} 不是有效的角色卡 JSON`);
  const data = isRecord(raw.data) ? raw.data : raw;
  const name = text(data.name);
  if (!name) throw new Error(`${sourceFile} 缺少角色名称`);
  const now = Date.now();

  return {
    id: newId(),
    spec: 'chara_card_v2',
    specVersion: text(raw.spec_version) || '2.0',
    name,
    avatar: text(data.avatar),
    description: text(data.description),
    personality: text(data.personality),
    scenario: text(data.scenario),
    firstMes: text(data.first_mes),
    mesExample: text(data.mes_example),
    creatorNotes: text(data.creator_notes),
    systemPrompt: text(data.system_prompt),
    postHistoryInstructions: text(data.post_history_instructions),
    alternateGreetings: stringList(data.alternate_greetings),
    tags: stringList(data.tags),
    creator: text(data.creator),
    characterVersion: text(data.character_version),
    extensions: jsonObject(data.extensions),
    sourceFile,
    importedAt: now,
    updatedAt: now,
  };
}

function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as ArrayBuffer));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('文件读取失败')));
    reader.readAsArrayBuffer(file);
  });
}

function decodeBase64Utf8(value: string): string {
  try {
    const binary = atob(value.trim());
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    throw new Error('PNG 中的角色数据编码无效');
  }
}

function findNull(bytes: Uint8Array, start: number): number {
  for (let index = start; index < bytes.length; index += 1) {
    if (bytes[index] === 0) return index;
  }
  return -1;
}

function readTextChunk(type: string, data: Uint8Array): { keyword: string; value: string } | null {
  const decoder = new TextDecoder('latin1');
  const keywordEnd = findNull(data, 0);
  if (keywordEnd < 0) return null;
  const keyword = decoder.decode(data.subarray(0, keywordEnd));

  if (type === 'tEXt') {
    return { keyword, value: decoder.decode(data.subarray(keywordEnd + 1)) };
  }

  if (type !== 'iTXt' || keywordEnd + 2 >= data.length) return null;
  const compressionFlag = data[keywordEnd + 1];
  if (compressionFlag !== 0) return null;
  const languageEnd = findNull(data, keywordEnd + 3);
  if (languageEnd < 0) return null;
  const translatedEnd = findNull(data, languageEnd + 1);
  if (translatedEnd < 0) return null;
  return {
    keyword,
    value: new TextDecoder().decode(data.subarray(translatedEnd + 1)),
  };
}

export function extractCharacterJsonFromPng(buffer: ArrayBuffer): unknown {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < signature.length || signature.some((byte, index) => bytes[index] !== byte)) {
    throw new Error('文件不是有效的 PNG 图片');
  }

  const view = new DataView(buffer);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) throw new Error('PNG 文件结构不完整');
    const type = new TextDecoder('latin1').decode(bytes.subarray(offset + 4, offset + 8));
    if (type === 'tEXt' || type === 'iTXt') {
      const entry = readTextChunk(type, bytes.subarray(dataStart, dataEnd));
      if (entry?.keyword === 'chara') {
        try {
          return JSON.parse(decodeBase64Utf8(entry.value));
        } catch (error) {
          if (error instanceof SyntaxError) throw new Error('PNG 中的角色数据不是有效 JSON');
          throw error;
        }
      }
    }
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }

  throw new Error('PNG 中未找到 SillyTavern 角色数据');
}

function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function importCharacterFile(file: File): Promise<CharacterCard> {
  if (file.size > MAX_CHARACTER_FILE_BYTES) throw new Error(`${file.name} 不能超过 10MB`);
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json') {
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      throw new Error(`${file.name} 不是有效的 JSON 文件`);
    }
    return parseCharacterCardV2(raw, file.name);
  }

  if (extension === 'png') {
    const buffer = await readFileBuffer(file);
    const card = parseCharacterCardV2(extractCharacterJsonFromPng(buffer), file.name);
    card.avatar = bufferToDataUrl(buffer, 'image/png');
    return card;
  }

  throw new Error('角色卡仅支持 PNG 或 JSON 文件');
}
