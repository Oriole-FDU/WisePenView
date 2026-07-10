import {
  buildAiEditJsonUnits,
  DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
  tokenizeForAiEdit,
} from './wordDiff';

type TextInlineContent = { type: 'text'; text: string; styles?: Record<string, string> };
type AiDiffInlineContent = {
  type: 'ai-diff';
  props: { origin: string; replace: string; key: string };
};
type AiAddInlineContent = { type: 'ai-add'; props: { text: string; key: string } };
type AiDeleteInlineContent = { type: 'ai-delete'; props: { text: string; key: string } };
type AiLinkAddInlineContent = {
  type: 'ai-link-add';
  props: { text: string; href: string; key: string };
};
type AiLinkDeleteInlineContent = {
  type: 'ai-link-delete';
  props: { text: string; href: string; key: string };
};
type LinkInlineContent = {
  type: 'link';
  href: string;
  content: TextInlineContent[];
};
type InlineMathContent = {
  type: 'inlineMath';
  props: {
    expression: string;
    autoOpenEdit?: boolean;
    aiDiffType?: string;
    aiDiffKey?: string;
    aiDiffOrigin?: string;
    aiDiffReplace?: string;
  };
};

export type NoteInlineContentLike =
  | TextInlineContent
  | AiDiffInlineContent
  | AiAddInlineContent
  | AiDeleteInlineContent
  | AiLinkAddInlineContent
  | AiLinkDeleteInlineContent
  | LinkInlineContent
  | InlineMathContent
  | Record<string, unknown>;

export type AiDiffActionMode = 'accept' | 'discard';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

type AiDiffPropsActionResult =
  | { kind: 'none' }
  | { kind: 'remove' }
  | { kind: 'update'; props: Record<string, unknown> };

const SUPPORTED_SCHEMA_BLOCK_TYPES = new Set([
  'audio',
  'bulletListItem',
  'checkListItem',
  'codeBlock',
  'divider',
  'file',
  'heading',
  'image',
  'math',
  'numberedListItem',
  'paragraph',
  'quote',
  'table',
  'toggleListItem',
  'video',
]);

const EXCLUDED_CODE_BLOCK_TYPES = new Set(['codeBlock']);

const INLINE_AI_DIFF_BLOCK_TYPES = new Set([
  'bulletListItem',
  'checkListItem',
  'heading',
  'numberedListItem',
  'paragraph',
  'quote',
  'toggleListItem',
]);

const CONTENT_NONE_AI_BLOCK_TYPES = new Set(['audio', 'divider', 'file', 'image', 'math', 'video']);

const AI_DIFF_INLINE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

const AI_DIFF_PROP_TYPES = new Set(['edit', 'create', 'delete']);

function toTextInline(text: string): TextInlineContent {
  return { type: 'text', text, styles: {} };
}

function toLinkInline(text: string, href: string): LinkInlineContent {
  return {
    type: 'link',
    href,
    content: text ? [toTextInline(text)] : [],
  };
}

export type AiGeneratedBlock = {
  id: string;
  type: string;
  props?: Record<string, JsonValue>;
  content?: unknown;
  children?: unknown;
};

