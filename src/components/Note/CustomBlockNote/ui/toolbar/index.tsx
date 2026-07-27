import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/engines/editor/readOnly';
import { blockNoteSchema } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';
import {
  blockMatchesBlockTypeItem,
  getAvailableBlockTypeItems,
} from '@/components/Note/CustomBlockNote/ui/editorMenus/blockTypes';
import {
  useTableRailSelectionState,
  type TableRailSelectionOrientation,
} from '@/components/Note/CustomBlockNote/ui/tableHandles/railSelectionState';
import { blockHasType } from '@blocknote/core';
import { FormattingToolbarExtension } from '@blocknote/core/extensions';
import {
  GenericPopover,
  useBlockNoteEditor,
  useEditorState,
  useExtension,
  useExtensionState,
  type GenericPopoverReference,
} from '@blocknote/react';
import { ButtonGroup, Separator, Toolbar } from '@heroui/react';
import { useEventListener } from 'ahooks';
import { MessageSquarePlus, Search, Sparkles } from 'lucide-react';
import { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockTypeMenu } from './components/BlockTypeMenu';
import { ColorMenu } from './components/ColorMenu';
import { FileCaptionToolbarButton } from './components/FileButtons';
import { CreateLinkToolbarButton } from './components/LinkButton';
import { NestButtons } from './components/NestButtons';
import { TableCellButtons } from './components/TableCellButtons';
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

function ToolbarSeparator() {
  return <Separator orientation="vertical" className={styles.toolbarSeparator} />;
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

type CustomFormattingToolbarProps = Omit<NoteToolbarProps, 'isFindModeActive'>;

function CustomFormattingToolbar({
  onAskAi,
  onAddComment,
  onOpenFind,
}: CustomFormattingToolbarProps) {
  const { t } = useTranslation('note');
  const readOnly = useNoteEditorReadOnlyContext();
  const showBlockTypeFileGroup = useBlockTypeFileGroupVisible();

  return (
    <Toolbar
      aria-label={t('editor.toolbar.label')}
      isAttached
      className={styles.toolbar}
      onMouseDown={stopToolbarMouseDown}
    >
      {!readOnly ? (
        <>
          <TableCellButtons />
          {showBlockTypeFileGroup ? (
            <>
              <ToolbarSeparator />
              <ButtonGroup size="sm" variant="ghost" aria-label={t('editor.toolbar.blockAndFile')}>
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
          <ColorMenu />
          <ToolbarSeparator />
          <NestButtons />
          <ToolbarSeparator />
          <CreateLinkToolbarButton />
          <ToolbarSeparator />
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
  const toolbarState = useFloatingToolbarState(editor, hidden);

  if (!toolbarState.mounted) {
    return null;
  }

  return (
    <div
      className={styles.toolbarPopover}
      data-visible={toolbarState.visible && !hidden}
      style={{
        left: toolbarState.left,
        top: toolbarState.top,
      }}
    >
      <CustomFormattingToolbar {...toolbarProps} />
    </div>
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
    const getBoundingClientRect = () => toDOMRect(tableRailSelection.rect!);

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
      elementProps={{ className: styles.floatingLayer, style: { zIndex: 120 } }}
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
