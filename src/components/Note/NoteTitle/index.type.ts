import type { Block } from '@/types/note';

export interface NoteTitleProps {
  /** 初始标题块（heading 1），变更不经过 pipeline */
  initialBlock?: Block;
  /** 按下 Enter 时调用，用于将光标转移到下一个 editor */
  onEnterKey?: () => void;
  /** 挂载后是否自动聚焦（如 createNote 后进入页面时） */
  focusOnMount?: boolean;
  /** 标题防抖稳定后回调（与 pipeline 同粒度 500ms），用于 renameResource */
  onTitleStable?: (title: string) => void;
}
