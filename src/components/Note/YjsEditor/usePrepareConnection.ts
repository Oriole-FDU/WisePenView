import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

import { WisepenProvider, noteYjsIdbRoomName } from '@/services/Note/yjs';

import type { NoteYjsEditorProps } from './index.type';
import type { SessionConnectionCallbacks } from '@/services/Note/yjs/WisepenProvider';

const SESSION_CONNECT_TIMEOUT_MS = 5_000;

export type UsePrepareConnectionParams = Pick<
  NoteYjsEditorProps,
  'resourceId' | 'userId' | 'onSessionReady' | 'onSessionError' | 'onSessionStatusChange'
>;

export interface UsePrepareConnectionResult {
  doc: Y.Doc | null;
  provider: WisepenProvider | null;
}

/**
 * 创建 Y.Doc、IndexedDB 持久化与 WisepenProvider；就绪或超时后通过 ref 中的回调通知父层（effect 只依赖 resourceId / userId）。
 */
export function usePrepareConnection({
  resourceId,
  userId,
  onSessionReady,
  onSessionError,
  onSessionStatusChange,
}: UsePrepareConnectionParams): UsePrepareConnectionResult {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WisepenProvider | null>(null);

  const onSessionReadyRef = useRef(onSessionReady);
  const onSessionErrorRef = useRef(onSessionError);
  const onSessionStatusChangeRef = useRef(onSessionStatusChange);
  onSessionReadyRef.current = onSessionReady;
  onSessionErrorRef.current = onSessionError;
  onSessionStatusChangeRef.current = onSessionStatusChange;

  useEffect(() => {
    // 创建新的 Y.Doc 实例
    const newDoc = new Y.Doc();
    // 创建 IndexedDB 持久化（与 WebSocket 并行，本地缓存同一篇文档）
    const idbPersistence = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), newDoc);
    // 新一轮会话开始：先按「未连接」上报状态
    onSessionStatusChangeRef.current?.(false);

    // 与当前页面协议一致：https → wss，http → ws
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // connect: false，先 watchSessionConnection 再 connect，避免漏事件（见 WisepenProvider 注释）
    const wsProvider = new WisepenProvider(
      `${protocol}//${window.location.host}/note-collab`,
      resourceId,
      newDoc,
      userId,
      { connect: false }
    );

    /**
     * 「首次建连」是否已结束：仅三选一——已成功上报就绪、已走超时失败、或本 effect 已清理（换笔记/卸载）。
     */

    /** 首次建连是否已结束 */
    let sessionSetupDone = false;

    /** 连接超时定时器ID */
    let connectTimeoutId: ReturnType<typeof window.setTimeout>;
    /** 清除连接超时定时器 */
    const clearConnectTimeout = () => {
      window.clearTimeout(connectTimeoutId);
    };

    /** 会话就绪时调用，将initialSessionSetupDone设置为true */
    const onSessionReady = () => {
      if (sessionSetupDone) return;
      sessionSetupDone = true;
      clearConnectTimeout();
      onSessionStatusChangeRef.current?.(true);
      onSessionReadyRef.current?.();
    };

    /** 传输层断线：就绪前后都可能多次触发，须始终上报；仅在「尚未结束首次建连」时顺带掐掉超时定时器 */
    const onSessionDisconnected = () => {
      onSessionStatusChangeRef.current?.(false);
      if (!sessionSetupDone) {
        sessionSetupDone = true;
        clearConnectTimeout();
      }
    };

    /** 连接建立：清断线 UI */
    const onConnectionEstablished = () => {
      onSessionStatusChangeRef.current?.(true);
    };

    // 构造sessionConnectionCallbacks，wisepenProvider的连接状态变化时，通过回调通知上层
    const sessionConnectionCallbacks: SessionConnectionCallbacks = {
      onSessionReady: onSessionReady,
      onDisconnected: onSessionDisconnected,
      onConnectionEstablished: onConnectionEstablished,
    };

    // 注册会话连接监听，返回一个取消注册函数
    const sessionConnectionSubscription = wsProvider.watchSessionConnection(
      sessionConnectionCallbacks
    );

    // 连接WebSocket
    wsProvider.connect();

    // 最长等待：超时则卸监听、上报错误，由上层重试
    connectTimeoutId = window.setTimeout(() => {
      if (sessionSetupDone) return;
      sessionSetupDone = true;
      clearConnectTimeout();
      sessionConnectionSubscription.unsubscribe();
      onSessionStatusChangeRef.current?.(false);
      onSessionErrorRef.current?.('连接笔记服务超时，请检查网络或稍后重试');
    }, SESSION_CONNECT_TIMEOUT_MS);

    // 交给 React 渲染层：有 doc + provider 才能挂协同编辑器
    setDoc(newDoc);
    setProvider(wsProvider);

    // 换笔记、换用户或卸载：结束本段会话，避免泄漏与串房间
    return () => {
      sessionSetupDone = true;
      clearConnectTimeout();
      sessionConnectionSubscription.unsubscribe();
      wsProvider.destroy();
      void idbPersistence.destroy();
      newDoc.destroy();
    };
  }, [resourceId, userId]);

  // 供 NoteYjsEditor 使用；未就绪前为 null
  return { doc, provider };
}
