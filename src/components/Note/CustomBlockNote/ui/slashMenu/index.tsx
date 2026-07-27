import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/engines/editor/readOnly';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from '@blocknote/react';
import { SuggestionMenuController, useBlockNoteEditor } from '@blocknote/react';
import { ListBox, ListBoxItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { blockNoteSchema, type CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NoteContentPlugin } from '../../registry/types';
import {
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET,
  getNoteSlashMenuItems,
  getSlashMenuItemKey,
} from './buildSlashMenuItems';
import { sortSuggestionItemsForDisplay } from './slashMenuModel';
import { SlashMenuListBoxItems } from './slashMenuView';
import styles from './style.module.less';
import { getSlashMenuItemId, useSlashMenuNavigation } from './useSlashMenuNavigation';

interface NoteSlashMenuProps {
  editor: CustomBlockNoteEditor;
  plugins: readonly NoteContentPlugin[];
}

function getSuggestionMenuContentKey(items: DefaultReactSuggestionItem[]) {
  return items
    .map(
      (item, index) =>
        getSlashMenuItemKey(item) ?? `${item.group ?? 'other'}:${item.title}:${index}`
    )
    .join('|');
}

function SlashMenuState({ text }: { text: string }) {
  const { t } = useTranslation('note');
  return (
    <ListBox id="bn-suggestion-menu" aria-label={t('slashMenu.label')} className={styles.menuState}>
      <ListBoxItem id="slash-menu-state" textValue={text} isDisabled className={styles.emptyItem}>
        {text}
      </ListBoxItem>
    </ListBox>
  );
}

function NoteSuggestionMenuList({
  editor,
  items,
  onItemClick,
}: {
  editor: CustomBlockNoteEditor;
  items: DefaultReactSuggestionItem[];
  onItemClick?: (item: DefaultReactSuggestionItem) => void;
}) {
  const { t } = useTranslation('note');
  const {
    canScrollDown,
    canScrollUp,
    handleItemMouseMove,
    handleScroll,
    hoveredIndex,
    isKeyboardNavigating,
    viewportRef,
  } = useSlashMenuNavigation({ editor, items, onItemClick });
  const hoveredItemId = getSlashMenuItemId(hoveredIndex);

  return (
    <div
      className={styles.menuShell}
      data-can-scroll-down={canScrollDown || undefined}
      data-can-scroll-up={canScrollUp || undefined}
      data-keyboard-navigation={isKeyboardNavigating || undefined}
    >
      <span aria-hidden className={styles.keyboardFrame} />
      <div ref={viewportRef} className={styles.menuViewport} onScroll={handleScroll}>
        <ListBox id="bn-suggestion-menu" aria-label={t('slashMenu.label')} className={styles.menu}>
          <SlashMenuListBoxItems
            items={items}
            getItemId={(_item, index) => getSlashMenuItemId(index)}
            hoveredItemId={isKeyboardNavigating ? undefined : hoveredItemId}
            onItemClick={onItemClick}
            onItemMouseMove={handleItemMouseMove}
          />
        </ListBox>
      </div>
    </div>
  );
}

function NoteSuggestionMenu({
  items: displayItems,
  loadingState,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const { t } = useTranslation('note');
  const editor = useBlockNoteEditor(blockNoteSchema);

  if (loadingState === 'loading-initial') {
    return <SlashMenuState text={t('slashMenu.loading')} />;
  }

  if (displayItems.length === 0) {
    return <SlashMenuState text={t('slashMenu.empty')} />;
  }

  return (
    <NoteSuggestionMenuList
      key={getSuggestionMenuContentKey(displayItems)}
      editor={editor}
      items={displayItems}
      onItemClick={onItemClick}
    />
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
