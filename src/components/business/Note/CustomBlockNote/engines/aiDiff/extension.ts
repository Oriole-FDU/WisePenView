import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';

import {
  listRichTextChangeTargets,
  type NoteRichTextAiDiffConfig,
} from '../../plugins/DefaultContentPlugin/aiDiff';
import type {
  NoteAiDiffAction,
  NoteAiDiffActionTarget,
  NoteEditorExtension,
  NotePluginRegistry,
  NoteTransactionAnalysis,
  NoteTransactionService,
} from '../../registry/types';
import { scrollNoteEditorTargetIntoView } from '../../runtime/noteEditorScrollTarget';
import type { NoteAiDiffActionRequest } from './action';
import { resolveNoteAiDiffBlock, stableStringify } from './contentState';
import { cleanupAiDiffDomTree } from './domCleanup';
import {
  type AiDiffReviewNavigation,
  type AiDiffReviewUnit,
  createAiDiffReviewWidget,
} from './reviewWidget';
import styles from './style.module.less';

interface AiDiffExtensionMeta {
  displayMode?: AiDiffDisplayMode;
  aiContentByBlockId?: ReadonlyMap<string, unknown>;
  actionsEnabled?: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  /** 传入显式值（含 null）以更新选中改动；省略则保持 */
  selectedChangeKey?: string | null;
  /**
   * 接受/拒绝后按「列表位置」恢复选中（hunk 下标会重排，不能只记旧 key）
   * 传入显式值（含 null）以更新；省略则保持
   */
  pendingSelectIndex?: number | null;
}

interface AiDiffExtensionState {
  displayMode: AiDiffDisplayMode;
  aiContentByBlockId: ReadonlyMap<string, unknown>;
  actionsEnabled: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  selectedChangeKey: string | null;
  /** 文档顺序的可导航改动 key，供键盘上下切换 */
  changeKeysOrdered: readonly string[];
  /** 待按位置恢复的选中下标；装饰重建后消费 */
  pendingSelectIndex: number | null;
  decorations: DecorationSet;
  aiBlockPositions: ReadonlyMap<string, { from: number; to: number }>;
}

const aiDiffExtensionPluginKey = new PluginKey<AiDiffExtensionState>('noteAiDiffExtension');

const AI_DIFF_INCREMENTAL_MAX_RANGES = 32;
const AI_DIFF_INCREMENTAL_MAX_BLOCKS = 64;

function requiresAiDiffFullRebuild(analysis: NoteTransactionAnalysis): boolean {
  return (
    analysis.changedRanges.length > AI_DIFF_INCREMENTAL_MAX_RANGES ||
    analysis.changedBlocks.length + analysis.removedBlockIds.length > AI_DIFF_INCREMENTAL_MAX_BLOCKS
  );
}

function encodeChangeKey(blockId: string, target?: NoteAiDiffActionTarget): string {
  if (!target) return blockId;
  if (target.kind === 'content-hunk') return `${blockId}::content-hunk`;
  return `${blockId}::inline-hunk::${target.index}`;
}

function decodeChangeKey(changeKey: string): {
  blockId: string;
  target?: NoteAiDiffActionTarget;
} {
  const [blockId = '', kind, indexRaw] = changeKey.split('::');
  if (kind === 'content-hunk') return { blockId, target: { kind: 'content-hunk' } };
  if (kind === 'inline-hunk') {
    const index = Number(indexRaw);
    if (Number.isFinite(index)) return { blockId, target: { kind: 'inline-hunk', index } };
  }
  return { blockId };
}

function selectAiDiffChange(view: EditorView, changeKey: string | null): void {
  const previous = aiDiffExtensionPluginKey.getState(view.state);
  if (!previous || previous.selectedChangeKey === changeKey) return;
  view.dispatch(
    view.state.tr
      .setMeta(aiDiffExtensionPluginKey, { selectedChangeKey: changeKey })
      .setMeta('addToHistory', false)
  );
}

function findAiDiffChangeElement(view: EditorView, changeKey: string): HTMLElement | null {
  const byKey = view.dom.querySelector<HTMLElement>(
    `[data-ai-diff-change-key="${CSS.escape(changeKey)}"]`
  );
  if (byKey) return byKey;
  const blockId = changeKey.split('::')[0] ?? changeKey;
  return view.dom.querySelector<HTMLElement>(`[data-ai-diff-review="${CSS.escape(blockId)}"]`);
}

