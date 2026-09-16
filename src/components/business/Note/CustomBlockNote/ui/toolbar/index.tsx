import { blockHasType } from '@blocknote/core';
import { FormattingToolbarExtension } from '@blocknote/core/extensions';
import {
  GenericPopover,
  type GenericPopoverReference,
  useBlockNoteEditor,
  useEditorState,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { ButtonGroup, Separator, Toolbar } from '@heroui/react';
import { useEventListener } from 'ahooks';
import { MessageSquarePlus, Search, Sparkles } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { useNoteEditorReadOnlyContext } from '@/components/business/Note/CustomBlockNote/engines/editor/readOnly';
import {
  type TableRailSelectionOrientation,
  useTableRailSelectionState,
} from '@/components/business/Note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/railSelectionState';
import {
  TableCellBackgroundAction,
  TableDeleteAction,
  TableStructureActions,
  TableToolbarProvider,
} from '@/components/business/Note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar';
import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import {
  blockMatchesBlockTypeItem,
  getAvailableBlockTypeItems,
} from '@/components/business/Note/CustomBlockNote/ui/editorMenus/blockTypes';

import { BlockTypeMenu } from './components/BlockTypeMenu';
import { ColorMenu } from './components/ColorMenu';
import { FileCaptionToolbarButton } from './components/FileButtons';
import { CreateLinkToolbarButton } from './components/LinkButton';
import { NestButtons } from './components/NestButtons';
import { TextAlignButtons } from './components/TextAlignButtons';
import { TextStyleButtons } from './components/TextStyleButtons';
import { ToolbarButton } from './components/ToolbarButton';
import styles from './style.module.less';
import { useFloatingToolbarState } from './useFloatingToolbarState';
import { getSelectedBlocks, stopToolbarMouseDown } from './utils';

interface NoteToolbarProps {
  onAskAi: () => void;
  onAddComment: () => void;
  onOpenFind: (initialQuery?: string) => void;
  isFindModeActive: boolean;
}

const getTableRailToolbarPlacement = (
  orientation: TableRailSelectionOrientation
): 'top' | 'right' => (orientation === 'column' ? 'top' : 'right');

const toDOMRect = (rect: { height: number; width: number; x: number; y: number }) =>
  new DOMRect(rect.x, rect.y, rect.width, rect.height);

function findTableBlockElement(editorElement: HTMLElement | undefined, blockId: string | null) {
  if (!editorElement || !blockId) {
    return null;
  }
  const blockContainers = editorElement.querySelectorAll<HTMLElement>(
    '[data-node-type="blockContainer"][data-id]'
  );

  return Array.from(blockContainers).find((element) => element.dataset.id === blockId) ?? null;
}

function getTableRailSelectionRect(
  editorElement: HTMLElement | undefined,
  tableRailSelection: ReturnType<typeof useTableRailSelectionState>
) {
  const blockElement = findTableBlockElement(editorElement, tableRailSelection.blockId);
  const tableContentElement = blockElement?.querySelector<HTMLElement>(
    '.bn-block-content[data-content-type="table"]'
  );
  const tableElement = tableContentElement?.querySelector<HTMLTableElement>('table');
  const rows = tableElement
    ? Array.from(tableElement.querySelectorAll<HTMLTableRowElement>('tbody > tr'))
    : [];
  const startIndex = tableRailSelection.startIndex;
  const endIndex = tableRailSelection.endIndex;

  if (
    !tableContentElement ||
    !tableElement ||
    tableRailSelection.orientation === null ||
    startIndex === null ||
    endIndex === null
  ) {
    return tableRailSelection.rect;
  }

  const tableRect = tableElement.getBoundingClientRect();
  const blockStyle = window.getComputedStyle(tableContentElement);
  const selectionRailSize =
    Number.parseFloat(blockStyle.getPropertyValue('--note-table-select-rail-size')) || 8;
  const firstIndex = Math.min(startIndex, endIndex);
  const lastIndex = Math.max(startIndex, endIndex);

  if (tableRailSelection.orientation === 'row') {
    const firstRow = rows[firstIndex];
    const lastRow = rows[lastIndex];
    if (!firstRow || !lastRow) {
      return tableRailSelection.rect;
    }
    const firstRowRect = firstRow.getBoundingClientRect();
    const lastRowRect = lastRow.getBoundingClientRect();

    return {
      x: tableRect.left - selectionRailSize,
      y: firstRowRect.top,
      width: selectionRailSize,
      height: lastRowRect.bottom - firstRowRect.top,
    };
  }

  const columnBoundaries = [tableRect.left, tableRect.right];
  for (const row of rows) {
    for (const cell of Array.from(row.children)) {
      if (!(cell instanceof HTMLElement)) {
        continue;
      }
      const cellRect = cell.getBoundingClientRect();
      columnBoundaries.push(cellRect.left, cellRect.right);
    }
  }
  const mergedColumnBoundaries = columnBoundaries
    .sort((a, b) => a - b)
    .reduce<number[]>((result, value) => {
      const previous = result.at(-1);
      if (previous == null || Math.abs(previous - value) > 1) {
        result.push(value);
      }
      return result;
    }, []);
  const left = mergedColumnBoundaries[firstIndex];
  const right = mergedColumnBoundaries[lastIndex + 1];

  if (left == null || right == null) {
    return tableRailSelection.rect;
  }

  return {
    x: left,
    y: tableRect.top - selectionRailSize,
    width: right - left,
    height: selectionRailSize,
  };
}

function ToolbarSeparator() {
  return (
    <Separator aria-hidden="true" orientation="vertical" className={styles.toolbarSeparator} />
  );
}

function useNoteToolbarShortcuts(onOpenFind: NoteToolbarProps['onOpenFind']) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const handleOpenFind = () => {
    const selectedText = editor.getSelectedText().trim();
    onOpenFind(selectedText || undefined);
  };
  const handleEditorKeyDown = (event: Event) => {
    if (!(event instanceof globalThis.KeyboardEvent)) return;
    // Ctrl/Cmd + F 快捷键触发全文搜索
    if (!event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      handleOpenFind();
    }
  };

  useEventListener('keydown', handleEditorKeyDown, { target: editor.domElement });

  return handleOpenFind;
}

