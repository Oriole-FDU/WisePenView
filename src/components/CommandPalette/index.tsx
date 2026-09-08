import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/_shadcn';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import { DriveCreateModal, type DriveCreateType } from '@/components/Drive/Modals';
import { Spin } from '@/components/Feedback';
import { useDriveService, useNoteService } from '@/domains';
import type { RootNode } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { useDebounceFn } from 'ahooks';
import {
  Bot,
  FolderHeart,
  Gauge,
  HardDrive,
  KeyRound,
  MessageSquarePlus,
  Palette,
  PenLine,
  UserRound,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ResourceSearchResults from './ResourceSearchResults';
import styles from './style.module.less';

type CreateResourceType = 'note' | Exclude<DriveCreateType, 'folder'>;

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  keywords: string[];
  icon: LucideIcon;
  onSelect: () => void;
}

interface CreateModalTarget {
  type: Exclude<CreateResourceType, 'note'>;
  root: RootNode;
}

interface PreparedModalResult {
  kind: 'modal';
  type: Exclude<CreateResourceType, 'note'>;
  root: RootNode;
}

interface CreatedNoteResult {
  kind: 'note';
  resourceId: string;
  title: string;
  root: RootNode;
}

type PrepareCreateResult = PreparedModalResult | CreatedNoteResult;

const normalizeSearchText = (value: string): string => value.trim().toLocaleLowerCase();

const matchesQuery = (query: string, ...values: string[]): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
};

