import { createBlockKeyboardNavigationExtension } from '../../engines/editor/keyboardNavigation';
import { collectInlineTextMatches } from '../../engines/search/findReplace';
import type { NoteBlockPlugin, NotePluginBundle } from '../../registry/types';
import { createMermaidBlockSpec } from './MermaidBlock';
import { mermaidCodeEditorExtension } from './codeEditorExtension';
import { mermaidMarkdownImport } from './markdownImport';
import { createMermaidSlashMenuItem } from './slashMenuItem';
import { readMermaidSource } from './source';

function createMarkdownFence(source: string): string {
  let longestBacktickRun = 0;
  for (const match of source.matchAll(/`+/g)) {
    longestBacktickRun = Math.max(longestBacktickRun, match[0].length);
  }
  return '`'.repeat(Math.max(3, longestBacktickRun + 1));
}

const mermaidBlockPlugin = {
  kind: 'block',
  id: 'mermaid.block',
  type: 'mermaid',
  dependencies: ['codeBlock'],
  contentModel: 'inline',
  spec: createMermaidBlockSpec(),
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'unsupported', reason: '图表 DSL 暂未定义可审阅的差异语义' },
    plainText: { support: 'custom' },
    findReplace: { support: 'custom' },
    print: { support: 'custom' },
  },
  selection: {
    inspect: (block, context) => ({
      selected: context.selected,
      text: context.selectedText || readMermaidSource(block.content),
    }),
  },
  slashMenu: ({ editor }) => [createMermaidSlashMenuItem(editor)],
  extensions: () => [mermaidCodeEditorExtension, createBlockKeyboardNavigationExtension('mermaid')],
  print: {
    styles: [
      `
        .note-print-body .bn-block-content[data-content-type='mermaid'] [data-mermaid-toolbar-actions] {
          display: none !important;
        }
      `,
    ],
  },
  plainText: {
    project: (block) => readMermaidSource(block.content),
  },
  findReplace: {
    collectMatches: ({ node, pos, query }) =>
      collectInlineTextMatches(node, pos, query, 'mermaid.block'),
  },
  markdownImport: mermaidMarkdownImport,
  markdownExport: {
    project: (block) => block,
    renderMarkdown(block) {
      const source = readMermaidSource(block.content);
      const marker = createMarkdownFence(source);
      return `${marker}mermaid\n${source}\n${marker}`;
    },
  },
} satisfies NoteBlockPlugin;

/** Note 内部 Mermaid 图表能力；不与聊天 Markdown 渲染模块共享 UI 或状态。 */
export const mermaidPlugin = {
  kind: 'bundle',
  id: 'mermaid',
  children: [mermaidBlockPlugin],
} satisfies NotePluginBundle;
