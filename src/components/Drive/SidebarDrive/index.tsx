import { Empty, Spin } from '@/components/Common/Feedback';
import type { DataNode } from '@/components/Common/Tree';
import Tree from '@/components/Common/Tree';
import { useDriveService } from '@/domains';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { useNavigateResource } from '@/hooks/useNavigateResource';
import { useActiveDriveScopeStore } from '@/store';
import { useRequest } from 'ahooks';
import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';

import { DEFAULT_DRIVE_ROOT_ID } from '../common/driveComponentModel';
import { useDriveTreeChildren } from '../common/useDriveTreeChildren';
import { buildDriveTreeData, replaceTreeNodeChildren } from '../DriveNav/buildTreeData';
import styles from './style.module.less';

const RENDERABLE_TYPES = new Set<'folder' | 'resource' | 'link' | 'trash'>([
  'folder',
  'resource',
  'link',
]);
const SELECTABLE_TYPES = new Set<'folder' | 'resource' | 'link'>(['resource', 'link']);
const EMPTY_DISABLED_IDS = new Set<string>();

function SidebarDrive() {
  const driveService = useDriveService();
  const groupId = useActiveDriveScopeStore((state) => state.groupId);
  const navigateResource = useNavigateResource(groupId);

  const { loadChildren, loadMore, reset } = useDriveTreeChildren({ groupId });
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  function buildChildrenData(nodes: DriveNode[]): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_DISABLED_IDS,
        onLoadMoreClick: (next) => void handleLoadMore(next),
      },
      nodeMapRef.current
    );
  }

  async function handleLoadMore(node: LoadMoreNode): Promise<void> {
    const children = await loadMore(node);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceTreeNodeChildren(prev, node.parentId, childData));
  }

  const { loading: treeLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      reset();
      setSelectedKeys([]);
      const rootNode = await driveService.getDriveTree({
        rootId: DEFAULT_DRIVE_ROOT_ID,
        groupId,
      });
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      if (rootNode.type !== 'folder') return [baseRoot];
      const children = await loadChildren(rootNode.id);
      const childData = buildChildrenData(children);
      return [{ ...baseRoot, children: childData }];
    },
    {
      refreshDeps: [groupId],
      onSuccess: (data) => setTreeData(data),
    }
  );

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'folder' && node.type !== 'trash')) return;
    const children = await loadChildren(node.id);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceTreeNodeChildren(prev, node.id, childData));
  };

  const handleSelect = (_keys: React.Key[], info: { node: DataNode }): void => {
    const key = String(info.node.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'resource' && node.type !== 'link')) return;
    setSelectedKeys([key]);
    if (!node.resourceId) return;
    navigateResource(node.resourceId, node.resourceType);
  };

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;

  return (
    <div className={styles.sidebar}>
      {showSpin ? (
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      ) : showEmpty ? (
        <div className={styles.stateBlock}>
          <Empty description="暂无内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          selectable
          expandAction="click"
          selectedKeys={selectedKeys}
          onSelect={handleSelect}
          loadData={handleLoadData}
          defaultExpandedKeys={[DEFAULT_DRIVE_ROOT_ID]}
          switcherIcon={
            <span>
              <ChevronDown size={14} />
            </span>
          }
        />
      )}
    </div>
  );
}

export default SidebarDrive;
