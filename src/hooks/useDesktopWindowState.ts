import { useSyncExternalStore } from 'react';

import { isDesktop, isMac } from '@/utils/platform';

const subscribe = (listener: () => void): (() => void) =>
  window.desktop?.onFullScreenChange(listener) ?? (() => undefined);

const getSnapshot = (): boolean => window.desktop?.isFullScreen() ?? false;

/** 系统窗口控件所在侧：Mac 左上红绿灯；Win/Linux titleBarOverlay 右上按钮 */
export type TitleBarInsetSide = 'start' | 'end';

interface DesktopWindowState {
  isDesktop: boolean;
  isFullScreen: boolean;
  /** 非全屏桌面需要为系统窗口控件让位 */
  hasTitleBarInset: boolean;
  /** 让位方向；无 inset 时为 null */
  titleBarInsetSide: TitleBarInsetSide | null;
}

/** 订阅桌面窗口状态；Web 环境返回非桌面、非全屏状态。 */
export const useDesktopWindowState = (): DesktopWindowState => {
  const desktop = isDesktop();
  const fullScreen = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const hasTitleBarInset = desktop && !fullScreen;
  const titleBarInsetSide: TitleBarInsetSide | null = !hasTitleBarInset
    ? null
    : isMac()
      ? 'start'
      : 'end';

  return {
    isDesktop: desktop,
    isFullScreen: fullScreen,
    hasTitleBarInset,
    titleBarInsetSide,
  };
};
