import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import { ROOT_DISPLAY } from '@/components/Drive/common/constants';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import styles from './style.module.less';

interface DriveTreeNodeTitleProps {
  node: Exclude<DriveNode, LoadMoreNode>;
}

function getNodeDisplayName(node: DriveTreeNodeTitleProps['node'], resourceName: string): string {
  if (node.type === 'folder') {
    if (!node.parentId) return ROOT_DISPLAY;
    return node.name || ROOT_DISPLAY;
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return '回收站';
}

function DriveTreeNodeTitle({ node }: DriveTreeNodeTitleProps) {
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, '未命名文件');
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;

  return (
    <IconText
      className={styles.nodeTitle}
      icon={<EntryIcon entryType={node.type} resourceType={resourceType} size={14} />}
      iconSize={14}
      gap="4px"
      ellipsis
    >
      {getNodeDisplayName(node, resourceName)}
    </IconText>
  );
}

export default DriveTreeNodeTitle;
