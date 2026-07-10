import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from '@blocknote/react';
import { SuggestionMenuController } from '@blocknote/react';
import { ListBox, ListBoxItem } from '@heroui/react';
import {
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET,
  getNoteSlashMenuItems,
} from './buildSlashMenuItems';
import type { NoteSlashMenuProps } from './index.type';
import { sortSuggestionItemsForDisplay } from './slashMenuModel';
import { SlashMenuListBoxItems } from './slashMenuView';
import styles from './style.module.less';

function getSuggestionItemId(index: number) {
  return `slash-item-${index}`;
}

function SlashMenuState({ text }: { text: string }) {
  return (
    <ListBox aria-label="斜杠菜单" className={styles.menu}>
      <ListBoxItem id="slash-menu-state" textValue={text} isDisabled className={styles.emptyItem}>
        {text}
      </ListBoxItem>
    </ListBox>
  );
}

function NoteSuggestionMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  if (loadingState === 'loading-initial') {
    return <SlashMenuState text="加载中..." />;
  }

  if (items.length === 0) {
    return <SlashMenuState text="无匹配项" />;
  }

  const selectedItemIndex = selectedIndex ?? -1;
  const displayItems = sortSuggestionItemsForDisplay(items);
  const selectedItem = selectedItemIndex >= 0 ? items[selectedItemIndex] : undefined;
  const selectedDisplayIndex = selectedItem ? displayItems.indexOf(selectedItem) : -1;
  const selectedKey =
    selectedDisplayIndex >= 0 ? getSuggestionItemId(selectedDisplayIndex) : undefined;

  return (
    <ListBox
      aria-label="斜杠菜单"
      selectionMode="single"
      selectedKeys={selectedKey ? [selectedKey] : []}
      className={styles.menu}
    >
      <SlashMenuListBoxItems
        items={displayItems}
        getItemId={(_item, index) => getSuggestionItemId(index)}
        onItemClick={onItemClick}
      />
    </ListBox>
  );
}

const NoteSlashMenu = ({ editor, plugins }: NoteSlashMenuProps) => {
  const readOnly = useNoteEditorReadOnlyContext();
  if (readOnly) {
    return null;
  }

  const getItems = async (query: string) => {
    const items = getNoteSlashMenuItems(
      editor,
      plugins,
      NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET
    );
    return sortSuggestionItemsForDisplay(filterSuggestionItems(items, query));
  };

  return (
    <div className={styles.host}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getItems}
        suggestionMenuComponent={NoteSuggestionMenu}
        floatingUIOptions={{
          elementProps: {
            className: styles.floatingLayer,
          },
        }}
        shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
      />
    </div>
  );
};

export default NoteSlashMenu;