function useBlockTypeFileGroupVisible() {
  const editor = useBlockNoteEditor(blockNoteSchema);

  return useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return false;
      }

      const selectedBlocks = getSelectedBlocks(editor);
      const firstBlock = selectedBlocks[0];
      const { primaryItems, headingItems } = getAvailableBlockTypeItems(editor);
      const blockTypeVisible = [...primaryItems, ...headingItems].some((item) =>
        blockMatchesBlockTypeItem(firstBlock, item)
      );
      const fileCaptionVisible =
        selectedBlocks.length === 1 &&
        blockHasType(selectedBlocks[0], editor, selectedBlocks[0].type, {
          caption: 'string',
          url: 'string',
        });

      return blockTypeVisible || fileCaptionVisible;
    },
  });
}

type CustomFormattingToolbarProps = Omit<NoteToolbarProps, 'isFindModeActive'> & {
  onLinkPopoverOpenChange?: (open: boolean) => void;
};

function CustomFormattingToolbar({
  onAskAi,
  onAddComment,
  onOpenFind,
  onLinkPopoverOpenChange,
}: CustomFormattingToolbarProps) {
  const { t } = useTranslation('note');
  const readOnly = useNoteEditorReadOnlyContext();
  const showBlockTypeFileGroup = useBlockTypeFileGroupVisible();

  return (
    <TableToolbarProvider>
      <Toolbar
        aria-label={t('editor.toolbar.label')}
        isAttached
        className={styles.toolbar}
        onMouseDown={stopToolbarMouseDown}
      >
        {!readOnly ? (
          <>
            <TableStructureActions />
            {showBlockTypeFileGroup ? (
              <>
                <ToolbarSeparator />
                <ButtonGroup
                  size="sm"
                  variant="ghost"
                  aria-label={t('editor.toolbar.blockAndFile')}
                >
                  <BlockTypeMenu />
                  <FileCaptionToolbarButton />
                </ButtonGroup>
              </>
            ) : null}
            <ToolbarSeparator />
            <TextStyleButtons />
            <ToolbarSeparator />
            <TextAlignButtons />
            <ToolbarSeparator />
            <ButtonGroup size="sm" variant="ghost" aria-label={t('editor.color.label')}>
              <ColorMenu />
              <TableCellBackgroundAction />
            </ButtonGroup>
            <ToolbarSeparator />
            <NestButtons />
            <ToolbarSeparator />
            <CreateLinkToolbarButton onOpenChange={onLinkPopoverOpenChange} />
            <ToolbarSeparator />
            <TableDeleteAction />
          </>
        ) : null}
        <ButtonGroup size="sm" variant="ghost" aria-label={t('editor.toolbar.searchCommentAi')}>
          <ToolbarButton
            label={t('editor.toolbar.search')}
            icon={<Search size={20} />}
            onPress={onOpenFind}
          />
          <ToolbarButton
            label={t('editor.toolbar.addComment')}
            icon={<MessageSquarePlus size={20} />}
            onPress={onAddComment}
          />
          <ToolbarButton label={t('ai.toolbar')} icon={<Sparkles size={20} />} onPress={onAskAi} />
        </ButtonGroup>
      </Toolbar>
    </TableToolbarProvider>
  );
}

