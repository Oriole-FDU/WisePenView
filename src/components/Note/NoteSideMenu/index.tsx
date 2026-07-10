import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import type { NoteEditorPlugin } from '@/components/Note/CustomBlockNote/plugins/types';
import {
  applyBlockTypeToBlocks,
  blockMatchesBlockTypeItem,
  getAvailableBlockTypeItems,
  type BlockTypeMenuItem,
} from '@/components/Note/NoteEditorMenus/blockTypes';
import { ColorPaletteContent } from '@/components/Note/NoteEditorMenus/colorPalette';
import type { ColorKey } from '@/components/Note/NoteEditorMenus/colorPaletteData';
import {
  isRecord,
  toBlockUpdate,
  type NoteBlock,
  type NotePartialBlock,
} from '@/components/Note/NoteEditorMenus/utils';
import {
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET,
  getNoteSlashMenuItems,
} from '@/components/Note/NoteSlashMenu/buildSlashMenuItems';
import {
  resolveSlashMenuGroup,
  sortSuggestionItemsForDisplay,
} from '@/components/Note/NoteSlashMenu/slashMenuModel';
import { SlashMenuDropdownItems } from '@/components/Note/NoteSlashMenu/slashMenuView';
import {
  blockHasType,
  defaultProps,
  editorHasBlockWithType,
  type InlineContentSchema,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import {
  SideMenuController,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { Button, Dropdown } from '@heroui/react';
import clsx from 'clsx';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronRight,
  Copy,
  GripVertical,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Paintbrush,
  PanelLeft,
  PanelTop,
  Plus,
  PlusSquare,
  Scissors,
  StretchHorizontal,
  Table2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import styles from './style.module.less';

type TextAlignment = 'left' | 'center' | 'right';
type NoteTableContent = TableContent<InlineContentSchema, StyleSchema>;

const textAlignItems: Array<{ key: TextAlignment; label: string; icon: LucideIcon }> = [
  { key: 'left', label: '左对齐', icon: AlignLeft },
  { key: 'center', label: '居中对齐', icon: AlignCenter },
  { key: 'right', label: '右对齐', icon: AlignRight },
];

const blockHandleIconMap: Partial<Record<string, LucideIcon>> = {
  image: ImageIcon,
  table: Table2,
};

function isBlockEmpty(block: NoteBlock) {
  const content = (block as { content?: unknown }).content;
  return Array.isArray(content) && content.length === 0;
}

function blockSupportsTextColor(block: NoteBlock, editor: CustomBlockNoteEditor) {
  return (
    blockHasType(block, editor, block.type, { textColor: 'string' }) &&
    editorHasBlockWithType(editor, block.type, { textColor: 'string' })
  );
}

function blockSupportsBackgroundColor(block: NoteBlock, editor: CustomBlockNoteEditor) {
  return (
    blockHasType(block, editor, block.type, { backgroundColor: 'string' }) &&
    editorHasBlockWithType(editor, block.type, { backgroundColor: 'string' })
  );
}

function blockSupportsTextAlignment(block: NoteBlock, editor: CustomBlockNoteEditor) {
  return blockHasType(block, editor, block.type, {
    textAlignment: defaultProps.textAlignment,
  });
}

function getBlockProp(block: NoteBlock, prop: string) {
  return isRecord(block.props) && typeof block.props[prop] === 'string'
    ? block.props[prop]
    : undefined;
}

function getTableContent(block: NoteBlock): NoteTableContent | undefined {
  return block.type === 'table' && isRecord((block as { content?: unknown }).content)
    ? ((block as { content?: unknown }).content as NoteTableContent)
    : undefined;
}

function getTableColumnCount(content: NoteTableContent) {
  return content.columnWidths.length || content.rows[0]?.cells.length || 0;
}

async function writeClipboardData(data: { html: string; text: string }) {
  if (navigator.clipboard?.write && 'ClipboardItem' in window) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([data.html], { type: 'text/html' }),
          'text/plain': new Blob([data.text], { type: 'text/plain' }),
        }),
      ]);
      return true;
    } catch {
      // Fall through to plain text or the legacy copy command.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(data.text);
      return true;
    } catch {
      // Fall through to the legacy copy command.
    }
  }

  return document.execCommand('copy');
}