function scrollAiDiffChangeIntoView(view: EditorView, changeKey: string): void {
  const target = findAiDiffChangeElement(view, changeKey);
  if (target?.isConnected) {
    scrollNoteEditorTargetIntoView(target, {
      ignoreScrollableWithin: view.dom,
    });
  }
}

function goToAiDiffChange(view: EditorView, changeKey: string): void {
  selectAiDiffChange(view, changeKey);
  view.focus();
}

/** 方向键切换相邻改动；到边界时吞掉按键避免光标乱跑 */
function navigateAiDiffByArrow(view: EditorView, direction: 'up' | 'down'): boolean {
  const state = aiDiffExtensionPluginKey.getState(view.state);
  if (
    !state?.actionsEnabled ||
    state.displayMode !== AI_DIFF_DISPLAY_MODE.COMPARE ||
    state.changeKeysOrdered.length === 0
  ) {
    return false;
  }

  const keys = state.changeKeysOrdered;
  const currentIndex = state.selectedChangeKey ? keys.indexOf(state.selectedChangeKey) : -1;

  let nextKey: string | null = null;
  if (currentIndex < 0) {
    nextKey = direction === 'down' ? keys[0]! : keys[keys.length - 1]!;
  } else if (direction === 'up' && currentIndex > 0) {
    nextKey = keys[currentIndex - 1]!;
  } else if (direction === 'down' && currentIndex < keys.length - 1) {
    nextKey = keys[currentIndex + 1]!;
  }

  if (!nextKey) return true;
  goToAiDiffChange(view, nextKey);
  return true;
}

/** 对当前选中改动执行接受/拒绝，并跳到下一项（无下一项则上一项） */
function applySelectedAiDiffAction(view: EditorView, action: NoteAiDiffAction): boolean {
  const state = aiDiffExtensionPluginKey.getState(view.state);
  if (
    !state?.actionsEnabled ||
    !state.onAction ||
    !state.selectedChangeKey ||
    state.displayMode !== AI_DIFF_DISPLAY_MODE.COMPARE
  ) {
    return false;
  }

  const selectedKey = state.selectedChangeKey;
  const index = state.changeKeysOrdered.indexOf(selectedKey);
  // 当前项移除后：下一项落在同一 index；若已是最后一项则退到上一项
  const pendingSelectIndex =
    index < 0
      ? null
      : index < state.changeKeysOrdered.length - 1
        ? index
        : index > 0
          ? index - 1
          : null;

  const { blockId, target } = decodeChangeKey(selectedKey);
  state.onAction({ blockId, action, target });
  view.dispatch(
    view.state.tr
      .setMeta(aiDiffExtensionPluginKey, {
        selectedChangeKey: null,
        pendingSelectIndex,
      })
      .setMeta('addToHistory', false)
  );
  view.focus();
  return true;
}

function isAiDiffInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, input, textarea, select'));
}

function isAiDiffGlobalKeyboardTarget(view: EditorView, event: KeyboardEvent): boolean {
  if (view.dom.contains(event.target as Node | null)) return true;
  const state = aiDiffExtensionPluginKey.getState(view.state);
  if (state?.selectedChangeKey) return true;

  const activeElement = document.activeElement;
  if (!activeElement || activeElement === document.body) return true;
  if (!(activeElement instanceof HTMLElement)) return false;
  if (activeElement.isContentEditable) return false;
  return !activeElement.closest('button, input, textarea, select, [role="search"], [role="menu"]');
}

function isAiDiffReadOnlyTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest('[data-ai-diff-review], [data-ai-diff-current], [data-ai-diff-current-hidden]')
    )
  );
}

