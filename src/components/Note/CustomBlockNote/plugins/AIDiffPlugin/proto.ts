import type { AiGeneratedBlock } from './patch';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

type AiDiffChangeType = 'edit' | 'create' | 'delete';

type TextInlineContent = {
  type: 'text';
  text: string;
  styles: Record<string, string>;
};

type AiGeneratedInlineCreate = {
  type: 'AI-Create';
  text: string;
  styles: Record<string, string>;
};

type AiGeneratedInlineDelete = {
  type: 'AI-Delete';
  text: string;
  styles: Record<string, string>;
};

type AiGeneratedInlineEdit = {
  type: 'AI-Edit';
  old_text: string;
  new_text: string;
  styles: Record<string, string>;
};

type AiGeneratedInlineMath = {
  type: 'inlineMath';
  props: Record<string, JsonValue>;
};

type AiGeneratedInlineLink = {
  type: 'link';
  href: string;
  content: TextInlineContent[];
  aiDiffType?: 'create' | 'delete';
};

type AiGeneratedInlineContent =
  | TextInlineContent
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit
  | AiGeneratedInlineMath
  | AiGeneratedInlineLink;

type ProtoInlineKind = 'text' | 'inlineMath' | 'link' | 'unknown';

export interface AiDiffProtoBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  'AI-content'?: unknown;
  children?: AiDiffProtoBlock[];
}

