import {
  isDriveTrashFolderNode,
  type DriveSelectionItem,
} from '@/components/Drive/common/driveComponentModel';
import { DriveDeleteModal, MoveNodeModal, TrashDeleteModal } from '@/components/Drive/Modals';
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
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['resource', 'drive']);
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
  const { data: parentPath, loading: locatingParentPath } = useRequest(
    () =>
      driveService.getNodePath({
        nodeId: matchingLocation!.parentNodeId,
        groupId,
      }),
    {
      ready: Boolean(matchingLocation && !groupId),
      refreshDeps: [matchingLocation?.parentNodeId, groupId],
    }
  );
  const isTrashView = Boolean(!groupId && parentPath?.some(isDriveTrashFolderNode));

  const copyName = t('resource:header.copyName', { name: resourceName });
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
      if (!result.resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_COPY_ID_MISSING);
      }
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
    if (!target.tagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_TAG_ID_MISSING);
    }
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
        toast.success(t('resource:header.copyCreated'));
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
        toast.success(t('resource:header.linkCreated'));
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
        toast.success(t('resource:header.sharedToGroup'));
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
    deleteLabel:
      node?.type === 'link'
        ? t('drive:delete.deleteLink')
        : groupId
          ? t('drive:delete.removeFromGroup')
          : isTrashView
            ? t('drive:delete.permanent')
            : t('drive:delete.moveToTrash'),
    isLocating: locating || locatingParentPath,
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
        title={t('resource:header.copyDialog.title')}
        hint={t('resource:header.copyDialog.hint', { name: copyName })}
        scope={scope}
        submitting={copying}
        confirmText={t('resource:header.copyDialog.confirm')}
        onOpenChange={(open) => setTargetModal(open ? 'copy' : null)}
        onConfirm={runCopy}
      />
      <ResourceTargetModal
        isOpen={targetModal === 'link'}
        title={t('resource:header.linkDialog.title')}
        hint={t('resource:header.linkDialog.hint')}
        scope={scope}
        submitting={linking}
        confirmText={t('resource:header.linkDialog.confirm')}
        isTargetSelectable={(target) => target.nodeId !== node?.parentId}
        onOpenChange={(open) => setTargetModal(open ? 'link' : null)}
        onConfirm={runCreateLink}
      />
      <ResourceTargetModal
        isOpen={targetModal === 'share'}
        title={t('resource:header.shareDialog.title')}
        hint={t('resource:header.shareDialog.hint')}
        scopeMode="groups"
        scope={scope}
        excludedGroupIds={groupId ? [groupId] : undefined}
        submitting={sharing}
        confirmText={t('resource:header.shareDialog.confirm')}
        onOpenChange={(open) => setTargetModal(open ? 'share' : null)}
        onConfirm={runShare}
      />
      <MoveNodeModal
        isOpen={moveOpen}
        nodes={node ? [node] : []}
        rootId={scope.rootId}
        groupId={groupId}
        onOpenChange={setMoveOpen}
        onSuccess={handleMoveSuccess}
      />
      {isTrashView ? (
        <TrashDeleteModal
          isOpen={deleteOpen}
          node={node ?? null}
          onOpenChange={setDeleteOpen}
          onSuccess={handleDeleteSuccess}
        />
      ) : (
        <DriveDeleteModal
          isOpen={deleteOpen}
          node={node ?? null}
          groupId={groupId}
          onOpenChange={setDeleteOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}

export default ResourceHeaderOperations;
