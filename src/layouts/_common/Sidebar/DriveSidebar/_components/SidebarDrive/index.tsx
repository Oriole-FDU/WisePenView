import {
  buildDriveTreeData,
  replaceDriveTreeNodeChildren,
} from '@/components/Drive/common/buildDriveTreeData';
import {
  getDriveNodeLabel,
  getDriveScopeGroupId,
  mountResourceToFolderTag,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import {
  DeleteNodeModal,
  NewFolderNodeModal,
  RenameNodeModal,
  UploadDocumentModal,
} from '@/components/Drive/Modals';
import { Empty, Spin } from '@/components/Feedback';
import { FormField, Input } from '@/components/Input';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/Note/useMarkdownNoteImport';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import CreateSkillModal from '@/components/Skill/CreateSkillModal';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDocumentService, useDriveService, useNoteService, useResourceService } from '@/domains';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useSidebarDriveExpansionStore } from '@/layouts/_common/Sidebar/DriveSidebar/_store/useSidebarDriveExpansionStore';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useRef, useState } from 'react';

import type { SidebarDriveCreateAction } from './SidebarDriveNodeTitle';
import SidebarDriveNodeTitle from './SidebarDriveNodeTitle';
import SidebarDriveScopeSwitcher from './SidebarDriveScopeSwitcher';
import styles from './style.module.less';

const RENDERABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>([
  'root',
  'folder',
  'resource',
  'link',
]);
const SELECTABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>(['resource', 'link']);
const EMPTY_DISABLED_IDS = new Set<string>();

interface SidebarTreeLoadResult {
  treeData: DataNode[];
  nodeMap: Map<string, DriveNode>;
  expandedKeys: React.Key[];
  selectedKeys: React.Key[];
}

const isResourceNode = (
  node: DriveNode | undefined
): node is Extract<DriveNode, { type: 'resource' | 'link' }> =>
  node?.type === 'resource' || node?.type === 'link';

function SidebarDrive() {
  const driveService = useDriveService();
  const documentService = useDocumentService();
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const navigationLocation = useWorkspaceNavigationStore((state) => state.location);
  const scope = navigationLocation.scope;
  const expansionScopeKey = scope.rootId;
  const groupId = getDriveScopeGroupId(scope);
  const resourceLocation = navigationLocation.resource;
  const openInWorkspace = useOpenInWorkspace();
  const [nodeMap, setNodeMap] = useState<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [createFolderParent, setCreateFolderParent] = useState<RootNode | FolderNode | null>(null);
  const [noteTarget, setNoteTarget] = useState<RootNode | FolderNode | null>(null);
  const [uploadTarget, setUploadTarget] = useState<RootNode | FolderNode | null>(null);
  const [drawioTarget, setDrawioTarget] = useState<RootNode | FolderNode | null>(null);
  const [drawioName, setDrawioName] = useState('未命名图表');
  const [drawioNameError, setDrawioNameError] = useState('');
  const [skillTarget, setSkillTarget] = useState<RootNode | FolderNode | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const importTargetRef = useRef<RootNode | FolderNode | null>(null);

  const existingFolderNames = useMemo(() => {
    if (!createFolderParent) return [];
    return [...nodeMap.values()]
      .filter((node): node is FolderNode => node.type === 'folder')
      .filter((node) => node.parentId === createFolderParent.id)
      .map((node) => node.name);
  }, [createFolderParent, nodeMap]);

  const resolveContainerMountTagId = (node: RootNode | FolderNode): string | undefined => {
    if (node.type === 'folder') return node.tagId;
    return node.canMountResources ? node.tagId : undefined;
  };

  const mountCreatedResource = async (
    resourceId: string,
    target: RootNode | FolderNode
  ): Promise<void> => {
    const targetTagId = resolveContainerMountTagId(target);
    if (!targetTagId) return;

    const targetGroupId = getDriveScopeGroupId(target.scope);
    if (targetGroupId) {
      const sharedTagId = await driveService.ensureSharedFolder();
      await mountResourceToFolderTag({
        resourceId,
        targetTagId: sharedTagId,
        documentService,
        resourceService,
      });
      await resourceService.mountResourcesToGroupTag({
        resourceIds: [resourceId],
        groupId: targetGroupId,
        tagId: targetTagId,
      });
      return;
    }

    await mountResourceToFolderTag({
      resourceId,
      targetTagId,
      documentService,
      resourceService,
    });
  };

  const {
    fileInputRef: markdownFileInputRef,
    importing: importingMarkdownNote,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    mountCreatedResource: async (resourceId) => {
      const target = importTargetRef.current;
      if (!target) {
        throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
      }
      await mountCreatedResource(resourceId, target);
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
        setCreateFolderParent(node);
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
        setDrawioTarget(node);
        setDrawioName('未命名图表');
        setDrawioNameError('');
        break;
      case 'skill':
        setSkillTarget(node);
        break;
      case 'upload':
        setUploadTarget(node);
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
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_DISABLED_IDS,
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

  const { loading: treeLoading, refresh: refreshTree } = useRequest(
    async (): Promise<SidebarTreeLoadResult> => {
      const nodeMap = new Map<string, DriveNode>();
      const cachedExpandedNodeIds =
        useSidebarDriveExpansionStore.getState().expandedNodeIdsByScope[expansionScopeKey] ?? [];
      const expandedNodeIds = new Set(cachedExpandedNodeIds);
      const rootNode = await driveService.getRootNode({
        rootId: scope.rootId,
        groupId,
      });
      const rootChildren = await driveService.listNodeChildren({
        nodeId: rootNode.id,
        groupId,
      });
      const baseRoot = buildChildrenData([rootNode], nodeMap)[0];
      if (!baseRoot) {
        return { treeData: [], nodeMap, expandedKeys: [], selectedKeys: [] };
      }
      const fixedRoot = { ...baseRoot, children: undefined, isLeaf: true };
      const childrenByParent = new Map<string, DriveNode[]>([[rootNode.id, rootChildren]]);
      let selectedNodeId: string | undefined;

      if (resourceLocation) {
        try {
          const pathNodes = await driveService.getNodePath({
            nodeId: resourceLocation.parentNodeId,
            groupId,
          });
          const parentPathNode = pathNodes[pathNodes.length - 1];
          if (parentPathNode?.id === resourceLocation.parentNodeId) {
            pathNodes.forEach((node) => {
              if (node.type === 'folder') expandedNodeIds.add(node.id);
            });
          }
        } catch {
          // 路径失效时仍按缓存恢复可用的展开分支。
        }
      }

      const loadExpandedChildren = async (nodes: DriveNode[]): Promise<void> => {
        await Promise.all(
          nodes.map(async (node) => {
            if (node.type !== 'folder' || !expandedNodeIds.has(node.id)) return;
            try {
              const children = await driveService.listNodeChildren({
                nodeId: node.id,
                groupId,
              });
              childrenByParent.set(node.id, children);
              await loadExpandedChildren(children);
            } catch {
              expandedNodeIds.delete(node.id);
            }
          })
        );
      };

      await loadExpandedChildren(rootChildren);

      const buildExpandedTree = (nodes: DriveNode[]): DataNode[] =>
        buildChildrenData(nodes, nodeMap).map((treeNode) => {
          const children = childrenByParent.get(String(treeNode.key));
          return children ? { ...treeNode, children: buildExpandedTree(children) } : treeNode;
        });

      if (resourceLocation) {
        const parentChildren = childrenByParent.get(resourceLocation.parentNodeId) ?? [];
        const locatedNode = resourceLocation.nodeId
          ? parentChildren.find((node) => node.id === resourceLocation.nodeId)
          : parentChildren.find(
              (node) => isResourceNode(node) && node.resourceId === resourceLocation.resourceId
            );
        const selectedNode =
          isResourceNode(locatedNode) && locatedNode.resourceId === resourceLocation.resourceId
            ? locatedNode
            : undefined;
        selectedNodeId = selectedNode?.id;
      }

      const treeData = [fixedRoot, ...buildExpandedTree(rootChildren)];
      const availableExpandedNodeIds = [...expandedNodeIds].filter(
        (nodeId) => nodeMap.get(nodeId)?.type === 'folder'
      );

      return {
        treeData,
        nodeMap,
        expandedKeys: availableExpandedNodeIds,
        selectedKeys: selectedNodeId ? [selectedNodeId] : [],
      };
    },
    {
      refreshDeps: [
        expansionScopeKey,
        scope.rootId,
        groupId,
        resourceLocation?.resourceId,
        resourceLocation?.parentNodeId,
        resourceLocation?.nodeId,
      ],
      onBefore: () => {
        setSelectedKeys([]);
        setExpandedKeys([]);
      },
      onSuccess: (result) => {
        setNodeMap(result.nodeMap);
        setTreeData(result.treeData);
        setExpandedKeys(result.expandedKeys);
        setSelectedKeys(result.selectedKeys);
        useSidebarDriveExpansionStore
          .getState()
          .setExpandedNodeIds(expansionScopeKey, result.expandedKeys.map(String));
      },
      onError: (err) => {
        setNodeMap(new Map());
        setTreeData([]);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  useRequest(
    async () => {
      if (!noteTarget) {
        throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
      }
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId, noteTarget);
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

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async (target: RootNode | FolderNode, title: string) => {
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId, target);
      return {
        resourceId,
        target,
      };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, target }) => {
        setDrawioTarget(null);
        setDrawioNameError('');
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.DRAWIO,
          driveLocation: { scope: target.scope, parentNodeId: target.id },
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSkillSuccess = (resourceId: string): void => {
    const target = skillTarget;
    if (!target) return;

    void (async () => {
      try {
        await mountCreatedResource(resourceId, target);
        setSkillTarget(null);
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.SKILL,
          driveLocation: { scope: target.scope, parentNodeId: target.id },
        });
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
  };

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMap.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    try {
      const children = await driveService.listNodeChildren({
        nodeId: node.id,
        groupId: getDriveScopeGroupId(node.scope),
      });
      const childNodeMap = new Map<string, DriveNode>();
      const childData = buildChildrenData(children, childNodeMap);
      setNodeMap((currentNodeMap) => {
        const nextNodeMap = new Map(currentNodeMap);
        childNodeMap.forEach((childNode, childNodeId) => {
          nextNodeMap.set(childNodeId, childNode);
        });
        return nextNodeMap;
      });
      setTreeData((prev) => replaceDriveTreeNodeChildren(prev, node.id, childData));
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const handleSelect = (_keys: React.Key[], info: { node: DataNode }): void => {
    const key = String(info.node.key);
    const node = nodeMap.get(key);
    if (!node || (node.type !== 'resource' && node.type !== 'link')) return;
    setSelectedKeys([key]);
    if (!node.resourceId) return;
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
  };

  const handleExpand = (nextKeys: React.Key[]): void => {
    setExpandedKeys(nextKeys);
    useSidebarDriveExpansionStore
      .getState()
      .setExpandedNodeIds(expansionScopeKey, nextKeys.map(String));
  };

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;

  return (
    <div className={styles.sidebar}>
      <input
        ref={markdownFileInputRef}
        type="file"
        accept={MARKDOWN_NOTE_FILE_ACCEPT}
        onChange={handleMarkdownFileChange}
        hidden
      />
      <div className={styles.sectionTitle}>云盘</div>
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
          expandedKeys={expandedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          loadData={handleLoadData}
        />
      )}
      {createFolderParent ? (
        <NewFolderNodeModal
          isOpen={Boolean(createFolderParent)}
          parentId={createFolderParent.id}
          groupId={groupId}
          parentLabel={getDriveNodeLabel(createFolderParent)}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setCreateFolderParent(null);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      {uploadTarget ? (
        <UploadDocumentModal
          isOpen={Boolean(uploadTarget)}
          targetTagId={resolveContainerMountTagId(uploadTarget)}
          groupId={getDriveScopeGroupId(uploadTarget.scope)}
          onOpenChange={(open) => {
            if (!open) setUploadTarget(null);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      <AppFormDialog
        isOpen={Boolean(drawioTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawioTarget(null);
            setDrawioNameError('');
          }
        }}
        title="新建图表"
        confirmText="创建"
        onSubmit={() => {
          const title = drawioName.trim();
          if (!drawioTarget || !title) {
            setDrawioNameError('请输入图表名称');
            return;
          }
          runCreateDrawio(drawioTarget, title);
        }}
        isSubmitting={creatingDrawio}
        isSubmitDisabled={creatingDrawio}
        isDismissable={!creatingDrawio}
      >
        <FormField
          aria-label="图表名称"
          label="图表名称"
          name="sidebarDrawioName"
          value={drawioName}
          onChange={(value) => {
            setDrawioName(value);
            setDrawioNameError('');
          }}
          errorMessage={drawioNameError}
          isRequired
        >
          <Input placeholder="请输入名称" autoFocus />
        </FormField>
      </AppFormDialog>
      <CreateSkillModal
        isOpen={Boolean(skillTarget)}
        onOpenChange={(open) => {
          if (!open) setSkillTarget(null);
        }}
        onSuccess={handleCreateSkillSuccess}
      />
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        groupId={groupId}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshTree}
      />
      <DeleteNodeModal
        isOpen={Boolean(deleteTarget)}
        node={deleteTarget}
        groupId={groupId}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={refreshTree}
      />
    </div>
  );
}

export default SidebarDrive;