/** AI Diff 展示内容始终只读；箭头浏览，Enter 接受，Esc 拒绝。 */
function handleAiDiffKeyDown(view: EditorView, event: KeyboardEvent): boolean {
  if (isAiDiffInteractiveTarget(event.target)) return false;

  const state = aiDiffExtensionPluginKey.getState(view.state);
  const targetsAiDiff = isAiDiffReadOnlyTarget(event.target);
  if (
    !state?.actionsEnabled ||
    state.displayMode !== AI_DIFF_DISPLAY_MODE.COMPARE ||
    event.altKey
  ) {
    if (
      targetsAiDiff &&
      (event.key === 'Enter' ||
        event.key === 'Escape' ||
        event.key === 'Backspace' ||
        event.key === 'Delete')
    ) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  if (event.key === 'Enter') {
    if (applySelectedAiDiffAction(view, 'accept')) {
      event.preventDefault();
      return true;
    }
    if (targetsAiDiff) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  if (event.key === 'Escape') {
    if (!applySelectedAiDiffAction(view, 'discard')) {
      if (targetsAiDiff) {
        event.preventDefault();
        return true;
      }
      return false;
    }
    event.preventDefault();
    return true;
  }

  if (targetsAiDiff && (event.key === 'Backspace' || event.key === 'Delete')) {
    event.preventDefault();
    return true;
  }

  if (
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    (event.key === 'ArrowUp' || event.key === 'ArrowDown')
  ) {
    const handled = navigateAiDiffByArrow(view, event.key === 'ArrowUp' ? 'up' : 'down');
    if (handled) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  return false;
}

function buildDecorations(params: {
  doc: PMNode;
  editorSchema: {
    blockSchema: unknown;
    inlineContentSchema: unknown;
    styleSchema: unknown;
  };
  proseMirrorSchema: unknown;
  registry: NotePluginRegistry;
  aiDiffConfig: NoteRichTextAiDiffConfig;
  runtime: Omit<
    AiDiffExtensionState,
    'decorations' | 'changeKeysOrdered' | 'pendingSelectIndex' | 'aiBlockPositions'
  >;
  onSelectChange: (changeKey: string) => void;
  blockNodes?: readonly { node: PMNode; pos: number }[];
}): {
  decorations: DecorationSet;
  changeKeysOrdered: readonly string[];
  aiBlockPositions: ReadonlyMap<string, { from: number; to: number }>;
} {
  const { doc, editorSchema, proseMirrorSchema, registry, aiDiffConfig, runtime, onSelectChange } =
    params;
  const decorations: Decoration[] = [];
  const aiBlockPositions = new Map<string, { from: number; to: number }>();

  type PendingReview = {
    blockId: string;
    block: Record<string, unknown> & { type: string };
    projection: NonNullable<ReturnType<typeof resolveNoteAiDiffBlock>>;
    contentTo: number;
  };

  const pendingReviews: PendingReview[] = [];

  const blockNodes =
    params.blockNodes ??
    (() => {
      const nodes: Array<{ node: PMNode; pos: number }> = [];
      doc.descendants((node, pos) => {
        if (node.type.name === 'blockContainer') nodes.push({ node, pos });
        return true;
      });
      return nodes;
    })();

  for (const { node, pos } of blockNodes) {
    const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    if (!runtime.aiContentByBlockId.has(blockId)) continue;
    aiBlockPositions.set(blockId, { from: pos, to: pos + node.nodeSize });
    const aiContent = runtime.aiContentByBlockId.get(blockId);

    let block: Record<string, unknown> & { type: string };
    try {
      block = nodeToBlock(
        node,
        proseMirrorSchema as never,
        editorSchema.blockSchema as never,
        editorSchema.inlineContentSchema as never,
        editorSchema.styleSchema as never
      ) as unknown as Record<string, unknown> & { type: string };
    } catch {
      continue;
    }

    const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
    const projection = aiDiff ? resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry) : null;
    if (!aiDiff || !projection) continue;

    let contentFrom = pos;
    let contentTo = pos + node.nodeSize;
    node.forEach((child, offset) => {
      if (child.type.spec.group !== 'blockContent') return;
      contentFrom = pos + 1 + offset;
      contentTo = contentFrom + child.nodeSize;
    });

    const hideWholeBlock =
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY && projection.currentEmpty) ||
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY && projection.aiContentEmpty);
    if (hideWholeBlock) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
          contenteditable: 'false',
        })
      );
      continue;
    }

    const hasCustomComparison = Boolean(
      runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE &&
      !projection.currentEmpty &&
      !projection.aiContentEmpty &&
      aiDiff.comparison
    );
    const hideCurrent =
      projection.currentEmpty ||
      runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY ||
      hasCustomComparison;
    if (hideCurrent) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
          contenteditable: 'false',
        })
      );
    } else if (runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
      const selected =
        runtime.selectedChangeKey === blockId ||
        runtime.selectedChangeKey?.startsWith(`${blockId}::`) === true;
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: selected ? `${styles.current} ${styles.currentSelected}` : styles.current,
          'data-ai-diff-current': 'true',
          'data-ai-diff-block-id': blockId,
          ...(selected ? { 'data-ai-diff-selected': 'true' } : {}),
          contenteditable: 'false',
        })
      );
    }

    const shouldRenderWidget =
      runtime.displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY &&
      (!projection.aiContentEmpty || runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE);
    if (shouldRenderWidget) {
      pendingReviews.push({
        blockId,
        block,
        projection,
        contentTo,
      });
    }
  }

  const actionableReviews =
    runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && runtime.actionsEnabled
      ? pendingReviews
      : [];

  const changeUnits: AiDiffReviewUnit[] = [];
  for (const item of actionableReviews) {
    const aiDiff = registry.blockPlugins.get(item.block.type)?.aiDiff;
    if (!aiDiff) continue;
    const hasBothSides = !item.projection.currentEmpty && !item.projection.aiContentEmpty;
    const canGranular = Boolean(hasBothSides && aiDiff.comparison && aiDiff.applyGranular);
    if (canGranular) {
      const targets = listRichTextChangeTargets(
        item.projection.current,
        item.projection.aiBlock,
        aiDiffConfig
      );
      if (targets.length > 0) {
        for (const target of targets) {
          changeUnits.push({
            key: encodeChangeKey(item.blockId, target),
            blockId: item.blockId,
            target,
          });
        }
        continue;
      }
    }
    changeUnits.push({ key: item.blockId, blockId: item.blockId });
  }

  const unitNav = new Map<string, AiDiffReviewNavigation>();
  const changeTotal = changeUnits.length;
  changeUnits.forEach((unit, index) => {
    unitNav.set(unit.key, {
      index: index + 1,
      total: changeTotal,
      prevKey: index > 0 ? changeUnits[index - 1]!.key : null,
      nextKey: index < changeTotal - 1 ? changeUnits[index + 1]!.key : null,
    });
  });

  pendingReviews.forEach((item) => {
    const aiDiff = registry.blockPlugins.get(item.block.type)?.aiDiff;
    if (!aiDiff) return;
    const changeUnitsForBlock = changeUnits.filter((unit) => unit.blockId === item.blockId);
    const selectedKeyForBlock = changeUnitsForBlock.some(
      (unit) => unit.key === runtime.selectedChangeKey
    )
      ? runtime.selectedChangeKey
      : null;
    const widgetKey = [
      'ai-diff-review',
      item.blockId,
      runtime.displayMode,
      runtime.actionsEnabled ? 'editable' : 'readonly',
      selectedKeyForBlock ?? 'idle',
      stableStringify(item.projection.current),
      stableStringify(item.projection.aiBlock),
    ].join(':');

    decorations.push(
      Decoration.widget(
        item.contentTo,
        () =>
          createAiDiffReviewWidget({
            blockId: item.blockId,
            contentType: item.block.type,
            projection: item.projection,
            displayMode: runtime.displayMode,
            actionsEnabled: runtime.actionsEnabled,
            selectedChangeKey: runtime.selectedChangeKey,
            units: changeUnitsForBlock,
            navigationByKey: unitNav,
            onAction: runtime.onAction,
            onSelectChange,
            aiDiff,
            registry,
          }),
        { key: widgetKey, side: 1, stopEvent: () => true, destroy: cleanupAiDiffDomTree }
      )
    );
  });

  return {
    decorations: DecorationSet.create(doc, decorations),
    changeKeysOrdered: changeUnits.map((unit) => unit.key),
    aiBlockPositions,
  };
}

