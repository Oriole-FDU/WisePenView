import type { UploadPipeline } from './Pipeline';
import type { Block } from '@/types/note';

export interface NoteProps {
  /** 上传流水线，onChange 后调用 refresh(changes) */
  pipeline: UploadPipeline;
  /** 初始 Block 内容（从服务端加载） */
  initialBlocks?: Block[];
  /** 最近编辑时间（ISO 字符串，来自 loadNote 的 updated_at） */
  lastEditedAt?: string;
  /** 是否为新创建的文档（创建后跳转进入时为 true，用于展示「新创建」） */
  isNewlyCreated?: boolean;
  /** 标题防抖稳定后回调，用于调用 renameResource */
  onTitleStable?: (title: string) => void;
  /**
   * 暴露当前文档快照获取方法：
   * - blocks：正文完整 Block 数组（含标题行）
   * - title：最近一次稳定的标题纯文本
   */
  onRegisterGetSnapshot?: (getSnapshot: () => Promise<{ blocks: Block[]; title?: string }>) => void;
}
