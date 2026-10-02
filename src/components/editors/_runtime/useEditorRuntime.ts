import { useMemoizedFn } from 'ahooks';
import { useEffect } from 'react';

import { useEditorSurface } from '../_context';
import type { Editor, EditorExitContext, EditorSnapshot } from '../editor.type';

/** 不同行为所有者只上报自身字段，避免把领域会话复制进公共运行时。 */
export function useEditorRuntime(
  snapshot: Partial<EditorSnapshot>,
  prepareExit?: (context: EditorExitContext, editor: Editor) => Promise<boolean>
) {
  const { runtime } = useEditorSurface();
  const handlePrepareExit = useMemoizedFn(async (context: EditorExitContext) =>
    prepareExit ? prepareExit(context, runtime.editor) : false
  );
  /**
   * @wisepen-manual-effect
   * 执行时机：领域会话状态提交后更新可订阅的实例快照。
   * 不可替代原因：Resource 与编辑器分属不同子树，宿主通过外部订阅读取运行态。
   * cleanup：字段归属当前实例，实例注销时整体失效。
   */
  useEffect(() => {
    runtime.update(snapshot);
  });
  const hasPrepareExit = Boolean(prepareExit);
  /**
   * @wisepen-manual-effect
   * 执行时机：拥有退出策略的工作区挂载或卸载时。
   * 不可替代原因：异步退出由上层触发，必须调用当前会话的最新行为。
   * cleanup：解除匹配的策略，防止版本切换后调用旧会话。
   */
  useEffect(() => {
    if (hasPrepareExit) return runtime.setPrepareExit(handlePrepareExit);
  }, [runtime, hasPrepareExit, handlePrepareExit]);
  return runtime.editor;
}
