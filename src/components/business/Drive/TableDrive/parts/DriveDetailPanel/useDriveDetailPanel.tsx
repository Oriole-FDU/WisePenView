import { Clock3, FileType2, GitBranch, HardDrive, ShieldCheck, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useDocumentService, useHtmlPageService, useNoteService } from '@/domains';
import {
  ACCESS_CONTROL_SCOPE,
  type AccessControlScope,
  type ResourceAction,
} from '@/domains/_shared/access';
import type { ResourceItem } from '@/domains/Resource';
import { resolveResourceKind, RESOURCE_KIND } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { formatFileSize } from '@/utils/format/formatFileSize';

import { isDriveActionTarget } from '../../../common/driveComponentModel';
import { resolveTagPermissionActionPresetKey } from '../../../common/tagPermissionPreset';
import type { DriveTableRow } from '../../index.type';
import type { DetailMetaItem } from './index.type';
import styles from './style.module.scss';

const EMPTY_META = '—';
const NOTE_RESOURCE_TYPES = new Set(['note', 'drawio']);
const ACCESS_SCOPE_LABEL_KEYS = {
  [ACCESS_CONTROL_SCOPE.ALL]: 'permission.tag.scope.all',
  [ACCESS_CONTROL_SCOPE.ONLY_ADMIN]: 'permission.tag.scope.onlyAdmin',
  [ACCESS_CONTROL_SCOPE.BLACKLIST]: 'permission.tag.scope.blacklist',
  [ACCESS_CONTROL_SCOPE.WHITELIST]: 'permission.tag.scope.whitelist',
} satisfies Record<AccessControlScope, string>;

function getUserDisplayName(user?: UserDisplayBase, fallbackId?: string): string {
  return user?.nickname?.trim() || user?.realName?.trim() || fallbackId || EMPTY_META;
}

function formatVersion(version?: number): string {
  return typeof version === 'number' ? `v${version}` : EMPTY_META;
}

function formatActionList(
  actions: ResourceAction[] | null | undefined,
  getActionLabel: (action: ResourceAction) => string
): string {
  if (!actions || actions.length === 0) return EMPTY_META;
  return actions.map(getActionLabel).join('、');
}

function resolveResourceInfoFromNode(row: DriveTableRow): ResourceItem | undefined {
  const node = row.node;
  if (node.type !== 'resource' && node.type !== 'link') return undefined;
  return {
    resourceId: node.resourceId,
    resourceName: row.name,
    ownerId: node.ownerId,
    ownerInfo: node.ownerInfo ?? {},
    resourceType: node.resourceType,
    preview: node.description,
    size: node.size,
    resourceIconType: node.resourceIconType,
    mainTagId: node.type === 'link' ? node.primaryTagId : node.mountTagId,
    currentActions: node.currentActions,
  };
}

