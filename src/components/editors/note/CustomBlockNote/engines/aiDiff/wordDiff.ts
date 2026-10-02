export type AiDiffTextSegment = {
  kind: 'equal' | 'delete' | 'insert';
  text: string;
};

export type AiDiffTextHunk = {
  mode: 'outside' | 'hunk';
  segments: AiDiffTextSegment[];
  originFrom: number;
  originTo: number;
  replacementFrom: number;
  replacementTo: number;
};

export interface AiDiffTextConfig {
  highChangeRatio: number;
  maxGapCharacters: number;
  maxGapTokens: number;
  maxMergedCharacters: number;
  maxMatrixCells: number;
  /** 单段可展示的细粒度 hunk 上限，超出则整段对比 */
  maxHunksPerBlock: number;
}

export interface AiDiffTextToken {
  text: string;
  comparisonKey: string;
}

type Token = AiDiffTextToken;
type InternalSegment = AiDiffTextSegment & { tokenCount: number };

function isCjkCodePoint(code: number): boolean {
  return (
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x20000 && code <= 0x2ceaf)
  );
}

function tokenizeFallback(text: string): string[] {
  const tokens: string[] = [];
  let index = 0;
  while (index < text.length) {
    const current = text[index];
    const codePoint = current.codePointAt(0);
    const characterLength = codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
    if (current === '\n') {
      tokens.push(current);
      index += 1;
      continue;
    }
    if (/\s/.test(current)) {
      let end = index + 1;
      while (end < text.length && text[end] !== '\n' && /\s/.test(text[end])) end += 1;
      tokens.push(text.slice(index, end));
      index = end;
      continue;
    }
    if (/[0-9]/.test(current)) {
      let end = index + 1;
      while (end < text.length && /[0-9.]/.test(text[end])) end += 1;
      tokens.push(text.slice(index, end));
      index = end;
      continue;
    }
    if (/[A-Za-z]/.test(current)) {
      let end = index + 1;
      while (end < text.length && /[A-Za-z-]/.test(text[end])) end += 1;
      tokens.push(text.slice(index, end));
      index = end;
      continue;
    }
    if (codePoint !== undefined && isCjkCodePoint(codePoint)) {
      tokens.push(text.slice(index, index + characterLength));
      index += characterLength;
      continue;
    }
    tokens.push(text.slice(index, index + characterLength));
    index += characterLength;
  }
  return tokens;
}

/** 使用运行环境的词法分段器处理中英文；不可用时退化为 ASCII 单词与 CJK 字符。 */
export function tokenizeAiDiffText(text: string, localeHint = 'und'): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(localeHint, { granularity: 'word' });
      const tokens: string[] = [];
      for (const line of text.split(/(\n)/)) {
        if (line === '\n') {
          tokens.push(line);
          continue;
        }
        for (const segment of segmenter.segment(line)) {
          if (segment.segment) tokens.push(segment.segment);
        }
      }
      if (tokens.length > 0 || text.length === 0) return tokens;
    } catch {
      void 0;
    }
  }
  return tokenizeFallback(text);
}

function segment(kind: InternalSegment['kind'], tokens: readonly Token[]): InternalSegment | null {
  if (tokens.length === 0) return null;
  return { kind, text: tokens.map((token) => token.text).join(''), tokenCount: tokens.length };
}

function buildLinearFallback(oldTokens: readonly Token[], newTokens: readonly Token[]) {
  let prefixLength = 0;
  while (
    prefixLength < oldTokens.length &&
    prefixLength < newTokens.length &&
    oldTokens[prefixLength].comparisonKey === newTokens[prefixLength].comparisonKey
  ) {
    prefixLength += 1;
  }
  let suffixLength = 0;
  while (
    suffixLength < oldTokens.length - prefixLength &&
    suffixLength < newTokens.length - prefixLength &&
    oldTokens[oldTokens.length - 1 - suffixLength].comparisonKey ===
      newTokens[newTokens.length - 1 - suffixLength].comparisonKey
  ) {
    suffixLength += 1;
  }

  return [
    segment('equal', oldTokens.slice(0, prefixLength)),
    segment('delete', oldTokens.slice(prefixLength, oldTokens.length - suffixLength)),
    segment('insert', newTokens.slice(prefixLength, newTokens.length - suffixLength)),
    segment('equal', oldTokens.slice(oldTokens.length - suffixLength)),
  ].filter((item): item is InternalSegment => item !== null);
}

function coalesceSegments(segments: readonly InternalSegment[]): InternalSegment[] {
  const result: InternalSegment[] = [];
  for (const current of segments) {
    const previous = result[result.length - 1];
    if (previous?.kind === current.kind) {
      result[result.length - 1] = {
        kind: current.kind,
        text: previous.text + current.text,
        tokenCount: previous.tokenCount + current.tokenCount,
      };
    } else {
      result.push(current);
    }
  }
  return result;
}

