import type { UploadPipeline } from './Pipeline';

export interface NoteProps {
  /** 预留：文档 ID，用于后续 load/sync */
  docId?: string;
  /** 上传流水线，onChange 后调用 refresh(changes) */
  pipeline: UploadPipeline;
}
