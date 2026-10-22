import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { GUIDE_TOOL_ID } from '@/constants/tour';

import UserProfile from '../_common/footer/UserProfile';
import HeaderNav from '../_common/header/HeaderNav';
import SidebarHeader from '../_common/header/SidebarHeader';
import styles from '../_common/sidebarShell.module.scss';
import AppSidebarTabs from '../_common/tab';
import type { AppSidebarProps } from './index.type';
import { useAppSidebarHeaderNav } from './useAppSidebarHeaderNav';

function AppSidebar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onToggle,
  onNavigate,
  collapsed = false,
  motionPhase = collapsed ? 'collapsed' : 'expanded',
}: AppSidebarProps) {
  const { t } = useTranslation('shell');
  const { items: headerNavItems, selectedKey } = useAppSidebarHeaderNav({ onNavigate });
  const labelsHidden = motionPhase !== 'expanded';
  const railLayout = motionPhase === 'collapsed';

  return (
    <div
      className={styles.sider}
      data-sidebar-phase={motionPhase}
      data-sidebar-compact={railLayout || undefined}
      data-sidebar-labels-hidden={labelsHidden || undefined}
    >
      <SidebarHeader
        collapsed={railLayout}
        labelsHidden={labelsHidden}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        nav={
          <HeaderNav
            ariaLabel={t('navigation.appAria')}
            activeKey={selectedKey}
            collapsed={railLayout}
            guideToolId={GUIDE_TOOL_ID.sidebarNavigation}
            items={headerNavItems}
            labelsHidden={labelsHidden}
            showIndicator
          />
        }
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onToggle={onToggle}
      />
      <div className={styles.expandedBody}>
        <AppSidebarTabs />
      </div>
      <div className={styles.sidebarFooter}>
        <UserProfile collapsed={railLayout} labelsHidden={labelsHidden} />
      </div>
    </div>
  );
}

export default memo(AppSidebar);
