import DriveNavigator from '@/components/Drive/DriveNavigator';
import AppModal from '@/components/Overlay/AppModal';
import { useDriveService } from '@/domains';
import type { FolderNode, IDriveService } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState } from 'react';
import { getDriveScopeGroupId, type DriveActionTarget } from '../../../common/driveComponentModel';
import type { MoveNodeModalProps } from './index.type';
import styles from './style.module.less';

const getNodeName = (node: DriveActionTarget): string => {
  if (node.type === 'folder') return node.name;
  if (node.type === 'resource' || node.type === 'link') return node.title;
  return '';
};

async function collectFolderSubtreeNodeIds(
  driveService: IDriveService,
  folderId: string,
  groupId: string | undefined,
  disabledNodeIds: Set<string>,
  visitedFolderIds: Set<string>
): Promise<void> {
  if (visitedFolderIds.has(folderId)) return;
  visitedFolderIds.add(folderId);
  disabledNodeIds.add(folderId);

  const children = await driveService.listNodeChildren({
    nodeId: folderId,
    groupId,
  });
  children.forEach((child) => disabledNodeIds.add(child.id));
  const folderChildren = children.filter((child): child is FolderNode => child.type === 'folder');
  await Promise.all(
    folderChildren.map((child) =>
      collectFolderSubtreeNodeIds(
        driveService,
        child.id,
        groupId,
        disabledNodeIds,
        visitedFolderIds
      )
    )
  );
}

function MoveNodeModal({
  isOpen,
  nodes,
  rootId,
  groupId,
  isTrashView = false,
  onOpenChange,
  onSuccess,
}: MoveNodeModalProps) {
  const driveService = useDriveService();
  const [selectedTargetId, setSelectedTargetId] = useState<string>();
  const nodeIdsKey = nodes.map((node) => node.id).join('\u0000');
  const effectiveRootId = nodes[0]?.scope.rootId ?? rootId;
  const effectiveGroupId = groupId ?? (nodes[0] ? getDriveScopeGroupId(nodes[0].scope) : undefined);

  const { data: descendantNodeIds } = useRequest(
    async (): Promise<Set<string>> => {
      const descendantIds = new Set<string>();
      const visitedFolderIds = new Set<string>();
      await Promise.all(
        nodes
          .filter(
            (node): node is Extract<DriveActionTarget, { type: 'folder' }> => node.type === 'folder'
          )
          .map((node) =>
            collectFolderSubtreeNodeIds(
              driveService,
              node.id,
              effectiveGroupId,
              descendantIds,
              visitedFolderIds
            )
          )
      );
      return descendantIds;
    },
    {
      ready: isOpen && nodes.length > 0,
      refreshDeps: [isOpen, nodeIdsKey, effectiveRootId, effectiveGroupId],
      onBefore: () => {
        setSelectedTargetId(undefined);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const disabledTargetIds = useMemo(() => {
    const next = new Set(nodes.map((node) => node.id));
    for (const nodeId of descendantNodeIds ?? []) {
      next.add(nodeId);
    }
    if (
      effectiveGroupId &&
      nodes.some((node) => node.type === 'resource' || node.type === 'link')
    ) {
      next.add(effectiveRootId);
    }
    return next;
  }, [descendantNodeIds, effectiveGroupId, effectiveRootId, nodes]);

  const { loading: moving, run: runMove } = useRequest(
    async () => {
      if (nodes.length === 0 || !selectedTargetId) return;
      return await driveService.moveNodesToFolder({
        nodeIds: nodes.map((node) => node.id),
        targetFolderNodeId: selectedTargetId,
        groupId: effectiveGroupId,
      });
    },
    {
      manual: true,
      onSuccess: (movedCount) => {
        if (movedCount === 0) {
          toast.success('所选项已在目标文件夹');
          onOpenChange(false);
          return;
        }
        toast.success(isTrashView ? `已移动 ${movedCount} 项到云盘` : `已移动 ${movedCount} 项`);
        if (selectedTargetId) {
          onSuccess?.(selectedTargetId);
        }
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (nodes.length === 0 || !selectedTargetId) return;
    runMove();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && moving) return;
    onOpenChange(nextOpen);
  };

  return (
    <AppModal
      isOpen={isOpen && nodes.length > 0}
      onOpenChange={handleOpenChange}
      title={isTrashView ? '移动到云盘' : '移动到文件夹'}
      size="md"
      isDismissable={!moving}
      actions={
        <>
          <Button variant="secondary" isDisabled={moving} onPress={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={moving || !selectedTargetId}
            aria-busy={moving || undefined}
            onPress={handleConfirm}
          >
            确定
          </Button>
        </>
      }
    >
      <div className={styles.wrapper}>
        {nodes.length === 1 ? (
          <div className={styles.hint}>即将移动：{getNodeName(nodes[0])}</div>
        ) : (
          <div className={styles.hint}>已选择 {nodes.length} 项</div>
        )}
        <div className={styles.treeWrap}>
          <DriveNavigator
            rootId={effectiveRootId}
            groupId={effectiveGroupId}
            selectableTypes={['root', 'folder']}
            disabledNodeIds={[...disabledTargetIds]}
            disabled={moving}
            onChange={(selected) => {
              const targetFolder = selected.find(
                (item) => item.kind === 'root' || item.kind === 'folder'
              );
              setSelectedTargetId(targetFolder?.nodeId);
            }}
          />
        </div>
      </div>
    </AppModal>
  );
}

export default MoveNodeModal;
