import { Highlighter } from 'lucide-react';

import { createBlockKeyboardNavigationExtension } from '../../engines/editor/keyboardNavigation';
import { projectInlinePlainText } from '../../engines/plainText';
import { collectInlineTextMatches } from '../../engines/search/findReplace';
import type { NoteBlockPlugin, NotePluginBundle } from '../../registry/types';
import type { NoteRichTextAiDiffConfig } from '../DefaultContentPlugin/aiDiff';
import { createHighlightBlockAiDiff } from './aiDiff';
import { createHighlightBlockSpec } from './HighlightBlock';
import { createHighlightBlockSlashMenuItem } from './slashMenuItem';

export function createHighlightBlockPlugin(
  aiDiffConfig: NoteRichTextAiDiffConfig
): NotePluginBundle {
  const blockPlugin = {
    kind: 'block',
    id: 'highlight.block',
    type: 'highlightBlock',
    dependencies: ['default.inline.text', 'default.inline.link', 'default.block.paragraph'],
    contentModel: 'inline',
    spec: createHighlightBlockSpec(),
    extensions: () => [createBlockKeyboardNavigationExtension('highlightBlock')],
    inputRules: { inlineMathDollar: true },
    capabilities: {
      markdownImport: {
        support: 'unsupported',
        reason: 'Markdown 不携带高亮块视觉语义，导入时按普通正文处理',
      },
      markdownExport: { support: 'custom' },
      aiDiff: { support: 'custom' },
      plainText: { support: 'custom' },
      findReplace: { support: 'custom' },
      print: { support: 'custom' },
    },
    selection: {
      inspect: (_block, context) => ({ selected: context.selected, text: context.selectedText }),
    },
    slashMenu: ({ editor }) => [createHighlightBlockSlashMenuItem(editor)],
    sideMenu: {
      icon: Highlighter,
      inspect: (block) => {
        const props =
          typeof block.props === 'object' && block.props !== null
            ? (block.props as Record<string, unknown>)
            : {};
        return {
          attributes: {
            'highlight-color':
              typeof props.highlightBackgroundColor === 'string'
                ? props.highlightBackgroundColor
                : 'default',
          },
        };
      },
    },
    print: {
      styles: [
        `.note-print-body .bn-block-content[data-content-type='highlightBlock'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.note-print-body [data-highlight-block-controls] button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: var(--control-height-sm, 28px) !important;
  height: var(--control-height-sm, 28px) !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
  pointer-events: none !important;
}
.note-print-body [data-highlight-block-icon] {
  display: inline-flex !important;
}`,
      ],
    },
    plainText: {
      project: (block, registry) => projectInlinePlainText(block.content, registry),
    },
    findReplace: {
      collectMatches: ({ node, pos, query }) =>
        collectInlineTextMatches(node, pos, query, 'highlight.block'),
    },
    markdownExport: {
      project: (block) => ({
        ...block,
        type: 'paragraph',
        props: {
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
        },
      }),
    },
    aiDiff: createHighlightBlockAiDiff(aiDiffConfig),
  } satisfies NoteBlockPlugin;

  return {
    kind: 'bundle',
    id: 'highlight',
    children: [blockPlugin],
  };
}
