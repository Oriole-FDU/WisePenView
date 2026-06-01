import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorProps, EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { createElement } from 'react';
import { RiSparklingLine } from 'react-icons/ri';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { getAiDiffDisplayModeSnapshot, useAiDiffDisplayStore } from '@/store/useAiDiffDisplayStore';
import type { NoteEditorPlugin } from '../types';
import {
  aiAddInlineContentSpec,
  aiDeleteInlineContentSpec,
  aiDiffInlineContentSpec,
} from './inlineContentSpecs';
import { aiGeneratedBlocksToBlockNoteBlocks } from './patch';

const aiDiffBlockFoldPluginKey = new PluginKey('AIDiffBlockFold');

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type InlineContentLike = {
  type?: unknown;
  text?: unknown;
  props?: unknown;
};

function isInlineContentLike(v: unknown): v is InlineContentLike {
  return typeof v === 'object' && v !== null;
}

function getInlineType(v: unknown): string {
  if (!isInlineContentLike(v)) return '';
  return typeof v.type === 'string' ? v.type : '';
}

function getInlineText(v: unknown): string {
  if (!isInlineContentLike(v)) return '';
  return typeof v.text === 'string' ? v.text : '';
}

function getInlineFieldString(v: unknown, key: string): string {
  if (!isInlineContentLike(v)) return '';
  const value = (v as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function getInlineProps(v: unknown): Record<string, unknown> | null {
  if (!isInlineContentLike(v)) return null;
  if (typeof v.props !== 'object' || v.props === null) return null;
  return v.props as Record<string, unknown>;
}

function getPropString(props: Record<string, unknown> | null, key: string): string {
  const value = props?.[key];
  return typeof value === 'string' ? value : '';
}

function isInlineVisibleInMode(item: unknown, displayMode: AiDiffDisplayMode): boolean {
  const type = getInlineType(item);
  if (type === 'text') {
    return getInlineText(item).trim() !== '';
  }
  if (type === 'ai-add') {
    const text = getPropString(getInlineProps(item), 'text');
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY;
  }
  if (type === 'ai-delete') {
    const text = getPropString(getInlineProps(item), 'text');
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY;
  }
  if (type === 'ai-diff') {
    const props = getInlineProps(item);
    const origin = getPropString(props, 'origin');
    const replace = getPropString(props, 'replace');
    if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
    if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
    return origin !== '' || replace !== '';
  }
  if (type === 'AI-Create') {
    const text = getInlineText(item);
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY;
  }
  if (type === 'AI-Delete') {
    const text = getInlineText(item);
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY;
  }
  if (type === 'AI-Edit') {
    const origin = getInlineFieldString(item, 'old_text');
    const replace = getInlineFieldString(item, 'new_text');
    if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
    if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
    return origin !== '' || replace !== '';
  }

  // 其它未知情况保守认为可见
  return true;
}

function hasAnyAiInline(content: readonly unknown[]): boolean {
  return content.some((item) => {
    const type = getInlineType(item);
    return (
      type === 'ai-diff' ||
      type === 'ai-add' ||
      type === 'ai-delete' ||
      type === 'AI-Create' ||
      type === 'AI-Delete' ||
      type === 'AI-Edit'
    );
  });
}

function shouldFoldInlineContent(
  content: readonly unknown[],
  displayMode: AiDiffDisplayMode
): boolean {
  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) return false;
  if (content.length === 0) return false;
  if (!hasAnyAiInline(content)) return false;
  return !content.some((item) => isInlineVisibleInMode(item, displayMode));
}

// 针对于toggleListItem 如果包含子块且所有子块都折叠，容易“无法添加新子块”
// 返回第一个子块的id，作为新增子块的锚点
function resolveAllChildrenFoldedAnchorId(
  children: unknown,
  displayMode: AiDiffDisplayMode
): string {
  if (!Array.isArray(children) || children.length === 0) return '';
  const first = children[0];
  if (!isRecord(first)) return '';
  const firstId = first['id'];
  if (typeof firstId !== 'string' || !firstId) return '';

  for (const child of children) {
    if (!isRecord(child)) return '';
    const id = child['id'];
    if (typeof id !== 'string' || !id) return '';
    const content = Array.isArray(child['content']) ? (child['content'] as unknown[]) : [];
    if (!shouldFoldInlineContent(content, displayMode)) {
      return '';
    }
  }

  return firstId;
}

function buildAiDiffHiddenBlockDecorations(params: {
  doc: PMNode;
  editorSchema: {
    blockSchema: unknown;
    inlineContentSchema: unknown;
    styleSchema: unknown;
  };
  displayMode: AiDiffDisplayMode;
  proseMirrorSchema: unknown;
}): DecorationSet {
  const { doc, editorSchema, displayMode, proseMirrorSchema } = params;
  // 新旧对比模式下无需折叠
  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') {
      return true;
    }

    let block: { type: string; content?: unknown; children?: unknown };
    try {
      block = nodeToBlock(
        node,
        proseMirrorSchema as never,
        editorSchema.blockSchema as never,
        editorSchema.inlineContentSchema as never,
        editorSchema.styleSchema as never
      ) as unknown as { type: string; content?: unknown; children?: unknown };
    } catch {
      return true;
    }

    if (block.type === 'math') {
      return true;
    }
    const content = Array.isArray(block.content) ? (block.content as unknown[]) : [];
    if (!shouldFoldInlineContent(content, displayMode)) {
      if (block.type === 'toggleListItem') {
        const anchorChildId = resolveAllChildrenFoldedAnchorId(block.children, displayMode);
        if (anchorChildId) {
          decorations.push(
            Decoration.widget(pos + node.nodeSize - 1, () => {
              const el = document.createElement('button');
              el.className = 'bn-toggle-add-block-button';
              el.setAttribute('data-ai-diff-toggle-add-placeholder', 'true');
              el.setAttribute('data-ai-diff-toggle-anchor-child-id', anchorChildId);
              el.setAttribute('contenteditable', 'false');
              el.setAttribute('type', 'button');
              el.setAttribute('role', 'button');
              el.textContent = '点击添加区块。';
              return el;
            })
          );
        }
      }
      return true;
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        'data-ai-diff-block-display-hidden': 'true',
        'aria-hidden': 'true',
      })
    );
    return false;
  });

  return DecorationSet.create(doc, decorations);
}