export type AiDiffProtoTransformResult =
  | { ok: true; blocks: AiGeneratedBlock[] }
  | { ok: false; reason: string; fallbackBlocks: unknown[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toStringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function isJsonValue(v: unknown): v is JsonValue {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (!isRecord(v)) return false;
  return Object.values(v).every(isJsonValue);
}

function toJsonValue(v: unknown): JsonValue | undefined {
  if (isJsonValue(v)) return v;
  return undefined;
}

function toJsonProps(v: unknown): Record<string, JsonValue> {
  if (!isRecord(v)) return {};
  const out: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(v)) {
    const jsonValue = toJsonValue(value);
    if (jsonValue !== undefined) {
      out[key] = jsonValue;
    }
  }
  return out;
}

function toStringRecord(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(v)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

function getAiContent(block: Record<string, unknown>): unknown {
  return Object.prototype.hasOwnProperty.call(block, 'AI-content')
    ? block['AI-content']
    : block['content'];
}

function asInlineArray(content: unknown): unknown[] {
  return Array.isArray(content) ? content : [];
}

function getInlineKind(item: unknown): ProtoInlineKind {
  if (!isRecord(item)) return 'unknown';
  const type = item['type'];
  if (type === 'text') return 'text';
  if (type === 'inlineMath') return 'inlineMath';
  if (type === 'link') return 'link';
  return 'unknown';
}

function isAtomInline(item: unknown): boolean {
  const kind = getInlineKind(item);
  return kind === 'inlineMath' || kind === 'link';
}

function getTextInlineText(item: unknown): string {
  if (!isRecord(item)) return '';
  return toStringOrEmpty(item['text']);
}

function getTextInlineStyles(item: unknown): Record<string, string> {
  if (!isRecord(item)) return {};
  return toStringRecord(item['styles']);
}

function getInlineMathProps(item: unknown): Record<string, JsonValue> {
  if (!isRecord(item)) return {};
  return toJsonProps(item['props']);
}

function getInlineMathExpression(item: unknown): string {
  const props = getInlineMathProps(item);
  return toStringOrEmpty(props['expression']);
}

function getLinkHref(item: unknown): string {
  if (!isRecord(item)) return '';
  return toStringOrEmpty(item['href']);
}

function getLinkTextContent(content: unknown): TextInlineContent[] {
  if (!Array.isArray(content)) return [];
  const out: TextInlineContent[] = [];
  for (const child of content) {
    if (getInlineKind(child) !== 'text') continue;
    const text = getTextInlineText(child);
    if (!text) continue;
    out.push({
      type: 'text',
      text,
      styles: getTextInlineStyles(child),
    });
  }
  return out;
}

function getLinkContent(item: unknown): TextInlineContent[] {
  if (!isRecord(item)) return [];
  return getLinkTextContent(item['content']);
}

function getLinkText(item: unknown): string {
  return getLinkContent(item)
    .map((child) => child.text)
    .join('');
}

function toTextInline(text: string, styles: Record<string, string> = {}): TextInlineContent {
  return { type: 'text', text, styles };
}

function toPlainInlineMath(item: unknown): AiGeneratedInlineMath {
  const props = getInlineMathProps(item);
  return {
    type: 'inlineMath',
    props: {
      ...props,
      expression: toStringOrEmpty(props['expression']),
    },
  };
}

function toDiffInlineMath(params: {
  item: unknown;
  diffType: AiDiffChangeType;
  origin: string;
  replace: string;
}): AiGeneratedInlineMath {
  const { item, diffType, origin, replace } = params;
  const props = getInlineMathProps(item);
  return {
    type: 'inlineMath',
    props: {
      ...props,
      expression: replace || origin,
      autoOpenEdit: false,
      aiDiffType: diffType,
      aiDiffOrigin: origin,
      aiDiffReplace: replace,
    },
  };
}

function toPlainLink(item: unknown): AiGeneratedInlineLink {
  return {
    type: 'link',
    href: getLinkHref(item),
    content: getLinkContent(item),
  };
}

function toDiffLink(item: unknown, diffType: 'create' | 'delete'): AiGeneratedInlineLink {
  return {
    ...toPlainLink(item),
    aiDiffType: diffType,
  };
}

function toCreateText(text: string, styles: Record<string, string>): AiGeneratedInlineContent[] {
  return text ? [{ type: 'AI-Create', text, styles }] : [];
}

function toDeleteText(text: string, styles: Record<string, string>): AiGeneratedInlineContent[] {
  return text ? [{ type: 'AI-Delete', text, styles }] : [];
}

function toEditText(
  oldText: string,
  newText: string,
  styles: Record<string, string> = {}
): AiGeneratedInlineContent[] {
  if (!oldText && !newText) return [];
  if (oldText === newText) return oldText ? [toTextInline(oldText, styles)] : [];
  return [{ type: 'AI-Edit', old_text: oldText, new_text: newText, styles }];
}

function mapPlainInline(item: unknown): AiGeneratedInlineContent[] {
  const kind = getInlineKind(item);
  if (kind === 'text') {
    const text = getTextInlineText(item);
    return text ? [toTextInline(text, getTextInlineStyles(item))] : [];
  }
  if (kind === 'inlineMath') {
    return [toPlainInlineMath(item)];
  }
  if (kind === 'link') {
    return [toPlainLink(item)];
  }
  const text = extractVisibleText([item]);
  return text ? [toTextInline(text)] : [];
}

function mapCreateInline(item: unknown): AiGeneratedInlineContent[] {
  const kind = getInlineKind(item);
  if (kind === 'text') {
    return toCreateText(getTextInlineText(item), getTextInlineStyles(item));
  }
  if (kind === 'inlineMath') {
    const expression = getInlineMathExpression(item);
    return [
      toDiffInlineMath({
        item,
        diffType: 'create',
        origin: '',
        replace: expression,
      }),
    ];
  }
  if (kind === 'link') {
    return [toDiffLink(item, 'create')];
  }
  return toCreateText(extractVisibleText([item]), {});
}

function mapDeleteInline(item: unknown): AiGeneratedInlineContent[] {
  const kind = getInlineKind(item);
  if (kind === 'text') {
    return toDeleteText(getTextInlineText(item), getTextInlineStyles(item));
  }
  if (kind === 'inlineMath') {
    const expression = getInlineMathExpression(item);
    return [
      toDiffInlineMath({
        item,
        diffType: 'delete',
        origin: expression,
        replace: '',
      }),
    ];
  }
  if (kind === 'link') {
    return [toDiffLink(item, 'delete')];
  }
  return toDeleteText(extractVisibleText([item]), {});
}

function mapEditInlinePair(oldItem: unknown, newItem: unknown): AiGeneratedInlineContent[] {
  const oldKind = getInlineKind(oldItem);
  const newKind = getInlineKind(newItem);

  if (areInlineItemsEqual(oldItem, newItem)) {
    return mapPlainInline(newItem);
  }

  if (oldKind === 'text' && newKind === 'text') {
    return toEditText(getTextInlineText(oldItem), getTextInlineText(newItem), {
      ...getTextInlineStyles(oldItem),
      ...getTextInlineStyles(newItem),
    });
  }

  if (oldKind === 'inlineMath' && newKind === 'inlineMath') {
    const origin = getInlineMathExpression(oldItem);
    const replace = getInlineMathExpression(newItem);
    return [
      toDiffInlineMath({
        item: newItem,
        diffType: 'edit',
        origin,
        replace,
      }),
    ];
  }

  if (oldKind === 'link' && newKind === 'link') {
    return [...mapDeleteInline(oldItem), ...mapCreateInline(newItem)];
  }

  return [...mapDeleteInline(oldItem), ...mapCreateInline(newItem)];
}

function mapPlainContent(content: readonly unknown[]): AiGeneratedInlineContent[] {
  return content.flatMap(mapPlainInline);
}

function mapCreateContent(content: readonly unknown[]): AiGeneratedInlineContent[] {
  return content.flatMap(mapCreateInline);
}

function mapDeleteContent(content: readonly unknown[]): AiGeneratedInlineContent[] {
  return content.flatMap(mapDeleteInline);
}

function isTextOnlyContent(content: readonly unknown[]): boolean {
  return content.every((item) => getInlineKind(item) === 'text');
}

function hasAtomInline(content: readonly unknown[]): boolean {
  return content.some(isAtomInline);
}

function extractTextSkeleton(content: readonly unknown[]): string {
  return content
    .filter((item) => getInlineKind(item) === 'text')
    .map(getTextInlineText)
    .join('');
}

function extractVisibleText(content: readonly unknown[]): string {
  return content
    .map((item) => {
      const kind = getInlineKind(item);
      if (kind === 'text') return getTextInlineText(item);
      if (kind === 'inlineMath') return getInlineMathExpression(item);
      if (kind === 'link') return getLinkText(item);
      return '';
    })
    .join('');
}

function isInlineContentEmpty(content: readonly unknown[]): boolean {
  if (content.length === 0) return true;
  return extractVisibleText(content).length === 0 && !hasAtomInline(content);
}

function stableJsonStringify(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v !== 'object') return JSON.stringify(v) ?? '';
  if (Array.isArray(v)) {
    return `[${v.map(stableJsonStringify).join(',')}]`;
  }
  if (!isRecord(v)) return '';
  const entries = Object.entries(v).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, value]) => `${JSON.stringify(key)}:${stableJsonStringify(value)}`)
    .join(',')}}`;
}

function normalizeInlineItem(item: unknown): unknown {
  const kind = getInlineKind(item);
  if (kind === 'text') {
    return {
      type: 'text',
      text: getTextInlineText(item),
      styles: getTextInlineStyles(item),
    };
  }
  if (kind === 'inlineMath') {
    const props = getInlineMathProps(item);
    return {
      type: 'inlineMath',
      expression: toStringOrEmpty(props['expression']),
      autoOpenEdit: Boolean(props['autoOpenEdit']),
    };
  }
  if (kind === 'link') {
    return {
      type: 'link',
      href: getLinkHref(item),
      content: getLinkContent(item),
    };
  }
  return item;
}

function areInlineItemsEqual(a: unknown, b: unknown): boolean {
  return (
    stableJsonStringify(normalizeInlineItem(a)) === stableJsonStringify(normalizeInlineItem(b))
  );
}

function areInlineContentsEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => areInlineItemsEqual(item, b[index]));
}

function tryMapSameTextSkeletonContent(
  oldContent: readonly unknown[],
  newContent: readonly unknown[]
): AiGeneratedInlineContent[] | null {
  if (!hasAtomInline(oldContent) && !hasAtomInline(newContent)) return null;
  if (extractTextSkeleton(oldContent) !== extractTextSkeleton(newContent)) return null;

  if (!hasAtomInline(oldContent)) {
    return newContent.flatMap((item) =>
      isAtomInline(item) ? mapCreateInline(item) : mapPlainInline(item)
    );
  }

  if (!hasAtomInline(newContent)) {
    return oldContent.flatMap((item) =>
      isAtomInline(item) ? mapDeleteInline(item) : mapPlainInline(item)
    );
  }

  if (oldContent.length !== newContent.length) return null;

  const out: AiGeneratedInlineContent[] = [];
  for (let idx = 0; idx < oldContent.length; idx += 1) {
    const oldItem = oldContent[idx];
    const newItem = newContent[idx];
    const oldKind = getInlineKind(oldItem);
    const newKind = getInlineKind(newItem);
    if (oldKind === 'text' && newKind === 'text') {
      if (getTextInlineText(oldItem) !== getTextInlineText(newItem)) return null;
      out.push(...mapPlainInline(newItem));
      continue;
    }
    if (isAtomInline(oldItem) && isAtomInline(newItem)) {
      out.push(...mapEditInlinePair(oldItem, newItem));
      continue;
    }
    return null;
  }
  return out;
}

function mapInlineContentByIndex(
  oldContent: readonly unknown[],
  newContent: readonly unknown[]
): AiGeneratedInlineContent[] | null {
  if (oldContent.length !== newContent.length) return null;
  const out: AiGeneratedInlineContent[] = [];
  for (let idx = 0; idx < oldContent.length; idx += 1) {
    out.push(...mapEditInlinePair(oldContent[idx], newContent[idx]));
  }
  return out;
}

function mapInlineSegment(
  oldSegment: readonly unknown[],
  newSegment: readonly unknown[]
): AiGeneratedInlineContent[] {
  if (oldSegment.length === 0) return mapCreateContent(newSegment);
  if (newSegment.length === 0) return mapDeleteContent(oldSegment);

  const byIndex = mapInlineContentByIndex(oldSegment, newSegment);
  if (byIndex) return byIndex;

  return [...mapDeleteContent(oldSegment), ...mapCreateContent(newSegment)];
}

function mapInlineContentByLcs(
  oldContent: readonly unknown[],
  newContent: readonly unknown[]
): AiGeneratedInlineContent[] | null {
  if (!hasAtomInline(oldContent) && !hasAtomInline(newContent)) return null;

  const rows = oldContent.length;
  const cols = newContent.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = areInlineItemsEqual(oldContent[i], newContent[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: AiGeneratedInlineContent[] = [];
  let oldStart = 0;
  let newStart = 0;
  let i = 0;
  let j = 0;

  while (i < rows && j < cols) {
    if (areInlineItemsEqual(oldContent[i], newContent[j])) {
      out.push(
        ...mapInlineSegment(oldContent.slice(oldStart, i), newContent.slice(newStart, j)),
        ...mapPlainInline(newContent[j])
      );
      i += 1;
      j += 1;
      oldStart = i;
      newStart = j;
      continue;
    }

    if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  out.push(...mapInlineSegment(oldContent.slice(oldStart), newContent.slice(newStart)));
  return out;
}

function transformInlineContent(oldRaw: unknown, newRaw: unknown): AiGeneratedInlineContent[] {
  const oldContent = asInlineArray(oldRaw);
  const newContent = asInlineArray(newRaw);

  if (areInlineContentsEqual(oldContent, newContent)) {
    return mapPlainContent(newContent);
  }

  const oldEmpty = isInlineContentEmpty(oldContent);
  const newEmpty = isInlineContentEmpty(newContent);

  if (oldEmpty && newEmpty) return [];
  if (oldEmpty) return mapCreateContent(newContent);
  if (newEmpty) return mapDeleteContent(oldContent);

  const sameTextSkeleton = tryMapSameTextSkeletonContent(oldContent, newContent);
  if (sameTextSkeleton) return sameTextSkeleton;

  if (isTextOnlyContent(oldContent) && isTextOnlyContent(newContent)) {
    return toEditText(extractVisibleText(oldContent), extractVisibleText(newContent));
  }

  const byIndex = mapInlineContentByIndex(oldContent, newContent);
  if (byIndex) return byIndex;

  const bySequence = mapInlineContentByLcs(oldContent, newContent);
  if (bySequence) return bySequence;

  return toEditText(extractVisibleText(oldContent), extractVisibleText(newContent));
}

function extractMathExpression(
  content: unknown,
  props: Record<string, JsonValue>,
  options: { fallbackToProps: boolean } = { fallbackToProps: true }
): string {
  const contentText = extractVisibleText(asInlineArray(content));
  return contentText || (options.fallbackToProps ? toStringOrEmpty(props['expression']) : '');
}

function hasMathAiDiffProps(props: Record<string, JsonValue>): boolean {
  const aiDiffType = toStringOrEmpty(props['aiDiffType']);
  return aiDiffType === 'edit' || aiDiffType === 'create' || aiDiffType === 'delete';
}

function transformMathBlockContent(params: {
  props: Record<string, JsonValue>;
  oldContent: unknown;
  newContent: unknown;
  hasExplicitAiContent: boolean;
}): { props: Record<string, JsonValue>; content: AiGeneratedInlineContent[] } {
  const { props, oldContent, newContent, hasExplicitAiContent } = params;
  if (hasMathAiDiffProps(props)) {
    return {
      props: {
        ...props,
        expression: toStringOrEmpty(props['expression']),
      },
      content: [],
    };
  }

  const origin = extractMathExpression(oldContent, props);
  const replace = extractMathExpression(newContent, props, {
    fallbackToProps: !hasExplicitAiContent,
  });

  if (origin === replace) {
    return {
      props: { ...props, expression: origin },
      content: [],
    };
  }

  if (!origin && replace) {
    return {
      props,
      content: [{ type: 'AI-Create', text: replace, styles: {} }],
    };
  }

  if (origin && !replace) {
    return {
      props,
      content: [{ type: 'AI-Delete', text: origin, styles: {} }],
    };
  }

  return {
    props,
    content: [{ type: 'AI-Edit', old_text: origin, new_text: replace, styles: {} }],
  };
}

function transformProtoBlock(
  raw: unknown,
  fallbackPath: string
): { ok: true; block: AiGeneratedBlock } | { ok: false; reason: string } {
  if (!isRecord(raw)) {
    return { ok: false, reason: `${fallbackPath}: block is not an object` };
  }

  const id = toStringOrEmpty(raw['id']);
  const type = toStringOrEmpty(raw['type']);
  if (!id || !type) {
    return { ok: false, reason: `${fallbackPath}: missing block id or type` };
  }

  const props = toJsonProps(raw['props']);
  const oldContent = raw['content'];
  const newContent = getAiContent(raw);
  const hasExplicitAiContent = Object.prototype.hasOwnProperty.call(raw, 'AI-content');
  const rawChildren = Array.isArray(raw['children']) ? raw['children'] : [];
  const children: AiGeneratedBlock[] = [];

  for (let idx = 0; idx < rawChildren.length; idx += 1) {
    const childResult = transformProtoBlock(rawChildren[idx], `${fallbackPath}.${id}.${idx}`);
    if (!childResult.ok) {
      return childResult;
    }
    children.push(childResult.block);
  }

  if (type === 'math') {
    const math = transformMathBlockContent({ props, oldContent, newContent, hasExplicitAiContent });
    return {
      ok: true,
      block: {
        id,
        type,
        props: math.props,
        content: math.content,
        children,
      },
    };
  }

  return {
    ok: true,
    block: {
      id,
      type,
      props,
      content: transformInlineContent(oldContent, newContent),
      children,
    },
  };
}

export function transformAiDiffProtoBlocks(input: unknown): AiDiffProtoTransformResult {
  if (!Array.isArray(input)) {
    return { ok: false, reason: 'AI diff proto input is not an array', fallbackBlocks: [] };
  }

  const blocks: AiGeneratedBlock[] = [];
  for (let idx = 0; idx < input.length; idx += 1) {
    const result = transformProtoBlock(input[idx], `root.${idx}`);
    if (!result.ok) {
      return { ok: false, reason: result.reason, fallbackBlocks: input };
    }
    blocks.push(result.block);
  }

  return { ok: true, blocks };
}

export function aiProtoBlocksToAiGeneratedBlocks(input: unknown): AiGeneratedBlock[] | null {
  const result = transformAiDiffProtoBlocks(input);
  return result.ok ? result.blocks : null;
}
