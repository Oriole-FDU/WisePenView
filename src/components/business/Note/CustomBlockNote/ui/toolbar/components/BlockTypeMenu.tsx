import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Dropdown, Label } from '@heroui/react';
import { Heading } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import {
  applyBlockTypeToBlocks,
  blockMatchesBlockTypeItem,
  type BlockTypeMenuItem,
  getAvailableBlockTypeItems,
} from '@/components/business/Note/CustomBlockNote/ui/editorMenus/blockTypes';

import styles from '../style.module.less';
import { getSelectedBlocks } from '../utils';
import { type ButtonGroupChildProps, ToolbarButton } from './ToolbarButton';

function BlockTypeDropdownItem({ item }: { item: BlockTypeMenuItem }) {
  const Icon = item.icon;
  return (
    <Dropdown.Item id={item.key} textValue={item.label}>
      <Icon size={20} aria-hidden="true" />
      <Label>{item.label}</Label>
      <Dropdown.ItemIndicator />
    </Dropdown.Item>
  );
}

export function BlockTypeMenu(buttonGroupProps: ButtonGroupChildProps) {
  const { t } = useTranslation('note');
  const editor = useBlockNoteEditor(blockNoteSchema);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }
      const selectedBlocks = getSelectedBlocks(editor);
      const firstBlock = selectedBlocks[0];
      const { primaryItems, headingItems, allItems } = getAvailableBlockTypeItems(editor);
      const selectedItem = [...primaryItems, ...headingItems].find((item) =>
        blockMatchesBlockTypeItem(firstBlock, item)
      );
      return { selectedBlocks, primaryItems, headingItems, allItems, selectedItem };
    },
  });

  if (!state || !state.selectedItem) {
    return null;
  }

  const selectedItem = state.selectedItem;
  const selectedInMoreHeading = state.headingItems.some((item) => item.key === selectedItem.key);
  const SelectedIcon = selectedItem.icon;
  const itemMap = new Map(state.allItems.map((item) => [item.key, item]));

  const applyBlockType = (key: string) => {
    const item = itemMap.get(key);
    if (!item) {
      return;
    }
    editor.focus();
    applyBlockTypeToBlocks(editor, state.selectedBlocks, item);
  };

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <ToolbarButton
          {...buttonGroupProps}
          icon={<SelectedIcon size={20} aria-hidden="true" />}
          label={t('editor.blockType.label')}
        />
      </Dropdown.Trigger>
      <Dropdown.Popover className={styles.blockTypeMenuPopover} placement="bottom start">
        <Dropdown.Menu
          aria-label={t('editor.blockType.label')}
          selectionMode="single"
          selectedKeys={selectedInMoreHeading ? [] : [selectedItem.key]}
          onAction={(key) => applyBlockType(String(key))}
        >
          {state.primaryItems.slice(0, 4).map((item) => (
            <BlockTypeDropdownItem key={item.key} item={item} />
          ))}

          {state.headingItems.length > 0 ? (
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="more-headings" textValue={t('editor.blockType.moreHeadings')}>
                <Heading size={20} aria-hidden="true" />
                <Label>{t('editor.blockType.moreHeadings')}</Label>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover className={styles.blockTypeMenuPopover} placement="right top">
                <Dropdown.Menu
                  aria-label={t('editor.blockType.moreHeadings')}
                  selectionMode="single"
                  selectedKeys={selectedInMoreHeading ? [selectedItem.key] : []}
                  onAction={(key) => applyBlockType(String(key))}
                >
                  {state.headingItems.map((item) => (
                    <BlockTypeDropdownItem key={item.key} item={item} />
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ) : null}

          {state.primaryItems.slice(4).map((item) => (
            <BlockTypeDropdownItem key={item.key} item={item} />
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
