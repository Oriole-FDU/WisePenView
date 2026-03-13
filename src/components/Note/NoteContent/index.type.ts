import type { UploadPipeline } from '../Pipeline';
import type { Block } from '@/types/note';

export interface NoteContentProps {
  /** 上传流水线，onChange 后调用 refresh(changes) */
  pipeline: UploadPipeline;
  /** 初始 Block 内容（从服务端加载） */
  initialBlocks?: Block[];
}

export interface NoteContentRef {
  focus: () => void;
  /** 获取当前正文的完整 Block 数组（用于快照） */
  getBlocks: () => Block[];
}