export function useDriveDetailPanel(selectedRow?: DriveTableRow): DetailMetaItem[] {
  const { t } = useTranslation(['drive', 'resource', 'common']);
  const noteService = useNoteService();
  const documentService = useDocumentService();
  const htmlPageService = useHtmlPageService();

  const formatAccessScope = (scope?: AccessControlScope): string =>
    scope == null ? EMPTY_META : t(ACCESS_SCOPE_LABEL_KEYS[scope], { ns: 'resource' });

  const resourceNode =
    selectedRow && (selectedRow.node.type === 'resource' || selectedRow.node.type === 'link')
      ? selectedRow.node
      : undefined;
  const resourceKind = resourceNode ? resolveResourceKind(resourceNode.resourceType) : undefined;
  const resourceTypeToken = resourceNode?.resourceType?.trim().toLowerCase();
  const shouldLoadNoteMeta = Boolean(
    resourceNode?.resourceId && resourceTypeToken && NOTE_RESOURCE_TYPES.has(resourceTypeToken)
  );
  const shouldLoadDocumentMeta = Boolean(
    resourceNode?.resourceId && resourceKind === RESOURCE_KIND.FILE && !shouldLoadNoteMeta
  );
  const shouldLoadHtmlMeta = Boolean(
    resourceNode?.resourceId && resourceKind === RESOURCE_KIND.HTML
  );

  const { data: noteMeta, loading: loadingNoteMeta } = useApi(
    () => noteService.getNoteInfoDisplay({ resourceId: resourceNode?.resourceId ?? '' }),
    {
      ready: shouldLoadNoteMeta,
      refreshDeps: [resourceNode?.resourceId],
    }
  );
  const { data: documentMeta, loading: loadingDocumentMeta } = useApi(
    () => documentService.getDocInfo(resourceNode?.resourceId ?? ''),
    {
      ready: shouldLoadDocumentMeta,
      refreshDeps: [resourceNode?.resourceId],
    }
  );
  const { data: htmlPageInfo, loading: loadingHtmlPageInfo } = useApi(
    () => htmlPageService.getHtmlPageInfo(resourceNode?.resourceId ?? ''),
    {
      ready: shouldLoadHtmlMeta,
      refreshDeps: [resourceNode?.resourceId],
    }
  );

  if (!selectedRow || selectedRow.node.type === 'loading') return [];

  const fallbackResourceInfo = resolveResourceInfoFromNode(selectedRow);
  const detailResourceInfo =
    noteMeta?.resourceInfo ??
    documentMeta?.resourceInfo ??
    htmlPageInfo?.resourceInfo ??
    fallbackResourceInfo;
  const detailLoading = loadingNoteMeta || loadingDocumentMeta || loadingHtmlPageInfo;
  const actionTarget = isDriveActionTarget(selectedRow.node) ? selectedRow.node : null;
  const shouldShowPermissionMeta = selectedRow.node.scope.type === 'group';
  const getActionLabel = (action: ResourceAction) =>
    t(`permission.actions.${action}`, { ns: 'resource' });
  const formatResourceDefaultPermission = (actions?: ResourceAction[] | null): ReactNode => {
    const presetKey = resolveTagPermissionActionPresetKey(actions ?? []);
    const presetLabel = t(`permission.tag.preset.${presetKey}.label`, { ns: 'resource' });
    const includedActions = t('table.meta.includedActions', {
      actions: formatActionList(actions, getActionLabel),
    });
    return (
      <span className={styles.detailMetaValueStack}>
        <span>{presetLabel}</span>
        <span className={styles.detailMetaSecondary}>{includedActions}</span>
      </span>
    );
  };
  const items: DetailMetaItem[] = [
    {
      key: 'lastEditedAt',
      label: t('table.meta.lastEditedAt'),
      icon: <Clock3 size={18} aria-hidden="true" />,
      value: detailLoading ? (
        <span className={styles.detailMetaLoading}>{t('status.loading', { ns: 'common' })}</span>
      ) : (
        noteMeta?.lastEditedAtText || htmlPageInfo?.versionInfo?.lastEditedAtText || EMPTY_META
      ),
    },
    {
      key: 'size',
      label: t('table.columns.size'),
      icon: <HardDrive size={18} aria-hidden="true" />,
      value:
        detailResourceInfo?.size != null
          ? formatFileSize(detailResourceInfo.size)
          : (selectedRow.sizeLabel ?? EMPTY_META),
    },
    {
      key: 'type',
      label: t('table.columns.type'),
      icon: <FileType2 size={18} aria-hidden="true" />,
      value: selectedRow.typeLabel || detailResourceInfo?.resourceType || EMPTY_META,
    },
    {
      key: 'version',
      label: t('table.meta.version'),
      icon: <GitBranch size={18} aria-hidden="true" />,
      value: detailLoading ? (
        <span className={styles.detailMetaLoading}>{t('status.loading', { ns: 'common' })}</span>
      ) : (
        formatVersion(
          noteMeta?.version ?? documentMeta?.docMetaInfo.version ?? htmlPageInfo?.currentVersion
        )
      ),
    },
    {
      key: 'owner',
      label: t('table.meta.owner'),
      icon: <UserRound size={18} aria-hidden="true" />,
      value: getUserDisplayName(detailResourceInfo?.ownerInfo, detailResourceInfo?.ownerId),
    },
  ];

  if (shouldShowPermissionMeta && actionTarget?.type === 'folder') {
    items.push(
      {
        key: 'resourceDefaultPermission',
        label: t('table.meta.resourceDefaultPermission'),
        icon: <ShieldCheck size={18} aria-hidden="true" />,
        value: formatResourceDefaultPermission(actionTarget.grantedActions),
      },
      {
        key: 'mountPermission',
        label: t('table.meta.mountPermission'),
        icon: <ShieldCheck size={18} aria-hidden="true" />,
        value: formatAccessScope(actionTarget.tagMountPermissionScope),
      }
    );
  } else if (shouldShowPermissionMeta && detailResourceInfo?.currentActions) {
    items.push({
      key: 'currentPermission',
      label: t('table.meta.currentPermission'),
      icon: <ShieldCheck size={18} aria-hidden="true" />,
      value: formatResourceDefaultPermission(detailResourceInfo.currentActions),
    });
  }

  return items;
}
