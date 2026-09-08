import { APP_HEADER_NAV_KEY, type AppHeaderNavKey } from '@/bootstrap/routeMeta';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import { useDriveService, useNoteService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { useAppRouteMeta } from '@/hooks/useAppRouteMeta';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/AppAuthContext';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { NotebookPen } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../_common/footer/UserProfile';
import HeaderNav from '../_common/header/HeaderNav';
import type { HeaderNavItem } from '../_common/header/HeaderNav/index.type';
import SidebarHeader from '../_common/header/SidebarHeader';
import styles from '../_common/sidebarShell.module.less';
import AppSidebarTabs from '../_common/tab';
import { useSidebarViewTabStore } from '../_common/tab/_store/useSidebarViewTabStore';
import { APP_HEADER_NAV_ITEMS } from './appSidebarNavigation';
import type { AppSidebarProps } from './index.type';

function AppSidebar({ canGoBack, canGoForward, onGoBack, onGoForward, onToggle }: AppSidebarProps) {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const routeMeta = useAppRouteMeta();
  const appAuth = useAppAuth();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const storedHeaderNavKey = useSidebarViewTabStore((state) => state.headerNavKey);
  const setHeaderNavKey = useSidebarViewTabStore((state) => state.setHeaderNavKey);
  const selectedKey = routeMeta?.headerNav ?? storedHeaderNavKey;

  const { loading: creatingNote, run: createNote } = useApi(
    async () => {
      const root = await driveService.getRoot();
      if (!root.canMountResources || !root.tagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '个人云盘根目录不可挂载资源',
        });
      }
      const mountTagId = root.tagId;

      const title = t('navigation.defaultNoteTitle');
      const result = await noteService.createNote({ title, pathTagId: mountTagId });
      if (!result.resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId: result.resourceId, root, title, mountTagId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, root, title, mountTagId }) => {
        openResource({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          resourceName: title,
          driveLocation: { scope: root.scope, mountTagId },
        });
      },
    }
  );

  const handleNavItemPress = (navKey: AppHeaderNavKey) => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    const navItem = APP_HEADER_NAV_ITEMS.find((item) => item.key === navKey);
    if (!navItem) return;
    setHeaderNavKey(navKey);
    if (navKey === APP_HEADER_NAV_KEY.CHAT) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
    navigate(navItem.to);
  };

  const handleCreateNote = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    if (!creatingNote) createNote();
  };

  const headerNavItems: HeaderNavItem[] = APP_HEADER_NAV_ITEMS.flatMap((item) => {
    const navItem: HeaderNavItem = {
      key: item.key,
      name: t(item.labelKey),
      icon: item.icon,
      onPress: () => handleNavItemPress(item.key),
    };
    if (item.key !== APP_HEADER_NAV_KEY.CHAT) return [navItem];

    return [
      navItem,
      {
        key: 'create-note',
        name: t('navigation.newNote'),
        icon: NotebookPen,
        isDisabled: creatingNote,
        onPress: handleCreateNote,
      },
    ];
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