type AiGeneratedInlineText = { type: 'text'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineCreate = { type: 'AI-Create'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineDelete = { type: 'AI-Delete'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineEdit = {
  type: 'AI-Edit';
  old_text?: string;
  new_text?: string;
  text_old?: string;
  text_new?: string;
  styles?: Record<string, string>;
};
type AiGeneratedInlineMath = {
  type: 'inlineMath';
  props?: Record<string, JsonValue>;
};
type AiGeneratedInlineLink = {
  type: 'link';
  href?: string;
  content?: unknown;
  aiDiffType?: string;
  aiDiffKey?: string;
};

function toStringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toJsonProps(v: unknown): Record<string, JsonValue> {
  if (!isRecord(v)) return {};
  return v as Record<string, JsonValue>;
}

function isAiGeneratedInline(
  v: unknown
): v is
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit {
  if (!isRecord(v)) return false;
  const t = v['type'];
  if (t === 'text') return typeof v['text'] === 'string';
  if (t === 'AI-Create') return typeof v['text'] === 'string';
  if (t === 'AI-Delete') return typeof v['text'] === 'string';
  if (t === 'AI-Edit') return true;
  return false;
}

function isAiGeneratedInlineMath(v: unknown): v is AiGeneratedInlineMath {
  if (!isRecord(v)) return false;
  if (v['type'] !== 'inlineMath') return false;
  const props = v['props'];
  return props === undefined || isRecord(props);
}

function isAiGeneratedInlineLink(v: unknown): v is AiGeneratedInlineLink {
  if (!isRecord(v)) return false;
  if (v['type'] !== 'link') return false;
  const content = v['content'];
  return Array.isArray(content);
}

function hasAiGeneratedInlineContent(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.some((item) => {
      if (isAiGeneratedInline(item) && item.type !== 'text') return true;
      if (!isAiGeneratedInlineLink(item)) return false;
      return item.aiDiffType === 'create' || item.aiDiffType === 'delete';
    })
  );
}

function resolveAiGeneratedEditText(item: AiGeneratedInlineEdit): {
  origin: string;
  replace: string;
} {
  return {
    origin: toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old),
    replace: toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new),
  };
}

function normalizeAiGeneratedInlineContent(
  content: unknown
):
  | (
      | AiGeneratedInlineText
      | AiGeneratedInlineCreate
      | AiGeneratedInlineDelete
      | AiGeneratedInlineEdit
      | AiGeneratedInlineLink
      | AiGeneratedInlineMath
    )[]
  | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;

  const out: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
    | AiGeneratedInlineLink
    | AiGeneratedInlineMath
  > = [];

  for (const item of content) {
    if (isAiGeneratedInlineLink(item)) {
      out.push(item);
      continue;
    }
    if (isAiGeneratedInlineMath(item)) {
      out.push(item);
      continue;
    }
    if (!isAiGeneratedInline(item)) return null;
    if (item.type !== 'AI-Edit') {
      out.push(item);
      continue;
    }

    const origin = toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old);
    const replace = toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new);
    const units = buildAiEditJsonUnits(origin, replace);
    for (const unit of units) {
      if (unit.type === 'plain') {
        if (unit.text.length === 0) continue;
        out.push({
          type: 'text',
          text: unit.text,
          styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
        });
      } else {
        out.push({
          type: 'AI-Edit',
          old_text: unit.origin,
          new_text: unit.replace,
          styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
        });
      }
    }
  }

  const mergedText = mergeAdjacentAiGeneratedText(out);
  return mergeAiEditChains(mergedText);
}

function mergeAdjacentAiGeneratedText(
  nodes: readonly (
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
    | AiGeneratedInlineLink
    | AiGeneratedInlineMath
  )[]
): (
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit
  | AiGeneratedInlineLink
  | AiGeneratedInlineMath
)[] {
  const merged: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
    | AiGeneratedInlineLink
    | AiGeneratedInlineMath
  > = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (node.type === 'text' && last?.type === 'text') {
      last.text += node.text;
      continue;
    }
    merged.push(node);
  }
  return merged;
}

