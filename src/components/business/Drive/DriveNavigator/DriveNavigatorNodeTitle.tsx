import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import EntryIcon from '@/components/business/Icons/EntryIcon';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';

import {
  type DriveViewNode,
  getDriveNodeLabel,
  resolveDriveFolderVariant,
} from '../common/driveComponentModel';
import styles from './style.module.scss';

interface DriveNavigatorNodeTitleProps {
  node: DriveViewNode;
  displayName?: string;
  onLoadMore?: () => void;
}

function getNodeDisplayName(
  node: DriveNavigatorNodeTitleProps['node'],
  resourceName: string,
  t: TFunction<'drive'>,
  displayName?: string
): string {
  if (displayName) return displayName;
  if (node.type === 'root') return node.name || t('node.drive');
  if (node.type === 'folder') {
    if (node.systemType) return getDriveNodeLabel(node);
    if (!node.parentId) return t('node.drive');
    return node.name || t('node.unnamedFolder');
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || t('node.loading');
}

function DriveNavigatorNodeTitle({ node, displayName, onLoadMore }: DriveNavigatorNodeTitleProps) {
  const { t } = useTranslation('drive');
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, t('node.unnamedFile'));
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const label = getNodeDisplayName(node, resourceName, t, displayName);

  if (node.type === 'loading') {
    return (
      <button
        type="button"
        className={styles.loadMoreNode}
        onClick={(event) => {
          event.stopPropagation();
          onLoadMore?.();
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={styles.nodeTitle}>
      <span className={styles.nodeIcon} aria-hidden="true">
        <EntryIcon
          entryType={node.type}
          folderVariant={resolveDriveFolderVariant(node)}
          resourceType={resourceType}
          resourceIconType={resourceIconType}
          size={14}
        />
      </span>
      <span className={styles.nodeLabel}>{label}</span>
    </span>
  );
}

export default DriveNavigatorNodeTitle;
