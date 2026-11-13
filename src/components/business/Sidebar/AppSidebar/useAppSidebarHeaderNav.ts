import { useTranslation } from 'react-i18next';

import { useCurrentRouteHandle } from '@/bootstrap/router';
import type { HeaderNavItem } from '@/components/business/Sidebar/_common/header/HeaderNav/index.type';
import { useNoteService } from '@/domains';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/_context';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { APP_SIDEBAR_HEADER_ITEMS } from './appSidebarNavigation';

interface UseAppSidebarHeaderNavOptions {
  onNavigate?: () => void;
}

interface AppSidebarHeaderNavResult {
  items: HeaderNavItem[];
  selectedKey?: string;
}

export function useAppSidebarHeaderNav({
  onNavigate,
}: UseAppSidebarHeaderNavOptions = {}): AppSidebarHeaderNavResult {
  const { t } = useTranslation('shell');
  const appAuth = useAppAuth();
  const noteService = useNoteService();
  const openResource = useOpenResource();
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

  const handleCreateNote = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    if (!creatingNote) {
      createNote();
      onNavigate?.();
    }
  };

  const items: HeaderNavItem[] = APP_SIDEBAR_HEADER_ITEMS.map((item) => {
    // createNote 类型的菜单项不导航到其他页面，而是触发创建笔记操作。
    if (item.type === 'createNote') {
      return {
        key: item.key,
        name: t(item.labelKey),
        icon: item.icon,
        toolId: item.toolId,
        isDisabled: creatingNote,
        onPress: handleCreateNote,
      };
    }

    // 已登录时渲染真实链接；未登录时保留按钮动作，由登录守卫接管。
    return {
      key: item.key,
      name: t(item.labelKey),
      icon: item.icon,
      toolId: item.toolId,
      href: appAuth.isAuthenticated ? item.to : undefined,
      onPress: appAuth.isAuthenticated ? onNavigate : appAuth.requireLogin,
    };
  });

  return {
    items,
    selectedKey,
  };
}
