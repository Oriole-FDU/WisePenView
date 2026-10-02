import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';

import type {
  NoteChangedBlock,
  NoteTransactionAnalysis,
  NoteTransactionRange,
  NoteTransactionService,
  NoteTransactionUpdate,
} from './types';

interface BlockRef extends NoteChangedBlock {
  type: string;
  attrs: Record<string, unknown>;
}

const EMPTY_ANALYSIS: NoteTransactionAnalysis = {
  docChanged: false,
  changedRanges: [],
  changedBlocks: [],
  removedBlockIds: [],
  structureChanged: false,
};

function clampPosition(position: number, doc: PMNode): number {
  return Math.max(0, Math.min(position, doc.content.size));
}

function mergeRanges(ranges: readonly NoteTransactionRange[]): NoteTransactionRange[] {
  const sorted = ranges
    .map((range) => ({ from: Math.min(range.from, range.to), to: Math.max(range.from, range.to) }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const merged: NoteTransactionRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.from > previous.to) {
      merged.push(range);
      continue;
    }
    previous.to = Math.max(previous.to, range.to);
  }
  return merged;
}

function collectBlockContainerNodes(
  doc: PMNode,
  ranges: readonly NoteTransactionRange[]
): Array<{ node: PMNode; pos: number }> {
  const nodes = new Map<number, PMNode>();
  const addNode = (node: PMNode, from: number) => {
    if (node.type.name !== 'blockContainer') return;
    nodes.set(from, node);
  };

  for (const range of ranges) {
    const from = clampPosition(range.from, doc);
    const to = clampPosition(Math.max(range.to, from), doc);
    if (from === to) {
      if (doc.content.size === 0) continue;
      const resolved = doc.resolve(Math.min(from, Math.max(doc.content.size - 1, 0)));
      for (let depth = resolved.depth; depth >= 0; depth -= 1) {
        addNode(resolved.node(depth), depth === 0 ? 0 : resolved.before(depth));
      }
      continue;
    }
    doc.nodesBetween(from, to, (node, pos) => {
      addNode(node, pos);
      return true;
    });
  }
  return [...nodes.entries()].map(([pos, node]) => ({ node, pos }));
}

function collectBlockRefs(doc: PMNode, ranges: readonly NoteTransactionRange[]): BlockRef[] {
  return collectBlockContainerNodes(doc, ranges).flatMap(({ node, pos }) => {
    const id = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    if (!id) return [];
    return [
      {
        id,
        node,
        pos,
        type: node.type.name,
        attrs: (node.attrs ?? {}) as Record<string, unknown>,
      },
    ];
  });
}

function readChangedRanges(mapping: Mapping): {
  beforeRanges: NoteTransactionRange[];
  changedRanges: NoteTransactionRange[];
} {
  const beforeRanges: NoteTransactionRange[] = [];
  const changedRanges: NoteTransactionRange[] = [];
  mapping.maps.forEach((map, index) => {
    const beforeMapping = mapping.slice(0, index).invert();
    const afterMapping = mapping.slice(index + 1);
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      beforeRanges.push({
        from: beforeMapping.map(oldStart, 1),
        to: beforeMapping.map(oldEnd, -1),
      });
      changedRanges.push({
        from: afterMapping.map(newStart, 1),
        to: afterMapping.map(newEnd, -1),
      });
    });
  });
  return {
    beforeRanges: mergeRanges(beforeRanges),
    changedRanges: mergeRanges(changedRanges),
  };
}

function sameAttrs(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

function hasStructuralDifference(
  previous: readonly BlockRef[],
  current: readonly BlockRef[]
): boolean {
  const previousById = new Map(previous.map((ref) => [ref.id, ref]));
  const currentById = new Map(current.map((ref) => [ref.id, ref]));
  if (previousById.size !== currentById.size) return true;
  if (
    previous.map((ref) => ref.id).join('\u0000') !== current.map((ref) => ref.id).join('\u0000')
  ) {
    return true;
  }
  for (const [id, previousRef] of previousById) {
    const currentRef = currentById.get(id);
    if (
      !currentRef ||
      previousRef.type !== currentRef.type ||
      !sameAttrs(previousRef.attrs, currentRef.attrs)
    ) {
      return true;
    }
  }
  return false;
}

function analyzeTransactionBatch(transactions: readonly Transaction[]): NoteTransactionAnalysis {
  if (transactions.length === 0 || !transactions.some((transaction) => transaction.docChanged)) {
    return EMPTY_ANALYSIS;
  }

  const firstTransaction = transactions[0];
  const lastTransaction = transactions[transactions.length - 1];
  if (!firstTransaction || !lastTransaction) return EMPTY_ANALYSIS;

  // 组合整批 step mapping，确保 appended transaction 的范围统一落在最终文档坐标。
  const mapping = new Mapping();
  transactions.forEach((transaction) => mapping.appendMapping(transaction.mapping));
  const { beforeRanges, changedRanges } = readChangedRanges(mapping);
  if (beforeRanges.length === 0 && changedRanges.length === 0) {
    return { ...EMPTY_ANALYSIS, docChanged: true };
  }

  const previousBlocks = collectBlockRefs(firstTransaction.before, beforeRanges);
  const currentBlocks = collectBlockRefs(lastTransaction.doc, changedRanges);
  const currentIds = new Set(currentBlocks.map((block) => block.id));
  const removedBlockIds = previousBlocks
    .map((block) => block.id)
    .filter((id) => !currentIds.has(id));

  return {
    docChanged: true,
    changedRanges,
    changedBlocks: currentBlocks,
    removedBlockIds,
    structureChanged: hasStructuralDifference(previousBlocks, currentBlocks),
  };
}

export function createNoteTransactionService(): NoteTransactionService {
  const analysisCache = new WeakMap<Transaction, WeakMap<Transaction, NoteTransactionAnalysis>>();

  const analyze: NoteTransactionService['analyze'] = (transactions) => {
    const firstTransaction = transactions[0];
    const lastTransaction = transactions[transactions.length - 1];
    if (!firstTransaction || !lastTransaction) return EMPTY_ANALYSIS;

    const cached = analysisCache.get(firstTransaction)?.get(lastTransaction);
    if (cached) return cached;

    const analysis = analyzeTransactionBatch(transactions);
    let batchCache = analysisCache.get(firstTransaction);
    if (!batchCache) {
      batchCache = new WeakMap();
      analysisCache.set(firstTransaction, batchCache);
    }
    batchCache.set(lastTransaction, analysis);
    return analysis;
  };

  const subscribe: NoteTransactionService['subscribe'] = (editor, listener) => {
    const handleUpdate = ({ transaction, appendedTransactions }: NoteTransactionUpdate) => {
      listener(analyze([transaction, ...appendedTransactions]));
    };
    editor._tiptapEditor.on('update', handleUpdate);
    return () => editor._tiptapEditor.off('update', handleUpdate);
  };

  return { analyze, subscribe };
}
