import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { SuggestionMenuController } from '@blocknote/react';
import {
  collectPluginSlashMenuItems,
  getFilteredDefaultReactSlashMenuItems,
} from './buildSlashMenuItems';
import type { NoteSlashMenuProps } from './index.type';
import styles from './style.module.less';

/**
 * BlockNote 在 `getDefaultReactSlashMenuItems` 里为每个默认项设置了稳定字段 `key`，
 * 与字典 `slash_menu.*` 及图标映射一致；此处声明要从 / 菜单中移除的默认项。
 *
 * 当前移除：
 * - `file` → 通用文档/附件
 * - `audio`、`video` → 媒体块
 */
const NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEYS = ['file', 'audio', 'video'] as const;

const NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET = new Set<string>(
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEYS
);

const NoteSlashMenu = ({ editor, plugins }: NoteSlashMenuProps) => {
  const readOnly = useNoteEditorReadOnlyContext();
  if (readOnly) {
    return null;
  }

  const getItems = async (query: string) => {
    const items = [
      ...getFilteredDefaultReactSlashMenuItems(
        editor,
        NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET
      ),
      ...collectPluginSlashMenuItems(plugins, editor),
    ];
    return filterSuggestionItems(items, query);
  };

  return (
    <div className={styles.host}>
      <SuggestionMenuController triggerCharacter="/" getItems={getItems} />
    </div>
  );
};

export default NoteSlashMenu;
