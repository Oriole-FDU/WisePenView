import i18n from '@/i18n';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Workflow } from 'lucide-react';
import { createElement } from 'react';

import type { PluginEditor } from '../../registry/types';
import { DEFAULT_MERMAID_SOURCE } from './source';

/** `insertOrUpdateBlockForSlashMenu` 第二个参数的类型（PartialBlock<...>）。 */
type SlashMenuPartialBlock = Parameters<typeof insertOrUpdateBlockForSlashMenu>[1];

export function createMermaidSlashMenuItem(editor: PluginEditor): DefaultReactSuggestionItem {
  const mermaidBlock = {
    type: 'mermaid',
    content: DEFAULT_MERMAID_SOURCE,
  } as unknown as SlashMenuPartialBlock;

  return {
    title: i18n.t('slashMenu.item.mermaid', { ns: 'note' }),
    group: 'advanced',
    aliases: ['mermaid', 'diagram', 'flowchart', 'chart', '图表', '流程图'],
    subtext: i18n.t('slashMenu.item.mermaidDescription', { ns: 'note' }),
    icon: createElement(Workflow, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mermaidBlock),
  };
}
