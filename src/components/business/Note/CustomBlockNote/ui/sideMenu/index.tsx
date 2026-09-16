import { blockHasType, defaultProps, editorHasBlockWithType } from '@blocknote/core';
import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import {
  BlockPopover,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { Dropdown, Label, Separator } from '@heroui/react';
import { useEventListener } from 'ahooks';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronRight,
  Copy,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  type LucideIcon,
  Paintbrush,
  Plus,
  PlusSquare,
  Scissors,
  Trash2,
} from 'lucide-react';
import { type DragEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { useNoteEditorReadOnlyContext } from '@/components/business/Note/CustomBlockNote/engines/editor/readOnly';
import {
  exportNoteFullHtml,
  exportNoteMarkdown,
} from '@/components/business/Note/CustomBlockNote/engines/markdown/markdownExport';
import type { CustomBlockNoteEditor } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import {
  blockNoteSchema,
  createDefaultNoteBlock,
  notePluginRegistry,
} from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import type { NoteContentPlugin } from '@/components/business/Note/CustomBlockNote/registry/types';
import {
  applyBlockTypeToBlocks,
  blockMatchesBlockTypeItem,
  type BlockTypeMenuItem,
  getAvailableBlockTypeItems,
} from '@/components/business/Note/CustomBlockNote/ui/editorMenus/blockTypes';
import { ColorPaletteContent } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPalette';
import type { ColorKey } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';
import {
  isRecord,
  type NoteBlock,
  type NotePartialBlock,
  toBlockUpdate,
} from '@/components/business/Note/CustomBlockNote/ui/editorMenus/utils';
import {
  getNoteSlashMenuItems,
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET,
} from '@/components/business/Note/CustomBlockNote/ui/slashMenu/buildSlashMenuItems';
import {
  resolveSlashMenuGroup,
  sortSuggestionItemsForDisplay,
} from '@/components/business/Note/CustomBlockNote/ui/slashMenu/slashMenuModel';
import { SlashMenuDropdownItems } from '@/components/business/Note/CustomBlockNote/ui/slashMenu/slashMenuView';
import { copyText } from '@/utils/browser/copyText';
import { cn } from '@/utils/cn';

import styles from './style.module.less';

type TextAlignment = 'left' | 'center' | 'right';
type BlockColorTarget = 'textColor' | 'backgroundColor';

const HIGHLIGHT_BLOCK_TYPE = 'highlightBlock';

const textAlignItems: Array<{ key: TextAlignment; icon: LucideIcon }> = [
  { key: 'left', icon: AlignLeft },
  { key: 'center', icon: AlignCenter },
  { key: 'right', icon: AlignRight },
];

function isBlockEmpty(block: NoteBlock) {
  const content = (block as { content?: unknown }).content;
  return Array.isArray(content) && content.length === 0;
}

function isHighlightBlock(block: NoteBlock) {
  return block.type === HIGHLIGHT_BLOCK_TYPE;
}

function blockSupportsTextColor(block: NoteBlock, editor: CustomBlockNoteEditor) {
  if (isHighlightBlock(block)) return true;
  return (
    blockHasType(block, editor, block.type, { textColor: 'string' }) &&
    editorHasBlockWithType(editor, block.type, { textColor: 'string' })
  );
}

function blockSupportsBackgroundColor(block: NoteBlock, editor: CustomBlockNoteEditor) {
  if (isHighlightBlock(block)) return true;
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

function getBlockColorProp(block: NoteBlock, target: BlockColorTarget) {
  if (isHighlightBlock(block)) {
    return getBlockProp(
      block,
      target === 'textColor' ? 'highlightTextColor' : 'highlightBackgroundColor'
    );
  }
  return getBlockProp(block, target);
}

function getBlockColorPropName(block: NoteBlock, target: BlockColorTarget) {
  if (isHighlightBlock(block)) {
    return target === 'textColor' ? 'highlightTextColor' : 'highlightBackgroundColor';
  }
  return target;
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
      // 富文本写入失败时继续尝试纯文本。
    }
  }

  return copyText(data.text);
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
    <span className={styles.menuItemContent}>
      <Icon size={18} aria-hidden="true" />
      <Label className={styles.menuItemLabel}>{label}</Label>
      {trailing ? <span className={styles.menuItemTrailing}>{trailing}</span> : null}
    </span>
  );
}

