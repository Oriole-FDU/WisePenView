export interface NoteTitleHandle {
  /** 当前标题编辑区纯文本，空则「未命名笔记」 */
  getPlainTitle: () => string;
  /** 标题 BlockNote 的 ProseMirror 根 DOM，供打印克隆 */
  getProseMirrorRoot: () => HTMLElement | null;
}

export interface NoteTitleProps {
  /** 资源/笔记 ID，对应 syncTitle 的 resourceId；未传则不发起标题同步 */
  id?: string;
  /** 标题初始内容（通常来自 noteInfoDisplay.noteTitle） */
  initialContent?: string;
  /** Enter / 部分导航键时进入正文等 */
  onEnterKey?: () => void;
  /** 挂载后聚焦标题编辑器 */
  focusOnMount?: boolean;
  /** 无协同编辑权限时为只读，不触发标题同步 */
  readOnly?: boolean;
}