function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation(['shell', 'drive', 'profile', 'resource']);
  const navigate = useNavigate();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [preparingType, setPreparingType] = useState<CreateResourceType>();
  const [createModalTarget, setCreateModalTarget] = useState<CreateModalTarget | null>(null);
  const commandListRef = useRef<HTMLDivElement>(null);
  const { run: updateDebouncedQuery, cancel: cancelDebouncedQuery } = useDebounceFn(
    (nextQuery: string) => setDebouncedQuery(nextQuery),
    { wait: 300 }
  );

  const getEnabledListOptions = (): HTMLElement[] =>
    Array.from(
      commandListRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
      ) ?? []
    );

  const getHoveredListOption = (): HTMLElement | undefined =>
    getEnabledListOptions().find((option) => option.dataset.hovered === 'true');

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const options = getEnabledListOptions();
    if (options.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const option = getHoveredListOption() ?? options[0];
      option?.focus();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      options[0]?.click();
    }
  };

  const closePalette = () => {
    setQuery('');
    setDebouncedQuery('');
    cancelDebouncedQuery();
    onOpenChange(false);
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    updateDebouncedQuery(nextQuery);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);
      return;
    }
    closePalette();
  };

  const handleNavigate = (path: string, resetChat = false) => {
    closePalette();
    if (resetChat) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
    navigate(path);
  };

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
        closePalette();
        if (result.kind === 'modal') {
          setCreateModalTarget({ type: result.type, root: result.root });
          return;
        }
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
        setPreparingType(undefined);
      },
    }
  );

  const handlePrepareCreate = (type: CreateResourceType) => {
    if (preparingCreate) return;
    setPreparingType(type);
    prepareCreate(type);
  };

  const navigationItems: PaletteItem[] = [
    {
      id: 'new-chat',
      label: t('navigation.newChat', { ns: 'shell' }),
      keywords: ['chat', '对话', '聊天'],
      icon: MessageSquarePlus,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.CHAT, true),
    },
    {
      id: 'personal-drive',
      label: t('page.tabs.drive', { ns: 'drive' }),
      keywords: ['drive', '云盘', '文档'],
      icon: HardDrive,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.DRIVE_PERSONAL),
    },
    {
      id: 'groups',
      label: t('navigation.groups', { ns: 'shell' }),
      keywords: ['group', '团队', '小组'],
      icon: Users,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.GROUPS),
    },
    {
      id: 'favorites',
      label: t('page.tabs.favorites', { ns: 'drive' }),
      keywords: ['favorite', '收藏'],
      icon: FolderHeart,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.DRIVE_FAVORITES),
    },
  ].filter((item) => matchesQuery(query, item.label, ...item.keywords));

  const settingsItems: PaletteItem[] = [
    {
      id: 'account',
      label: t('account.title', { ns: 'profile' }),
      keywords: ['account', '账号'],
      icon: UserRound,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.PROFILE_ACCOUNT),
    },
    {
      id: 'appearance',
      label: t('appearance.title', { ns: 'profile' }),
      keywords: ['appearance', 'theme', '外观', '主题'],
      icon: Palette,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.PROFILE_APPEARANCE),
    },
    {
      id: 'ai',
      label: t('ai.title', { ns: 'profile' }),
      keywords: ['ai', 'byok', 'web search', '密钥', '搜索'],
      icon: KeyRound,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.PROFILE_AI),
    },
    {
      id: 'usage',
      label: t('usage.title', { ns: 'profile' }),
      keywords: ['usage', 'balance', '用量', '余额'],
      icon: Gauge,
      onSelect: () => handleNavigate(APP_ROUTE_PATH.PROFILE_USAGE),
    },
  ].filter((item) => matchesQuery(query, item.label, ...item.keywords));

  const createItems = (
    [
      {
        id: 'create-note',
        type: 'note',
        label: t('create.note', { ns: 'drive' }),
        keywords: ['note', '笔记', '文档'],
        icon: PenLine,
      },
      {
        id: 'create-drawio',
        type: 'drawio',
        label: t('create.drawio', { ns: 'drive' }),
        keywords: ['drawio', 'diagram', '图表'],
        icon: Workflow,
      },
      {
        id: 'create-skill',
        type: 'skill',
        label: t('create.skill', { ns: 'drive' }),
        keywords: ['skill', '技能'],
        icon: Wrench,
      },
      {
        id: 'create-agent',
        type: 'agent',
        label: t('create.agent', { ns: 'drive' }),
        keywords: ['agent', '智能体'],
        icon: Bot,
      },
    ] satisfies Array<Omit<PaletteItem, 'onSelect'> & { type: CreateResourceType }>
  ).filter((item) => matchesQuery(query, item.label, ...item.keywords));

  const hasPrimaryCommands =
    navigationItems.length > 0 || createItems.length > 0 || settingsItems.length > 0;
  const renderPaletteItem = (item: PaletteItem) => {
    const Icon = item.icon;
    return (
      <CommandItem
        key={item.id}
        value={item.id}
        keywords={[item.label, ...item.keywords]}
        onSelect={item.onSelect}
      >
        <span className={styles.itemIcon}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <span className={styles.itemLabel}>{item.label}</span>
      </CommandItem>
    );
  };

  return (
    <>
      <CommandDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        label={t('commandPalette.inputAria', { ns: 'shell' })}
        shouldFilter={false}
        loop
      >
        <CommandInput
          autoFocus
          value={query}
          onValueChange={handleQueryChange}
          aria-label={t('commandPalette.inputAria', { ns: 'shell' })}
          placeholder={t('commandPalette.placeholder', { ns: 'shell' })}
          onKeyDown={handleInputKeyDown}
        />
        <CommandList
          viewportRef={commandListRef}
          aria-label={t('commandPalette.inputAria', { ns: 'shell' })}
        >
          {navigationItems.length > 0 ? (
            <CommandGroup heading={t('commandPalette.groups.navigation', { ns: 'shell' })}>
              {navigationItems.map(renderPaletteItem)}
            </CommandGroup>
          ) : null}
          {createItems.length > 0 ? (
            <CommandGroup heading={t('commandPalette.groups.create', { ns: 'shell' })}>
              {createItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    keywords={[item.label, ...item.keywords]}
                    disabled={preparingCreate}
                    onSelect={() => handlePrepareCreate(item.type)}
                  >
                    <span className={styles.createIcon}>
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className={styles.itemLabel}>{item.label}</span>
                    {preparingType === item.type ? <Spin size="small" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}
          {settingsItems.length > 0 ? (
            <CommandGroup heading={t('commandPalette.groups.settings', { ns: 'shell' })}>
              {settingsItems.map(renderPaletteItem)}
            </CommandGroup>
          ) : null}
          {query && hasPrimaryCommands ? <CommandSeparator /> : null}
          <ResourceSearchResults
            keyword={debouncedQuery}
            layoutKeyword={query}
            viewportRef={commandListRef}
            onSelect={closePalette}
          />
        </CommandList>
      </CommandDialog>

      {createModalTarget ? (
        <DriveCreateModal
          type={createModalTarget.type}
          isOpen
          parent={createModalTarget.root}
          pathTagId={createModalTarget.root.tagId}
          parentLabel={t('navigator.personalDrive', { ns: 'drive' })}
          onOpenChange={(open) => {
            if (!open) setCreateModalTarget(null);
          }}
          onSuccess={(createdId, type) => {
            const root = createModalTarget.root;
            setCreateModalTarget(null);
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
}

export default CommandPalette;
