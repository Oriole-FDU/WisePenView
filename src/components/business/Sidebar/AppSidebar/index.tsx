import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCurrentRouteHandle } from '@/bootstrap/router';
import { useCurrentChatSessionStore } from '@/components/business/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/business/ChatPanel/_store/useNewChatSessionStore';
import { APP_SIDEBAR_HEADER_NAV_KEY } from '@/config/appSidebar';
import { useNoteService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/AppAuthContext';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';

import UserProfile from '../_common/footer/UserProfile';
import HeaderNav from '../_common/header/HeaderNav';
import type { HeaderNavItem } from '../_common/header/HeaderNav/index.type';
import SidebarHeader from '../_common/header/SidebarHeader';
import styles from '../_common/sidebarShell.module.less';
import AppSidebarTabs from '../_common/tab';
import { APP_SIDEBAR_HEADER_ITEMS, type AppSidebarNavigateItem } from './appSidebarNavigation';
import type { AppSidebarProps } from './index.type';

function AppSidebar({ canGoBack, canGoForward, onGoBack, onGoForward, onToggle }: AppSidebarProps) {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const selectedKey = useCurrentRouteHandle()?.appSidebar?.selectedHeaderNavKey ?? undefined;

  const { loading: creatingNote, run: createNote } = useApi(
    async () => {
      const title = t('navigation.defaultNoteTitle');
      const result = await noteService.createNote({ title });
      if (!result.resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId: result.resourceId, title };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, title }) => {
        openResource({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          resourceName: title,
        });
      },
    }
  );

  const handleNavItemPress = (item: AppSidebarNavigateItem) => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    if (item.key === APP_SIDEBAR_HEADER_NAV_KEY.CHAT) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
    navigate(item.to);
  };

  const handleCreateNote = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    if (!creatingNote) createNote();
  };

  const headerNavItems: HeaderNavItem[] = APP_SIDEBAR_HEADER_ITEMS.map((item) => {
    // createNote 类型的菜单项不导航到其他页面，而是触发创建笔记操作。
    if (item.type === 'createNote') {
      return {
        key: item.key,
        name: t(item.labelKey),
        icon: item.icon,
        isDisabled: creatingNote,
        onPress: handleCreateNote,
      };
    }

    // navigate 类型的菜单项负责跳转到指定页面。
    return {
      key: item.key,
      name: t(item.labelKey),
      icon: item.icon,
      onPress: () => handleNavItemPress(item),
    };
  });

  return (
    <div className={styles.sider}>
      <SidebarHeader
        collapsed={false}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        nav={
          <HeaderNav
            ariaLabel={t('navigation.appAria')}
            activeKey={selectedKey}
            items={headerNavItems}
            showIndicator
          />
        }
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onToggle={onToggle}
      />
      <AppSidebarTabs />
      <UserProfile collapsed={false} />
    </div>
  );
}

export default memo(AppSidebar);
