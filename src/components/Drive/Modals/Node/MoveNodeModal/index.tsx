import DriveNav from '@/components/Drive/DriveNav';
import { useDriveService } from '@/domains';
import type { FolderNode, IDriveService } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Modal } from 'antd';
import { useMemo, useState } from 'react';
import type { DriveActionTarget } from '../../../common/driveComponentModel';
import type { MoveNodeModalProps } from './index.type';
import styles from './style.module.less';

const getNodeName = (node: DriveActionTarget): string => {
  if (node.type === 'folder') return node.name;
  if (node.type === 'resource' || node.type === 'link') return node.title;
  return '';
};

async function collectFolderDescendantIds(
  driveService: IDriveService,
  folderId: string,
  groupId: string | undefined,
  visited: Set<string>
): Promise<void> {
  if (visited.has(folderId)) return;
  visited.add(folderId);

  const children = await driveService.loadNodeChildren({ nodeId: folderId, groupId });
  const folderChildren = children.filter((child): child is FolderNode => child.type === 'folder');
  await Promise.all(
    folderChildren.map((child) =>
      collectFolderDescendantIds(driveService, child.id, groupId, visited)
    )
  );
}

function MoveNodeModal({ open, node, rootId, groupId, onCancel, onSuccess }: MoveNodeModalProps) {
  const driveService = useDriveService();
  const [selectedTargetId, setSelectedTargetId] = useState<string>();

  const { data: blockedIds } = useRequest(
    async (): Promise<Set<string>> => {
      if (!node) return new Set();
      const blocked = new Set<string>([node.id]);
      if (node.type !== 'folder') return blocked;
      await collectFolderDescendantIds(driveService, node.id, groupId, blocked);
      return blocked;
    },
    {
      ready: open && Boolean(node),
      refreshDeps: [open, node?.id, rootId, groupId],
      onBefore: () => {
        setSelectedTargetId(undefined);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const finalBlockedIds = useMemo(() => blockedIds ?? new Set<string>(), [blockedIds]);

  const { loading: moving, run: runMove } = useRequest(
    async () => {
      if (!node || !selectedTargetId) return;
      await driveService.moveNode({ nodeId: node.id, newParentId: selectedTargetId, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('移动成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!node || !selectedTargetId) return;
    runMove();
  };

  return (
    <Modal
      title="移动到文件夹"
      open={open && !!node}
      onCancel={onCancel}
      destroyOnHidden
      width={520}
      footer={[
        <Button key="cancel" onPress={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          variant="primary"
          onPress={handleConfirm}
          isDisabled={moving || !selectedTargetId}
        >
          确定
        </Button>,
      ]}
    >
      <div className={styles.wrapper}>
        {node ? <div className={styles.hint}>即将移动：{getNodeName(node)}</div> : null}
        <div className={styles.treeWrap}>
          <DriveNav
            rootId={rootId}
            groupId={groupId}
            renderableTypes={['folder']}
            selectableTypes={['folder']}
            disabledNodeIds={[...finalBlockedIds]}
            onChange={(selected) => {
              const targetFolder = selected.find((item) => item.kind === 'folder');
              setSelectedTargetId(targetFolder?.nodeId);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export default MoveNodeModal;
