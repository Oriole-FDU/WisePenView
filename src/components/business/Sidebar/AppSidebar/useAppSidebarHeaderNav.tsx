import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCurrentRouteHandle } from '@/bootstrap/router';
import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import { DriveCreateModal } from '@/components/business/Drive/Modals';
import type { HeaderNavItem } from '@/components/business/Sidebar/_common/header/HeaderNav/index.type';
import { useDriveService, useNoteService } from '@/domains';
import type { RootNode } from '@/domains/Drive';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/_context';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { APP_SIDEBAR_HEADER_ITEMS, type AppSidebarNavigateItem } from './appSidebarNavigation';
import CreateResourceModal from './CreateResourceModal';
import type { CreateResourceType } from './CreateResourceModal/index.type';

interface UseAppSidebarHeaderNavOptions {
  onNavigate?: () => void;
}

interface AppSidebarHeaderNavResult {
  items: HeaderNavItem[];
  selectedKey?: string;
  ModalHost: ReactElement;
}

interface ResourceCreateModalTarget {
  type: Exclude<CreateResourceType, 'note'>;
  root: RootNode;
}

type PrepareCreateResult =
  | {
      kind: 'modal';
      type: Exclude<CreateResourceType, 'note'>;
      root: RootNode;
    }
  | {
      kind: 'note';
      resourceId: string;
      title: string;
      root: RootNode;
    };

interface CreateResourceState {
  isOpen: boolean;
  modalTarget: ResourceCreateModalTarget | null;
  preparingType?: CreateResourceType;
}

export function useAppSidebarHeaderNav({
  onNavigate,
}: UseAppSidebarHeaderNavOptions = {}): AppSidebarHeaderNavResult {
  const { t } = useTranslation(['shell', 'drive']);
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const selectedKey = useCurrentRouteHandle()?.appSidebar?.selectedHeaderNavKey ?? undefined;
  const [createResourceState, setCreateResourceState] = useState<CreateResourceState>({
    isOpen: false,
    modalTarget: null,
  });
  const createModalTarget = createResourceState.modalTarget;

  const { loading: preparingCreate, run: prepareCreate } = useApi(
    async (type: CreateResourceType): Promise<PrepareCreateResult> => {
      const root = await driveService.getRoot();
      if (!root.canMountResources || !root.tagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '个人云盘根目录不可挂载资源',
        });
      }

      if (type !== 'note') return { kind: 'modal', type, root };

      const title = t('create.defaultNoteTitle', { ns: 'drive' });
      const result = await noteService.createNote({ title, pathTagId: root.tagId });
      if (!result.resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { kind: 'note', resourceId: result.resourceId, title, root };
    },
    {
      manual: true,
      onSuccess: (result) => {
        setCreateResourceState((current) => ({ ...current, isOpen: false }));
        if (result.kind === 'modal') {
          setCreateResourceState({
            isOpen: false,
            modalTarget: { type: result.type, root: result.root },
          });
          return;
        }
        requestDriveRefresh();
        openResource({
          resourceId: result.resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          resourceName: result.title,
          driveLocation: result.root.tagId
            ? { scope: result.root.scope, mountTagId: result.root.tagId }
            : undefined,
        });
      },
      onFinally: () => {
        setCreateResourceState((current) => ({ ...current, preparingType: undefined }));
      },
    }
  );

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
    setCreateResourceState({ isOpen: true, modalTarget: null });
    onNavigate?.();
  };

  const handleCreateResourceSelect = (type: CreateResourceType) => {
    if (preparingCreate) return;
    setCreateResourceState((current) => ({ ...current, preparingType: type }));
    prepareCreate(type);
  };

  const handleCreateResourceOpenChange = (open: boolean) => {
    if (!open && preparingCreate) return;
    setCreateResourceState((current) => ({ ...current, isOpen: open }));
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
    <>
      <CreateResourceModal
        isOpen={createResourceState.isOpen}
        loadingType={createResourceState.preparingType}
        onOpenChange={handleCreateResourceOpenChange}
        onSelect={handleCreateResourceSelect}
      />
      {createModalTarget ? (
        <DriveCreateModal
          type={createModalTarget.type}
          isOpen
          parent={createModalTarget.root}
          pathTagId={createModalTarget.root.tagId}
          parentLabel={t('navigator.personalDrive', { ns: 'drive' })}
          onOpenChange={(open) => {
            if (!open) {
              setCreateResourceState((current) => ({ ...current, modalTarget: null }));
            }
          }}
          onSuccess={(createdId, type) => {
            const { root } = createModalTarget;
            setCreateResourceState((current) => ({ ...current, modalTarget: null }));
            requestDriveRefresh();
            openResource({
              resourceId: createdId,
              resourceType: type,
              driveLocation: root.tagId ? { scope: root.scope, mountTagId: root.tagId } : undefined,
            });
          }}
        />
      ) : null}
    </>
  );

  return {
    items,
    selectedKey,
    ModalHost,
  };
}
