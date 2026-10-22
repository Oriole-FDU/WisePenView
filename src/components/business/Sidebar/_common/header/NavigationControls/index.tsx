import { ArrowLeft, ArrowRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { GuideAnchor } from '@/components/base/Guide';
import { SIDEBAR_TOGGLE_BUTTON_PROPS } from '@/constants/sidebarToggle';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import { COLOR_SCHEME_ICON_SRC, useColorScheme } from '@/theme';

import type { NavigationControlsProps } from './index.type';
import styles from './style.module.scss';

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
  const { colorScheme } = useColorScheme();
  const sidebarLabel = sidebarCollapsed
    ? t('navigation.expandSidebar')
    : t('navigation.collapseSidebar');
  const toggleIcon = sidebarCollapsed ? (
    <span className={styles.collapsedToggleIcon}>
      <img
        className={styles.collapsedLogo}
        src={COLOR_SCHEME_ICON_SRC[colorScheme]}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <PanelLeftOpen className={styles.collapsedExpandIcon} size={18} aria-hidden="true" />
    </span>
  ) : (
    <PanelLeftClose size={18} aria-hidden="true" />
  );

  return (
    <div className={styles.root}>
      <GuideAnchor id={GUIDE_TOOL_ID.sidebarCollapse}>
        <AppIconButton
          className={sidebarCollapsed ? styles.collapsedToggleButton : undefined}
          icon={toggleIcon}
          label={sidebarLabel}
          onPress={onToggleSidebar}
          {...SIDEBAR_TOGGLE_BUTTON_PROPS}
        />
      </GuideAnchor>
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
