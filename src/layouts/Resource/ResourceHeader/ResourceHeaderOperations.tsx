import { toast } from '@heroui/react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { isDriveTrashFolderNode } from '@/components/business/Drive/common/driveComponentModel';
import {
  DriveDeleteModal,
  MoveNodeModal,
  TrashDeleteModal,
} from '@/components/business/Drive/Modals';
import {
  useDocumentService,
  useDriveService,
  useNoteService,
  useResourceService,
  useSkillService,
} from '@/domains';
import {
  buildDriveNodeScope,
  type DriveContainerNode,
  type DriveResourceNode,
} from '@/domains/Drive';
import {
  RESOURCE_ACTION,
  type ResourceAction,
  resourceActionsInclude,
  type ResourceItem,
} from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import { parseResourceDriveLocation } from '@/utils/navigation/resourceRoute';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';

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
  resourceInfo?: ResourceItem;
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
  resourceInfo,
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
  const openResource = useOpenResource();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const driveLocation = parseResourceDriveLocation(new URLSearchParams(routeLocation.search));
  const scope = driveLocation?.scope ?? buildDriveNodeScope();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const [targetModal, setTargetModal] = useState<TargetModal>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: node, loading: resolvingNode } = useApi<DriveResourceNode, []>(
    () =>
      driveService.resolveResourceNode({
        resource: resourceInfo!,
        location: driveLocation!,
      }),
    {
      ready: Boolean(resourceInfo && resourceInfo.resourceId === resourceId && driveLocation),
      refreshDeps: [
        resourceId,
        resourceInfo,
        driveLocation?.scope.rootId,
        driveLocation?.mountTagId,
      ],
    }
  );
  const { data: parentPath, loading: locatingParentPath } = useApi(
    () => driveService.getMountPath({ location: driveLocation! }),
    {
      ready: Boolean(driveLocation && !groupId),
      refreshDeps: [driveLocation?.scope.rootId, driveLocation?.mountTagId, groupId],
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

  const mountResource = async (target: DriveContainerNode, targetResourceId: string) => {
    if (target.scope.type === 'group') {
      if (target.type !== 'folder') {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_TAG_ID_MISSING);
      }
      await driveService.addResourcesToGroup({ resourceIds: [targetResourceId], target });
      return;
    }
    await driveService.setPersonalResourcesLocation({
      resourceIds: [targetResourceId],
      target,
    });
  };

  const { loading: copying, run: runCopy } = useApi(
    async (target: DriveContainerNode) => {
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
        const mountTagId = target.tagId;
        openResource({
          resourceId: newResourceId,
          resourceType,
          resourceName: copyName,
          driveLocation: mountTagId ? { scope: target.scope, mountTagId } : undefined,
        });
      },
    }
  );

  const { loading: linking, run: runCreateLink } = useApi(
    async (target: DriveContainerNode) => {
      if (!node || target.type !== 'folder' || target.scope.type !== 'group') return;
      await driveService.addResourcesToGroup({ resourceIds: [node.resourceId], target });
    },
    {
      manual: true,
      onSuccess: () => {
        setTargetModal(null);
        toast.success(t('resource:header.linkCreated'));
      },
    }
  );

  const { loading: sharing, run: runShare } = useApi(
    async (target: DriveContainerNode) => {
      if (target.type !== 'folder' || target.scope.type !== 'group') return;
      await driveService.addResourcesToGroup({ resourceIds: [resourceId], target });
    },
    {
      manual: true,
      onSuccess: () => {
        setTargetModal(null);
        toast.success(t('resource:header.sharedToGroup'));
      },
    }
  );

  const handleOpenOriginal = () => {
    if (node?.type !== 'link' || !node.primaryTagId) return;
    openResource({
      resourceId,
      resourceType,
      resourceName,
      driveLocation: { scope: node.scope, mountTagId: node.primaryTagId },
    });
  };

  const handleMoveSuccess = (target: DriveContainerNode) => {
    const mountTagId = target.tagId;
    openResource({
      resourceId,
      resourceType,
      resourceName,
      replace: true,
      driveLocation: mountTagId ? { scope: target.scope, mountTagId } : undefined,
    });
  };

  const handleDeleteSuccess = () => {
    navigate(buildDrivePath({ scope, nodeId: node?.parentId }), { replace: true });
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
    isLocating: Boolean(driveLocation && (!resourceInfo || resolvingNode || locatingParentPath)),
    onCopy: canCopy ? () => setTargetModal('copy') : undefined,
    onCreateLink: groupId && node?.type === 'resource' ? () => setTargetModal('link') : undefined,
    onMove: node ? () => setMoveOpen(true) : undefined,
    onShare: () => setTargetModal('share'),
    onOpenOriginal: node?.type === 'link' && node.primaryTagId ? handleOpenOriginal : undefined,
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
        scopeMode="public"
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
          nodes={node ? [node] : []}
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
