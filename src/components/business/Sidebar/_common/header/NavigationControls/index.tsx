import { ArrowLeft, ArrowRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { SIDEBAR_TOGGLE_BUTTON_PROPS } from '@/layouts/_common/a11y/sidebarToggle';

import type { NavigationControlsProps } from './index.type';
import styles from './style.module.less';

function NavigationControls({
  sidebarCollapsed,
  showHistory = true,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onToggleSidebar,
}: NavigationControlsProps) {
  const { t } = useTranslation('shell');
  const sidebarLabel = sidebarCollapsed
    ? t('navigation.expandSidebar')
    : t('navigation.collapseSidebar');

  return (
    <div className={styles.root}>
      <AppIconButton
        icon={
          sidebarCollapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )
        }
        label={sidebarLabel}
        onPress={onToggleSidebar}
        {...SIDEBAR_TOGGLE_BUTTON_PROPS}
      />
      {showHistory ? (
        <>
          <AppIconButton
            icon={<ArrowLeft size={18} aria-hidden="true" />}
            label={t('navigation.back')}
            isDisabled={!canGoBack}
            onPress={onGoBack}
          />
          <AppIconButton
            icon={<ArrowRight size={18} aria-hidden="true" />}
            label={t('navigation.forward')}
            isDisabled={!canGoForward}
            onPress={onGoForward}
          />
        </>
      ) : null}
    </div>
  );
}

export default NavigationControls;
