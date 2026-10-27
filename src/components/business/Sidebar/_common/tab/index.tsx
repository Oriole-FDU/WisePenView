import { clsx } from 'clsx';
import { BookOpen, FolderOpen, type LucideIcon, MessageSquare } from 'lucide-react';
import { type ComponentPropsWithRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import { GuideAnchor, registerGuideActionHandlers } from '@/components/base/Guide';
import { Tabs } from '@/components/base/Tabs';
import { Tooltip } from '@/components/base/Tooltip';
import CommandPaletteTrigger from '@/components/business/CommandPalette/Trigger';
import { GUIDE_ACTION_ID, GUIDE_TOOL_ID, type GuideToolId } from '@/constants/tour';
import { useAppAuth } from '@/layouts/App/_context';
import { mergeRefs } from '@/utils/react/mergeRefs';

import {
  SIDEBAR_VIEW_TAB,
  type SidebarViewTabKey,
  useSidebarViewTabStore,
} from './_store/useSidebarViewTabStore';
import CourseTab from './CourseTab';
import DriveTab from './DriveTab';
import SessionTab from './SessionTab';
import styles from './style.module.scss';

interface SidebarViewTabProps {
  id: SidebarViewTabKey;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  toolId?: GuideToolId;
}

function SidebarViewTab({ id, label, icon: Icon, selected, toolId }: SidebarViewTabProps) {
  return (
    <Tabs.Tab
      id={id}
      className={styles.tab}
      aria-label={label}
      render={(domProps) => {
        // Tab 不消费 Tooltip 上下文，两者在此共用原本的 div 与焦点节点。
        const { ref: tabRef, ...tabProps } = domProps as ComponentPropsWithRef<'div'>;
        return (
          <Tooltip isDisabled={selected}>
            <Tooltip.Trigger
              {...tabProps}
              render={({ ref: tooltipRef, ...tooltipProps }) => (
                <div
                  {...tooltipProps}
                  data-guide-tool-id={toolId}
                  tabIndex={tabProps.tabIndex}
                  ref={mergeRefs(tabRef, tooltipRef)}
                />
              )}
            />
            <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
          </Tooltip>
        );
      }}
    >
      <span className={styles.tabTooltipTrigger}>
        <span className={styles.tabContent}>
          <Icon size={18} aria-hidden="true" />
          <span className={styles.tabLabel}>
            <span className={styles.tabLabelInner}>{label}</span>
          </span>
        </span>
      </span>
    </Tabs.Tab>
  );
}

function AppSidebarTabs() {
  const { t } = useTranslation('shell');
  const appAuth = useAppAuth();
  const selectedTab = useSidebarViewTabStore((state) => state.selectedTab);
  const setSelectedTab = useSidebarViewTabStore((state) => state.setSelectedTab);

  /**
   * @wisepen-manual-effect
   * 执行时机：侧栏挂载时注册引导切页动作。
   * 不可替代原因：引导层需要直接写入当前标签 store，不能依赖对标签按钮的模拟点击。
   * cleanup：撤销三个动作处理器。
   */
  useEffect(() => {
    return registerGuideActionHandlers({
      [GUIDE_ACTION_ID.showSidebarSessions]: {
        open: () => setSelectedTab(SIDEBAR_VIEW_TAB.SESSIONS),
      },
      [GUIDE_ACTION_ID.showSidebarDrive]: {
        open: () => setSelectedTab(SIDEBAR_VIEW_TAB.DRIVE),
      },
      [GUIDE_ACTION_ID.showSidebarCourses]: {
        open: () => setSelectedTab(SIDEBAR_VIEW_TAB.COURSES),
      },
    });
  }, [setSelectedTab]);

  if (!appAuth.isAuthenticated) {
    return (
      <div className={styles.menuContainer}>
        <Tabs
          className={styles.tabs}
          selectedKey={SIDEBAR_VIEW_TAB.SESSIONS}
          onSelectionChange={() => appAuth.requireLogin()}
        >
          <Tabs.ListContainer className={styles.tabListContainer}>
            <div className={styles.tabToolbar}>
              <Tabs.List className={styles.tabList} aria-label={t('sidebar.contentAria')}>
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.SESSIONS}
                  label={t('sidebar.sessions')}
                  icon={MessageSquare}
                  selected
                />
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.DRIVE}
                  label={t('sidebar.drive')}
                  icon={FolderOpen}
                  selected={false}
                />
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.COURSES}
                  label={t('sidebar.courses')}
                  icon={BookOpen}
                  selected={false}
                />
              </Tabs.List>
              <span className={styles.tabSearch}>
                <CommandPaletteTrigger />
              </span>
            </div>
          </Tabs.ListContainer>

          <AppPressable className={styles.anonymousPanel} onClick={appAuth.requireLogin}>
            <div className={styles.anonymousTitle}>{t('anonymous.sidebarTitle')}</div>
            <div className={styles.anonymousHint}>{t('anonymous.sidebarHint')}</div>
          </AppPressable>
        </Tabs>
      </div>
    );
  }

  return (
    <div className={styles.menuContainer}>
      <Tabs
        className={styles.tabs}
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          setSelectedTab(key as SidebarViewTabKey);
        }}
      >
        <Tabs.ListContainer className={styles.tabListContainer}>
          <GuideAnchor id={GUIDE_TOOL_ID.sidebarContentToolbar} asChild>
            <div className={styles.tabToolbar}>
              <Tabs.List className={styles.tabList} aria-label={t('sidebar.contentAria')}>
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.SESSIONS}
                  label={t('sidebar.sessions')}
                  icon={MessageSquare}
                  selected={selectedTab === SIDEBAR_VIEW_TAB.SESSIONS}
                  toolId={GUIDE_TOOL_ID.sidebarSessionsTab}
                />
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.DRIVE}
                  label={t('sidebar.drive')}
                  icon={FolderOpen}
                  selected={selectedTab === SIDEBAR_VIEW_TAB.DRIVE}
                  toolId={GUIDE_TOOL_ID.sidebarDriveTab}
                />
                <SidebarViewTab
                  id={SIDEBAR_VIEW_TAB.COURSES}
                  label={t('sidebar.courses')}
                  icon={BookOpen}
                  selected={selectedTab === SIDEBAR_VIEW_TAB.COURSES}
                  toolId={GUIDE_TOOL_ID.sidebarCoursesTab}
                />
              </Tabs.List>
              <span className={styles.tabSearch}>
                <CommandPaletteTrigger />
              </span>
            </div>
          </GuideAnchor>
        </Tabs.ListContainer>

        <div className={styles.panelViewport}>
          <div
            className={clsx(
              styles.panelTrack,
              selectedTab === SIDEBAR_VIEW_TAB.DRIVE && styles.panelTrackDrive,
              selectedTab === SIDEBAR_VIEW_TAB.COURSES && styles.panelTrackCourses
            )}
          >
            <Tabs.Panel
              id={SIDEBAR_VIEW_TAB.SESSIONS}
              className={clsx(styles.tabPanel, styles.sessionPanel)}
              shouldForceMount
            >
              <SessionTab />
            </Tabs.Panel>
            <Tabs.Panel
              id={SIDEBAR_VIEW_TAB.DRIVE}
              className={clsx(styles.tabPanel, styles.drivePanel)}
              shouldForceMount
            >
              <DriveTab />
            </Tabs.Panel>
            <Tabs.Panel
              id={SIDEBAR_VIEW_TAB.COURSES}
              className={clsx(styles.tabPanel, styles.coursePanel)}
              shouldForceMount
            >
              <CourseTab />
            </Tabs.Panel>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

AppSidebarTabs.displayName = 'AppSidebarTabs';

export default AppSidebarTabs;