function createAiDiffExtension(
  registry: NotePluginRegistry,
  transactionService: NoteTransactionService,
  aiDiffConfig: NoteRichTextAiDiffConfig
) {
  return createExtension(({ editor }) => ({
    key: 'noteAiDiffExtension',
    prosemirrorPlugins: [
      new Plugin<AiDiffExtensionState>({
        key: aiDiffExtensionPluginKey,
        state: {
          init: () => ({
            displayMode: AI_DIFF_DISPLAY_MODE.COMPARE,
            aiContentByBlockId: new Map(),
            actionsEnabled: false,
            selectedChangeKey: null,
            changeKeysOrdered: [],
            pendingSelectIndex: null,
            decorations: DecorationSet.empty,
            aiBlockPositions: new Map(),
          }),
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffExtensionPluginKey) as AiDiffExtensionMeta | undefined;
            let selectedChangeKey =
              meta && 'selectedChangeKey' in meta
                ? (meta.selectedChangeKey ?? null)
                : previous.selectedChangeKey;
            let pendingSelectIndex =
              meta && 'pendingSelectIndex' in meta
                ? (meta.pendingSelectIndex ?? null)
                : previous.pendingSelectIndex;
            const runtime = {
              displayMode: meta?.displayMode ?? previous.displayMode,
              aiContentByBlockId: meta?.aiContentByBlockId ?? previous.aiContentByBlockId,
              actionsEnabled: meta?.actionsEnabled ?? previous.actionsEnabled,
              onAction: meta?.onAction ?? previous.onAction,
              selectedChangeKey,
            };
            if (!tr.docChanged && !meta) return previous;
            if (runtime.aiContentByBlockId.size === 0) {
              return {
                ...runtime,
                selectedChangeKey: null,
                pendingSelectIndex: null,
                changeKeysOrdered: [],
                decorations: DecorationSet.empty,
                aiBlockPositions: new Map(),
              };
            }
            let cachedBlockNodes: readonly { node: PMNode; pos: number }[] | undefined;
            const canReusePreviousAiBlockPositions =
              !tr.docChanged &&
              previous.aiBlockPositions.size > 0 &&
              meta?.aiContentByBlockId === undefined &&
              meta?.displayMode === undefined;
            if (canReusePreviousAiBlockPositions) {
              cachedBlockNodes = [...previous.aiBlockPositions.values()]
                .map((position) => ({
                  node: newState.doc.nodeAt(position.from),
                  pos: position.from,
                }))
                .filter((item): item is { node: PMNode; pos: number } => item.node !== null);
            }
            if (tr.docChanged && !meta) {
              const analysis = transactionService.analyze([tr]);
              const touchesAiBlock =
                analysis.structureChanged ||
                requiresAiDiffFullRebuild(analysis) ||
                analysis.changedBlocks.some(({ id: blockId }) =>
                  runtime.aiContentByBlockId.has(blockId)
                ) ||
                analysis.removedBlockIds.some((blockId) => runtime.aiContentByBlockId.has(blockId));
              if (!analysis.structureChanged && !requiresAiDiffFullRebuild(analysis)) {
                const mappedAiBlockPositions = new Map<string, { from: number; to: number }>();
                let canMapAiBlockPositions = true;
                for (const [blockId, position] of previous.aiBlockPositions) {
                  const from = tr.mapping.map(position.from, 1);
                  const node = newState.doc.nodeAt(from);
                  if (!node || node.type.name !== 'blockContainer' || node.attrs.id !== blockId) {
                    canMapAiBlockPositions = false;
                    break;
                  }
                  mappedAiBlockPositions.set(blockId, { from, to: from + node.nodeSize });
                }
                if (canMapAiBlockPositions) {
                  cachedBlockNodes = [...mappedAiBlockPositions.entries()].map(([, position]) => ({
                    node: newState.doc.nodeAt(position.from)!,
                    pos: position.from,
                  }));
                }
                if (!touchesAiBlock && canMapAiBlockPositions) {
                  return {
                    ...runtime,
                    selectedChangeKey,
                    pendingSelectIndex,
                    changeKeysOrdered: previous.changeKeysOrdered,
                    decorations: previous.decorations.map(tr.mapping, newState.doc),
                    aiBlockPositions: mappedAiBlockPositions,
                  };
                }
              }
            }
            if (runtime.selectedChangeKey) {
              const selectedBlockId = runtime.selectedChangeKey.split('::')[0] ?? '';
              if (!runtime.aiContentByBlockId.has(selectedBlockId)) {
                selectedChangeKey = null;
                runtime.selectedChangeKey = null;
              }
            }
            const buildWithSelection = (
              key: string | null,
              blockNodes?: readonly { node: PMNode; pos: number }[]
            ) =>
              buildDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                proseMirrorSchema: newState.schema,
                registry,
                aiDiffConfig,
                runtime: { ...runtime, selectedChangeKey: key },
                onSelectChange: (changeKey) => goToAiDiffChange(editor.prosemirrorView, changeKey),
                blockNodes,
              });

            let built = buildWithSelection(selectedChangeKey, cachedBlockNodes);
            if (pendingSelectIndex != null) {
              // 等 sidecar 刷新 aiContent 后再按位置恢复，并重建装饰（否则工具条仍按未选中绘制）
              if (meta?.aiContentByBlockId !== undefined) {
                selectedChangeKey =
                  built.changeKeysOrdered[pendingSelectIndex] ??
                  built.changeKeysOrdered[
                    Math.min(pendingSelectIndex, Math.max(built.changeKeysOrdered.length - 1, 0))
                  ] ??
                  null;
                pendingSelectIndex = null;
                built = buildWithSelection(selectedChangeKey, cachedBlockNodes);
              } else {
                selectedChangeKey = null;
              }
            } else if (selectedChangeKey && !built.changeKeysOrdered.includes(selectedChangeKey)) {
              selectedChangeKey = null;
              built = buildWithSelection(null, cachedBlockNodes);
            }
            return {
              ...runtime,
              selectedChangeKey,
              pendingSelectIndex,
              changeKeysOrdered: built.changeKeysOrdered,
              decorations: built.decorations,
              aiBlockPositions: built.aiBlockPositions,
            };
          },
        },
        props: {
          decorations: (state) => aiDiffExtensionPluginKey.getState(state)?.decorations ?? null,
          handleKeyDown: handleAiDiffKeyDown,
          handleDOMEvents: {
            mousedown(view, event) {
              const state = aiDiffExtensionPluginKey.getState(view.state);
              if (!state?.actionsEnabled) return false;
              const target = event.target as HTMLElement | null;
              if (!target || target.closest('button')) return false;

              const changeEl = target.closest<HTMLElement>('[data-ai-diff-change-key]');
              const blockEl = target.closest<HTMLElement>('[data-ai-diff-block-id]');
              const changeKey =
                changeEl?.dataset.aiDiffChangeKey ?? blockEl?.dataset.aiDiffBlockId ?? null;
              if (changeKey) {
                goToAiDiffChange(view, changeKey);
                return false;
              }
              if (state.selectedChangeKey) {
                selectAiDiffChange(view, null);
              }
              return false;
            },
          },
        },
        view: (view) => {
          let queuedFrame: number | null = null;
          const handleKeyDownCapture = (event: KeyboardEvent) => {
            if (!isAiDiffGlobalKeyboardTarget(view, event)) return;
            if (handleAiDiffKeyDown(view, event)) event.stopPropagation();
          };
          document.addEventListener('keydown', handleKeyDownCapture, true);
          return {
            update: (view, previousState) => {
              const selectedChangeKey = aiDiffExtensionPluginKey.getState(
                view.state
              )?.selectedChangeKey;
              const previousSelectedChangeKey =
                aiDiffExtensionPluginKey.getState(previousState)?.selectedChangeKey;
              if (!selectedChangeKey || selectedChangeKey === previousSelectedChangeKey) return;
              if (queuedFrame !== null) window.cancelAnimationFrame(queuedFrame);
              queuedFrame = window.requestAnimationFrame(() => {
                queuedFrame = null;
                scrollAiDiffChangeIntoView(view, selectedChangeKey);
              });
            },
            destroy: () => {
              document.removeEventListener('keydown', handleKeyDownCapture, true);
              if (queuedFrame !== null) window.cancelAnimationFrame(queuedFrame);
            },
          };
        },
      }),
    ],
  }));
}

