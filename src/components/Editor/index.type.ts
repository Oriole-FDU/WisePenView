import type { EditorUploadPipeline } from './Pipeline';

export interface EditorProps {
  /** 预留：文档 ID，用于后续 load/sync */
  docId?: string;
  /** 上传流水线，onChange 后调用 refresh(changes) */
  pipeline: EditorUploadPipeline;
}
