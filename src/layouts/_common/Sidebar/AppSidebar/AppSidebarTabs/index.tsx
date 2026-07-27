import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import {
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
  type AppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import SidebarDrive from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive';
import { Tabs, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { FolderOpen, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import GlobalSearch from '../_components/GlobalSearch';
import SessionListGroup from '../SessionListGroup';
import type { AppSidebarTabsProps } from './index.type';
import styles from './style.module.less';

const SIDEBAR_TAB = {
  SESSIONS: 'session-history',
  DRIVE: 'drive',
} as const;

type SidebarTabKey = (typeof SIDEBAR_TAB)[keyof typeof SIDEBAR_TAB];

const resolveSidebarTab = (activeNavKey: AppHeaderNavKey | undefined): SidebarTabKey =>
  activeNavKey === APP_HEADER_NAV_KEY.CHAT ? SIDEBAR_TAB.SESSIONS : SIDEBAR_TAB.DRIVE;

function AppSidebarTabs({ collapsed }: AppSidebarTabsProps) {
  const { t } = useTranslation('shell');
  const location = useLocation();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);
  const activeNavKey = resolveAppHeaderNavKey(location.pathname);
  const [tabState, setTabState] = useState(() => ({
    observedNavKey: activeNavKey,
    selectedTab: resolveSidebarTab(activeNavKey),
  }));

  let selectedTab = tabState.selectedTab;
  if (tabState.observedNavKey !== activeNavKey) {
    selectedTab = resolveSidebarTab(activeNavKey);
    setTabState({ observedNavKey: activeNavKey, selectedTab });
  }

  const selectedKeys =
    activeNavKey === APP_HEADER_NAV_KEY.CHAT && currentSessionId
      ? [`session-${currentSessionId}`]
      : [];

  return (
    <div
      className={clsx(styles.menuContainer, collapsed && styles.menuContainerCollapsed)}
      aria-hidden={collapsed}
    >
      <Tabs
        className={styles.tabs}
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          const nextTab = String(key);
          if (nextTab === SIDEBAR_TAB.SESSIONS || nextTab === SIDEBAR_TAB.DRIVE) {
            setTabState({ observedNavKey: activeNavKey, selectedTab: nextTab });
          }
        }}
      >
        <Tabs.ListContainer className={styles.tabListContainer}>
          <div className={styles.tabToolbar}>
            <Tabs.List className={styles.tabList} aria-label={t('sidebar.contentAria')}>
              <Tabs.Tab
                id={SIDEBAR_TAB.SESSIONS}
                className={styles.tab}
                aria-label={t('sidebar.sessions')}
              >
                <Tooltip>
                  <Tooltip.Trigger className={styles.tabTooltipTrigger}>
                    <MessageSquare size={18} aria-hidden="true" />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom">{t('sidebar.sessions')}</Tooltip.Content>
                </Tooltip>
              </Tabs.Tab>
              <Tabs.Tab
                id={SIDEBAR_TAB.DRIVE}
                className={styles.tab}
                aria-label={t('sidebar.drive')}
              >
                <Tooltip>
                  <Tooltip.Trigger className={styles.tabTooltipTrigger}>
                    <FolderOpen size={18} aria-hidden="true" />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom">{t('sidebar.drive')}</Tooltip.Content>
                </Tooltip>
              </Tabs.Tab>
            </Tabs.List>
            <GlobalSearch />
          </div>
        </Tabs.ListContainer>

        <Tabs.Panel
          id={SIDEBAR_TAB.SESSIONS}
          className={clsx(styles.tabPanel, styles.sessionPanel)}
          shouldForceMount
        >
          <SessionListGroup selectedKeys={selectedKeys} refreshVersion={refreshVersion} />
        </Tabs.Panel>
        <Tabs.Panel
          id={SIDEBAR_TAB.DRIVE}
          className={clsx(styles.tabPanel, styles.drivePanel)}
          shouldForceMount
        >
          <SidebarDrive />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

AppSidebarTabs.displayName = 'AppSidebarTabs';

export default AppSidebarTabs;
