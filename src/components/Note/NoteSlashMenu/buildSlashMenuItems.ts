import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';

import type { CustomBlockNoteEditor } from '../CustomBlockNote/blockNoteSchema';
import type { NoteEditorPlugin, PluginEditor } from '../CustomBlockNote/plugins/types';

/**
 * BlockNote 默认 slash 菜单项在源码中带稳定字段 `key`，但未对外公开类型；这里收敛窄化避免使用 any。
 */
type SlashMenuItemWithKey = DefaultReactSuggestionItem & { key?: string };

export function getSlashMenuItemKey(item: DefaultReactSuggestionItem): string | undefined {
  const key = (item as SlashMenuItemWithKey).key;
  return typeof key === 'string' ? key : undefined;
}

/**
 * BlockNote 默认 slash 项按 `hiddenKeys` 裁剪（key 与 BlockNote 默认项上的 `key` 一致）。
 */
export function getFilteredDefaultReactSlashMenuItems(
  editor: CustomBlockNoteEditor,
  hiddenKeys: ReadonlySet<string> | readonly string[]
): DefaultReactSuggestionItem[] {
  const hidden = hiddenKeys instanceof Set ? hiddenKeys : new Set(hiddenKeys);
  return getDefaultReactSlashMenuItems(editor).filter((item) => {
    const key = getSlashMenuItemKey(item);
    return key === undefined || !hidden.has(key);
  });
}

/**
 * 按插件顺序收集各插件贡献的 slash 菜单项。
 */
export function collectPluginSlashMenuItems(
  plugins: readonly NoteEditorPlugin[],
  editor: CustomBlockNoteEditor
): DefaultReactSuggestionItem[] {
  // BlockNoteEditor 的若干配置（如 dropCursor 回调）让 editor 类型在 callback 参数位置不变（invariant），
  // 因此具体 schema 的 editor 不能直接赋值给宽类型 PluginEditor，这里在边界处做一次断言。
  const pluginEditor = editor as unknown as PluginEditor;
  return plugins.flatMap((plugin) => plugin.slashMenu?.({ editor: pluginEditor }) ?? []);
}