// 创建折叠extension
const aiDiffBlockFoldExtension = createExtension(({ editor }) => {
  return {
    key: 'AIDiffBlockFold',
    prosemirrorPlugins: [
      new Plugin({
        key: aiDiffBlockFoldPluginKey,
        state: {
          // 初始化插件状态
          init: (_config, state) => {
            const displayMode = getAiDiffDisplayModeSnapshot();
            return {
              displayMode,
              decorations: buildAiDiffHiddenBlockDecorations({
                doc: state.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                displayMode,
                proseMirrorSchema: state.schema,
              }),
            };
          },
          // 运行时更新插件状态
          apply: (tr, value, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffBlockFoldPluginKey) as
              | { displayMode?: AiDiffDisplayMode }
              | undefined;
            const nextDisplayMode = meta?.displayMode ?? value.displayMode;
            if (!tr.docChanged && nextDisplayMode === value.displayMode) {
              return value;
            }
            return {
              displayMode: nextDisplayMode,
              decorations: buildAiDiffHiddenBlockDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                displayMode: nextDisplayMode,
                proseMirrorSchema: newState.schema,
              }),
            };
          },
        },
        props: {
          // 应当应用的装饰
          decorations: (state) => {
            const pluginState = aiDiffBlockFoldPluginKey.getState(state) as
              | { decorations: DecorationSet }
              | undefined;
            return pluginState?.decorations ?? null;
          },
          // 拦截“点击添加区块”按钮的点击事件
          handleClick: (view, _pos, event) => {
            // 仅处理鼠标左键点击事件
            if (!(event instanceof MouseEvent)) return false;
            if (event.button !== 0) return false;

            const target = event.target;
            if (!(target instanceof HTMLElement)) return false;

            // 读取displayMode
            const pluginState = aiDiffBlockFoldPluginKey.getState(view.state) as
              | { displayMode: AiDiffDisplayMode }
              | undefined;

            // “新旧对比”时不起作用
            const displayMode = pluginState?.displayMode ?? AI_DIFF_DISPLAY_MODE.COMPARE;
            if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) return false;

            // 寻找占位按钮节点
            const placeholder = target.closest('[data-ai-diff-toggle-add-placeholder="true"]');
            if (!(placeholder instanceof HTMLElement)) return false;
            const anchorChildId =
              placeholder.getAttribute('data-ai-diff-toggle-anchor-child-id') ?? '';
            if (!anchorChildId) return false;

            const ed = editor as unknown as {
              forEachBlock?: (cb: (block: unknown) => boolean) => void;
              insertBlocks: (
                blocks: unknown[],
                referenceBlock: unknown,
                placement: 'before' | 'after'
              ) => unknown[];
              setTextCursorPosition: (id: string, pos: 'start' | 'end') => void;
              focus: () => void;
            };

            // 在文档块树中查找 anchorChildId 对应的 block，作为插入参照点
            let refBlock: unknown | null = null;
            ed.forEachBlock?.((b) => {
              if (isRecord(b) && b['id'] === anchorChildId) {
                refBlock = b;
                return false;
              }
              return true;
            });
            if (!refBlock) return false;

            event.preventDefault();
            event.stopPropagation();

            // 插入空 paragraph作为子块
            try {
              const inserted = ed.insertBlocks([{ type: 'paragraph' }], refBlock, 'before');
              const firstInserted = inserted?.[0];
              if (isRecord(firstInserted) && typeof firstInserted['id'] === 'string') {
                ed.setTextCursorPosition(firstInserted['id'] as string, 'start');
              }
            } catch {
              // 插入失败静默处理
              void 0;
            }
            // 聚焦编辑器，便于用户直接开始输入
            ed.focus();

            return true;
          },
        },
        view: (view) => {
          // 记录上一次 displayMode
          let lastMode = getAiDiffDisplayModeSnapshot();
          // 订阅全局显示模式 store：一旦模式变化，派发 transaction 通知 ProseMirror 插件重算 decorations
          // store.subscribe函数返回一个取消订阅的函数，用于销毁时取消订阅
          const unsubscribe = useAiDiffDisplayStore.subscribe((s) => {
            const nextMode = s.displayMode ?? AI_DIFF_DISPLAY_MODE.COMPARE;
            if (nextMode === lastMode) return;
            lastMode = nextMode;
            view.dispatch(
              view.state.tr
                .setMeta(aiDiffBlockFoldPluginKey, { displayMode: nextMode })
                // UI 模式切换不进入撤销栈，避免 Undo/Redo 污染
                .setMeta('addToHistory', false)
            );
          });
          return {
            destroy: () => {
              unsubscribe();
            },
          };
        },
      }),
    ],
  };
});

