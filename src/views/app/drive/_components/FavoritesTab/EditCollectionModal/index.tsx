import { FormField, Input, TextArea } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useResourceService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Resource';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import styles from './style.module.less';

interface EditCollectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collection: FavoriteCollection | null;
  onSuccess: () => void;
}

function EditCollectionModal({
  isOpen,
  onOpenChange,
  collection,
  onSuccess,
}: EditCollectionModalProps) {
  const resourceService = useResourceService();
  const isCreate = collection == null;
  const [name, setName] = useState(collection?.collectionName ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');

  /**
   * 执行时机：弹窗打开时，根据当前目标收藏夹同步表单默认值。
   * 不可替代原因：弹窗组件可能在一次打开周期内切换 create/edit 目标，useState 初始值不会随 props 自动更新。
   * cleanup：仅重置本地表单状态，无订阅或异步资源需要释放。
   */
  useEffectForce(() => {
    if (!isOpen) return;
    setName(collection?.collectionName ?? '');
    setDescription(collection?.description ?? '');
  }, [collection?.collectionId, collection?.collectionName, collection?.description, isOpen]);

  const { loading, run: runSubmit } = useRequest(
    async () => {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      if (isCreate) {
        await resourceService.createCollection({
          collectionName: trimmedName,
          description: trimmedDescription || null,
        });
        return;
      }
      await resourceService.updateCollectionInfo({
        collectionId: collection.collectionId,
        collectionName: trimmedName,
        description: trimmedDescription || null,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(isCreate ? '收藏夹创建成功' : '收藏夹修改成功');
        onSuccess();
        onOpenChange(false);
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning('请输入收藏夹名称');
      return;
    }
    runSubmit();
  };

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={isCreate ? '新建收藏夹' : '编辑收藏夹'}
      size="sm"
      onSubmit={handleSubmit}
      isSubmitting={loading}
      isDismissable={!loading}
      confirmText={isCreate ? '创建' : '保存'}
    >
      <div className={styles.body}>
        <FormField
          aria-label="收藏夹名称"
          className={styles.field}
          label="收藏夹名称"
          value={name}
          onChange={setName}
          isRequired
        >
          <Input placeholder="收藏夹名称（必填）" autoFocus />
        </FormField>
        <FormField
          aria-label="描述"
          className={styles.field}
          label="描述"
          value={description}
          onChange={setDescription}
        >
          <TextArea placeholder="描述（可选）" rows={4} />
        </FormField>
      </div>
    </AppFormDialog>
  );
}

export default EditCollectionModal;
