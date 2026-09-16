import { Clock3, FileType2, GitBranch, HardDrive, ShieldCheck, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import EntryIcon from '@/components/base/Icons/EntryIcon';
import { useDocumentService, useNoteService } from '@/domains';
import { RESOURCE_ACTION, type ResourceAction, type ResourceItem } from '@/domains/Resource';
import { ACCESS_CONTROL_SCOPE, type AccessControlScope } from '@/domains/Tag';
import type { UserDisplayBase } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { resolveResourceKind, RESOURCE_KIND } from '@/utils/navigation/resourceTarget';

import { isDriveActionTarget } from '../../../common/driveComponentModel';
import { resolveTagPermissionActionPresetKey } from '../../../common/tagPermissionPreset';
import type { DriveTableRow } from '../../index.type';
import styles from './style.module.less';

const EMPTY_META = '—';
const NOTE_RESOURCE_TYPES = new Set(['note', 'drawio']);

interface DriveDetailPanelProps {
  selectedRow?: DriveTableRow;
  isEditMode: boolean;
  selectedCount: number;
}

interface DetailMetaItem {
  key: string;
  label: string;
  value: ReactNode;
  icon: ReactNode;
}

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

function formatAccessScope(scope?: AccessControlScope): string {
  return scope == null ? EMPTY_META : ACCESS_CONTROL_SCOPE.getLabel(scope);
}

function DetailMetaLoading({ label }: { label: string }) {
  return <span className={styles.detailMetaLoading}>{label}</span>;
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
    resourceAccessRole: node.resourceAccessRole,
  };
}

function DriveDetailPanel({ selectedRow, isEditMode, selectedCount }: DriveDetailPanelProps) {
  const { t } = useTranslation(['drive', 'resource', 'common']);
  const noteService = useNoteService();
  const documentService = useDocumentService();

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

  if (isEditMode) {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('table.editMode')}</span>
        </div>
        <div className={styles.detailBody}>
          <p className={styles.detailHint}>{t('table.editModeHint', { count: selectedCount })}</p>
        </div>
      </div>
    );
  }

  if (!selectedRow || selectedRow.node.type === 'loading') {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('table.details')}</span>
        </div>
        <div className={styles.detailEmpty}>{t('table.detailsEmpty')}</div>
      </div>
    );
  }

  const fallbackResourceInfo = selectedRow ? resolveResourceInfoFromNode(selectedRow) : undefined;
  const detailResourceInfo =
    noteMeta?.resourceInfo ?? documentMeta?.resourceInfo ?? fallbackResourceInfo;
  const detailLoading = loadingNoteMeta || loadingDocumentMeta;
  const actionTarget = isDriveActionTarget(selectedRow.node) ? selectedRow.node : null;
  const shouldShowPermissionMeta = selectedRow.node.scope.type === 'group';
  const getActionLabel = (action: ResourceAction) => {
    const key = RESOURCE_ACTION.getKey(action);
    return key ? t(`permission.actions.${key}`, { ns: 'resource' }) : String(action);
  };
  const formatResourceDefaultPermission = (
    _scope?: AccessControlScope,
    actions?: ResourceAction[] | null
  ): ReactNode => {
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
  const detailMetaItems: DetailMetaItem[] = (() => {
    const items: DetailMetaItem[] = [
      {
        key: 'lastEditedAt',
        label: t('table.meta.lastEditedAt'),
        icon: <Clock3 size={18} aria-hidden="true" />,
        value: detailLoading ? (
          <DetailMetaLoading label={t('status.loading', { ns: 'common' })} />
        ) : (
          noteMeta?.lastEditedAtText || EMPTY_META
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
          <DetailMetaLoading label={t('status.loading', { ns: 'common' })} />
        ) : (
          formatVersion(noteMeta?.version ?? documentMeta?.docMetaInfo.version)
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
          value: formatResourceDefaultPermission(
            actionTarget.taggedResourceAclGrantScope,
            actionTarget.grantedActions
          ),
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
        value: formatResourceDefaultPermission(undefined, detailResourceInfo.currentActions),
      });
    }

    return items;
  })();

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon} aria-hidden="true">
          <EntryIcon
            entryType={selectedRow.entryType}
            resourceType={selectedRow.resourceType}
            resourceIconType={selectedRow.resourceIconType}
          />
        </span>
        <div className={styles.detailTitleBlock}>
          <span className={styles.detailTitle}>{selectedRow.name}</span>
          <span className={styles.detailType}>{selectedRow.typeLabel}</span>
        </div>
      </div>
      <div className={styles.detailBody}>
        <section className={styles.detailMetaSection} aria-labelledby="drive-detail-meta-title">
          <h2 id="drive-detail-meta-title">{t('table.details')}</h2>
          <dl className={styles.detailMetaList}>
            {detailMetaItems.map((item) => (
              <div key={item.key} className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>{item.icon}</span>
                <div className={styles.detailMetaText}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

export default DriveDetailPanel;