export function syncAiDiffExtensionState(view: EditorView, meta: AiDiffExtensionMeta): void {
  view.dispatch(
    view.state.tr.setMeta(aiDiffExtensionPluginKey, meta).setMeta('addToHistory', false)
  );
}

export function readAiContentFromEditorState(state: EditorState): ReadonlyMap<string, unknown> {
  return aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId ?? new Map();
}

export function hasAiDiffForBlockInEditorState(
  state: EditorState,
  block: Record<string, unknown>,
  registry: NotePluginRegistry
): boolean {
  const blockId = typeof block.id === 'string' ? block.id : '';
  const type = typeof block.type === 'string' ? block.type : '';
  const aiContentByBlockId = aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId;
  const aiDiff = registry.blockPlugins.get(type)?.aiDiff;
  if (!aiContentByBlockId?.has(blockId) || !aiDiff) return false;
  return Boolean(resolveNoteAiDiffBlock(block, aiContentByBlockId.get(blockId), aiDiff, registry));
}

export function createAiDiffEditorExtension(
  aiDiffConfig: NoteRichTextAiDiffConfig
): NoteEditorExtension {
  return {
    id: 'ai-diff.extension',
    print: {
      styles: [
        `.note-print-body [data-ai-diff-current-hidden='true'] {
  display: none !important;
}`,
      ],
    },
    extensions: ({ registry, services }) => [
      createAiDiffExtension(registry, services.transactions, aiDiffConfig)(),
    ],
  };
}
