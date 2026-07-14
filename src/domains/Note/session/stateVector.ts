import * as Y from 'yjs';

const NOTE_CONTENT_SIGNATURE_VERSION = 1;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function encodeNoteClientStateVector(doc: Y.Doc): string {
  const bytes = Y.encodeStateVector(doc);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

export function encodeNoteClientContentSignature(params: {
  bodyHash?: string | null;
}): string | undefined {
  const bodyHash = (params.bodyHash || '').trim();
  if (!bodyHash) return undefined;

  const payload = {
    version: NOTE_CONTENT_SIGNATURE_VERSION,
    bodyHash,
  };
  return encodeUtf8Base64(JSON.stringify(payload));
}

export function computeNoteBodyContentHash(blocks: unknown): string {
  return hashString(stableStringify(canonicalizeBlocks(blocks)));
}

function canonicalizeBlocks(value: unknown): JsonValue[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((block): block is Record<string, unknown> => isRecord(block))
    .map((block) => ({
      id: asString(block.id),
      type: asString(block.type),
      props: canonicalizeBlockProps(block.props),
      content: canonicalizeInlineContent(block.content),
      children: canonicalizeBlocks(block.children),
    }));
}

function canonicalizeBlockProps(value: unknown): JsonValue {
  const props = isRecord(value) ? value : {};
  return pickStableProps(props, [
    'level',
    'expression',
    'aiDiffType',
    'aiDiffKey',
    'aiDiffOrigin',
    'aiDiffReplace',
  ]);
}

function canonicalizeInlineContent(value: unknown): JsonValue {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const type = asString(item.type);
      const base: Record<string, JsonValue> = { type };
      const text = asString(item.text);
      if (text) base.text = text;
      const href = asString(item.href);
      if (href) base.href = href;
      const props = canonicalizeInlineProps(item.props);
      if (isNonEmptyObject(props)) base.props = props;
      const content = canonicalizeInlineContent(item.content);
      if (Array.isArray(content) && content.length > 0) base.content = content;
      return base;
    });
}

function canonicalizeInlineProps(value: unknown): JsonValue {
  const props = isRecord(value) ? value : {};
  return pickStableProps(props, [
    'expression',
    'text',
    'origin',
    'replace',
    'aiDiffType',
    'aiDiffKey',
    'aiDiffOrigin',
    'aiDiffReplace',
  ]);
}

function pickStableProps(
  props: Record<string, unknown>,
  keys: string[]
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      out[key] = toJsonValue(props[key]);
    }
  }
  return out;
}

function toJsonValue(value: unknown): JsonValue {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (isRecord(value)) {
    const out: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) out[key] = toJsonValue(item);
    }
    return out;
  }
  return String(value);
}

function stableStringify(value: JsonValue): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function hashString(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < input.length; index += 1) {
    const ch = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyObject(value: JsonValue): value is Record<string, JsonValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
