import IconText from '@/components/Common/IconText';
import type { DriveNode } from '@/domains/Drive';
import type { BreadcrumbProps as AntBreadcrumbProps } from 'antd';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { House } from 'lucide-react';
import { useMemo } from 'react';
import styles from './Breadcrumb.style.module.less';

export interface BreadcrumbProps {
  /** 从根到当前节点的完整路径（含根，含当前） */
  pathNodes: DriveNode[];
  /** 点击某一段时跳转 */
  onJump: (node: DriveNode) => void;
}

function getNodeDisplayName(node: DriveNode): string {
  switch (node.type) {
    case 'folder':
      return node.name;
    case 'resource':
    case 'link':
      return node.title;
    case 'trash':
      return '回收站';
    case 'loadMore':
      return '加载更多';
  }
}

function Breadcrumb({ pathNodes, onJump }: BreadcrumbProps) {
  const items = useMemo((): AntBreadcrumbProps['items'] => {
    return pathNodes.map((node, index) => {
      const isLast = index === pathNodes.length - 1;
      const isRoot = index === 0;
      const label = getNodeDisplayName(node);

      const title = isRoot ? (
        <IconText icon={<House />} iconSize={14} gap={4}>
          {label}
        </IconText>
      ) : (
        label
      );

      if (isLast) {
        return {
          key: node.id,
          title: <span className={styles.current}>{title}</span>,
        };
      }

      return {
        key: node.id,
        title,
        onClick: () => onJump(node),
      };
    });
  }, [pathNodes, onJump]);

  if (!items?.length) return null;

  return <AntBreadcrumb className={styles.breadcrumb} items={items} />;
}

export default Breadcrumb;