function mergeAiEditChains(
  nodes: readonly (
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
    | AiGeneratedInlineLink
    | AiGeneratedInlineMath
  )[]
): (
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit
  | AiGeneratedInlineLink
  | AiGeneratedInlineMath
)[] {
  // Keep the chain merge slightly looser than the base hunk split, but only across
  // very short shared bridges so separate edits are less likely to be over-merged.
  const mergeOptions = {
    ...DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
    maxGapChars: 4,
    maxGapTokens: 2,
    breakOnSentenceEnd: false,
    breakOnClauseBoundary: false,
  };
  const merged: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
    | AiGeneratedInlineLink
    | AiGeneratedInlineMath
  > = [];

  const isSentenceEndChar = (ch: string): boolean => '。！？；'.includes(ch) || '.?!'.includes(ch);
  const segmentEndsWithSentencePunctuation = (text: string): boolean => {
    const t = text.trimEnd();
    if (t.length === 0) return false;
    return isSentenceEndChar(t[t.length - 1]);
  };
  const containsClauseBoundary = (text: string): boolean => /[，,；;：:]/.test(text);
  const visibleLen = (text: string): number => text.length;
  const canMergeAcrossSharedText = (sharedText: string, currentVisibleLen: number): boolean => {
    if (mergeOptions.breakOnNewline && sharedText.includes('\n')) return false;
    if (visibleLen(sharedText) > mergeOptions.maxGapChars) return false;
    if (tokenizeForAiEdit(sharedText).length > mergeOptions.maxGapTokens) return false;
    if (mergeOptions.preferSemanticBoundary) {
      if (mergeOptions.breakOnSentenceEnd && segmentEndsWithSentencePunctuation(sharedText))
        return false;
      if (mergeOptions.breakOnClauseBoundary && containsClauseBoundary(sharedText)) return false;
    }
    return currentVisibleLen + visibleLen(sharedText) <= mergeOptions.maxMergedLength;
  };

  let i = 0;
  while (i < nodes.length) {
    const current = nodes[i];
    if (current.type !== 'AI-Edit') {
      merged.push(current);
      i += 1;
      continue;
    }

    let oldText = toStringOrEmpty(current.old_text) || toStringOrEmpty(current.text_old);
    let newText = toStringOrEmpty(current.new_text) || toStringOrEmpty(current.text_new);
    const styles = isRecord(current.styles) ? (current.styles as Record<string, string>) : {};
    let mergedVisibleLen = Math.max(oldText.length, newText.length);
    let cursor = i + 1;

    // Merge chain: AI-Edit + text + AI-Edit (+ text + AI-Edit ...)
    while (cursor + 1 < nodes.length) {
      const shared = nodes[cursor];
      const next = nodes[cursor + 1];
      if (shared.type !== 'text' || next.type !== 'AI-Edit') break;
      if (!canMergeAcrossSharedText(shared.text, mergedVisibleLen)) break;

      const nextOldText =
        oldText + shared.text + (toStringOrEmpty(next.old_text) || toStringOrEmpty(next.text_old));
      const nextNewText =
        newText + shared.text + (toStringOrEmpty(next.new_text) || toStringOrEmpty(next.text_new));
      const nextVisibleLen = Math.max(nextOldText.length, nextNewText.length);
      if (nextVisibleLen > mergeOptions.maxMergedLength) break;

      oldText = nextOldText;
      newText = nextNewText;
      mergedVisibleLen = nextVisibleLen;
      cursor += 2;
    }

    merged.push({
      type: 'AI-Edit',
      old_text: oldText,
      new_text: newText,
      styles,
    });
    i = cursor;
  }

  return mergeAdjacentAiGeneratedText(merged);
}

