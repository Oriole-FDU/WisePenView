export interface NoteTitleProps {
  /** 资源/笔记 ID，对应 syncTitle 的 resourceId；未传则不发起标题同步 */
  id?: string;
  /** Enter / 部分导航键时进入正文等 */
  onEnterKey?: () => void;
  /** 挂载后聚焦标题编辑器 */
  focusOnMount?: boolean;
}
