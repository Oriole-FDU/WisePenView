import { createElement } from 'react';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import { RiFormula, RiTextWrap } from 'react-icons/ri';

import type {
  CustomBlockNoteEditor,
  CustomBlockNotePartialBlock,
} from './BlockSchema/blockNoteSchema';

/**
 * BlockNote 在 `getDefaultSlashMenuItems`（@blocknote/core/extensions）里为每个默认项设置了稳定字段 `key`，
 * 与字典 `slash_menu.*` 及图标映射一致，例如：
 * - `file` → 插入 `type: "file"` 并打开文件面板（通用文档/附件）
 * - `image` / `video` / `audio` → 对应媒体块，也会打开文件面板选源
 *
 * 这里按 `key` 精确隐藏，避免用文案关键词误伤（如 “profile” 含 “file” 子串等）。
 */
type SlashMenuItemWithKey = DefaultReactSuggestionItem & { key?: string };

function getSlashMenuItemKey(item: DefaultReactSuggestionItem): string | undefined {
  const key = (item as SlashMenuItemWithKey).key;
  return typeof key === 'string' ? key : undefined;
}

/** 需要从 / 菜单中移除的默认项 key（与 BlockNote 源码一致） */
const NOTE_SLASH_MENU_BLOCKED_KEYS = new Set<string>(['file', 'audio', 'video']);

function shouldHideMenuItem(item: DefaultReactSuggestionItem): boolean {
  const key = getSlashMenuItemKey(item);
  return key !== undefined && NOTE_SLASH_MENU_BLOCKED_KEYS.has(key);
}

function createInlineMathSlashMenuItem(editor: CustomBlockNoteEditor): DefaultReactSuggestionItem {
  const mathBlock: CustomBlockNotePartialBlock = {
    type: 'math',
    props: { expression: '', variant: 'inline', autoEdit: true },
  };
  return {
    title: '行内公式',
    group: '高级',
    aliases: ['math', 'katex', 'latex', 'inline', '行内', '公式'],
    subtext: '插入与正文同行的 KaTeX 公式',
    icon: createElement(RiTextWrap, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mathBlock),
  };
}

function createBlockMathSlashMenuItem(editor: CustomBlockNoteEditor): DefaultReactSuggestionItem {
  const mathBlock: CustomBlockNotePartialBlock = {
    type: 'math',
    props: { expression: '', variant: 'block', autoEdit: true },
  };
  return {
    title: '独立公式',
    group: '高级',
    aliases: ['math', 'katex', 'latex', 'block', '块', 'equation', '独立'],
    subtext: '插入独占一行的块级 KaTeX 公式',
    icon: createElement(RiFormula, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mathBlock),
  };
}

export function buildNoteSlashMenuItems(
  editor: CustomBlockNoteEditor
): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(editor as unknown as CustomBlockNoteEditor).filter(
    (item) => !shouldHideMenuItem(item)
  );
  return [...defaults, createInlineMathSlashMenuItem(editor), createBlockMathSlashMenuItem(editor)];
}