function aiGeneratedMathProps(
  rawProps: Record<string, JsonValue>,
  content: unknown,
  keyPrefix: string
): Record<string, JsonValue> | null {
  if (!Array.isArray(content)) {
    return {
      ...rawProps,
      expression: toStringOrEmpty(rawProps['expression']),
    };
  }

  const aiItem = content.find((item) => isAiGeneratedInline(item) && item.type !== 'text');
  if (!aiItem || !isAiGeneratedInline(aiItem)) {
    return {
      ...rawProps,
      expression: toStringOrEmpty(rawProps['expression']),
    };
  }

  const key = `${keyPrefix}:math`;
  if (aiItem.type === 'AI-Create') {
    const expression = toStringOrEmpty(aiItem.text);
    return {
      ...rawProps,
      expression,
      aiDiffType: 'create',
      aiDiffKey: key,
      aiDiffOrigin: '',
      aiDiffReplace: expression,
    };
  }

  if (aiItem.type === 'AI-Delete') {
    const expression = toStringOrEmpty(aiItem.text);
    return {
      ...rawProps,
      expression,
      aiDiffType: 'delete',
      aiDiffKey: key,
      aiDiffOrigin: expression,
      aiDiffReplace: '',
    };
  }

  const { origin, replace } = resolveAiGeneratedEditText(aiItem);
  return {
    ...rawProps,
    expression: replace || origin,
    aiDiffType: 'edit',
    aiDiffKey: key,
    aiDiffOrigin: origin,
    aiDiffReplace: replace,
  };
}

export function aiGeneratedBlocksToBlockNoteBlocks(input: unknown): unknown[] | null {
  const seed = `ai-${Date.now().toString(36)}`;
  return aiGeneratedBlocksToBlockNoteBlocksInner(input, seed, 'root');
}

function aiGeneratedBlocksToBlockNoteBlocksInner(
  input: unknown,
  seed: string,
  path: string
): unknown[] | null {
  if (!Array.isArray(input)) return null;
  const out: unknown[] = [];
  for (let idx = 0; idx < input.length; idx += 1) {
    const raw = input[idx];
    if (!isRecord(raw)) return null;
    const id = toStringOrEmpty(raw['id']);
    const type = toStringOrEmpty(raw['type']);
    if (!id || !type) return null;
    if (!SUPPORTED_SCHEMA_BLOCK_TYPES.has(type)) return null;
    if (EXCLUDED_CODE_BLOCK_TYPES.has(type)) return null;

    const props = toJsonProps(raw['props']);
    const content = raw['content'];
    const children = raw['children'];

    const keyPrefix = `${seed}:${path}:${id}:${idx}`;
    const isInlineBlock = INLINE_AI_DIFF_BLOCK_TYPES.has(type);
    const isContentNoneBlock = CONTENT_NONE_AI_BLOCK_TYPES.has(type);
    const normalizedInlineContent = isInlineBlock
      ? normalizeAiGeneratedInlineContent(content)
      : null;
    if (isInlineBlock && !normalizedInlineContent) return null;
    const mappedContent = isInlineBlock
      ? aiGeneratedInlineToInlineContentArray(normalizedInlineContent, keyPrefix)
      : [];
    if (isInlineBlock && !mappedContent) return null;
    if (!isInlineBlock && type !== 'math' && hasAiGeneratedInlineContent(content)) return null;

    const mappedChildren =
      aiGeneratedBlocksToBlockNoteBlocksInner(
        Array.isArray(children) ? children : [],
        seed,
        `${path}.${id}.${idx}`
      ) ?? [];
    const mappedProps = type === 'math' ? aiGeneratedMathProps(props, content, keyPrefix) : props;
    if (!mappedProps) return null;

    out.push({
      id,
      type,
      props: mappedProps,
      ...(isContentNoneBlock ? {} : { content: mappedContent }),
      children: mappedChildren,
    });
  }
  return out;
}

