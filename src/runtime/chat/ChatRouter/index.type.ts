import type { Chat } from '@ai-sdk/react';

import type { CreateSessionRequest, WisePenUIMessage } from '@/domains/ChatSession';

import type { ChatRouterSendRequest, SessionApprovalDecision } from '../_common';
import type { SessionRuntimeSnapshot } from '../model/SessionRuntimeState';

export type ChatRouterSnapshot = {
  readonly sessionId: string | null;
  readonly chat: Chat<WisePenUIMessage> | null;
  readonly runtime: SessionRuntimeSnapshot | null;
};

export interface ChatRouter {
  getSnapshot(): ChatRouterSnapshot;
  /** 前台身份变化或前台 runtime 状态变化时通知 */
  subscribe(listener: (snapshot: ChatRouterSnapshot) => void): () => void;

  /** 将已有会话切为前台（池命中或冷启动） */
  focusSession(sessionId: string): Promise<void>;

  /** 显式新建空白会话并成为前台 */
  createSession(params?: CreateSessionRequest): Promise<void>;

  /** 离开前台（新建空白对话）；池内实例保留为 background */
  leaveSession(): void;

  /**
   * 列表删除等入口在清掉持久化后通知：dispose 池内实例；
   * 若恰为前台则清空前台指向。
   */
  notifySessionDeleted(sessionId: string): Promise<void>;

  /**
   * 发送到当前前台会话。
   * 若尚无前台（新建空白对话），先 lazy create 再发。
   */
  send(query: string, request?: ChatRouterSendRequest): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;
  loadMoreHistory(): Promise<void>;
}
