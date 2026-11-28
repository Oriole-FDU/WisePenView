import {
  createIncremarkParser,
  type IncremarkParser,
  type IncrementalUpdate,
  type ParsedBlock,
} from '@incremark/core';

const MARKDOWN_UNDERLINE_PATTERN = /(?<![_\\])__(?=\S)([^\n]*?\S)__(?!_)/g;

/** 用内部链接保留双下划线语义，避免与解析器的粗体节点混淆。 */
export const MARKDOWN_UNDERLINE_URL = 'wisepen-internal:markdown-underline';

function normalizeMarkdownUnderline(content: string): string {
  return content.replace(
    MARKDOWN_UNDERLINE_PATTERN,
    (_, value: string) => `[${value}](${MARKDOWN_UNDERLINE_URL})`
  );
}

export interface MarkdownRenderContext {
  definitions: IncrementalUpdate['definitions'];
  footnoteDefinitions: IncrementalUpdate['footnoteDefinitions'];
  footnoteReferenceOrder: string[];
}

interface MarkdownSnapshot {
  blocks: ParsedBlock[];
  renderContext: MarkdownRenderContext;
}

interface MarkdownRuntime {
  parser: IncremarkParser;
  content: string;
  streaming: boolean;
  snapshot: MarkdownSnapshot;
  getSnapshot: () => MarkdownSnapshot;
  notify: () => void;
  subscribe: (listener: () => void) => () => void;
}

function recordsEqual<T>(left: Record<string, T>, right: Record<string, T>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reuseRenderContext(
  update: IncrementalUpdate,
  previous?: MarkdownRenderContext
): MarkdownRenderContext {
  if (
    previous &&
    recordsEqual(previous.definitions, update.definitions) &&
    recordsEqual(previous.footnoteDefinitions, update.footnoteDefinitions) &&
    arraysEqual(previous.footnoteReferenceOrder, update.footnoteReferenceOrder)
  ) {
    return previous;
  }

  return {
    definitions: update.definitions,
    footnoteDefinitions: update.footnoteDefinitions,
    footnoteReferenceOrder: update.footnoteReferenceOrder,
  };
}

function createSnapshot(
  parser: IncremarkParser,
  update: IncrementalUpdate,
  previous?: MarkdownSnapshot
): MarkdownSnapshot {
  return {
    blocks: [...parser.getCompletedBlocks(), ...update.pending],
    renderContext: reuseRenderContext(update, previous?.renderContext),
  };
}

export function createMarkdownRuntime(content: string, streaming: boolean): MarkdownRuntime {
  const normalizedContent = normalizeMarkdownUnderline(content);
  const parser = createIncremarkParser({
    gfm: true,
    math: { tex: true },
    containers: false,
    htmlTree: false,
  });
  let update = parser.append(normalizedContent);
  if (!streaming) update = parser.finalize();

  const snapshot = createSnapshot(parser, update);
  const listeners = new Set<() => void>();
  const runtime: MarkdownRuntime = {
    parser,
    content: normalizedContent,
    streaming,
    snapshot,
    getSnapshot: () => runtime.snapshot,
    notify: () => listeners.forEach((listener) => listener()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return runtime;
}

/** 流式文本保持旧内容前缀时只追加差量；历史替换或重新生成时重建解析状态。 */
export function updateMarkdownRuntime(
  runtime: MarkdownRuntime,
  content: string,
  streaming: boolean
): MarkdownSnapshot | null {
  const normalizedContent = normalizeMarkdownUnderline(content);
  const contentChanged = normalizedContent !== runtime.content;
  let update: IncrementalUpdate | null = null;

  if (streaming && !runtime.streaming) {
    runtime.parser.reset();
    update = runtime.parser.append(normalizedContent);
  } else if (contentChanged) {
    if (runtime.streaming && normalizedContent.startsWith(runtime.content)) {
      update = runtime.parser.append(normalizedContent.slice(runtime.content.length));
    } else {
      runtime.parser.reset();
      update = runtime.parser.append(normalizedContent);
    }
  }

  if (!streaming && (runtime.streaming || contentChanged)) {
    update = runtime.parser.finalize();
  }

  runtime.content = normalizedContent;
  runtime.streaming = streaming;
  if (!update) return null;

  runtime.snapshot = createSnapshot(runtime.parser, update, runtime.snapshot);
  runtime.notify();
  return runtime.snapshot;
}
