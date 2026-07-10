/**
 * AI-Edit 词级 diff：分词 → LCS 序列对齐 → hunk 合并 → 分 hunk 渲染。
 */

// 分词后最小文本片段
export type AiEditToken = {
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type DiffSegment =
  | {
      readonly kind: 'equal';
      readonly oldTokens: readonly AiEditToken[];
      readonly newTokens: readonly AiEditToken[];
    }
  | { readonly kind: 'delete'; readonly oldTokens: readonly AiEditToken[] }
  | { readonly kind: 'insert'; readonly newTokens: readonly AiEditToken[] };

// 合并策略参数配置
export type MergeDiffHunksOptions = {
  readonly maxGapChars: number;
  readonly maxGapTokens: number;
  readonly breakOnNewline: boolean;
  readonly breakOnSentenceEnd: boolean;
  readonly breakOnClauseBoundary: boolean;
  readonly maxMergedLength: number;
  readonly preferSemanticBoundary: boolean;
};

// 默认的 hunk 合并参数
export const DEFAULT_MERGE_DIFF_HUNKS_OPTIONS: MergeDiffHunksOptions = {
  maxGapChars: 5,
  maxGapTokens: 3,
  breakOnNewline: true,
  breakOnSentenceEnd: true,
  breakOnClauseBoundary: true,
  maxMergedLength: 100,
  preferSemanticBoundary: true,
};

// 合并后的hunk
export type MergedHunk =
  | { readonly mode: 'outside'; readonly segments: readonly DiffSegment[] }
  | { readonly mode: 'hunk'; readonly segments: readonly DiffSegment[] };

// 判断句末是否为标点
function isSentenceEndChar(ch: string): boolean {
  return '。！？；'.includes(ch) || '.?!'.includes(ch);
}

// 判断文本段落末尾是否为句末标点
function segmentEndsWithSentencePunctuation(text: string): boolean {
  const t = text.trimEnd();
  if (t.length === 0) return false;
  return isSentenceEndChar(t[t.length - 1]);
}

// 判断文本是否包含分句边界标点
function containsClauseBoundary(text: string): boolean {
  return /[，,；;：:]/.test(text);
}

// 将 token 列表拼回文本
function tokensText(tokens: readonly AiEditToken[]): string {
  return tokens.map((t) => t.value).join('');
}

// equal间隔段是否阻止合并（false则允许合并，true则不合并）
function equalGapViolatesMerge(
  oldToks: readonly AiEditToken[],
  newToks: readonly AiEditToken[],
  options: MergeDiffHunksOptions
): boolean {
  const s = tokensText(oldToks);
  if (options.breakOnNewline && (s.includes('\n') || tokensText(newToks).includes('\n')))
    return true;
  if (s.length > options.maxGapChars || oldToks.length > options.maxGapTokens) return true;
  if (options.preferSemanticBoundary) {
    if (options.breakOnSentenceEnd && segmentEndsWithSentencePunctuation(s)) return true;
    if (options.breakOnClauseBoundary && containsClauseBoundary(s)) return true;
  }
  return false;
}

// 计算一个 diff segment 的可见长度（equal 取old和new中较长的，delete/insert 取自身）
function segmentVisibleLength(seg: DiffSegment): number {
  if (seg.kind === 'equal')
    return Math.max(tokensText(seg.oldTokens).length, tokensText(seg.newTokens).length);
  if (seg.kind === 'delete') return tokensText(seg.oldTokens).length;
  return tokensText(seg.newTokens).length;
}

// 计算一系列 diff segments 的总可见长度
function totalVisibleLength(segs: readonly DiffSegment[]): number {
  return segs.reduce((sum, seg) => sum + segmentVisibleLength(seg), 0);
}

// 基于 Intl.Segmenter 的分词
// 把原始文本切分成 AiEditToken 列表，保留每个 token 在原文中的位置
// `\n`单独成一个 token，以便 diff 时能正确处理跨行变更
export function tokenizeForAiEdit(text: string, localeHint?: string): AiEditToken[] {
  const out: AiEditToken[] = [];
  let base = 0;
  while (base < text.length) {
    if (text[base] === '\n') {
      out.push({ value: '\n', start: base, end: base + 1 });
      base += 1;
      continue;
    }
    const nl = text.indexOf('\n', base);
    const lineEnd = nl === -1 ? text.length : nl;
    const chunk = text.slice(base, lineEnd);
    if (chunk.length > 0) out.push(...tokenizeChunk(chunk, base, localeHint));
    base = lineEnd;
  }
  return out;
}

function tokenizeChunk(chunk: string, chunkOffset: number, localeHint?: string): AiEditToken[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const seg = new Intl.Segmenter(localeHint ?? 'und', { granularity: 'word' });
      const out: AiEditToken[] = [];
      for (const s of seg.segment(chunk)) {
        if (s.segment.length === 0) continue;
        const start = chunkOffset + s.index;
        out.push({ value: s.segment, start, end: start + s.segment.length });
      }
      if (out.length > 0) return out;
    } catch {
      void 0;
    }
  }
  return tokenizeFallbackAsciiCjk(chunk, chunkOffset);
}

