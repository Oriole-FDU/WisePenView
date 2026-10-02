import type * as Y from 'yjs';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const AI_CONTENT_STORE_MAP = 'ai-content-store';
export const AI_DIFF_ACTION_ORIGIN = Symbol('ai-diff-action');

export function getAiContentStore(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(AI_CONTENT_STORE_MAP);
}

export function hasBlockAiContent(doc: Y.Doc, blockId: string): boolean {
  return getAiContentStore(doc).has(blockId);
}

export function readBlockAiContent(doc: Y.Doc, blockId: string): unknown {
  return getAiContentStore(doc).get(blockId);
}

export function readAllAiContent(doc: Y.Doc): ReadonlyMap<string, unknown> {
  const result = new Map<string, unknown>();
  getAiContentStore(doc).forEach((value, blockId) => {
    result.set(blockId, value);
  });
  return result;
}

export function setBlockAiContent(doc: Y.Doc, blockId: string, aiContent: unknown): void {
  if (aiContent === undefined) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `AI-content 不能写入 undefined：${blockId}`,
    });
  }
  getAiContentStore(doc).set(blockId, aiContent);
}

export function deleteBlockAiContent(doc: Y.Doc, blockId: string): void {
  getAiContentStore(doc).delete(blockId);
}

export function clearAiContentEntries(doc: Y.Doc, blockIds: readonly string[]): void {
  const store = getAiContentStore(doc);
  blockIds.forEach((blockId) => store.delete(blockId));
}

export function observeAiContent(
  doc: Y.Doc,
  listener: (event: Y.YMapEvent<unknown>) => void
): () => void {
  const store = getAiContentStore(doc);
  store.observe(listener);
  return () => store.unobserve(listener);
}
