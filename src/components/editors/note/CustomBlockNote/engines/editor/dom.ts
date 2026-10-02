/** 可访问 ProseMirror DOM 的 BlockNote 编辑器（正文 / 标题实例均适用）。 */
type EditorWithProseMirrorDom = {
  prosemirrorView?: { dom: HTMLElement };
  _tiptapEditor?: { view?: { dom: HTMLElement } };
};

/** 可编辑正文根节点（TipTap / ProseMirror EditorView.dom）。 */
export function getProseMirrorRoot(editor: EditorWithProseMirrorDom): HTMLElement | null {
  const pm = editor.prosemirrorView;
  if (pm?.dom) return pm.dom;
  return editor._tiptapEditor?.view?.dom ?? null;
}

/** Document 才有 getSelection；ShadowRoot 回退到全局 document。 */
export function getRootDomSelection(root: Document | ShadowRoot): Selection | null {
  if (root instanceof Document) {
    return root.getSelection();
  }
  return document.getSelection();
}
