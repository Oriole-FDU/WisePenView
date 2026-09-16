import { isRecord } from '@/utils/typeGuards';

import { stableStringify } from '../../engines/aiDiff/contentState';
import {
  type AiDiffTextConfig,
  type AiDiffTextHunk,
  type AiDiffTextToken,
  diffAiTextTokens,
  tokenizeAiDiffText,
} from '../../engines/aiDiff/wordDiff';

function withoutField(
  value: Record<string, unknown>,
  field: 'text' | 'content'
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function normalizeInlineContent(content: readonly Record<string, unknown>[]) {
  const normalized: Record<string, unknown>[] = [];
  for (const inline of content) {
    if (inline.type === 'text') {
      const text = typeof inline.text === 'string' ? inline.text : '';
      if (!text) continue;
      const previous = normalized.at(-1);
      if (
        previous?.type === 'text' &&
        stableStringify(withoutField(previous, 'text')) ===
          stableStringify(withoutField(inline, 'text'))
      ) {
        previous.text = String(previous.text ?? '') + text;
      } else {
        normalized.push({ ...inline, text });
      }
      continue;
    }

    if (inline.type === 'link' && Array.isArray(inline.content)) {
      const children = normalizeInlineContent(inline.content.filter(isRecord));
      if (children.length === 0) continue;
      const previous = normalized.at(-1);
      if (
        previous?.type === 'link' &&
        Array.isArray(previous.content) &&
        stableStringify(withoutField(previous, 'content')) ===
          stableStringify(withoutField(inline, 'content'))
      ) {
        previous.content = normalizeInlineContent([
          ...previous.content.filter(isRecord),
          ...children,
        ]);
      } else {
        normalized.push({ ...inline, content: children });
      }
      continue;
    }

    normalized.push({ ...inline });
  }
  return normalized;
}

function readInlineText(content: readonly Record<string, unknown>[]): string | null {
  let text = '';
  for (const inline of content) {
    if (inline.type === 'text' && typeof inline.text === 'string') {
      text += inline.text;
      continue;
    }
    if (inline.type === 'link' && Array.isArray(inline.content)) {
      const children = inline.content.filter(isRecord);
      if (children.length !== inline.content.length) return null;
      const childText = readInlineText(children);
      if (childText === null) return null;
      text += childText;
      continue;
    }
    return null;
  }
  return text;
}

function collectInlineDiffSource(
  content: readonly Record<string, unknown>[],
  ancestors: readonly Record<string, unknown>[],
  tokens: AiDiffTextToken[]
): string | null {
  let text = '';
  for (const inline of content) {
    if (inline.type === 'text' && typeof inline.text === 'string') {
      const structureKey = stableStringify([...ancestors, withoutField(inline, 'text')]);
      for (const token of tokenizeAiDiffText(inline.text)) {
        tokens.push({
          text: token,
          comparisonKey: stableStringify([structureKey, token]),
        });
      }
      text += inline.text;
      continue;
    }
    if (inline.type === 'link' && Array.isArray(inline.content)) {
      const children = inline.content.filter(isRecord);
      if (children.length !== inline.content.length) return null;
      const childText = collectInlineDiffSource(
        children,
        [...ancestors, withoutField(inline, 'content')],
        tokens
      );
      if (childText === null) return null;
      text += childText;
      continue;
    }
    return null;
  }
  return text;
}

interface InlineDiffSource {
  text: string;
  tokens: AiDiffTextToken[];
}

function buildInlineDiffSource(content: unknown): InlineDiffSource | null {
  if (!Array.isArray(content) || !content.every(isRecord)) return null;
  const normalized = normalizeInlineContent(content);
  const tokens: AiDiffTextToken[] = [];
  const text = collectInlineDiffSource(normalized, [], tokens);
  if (text === null) return null;
  return { text, tokens };
}

/** 直接比较两组 InlineContent，文本、样式与链接属性共同决定 token 是否相等。 */
export function diffInlineContent(
  current: unknown,
  aiContent: unknown,
  config: AiDiffTextConfig
): AiDiffTextHunk[] | null {
  const currentSource = buildInlineDiffSource(current);
  const aiSource = buildInlineDiffSource(aiContent);
  if (!currentSource || !aiSource) return null;
  const hunks = diffAiTextTokens(currentSource.tokens, aiSource.tokens, config);
  const currentLength = hunks.at(-1)?.originTo ?? 0;
  const aiLength = hunks.at(-1)?.replacementTo ?? 0;
  if (currentLength !== currentSource.text.length || aiLength !== aiSource.text.length) return null;
  return hunks;
}

/** 按文本偏移切分结构兼容的 inline content，同时保留样式与链接。 */
export function sliceInlineContentByTextRange(
  content: unknown,
  from: number,
  to: number
): Record<string, unknown>[] | null {
  if (!Array.isArray(content) || from < 0 || to < from) return null;
  const result: Record<string, unknown>[] = [];
  let offset = 0;

  for (const inline of content) {
    if (!isRecord(inline)) return null;
    const text = readInlineText([inline]);
    if (text === null) return null;
    const inlineFrom = offset;
    const inlineTo = inlineFrom + text.length;
    offset = inlineTo;

    if (text.length === 0) {
      if (inline.type === 'text' && inline.text === '') continue;
      return null;
    }
    if (inlineTo <= from || inlineFrom >= to) continue;

    const localFrom = Math.max(0, from - inlineFrom);
    const localTo = Math.min(text.length, to - inlineFrom);
    if (localFrom === 0 && localTo === text.length) {
      result.push(inline);
      continue;
    }
    if (inline.type === 'text' && typeof inline.text === 'string') {
      result.push({ ...inline, text: inline.text.slice(localFrom, localTo) });
      continue;
    }
    if (inline.type === 'link') {
      const children = sliceInlineContentByTextRange(inline.content, localFrom, localTo);
      if (!children) return null;
      result.push({ ...inline, content: children });
      continue;
    }
    return null;
  }

  if (to > offset) return null;
  return normalizeInlineContent(result);
}

function replaceInlineTextRange(params: {
  base: unknown;
  replacement: unknown;
  baseFrom: number;
  baseTo: number;
  replacementFrom: number;
  replacementTo: number;
}): Record<string, unknown>[] | null {
  const { base, replacement, baseFrom, baseTo, replacementFrom, replacementTo } = params;
  if (!Array.isArray(base) || !base.every(isRecord)) return null;
  if (!Array.isArray(replacement) || !replacement.every(isRecord)) return null;
  const baseText = readInlineText(base);
  const replacementText = readInlineText(replacement);
  if (baseText === null || replacementText === null) return null;
  const prefix = sliceInlineContentByTextRange(base, 0, baseFrom);
  const accepted = sliceInlineContentByTextRange(replacement, replacementFrom, replacementTo);
  const suffix = sliceInlineContentByTextRange(base, baseTo, baseText.length);
  if (!prefix || !accepted || !suffix) return null;

  const result = normalizeInlineContent([...prefix, ...accepted, ...suffix]);
  const expectedText =
    baseText.slice(0, baseFrom) +
    replacementText.slice(replacementFrom, replacementTo) +
    baseText.slice(baseTo);
  return readInlineText(result) === expectedText ? result : null;
}

/** 接受一个展示 hunk，并保留范围外已有的 inline 样式与链接结构。 */
export function acceptInlineHunk(params: {
  current: unknown;
  aiContent: unknown;
  hunk: AiDiffTextHunk;
}): Record<string, unknown>[] | null {
  const { current, aiContent, hunk } = params;
  return replaceInlineTextRange({
    base: current,
    replacement: aiContent,
    baseFrom: hunk.originFrom,
    baseTo: hunk.originTo,
    replacementFrom: hunk.replacementFrom,
    replacementTo: hunk.replacementTo,
  });
}

/** 拒绝一个展示 hunk，并保留候选中其它尚未处理的修改。 */
export function discardInlineHunk(params: {
  current: unknown;
  aiContent: unknown;
  hunk: AiDiffTextHunk;
}): Record<string, unknown>[] | null {
  const { current, aiContent, hunk } = params;
  return replaceInlineTextRange({
    base: aiContent,
    replacement: current,
    baseFrom: hunk.replacementFrom,
    baseTo: hunk.replacementTo,
    replacementFrom: hunk.originFrom,
    replacementTo: hunk.originTo,
  });
}
