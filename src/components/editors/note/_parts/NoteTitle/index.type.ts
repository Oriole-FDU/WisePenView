import type { Ref } from 'react';

export interface NoteTitleHandle {
  /** 当前标题编辑区纯文本，空则“未命名笔记”。 */
  getPlainTitle: () => string;
  /** 滚动到标题并聚焦标题编辑器。 */
  scrollIntoView: () => void;
}

export type NoteTitleSaveStatus = 'saving' | 'saved' | 'failed';

export interface NoteTitleProps {
  id: string;
  initialContent: string;
  onEnterKey: () => void;
  focusOnMount: boolean;
  readOnly: boolean;
  onSaveStatusChange: (status: NoteTitleSaveStatus) => void;
  ref?: Ref<NoteTitleHandle>;
}
