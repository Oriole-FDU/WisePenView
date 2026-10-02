import { createBlockKeyboardNavigationExtension } from '../../engines/editor/keyboardNavigation';
import { collectNodeAttributeTextMatches } from '../../engines/search/findReplace';
import type { NoteBlockPlugin, NoteInlinePlugin, NotePluginBundle } from '../../registry/types';
import { inlineMathAiDiff, mathBlockAiDiff } from './aiDiff';
import { inlineMathContentSpec } from './InlineMath';
import { createInlineMathDollarExtension } from './InlineMath/inlineMathDollarExtension';
import { inlineMathMarkdownImport, mathBlockMarkdownImport } from './markdownImport';
import { createMathBlockSpec } from './MathBlock';
import { createMathSlashMenuItem } from './slashMenuItem';

const mathBlockPlugin = {
  kind: 'block',
  id: 'latex.block.math',
  type: 'math',
  contentModel: 'none',
  spec: createMathBlockSpec(),
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'custom' },
    findReplace: { support: 'custom' },
    print: { support: 'custom' },
  },
  selection: {
    inspect: (block, context) => {
      if (context.selectedText) {
        return { selected: context.selected, text: context.selectedText };
      }
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      return {
        selected: context.selected,
        text: typeof props.expression === 'string' ? props.expression : '',
      };
    },
  },
  extensions: () => [createBlockKeyboardNavigationExtension('math')],
  print: {
    styles: [
      `.note-print-body .bn-block-content[data-content-type='math'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.note-print-body .bn-editor .katex-display,
.note-print-title .katex-display {
  margin: 0.6em 0 !important;
}`,
    ],
  },
  slashMenu: ({ editor }) => [createMathSlashMenuItem(editor)],
  plainText: {
    project: (block) => {
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  findReplace: {
    collectMatches: ({ node, pos, query }) =>
      collectNodeAttributeTextMatches(node, pos, 'expression', query, 'latex.block.math'),
  },
  markdownImport: mathBlockMarkdownImport,
  markdownExport: {
    project: (block) => block,
    renderMarkdown(block) {
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      const expression = typeof props.expression === 'string' ? props.expression.trim() : '';
      return `$$\n${expression}\n$$`;
    },
  },
  aiDiff: mathBlockAiDiff,
} satisfies NoteBlockPlugin;

const inlineMathPlugin = {
  kind: 'inline',
  id: 'latex.inline.inlineMath',
  type: 'inlineMath',
  spec: inlineMathContentSpec,
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'custom' },
    findReplace: { support: 'custom' },
    print: { support: 'default' },
  },
  selection: {
    inspect: (inline, context) => {
      if (context.selectedText) {
        return { selected: context.selected, text: context.selectedText };
      }
      const props =
        typeof inline.props === 'object' && inline.props !== null
          ? (inline.props as Record<string, unknown>)
          : {};
      return {
        selected: context.selected,
        text: typeof props.expression === 'string' ? props.expression : '',
      };
    },
  },
  extensions: ({ registry, services }) => [
    createInlineMathDollarExtension(registry, services.transactions)(),
  ],
  plainText: {
    project: (inline) => {
      const props =
        typeof inline.props === 'object' && inline.props !== null
          ? (inline.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  findReplace: {
    collectMatches: ({ node, pos, query }) =>
      collectNodeAttributeTextMatches(node, pos, 'expression', query, 'latex.inline.inlineMath'),
  },
  markdownImport: inlineMathMarkdownImport,
  markdownExport: { project: (inline) => inline },
  aiDiff: inlineMathAiDiff,
} satisfies NoteInlinePlugin;

export const latexPlugin = {
  kind: 'bundle',
  id: 'latex',
  children: [mathBlockPlugin, inlineMathPlugin],
} satisfies NotePluginBundle;
