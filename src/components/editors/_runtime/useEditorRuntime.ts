import { useLatest, useMemoizedFn } from 'ahooks';
import { useEffect, useRef } from 'react';

import { useEditorSurface } from '../_context';
import type { Editor, EditorExitContext, EditorSnapshot } from '../editor.type';
import type { EditorLoadState, EditorSessionRegistration } from './editorRuntime';

/** 入口只报告请求状态，不覆盖活动会话的完整快照。 */
export function useEditorLoadState(state: EditorLoadState) {
  const { runtime } = useEditorSurface();
  /**
   * @wisepen-manual-effect
   * 执行时机：入口请求状态提交后更新加载信息。
   * 不可替代原因：加载入口与宿主位于不同子树，通过运行时订阅通信。
   * cleanup：入口与运行时一起卸载，加载信息随实例失效。
   */
  useEffect(() => {
    runtime.updateLoad(state);
  });
}

/** 一次注册同时拥有完整快照与退出策略，卸载时一起撤销。 */
export function useEditorRuntime(
  snapshot: EditorSnapshot,
  prepareExit?: (context: EditorExitContext, editor: Editor) => Promise<boolean>
) {
  const { runtime } = useEditorSurface();
  const latestSnapshot = useLatest(snapshot);
  const registration = useRef<EditorSessionRegistration | undefined>(undefined);
  const handlePrepareExit = useMemoizedFn(async (context: EditorExitContext) =>
    prepareExit
      ? prepareExit(context, runtime.editor)
      : !runtime.editor.getSnapshot().hasUnsavedChanges && !runtime.editor.getSnapshot().pendingWork
  );
  /**
   * @wisepen-manual-effect
   * 执行时机：领域会话挂载后注册快照与退出策略。
   * 不可替代原因：异步退出属于宿主，策略必须调用当前会话闭包。
   * cleanup：注销本次会话并中止退出等待，旧清理不能影响新会话。
   */
  useEffect(() => {
    const current = runtime.registerSession(latestSnapshot.current, handlePrepareExit);
    registration.current = current;
    return () => {
      current.dispose();
      if (registration.current === current) registration.current = undefined;
    };
  }, [runtime, latestSnapshot, handlePrepareExit]);
  /**
   * @wisepen-manual-effect
   * 执行时机：领域状态提交后替换当前会话完整快照。
   * 不可替代原因：宿主通过运行时订阅实际编辑状态。
   * cleanup：由注册生命周期统一注销，不在每次更新中撤销。
   */
  useEffect(() => {
    registration.current?.update(snapshot);
  });
  return runtime.editor;
}