function MenuSwitch({ isSelected }: { isSelected: boolean }) {
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

function getEditorRoot(editor: CustomBlockNoteEditor): Document | ShadowRoot {
  const root = editor.domElement?.getRootNode();
  return root instanceof Document || root instanceof ShadowRoot ? root : document;
}

function findBlockContainer(
  root: ParentNode | null | undefined,
  blockId: string
): HTMLElement | null {
  if (!root) return null;

  for (const element of root.querySelectorAll<HTMLElement>(
    '[data-node-type="blockContainer"][data-id]'
  )) {
    if (element.getAttribute('data-id') === blockId) {
      return element;
    }
  }

  return null;
}

function resolveDragPreviewYOffset(
  event: DragEvent<HTMLElement>,
  sourceBlock: HTMLElement,
  dragPreview: HTMLElement,
  previewBlock: HTMLElement | null
): number {
  const sourceRect = sourceBlock.getBoundingClientRect();
  if (sourceRect.height <= 0) return 0;

  const previewRect = dragPreview.getBoundingClientRect();
  const previewHeight = previewRect.height > 0 ? previewRect.height : sourceRect.height;
  const sourceOffsetY = event.clientY - sourceRect.top;

  if (!previewBlock) {
    return Math.max(0, Math.min(previewHeight, sourceOffsetY));
  }

  const previewBlockRect = previewBlock.getBoundingClientRect();
  const scaleY = previewBlockRect.height > 0 ? previewBlockRect.height / sourceRect.height : 1;
  const offsetY = previewBlockRect.top - previewRect.top + sourceOffsetY * scaleY;

  return Math.max(0, Math.min(previewHeight, offsetY));
}

function alignDragPreviewWithPointer(
  event: DragEvent<HTMLElement>,
  editor: CustomBlockNoteEditor,
  block: NoteBlock
) {
  const dragPreview = getEditorRoot(editor).querySelector<HTMLElement>('.bn-drag-preview');
  const sourceBlock = findBlockContainer(editor.domElement, block.id);
  if (!event.dataTransfer || !dragPreview || !sourceBlock) return;
  const previewBlock = findBlockContainer(dragPreview, block.id);

  // BlockNote 默认把热点放在预览左上角；这里只修正纵向热点，让预览文字与鼠标保持同一水平线。
  event.dataTransfer.setDragImage(
    dragPreview,
    0,
    resolveDragPreviewYOffset(event, sourceBlock, dragPreview, previewBlock)
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
  const { t } = useTranslation('note');
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.quickTypes} role="group" aria-label={t('editor.blockType.label')}>
      {items.map((item) => {
        const Icon = item.icon;
        const selected = blockMatchesBlockTypeItem(block, item);
        return (
          <AppIconButton
            key={item.key}
            icon={<Icon size={18} aria-hidden="true" />}
            label={item.label}
            size="sm"
            isActive={selected}
            className={styles.quickTypeButton}
            onPress={() => onSelect(item)}
          />
        );
      })}
    </div>
  );
}