function isCjkCodePoint(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2ceaf)
  );
}

function tokenizeFallbackAsciiCjk(chunk: string, offset: number): AiEditToken[] {
  const out: AiEditToken[] = [];
  let i = 0;
  while (i < chunk.length) {
    const c = chunk[i];
    const cp = c.codePointAt(0);
    const cLen = cp !== undefined && cp > 0xffff ? 2 : 1;

    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < chunk.length && /\s/.test(chunk[j])) j += 1;
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j });
      i = j;
      continue;
    }
    if (isAsciiDigit(c)) {
      let j = i + 1;
      while (j < chunk.length && (isAsciiDigit(chunk[j]) || chunk[j] === '.')) j += 1;
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j });
      i = j;
      continue;
    }
    if (isAsciiLetter(c)) {
      let j = i + 1;
      while (j < chunk.length) {
        if (chunk[j] === '-' && j + 1 < chunk.length && isAsciiLetter(chunk[j + 1])) {
          j += 2;
          continue;
        }
        if (isAsciiLetter(chunk[j])) {
          j += 1;
          continue;
        }
        break;
      }
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j });
      i = j;
      continue;
    }
    if (cp !== undefined && isCjkCodePoint(cp)) {
      out.push({ value: chunk.slice(i, i + cLen), start: offset + i, end: offset + i + cLen });
      i += cLen;
      continue;
    }
    out.push({ value: c, start: offset + i, end: offset + i + 1 });
    i += 1;
  }
  return out;
}

function isAsciiDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isAsciiLetter(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

type RawOp = {
  readonly k: 'equal' | 'delete' | 'insert';
  readonly oi: number;
  readonly ni: number;
};

export function diffTokens(
  oldTokens: readonly AiEditToken[],
  newTokens: readonly AiEditToken[]
): DiffSegment[] {
  const n = oldTokens.length;
  const m = newTokens.length;
  const a = oldTokens.map((t) => t.value);
  const b = newTokens.map((t) => t.value);
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: RawOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ k: 'equal', oi: i - 1, ni: j - 1 });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ k: 'insert', oi: i - 1, ni: j - 1 });
      j -= 1;
    } else {
      raw.push({ k: 'delete', oi: i - 1, ni: j - 1 });
      i -= 1;
    }
  }
  raw.reverse();

  const segments: DiffSegment[] = [];
  let p = 0;
  while (p < raw.length) {
    const k = raw[p].k;
    if (k === 'equal') {
      const oStart = raw[p].oi;
      const nStart = raw[p].ni;
      let len = 0;
      while (p < raw.length && raw[p].k === 'equal') {
        len += 1;
        p += 1;
      }
      segments.push({
        kind: 'equal',
        oldTokens: oldTokens.slice(oStart, oStart + len),
        newTokens: newTokens.slice(nStart, nStart + len),
      });
      continue;
    }
    if (k === 'delete') {
      const oStart = raw[p].oi;
      let len = 0;
      while (p < raw.length && raw[p].k === 'delete') {
        len += 1;
        p += 1;
      }
      segments.push({ kind: 'delete', oldTokens: oldTokens.slice(oStart, oStart + len) });
      continue;
    }
    const nStart = raw[p].ni;
    let len = 0;
    while (p < raw.length && raw[p].k === 'insert') {
      len += 1;
      p += 1;
    }
    segments.push({ kind: 'insert', newTokens: newTokens.slice(nStart, nStart + len) });
  }
  return segments;
}

