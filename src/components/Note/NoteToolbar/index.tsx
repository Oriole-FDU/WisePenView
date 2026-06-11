import {
  AddCommentButton,
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
  useBlockNoteEditor,
} from '@blocknote/react';
import { Button } from '@heroui/react';
import { TextSelection } from '@tiptap/pm/state';
import { useMount, useUnmount } from 'ahooks';
import { Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';

import IconText from '@/components/Common/IconText';
import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import type { NoteToolbarProps } from './index.type';
import styles from './style.module.less';

type ToolbarState = {
  visible: boolean;
  left: number;
  top: number;
};

function getDomSelectionToolbarState(editor: ReturnType<typeof useBlockNoteEditor>): ToolbarState {
  const selection = editor.prosemirrorView.root.getSelection?.() ?? document.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return { visible: false, left: 0, top: 0 };
  }
  const editorDom = editor.prosemirrorView.dom;
  const range = selection.getRangeAt(0);
  const anchorNode = range.commonAncestorContainer;
  if (
    !editorDom.contains(
      anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement
    )
  ) {
    return { visible: false, left: 0, top: 0 };
  }
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return { visible: false, left: 0, top: 0 };
  }
  return {
    visible: true,
    left: rect.left + rect.width / 2,
    top: Math.max(8, rect.top - 10),
  };
}

function getSafeToolbarState(editor: ReturnType<typeof useBlockNoteEditor>): ToolbarState {
  const view = editor.prosemirrorView;
  const { selection, doc } = view.state;
  if (selection.empty) {
    return getDomSelectionToolbarState(editor);
  }
  if (
    selection instanceof TextSelection &&
    doc.textBetween(selection.from, selection.to).length === 0
  ) {
    return getDomSelectionToolbarState(editor);
  }

  try {
    const fromRect = view.coordsAtPos(selection.from);
    const toRect = view.coordsAtPos(selection.to);
    const left = (fromRect.left + toRect.right) / 2;
    const top = Math.min(fromRect.top, toRect.top);
    return {
      visible: true,
      left,
      top: Math.max(8, top - 10),
    };
  } catch {
    return getDomSelectionToolbarState(editor);
  }
}

const NoteToolbar = ({
  onAskAi,
  showAddComment = false,
  onRememberPendingCommentReference,
}: NoteToolbarProps) => {
  const readOnly = useNoteEditorReadOnlyContext();
  const editor = useBlockNoteEditor();
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    visible: false,
    left: 0,
    top: 0,
  });
  const frameRef = useRef<number | null>(null);

  const syncToolbarState = () => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const next = getSafeToolbarState(editor);
      setToolbarState((prev) =>
        prev.visible === next.visible && prev.left === next.left && prev.top === next.top
          ? prev
          : next
      );
    });
  };

  useMount(() => {
    const tiptapEditor = editor._tiptapEditor;
    tiptapEditor.on('selectionUpdate', syncToolbarState);
    tiptapEditor.on('update', syncToolbarState);
    document.addEventListener('selectionchange', syncToolbarState);
    document.addEventListener('pointerup', syncToolbarState, true);
    document.addEventListener('keyup', syncToolbarState, true);
    return () => {
      tiptapEditor.off('selectionUpdate', syncToolbarState);
      tiptapEditor.off('update', syncToolbarState);
      document.removeEventListener('selectionchange', syncToolbarState);
      document.removeEventListener('pointerup', syncToolbarState, true);
      document.removeEventListener('keyup', syncToolbarState, true);
    };
  });

  useUnmount(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  });

  if (!toolbarState.visible) {
    return null;
  }

  return (
    <div
      className={styles.toolbarPopover}
      style={{
        left: toolbarState.left,
        top: toolbarState.top,
      }}
    >
      <FormattingToolbar>
        <Button
          variant="primary"
          size="sm"
          className={styles.askAiBtn}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPress={onAskAi}
        >
          <IconText icon={<Sparkles />} iconSize={14}>
            问AI
          </IconText>
        </Button>
        {showAddComment ? (
          <span onMouseDownCapture={onRememberPendingCommentReference}>
            <AddCommentButton key="addCommentButton" />
          </span>
        ) : null}
        {!readOnly ? (
          <>
            <BlockTypeSelect key="blockTypeSelect" />
            <FileCaptionButton key="fileCaptionButton" />
            <FileReplaceButton key="replaceFileButton" />
            <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
            <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
            <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
            <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
            <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
            <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
            <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
            <TextAlignButton textAlignment="right" key="textAlignRightButton" />
            <ColorStyleButton key="colorStyleButton" />
            <NestBlockButton key="nestBlockButton" />
            <UnnestBlockButton key="unnestBlockButton" />
            <CreateLinkButton key="createLinkButton" />
          </>
        ) : null}
      </FormattingToolbar>
    </div>
  );
};

export default NoteToolbar;