function aiGeneratedInlineToInlineContentArray(
  content: unknown,
  keyPrefix: string
): NoteInlineContentLike[] | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;
  const nodes: NoteInlineContentLike[] = [];
  let serial = 0;

  for (let idx = 0; idx < content.length; idx += 1) {
    const item = content[idx];
    if (isAiGeneratedInlineLink(item)) {
      const aiDiffType = toStringOrEmpty(item.aiDiffType);
      const nextKey =
        aiDiffType === 'create' || aiDiffType === 'delete' ? `${keyPrefix}:c${++serial}` : '';
      nodes.push(mapAiGeneratedInlineLink(item, nextKey));
      continue;
    }
    if (isAiGeneratedInlineMath(item)) {
      serial += 1;
      const key = `${keyPrefix}:c${serial}`;
      nodes.push(mapAiGeneratedInlineMath(item, key));
      continue;
    }
    if (!isAiGeneratedInline(item)) return null;
    if (item.type === 'text') {
      nodes.push({
        type: 'text',
        text: toStringOrEmpty(item.text),
        styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
      });
      continue;
    }

    serial += 1;
    const key = `${keyPrefix}:c${serial}`;
    if (item.type === 'AI-Create') {
      nodes.push({ type: 'ai-add', props: { text: toStringOrEmpty(item.text), key } });
      continue;
    }
    if (item.type === 'AI-Delete') {
      nodes.push({ type: 'ai-delete', props: { text: toStringOrEmpty(item.text), key } });
      continue;
    }
    if (item.type === 'AI-Edit') {
      const origin = toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old);
      const replace = toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new);
      if (origin === '' && replace === '') continue;
      nodes.push({
        type: 'ai-diff',
        props: {
          origin,
          replace,
          key,
          granularity: 'word',
        },
      });
      continue;
    }
  }
  return mergeAdjacentText(nodes);
}

function mapAiGeneratedInlineMath(
  item: AiGeneratedInlineMath,
  fallbackKey: string
): InlineMathContent {
  const props = toJsonProps(item.props);
  const aiDiffKey = toStringOrEmpty(props['aiDiffKey']) || fallbackKey;
  const aiDiffType = toStringOrEmpty(props['aiDiffType']);
  const aiDiffOrigin = toStringOrEmpty(props['aiDiffOrigin']);
  const aiDiffReplace = toStringOrEmpty(props['aiDiffReplace']);
  const expression =
    toStringOrEmpty(props['expression']) ||
    (aiDiffType === 'create'
      ? aiDiffReplace
      : aiDiffType === 'delete'
        ? aiDiffOrigin
        : aiDiffReplace || aiDiffOrigin);

  return {
    type: 'inlineMath',
    props: {
      expression,
      autoOpenEdit: Boolean(props['autoOpenEdit']),
      aiDiffType,
      aiDiffKey,
      aiDiffOrigin,
      aiDiffReplace,
    },
  };
}

function mapAiGeneratedInlineLink(
  item: AiGeneratedInlineLink,
  fallbackKey: string
): LinkInlineContent | AiLinkAddInlineContent | AiLinkDeleteInlineContent {
  const text = extractAiGeneratedLinkText(item.content);
  const href = toStringOrEmpty(item.href);
  const aiDiffType = toStringOrEmpty(item.aiDiffType);
  const key = toStringOrEmpty(item.aiDiffKey) || fallbackKey;

  if (aiDiffType === 'create') {
    return {
      type: 'ai-link-add',
      props: { text, href, key },
    };
  }

  if (aiDiffType === 'delete') {
    return {
      type: 'ai-link-delete',
      props: { text, href, key },
    };
  }

  return {
    type: 'link',
    href,
    content: mapAiGeneratedLinkContent(item.content),
  };
}

function mapAiGeneratedLinkContent(content: unknown): TextInlineContent[] {
  if (!Array.isArray(content)) {
    return [];
  }
  const out: TextInlineContent[] = [];
  for (const child of content) {
    if (!isRecord(child)) {
      continue;
    }
    if (child['type'] !== 'text') {
      continue;
    }
    const text = toStringOrEmpty(child['text']);
    if (!text) {
      continue;
    }
    out.push({
      type: 'text',
      text,
      styles: isRecord(child['styles']) ? (child['styles'] as Record<string, string>) : {},
    });
  }
  return out;
}

