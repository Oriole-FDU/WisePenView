import { createExtension } from '@blocknote/core';
import type { Mark } from '@tiptap/pm/model';
import type { EditorProps } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const ESC = '\u001b';

function textContainsEsc(text: string): boolean {
  for (const ch of text) {
    if (ch.codePointAt(0) === 0x1b) return true;
  }
  return false;
}

/**
 * 在编辑器视图上拦截含 U+001B 的 insertText / insertCompositionText（PM 会对返回 true 的事件 preventDefault）。
 * appendTransaction 负责协同等不经过 DOM 输入的路径。
 */
export const stripEscapeEditorProps: Pick<EditorProps, 'handleDOMEvents'> = {
  handleDOMEvents: {
    beforeinput(_view, event) {
      const e = event as InputEvent;
      if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') {
        return false;
      }
      const data = e.data;
      if (data == null || data === '') return false;
      if (!textContainsEsc(data)) return false;
      e.preventDefault();
      return true;
    },
  },
};

/** 文档层兜底：剔除已写入的 U+001B（协同 / 非 DOM 输入等）。 */
export const stripEscapeCharExtension = createExtension({
  key: 'stripEscapeChar',
  prosemirrorPlugins: [
    new Plugin({
      key: new PluginKey('stripEscapeChar'),
      appendTransaction(transactions, _oldState, newState) {
        if (!transactions.some((tr) => tr.docChanged)) {
          return null;
        }

        const fixes: Array<{
          from: number;
          to: number;
          cleaned: string;
          marks: readonly Mark[];
        }> = [];

        newState.doc.descendants((node, pos) => {
          if (!node.isText || !node.text?.includes(ESC)) {
            return true;
          }
          fixes.push({
            from: pos,
            to: pos + node.nodeSize,
            cleaned: node.text.replaceAll(ESC, ''),
            marks: [...node.marks],
          });
          return true;
        });

        if (fixes.length === 0) {
          return null;
        }

        fixes.sort((a, b) => b.from - a.from);

        let tr = newState.tr;
        for (const f of fixes) {
          if (f.cleaned.length === 0) {
            tr = tr.delete(f.from, f.to);
          } else {
            tr = tr.replaceWith(f.from, f.to, newState.schema.text(f.cleaned, f.marks));
          }
        }
        return tr;
      },
    }),
  ],
});