function coalesceSegments(segs: readonly DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(s);
      continue;
    }
    if (s.kind === 'equal' && prev.kind === 'equal') {
      out[out.length - 1] = {
        kind: 'equal',
        oldTokens: [...prev.oldTokens, ...s.oldTokens],
        newTokens: [...prev.newTokens, ...s.newTokens],
      };
      continue;
    }
    if (s.kind === 'delete' && prev.kind === 'delete') {
      out[out.length - 1] = { kind: 'delete', oldTokens: [...prev.oldTokens, ...s.oldTokens] };
      continue;
    }
    if (s.kind === 'insert' && prev.kind === 'insert') {
      out[out.length - 1] = { kind: 'insert', newTokens: [...prev.newTokens, ...s.newTokens] };
      continue;
    }
    out.push(s);
  }
  return out;
}

function splitIntoMergeBlocks(
  segments: readonly DiffSegment[]
): Array<{ kind: 'equal'; seg: DiffSegment } | { kind: 'dirty'; parts: readonly DiffSegment[] }> {
  const blocks: Array<
    { kind: 'equal'; seg: DiffSegment } | { kind: 'dirty'; parts: readonly DiffSegment[] }
  > = [];
  let i = 0;
  while (i < segments.length) {
    const s = segments[i];
    if (s.kind === 'equal') {
      blocks.push({ kind: 'equal', seg: s });
      i += 1;
      continue;
    }
    const parts: DiffSegment[] = [];
    while (i < segments.length && segments[i].kind !== 'equal') {
      parts.push(segments[i]);
      i += 1;
    }
    blocks.push({ kind: 'dirty', parts: coalesceSegments(parts) });
  }
  return blocks;
}

function coalesceAdjacentOutsideHunks(hunks: readonly MergedHunk[]): MergedHunk[] {
  const res: MergedHunk[] = [];
  for (const h of hunks) {
    const last = res[res.length - 1];
    if (last && last.mode === 'outside' && h.mode === 'outside') {
      res[res.length - 1] = { mode: 'outside', segments: [...last.segments, ...h.segments] };
    } else {
      res.push(h);
    }
  }
  return res;
}

export function mergeDiffHunks(
  segments: readonly DiffSegment[],
  options: MergeDiffHunksOptions = DEFAULT_MERGE_DIFF_HUNKS_OPTIONS
): MergedHunk[] {
  if (segments.length === 0) return [];
  const blocks = splitIntoMergeBlocks(segments);
  const out: MergedHunk[] = [];
  let k = 0;
  while (k < blocks.length) {
    const b = blocks[k];
    if (b.kind === 'equal') {
      out.push({ mode: 'outside', segments: [b.seg] });
      k += 1;
      continue;
    }
    let parts: DiffSegment[] = [...b.parts];
    let visibleLen = totalVisibleLength(parts);
    k += 1;
    while (k + 1 < blocks.length && blocks[k].kind === 'equal' && blocks[k + 1].kind === 'dirty') {
      const gapBlock = blocks[k];
      const nextDirtyBlock = blocks[k + 1];
      if (gapBlock.kind !== 'equal' || nextDirtyBlock.kind !== 'dirty') break;
      const gap = gapBlock.seg;
      if (gap.kind !== 'equal' || equalGapViolatesMerge(gap.oldTokens, gap.newTokens, options))
        break;
      const nextVisibleLen =
        visibleLen + segmentVisibleLength(gap) + totalVisibleLength(nextDirtyBlock.parts);
      if (nextVisibleLen > options.maxMergedLength) break;
      parts = [...parts, gap, ...nextDirtyBlock.parts];
      visibleLen = nextVisibleLen;
      k += 2;
    }
    out.push({ mode: 'hunk', segments: coalesceSegments(parts) });
  }
  return coalesceAdjacentOutsideHunks(out);
}

type HunkSpanRole = 'plain' | 'delete' | 'add';

type HunkSpan = {
  readonly role: HunkSpanRole;
  readonly text: string;
};

function buildHunkSpans(hunkSegments: readonly DiffSegment[]): {
  spans: HunkSpan[];
  hasDelete: boolean;
  hasAdd: boolean;
} {
  const spans: HunkSpan[] = [];
  let hasDelete = false;
  let hasAdd = false;

  for (const s of hunkSegments) {
    if (s.kind === 'equal') {
      spans.push({ role: 'plain', text: tokensText(s.oldTokens) });
    } else if (s.kind === 'delete') {
      spans.push({ role: 'delete', text: tokensText(s.oldTokens) });
      hasDelete = true;
    } else {
      spans.push({ role: 'add', text: tokensText(s.newTokens) });
      hasAdd = true;
    }
  }

  return { spans, hasDelete, hasAdd };
}

