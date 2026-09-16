import { Minus, Square, SquareStack, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';

import styles from './style.module.less';

const subscribeMaximized = (listener: () => void): (() => void) =>
  window.desktop?.onMaximizedChange?.(listener) ?? (() => undefined);

const getMaximizedSnapshot = (): boolean => window.desktop?.isMaximized?.() ?? false;

/**
 * Win/Linux 窗口按钮：固定在视口右上角，生命周期与路由/Chat 动画解耦。
 * Mac 使用系统红绿灯，不渲染。
 */
function DesktopWindowControls() {
  const { t } = useTranslation('shell');
  const desktopWindow = useDesktopWindowState();
  const maximized = useSyncExternalStore(subscribeMaximized, getMaximizedSnapshot, () => false);

  if (
    !desktopWindow.isDesktop ||
    desktopWindow.titleBarInsetSide !== 'end' ||
    desktopWindow.isFullScreen
  ) {
    return null;
  }

  return (
    <div className={styles.root} data-no-drag>
      <button
        type="button"
        className={styles.button}
        aria-label={t('windowControls.minimize')}
        onClick={() => void window.desktop?.windowMinimize?.()}
      >
        <Minus size={16} aria-hidden="true" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={maximized ? t('windowControls.restore') : t('windowControls.maximize')}
        onClick={() => void window.desktop?.windowMaximizeToggle?.()}
      >
        {maximized ? (
          <SquareStack size={14} aria-hidden="true" strokeWidth={2} />
        ) : (
          <Square size={14} aria-hidden="true" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.close}`}
        aria-label={t('windowControls.close')}
        onClick={() => void window.desktop?.windowClose?.()}
      >
        <X size={16} aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  );
}

export default DesktopWindowControls;
