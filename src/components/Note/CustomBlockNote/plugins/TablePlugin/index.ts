import i18n from '@/i18n';
import { defaultBlockSpecs } from '@blocknote/core';
import { PanelLeft, PanelTop, StretchHorizontal, Table2 } from 'lucide-react';

import { collectInlineTextMatches } from '../../engines/search/findReplace';
import type { NoteBlockPlugin, NoteSideMenuAction } from '../../registry/types';
import { readTableContent, TableAiContentView, type TableContentLike } from './AiDiffView';

function tableActions(content: TableContentLike | null): NoteSideMenuAction[] {
  return [
    ...(content
      ? [
          {
            id: 'header-row',
            label: i18n.t('table.headerRow', { ns: 'note' }),
            icon: PanelTop,
            kind: 'toggle' as const,
            selected: Boolean(content.headerRows),
          },
          {
            id: 'header-column',
            label: i18n.t('table.headerColumn', { ns: 'note' }),
            icon: PanelLeft,
            kind: 'toggle' as const,
            selected: Boolean(content.headerCols),
          },
        ]
      : []),
    {
      id: 'reset-column-widths',
      label: i18n.t('table.distributeColumns', { ns: 'note' }),
      icon: StretchHorizontal,
      kind: 'command',
    },
  ];
}

export const tablePlugin = {
  kind: 'block',
  id: 'table',
  type: 'table',
  contentModel: 'table',
  spec: defaultBlockSpecs.table,
  capabilities: {
    markdownImport: { support: 'default' },
    markdownExport: { support: 'default' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'custom' },
    findReplace: { support: 'custom' },
    print: { support: 'custom' },
  },
  selection: {
    inspect: (_block, context) => ({ selected: context.selected, text: context.selectedText }),
  },
  aiDiff: {
    renderAiContent: TableAiContentView,
  },
  print: {
    styles: [
      `.note-print-body .bn-block-content[data-content-type='table'],
.note-print-body table {
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.note-print-body table {
  max-width: 100% !important;
}`,
    ],
  },
  plainText: { project: () => '' },
  findReplace: {
    collectMatches: ({ node, pos, query }) => collectInlineTextMatches(node, pos, query, 'table'),
  },
  sideMenu: {
    icon: Table2,
    inspect(block) {
      return { variant: 'structured', actions: tableActions(readTableContent(block)) };
    },
    apply(block, actionId) {
      const content = readTableContent(block);
      if (!content) return null;
      if (actionId === 'header-row') {
        return {
          type: 'table',
          content: { ...content, headerRows: content.headerRows ? undefined : 1 },
        };
      }
      if (actionId === 'header-column') {
        return {
          type: 'table',
          content: { ...content, headerCols: content.headerCols ? undefined : 1 },
        };
      }
      if (actionId === 'reset-column-widths') {
        const columnCount = content.columnWidths.length || content.rows[0]?.cells.length || 0;
        return {
          type: 'table',
          content: {
            ...content,
            columnWidths: Array.from({ length: columnCount }, () => undefined),
          },
        };
      }
      return null;
    },
  },
} satisfies NoteBlockPlugin;
