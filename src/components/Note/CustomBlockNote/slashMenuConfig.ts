import type { BlockNoteEditor } from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';

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

export function buildNoteSlashMenuItems(editor: BlockNoteEditor): DefaultReactSuggestionItem[] {
  return getDefaultReactSlashMenuItems(editor).filter((item) => !shouldHideMenuItem(item));
}
