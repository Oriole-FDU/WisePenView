import { createExtension } from '@blocknote/core';

/**
 * 为声明该能力的块处理方向键导航，避免光标落入块级结构位置。
 * 在编辑器根节点的捕获阶段处理，确保早于 GapCursor 的默认导航。
 */
export function createBlockKeyboardNavigationExtension(blockType: string) {
  return createExtension(({ editor }) => ({
    key: `${blockType}BlockKeyboardNavigation`,
    mount: ({ dom, signal }) => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
          event.shiftKey ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        ) {
          return;
        }

        const handled = editor.transact((tr) => {
          const { block, nextBlock, prevBlock } = editor.getTextCursorPosition();
          if (block.type !== blockType) return false;

          const selectionType = tr.selection.toJSON().type;
          if (selectionType === 'gapcursor') {
            if (event.key === 'ArrowDown' || !prevBlock) {
              editor.setTextCursorPosition(block, 'start');
            } else {
              editor.setTextCursorPosition(prevBlock, 'end');
            }
            return true;
          }

          if (selectionType === 'node') {
            const targetBlock = event.key === 'ArrowUp' ? prevBlock : nextBlock;
            if (targetBlock) {
              editor.setTextCursorPosition(targetBlock, event.key === 'ArrowUp' ? 'end' : 'start');
            }
            return true;
          }

          const isAtBlockStart = tr.selection.empty && tr.selection.$from.parentOffset === 0;
          if (event.key === 'ArrowDown') {
            const isAtBlockEnd =
              tr.selection.empty &&
              tr.selection.$to.parentOffset === tr.selection.$to.parent.content.size;
            if (!isAtBlockEnd) return false;

            if (nextBlock) editor.setTextCursorPosition(nextBlock, 'start');
            return true;
          }

          if (!isAtBlockStart) return false;

          if (prevBlock) editor.setTextCursorPosition(prevBlock, 'end');
          return true;
        });
        if (!handled) return;

        event.preventDefault();
        event.stopImmediatePropagation();
      };

      dom.addEventListener('keydown', handleKeyDown, true);
      signal.addEventListener(
        'abort',
        () => dom.removeEventListener('keydown', handleKeyDown, true),
        {
          once: true,
        }
      );
    },
  }))();
}
