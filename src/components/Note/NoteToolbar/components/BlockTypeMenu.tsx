import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import {
  applyBlockTypeToBlocks,
  blockMatchesBlockTypeItem,
  getAvailableBlockTypeItems,
  type BlockTypeMenuItem,
} from '@/components/Note/NoteEditorMenus/blockTypes';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button, Dropdown } from '@heroui/react';
import clsx from 'clsx';
import { Check, ChevronDown, Heading } from 'lucide-react';
import styles from '../style.module.less';
import { getSelectedBlocks, stopToolbarMouseDown } from '../utils';
import type { ButtonGroupChildProps } from './ToolbarButton';

function BlockTypeDropdownItem({
  item,
  isSelected,
}: {
  item: BlockTypeMenuItem;
  isSelected: boolean;
}) {
  const Icon = item.icon;
  return (
    <Dropdown.Item id={item.key} textValue={item.label} className={styles.blockTypeMenuItem}>
      <span className={styles.blockTypeMenuIcon}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className={styles.blockTypeMenuLabel}>{item.label}</span>
      <span className={styles.blockTypeMenuCheck} aria-hidden="true">
        {isSelected ? <Check size={16} /> : null}
      </span>
    </Dropdown.Item>
  );
}

export function BlockTypeMenu(buttonGroupProps: ButtonGroupChildProps) {
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
        <Button
          {...buttonGroupProps}
          variant="ghost"
          size="sm"
          isIconOnly
          className={styles.blockTypeTrigger}
          onMouseDown={stopToolbarMouseDown}
          aria-label="块类型"
        >
          <span className={styles.blockTypeTriggerIcon}>
            <SelectedIcon size={20} aria-hidden="true" />
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover className={styles.blockTypeMenuPopover} placement="bottom start">
        <Dropdown.Menu
          aria-label="块类型"
          className={styles.blockTypeMenu}
          selectionMode="single"
          selectedKeys={selectedInMoreHeading ? [] : [selectedItem.key]}
          onAction={(key) => applyBlockType(String(key))}
        >
          {state.primaryItems.slice(0, 4).map((item) => (
            <BlockTypeDropdownItem
              key={item.key}
              item={item}
              isSelected={selectedItem.key === item.key}
            />
          ))}

          {state.headingItems.length > 0 ? (
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item
                id="more-headings"
                textValue="其他标题"
                className={clsx(
                  styles.blockTypeMenuItem,
                  selectedInMoreHeading && styles.blockTypeMenuItemActive
                )}
              >
                <span className={styles.blockTypeMenuIcon}>
                  <Heading size={20} aria-hidden="true" />
                </span>
                <span className={styles.blockTypeMenuLabel}>其他标题</span>
                <Dropdown.SubmenuIndicator className={styles.blockTypeMenuCheck} />
              </Dropdown.Item>
              <Dropdown.Popover className={styles.blockTypeMenuPopover} placement="right top">
                <Dropdown.Menu
                  aria-label="其他标题"
                  className={styles.blockTypeMenu}
                  selectionMode="single"
                  selectedKeys={selectedInMoreHeading ? [selectedItem.key] : []}
                  onAction={(key) => applyBlockType(String(key))}
                >
                  {state.headingItems.map((item) => (
                    <BlockTypeDropdownItem
                      key={item.key}
                      item={item}
                      isSelected={selectedItem.key === item.key}
                    />
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ) : null}

          {state.primaryItems.slice(4).map((item) => (
            <BlockTypeDropdownItem
              key={item.key}
              item={item}
              isSelected={selectedItem.key === item.key}
            />
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
