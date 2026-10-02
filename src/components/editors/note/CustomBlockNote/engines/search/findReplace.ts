import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

import type {
  NoteFindReplaceMatch,
  NotePluginRegistry,
  NoteReplaceOperation,
} from '../../registry/types';

function findCaseInsensitiveOffsets(
  text: string,
  query: string
): Array<{ from: number; to: number }> {
  const normalizedQuery = query.toLocaleLowerCase();
  const normalizedText = text.toLocaleLowerCase();
  const offsets: Array<{ from: number; to: number }> = [];
  let searchFrom = 0;

  while (searchFrom < normalizedText.length) {
    const from = normalizedText.indexOf(normalizedQuery, searchFrom);
    if (from === -1) break;
    offsets.push({ from, to: from + query.length });
    searchFrom = from + query.length;
  }
  return offsets;
}

/** 为拥有内联文本内容的 block 收集匹配，文本节点位置由 PM 提供。 */
export function collectInlineTextMatches(
  node: PMNode,
  pos: number,
  query: string,
  pluginId: string
): NoteFindReplaceMatch[] {
  const matches: NoteFindReplaceMatch[] = [];
  node.descendants((child, childPos) => {
    if (!child.isText) return;
    const text = child.text ?? '';
    for (const offset of findCaseInsensitiveOffsets(text, query)) {
      const from = pos + 1 + childPos + offset.from;
      matches.push({
        pluginId,
        from,
        to: from + query.length,
        highlight: { kind: 'inline', from, to: from + query.length },
        operation: { kind: 'inlineText', from, to: from + query.length },
      });
    }
  });
  return matches;
}

/** 为属性文本（例如公式 expression）收集匹配，并保留属性内偏移。 */
export function collectNodeAttributeTextMatches(
  node: PMNode,
  pos: number,
  attribute: string,
  query: string,
  pluginId: string
): NoteFindReplaceMatch[] {
  const value = node.attrs[attribute];
  if (typeof value !== 'string') return [];

  return findCaseInsensitiveOffsets(value, query).map((offset) => ({
    pluginId,
    from: pos,
    to: pos + node.nodeSize,
    highlight: { kind: 'node', from: pos, to: pos + node.nodeSize },
    operation: {
      kind: 'nodeAttributeText',
      pos,
      attribute,
      fromOffset: offset.from,
      toOffset: offset.to,
    },
  }));
}

export function collectFindReplaceMatches(
  doc: PMNode,
  query: string,
  registry: NotePluginRegistry
): NoteFindReplaceMatch[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const matches: NoteFindReplaceMatch[] = [];
  doc.descendants((node, pos) => {
    const plugin =
      registry.blockPlugins.get(node.type.name) ?? registry.inlinePlugins.get(node.type.name);
    if (!plugin?.findReplace) return;
    matches.push(
      ...plugin.findReplace.collectMatches({ node, pos, query: trimmedQuery, registry })
    );
  });
  return matches.sort((left, right) => left.from - right.from || left.to - right.to);
}

function compareOperationsDescending(
  left: NoteReplaceOperation,
  right: NoteReplaceOperation
): number {
  const leftPosition = left.kind === 'inlineText' ? left.from : left.pos;
  const rightPosition = right.kind === 'inlineText' ? right.from : right.pos;
  if (leftPosition !== rightPosition) return rightPosition - leftPosition;

  const leftOffset = left.kind === 'nodeAttributeText' ? left.fromOffset : 0;
  const rightOffset = right.kind === 'nodeAttributeText' ? right.fromOffset : 0;
  return rightOffset - leftOffset;
}

/**
 * 所有替换在同一事务中按文档位置倒序执行，前面的文本长度变化不会影响尚未处理的目标。
 */
export function applyNoteReplaceOperations(
  tr: Transaction,
  operations: readonly NoteReplaceOperation[],
  replacement: string
): Transaction {
  const sortedOperations = [...operations].sort(compareOperationsDescending);
  for (const operation of sortedOperations) {
    if (operation.kind === 'inlineText') {
      tr.insertText(replacement, operation.from, operation.to);
      continue;
    }

    const node = tr.doc.nodeAt(operation.pos);
    const currentValue = node?.attrs[operation.attribute];
    if (!node || typeof currentValue !== 'string') continue;
    const nextValue =
      currentValue.slice(0, operation.fromOffset) +
      replacement +
      currentValue.slice(operation.toOffset);
    tr.setNodeMarkup(operation.pos, node.type, { ...node.attrs, [operation.attribute]: nextValue });
  }
  return tr;
}

/** 写权限关闭时不返回操作，调用方因此不会创建或 dispatch 本地写入事务。 */
export function selectNoteReplaceOperations(
  matches: readonly NoteFindReplaceMatch[],
  activeIndex: number,
  replaceAll: boolean,
  canReplace: boolean
): NoteReplaceOperation[] {
  if (!canReplace) return [];
  if (replaceAll) return matches.map((match) => match.operation);
  const activeMatch = matches[activeIndex];
  return activeMatch ? [activeMatch.operation] : [];
}
