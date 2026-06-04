import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Sigma } from 'lucide-react';
import { createElement } from 'react';

import type { PluginEditor } from '../types';

/** `insertOrUpdateBlockForSlashMenu` 第二个参数的类型（PartialBlock<...>） */
type SlashMenuPartialBlock = Parameters<typeof insertOrUpdateBlockForSlashMenu>[1];

/**
 * 「公式」菜单项：点击后插入空 `math` 块并触发块内自动进入编辑态。
 */
export function createMathSlashMenuItem(editor: PluginEditor): DefaultReactSuggestionItem {
  const mathBlock = {
    type: 'math',
    props: { expression: '', autoEdit: true },
  } as unknown as SlashMenuPartialBlock;
  return {
    title: '公式',
    group: '高级',
    aliases: ['math', 'katex', 'latex', 'block', '块', 'equation', '独立'],
    subtext: '插入独占一行的块级 KaTeX 公式',
    icon: createElement(Sigma, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mathBlock),
  };
}