// 不依赖store，prop驱动更新displaymode
export function syncAiDiffBlockFoldDisplayMode(
  view: EditorView,
  displayMode: AiDiffDisplayMode
): void {
  view.dispatch(
    view.state.tr.setMeta(aiDiffBlockFoldPluginKey, { displayMode }).setMeta('addToHistory', false)
  );
}

function isAiDiffChangeNodeName(name: string): boolean {
  return name === 'ai-diff' || name === 'ai-add' || name === 'ai-delete';
}

function isBlockContainerEffectivelyEmpty(node: PMNode): boolean {
  let hasVisible = false;
  node.descendants((child) => {
    if (child.isText) {
      if ((child.text ?? '').trim() !== '') {
        hasVisible = true;
        return false;
      }
      return true;
    }
    if (child.isInline) {
      hasVisible = true;
      return false;
    }
    return true;
  });
  return !hasVisible;
}

function blockContainerHasNestedChildren(node: PMNode): boolean {
  let hasNested = false;
  node.descendants((child) => {
    if (child.type.name === 'blockContainer') {
      hasNested = true;
      return false;
    }
    return true;
  });
  return hasNested;
}

function findClosestBlockContainerAt(
  doc: PMNode,
  pos: number
): { from: number; to: number; node: PMNode } | null {
  const safePos = Math.min(Math.max(pos, 0), doc.content.size);
  const $pos = doc.resolve(safePos);
  for (let d = $pos.depth; d > 0; d -= 1) {
    const node = $pos.node(d);
    if (node.type.name === 'blockContainer') {
      return { from: $pos.before(d), to: $pos.after(d), node };
    }
  }
  return null;
}

function deleteRangesAndMaybeRemoveEmptyBlock(params: {
  view: EditorView;
  ranges: Array<{ from: number; to: number }>;
  probePos: number;
}): void {
  const { view, ranges, probePos } = params;
  const sorted = [...ranges].sort((a, b) => b.from - a.from);
  let tr: Transaction = view.state.tr;
  for (const r of sorted) {
    tr = tr.delete(r.from, r.to);
  }
  const mappedProbePos = tr.mapping.map(probePos, -1);
  const blockContainer = findClosestBlockContainerAt(tr.doc as unknown as PMNode, mappedProbePos);
  if (
    blockContainer &&
    !blockContainerHasNestedChildren(blockContainer.node) &&
    isBlockContainerEffectivelyEmpty(blockContainer.node)
  ) {
    tr = tr.delete(blockContainer.from, blockContainer.to);
  }
  view.dispatch(tr);
}

