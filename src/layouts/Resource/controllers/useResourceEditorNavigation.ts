import { useMemoizedFn } from 'ahooks';
import { useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import type { createEditorHost } from '@/components/editors/_runtime/editorHost';
import type { EditorExitReason } from '@/components/editors/editor.type';
import { isNoteDraftResourceUpgrade } from '@/utils/navigation/resourceRoute';

export function useResourceEditorNavigation(
  host: ReturnType<typeof createEditorHost>,
  requestExit: (reason: EditorExitReason) => Promise<boolean>
) {
  const shouldBlock = useMemoizedFn(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string; search: string };
      nextLocation: { pathname: string; search: string };
    }) => {
      const editor = host.getSnapshot();
      if (!editor) return false;
      if (
        currentLocation.search === nextLocation.search &&
        isNoteDraftResourceUpgrade(
          currentLocation.pathname,
          nextLocation.pathname,
          editor.getSnapshot().openedResource
        )
      )
        return false;
      return (
        currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search
      );
    }
  );
  const blocker = useBlocker(shouldBlock);
  useBeforeUnload(
    (event) => {
      if (!host.getSnapshot()?.getSnapshot().warnBeforeUnload) return;
      event.preventDefault();
      event.returnValue = '';
    },
    { capture: true }
  );
  const resolveNavigation = useMemoizedFn((allowed: boolean) => {
    if (blocker.state !== 'blocked') return;
    if (allowed) blocker.proceed();
    else blocker.reset();
  });
  const blockedKey = blocker.state === 'blocked' ? blocker.location.key : undefined;
  /**
   * @wisepen-manual-effect
   * 执行时机：路由器提交新的离开意图并进入 blocked 状态时。
   * 不可替代原因：历史导航与外部 Link 同样由路由器触发，编辑器仅提供退出能力。
   * cleanup：中止旧意图并忽略迟到结果，禁止恢复已失效的跳转。
   */
  useEffect(() => {
    if (!blockedKey) return;
    let active = true;
    void requestExit('leave-page').then((allowed) => {
      if (active) resolveNavigation(allowed);
    });
    return () => {
      active = false;
      host.cancelExit();
    };
  }, [blockedKey, host, requestExit, resolveNavigation]);
}