function computeDiffData(
  origin: string,
  replace: string,
  mergeOpt: MergeDiffHunksOptions
): { merged: MergedHunk[]; highChangeRatio: boolean } {
  const oldT = tokenizeForAiEdit(origin);
  const newT = tokenizeForAiEdit(replace);
  const totalTokens = oldT.length + newT.length;
  const segments = diffTokens(oldT, newT);

  if (totalTokens > 0) {
    let deleteCount = 0;
    let insertCount = 0;
    for (const s of segments) {
      if (s.kind === 'delete') deleteCount += s.oldTokens.length;
      else if (s.kind === 'insert') insertCount += s.newTokens.length;
    }
    if ((deleteCount + insertCount) / totalTokens > 0.6) {
      return { merged: [], highChangeRatio: true };
    }
  }

  return { merged: mergeDiffHunks(segments, mergeOpt), highChangeRatio: false };
}

export type AiEditJsonUnit =
  | { readonly type: 'plain'; readonly text: string }
  | { readonly type: 'edit'; readonly origin: string; readonly replace: string };

export type BuildAiEditJsonUnitsOptions = {
  readonly mergeOptions?: MergeDiffHunksOptions;
};

function comparableBoundaryText(value: string): string {
  return value
    .replace(/\s+([.,;:!?，。；：！？、])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function stripDuplicatedTrailingBoundary(candidate: string, boundary: string): string {
  const comparableBoundary = comparableBoundaryText(boundary);
  if (comparableBoundary.length < 16) {
    return candidate;
  }

  if (candidate.endsWith(boundary)) {
    const rest = candidate.slice(0, -boundary.length).replace(/[\s.,;:!?，。；：！？、]+$/, '');
    return rest.trim() ? rest : candidate;
  }

  const minStart = Math.max(0, candidate.length - boundary.length - 32);
  for (let start = minStart; start < candidate.length; start += 1) {
    if (comparableBoundaryText(candidate.slice(start)) !== comparableBoundary) {
      continue;
    }
    const rest = candidate.slice(0, start).replace(/[\s.,;:!?，。；：！？、]+$/, '');
    return rest.trim() ? rest : candidate;
  }

  return candidate;
}

function buildHighChangeRatioUnits(origin: string, replace: string): AiEditJsonUnit[] {
  const oldTokens = tokenizeForAiEdit(origin);
  const newTokens = tokenizeForAiEdit(replace);
  let prefixTokenCount = 0;
  while (
    prefixTokenCount < oldTokens.length &&
    prefixTokenCount < newTokens.length &&
    oldTokens[prefixTokenCount].value === newTokens[prefixTokenCount].value
  ) {
    prefixTokenCount += 1;
  }

  let suffixTokenCount = 0;
  while (
    suffixTokenCount < oldTokens.length - prefixTokenCount &&
    suffixTokenCount < newTokens.length - prefixTokenCount
  ) {
    const oldToken = oldTokens[oldTokens.length - 1 - suffixTokenCount];
    const newToken = newTokens[newTokens.length - 1 - suffixTokenCount];
    if (oldToken.value !== newToken.value) {
      break;
    }
    suffixTokenCount += 1;
  }

  const oldPrefixEnd =
    prefixTokenCount > 0 ? oldTokens[prefixTokenCount - 1].end : 0;
  const newPrefixEnd =
    prefixTokenCount > 0 ? newTokens[prefixTokenCount - 1].end : 0;
  const oldSuffixStart =
    suffixTokenCount > 0 ? oldTokens[oldTokens.length - suffixTokenCount].start : origin.length;
  const newSuffixStart =
    suffixTokenCount > 0 ? newTokens[newTokens.length - suffixTokenCount].start : replace.length;

  const prefix = origin.slice(0, oldPrefixEnd);
  const suffix = origin.slice(oldSuffixStart);
  const originMiddle = origin.slice(oldPrefixEnd, oldSuffixStart);
  const replaceMiddle = stripDuplicatedTrailingBoundary(
    replace.slice(newPrefixEnd, newSuffixStart),
    suffix
  );
  const units: AiEditJsonUnit[] = [];

  if (prefix) {
    units.push({ type: 'plain', text: prefix });
  }
  if (originMiddle || replaceMiddle) {
    units.push({ type: 'edit', origin: originMiddle, replace: replaceMiddle });
  }
  if (suffix) {
    units.push({ type: 'plain', text: suffix });
  }

  return units.length > 0 ? units : [{ type: 'edit', origin, replace }];
}

const DISPLAY_EDIT_MERGE_MAX_VISIBLE_LENGTH = 600;
const DISPLAY_EDIT_MERGE_MAX_BRIDGE_CHARS = 16;
const DISPLAY_EDIT_MERGE_MAX_BRIDGE_TOKENS = 4;

const WEAK_BRIDGE_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'for',
  'he',
  'her',
  'his',
  'in',
  'is',
  'it',
  'its',
  'not',
  'of',
  'on',
  'or',
  'she',
  'that',
  'the',
  'their',
  'they',
  'this',
  'to',
  'was',
  'were',
  'with',
]);