function createMockAskAiSlashMenuItem(editor: unknown) {
  return {
    title: '问AI',
    group: 'AI',
    aliases: ['ai', 'ask', 'askai', '问', '问ai', 'ai-diff', 'diff'],
    subtext: 'Mock：用 AIDiff.mock.ts 数据模拟 AI 修改笔记内容',
    icon: createElement(RiSparklingLine, { size: 18 }),
    onItemClick: () => {
      if (import.meta.env.MODE !== 'mock') {
        return;
      }
      void (async () => {
        const mod = await import('@/domains/Note/mock/AIDiff.mock');
        const mapped = aiGeneratedBlocksToBlockNoteBlocks(mod.MOCK_AI_BLOCKS);
        if (!mapped) return;
        const ed = editor as unknown as {
          document?: unknown;
          replaceBlocks?: (blocks: unknown, newBlocks: unknown) => unknown;
          focus?: () => void;
        };
        const doc = ed.document;
        if (typeof ed.replaceBlocks === 'function' && Array.isArray(doc)) {
          ed.replaceBlocks(doc, mapped);
          ed.focus?.();
        }
      })();
    },
  };
}

// AIDiff 插件本体：向编辑器系统注册（inline specs + extension + editorProps）
export const aiDiffPlugin = {
  id: 'ai-diff',
  // 注册四种行内内容 spec（渲染/导出逻辑在 inlineContentSpecs/inlineContentViews 中）
  inlineContentSpecs: {
    'ai-diff': aiDiffInlineContentSpec,
    'ai-add': aiAddInlineContentSpec,
    'ai-delete': aiDeleteInlineContentSpec,
  },
  extensions: () => [aiDiffBlockFoldExtension()],
  editorProps: () => {
    const props: Partial<EditorProps> = {
      handleDOMEvents: {
        // 拦截处理 Backspace 和 Delete 键按下事件
        // 返回值为boolean，true表示事件被拦截处理完毕，false表示不拦截
        keydown: (view, event) => {
          if (!(event instanceof KeyboardEvent)) return false;
          if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

          const { selection, doc } = view.state;

          if (selection instanceof NodeSelection) {
            const node = selection.node;
            const name = node.type.name;
            const from = selection.from;
            const to = selection.to;
            if (!isAiDiffChangeNodeName(name)) return false;
            event.preventDefault();
            deleteRangesAndMaybeRemoveEmptyBlock({ view, ranges: [{ from, to }], probePos: from });
            return true;
          }

          if (selection instanceof TextSelection && selection.empty) {
            const pos = selection.from;
            const $pos = doc.resolve(pos);

            if (event.key === 'Backspace') {
              const beforeNode = $pos.nodeBefore;
              if (!beforeNode) return false;
              const name = beforeNode.type.name;
              if (!isAiDiffChangeNodeName(name)) return false;

              const from = pos - beforeNode.nodeSize;
              const to = pos;
              event.preventDefault();
              deleteRangesAndMaybeRemoveEmptyBlock({
                view,
                ranges: [{ from, to }],
                probePos: from,
              });
              return true;
            }

            const afterNode = $pos.nodeAfter;
            if (!afterNode) return false;
            const name = afterNode.type.name;
            if (!isAiDiffChangeNodeName(name)) return false;

            const from = pos;
            const to = pos + afterNode.nodeSize;
            event.preventDefault();
            deleteRangesAndMaybeRemoveEmptyBlock({ view, ranges: [{ from, to }], probePos: from });
            return true;
          }

          return false;
        },
      },
    };
    return props;
  },
  // 注册斜杠菜单项（仅在 mock 模式下）
  slashMenu: ({ editor }) => {
    if (import.meta.env.MODE !== 'mock') return [];
    return [createMockAskAiSlashMenuItem(editor)];
  },
} satisfies NoteEditorPlugin;

export {
  acceptAiDiffInlineContent,
  aiGeneratedBlocksToBlockNoteBlocks,
  aiPatchToInlineContent,
  applyAiDiffActionForKey,
  discardAiDiffInlineContent,
  hasAiDiffInlineContent,
  isInlineContentEffectivelyEmpty,
  validateAiPatchAgainstOriginal,
} from './patch';
export type { AiGeneratedBlock, AiPatchItem } from './patch';
