import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import GlobalSearch from '@/components/Drive/GlobalSearch';
import {
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
  type AppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import SidebarDrive from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { Tabs, Tooltip } from '@heroui/react';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { FolderOpen, MessageSquare } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SessionListGroup, { type SessionListGroupRef } from '../SessionListGroup';
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
  const location = useLocation();
  const sessionListGroupRef = useRef<SessionListGroupRef>(null);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);
  const driveScope = useWorkspaceNavigationStore((state) => state.location.scope);
  const activeNavKey = resolveAppHeaderNavKey(location.pathname);
  const [selectedTab, setSelectedTab] = useState<SidebarTabKey>(() =>
    resolveSidebarTab(activeNavKey)
  );

  const selectedKeys =
    activeNavKey === APP_HEADER_NAV_KEY.CHAT && currentSessionId
      ? [`session-${currentSessionId}`]
      : [];

  useUpdateEffect(() => {
    void sessionListGroupRef.current?.refresh();
  }, [refreshVersion]);

  useUpdateEffect(() => {
    setSelectedTab(resolveSidebarTab(activeNavKey));
  }, [activeNavKey]);

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
            setSelectedTab(nextTab);
          }
        }}
      >
        <Tabs.ListContainer className={styles.tabListContainer}>
          <div className={styles.tabToolbar}>
            <Tabs.List className={styles.tabList} aria-label="侧边栏内容">
              <Tabs.Tab id={SIDEBAR_TAB.SESSIONS} className={styles.tab} aria-label="会话历史">
                <Tooltip>
                  <Tooltip.Trigger className={styles.tabTooltipTrigger}>
                    <MessageSquare size={18} aria-hidden="true" />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom">会话历史</Tooltip.Content>
                </Tooltip>
              </Tabs.Tab>
              <Tabs.Tab id={SIDEBAR_TAB.DRIVE} className={styles.tab} aria-label="云盘">
                <Tooltip>
                  <Tooltip.Trigger className={styles.tabTooltipTrigger}>
                    <FolderOpen size={18} aria-hidden="true" />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom">云盘</Tooltip.Content>
                </Tooltip>
              </Tabs.Tab>
            </Tabs.List>
            <GlobalSearch scope={driveScope} />
          </div>
        </Tabs.ListContainer>

        <Tabs.Panel
          id={SIDEBAR_TAB.SESSIONS}
          className={clsx(styles.tabPanel, styles.sessionPanel)}
          shouldForceMount
        >
          <SessionListGroup ref={sessionListGroupRef} selectedKeys={selectedKeys} />
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
