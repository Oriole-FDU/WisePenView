/**
 * 文档上传与后端 DocumentConstants 对齐（扩展名白名单、体积上限）。
 */
export const DOCUMENT_MAX_FILE_BYTES = 100 * 1024 * 1024;

/** 小写扩展名，不含点 */
export const DOCUMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
] as const;

export type DocumentAllowedExtension = (typeof DOCUMENT_ALLOWED_EXTENSIONS)[number];
