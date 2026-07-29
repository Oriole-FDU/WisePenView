import { buildDriveTreeData } from '@/components/Drive/common/buildDriveTreeData';
import {
  getDriveNodeLabel,
  getDriveScopeGroupId,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import {
  DriveCreateModal,
  DriveDeleteModal,
  RenameNodeModal,
  TrashDeleteModal,
  UploadDocumentModal,
  type DriveCreateType,
} from '@/components/Drive/Modals';
import { Empty, Spin } from '@/components/Feedback';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/Note/useMarkdownNoteImport';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useNoteService } from '@/domains';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import {
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

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
import styles from './style.module.less';
import { useSidebarDriveTreeController } from './useSidebarDriveTreeController';

interface SidebarDriveCreateTarget {
  type: DriveCreateType;
  target: RootNode | FolderNode;
}

function SidebarDrive() {
  const { t } = useTranslation('drive');
  const location = useLocation();
  const noteService = useNoteService();
  const navigationLocation = useWorkspaceNavigationStore((state) => state.location);
  const scope = navigationLocation.scope;
  const groupId = getDriveScopeGroupId(scope);
  const openInWorkspace = useOpenInWorkspace();
  const [noteTarget, setNoteTarget] = useState<RootNode | FolderNode | null>(null);
  const [uploadDocumentPathTagId, setUploadDocumentPathTagId] = useState<string>();
  const [driveCreateTarget, setDriveCreateTarget] = useState<SidebarDriveCreateTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const importTargetRef = useRef<RootNode | FolderNode | null>(null);
  const activeNavKey = resolveAppHeaderNavKey(location.pathname);

  const resolveContainerMountTagId = (node: RootNode | FolderNode): string | undefined => {
    if (node.type === 'folder') return node.tagId;
    return node.canMountResources ? node.tagId : undefined;
  };

  const {
    fileInputRef: markdownFileInputRef,
    importing: importingMarkdownNote,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    getPathTagId: () => {
      const target = importTargetRef.current;
      if (!target) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: 'Markdown 导入目标不存在',
        });
      }
      return resolveContainerMountTagId(target);
    },
    onSuccess: ({ resourceId, title }) => {
      const target = importTargetRef.current;
      importTargetRef.current = null;
      if (!target) return;
      openInWorkspace({
        resourceId,
        resourceType: RESOURCE_KIND.NOTE,
        resourceName: title,
        driveLocation: { scope: target.scope, parentNodeId: target.id },
      });
    },
    onError: () => {
      importTargetRef.current = null;
    },
  });

  const handleCreateNode = (
    node: RootNode | FolderNode,
    action: SidebarDriveCreateAction
  ): void => {
    switch (action) {
      case 'folder':
        setDriveCreateTarget({ type: 'folder', target: node });
        break;
      case 'note':
        setNoteTarget(node);
        break;
      case 'importNote':
        if (importingMarkdownNote) return;
        importTargetRef.current = node;
        openMarkdownFilePicker();
        break;
      case 'drawio':
        setDriveCreateTarget({ type: 'drawio', target: node });
        break;
      case 'skill':
        setDriveCreateTarget({ type: 'skill', target: node });
        break;
      case 'agent':
        setDriveCreateTarget({ type: 'agent', target: node });
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
    nodes: DriveNode[],
    targetNodeMap: Map<string, DriveNode>
  ): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: SIDEBAR_RENDERABLE_TYPES,
        selectableTypes: SIDEBAR_SELECTABLE_TYPES,
        disabledNodeIds: SIDEBAR_DISABLED_NODE_IDS,
        getTreeKey: (node) => node.id,
        renderTitle: (node) => (
          <SidebarDriveNodeTitle
            node={node}
            scopeSwitcher={node.type === 'root' ? <SidebarDriveScopeSwitcher /> : undefined}
            onCreateNode={handleCreateNode}
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
    buildTreeData: buildChildrenData,
    onOpenResource: (node) => {
      openInWorkspace({
        resourceId: node.resourceId,
        resourceType: node.resourceType,
        resourceName: node.title,
        driveLocation: {
          scope: node.scope,
          nodeId: node.id,
          parentNodeId: node.parentId,
        },
      });
    },
  });

  useRequest(
    async () => {
      if (!noteTarget) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '笔记创建目标不存在',
        });
      }
      const { resourceId } = await noteService.createNote({
        title: t('create.defaultNoteTitle'),
        pathTagId: resolveContainerMountTagId(noteTarget),
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return {
        resourceId,
        target: noteTarget,
      };
    },
    {
      ready: Boolean(noteTarget),
      refreshDeps: [noteTarget],
      onSuccess: ({ resourceId, target }) => {
        setNoteTarget(null);
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          driveLocation: { scope: target.scope, parentNodeId: target.id },
        });
      },
      onError: (err) => {
        setNoteTarget(null);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;
  const existingFolderNames =
    driveCreateTarget?.type === 'folder'
      ? getSidebarExistingFolderNames(nodeMap, driveCreateTarget.target.id)
      : [];
  const isDeleteTargetInTrash = isSidebarNodeInTrash(deleteTarget, nodeMap);

  return (
    <div className={styles.sidebar}>
      <input
        ref={markdownFileInputRef}
        type="file"
        accept={MARKDOWN_NOTE_FILE_ACCEPT}
        onChange={handleMarkdownFileChange}
        hidden
      />
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
          selectedKeys={activeNavKey === APP_HEADER_NAV_KEY.DRIVE ? selectedKeys : []}
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
      {driveCreateTarget ? (
        <DriveCreateModal
          type={driveCreateTarget.type}
          isOpen
          parentId={driveCreateTarget.target.id}
          groupId={getDriveScopeGroupId(driveCreateTarget.target.scope)}
          pathTagId={resolveContainerMountTagId(driveCreateTarget.target)}
          parentLabel={getDriveNodeLabel(driveCreateTarget.target)}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setDriveCreateTarget(null);
          }}
          onSuccess={(createdId, type) => {
            const target = driveCreateTarget.target;
            if (type === 'folder') {
              setDriveCreateTarget(null);
              refreshTree();
              return;
            }
            setDriveCreateTarget(null);
            openInWorkspace({
              resourceId: createdId,
              resourceType: type,
              driveLocation: { scope: target.scope, parentNodeId: target.id },
            });
          }}
        />
      ) : null}
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        groupId={groupId}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshTree}
      />
      {isDeleteTargetInTrash ? (
        <TrashDeleteModal
          isOpen={Boolean(deleteTarget)}
          node={deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={refreshTree}
        />
      ) : (
        <DriveDeleteModal
          isOpen={Boolean(deleteTarget)}
          node={deleteTarget}
          groupId={groupId}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={refreshTree}
        />
      )}
    </div>
  );
}

export default SidebarDrive;