function extractAiGeneratedLinkText(content: unknown): string {
  return mapAiGeneratedLinkContent(content)
    .map((item) => item.text)
    .join('');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getType(v: unknown): string | undefined {
  if (!isRecord(v)) return undefined;
  const t = v['type'];
  return typeof t === 'string' ? t : undefined;
}

function getProps(v: unknown): Record<string, unknown> | undefined {
  if (!isRecord(v)) return undefined;
  const p = v['props'];
  return isRecord(p) ? p : undefined;
}

function getPropString(props: Record<string, unknown> | undefined, key: string): string {
  const v = props?.[key];
  return typeof v === 'string' ? v : '';
}

function getText(v: unknown): string {
  if (!isRecord(v)) return '';
  const t = v['text'];
  return typeof t === 'string' ? t : '';
}

export function applyAiDiffActionForKey(
  content: unknown,
  key: string,
  mode: AiDiffActionMode
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  const nodes = content as unknown[];
  const changeIndex = nodes.findIndex((n) => {
    const t = getType(n);
    const props = getProps(n);
    if (t === 'inlineMath') {
      return (
        typeof props?.['aiDiffKey'] === 'string' &&
        props['aiDiffKey'] === key &&
        AI_DIFF_PROP_TYPES.has(getPropString(props, 'aiDiffType'))
      );
    }
    if (!t || !AI_DIFF_INLINE_TYPES.has(t)) {
      return false;
    }
    return typeof props?.['key'] === 'string' && props['key'] === key;
  });
  if (changeIndex < 0) return null;

  const changeType = getType(nodes[changeIndex]);
  const changeProps = getProps(nodes[changeIndex]) ?? {};
  if (changeType === 'inlineMath') {
    const propsAction = applyAiDiffActionToProps(changeProps, mode);
    if (propsAction.kind === 'none') return null;
    if (propsAction.kind === 'remove') {
      const out = nodes.filter((_, index) => index !== changeIndex) as NoteInlineContentLike[];
      return mergeAdjacentText(out);
    }
    const out = nodes.map((node, index) =>
      index === changeIndex
        ? ({
            ...(node as Record<string, unknown>),
            props: propsAction.props,
          } as NoteInlineContentLike)
        : (node as NoteInlineContentLike)
    );
    return mergeAdjacentText(out);
  }

  const replacement = changeType ? resolveAiInlineReplacement(changeType, changeProps, mode) : [];

  const out: NoteInlineContentLike[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    if (i === changeIndex) {
      out.push(...replacement);
      continue;
    }
    out.push(nodes[i] as Record<string, unknown>);
  }
  return mergeAdjacentText(out);
}

function resolveAiInlineReplacement(
  changeType: string,
  changeProps: Record<string, unknown>,
  mode: AiDiffActionMode
): NoteInlineContentLike[] {
  const replacement: NoteInlineContentLike[] = [];

  if (changeType === 'ai-diff') {
    const nextText =
      mode === 'accept'
        ? getPropString(changeProps, 'replace')
        : getPropString(changeProps, 'origin');
    if (nextText) replacement.push(toTextInline(nextText));
  } else if (changeType === 'ai-add') {
    const text = getPropString(changeProps, 'text');
    if (mode === 'accept' && text) replacement.push(toTextInline(text));
  } else if (changeType === 'ai-delete') {
    const text = getPropString(changeProps, 'text');
    if (mode === 'discard' && text) replacement.push(toTextInline(text));
  } else if (changeType === 'ai-link-add') {
    const text = getPropString(changeProps, 'text');
    const href = getPropString(changeProps, 'href');
    if (mode === 'accept' && (text || href)) replacement.push(toLinkInline(text, href));
  } else if (changeType === 'ai-link-delete') {
    const text = getPropString(changeProps, 'text');
    const href = getPropString(changeProps, 'href');
    if (mode === 'discard' && (text || href)) replacement.push(toLinkInline(text, href));
  }

  return replacement;
}

function clearAiDiffProps(props: Record<string, unknown>): Record<string, unknown> {
  return {
    ...props,
    aiDiffType: '',
    aiDiffKey: '',
    aiDiffOrigin: '',
    aiDiffReplace: '',
  };
}

export function applyAiDiffActionToProps(
  props: unknown,
  mode: AiDiffActionMode
): AiDiffPropsActionResult {
  if (!isRecord(props)) return { kind: 'none' };

  const aiDiffType = getPropString(props, 'aiDiffType');
  if (!AI_DIFF_PROP_TYPES.has(aiDiffType)) return { kind: 'none' };

  const baseProps = clearAiDiffProps(props);
  const origin = getPropString(props, 'aiDiffOrigin');
  const replace = getPropString(props, 'aiDiffReplace');

  if (aiDiffType === 'create') {
    if (mode === 'discard') return { kind: 'remove' };
    return { kind: 'update', props: { ...baseProps, expression: replace } };
  }

  if (aiDiffType === 'delete') {
    if (mode === 'accept') return { kind: 'remove' };
    return { kind: 'update', props: { ...baseProps, expression: origin } };
  }

  return {
    kind: 'update',
    props: {
      ...baseProps,
      expression: mode === 'accept' ? replace : origin,
    },
  };
}

export function applyAllAiDiffActionsToContent(
  content: unknown,
  mode: AiDiffActionMode
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    const type = getType(node);
    const props = getProps(node) ?? {};

    if (type && AI_DIFF_INLINE_TYPES.has(type)) {
      changed = true;
      out.push(...resolveAiInlineReplacement(type, props, mode));
      continue;
    }

    if (type === 'inlineMath') {
      const propsAction = applyAiDiffActionToProps(props, mode);
      if (propsAction.kind === 'remove') {
        changed = true;
        continue;
      }
      if (propsAction.kind === 'update') {
        changed = true;
        out.push({
          ...(node as Record<string, unknown>),
          props: propsAction.props,
        });
        continue;
      }
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? mergeAdjacentText(out) : null;
}

export function editAiLinkInlineContentForKey(
  content: unknown,
  key: string,
  payload: { text: string; href: string }
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    const type = getType(node);
    const props = getProps(node) ?? {};
    const nodeKey = getPropString(props, 'key');

    if ((type === 'ai-link-add' || type === 'ai-link-delete') && nodeKey === key) {
      changed = true;
      out.push({
        ...(node as Record<string, unknown>),
        props: {
          ...props,
          text: payload.text,
          href: payload.href,
        },
      });
      continue;
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? out : null;
}

export function clearAiLinkInlineContentForKey(
  content: unknown,
  key: string
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    const type = getType(node);
    const props = getProps(node) ?? {};
    const nodeKey = getPropString(props, 'key');

    if ((type === 'ai-link-add' || type === 'ai-link-delete') && nodeKey === key) {
      changed = true;
      const text = getPropString(props, 'text');
      out.push({
        type: type === 'ai-link-add' ? 'ai-add' : 'ai-delete',
        props: {
          text,
          key,
        },
      });
      continue;
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? mergeAdjacentText(out) : null;
}

/** True when there is no visible text and no remaining AI diff / add / delete nodes. */
export function isInlineContentEffectivelyEmpty(content: unknown): boolean {
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;
  for (const n of content) {
    const t = getType(n);
    if (
      t === 'ai-diff' ||
      t === 'ai-add' ||
      t === 'ai-delete' ||
      t === 'ai-link-add' ||
      t === 'ai-link-delete'
    ) {
      return false;
    }
    if (t === 'text') {
      if (getText(n).trim() !== '') return false;
      continue;
    }
    return false;
  }
  return true;
}

function mergeAdjacentText(nodes: readonly NoteInlineContentLike[]): NoteInlineContentLike[] {
  const merged: NoteInlineContentLike[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (getType(last) === 'text' && getType(node) === 'text') {
      const lastText = getText(last);
      const nextText = getText(node);
      merged[merged.length - 1] = toTextInline(lastText + nextText);
      continue;
    }
    merged.push(node);
  }
  return merged;
}
