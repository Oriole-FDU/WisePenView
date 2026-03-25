import { useCallback, useEffect, useRef } from 'react';

import type { SessionConnectionCallbacks } from '@/services/Note/yjs/WisepenProvider';
import type { WisepenProvider } from '@/services/Note/yjs/WisepenProvider';

export interface UseSessionConnectionWatcherResult {
  // register时，传入provider实例，和回调函数，使provider的连接状态变化时通过回调通知上层
  registerHandlers: (
    // provider实例，暴露watchSessionConnection方法，接受回调函数，在状态变化时调用回调函数
    provider: WisepenProvider,
    // 由usePrepareYjs提供的，成功，失败，重建连接的回调函数
    handlers: SessionConnectionCallbacks
  ) => void;

  // 清除已注册的会话连接监听，避免卸载后仍回调及重复注册
  clearRegisteredHandlers: () => void;
}

/**
 * useSessionConnectionWatcher 是一个中间层，其结构如下：
 *
 * usePrepareYjs -> useSessionConnectionWatcher -> WisepenProvider
 *
 * 当WisepenProvider所维护的会话连接状态变化时（如连接成功/失败，发生断联），它需要通知prepareYjs
 *
 * 为了使prepareYjs的逻辑更内聚，更简单，我们通过一个中间层useConnectionWatcher来连接两层
 *
 * 该钩子提供一个注册方法，一个将变化后的callback函数传递给WisepenProvider，从而WisepenProvider可以通知prepareYjs状态的变化
 *
 * 同时，该钩子提供一个取消注册方法，从而取消prepareYjs对WisepenProvider的监听
 *
 * 这个逻辑需要返回两个函数的原因是为了语义的通顺性，不然我们会看到如下的代码：
 *
 * const unwatchSessionConnection = provider.watchSessionConnection(handlers);
 *
 * 在这里，watchSessionConnection是一个注册函数，返回一个取消注册函数，看起来非常奇怪, 像是把取消注册这个方法给了注册的函数
 *
 * 所以我们封装了一个hook，分别返回这两个方法，使得语义更通顺
 */

export function useSessionConnectionWatcher(): UseSessionConnectionWatcherResult {
  const clearRegisteredRef = useRef<(() => void) | null>(null);

  /** 清除已注册的会话连接监听 */
  const clearRegisteredHandlers = useCallback(() => {
    clearRegisteredRef.current?.();
    clearRegisteredRef.current = null;
  }, []);

  /** 注册会话连接监听 */
  const registerHandlers = useCallback(
    (provider: WisepenProvider, handlers: SessionConnectionCallbacks) => {
      clearRegisteredHandlers();
      clearRegisteredRef.current = provider.watchSessionConnection(handlers).unsubscribe;
    },
    [clearRegisteredHandlers]
  );

  useEffect(() => {
    return () => {
      clearRegisteredRef.current?.();
      clearRegisteredRef.current = null;
    };
  }, []);

  return {
    registerHandlers,
    clearRegisteredHandlers,
  };
}
