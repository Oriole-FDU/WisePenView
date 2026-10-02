import type {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContent,
} from '@blocknote/core';
import { createExtension, getBlockInfo, inlineContentToNodes, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import type { NotePluginRegistry, NoteTransactionService } from '../../../registry/types';
import { sanitizeLatexInput } from '../latexInput';

/**
 * 行内内容的结构性类型：BlockNote 默认 inline content（text/link）+ 由本扩展插入的 inlineMath。
 *
 * 不直接使用 `typeof blockNoteSchema.inlineContentSchema`，避免与 schema 派生的 `CustomBlockNoteEditor`
 * 形成 `latexPlugin → blockNoteSchema → latexPlugin` 的循环类型引用。
 */
type DefaultInlineContent = InlineContent<DefaultInlineContentSchema, DefaultStyleSchema>;

interface InlineMathContent {
  type: 'inlineMath';
  props: {
    expression: string;
    autoOpenEdit: boolean;
  };
}

type NoteInlineContent = DefaultInlineContent | InlineMathContent;

const inlineMathDollarPluginKey = new PluginKey('wisePenInlineMathDollar');

function splitDoubleDollar(text: string): { before: string; expr: string; after: string } | null {
  const open = text.indexOf('$$');
  if (open === -1) {
    return null;
  }
  const close = text.indexOf('$$', open + 2);
  if (close === -1) {
    return null;
  }
  const expr = sanitizeLatexInput(text.slice(open + 2, close));
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
        });
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

export const createInlineMathDollarExtension = (
  registry: NotePluginRegistry,
  transactionService: NoteTransactionService
) =>
  createExtension(({ editor }) => {
    return {
      key: 'wisePenInlineMathDollar',
      prosemirrorPlugins: [
        new Plugin({
          key: inlineMathDollarPluginKey,
          appendTransaction(transactions, _oldState, newState) {
            const analysis = transactionService.analyze(transactions);
            if (!analysis.docChanged) return null;
            if (transactions.some((t) => t.getMeta(inlineMathDollarPluginKey) === 'skip')) {
              return null;
            }

            const replacements: Array<{
              beforePos: number;
              blockType: string;
              blockProps: Record<string, boolean | number | string>;
              content: NoteInlineContent[];
            }> = [];

            analysis.changedBlocks.forEach(({ node, pos }) => {
              if (!node.textContent.includes('$')) return;
              const block = nodeToBlock(
                node,
                newState.schema,
                editor.schema.blockSchema,
                editor.schema.inlineContentSchema,
                editor.schema.styleSchema
              );

              if (!registry.blockPlugins.get(block.type)?.inputRules?.inlineMathDollar) {
                return;
              }
              if (!Array.isArray(block.content)) {
                return;
              }

              const transformed = transformInlineContentOnce(
                block.content as unknown as NoteInlineContent[]
              );
              if (!transformed) return;

              replacements.push({
                beforePos: pos,
                blockType: block.type,
                blockProps: block.props,
                content: transformed,
              });
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
                rep.content as never,
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
  });