function unitVisibleLength(unit: AiEditJsonUnit): number {
  if (unit.type === 'plain') return unit.text.length;
  return Math.max(unit.origin.length, unit.replace.length);
}

function isPunctuationOrWhitespace(text: string): boolean {
  return /^[\s.,;:!?，。；：！？、'"“”‘’()[\]{}<>《》\-—–]+$/.test(text);
}

function isWeakLexicalBridge(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > DISPLAY_EDIT_MERGE_MAX_BRIDGE_TOKENS) return false;
  return words.every((word) => WEAK_BRIDGE_WORDS.has(word) || isPunctuationOrWhitespace(word));
}

function isWeakPlainBridge(text: string): boolean {
  if (text.includes('\n')) return false;
  if (text.length > DISPLAY_EDIT_MERGE_MAX_BRIDGE_CHARS) return false;
  if (tokenizeForAiEdit(text).length > DISPLAY_EDIT_MERGE_MAX_BRIDGE_TOKENS) return false;
  return isPunctuationOrWhitespace(text) || isWeakLexicalBridge(text);
}

function mergeAdjacentDisplayEditUnits(units: readonly AiEditJsonUnit[]): AiEditJsonUnit[] {
  const merged: AiEditJsonUnit[] = [];
  let index = 0;

  while (index < units.length) {
    const first = units[index];
    if (first.type !== 'edit') {
      merged.push(first);
      index += 1;
      continue;
    }

    let origin = first.origin;
    let replace = first.replace;
    let visibleLength = unitVisibleLength(first);
    index += 1;

    while (index < units.length) {
      const bridge = units[index];
      const next = units[index + 1];
      if (bridge?.type === 'edit') {
        const nextVisibleLength = visibleLength + unitVisibleLength(bridge);
        if (nextVisibleLength > DISPLAY_EDIT_MERGE_MAX_VISIBLE_LENGTH) break;
        origin += bridge.origin;
        replace += bridge.replace;
        visibleLength = nextVisibleLength;
        index += 1;
        continue;
      }
      if (bridge?.type !== 'plain' || next?.type !== 'edit') break;
      if (!isWeakPlainBridge(bridge.text)) break;
      const nextVisibleLength =
        visibleLength + unitVisibleLength(bridge) + unitVisibleLength(next);
      if (nextVisibleLength > DISPLAY_EDIT_MERGE_MAX_VISIBLE_LENGTH) break;
      origin += bridge.text + next.origin;
      replace += bridge.text + next.replace;
      visibleLength = nextVisibleLength;
      index += 2;
    }

    merged.push({ type: 'edit', origin, replace });
  }

  return merged;
}

export function buildAiEditJsonUnits(
  origin: string,
  replace: string,
  options?: BuildAiEditJsonUnitsOptions
): AiEditJsonUnit[] {
  const mergeOpt = options?.mergeOptions ?? DEFAULT_MERGE_DIFF_HUNKS_OPTIONS;
  const { merged, highChangeRatio } = computeDiffData(origin, replace, mergeOpt);

  if (highChangeRatio) {
    return buildHighChangeRatioUnits(origin, replace);
  }

  const units: AiEditJsonUnit[] = [];
  for (const h of merged) {
    if (h.mode === 'outside') {
      const text = h.segments
        .map((s) => (s.kind === 'equal' ? tokensText(s.newTokens) : ''))
        .join('');
      if (text) units.push({ type: 'plain', text });
      continue;
    }

    const { spans: rawSpans } = buildHunkSpans(h.segments);
    const originText = rawSpans
      .filter((s) => s.role !== 'add')
      .map((s) => s.text)
      .join('');
    const replaceText = rawSpans
      .filter((s) => s.role !== 'delete')
      .map((s) => s.text)
      .join('');
    units.push({ type: 'edit', origin: originText, replace: replaceText });
  }
  return mergeAdjacentDisplayEditUnits(units);
}
