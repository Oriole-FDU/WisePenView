/**
 * 外部导航请求的纯逻辑：chat 侧派发、笔记侧消费，双方共用同一份判定规则。
 *
 * 「外部」指请求来自笔记编辑器之外（当前为 chat 原文链接），与编辑器内部的定位原语
 * （NoteEditorAnchor / scrollToAnchor）区分开，避免和目录、批注的编辑器内滚动混淆。
 */
import type { NoteLinkTarget } from './noteLinkProtocol';

/** 定位请求过期时间：导航被未保存拦截或用户中途放弃时不残留定位意图 */
export const NOTE_EXTERNAL_NAVIGATION_REQUEST_TTL_MS = 5_000;
/** 笔记侧定位重试间隔（正文可能仍在协同同步） */
export const NOTE_EXTERNAL_NAVIGATION_RETRY_INTERVAL_MS = 120;
/** 笔记侧定位最长等待时间，超时后按失败提示 */
export const NOTE_EXTERNAL_NAVIGATION_RETRY_TIMEOUT_MS = 3_000;

/** 一次外部导航请求：滚动到指定块并高亮 */
export interface NoteExternalNavigationRequest extends NoteLinkTarget {
  requestId: number;
  expiresAt: number;
}

export function createNoteExternalNavigationRequest(
  target: NoteLinkTarget,
  requestId: number,
  now: number
): NoteExternalNavigationRequest {
  return {
    resourceId: target.resourceId,
    blockId: target.blockId,
    requestId,
    expiresAt: now + NOTE_EXTERNAL_NAVIGATION_REQUEST_TTL_MS,
  };
}

export function isNoteExternalNavigationRequestExpired(
  request: NoteExternalNavigationRequest,
  now: number
): boolean {
  return now >= request.expiresAt;
}
