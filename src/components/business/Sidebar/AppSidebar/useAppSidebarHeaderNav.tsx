import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCurrentRouteHandle } from '@/bootstrap/router';
import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import type { HeaderNavItem } from '@/components/business/Sidebar/_common/header/HeaderNav/index.type';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/_context';

import { APP_SIDEBAR_HEADER_ITEMS, type AppSidebarNavigateItem } from './appSidebarNavigation';
import CreateResourceModal from './CreateResourceModal';
import type { CreatedResource } from './CreateResourceModal/index.type';

interface UseAppSidebarHeaderNavOptions {
  onNavigate?: () => void;
}

interface AppSidebarHeaderNavResult {
  items: HeaderNavItem[];
  selectedKey?: string;
  ModalHost: ReactElement;
}

export function useAppSidebarHeaderNav({
  onNavigate,
}: UseAppSidebarHeaderNavOptions = {}): AppSidebarHeaderNavResult {
  const { t } = useTranslation(['shell', 'drive']);
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const openResource = useOpenResource();
  const selectedKey = useCurrentRouteHandle()?.appSidebar?.selectedHeaderNavKey ?? undefined;
  const [createResourceOpen, setCreateResourceOpen] = useState(false);

  const handleNavItemPress = (item: AppSidebarNavigateItem) => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    navigate(item.to);
    onNavigate?.();
  };

  const handleCreateResource = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    setCreateResourceOpen(true);
    onNavigate?.();
  };

  const handleResourceCreated = ({ resourceId, type, root }: CreatedResource) => {
    setCreateResourceOpen(false);
    requestDriveRefresh();
    openResource({
      resourceId,
      resourceType: type === 'note' ? RESOURCE_KIND.NOTE : type,
      driveLocation: { scope: root.scope, mountTagId: root.tagId },
    });
  };

  const items: HeaderNavItem[] = APP_SIDEBAR_HEADER_ITEMS.map((item) => {
    // 创建资源项不导航到其他页面，而是打开资源类型选择器。
    if (item.type === 'createResource') {
      return {
        key: item.key,
        name: t(item.labelKey),
        icon: item.icon,
        toolId: item.toolId,
        onPress: handleCreateResource,
      };
    }

    // navigate 类型的菜单项负责跳转到指定页面。
    return {
      key: item.key,
      name: t(item.labelKey),
      icon: item.icon,
      toolId: item.toolId,
      onPress: () => handleNavItemPress(item),
    };
  });

  const ModalHost = (
    <CreateResourceModal
      isOpen={createResourceOpen}
      onOpenChange={setCreateResourceOpen}
      onCreated={handleResourceCreated}
    />
  );

  return {
    items,
    selectedKey,
    ModalHost,
  };
}
