import { EmojiPickerContent } from '@/components/Input';
import {
  GenericPopover,
  useBlockNoteEditor,
  useEditorState,
  type GenericPopoverReference,
} from '@blocknote/react';
import { useEventListener } from 'ahooks';
import { useEffect } from 'react';

import { useNoteEditorReadOnlyContext } from '../../engines/editor/readOnly';
import { blockNoteSchema } from '../../registry/noteEditorComposition';
import {
  closeNoteEmojiPicker,
  createNoteEmojiAnchor,
  insertNoteEmoji,
  noteEmojiPluginKey,
} from './emojiExtension';

const EMOJI_PICKER_FLOATING_OFFSET = 10;
const EMOJI_PICKER_UPWARD_OFFSET = 18;
const EMOJI_PICKER_VIEWPORT_PADDING = 10;
const NOTE_EMOJI_PICKER_POPOVER_CLASS = 'wise-note-emoji-picker-popover';

function clampFloatingPosition(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function isInsideNoteEmojiPicker(event: PointerEvent) {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement && target.classList.contains(NOTE_EMOJI_PICKER_POPOVER_CLASS)
    );
}

function NoteEmojiPickerPopover() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const readOnly = useNoteEditorReadOnlyContext();
  const session = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      noteEmojiPluginKey.getState(currentEditor.prosemirrorView.state) ?? null,
  });
  const reference = session
    ? ({
        element: editor.domElement?.firstElementChild ?? undefined,
        cacheMountedBoundingClientRect: false,
        getBoundingClientRect: () => {
          try {
            return createNoteEmojiAnchor(editor.prosemirrorView, session.to);
          } catch {
            return session.anchor;
          }
        },
      } satisfies GenericPopoverReference)
    : undefined;

  /**
   * @wisepen-manual-effect
   * 执行时机：emoji session 存活期间，如果编辑器进入只读，立即取消未提交的 picker。
   * 不可替代原因：只读是外部 access 事实，emoji session 是 ProseMirror plugin state，需要命令式写回 plugin meta。
   * cleanup：没有订阅资源，仅响应最新只读状态。
   */
  useEffect(() => {
    if (readOnly) closeNoteEmojiPicker(editor.prosemirrorView);
  }, [editor.prosemirrorView, readOnly]);

  const handleDocumentPointerDown = (event: PointerEvent) => {
    if (!session || isInsideNoteEmojiPicker(event)) return;
    closeNoteEmojiPicker(editor.prosemirrorView);
  };

  useEventListener('pointerdown', handleDocumentPointerDown, { target: document, capture: true });

  if (!session || !reference) return null;

  return (
    <GenericPopover
      reference={reference}
      focusManagerProps={{ disabled: true }}
      useFloatingOptions={{
        open: true,
        onOpenChange: (open) => {
          if (!open) closeNoteEmojiPicker(editor.prosemirrorView);
        },
        placement: 'bottom-start',
        middleware: [
          {
            name: 'noteEmojiPickerPlacement',
            fn({ x, y, rects }) {
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const bottomY = y + EMOJI_PICKER_FLOATING_OFFSET;
              const topY =
                y - rects.reference.height - EMOJI_PICKER_UPWARD_OFFSET - rects.floating.height;
              const bottomOverflows =
                bottomY + rects.floating.height > viewportHeight - EMOJI_PICKER_VIEWPORT_PADDING;
              const preferredY = bottomOverflows ? topY : bottomY;
              const maxX = viewportWidth - EMOJI_PICKER_VIEWPORT_PADDING - rects.floating.width;
              const maxY = viewportHeight - EMOJI_PICKER_VIEWPORT_PADDING - rects.floating.height;

              return {
                x: clampFloatingPosition(x, EMOJI_PICKER_VIEWPORT_PADDING, maxX),
                y: clampFloatingPosition(preferredY, EMOJI_PICKER_VIEWPORT_PADDING, maxY),
              };
            },
          },
        ],
      }}
      elementProps={{
        className: NOTE_EMOJI_PICKER_POPOVER_CLASS,
        style: { zIndex: 'var(--app-z-index-editor-floating)' },
      }}
    >
      <EmojiPickerContent
        onSelect={(emoji) => {
          if (readOnly) return;
          insertNoteEmoji(editor.prosemirrorView, emoji);
        }}
      />
    </GenericPopover>
  );
}

export { NoteEmojiPickerPopover };
