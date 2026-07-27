import EntryIcon from '@/components/Icons/EntryIcon';
import type { DriveNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface DriveNavigatorNodeTitleProps {
  node: DriveNode;
  displayName?: string;
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
    if (node.systemType === 'shared') return t('node.shared');
    if (!node.parentId) return t('node.drive');
    return node.name || t('node.unnamedFolder');
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || t('node.loading');
}

function DriveNavigatorNodeTitle({ node, displayName }: DriveNavigatorNodeTitleProps) {
  const { t } = useTranslation('drive');
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, t('node.unnamedFile'));
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;

  return (
    <span className={styles.nodeTitle}>
      <span className={styles.nodeIcon} aria-hidden="true">
        <EntryIcon
          entryType={node.type}
          folderIconType={folderIconType}
          resourceType={resourceType}
          resourceIconType={resourceIconType}
          size={14}
        />
      </span>
      <span className={styles.nodeLabel}>
        {getNodeDisplayName(node, resourceName, t, displayName)}
      </span>
    </span>
  );
}

export default DriveNavigatorNodeTitle;
