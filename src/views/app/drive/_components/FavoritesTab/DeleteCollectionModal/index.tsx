import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Checkbox, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import styles from './style.module.less';

interface DeleteCollectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string | null;
  onSuccess: () => void;
}

function DeleteCollectionModal({
  isOpen,
  onOpenChange,
  collectionId,
  collectionName,
  onSuccess,
}: DeleteCollectionModalProps) {
  const resourceService = useResourceService();
  const [keepResources, setKeepResources] = useState(false);
  const displayName = collectionName ?? '我的收藏';

  const { loading, run: runDelete } = useRequest(
    () =>
      resourceService.deleteCollection({
        collectionId,
        keepResourcesToDefault: keepResources,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('收藏夹已删除');
        onSuccess();
        onOpenChange(false);
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  return (
    <AppAlertDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      type="danger"
      title="删除收藏夹"
      description={`确定要删除收藏夹「${displayName}」吗？此操作不可撤销。`}
      confirmText="删除"
      isConfirmLoading={loading}
      onConfirm={runDelete}
    >
      <div className={styles.body}>
        <Checkbox isSelected={keepResources} onChange={setKeepResources} variant="secondary">
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <span data-slot="label">将该收藏夹内的资源保留到我的收藏</span>
          </Checkbox.Content>
        </Checkbox>
      </div>
    </AppAlertDialog>
  );
}

export default DeleteCollectionModal;
