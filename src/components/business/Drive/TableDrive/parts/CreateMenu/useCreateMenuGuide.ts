import { useEffect } from 'react';

import { registerGuideActionHandler } from '@/components/base/Guide';
import { GUIDE_ACTION_ID } from '@/constants/tour';

interface UseCreateMenuGuideParams {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function useCreateMenuGuide({ open, setOpen }: UseCreateMenuGuideParams): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：新建菜单挂载或展开状态变化时注册引导动作。
   * 不可替代原因：引导层直接修改菜单 open 状态，不通过模拟点击触发按钮。
   * cleanup：撤销动作处理器。
   */
  useEffect(
    () =>
      registerGuideActionHandler(GUIDE_ACTION_ID.openCreateMenu, {
        isOpen: () => open,
        open: () => setOpen(true),
        close: () => setOpen(false),
      }),
    [open, setOpen]
  );
}
