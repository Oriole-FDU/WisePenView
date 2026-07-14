import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import { DeleteNodeModal, MoveNodeModal } from '@/components/Drive/Modals';
import {
  useDocumentService,
  useDriveService,
  useNoteService,
  useResourceService,
  useSkillService,
} from '@/domains';
import { buildDriveNodeScope, encodeNodeId } from '@/domains/Drive';
import { RESOURCE_ACTION, resourceActionsInclude, type ResourceAction } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { parseErrorMessage } from '@/utils/error';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ResourceTargetModal from './ResourceTargetModal';

export interface ResourceHeaderOperationHandlers {
  deleteLabel?: string;
  isLocating: boolean;
  onCopy?: () => void;
  onCreateLink?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onOpenOriginal?: () => void;
  onDelete?: () => void;
}

type TargetModal = 'copy' | 'link' | 'share' | null;

interface ResourceHeaderOperationsProps {
  resourceId: string;
  resourceName: string;
  resourceType?: string;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  onResolve: (handlers: ResourceHeaderOperationHandlers) => ReactNode;
}

const normalizeResourceType = (resourceType?: string): string =>
  resourceType?.trim().toLowerCase() ?? '';

function ResourceHeaderOperations({
  resourceId,
  resourceName,
  resourceType,
  currentActions,
  copyVersion,
  onResolve,
}: ResourceHeaderOperationsProps) {
  const driveService = useDriveService();
  const noteService = useNoteService();
  const documentService = useDocumentService();
  const skillService = useSkillService();
  const resourceService = useResourceService();
  const openInWorkspace = useOpenInWorkspace();
  const navigate = useNavigate();
  const location = useWorkspaceNavigationStore((state) => state.location);
  const matchingLocation =
    location.resource?.resourceId === resourceId ? location.resource : undefined;
  const scope = matchingLocation ? location.scope : buildDriveNodeScope();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const [targetModal, setTargetModal] = useState<TargetModal>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: node,
    loading: locating,
    refresh: refreshNode,
  } = useRequest(
    () =>
      driveService.getResourceNode({
        resourceId,
        parentNodeId: matchingLocation!.parentNodeId,
        nodeId: matchingLocation?.nodeId,
        groupId,
      }),
    {
      ready: Boolean(matchingLocation),
      refreshDeps: [resourceId, matchingLocation?.parentNodeId, matchingLocation?.nodeId, groupId],
    }
  );

  const copyName = `${resourceName}_副本`;
  const normalizedType = normalizeResourceType(resourceType);
  const canCopyType =
    normalizedType === RESOURCE_KIND.NOTE ||
    normalizedType === RESOURCE_KIND.DRAWIO ||
    normalizedType === RESOURCE_KIND.SKILL ||
    normalizedType === RESOURCE_KIND.FILE ||
    ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(normalizedType);
  const canCopy = canCopyType && resourceActionsInclude(currentActions, RESOURCE_ACTION.FORK);

  const forkResource = async (): Promise<string> => {
    if (normalizedType === RESOURCE_KIND.NOTE || normalizedType === RESOURCE_KIND.DRAWIO) {
      const result = await noteService.forkNote({
        resourceId,
        forkedResourceName: copyName,
        forkedResourceVersion: copyVersion,
      });
      if (!result.resourceId) throw new Error('复制接口未返回资源 ID');
      return result.resourceId;
    }
    if (normalizedType === RESOURCE_KIND.SKILL) {
      return skillService.forkSkill({
        resourceId,
        forkedResourceName: copyName,
        forkedResourceVersion: copyVersion,
      });
    }
    return documentService.forkDocument({
      resourceId,
      forkedResourceName: copyName,
      forkedResourceVersion: copyVersion,
    });
  };

  const mountResource = async (target: DriveSelectionItem, targetResourceId: string) => {
    if (!target.tagId) throw new Error('目标文件夹缺少标签 ID');
    if (target.groupId) {
      await resourceService.mountResourcesToGroupTag({
        resourceIds: [targetResourceId],
        groupId: target.groupId,
        tagId: target.tagId,
      });
      return;
    }
    await resourceService.updateResourceTags({
      resourceId: targetResourceId,
      tagIds: [target.tagId],
      primaryTagId: target.tagId,
    });
  };

  const { loading: copying, run: runCopy } = useRequest(
    async (target: DriveSelectionItem) => {
      const newResourceId = await forkResource();
      try {
        await mountResource(target, newResourceId);
      } catch (error) {
        await resourceService
          .removeResources({ resourceIds: [newResourceId] })
          .catch(() => undefined);
        throw error;
      }
      return { newResourceId, target };
    },
    {
      manual: true,
      onSuccess: ({ newResourceId, target }) => {
        setTargetModal(null);
        toast.success('副本已创建');
        openInWorkspace({
          resourceId: newResourceId,
          resourceType,
          resourceName: copyName,
          driveLocation: { scope: target.scope, parentNodeId: target.nodeId },
        });
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: linking, run: runCreateLink } = useRequest(
    async (target: DriveSelectionItem) => {
      if (!node) return;
      await driveService.createLink({
        nodeId: node.id,
        targetFolderNodeId: target.nodeId,
        groupId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setTargetModal(null);
        toast.success('链接已创建');
        refreshNode();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: sharing, run: runShare } = useRequest(
    async (target: DriveSelectionItem) => {
      if (!target.groupId || !target.tagId) return;
      await resourceService.mountResourcesToGroupTag({
        resourceIds: [resourceId],
        groupId: target.groupId,
        tagId: target.tagId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setTargetModal(null);
        toast.success('已分享到小组');
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleOpenOriginal = async () => {
    if (node?.type !== 'link' || !node.primaryTagId) return;
    try {
      const root = await driveService.getRootNode({ rootId: scope.rootId, groupId });
      const parentNodeId =
        root.tagId === node.primaryTagId ? root.id : encodeNodeId('folder', node.primaryTagId);
      openInWorkspace({
        resourceId,
        resourceType,
        resourceName,
        driveLocation: {
          scope: node.scope,
          parentNodeId,
          nodeId: encodeNodeId('resource', resourceId, node.primaryTagId),
        },
      });
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const handleMoveSuccess = (targetFolderNodeId: string) => {
    openInWorkspace({
      resourceId,
      resourceType,
      resourceName,
      replace: true,
      driveLocation: { scope, parentNodeId: targetFolderNodeId },
    });
  };

  const handleDeleteSuccess = () => {
    useWorkspaceNavigationStore.getState().navigateToScope(scope);
    navigate(buildDrivePath({ scope, nodeId: matchingLocation?.parentNodeId }), { replace: true });
  };

  const handlers: ResourceHeaderOperationHandlers = {
    deleteLabel: node?.type === 'link' ? '删除链接' : groupId ? '从小组移除' : '删除文件',
    isLocating: locating,
    onCopy: canCopy ? () => setTargetModal('copy') : undefined,
    onCreateLink: groupId && node?.type === 'resource' ? () => setTargetModal('link') : undefined,
    onMove: node ? () => setMoveOpen(true) : undefined,
    onShare: () => setTargetModal('share'),
    onOpenOriginal:
      node?.type === 'link' && node.primaryTagId ? () => void handleOpenOriginal() : undefined,
    onDelete: node ? () => setDeleteOpen(true) : undefined,
  };

  return (
    <>
      {onResolve(handlers)}
      <ResourceTargetModal
        isOpen={targetModal === 'copy'}
        title="创建副本"
        hint={`副本名称为「${copyName}」，请选择保存位置。`}
        scope={scope}
        submitting={copying}
        confirmText="创建副本"
        onOpenChange={(open) => setTargetModal(open ? 'copy' : null)}
        onConfirm={runCopy}
      />
      <ResourceTargetModal
        isOpen={targetModal === 'link'}
        title="添加链接到"
        hint="链接只会挂载到当前空间，不会复制文件内容。"
        scope={scope}
        submitting={linking}
        confirmText="创建链接"
        isTargetSelectable={(target) => target.nodeId !== node?.parentId}
        onOpenChange={(open) => setTargetModal(open ? 'link' : null)}
        onConfirm={runCreateLink}
      />
      <ResourceTargetModal
        isOpen={targetModal === 'share'}
        title="分享到小组"
        hint="选择其他小组中的文件夹，文件会作为主挂载添加到该小组。"
        scopeMode="groups"
        scope={scope}
        excludedGroupIds={groupId ? [groupId] : undefined}
        submitting={sharing}
        confirmText="分享"
        onOpenChange={(open) => setTargetModal(open ? 'share' : null)}
        onConfirm={runShare}
      />
      <MoveNodeModal
        isOpen={moveOpen}
        node={node ?? null}
        rootId={scope.rootId}
        groupId={groupId}
        onOpenChange={setMoveOpen}
        onSuccess={handleMoveSuccess}
      />
      <DeleteNodeModal
        isOpen={deleteOpen}
        node={node ?? null}
        groupId={groupId}
        onOpenChange={setDeleteOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}

export default ResourceHeaderOperations;
