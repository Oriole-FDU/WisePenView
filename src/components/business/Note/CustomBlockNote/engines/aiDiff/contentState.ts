import { isRecord } from '@/utils/typeGuards';

import type {
  NoteAiDiffProjection,
  NoteBlockAiDiff,
  NotePluginRegistry,
} from '../../registry/types';

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

export function isAiDiffContentEqual(current: unknown, aiContent: unknown): boolean {
  return stableStringify(current) === stableStringify(aiContent);
}

export function isAiDiffContentEmpty(content: unknown): boolean {
  if (content === null || content === undefined || content === '') return true;
  if (Array.isArray(content)) return content.length === 0;
  if (!isRecord(content)) return false;
  return Array.isArray(content.rows) && content.rows.length === 0;
}

export function resolveNoteAiDiffBlock(
  block: Record<string, unknown>,
  aiContent: unknown,
  aiDiff: NoteBlockAiDiff,
  registry: NotePluginRegistry
): NoteAiDiffProjection | null {
  if (aiDiff?.resolve) {
    return aiDiff.resolve(block, aiContent, registry);
  }
  if (isAiDiffContentEqual(block.content, aiContent)) return null;
  const currentEmpty = isAiDiffContentEmpty(block.content);
  const aiContentEmpty = isAiDiffContentEmpty(aiContent);
  return {
    current: block,
    aiBlock: { ...block, content: aiContent },
    currentEmpty,
    aiContentEmpty,
    changeKind: currentEmpty ? 'create' : aiContentEmpty ? 'delete' : 'update',
  };
}
