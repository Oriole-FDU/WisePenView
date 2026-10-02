import { createExtension } from '@blocknote/core';

/** Mermaid 源码块沿用代码块的换行与缩进约定，避免按普通富文本拆块。 */
export const mermaidCodeEditorExtension = createExtension({
  key: 'mermaidCodeEditor',
  keyboardShortcuts: {
    Tab: ({ editor }) =>
      editor.transact((tr) => {
        if (editor.getTextCursorPosition().block.type !== 'mermaid') return false;
        tr.insertText('  ');
        return true;
      }),
    Enter: ({ editor }) =>
      editor.transact((tr) => {
        const { block, nextBlock } = editor.getTextCursorPosition();
        if (block.type !== 'mermaid') return false;

        const { $from } = tr.selection;
        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const endsWithDoubleNewline = $from.parent.textContent.endsWith('\n\n');
        if (!isAtEnd || !endsWithDoubleNewline) {
          tr.insertText('\n');
          return true;
        }

        tr.delete($from.pos - 2, $from.pos);
        if (nextBlock) {
          editor.setTextCursorPosition(nextBlock, 'start');
          return true;
        }
        const [newBlock] = editor.insertBlocks([{ type: 'paragraph' }], block, 'after');
        editor.setTextCursorPosition(newBlock, 'start');
        return true;
      }),
    'Shift-Enter': ({ editor }) =>
      editor.transact(() => {
        const { block } = editor.getTextCursorPosition();
        if (block.type !== 'mermaid') return false;
        const [newBlock] = editor.insertBlocks([{ type: 'paragraph' }], block, 'after');
        editor.setTextCursorPosition(newBlock, 'start');
        return true;
      }),
  },
});
