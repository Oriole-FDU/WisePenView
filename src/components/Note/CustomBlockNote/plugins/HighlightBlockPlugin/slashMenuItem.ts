import i18n from '@/i18n';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Highlighter } from 'lucide-react';
import { createElement } from 'react';

import type { PluginEditor } from '../../registry/types';

type SlashMenuPartialBlock = Parameters<typeof insertOrUpdateBlockForSlashMenu>[1];

export function createHighlightBlockSlashMenuItem(
  editor: PluginEditor
): DefaultReactSuggestionItem {
  const highlightBlock = {
    type: 'highlightBlock',
    props: {
      icon: '💡',
      highlightBackgroundColor: 'default',
      highlightBorderColor: 'auto',
      highlightTextColor: 'default',
      textAlignment: 'left',
    },
  } as unknown as SlashMenuPartialBlock;

  return {
    title: i18n.t('slashMenu.item.highlightBlock', { ns: 'note' }),
    group: 'common',
    aliases: ['highlight', 'callout', 'panel', '高亮', '高亮块', '提示'],
    subtext: i18n.t('slashMenu.item.highlightBlockDescription', { ns: 'note' }),
    icon: createElement(Highlighter, { size: 18 }),
    onItemClick: () => {
      const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, highlightBlock);
      window.requestAnimationFrame(() => {
        const currentBlock = editor.getBlock(insertedBlock.id);
        if (!currentBlock || currentBlock.type !== 'highlightBlock') return;
        editor.setTextCursorPosition(currentBlock, 'start');
        editor.focus();
      });
    },
  };
}