function MenuItemContent({
  icon: Icon,
  label,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <>
      <span className={styles.menuIcon}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className={styles.menuLabel}>{label}</span>
      <span className={styles.menuTrailing} aria-hidden="true">
        {trailing}
      </span>
    </>
  );
}

function TableMenuSwitch({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      className={styles.switchIndicator}
      data-selected={isSelected ? 'true' : undefined}
      aria-hidden="true"
    >
      <span className={styles.switchIndicatorThumb} />
    </span>
  );
}

function QuickBlockTypes({
  block,
  items,
  onSelect,
}: {
  block: NoteBlock;
  items: BlockTypeMenuItem[];
  onSelect: (item: BlockTypeMenuItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.quickTypes} role="group" aria-label="块类型">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = blockMatchesBlockTypeItem(block, item);
        return (
          <Button
            key={item.key}
            variant="ghost"
            size="sm"
            isIconOnly
            className={clsx(styles.quickTypeButton, selected && styles.quickTypeButtonActive)}
            aria-label={item.label}
            onPress={() => onSelect(item)}
          >
            <Icon size={18} aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}

function CustomSideMenu({ plugins }: { plugins: readonly NoteEditorPlugin[] }) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const sideMenu = useExtension(SideMenuExtension, { editor });
  const suggestionMenu = useExtension(SuggestionMenu, { editor });
  const extensionBlock = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const block = extensionBlock as NoteBlock | undefined;

  if (!block || !editor.isEditable) {
    return null;
  }

  const { allItems, quickItems } = getAvailableBlockTypeItems(editor);
  const slashInsertItems = sortSuggestionItemsForDisplay(
    getNoteSlashMenuItems(editor, plugins, NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET).filter(
      (item) => resolveSlashMenuGroup(item) !== 'AI'
    )
  );
  const selectedBlockType = allItems.find((item) => blockMatchesBlockTypeItem(block, item));
  const blockIsEmpty = isBlockEmpty(block);
  const isTable = block.type === 'table';
  const SelectedBlockIcon = selectedBlockType?.icon ?? blockHandleIconMap[block.type];
  const headingLevel =
    block.type === 'heading' && isRecord(block.props) ? String(block.props.level) : undefined;
  const canUseTextColor = blockSupportsTextColor(block, editor);
  const canUseBackgroundColor = blockSupportsBackgroundColor(block, editor);
  const canUseColor = canUseTextColor || canUseBackgroundColor;
  const canUseTextAlignment = blockSupportsTextAlignment(block, editor);
  const blockProps = isRecord(block.props) ? block.props : {};
  const textAlignment = canUseTextAlignment
    ? String(blockProps.textAlignment ?? defaultProps.textAlignment.default)
    : undefined;
  const tableContent = getTableContent(block);
  const canUseTableHeaders = Boolean(isTable && tableContent);
  const isHeaderRow = Boolean(tableContent?.headerRows);
  const isHeaderColumn = Boolean(tableContent?.headerCols);

  const closeMenu = () => {
    setOpen(false);
    sideMenu.unfreezeMenu();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      sideMenu.freezeMenu();
    } else {
      sideMenu.unfreezeMenu();
    }
  };

  const focusBlock = () => {
    editor.setTextCursorPosition(block);
    editor.focus();
  };

  const applyBlockType = (item: BlockTypeMenuItem) => {
    editor.focus();
    applyBlockTypeToBlocks(editor, [block], item);
    closeMenu();
  };

  const insertSlashItemBelow = (item: DefaultReactSuggestionItem) => {
    editor.focus();
    const insertedBlock = editor.insertBlocks([{ type: 'paragraph' }], block, 'after')[0];
    editor.setTextCursorPosition(insertedBlock);
    item.onItemClick();
    closeMenu();
  };

  const openSlashBelow = () => {
    if (isBlockEmpty(block)) {
      editor.setTextCursorPosition(block);
      suggestionMenu.openSuggestionMenu('/');
      closeMenu();
      return;
    }

    const insertedBlock = editor.insertBlocks([{ type: 'paragraph' }], block, 'after')[0];
    editor.setTextCursorPosition(insertedBlock);
    suggestionMenu.openSuggestionMenu('/');
    closeMenu();
  };

  const setTextAlignment = (alignment: TextAlignment) => {
    if (!canUseTextAlignment) {
      return;
    }
    editor.updateBlock(block, toBlockUpdate({ props: { textAlignment: alignment } }));
    closeMenu();
  };

  const nestBlock = (type: 'nest' | 'unnest') => {
    focusBlock();
    if (type === 'nest' && editor.canNestBlock()) {
      editor.nestBlock();
    }
    if (type === 'unnest' && editor.canUnnestBlock()) {
      editor.unnestBlock();
    }
    closeMenu();
  };

  const setBlockColor = (target: 'textColor' | 'backgroundColor', color: ColorKey) => {
    editor.updateBlock(
      block,
      toBlockUpdate({
        props: { [target]: color },
      })
    );
    closeMenu();
    window.setTimeout(() => editor.focus());
  };

  const resetBlockColor = () => {
    editor.updateBlock(
      block,
      toBlockUpdate({
        props: {
          ...(canUseTextColor ? { textColor: 'default' } : {}),
          ...(canUseBackgroundColor ? { backgroundColor: 'default' } : {}),
        },
      })
    );
    closeMenu();
    window.setTimeout(() => editor.focus());
  };

  const deleteBlock = () => {
    const nextFocusBlock = editor.getNextBlock(block) ?? editor.getPrevBlock(block);
    editor.removeBlocks([block]);
    if (nextFocusBlock) {
      editor.setTextCursorPosition(nextFocusBlock);
    }
    closeMenu();
    editor.focus();
  };

  const copyOrCutBlock = async (mode: 'copy' | 'cut') => {
    const blocks = [block as unknown as NotePartialBlock];
    const clipboardData = {
      html: editor.blocksToFullHTML(blocks),
      text: editor.blocksToMarkdownLossy(blocks),
    };

    const copied = await writeClipboardData(clipboardData);
    if (copied && mode === 'cut') {
      deleteBlock();
      return;
    }

    closeMenu();
  };

  const toggleTableHeader = (target: 'row' | 'column') => {
    if (!canUseTableHeaders || !tableContent) {
      return;
    }
    editor.updateBlock(
      block,
      toBlockUpdate({
        type: 'table',
        content: {
          ...tableContent,
          ...(target === 'row'
            ? { headerRows: isHeaderRow ? undefined : 1 }
            : { headerCols: isHeaderColumn ? undefined : 1 }),
        },
      })
    );
    closeMenu();
  };

  const resetTableColumnWidths = () => {
    if (!isTable || !tableContent) {
      return;
    }
    const columnCount = getTableColumnCount(tableContent);
    editor.updateBlock(
      block,
      toBlockUpdate({
        type: 'table',
        content: {
          ...tableContent,
          columnWidths: Array.from({ length: columnCount }, () => undefined),
        },
      })
    );
    closeMenu();
    window.setTimeout(() => editor.focus());
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    setDragging(true);
    sideMenu.blockDragStart(event, block);
  };

  const handleDragEnd = () => {
    sideMenu.blockDragEnd();
    window.setTimeout(() => setDragging(false));
  };

  const indentAlignMenu = (
    <Dropdown.SubmenuTrigger>
      <Dropdown.Item id="indent-align" textValue="缩进和对齐" className={styles.menuItem}>
        <MenuItemContent
          icon={AlignLeft}
          label="缩进和对齐"
          trailing={<ChevronRight size={16} />}
        />
      </Dropdown.Item>
      <Dropdown.Popover className={styles.popover} placement="right top">
        <Dropdown.Menu
          aria-label="缩进和对齐"
          className={styles.menu}
          onAction={(key) => {
            const action = String(key);
            if (action === 'nest') {
              nestBlock('nest');
            }
            if (action === 'unnest') {
              nestBlock('unnest');
            }
            if (action.startsWith('align-')) {
              setTextAlignment(action.replace('align-', '') as TextAlignment);
            }
          }}
        >
          <Dropdown.Item id="nest" textValue="增加缩进" className={styles.menuItem}>
            <MenuItemContent icon={IndentIncrease} label="增加缩进" />
          </Dropdown.Item>
          <Dropdown.Item id="unnest" textValue="减少缩进" className={styles.menuItem}>
            <MenuItemContent icon={IndentDecrease} label="减少缩进" />
          </Dropdown.Item>
          {canUseTextAlignment
            ? textAlignItems.map((item) => (
                <Dropdown.Item
                  key={item.key}
                  id={`align-${item.key}`}
                  textValue={item.label}
                  className={styles.menuItem}
                >
                  <MenuItemContent
                    icon={item.icon}
                    label={item.label}
                    trailing={textAlignment === item.key ? <Check size={16} /> : null}
                  />
                </Dropdown.Item>
              ))
            : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.SubmenuTrigger>
  );

  const colorMenu =
    canUseColor && !isTable ? (
      <Dropdown.SubmenuTrigger>
        <Dropdown.Item id="colors" textValue="颜色" className={styles.menuItem}>
          <MenuItemContent icon={Paintbrush} label="颜色" trailing={<ChevronRight size={16} />} />
        </Dropdown.Item>
        <Dropdown.Popover className={styles.popover} placement="right top">
          <ColorPaletteContent
            className={styles.colorPanel}
            text={
              canUseTextColor
                ? {
                    color: getBlockProp(block, 'textColor'),
                    onChange: (color) => setBlockColor('textColor', color),
                  }
                : undefined
            }
            background={
              canUseBackgroundColor
                ? {
                    color: getBlockProp(block, 'backgroundColor'),
                    onChange: (color) => setBlockColor('backgroundColor', color),
                  }
                : undefined
            }
            onReset={resetBlockColor}
          />
        </Dropdown.Popover>
      </Dropdown.SubmenuTrigger>
    ) : null;

  const tableIndentMenu = (
    <Dropdown.SubmenuTrigger>
      <Dropdown.Item id="indent" textValue="缩进" className={styles.menuItem}>
        <MenuItemContent icon={IndentIncrease} label="缩进" trailing={<ChevronRight size={16} />} />
      </Dropdown.Item>
      <Dropdown.Popover className={styles.popover} placement="right top">
        <Dropdown.Menu
          aria-label="缩进"
          className={styles.menu}
          onAction={(key) => {
            const action = String(key);
            if (action === 'nest') {
              nestBlock('nest');
            }
            if (action === 'unnest') {
              nestBlock('unnest');
            }
          }}
        >
          <Dropdown.Item id="nest" textValue="增加缩进" className={styles.menuItem}>
            <MenuItemContent icon={IndentIncrease} label="增加缩进" />
          </Dropdown.Item>
          <Dropdown.Item id="unnest" textValue="减少缩进" className={styles.menuItem}>
            <MenuItemContent icon={IndentDecrease} label="减少缩进" />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.SubmenuTrigger>
  );

  return (
    <div
      className={clsx('bn-side-menu', styles.sideMenu)}
      data-block-type={block.type}
      data-level={headingLevel}
    >
      {blockIsEmpty ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className={styles.sideMenuButton}
          aria-label="添加块"
          onPress={openSlashBelow}
        >
          <Plus size={18} aria-hidden="true" />
        </Button>
      ) : null}
      {!blockIsEmpty ? (
        <div className={styles.dragHandleWrapper}>
          <button
            type="button"
            className={clsx(styles.sideMenuButton, styles.dragHandleButton)}
            draggable="true"
            aria-label="块菜单"
            onClick={() => {
              if (!dragging) {
                handleOpenChange(!open);
              }
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {SelectedBlockIcon ? (
              <SelectedBlockIcon
                size={16}
                className={styles.dragHandleTypeIcon}
                aria-hidden="true"
              />
            ) : null}
            <GripVertical size={16} aria-hidden="true" />
          </button>
          <Dropdown isOpen={open} onOpenChange={handleOpenChange}>
            <Dropdown.Trigger className={styles.dropdownAnchor} isDisabled aria-hidden="true">
              <span />
            </Dropdown.Trigger>
            <Dropdown.Popover className={styles.popover} placement="left top" offset={8}>
              <div className={styles.menuSurface}>
                {!isTable ? (
                  <QuickBlockTypes block={block} items={quickItems} onSelect={applyBlockType} />
                ) : null}
                <Dropdown.Menu
                  aria-label="块菜单"
                  className={styles.menu}
                  onAction={(key) => {
                    const action = String(key);
                    if (action === 'nest') {
                      nestBlock('nest');
                    }
                    if (action === 'unnest') {
                      nestBlock('unnest');
                    }
                    if (action === 'copy') {
                      void copyOrCutBlock('copy');
                    }
                    if (action === 'cut') {
                      void copyOrCutBlock('cut');
                    }
                    if (action === 'delete') {
                      deleteBlock();
                    }
                    if (action === 'table-header-row') {
                      toggleTableHeader('row');
                    }
                    if (action === 'table-header-column') {
                      toggleTableHeader('column');
                    }
                    if (action === 'table-reset-column-widths') {
                      resetTableColumnWidths();
                    }
                  }}
                >
                  {isTable ? tableIndentMenu : indentAlignMenu}
                  {!isTable ? colorMenu : null}

                  <Dropdown.Section>
                    <Dropdown.Item id="cut" textValue="剪切" className={styles.menuItem}>
                      <MenuItemContent icon={Scissors} label="剪切" />
                    </Dropdown.Item>
                    <Dropdown.Item id="copy" textValue="复制" className={styles.menuItem}>
                      <MenuItemContent icon={Copy} label="复制" />
                    </Dropdown.Item>
                    <Dropdown.Item id="delete" textValue="删除" className={styles.menuItem}>
                      <MenuItemContent icon={Trash2} label="删除" />
                    </Dropdown.Item>
                  </Dropdown.Section>

                  {isTable ? (
                    <Dropdown.Section>
                      {canUseTableHeaders ? (
                        <>
                          <Dropdown.Item
                            id="table-header-row"
                            textValue="标题行"
                            className={styles.menuItem}
                          >
                            <MenuItemContent
                              icon={PanelTop}
                              label="标题行"
                              trailing={<TableMenuSwitch isSelected={isHeaderRow} />}
                            />
                          </Dropdown.Item>
                          <Dropdown.Item
                            id="table-header-column"
                            textValue="标题列"
                            className={styles.menuItem}
                          >
                            <MenuItemContent
                              icon={PanelLeft}
                              label="标题列"
                              trailing={<TableMenuSwitch isSelected={isHeaderColumn} />}
                            />
                          </Dropdown.Item>
                        </>
                      ) : null}
                      <Dropdown.Item
                        id="table-reset-column-widths"
                        textValue="均分列宽"
                        className={styles.menuItem}
                      >
                        <MenuItemContent icon={StretchHorizontal} label="均分列宽" />
                      </Dropdown.Item>
                    </Dropdown.Section>
                  ) : null}

                  <Dropdown.Section>
                    <Dropdown.SubmenuTrigger>
                      <Dropdown.Item
                        id="insert-below"
                        textValue="在下方添加"
                        className={styles.menuItem}
                      >
                        <MenuItemContent
                          icon={PlusSquare}
                          label="在下方添加"
                          trailing={<ChevronRight size={16} />}
                        />
                      </Dropdown.Item>
                      <Dropdown.Popover className={styles.popover} placement="right top">
                        <Dropdown.Menu
                          aria-label="在下方添加"
                          className={styles.menu}
                          onAction={(key) => {
                            const item = slashInsertItems.find(
                              (_candidate, index) => `insert-slash-item-${index}` === String(key)
                            );
                            if (item) {
                              insertSlashItemBelow(item);
                            }
                          }}
                        >
                          <SlashMenuDropdownItems
                            items={slashInsertItems}
                            getItemId={(_item, index) => `insert-slash-item-${index}`}
                          />
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown.SubmenuTrigger>
                  </Dropdown.Section>
                </Dropdown.Menu>
              </div>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      ) : null}
    </div>
  );
}

export default function NoteSideMenu({ plugins }: { plugins: readonly NoteEditorPlugin[] }) {
  const readOnly = useNoteEditorReadOnlyContext();

  if (readOnly) {
    return null;
  }

  return (
    <SideMenuController
      sideMenu={() => <CustomSideMenu plugins={plugins} />}
      floatingUIOptions={{
        useFloatingOptions: {
          placement: 'left-start',
        },
      }}
    />
  );
}
