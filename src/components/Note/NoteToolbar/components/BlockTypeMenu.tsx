import {
  blockNoteSchema,
  type CustomBlockNoteEditor,
} from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { editorHasBlockWithType } from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button, Dropdown } from '@heroui/react';
import {
  Braces,
  Check,
  CheckSquare,
  ChevronDown,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  ListTree,
  TextQuote,
  Type,
  type LucideIcon,
} from 'lucide-react';
import styles from '../style.module.less';
import {
  cx,
  getSelectedBlocks,
  isRecord,
  stopToolbarMouseDown,
  toBlockUpdate,
  type NoteBlock,
} from '../utils';
import type { ButtonGroupChildProps } from './ToolbarButton';

type BlockTypeProps = Record<string, boolean | number | string>;

interface BlockTypeMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  type: string;
  props?: BlockTypeProps;
}

const primaryBlockTypeItems: BlockTypeMenuItem[] = [
  { key: 'paragraph', label: '正文', icon: Type, type: 'paragraph' },
  {
    key: 'heading-1',
    label: '一级标题',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: false },
  },
  {
    key: 'heading-2',
    label: '二级标题',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: false },
  },
  {
    key: 'heading-3',
    label: '三级标题',
    icon: Heading3,
    type: 'heading',
    props: { level: 3, isToggleable: false },
  },
  { key: 'numbered-list', label: '有序列表', icon: ListOrdered, type: 'numberedListItem' },
  { key: 'bullet-list', label: '无序列表', icon: List, type: 'bulletListItem' },
  { key: 'check-list', label: '任务', icon: CheckSquare, type: 'checkListItem' },
  { key: 'code-block', label: '代码块', icon: Braces, type: 'codeBlock' },
  { key: 'quote', label: '引用', icon: TextQuote, type: 'quote' },
  { key: 'toggle-list', label: '折叠列表', icon: ListTree, type: 'toggleListItem' },
];

const moreHeadingItems: BlockTypeMenuItem[] = [
  {
    key: 'heading-4',
    label: '四级标题',
    icon: Heading4,
    type: 'heading',
    props: { level: 4, isToggleable: false },
  },
  {
    key: 'heading-5',
    label: '五级标题',
    icon: Heading5,
    type: 'heading',
    props: { level: 5, isToggleable: false },
  },
  {
    key: 'heading-6',
    label: '六级标题',
    icon: Heading6,
    type: 'heading',
    props: { level: 6, isToggleable: false },
  },
  {
    key: 'toggle-heading-1',
    label: '可折叠一级标题',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: true },
  },
  {
    key: 'toggle-heading-2',
    label: '可折叠二级标题',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: true },
  },
  {
    key: 'toggle-heading-3',
    label: '可折叠三级标题',
    icon: Heading3,
    type: 'heading',
    props: { level: 3, isToggleable: true },
  },
];

function toPropTypeMap(props?: BlockTypeProps) {
  if (!props) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, typeof value])
  ) as Record<string, 'boolean' | 'number' | 'string'>;
}

function isBlockTypeItemAvailable(editor: CustomBlockNoteEditor, item: BlockTypeMenuItem) {
  const propTypes = toPropTypeMap(item.props);
  return propTypes
    ? editorHasBlockWithType(editor, item.type, propTypes)
    : editorHasBlockWithType(editor, item.type);
}

function blockMatchesItem(block: NoteBlock | undefined, item: BlockTypeMenuItem): boolean {
  if (!block || block.type !== item.type) {
    return false;
  }
  const props = isRecord(block.props) ? block.props : {};
  return Object.entries(item.props ?? {}).every(([key, value]) => props[key] === value);
}

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
      const primaryItems = primaryBlockTypeItems.filter((item) =>
        isBlockTypeItemAvailable(editor, item)
      );
      const headingItems = moreHeadingItems.filter((item) =>
        isBlockTypeItemAvailable(editor, item)
      );
      const selectedItem = [...primaryItems, ...headingItems].find((item) =>
        blockMatchesItem(firstBlock, item)
      );
      return { selectedBlocks, primaryItems, headingItems, selectedItem };
    },
  });

  if (!state || !state.selectedItem) {
    return null;
  }

  const selectedItem = state.selectedItem;
  const selectedInMoreHeading = state.headingItems.some((item) => item.key === selectedItem.key);
  const SelectedIcon = selectedItem.icon;
  const itemMap = new Map(
    [...state.primaryItems, ...state.headingItems].map((item) => [item.key, item])
  );

  const applyBlockType = (key: string) => {
    const item = itemMap.get(key);
    if (!item) {
      return;
    }
    editor.focus();
    editor.transact(() => {
      for (const block of state.selectedBlocks) {
        editor.updateBlock(
          block,
          toBlockUpdate({
            type: item.type,
            props: item.props,
          })
        );
      }
    });
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
            <SelectedIcon size={21} aria-hidden="true" />
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
                className={cx(
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
