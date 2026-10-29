import { defineEnum } from '@/utils/type/enum';

/** 文档处理状态（与后端 syncPendingDocStatus 返回的 status 字符串对齐） */
export const DOCUMENT_PROCESS = defineEnum([
  { value: 'UPLOADING', key: 'UPLOADING' },
  { value: 'UPLOADED', key: 'UPLOADED' },
  { value: 'CONVERTING_AND_PARSING', key: 'CONVERTING_AND_PARSING' },
  { value: 'REGISTERING_RES', key: 'REGISTERING_RES' },
  { value: 'READY', key: 'READY' },
  { value: 'TRANSFER_TIMEOUT', key: 'TRANSFER_TIMEOUT' },
  { value: 'REGISTERING_RES_TIMEOUT', key: 'REGISTERING_RES_TIMEOUT' },
  { value: 'FAILED', key: 'FAILED' },
] as const);

// 终态集合
const DOCUMENT_TERMINAL_STATUS = [
  DOCUMENT_PROCESS.READY,
  DOCUMENT_PROCESS.TRANSFER_TIMEOUT,
  DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS.FAILED,
] as const;

const DOCUMENT_TERMINAL_STATUS_SET = new Set<string>(DOCUMENT_TERMINAL_STATUS);

const DOCUMENT_RETRYABLE_STATUS = [
  DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS.FAILED,
] as const;

const DOCUMENT_RETRYABLE_STATUS_SET = new Set<string>(DOCUMENT_RETRYABLE_STATUS);

const DOCUMENT_CANCELABLE_STATUS = [
  DOCUMENT_PROCESS.UPLOADING,
  DOCUMENT_PROCESS.UPLOADED,
  DOCUMENT_PROCESS.REGISTERING_RES,
  DOCUMENT_PROCESS.TRANSFER_TIMEOUT,
  DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS.FAILED,
] as const;

const DOCUMENT_CANCELABLE_STATUS_SET = new Set<string>(DOCUMENT_CANCELABLE_STATUS);

export const isDocumentTerminalStatus = (status: string): boolean => {
  return DOCUMENT_TERMINAL_STATUS_SET.has(status);
};

export const isDocumentRetryableStatus = (status: string): boolean => {
  return DOCUMENT_RETRYABLE_STATUS_SET.has(status);
};

export const isDocumentCancelableStatus = (status: string): boolean => {
  return DOCUMENT_CANCELABLE_STATUS_SET.has(status);
};
