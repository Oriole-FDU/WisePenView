import AppIconButton from '@/components/Button/AppIconButton';
import AppNavigationControls from '@/layouts/AppNavigation/AppNavigationControls';
import clsx from 'clsx';
import { PanelRightOpen, PanelsTopLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ResourceHeader from '../ResourceHeader';
import type { WorkspaceHeaderProps } from './index.type';
import styles from './style.module.less';

function WorkspaceHeader({
  resource,
  inlineTitle,
  extra,
  resourceSidePanelActions,
  titleBlock,
  canGoBack = false,
  canGoForward = false,
  leftSidebarCollapsed = false,
  rightSidebarCollapsed = true,
  onGoBack,
  onGoForward,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onEnterZenMode,
  className,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation('workspace');

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          {leftSidebarCollapsed && onToggleLeftSidebar && onGoBack && onGoForward ? (
            <AppNavigationControls
              sidebarCollapsed
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={onGoBack}
              onGoForward={onGoForward}
              onToggleSidebar={onToggleLeftSidebar}
            />
          ) : null}
          {resource ? (
            <div className={styles.resourceHeader}>
              <ResourceHeader {...resource} />
            </div>
          ) : (
            <div className={styles.toolbarMiddle}>
              {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
            </div>
          )}
          <div className={styles.toolbarEnd}>
            {resource ? null : extra}
            {resourceSidePanelActions}
            {onEnterZenMode ? (
              <AppIconButton
                icon={<PanelsTopLeft size={18} aria-hidden="true" />}
                label={t('shell.enterZen')}
                onPress={onEnterZenMode}
              />
            ) : null}
            {rightSidebarCollapsed && onToggleRightSidebar ? (
              <div className={styles.sidebarControls}>
                <AppIconButton
                  icon={<PanelRightOpen size={18} aria-hidden="true" />}
                  label={t('shell.expandRightSidebar')}
                  onPress={onToggleRightSidebar}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
}

export default WorkspaceHeader;
