import { useEffect } from 'react';

import { registerGuideActionHandler } from '@/components/base/Guide';
import { GUIDE_ACTION_ID } from '@/constants/tour';
import type { DriveTreeRuntime } from '@/runtime/drive';

export function useDriveDetailGuide(runtime: DriveTreeRuntime): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：Drive 详情栏挂载时注册引导动作。
   * 不可替代原因：引导层直接操作 runtime 中的详情栏折叠状态。
   * cleanup：撤销动作处理器。
   */
  useEffect(
    () =>
      registerGuideActionHandler(GUIDE_ACTION_ID.openDetails, {
        isOpen: () => !runtime.getSnapshot().detailPanelCollapsed,
        open: () => runtime.setDetailPanelCollapsed(false),
        close: () => runtime.setDetailPanelCollapsed(true),
      }),
    [runtime]
  );
}
