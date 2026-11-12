import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Empty, Spin } from '@/components/base/Feedback';
import type { DataNode } from '@/components/base/Tree';
import Tree from '@/components/base/Tree';
import { buildDriveTreeData } from '@/components/business/Drive/common/buildDriveTreeData';
import {
  type DriveActionTarget,
  type DriveViewNode,
  getDriveNodeLabel,
  getDriveScopeGroupId,
} from '@/components/business/Drive/common/driveComponentModel';
import {
  DriveCreateModal,
  DriveDeleteModal,
  RenameNodeModal,
  TrashDeleteModal,
  UploadDocumentModal,
} from '@/components/business/Drive/Modals';
import { useGroupService } from '@/domains';
import type { FolderNode, RootNode } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';

import { useSidebarDriveScopeStore } from './_store/useSidebarDriveScopeStore';
import {
  getSidebarExistingFolderNames,
  isSidebarNodeInTrash,
  SIDEBAR_DISABLED_NODE_IDS,
  SIDEBAR_RENDERABLE_TYPES,
  SIDEBAR_SELECTABLE_TYPES,
} from './sidebarDriveModel';
import type { SidebarDriveCreateAction } from './SidebarDriveNodeTitle';
import SidebarDriveNodeTitle from './SidebarDriveNodeTitle';
import SidebarDriveScopeSwitcher from './SidebarDriveScopeSwitcher';
import styles from './style.module.scss';
import { useSidebarDriveTreeController } from './useSidebarDriveTreeController';

function DriveTab() {
  const { t } = useTranslation('drive');
  const groupService = useGroupService();
  const scope = useSidebarDriveScopeStore((state) => state.scope);
  const groupId = getDriveScopeGroupId(scope);
  const openResource = useOpenResource();
  const [uploadDocumentPathTagId, setUploadDocumentPathTagId] = useState<string>();
  const [folderCreateTarget, setFolderCreateTarget] = useState<RootNode | FolderNode | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const { data: groupBaseInfo } = useApi(
    async () => {
      if (!groupId) return undefined;
      return groupService.fetchGroupBaseInfo(groupId);
    },
    {
      ready: Boolean(groupId),
      refreshDeps: [groupId, groupService],
    }
  );
  const rootDisplayName = groupId
    ? groupBaseInfo && groupBaseInfo.groupId === groupId
      ? groupBaseInfo.groupName || undefined
      : undefined
    : t('navigator.personalDrive');

  const resolveContainerMountTagId = (node: RootNode | FolderNode): string | undefined => {
    if (node.type === 'folder') return node.tagId;
    return node.canMountResources ? node.tagId : undefined;
  };

  const handleCreateNode = (
    node: RootNode | FolderNode,
    action: SidebarDriveCreateAction
  ): void => {
    switch (action) {
      case 'folder':
        setFolderCreateTarget(node);
        break;
      case 'upload':
        {
          const pathTagId = resolveContainerMountTagId(node);
          if (pathTagId) setUploadDocumentPathTagId(pathTagId);
        }
        break;
    }
  };

  function buildChildrenData(
    nodes: DriveViewNode[],
    targetNodeMap: Map<string, DriveViewNode>,
    controls: {
      handleCollapseAll: () => void;
      handleLoadMore: (parentNodeId: string) => void;
    }
  ): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: SIDEBAR_RENDERABLE_TYPES,
        selectableTypes: SIDEBAR_SELECTABLE_TYPES,
        disabledNodeIds: SIDEBAR_DISABLED_NODE_IDS,
        // 侧边栏的目录只用于浏览和展开，不参与选中；关闭置灰可避免目录被标记为 disabled 后无法展开。
        dimUnselectableNodes: false,
        interactiveLoadingNodes: true,
        getTreeKey: (node) => node.id,
        renderTitle: (node) => (
          <SidebarDriveNodeTitle
            node={node}
            rootDisplayName={node.type === 'root' ? rootDisplayName : undefined}
            scopeSwitcher={node.type === 'root' ? <SidebarDriveScopeSwitcher /> : undefined}
            onCreateNode={handleCreateNode}
            onCollapseAll={node.type === 'root' ? controls.handleCollapseAll : undefined}
            onLoadMoreNode={
              node.type === 'loading' ? () => controls.handleLoadMore(node.parentId) : undefined
            }
            onRenameNode={setRenameTarget}
            onDeleteNode={setDeleteTarget}
          />
        ),
      },
      targetNodeMap
    );
  }
  const {
    expandedKeys,
    handleExpand,
    handleLoadData,
    handleSelect,
    nodeMap,
    refreshTree,
    selectedKeys,
    treeData,
    treeLoading,
  } = useSidebarDriveTreeController({
    scope,
    rootDisplayName,
    buildTreeData: buildChildrenData,
    onOpenResource: (node) => {
      openResource({
        resourceId: node.resourceId,
        resourceType: node.resourceType,
        resourceName: node.title,
        driveLocation: {
          scope: node.scope,
          mountTagId: node.mountTagId,
        },
      });
    },
  });

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;
  const existingFolderNames =
    folderCreateTarget !== null
      ? getSidebarExistingFolderNames(nodeMap, folderCreateTarget.id)
      : [];
  const isDeleteTargetInTrash = isSidebarNodeInTrash(deleteTarget, nodeMap);

  return (
    <div className={styles.sidebar}>
      {showSpin ? (
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      ) : showEmpty ? (
        <div className={styles.stateBlock}>
          <Empty description={t('navigator.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          selectable
          expandAction="click"
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          loadData={handleLoadData}
        />
      )}
      {uploadDocumentPathTagId ? (
        <UploadDocumentModal
          isOpen
          pathTagId={uploadDocumentPathTagId}
          onOpenChange={(open) => {
            if (!open) setUploadDocumentPathTagId(undefined);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      {folderCreateTarget ? (
        <DriveCreateModal
          type="folder"
          isOpen
          parent={folderCreateTarget}
          pathTagId={resolveContainerMountTagId(folderCreateTarget)}
          parentLabel={getDriveNodeLabel(folderCreateTarget)}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setFolderCreateTarget(null);
          }}
          onSuccess={() => {
            setFolderCreateTarget(null);
            refreshTree();
          }}
        />
      ) : null}
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshTree}
      />
      {isDeleteTargetInTrash ? (
        <TrashDeleteModal
          isOpen={Boolean(deleteTarget)}
          nodes={deleteTarget ? [deleteTarget] : []}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={refreshTree}
        />
      ) : (
        <DriveDeleteModal
          isOpen={Boolean(deleteTarget)}
          node={deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={refreshTree}
        />
      )}
    </div>
  );
}

export default DriveTab;