function diffTokens(
  oldTokens: readonly Token[],
  newTokens: readonly Token[],
  maxMatrixCells: number
): InternalSegment[] {
  const oldLength = oldTokens.length;
  const newLength = newTokens.length;
  if (oldLength * newLength > maxMatrixCells) {
    return buildLinearFallback(oldTokens, newTokens);
  }

  const matrix: number[][] = Array.from({ length: oldLength + 1 }, () =>
    Array(newLength + 1).fill(0)
  );
  for (let oldIndex = 1; oldIndex <= oldLength; oldIndex += 1) {
    for (let newIndex = 1; newIndex <= newLength; newIndex += 1) {
      matrix[oldIndex][newIndex] =
        oldTokens[oldIndex - 1].comparisonKey === newTokens[newIndex - 1].comparisonKey
          ? matrix[oldIndex - 1][newIndex - 1] + 1
          : Math.max(matrix[oldIndex - 1][newIndex], matrix[oldIndex][newIndex - 1]);
    }
  }

  const reversed: InternalSegment[] = [];
  let oldIndex = oldLength;
  let newIndex = newLength;
  while (oldIndex > 0 || newIndex > 0) {
    if (
      oldIndex > 0 &&
      newIndex > 0 &&
      oldTokens[oldIndex - 1].comparisonKey === newTokens[newIndex - 1].comparisonKey
    ) {
      reversed.push({
        kind: 'equal',
        text: oldTokens[oldIndex - 1].text,
        tokenCount: 1,
      });
      oldIndex -= 1;
      newIndex -= 1;
    } else if (
      newIndex > 0 &&
      (oldIndex === 0 || matrix[oldIndex][newIndex - 1] >= matrix[oldIndex - 1][newIndex])
    ) {
      reversed.push({
        kind: 'insert',
        text: newTokens[newIndex - 1].text,
        tokenCount: 1,
      });
      newIndex -= 1;
    } else {
      reversed.push({
        kind: 'delete',
        text: oldTokens[oldIndex - 1].text,
        tokenCount: 1,
      });
      oldIndex -= 1;
    }
  }
  return coalesceSegments(reversed.reverse());
}

function isSemanticBoundary(text: string): boolean {
  return /[\n。！？；，：.!?;,]/.test(text);
}

function canMergeAcrossEqual(segment: InternalSegment, config: AiDiffTextConfig): boolean {
  return (
    segment.kind === 'equal' &&
    segment.text.length <= config.maxGapCharacters &&
    segment.tokenCount <= config.maxGapTokens &&
    !isSemanticBoundary(segment.text)
  );
}

function visibleLength(segments: readonly InternalSegment[]): number {
  return segments.reduce((total, item) => total + item.text.length, 0);
}

function mergeNearbyChanges(
  segments: readonly InternalSegment[],
  config: AiDiffTextConfig
): Array<{ mode: 'outside' | 'hunk'; segments: InternalSegment[] }> {
  const result: Array<{ mode: 'outside' | 'hunk'; segments: InternalSegment[] }> = [];
  let index = 0;
  while (index < segments.length) {
    if (segments[index].kind === 'equal') {
      const current = result[result.length - 1];
      if (current?.mode === 'outside') current.segments.push(segments[index]);
      else result.push({ mode: 'outside', segments: [segments[index]] });
      index += 1;
      continue;
    }

    const hunk: InternalSegment[] = [];
    while (index < segments.length && segments[index].kind !== 'equal') {
      hunk.push(segments[index]);
      index += 1;
    }
    while (
      index + 1 < segments.length &&
      canMergeAcrossEqual(segments[index], config) &&
      segments[index + 1].kind !== 'equal'
    ) {
      const gap = segments[index];
      const nextChanges: InternalSegment[] = [];
      let cursor = index + 1;
      while (cursor < segments.length && segments[cursor].kind !== 'equal') {
        nextChanges.push(segments[cursor]);
        cursor += 1;
      }
      if (visibleLength([...hunk, gap, ...nextChanges]) > config.maxMergedCharacters) break;
      hunk.push(gap, ...nextChanges);
      index = cursor;
    }
    result.push({ mode: 'hunk', segments: coalesceSegments(hunk) });
  }
  return result;
}

function changedTokenRatio(segments: readonly InternalSegment[]): number {
  const counts = segments.reduce(
    (result, current) => {
      if (current.kind === 'equal') result.total += current.tokenCount * 2;
      else {
        result.total += current.tokenCount;
        result.changed += current.tokenCount;
      }
      return result;
    },
    { total: 0, changed: 0 }
  );
  return counts.total === 0 ? 0 : counts.changed / counts.total;
}

/**
 * 生成词级差异，并以句号、分号、逗号和换行为边界合并相邻改动。
 * 大面积重写或超长文本会退化为公共前后缀 + 单个中段 hunk，避免碎片化和二次方计算。
 */
export function diffAiTextTokens(
  originTokens: readonly AiDiffTextToken[],
  replacementTokens: readonly AiDiffTextToken[],
  config: AiDiffTextConfig
): AiDiffTextHunk[] {
  let segments = diffTokens(originTokens, replacementTokens, config.maxMatrixCells);
  const hasHighChangeRatio = changedTokenRatio(segments) > config.highChangeRatio;
  if (hasHighChangeRatio) {
    segments = buildLinearFallback(originTokens, replacementTokens);
  }
  let originOffset = 0;
  let replacementOffset = 0;
  return mergeNearbyChanges(segments, config).map((hunk) => {
    const originFrom = originOffset;
    const replacementFrom = replacementOffset;
    for (const current of hunk.segments) {
      if (current.kind !== 'insert') originOffset += current.text.length;
      if (current.kind !== 'delete') replacementOffset += current.text.length;
    }
    return {
      mode: hunk.mode,
      segments: hunk.segments.map(({ kind, text }) => ({ kind, text })),
      originFrom,
      originTo: originOffset,
      replacementFrom,
      replacementTo: replacementOffset,
    };
  });
}

/** 为纯文本构建词级 token 后生成差异。 */
export function diffAiText(
  origin: string,
  replacement: string,
  config: AiDiffTextConfig
): AiDiffTextHunk[] {
  const createTokens = (text: string) =>
    tokenizeAiDiffText(text).map((token) => ({ text: token, comparisonKey: token }));
  return diffAiTextTokens(createTokens(origin), createTokens(replacement), config);
}