type TextSelectionFormattingToolbarProps = NoteToolbarProps & {
  hidden: boolean;
};

function TextSelectionFormattingToolbar({
  hidden,
  ...toolbarProps
}: TextSelectionFormattingToolbarProps) {
  const editor = useBlockNoteEditor();
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const toolbarState = useFloatingToolbarState(editor, hidden, linkPopoverOpen);

  if (!toolbarState.mounted) {
    return null;
  }

  return createPortal(
    <div
      className={styles.toolbarPopover}
      data-visible={toolbarState.visible && !hidden}
      style={{
        left: toolbarState.left,
        top: toolbarState.top,
      }}
    >
      <CustomFormattingToolbar {...toolbarProps} onLinkPopoverOpenChange={setLinkPopoverOpen} />
    </div>,
    document.body
  );
}

type TableRailFormattingToolbarProps = NoteToolbarProps & {
  tableRailSelection: ReturnType<typeof useTableRailSelectionState>;
};

function TableRailFormattingToolbar({
  tableRailSelection,
  isFindModeActive,
  ...toolbarProps
}: TableRailFormattingToolbarProps) {
  const editor = useBlockNoteEditor();
  const formattingToolbar = useExtension(FormattingToolbarExtension, { editor });
  const show = useExtensionState(FormattingToolbarExtension, { editor });
  const reference = (() => {
    if (!tableRailSelection.rect) {
      return undefined;
    }
    const element = editor.domElement?.firstElementChild ?? undefined;
    const getBoundingClientRect = () =>
      toDOMRect(getTableRailSelectionRect(editor.domElement, tableRailSelection)!);

    return element
      ? { element, getBoundingClientRect, cacheMountedBoundingClientRect: false }
      : { element: undefined, getBoundingClientRect };
  })() satisfies GenericPopoverReference | undefined;
  const useFloatingOptions = {
    onOpenChange: (open, _event, reason) => {
      formattingToolbar.store.setState(open);
      if (reason === 'escape-key') {
        editor.focus();
      }
    },
    open: show,
    placement:
      tableRailSelection.orientation === null
        ? 'top'
        : getTableRailToolbarPlacement(tableRailSelection.orientation),
  } satisfies ComponentProps<typeof GenericPopover>['useFloatingOptions'];

  if (isFindModeActive || !tableRailSelection.orientation || !reference) {
    return null;
  }

  return (
    <GenericPopover
      reference={reference}
      useFloatingOptions={useFloatingOptions}
      focusManagerProps={{ disabled: true }}
      elementProps={{
        // GenericPopover 只读取 style.zIndex，并据此生成最终的内联层级。
        style: { zIndex: 'var(--app-z-index-editor-toolbar, 220)' },
      }}
    >
      {show ? <CustomFormattingToolbar {...toolbarProps} /> : null}
    </GenericPopover>
  );
}

function NoteToolbar(props: NoteToolbarProps) {
  const handleOpenFind = useNoteToolbarShortcuts(props.onOpenFind);
  const tableRailSelection = useTableRailSelectionState();

  return (
    <>
      <TextSelectionFormattingToolbar
        {...props}
        onOpenFind={handleOpenFind}
        hidden={props.isFindModeActive || tableRailSelection.orientation !== null}
      />
      <TableRailFormattingToolbar
        {...props}
        onOpenFind={handleOpenFind}
        tableRailSelection={tableRailSelection}
      />
    </>
  );
}

export default NoteToolbar;