function CustomSideMenu({
  hiddenByTextInteraction,
  plugins,
}: {
  hiddenByTextInteraction: boolean;
  plugins: readonly NoteContentPlugin[];
}) {
  const { t } = useTranslation('note');
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
      (item) => resolveSlashMenuGroup(item) !== 'ai'
    )
  );
  const selectedBlockType = allItems.find((item) => blockMatchesBlockTypeItem(block, item));
  const blockIsEmpty = isBlockEmpty(block);
  const showBlockMenu = !blockIsEmpty || isHighlightBlock(block);
  const owner = notePluginRegistry.blockPlugins.get(block.type);
  const ownerSideMenuState = owner?.sideMenu?.inspect?.(
    block as unknown as Record<string, unknown>
  );
  const isStructured = ownerSideMenuState?.variant === 'structured';
  const SelectedBlockIcon = selectedBlockType?.icon ?? owner?.sideMenu?.icon;
  const canUseTextColor = blockSupportsTextColor(block, editor);
  const canUseBackgroundColor = blockSupportsBackgroundColor(block, editor);
  const canUseColor = canUseTextColor || canUseBackgroundColor;
  const canUseTextAlignment = blockSupportsTextAlignment(block, editor);
  const blockProps = isRecord(block.props) ? block.props : {};
  const textAlignment = canUseTextAlignment
    ? String(blockProps.textAlignment ?? defaultProps.textAlignment.default)
    : undefined;
  const contentActions = ownerSideMenuState?.actions ?? [];

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
    const insertedBlock = editor.insertBlocks(
      [createDefaultNoteBlock(notePluginRegistry) as NotePartialBlock],
      block,
      'after'
    )[0];
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

    const insertedBlock = editor.insertBlocks(
      [createDefaultNoteBlock(notePluginRegistry) as NotePartialBlock],
      block,
      'after'
    )[0];
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

  const setBlockColor = (target: BlockColorTarget, color: ColorKey) => {
    const prop = getBlockColorPropName(block, target);
    editor.updateBlock(
      block,
      toBlockUpdate({
        props: { [prop]: color },
      })
    );
    closeMenu();
    window.setTimeout(() => editor.focus());
  };

  const resetBlockColor = () => {
    const textColorProp = getBlockColorPropName(block, 'textColor');
    const backgroundColorProp = getBlockColorPropName(block, 'backgroundColor');
    editor.updateBlock(
      block,
      toBlockUpdate({
        props: {
          ...(canUseTextColor ? { [textColorProp]: 'default' } : {}),
          ...(canUseBackgroundColor ? { [backgroundColorProp]: 'default' } : {}),
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
      html: exportNoteFullHtml(editor, notePluginRegistry, blocks),
      text: exportNoteMarkdown(editor, notePluginRegistry, blocks),
    };

    const copied = await writeClipboardData(clipboardData);
    if (copied && mode === 'cut') {
      deleteBlock();
      return;
    }

    closeMenu();
  };

  const applyContentAction = (actionId: string) => {
    const update = owner?.sideMenu?.apply?.(block as unknown as Record<string, unknown>, actionId);
    if (!update) return;
    editor.updateBlock(block, toBlockUpdate(update));
    closeMenu();
    window.setTimeout(() => editor.focus());
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    setDragging(true);
    sideMenu.blockDragStart(event, block);
    alignDragPreviewWithPointer(event, editor, block);
  };

  const handleDragEnd = () => {
    sideMenu.blockDragEnd();
    window.setTimeout(() => setDragging(false));
  };

  const indentAlignMenu = (
    <Dropdown.SubmenuTrigger>
      <Dropdown.Item id="indent-align" textValue={t('editor.indent.align')}>
        <MenuItemContent
          icon={AlignLeft}
          label={t('editor.indent.align')}
          trailing={<ChevronRight size={16} />}
        />
      </Dropdown.Item>
      <Dropdown.Popover placement="right top">
        <Dropdown.Menu
          aria-label={t('editor.indent.align')}
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
          <Dropdown.Item id="nest" textValue={t('editor.indent.increase')}>
            <MenuItemContent icon={IndentIncrease} label={t('editor.indent.increase')} />
          </Dropdown.Item>
          <Dropdown.Item id="unnest" textValue={t('editor.indent.decrease')}>
            <MenuItemContent icon={IndentDecrease} label={t('editor.indent.decrease')} />
          </Dropdown.Item>
          {canUseTextAlignment
            ? textAlignItems.map((item) => (
                <Dropdown.Item
                  key={item.key}
                  id={`align-${item.key}`}
                  textValue={t(`editor.align.${item.key}`)}
                >
                  <MenuItemContent
                    icon={item.icon}
                    label={t(`editor.align.${item.key}`)}
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
    canUseColor && !isStructured ? (
      <Dropdown.SubmenuTrigger>
        <Dropdown.Item id="colors" textValue={t('editor.color.label')}>
          <MenuItemContent
            icon={Paintbrush}
            label={t('editor.color.label')}
            trailing={<ChevronRight size={16} />}
          />
        </Dropdown.Item>
        <Dropdown.Popover placement="right top">
          <ColorPaletteContent
            className={styles.colorPanel}
            text={
              canUseTextColor
                ? {
                    color: getBlockColorProp(block, 'textColor'),
                    onChange: (color) => setBlockColor('textColor', color),
                  }
                : undefined
            }
            background={
              canUseBackgroundColor
                ? {
                    color: getBlockColorProp(block, 'backgroundColor'),
                    onChange: (color) => setBlockColor('backgroundColor', color),
                  }
                : undefined
            }
            onReset={resetBlockColor}
          />
        </Dropdown.Popover>
      </Dropdown.SubmenuTrigger>
    ) : null;

  const structuredIndentMenu = (
    <Dropdown.SubmenuTrigger>
      <Dropdown.Item id="indent" textValue={t('editor.indent.label')}>
        <MenuItemContent
          icon={IndentIncrease}
          label={t('editor.indent.label')}
          trailing={<ChevronRight size={16} />}
        />
      </Dropdown.Item>
      <Dropdown.Popover placement="right top">
        <Dropdown.Menu
          aria-label={t('editor.indent.label')}
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
          <Dropdown.Item id="nest" textValue={t('editor.indent.increase')}>
            <MenuItemContent icon={IndentIncrease} label={t('editor.indent.increase')} />
          </Dropdown.Item>
          <Dropdown.Item id="unnest" textValue={t('editor.indent.decrease')}>
            <MenuItemContent icon={IndentDecrease} label={t('editor.indent.decrease')} />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.SubmenuTrigger>
  );

  return (
    <div
      className={cn('bn-side-menu', styles.sideMenu)}
      data-block-type={block.type}
      data-interaction-hidden={hiddenByTextInteraction && !dragging ? 'true' : undefined}
      {...Object.fromEntries(
        Object.entries(ownerSideMenuState?.attributes ?? {}).map(([key, value]) => [
          `data-${key}`,
          value,
        ])
      )}
    >
      {blockIsEmpty && !isHighlightBlock(block) ? (
        <AppIconButton
          icon={<Plus size={18} aria-hidden="true" />}
          label={t('sideMenu.addBlock')}
          size="sm"
          className={styles.sideMenuButton}
          onPress={openSlashBelow}
        />
      ) : null}
      {showBlockMenu ? (
        <div className={styles.dragHandleWrapper}>
          <button
            type="button"
            className={cn(styles.sideMenuButton, styles.dragHandleButton)}
            draggable="true"
            aria-label={t('sideMenu.blockMenu')}
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
            <Dropdown.Popover placement="left top" offset={8} className={styles.menuSurface}>
              {!isStructured ? (
                <QuickBlockTypes block={block} items={quickItems} onSelect={applyBlockType} />
              ) : null}
              <Dropdown.Menu
                aria-label={t('sideMenu.blockMenu')}
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
                  if (action.startsWith('content:')) {
                    applyContentAction(action.slice('content:'.length));
                  }
                }}
              >
                {isStructured ? structuredIndentMenu : indentAlignMenu}
                {!isStructured ? colorMenu : null}

                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item id="cut" textValue={t('sideMenu.cut')}>
                    <MenuItemContent icon={Scissors} label={t('sideMenu.cut')} />
                  </Dropdown.Item>
                  <Dropdown.Item id="copy" textValue={t('sideMenu.copy')}>
                    <MenuItemContent icon={Copy} label={t('sideMenu.copy')} />
                  </Dropdown.Item>
                  <Dropdown.Item id="delete" textValue={t('sideMenu.delete')} variant="danger">
                    <MenuItemContent icon={Trash2} label={t('sideMenu.delete')} />
                  </Dropdown.Item>
                </Dropdown.Section>

                {contentActions.length > 0 ? (
                  <>
                    <Separator />
                    <Dropdown.Section>
                      {contentActions.map((action) => (
                        <Dropdown.Item
                          key={action.id}
                          id={`content:${action.id}`}
                          textValue={action.label}
                        >
                          <MenuItemContent
                            icon={action.icon}
                            label={action.label}
                            trailing={
                              action.kind === 'toggle' ? (
                                <MenuSwitch isSelected={Boolean(action.selected)} />
                              ) : null
                            }
                          />
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  </>
                ) : null}

                <Separator />
                <Dropdown.Section>
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="insert-below" textValue={t('sideMenu.addBelow')}>
                      <MenuItemContent
                        icon={PlusSquare}
                        label={t('sideMenu.addBelow')}
                        trailing={<ChevronRight size={16} />}
                      />
                    </Dropdown.Item>
                    <Dropdown.Popover placement="right top">
                      <Dropdown.Menu
                        aria-label={t('sideMenu.addBelow')}
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
            </Dropdown.Popover>
          </Dropdown>
        </div>
      ) : null}
    </div>
  );
}

export default function NoteSideMenu({ plugins }: { plugins: readonly NoteContentPlugin[] }) {
  const readOnly = useNoteEditorReadOnlyContext();
  const editor = useBlockNoteEditor(blockNoteSchema);
  const [isPointerSelectingText, setIsPointerSelectingText] = useState(false);
  const [dismissedBlockId, setDismissedBlockId] = useState<string | null>(null);
  const previousShowRef = useRef(false);
  const handleEditorPointerDown = (event: Event) => {
    if (!(event instanceof globalThis.PointerEvent) || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('.bn-side-menu')) return;
    setIsPointerSelectingText(true);
  };
  const handlePointerSelectionEnd = () => setIsPointerSelectingText(false);
  const sideMenuState = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) =>
      state
        ? {
            blockId: state.block.id,
            show: state.show,
          }
        : undefined,
  });
  const hoveredBlockId = sideMenuState?.blockId ?? null;

  /**
   * @wisepen-manual-effect
   * 执行时机：BlockNote 侧边菜单从隐藏切换为显示时。
   * 不可替代原因：这里需要把第三方 hover 状态同步为本地点击关闭状态，普通事件处理函数无法覆盖第三方内部状态变更。
   * cleanup：没有订阅外部资源，无需清理。
   */
  useEffect(() => {
    if (sideMenuState?.show && !previousShowRef.current) {
      setDismissedBlockId(null);
    }
    previousShowRef.current = Boolean(sideMenuState?.show);
  }, [sideMenuState?.show]);

  useEventListener(
    'pointerdown',
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('.bn-side-menu')) return;
      if (event.target.closest('.dropdown__popover')) return;
      if (hoveredBlockId) {
        setDismissedBlockId(hoveredBlockId);
      }
    },
    { target: document }
  );

  useEventListener('pointerdown', handleEditorPointerDown, { target: editor.domElement });
  useEventListener('pointerup', handlePointerSelectionEnd);
  useEventListener('pointercancel', handlePointerSelectionEnd);

  if (readOnly) {
    return null;
  }

  return (
    <BlockPopover
      blockId={hoveredBlockId && dismissedBlockId !== hoveredBlockId ? hoveredBlockId : undefined}
      useFloatingOptions={{
        open: Boolean(hoveredBlockId && dismissedBlockId !== hoveredBlockId),
        placement: 'left-start',
      }}
      useDismissProps={{ enabled: false }}
      focusManagerProps={{ disabled: true }}
    >
      {hoveredBlockId ? (
        <CustomSideMenu hiddenByTextInteraction={isPointerSelectingText} plugins={plugins} />
      ) : null}
    </BlockPopover>
  );
}
