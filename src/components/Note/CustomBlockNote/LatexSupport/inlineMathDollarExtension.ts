import { createExtension, getBlockInfo, inlineContentToNodes, nodeToBlock } from '@blocknote/core';
import type { InlineContent } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { blockNoteSchema } from '../blockNoteSchema';
import type { CustomBlockNoteEditor } from '../blockNoteSchema';

type NoteInlineContent = InlineContent<
  typeof blockNoteSchema.inlineContentSchema,
  typeof blockNoteSchema.styleSchema
>;

const inlineMathDollarPluginKey = new PluginKey('wisePenInlineMathDollar');

const ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
]);

function splitDoubleDollar(text: string): { before: string; expr: string; after: string } | null {
  const open = text.indexOf('$$');
  if (open === -1) {
    return null;
  }
  const close = text.indexOf('$$', open + 2);
  if (close === -1) {
    return null;
  }
  const expr = text.slice(open + 2, close);
  if (expr.includes('\n')) {
    return null;
  }
  return {
    before: text.slice(0, open),
    expr,
    after: text.slice(close + 2),
  };
}

/**
 * 在文本行内定位第一个 `$$…$$`（中间无换行），替换为 `inlineMath`（仅顶层 `text` 节点；链接内文本不转换）。
 */
function transformInlineContentOnce(content: NoteInlineContent[]): NoteInlineContent[] | null {
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (item.type === 'text') {
      const split = splitDoubleDollar(item.text);
      if (split) {
        const next = content.slice();
        const pieces: NoteInlineContent[] = [];
        if (split.before.length > 0) {
          pieces.push({
            type: 'text',
            text: split.before,
            styles: item.styles,
          });
        }
        pieces.push({
          type: 'inlineMath',
          props: {
            expression: split.expr,
            autoOpenEdit: split.expr === '',
          },
        } as NoteInlineContent);
        if (split.after.length > 0) {
          pieces.push({
            type: 'text',
            text: split.after,
            styles: item.styles,
          });
        }
        next.splice(i, 1, ...pieces);
        return next;
      }
    }
  }
  return null;
}

export const inlineMathDollarExtension = createExtension(
  ({ editor }: { editor: CustomBlockNoteEditor }) => {
    return {
      key: 'wisePenInlineMathDollar',
      prosemirrorPlugins: [
        new Plugin({
          key: inlineMathDollarPluginKey,
          appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((t) => t.docChanged)) {
              return null;
            }
            if (transactions.some((t) => t.getMeta(inlineMathDollarPluginKey) === 'skip')) {
              return null;
            }

            const replacements: Array<{
              beforePos: number;
              blockType: string;
              blockProps: Record<string, boolean | number | string>;
              content: NoteInlineContent[];
            }> = [];

            newState.doc.descendants((node, pos) => {
              if (node.type.name !== 'blockContainer') {
                return true;
              }

              const block = nodeToBlock(
                node,
                newState.schema,
                editor.schema.blockSchema,
                editor.schema.inlineContentSchema,
                editor.schema.styleSchema
              );

              if (!ALLOWED_BLOCK_TYPES.has(block.type)) {
                return true;
              }
              if (!Array.isArray(block.content)) {
                return true;
              }

              const transformed = transformInlineContentOnce(block.content as NoteInlineContent[]);
              if (!transformed) {
                return true;
              }

              replacements.push({
                beforePos: pos,
                blockType: block.type,
                blockProps: block.props,
                content: transformed,
              });
              return true;
            });

            if (replacements.length === 0) {
              return null;
            }

            replacements.sort((a, b) => b.beforePos - a.beforePos);

            let tr = newState.tr;
            tr.setMeta(inlineMathDollarPluginKey, 'skip');

            for (const rep of replacements) {
              const node: PMNode | null = tr.doc.nodeAt(rep.beforePos);
              if (!node || node.type.name !== 'blockContainer') {
                continue;
              }
              const blockInfo = getBlockInfo({ posBeforeNode: rep.beforePos, node });
              if (!blockInfo.isBlockContainer) {
                continue;
              }

              const newNodeType = tr.doc.type.schema.nodes[rep.blockType];
              const nodes = inlineContentToNodes(
                rep.content,
                tr.doc.type.schema,
                rep.blockType,
                editor.schema.styleSchema
              );

              tr = tr.replaceWith(
                blockInfo.blockContent.beforePos,
                blockInfo.blockContent.afterPos,
                newNodeType.createChecked(
                  {
                    ...blockInfo.blockContent.node.attrs,
                    ...rep.blockProps,
                  },
                  nodes
                )
              );
            }

            return tr;
          },
        }),
      ],
    };
  }
);
