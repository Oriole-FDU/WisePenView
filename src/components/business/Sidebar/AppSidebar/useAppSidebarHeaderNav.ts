import { ChevronDown, ChevronRight, NotebookPen } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';

import { useCurrentRouteHandle } from '@/bootstrap/router';
import { useDriveRefreshVersion } from '@/components/business/Drive/driveRefresh';
import type { HeaderNavItem } from '@/components/business/Sidebar/_common/header/HeaderNav/index.type';
import { useNoteService, useResourceService } from '@/domains';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { resourceDisplayNameCache } from '@/domains/Resource/session/resourceDisplayNameCache';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useAppAuth } from '@/layouts/App/_context';
import { useMyNotesStore } from '@/layouts/Resource/_store/useMyNotesStore';
import { findReusableNote } from '@/layouts/Resource/localNoteModel';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { APP_SIDEBAR_HEADER_ITEMS, type AppSidebarNavigateItem } from './appSidebarNavigation';

interface UseAppSidebarHeaderNavOptions {
  onNavigate?: () => void;
}

interface AppSidebarHeaderNavResult {
  items: HeaderNavItem[];
  selectedKey?: string;
}

/** 「我的笔记」列表一次拉取的笔记数上限；列表按更新时间倒序，够覆盖侧边栏浏览。 */
const MY_NOTES_PAGE_SIZE = 100;

export function useAppSidebarHeaderNav({
  onNavigate,
}: UseAppSidebarHeaderNavOptions = {}): AppSidebarHeaderNavResult {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const driveRefreshVersion = useDriveRefreshVersion();
  const openResource = useOpenResource();
  const routeSelectedKey = useCurrentRouteHandle()?.appSidebar?.selectedHeaderNavKey ?? undefined;
  const activeId = useMatch(`${APP_ROUTE_PATH.RESOURCES}/:resourceType/:resourceId`)?.params
    .resourceId;
  const { notes, expanded, creating } = useMyNotesStore();
  const displayNames = useStore(resourceDisplayNameCache, (state) => state.byResourceId);

  /**
   * 「我的笔记」列出云盘里的全部笔记，数据源是资源列表接口；
   * 本地 store 只负责正文/标题等运行时状态与候选资格，不再决定列表内容。
   */
  const { data: driveNotes } = useApi(
    () =>
      resourceService.getUserResources({
        page: 1,
        size: MY_NOTES_PAGE_SIZE,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
        // 与创建笔记的 resourceType 枚举一致（CreateNoteRequest 使用大写 NOTE）。
        resourceType: 'NOTE',
      }),
    // 页面一打开就预取（不等展开），并在云盘增删改后跟着刷新。
    { ready: appAuth.isAuthenticated, refreshDeps: [notes.length, driveRefreshVersion] }
  );

  /**
   * @wisepen-manual-memo
   * 为什么：列表要把「云盘拉取的笔记」与「本地 store 里的笔记」按 resourceId 合并去重，
   * 每次渲染重算会为同一份数据反复重建 Set 与数组，并让下游导航项的引用每帧都变。
   * 收益：只有 displayNames、driveNotes、notes 变化时才重建列表，引用保持稳定。
   * 失效条件：不再合并两份来源、或调用方改为自己缓存时，该 memo 失去意义可移除。
   */
  const sidebarNotes = useMemo(() => {
    // 本会话打开/新建过的笔记排在前面（新建与复用后由 reveal 前移），其余按更新时间倒序跟在后面。
    const localIds = new Set(notes.map((note) => note.resourceId));
    return [
      ...notes.map((note) => ({
        resourceId: note.resourceId,
        name: displayNames[note.resourceId] ?? note.name,
      })),
      ...(driveNotes?.list ?? [])
        .filter((item) => item.resourceId && !localIds.has(item.resourceId))
        .map((item) => ({
          resourceId: item.resourceId,
          name: displayNames[item.resourceId] ?? item.resourceName,
        })),
    ];
  }, [displayNames, driveNotes, notes]);

  const selectedKey = notes.some((note) => note.resourceId === activeId)
    ? expanded
      ? `my-note-${activeId}`
      : 'my-notes'
    : routeSelectedKey;

  const { loading: creatingNote, run: createNote } = useApi(
    async () => {
      if (useMyNotesStore.getState().creating) return undefined;
      useMyNotesStore.setState({ creating: true });
      try {
        const cachedNames = resourceDisplayNameCache.getState().byResourceId;
        const candidate = findReusableNote(
          useMyNotesStore
            .getState()
            .notes.map((note) => ({ ...note, name: cachedNames[note.resourceId] ?? note.name }))
        );
        if (candidate) return { resourceId: candidate.resourceId, title: candidate.name };
        const title = t('navigation.defaultNoteTitle');
        const result = await noteService.createNote({ title });
        if (!result.resourceId) {
          throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
        }
        useMyNotesStore.getState().add(result.resourceId, title, true);
        return { resourceId: result.resourceId, title };
      } finally {
        useMyNotesStore.setState({ creating: false });
      }
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        const { resourceId, title } = result;
        useMyNotesStore.getState().reveal(resourceId);
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
    navigate(item.to);
    onNavigate?.();
  };

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
        isDisabled: creatingNote || creating,
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

  const noteItems: HeaderNavItem[] = [
    {
      key: 'my-notes',
      name: t('navigation.myNotes'),
      icon: expanded ? ChevronDown : ChevronRight,
      expanded,
      onPress: () => useMyNotesStore.setState({ expanded: !expanded }),
    },
  ];
  if (expanded) {
    if (!sidebarNotes.length)
      noteItems.push({
        key: 'my-notes-empty',
        name: t('navigation.myNotesEmpty'),
        icon: NotebookPen,
        isDisabled: true,
        nested: true,
        onPress: () => {},
      });
    sidebarNotes.forEach((note) =>
      noteItems.push({
        key: `my-note-${note.resourceId}`,
        name: note.name,
        icon: NotebookPen,
        nested: true,
        onPress: () => {
          openResource({
            resourceId: note.resourceId,
            resourceType: RESOURCE_KIND.NOTE,
            resourceName: note.name,
          });
          onNavigate?.();
        },
      })
    );
  }
  items.splice(2, 0, ...noteItems);

  return {
    items,
    selectedKey,
  };
}
