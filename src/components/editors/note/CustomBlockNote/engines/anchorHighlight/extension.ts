import { createExtension } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { NoteEditorExtension } from '../../registry/types';
import styles from './style.module.scss';

/** 目标块闪烁时长：前 1s 满亮度保持，随后 250ms 迅速衰减到透明，与 style.module.scss 的关键帧一致。 */
export const NOTE_ANCHOR_HIGHLIGHT_DURATION_MS = 1_250;

interface AnchorHighlightMeta {
  /** 需要闪烁的块 id；传 null 清除。 */
  blockId: string | null;
}

interface AnchorHighlightState {
  blockId: string | null;
  decorations: DecorationSet;
}

const anchorHighlightPluginKey = new PluginKey<AnchorHighlightState>('noteAnchorHighlight');
const BLOCK_CONTAINER_TYPE = 'blockContainer';

/**
 * 目标块闪烁必须走 ProseMirror 节点装饰。
 *
 * 编辑器 DOM 由 ProseMirror 托管：外部改 `classList` 会被 DOMObserver 当成 DOM 变更，
 * 目标块随即被标记为 `NODE_DIRTY`，并在同一个微任务里 destroy 后重建，
 * 类名撑不到浏览器绘制，动画一帧都不会播放（表现为"时序正确但看不到闪烁"）。
 */
function buildAnchorHighlightDecorations(doc: PMNode, blockId: string | null): DecorationSet {
  if (!blockId) return DecorationSet.empty;

  const blocks: Array<{ node: PMNode; pos: number }> = [];
  doc.descendants((node, pos) => {
    if (node.type.name === BLOCK_CONTAINER_TYPE) blocks.push({ node, pos });
    return true;
  });
  const target = blocks.find((item) => item.node.attrs.id === blockId);
  if (!target) return DecorationSet.empty;

  return DecorationSet.create(doc, [
    Decoration.node(target.pos, target.pos + target.node.nodeSize, {
      class: styles.anchorHighlight,
    }),
  ]);
}

function createAnchorHighlightExtension() {
  return createExtension({
    key: 'noteAnchorHighlight',
    prosemirrorPlugins: [
      new Plugin<AnchorHighlightState>({
        key: anchorHighlightPluginKey,
        state: {
          init: () => ({ blockId: null, decorations: DecorationSet.empty }),
          apply: (tr, previous) => {
            const meta: AnchorHighlightMeta | undefined = tr.getMeta(anchorHighlightPluginKey);
            if (!meta) {
              if (!tr.docChanged || !previous.blockId) return previous;
              return {
                blockId: previous.blockId,
                decorations: buildAnchorHighlightDecorations(
                  tr.doc as unknown as PMNode,
                  previous.blockId
                ),
              };
            }
            return {
              blockId: meta.blockId,
              decorations: buildAnchorHighlightDecorations(
                tr.doc as unknown as PMNode,
                meta.blockId
              ),
            };
          },
        },
        props: {
          decorations: (state) => anchorHighlightPluginKey.getState(state)?.decorations ?? null,
        },
      }),
    ],
  });
}

/** 设置或清除目标块闪烁；装饰由 ProseMirror 自己写入 DOM，不会被回滚。 */
export function setNoteAnchorHighlightBlock(view: EditorView, blockId: string | null): void {
  view.dispatch(
    view.state.tr
      .setMeta(anchorHighlightPluginKey, { blockId } satisfies AnchorHighlightMeta)
      .setMeta('addToHistory', false)
  );
}

/** 从编辑器 DOM 反查目标元素所属块 id：装饰只能落在块节点上。 */
export function resolveAnchorHighlightBlockId(element: HTMLElement): string | null {
  const wrapper = element.closest<HTMLElement>('.bn-block-outer');
  if (!wrapper) return null;
  return (
    wrapper.getAttribute('data-id') ??
    wrapper
      .querySelector<HTMLElement>('[data-node-type="blockContainer"][data-id]')
      ?.getAttribute('data-id') ??
    null
  );
}

export const anchorHighlightEditorExtension = {
  id: 'anchorHighlight.extension',
  extensions: () => [createAnchorHighlightExtension()],
} satisfies NoteEditorExtension;
