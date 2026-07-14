import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import { useResourceService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Resource';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, Input, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { CollectionPickerModalProps } from './index.type';
import styles from './style.module.less';

const getCollectionDisplayName = (collection: FavoriteCollection): string =>
  collection.collectionName ?? '我的收藏';

function CollectionPickerModal({
  isOpen,
  onOpenChange,
  resourceId,
  initialCollectionIds,
  onConfirmed,
}: CollectionPickerModalProps) {
  const resourceService = useResourceService();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const resetDraftState = () => {
    setSelectedIds(initialCollectionIds);
    setShowCreateInput(false);
    setNewCollectionName('');
  };

  /**
   * 执行时机：弹窗打开，或外部初始收藏集合发生变化时，同步本地草稿状态。
   * 不可替代原因：新建收藏夹后的 refreshCollections 也会触发请求，若把重置逻辑挂在请求生命周期上，会覆盖用户刚刚勾选的新集合。
   * cleanup：仅重置本地输入和选择状态，无订阅或异步资源需要释放。
   */
  useEffectForce(() => {
    if (!isOpen) return;
    resetDraftState();
  }, [initialCollectionIds, isOpen]);

  const {
    data: collections,
    loading: loadingCollections,
    refresh: refreshCollections,
  } = useRequest(() => resourceService.listCollections(), {
    ready: isOpen,
    refreshDeps: [isOpen, initialCollectionIds.join('|')],
    onError: (err) => toast.danger(parseErrorMessage(err)),
  });

  const { loading: loadingConfirm, run: runConfirm } = useRequest(
    async () => {
      await resourceService.changeFavoriteStatus({
        resourceId,
        favorite: selectedIds.length > 0,
        collectionIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      const latest = await resourceService.getFavoriteStatus(resourceId);
      return latest.collectionIds;
    },
    {
      manual: true,
      onSuccess: (latestCollectionIds) => {
        onConfirmed(latestCollectionIds);
        onOpenChange(false);
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const { loading: loadingCreate, run: runCreateCollection } = useRequest(
    async (name: string) => resourceService.createCollection({ collectionName: name }),
    {
      manual: true,
      onSuccess: (newId) => {
        setSelectedIds((prev) => Array.from(new Set([...prev, newId])));
        setNewCollectionName('');
        setShowCreateInput(false);
        refreshCollections();
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (loadingConfirm || loadingCreate)) return;
    onOpenChange(nextOpen);
  };

  const handleToggle = (collectionId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, collectionId]))
        : prev.filter((id) => id !== collectionId)
    );
  };

  const handleCreateSubmit = () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      toast.warning('请输入收藏夹名称');
      return;
    }
    runCreateCollection(trimmed);
  };

  const selectedIdSet = new Set(selectedIds);
  const busy = loadingConfirm || loadingCreate;
  const actions = (
    <>
      <Button variant="secondary" onPress={() => handleOpenChange(false)} isDisabled={busy}>
        取消
      </Button>
      <Button variant="primary" onPress={runConfirm} isDisabled={busy || loadingCollections}>
        确认
      </Button>
    </>
  );

  const renderCollection = (collection: FavoriteCollection) => (
    <Checkbox
      key={collection.collectionId}
      isSelected={selectedIdSet.has(collection.collectionId)}
      onChange={(checked) => handleToggle(collection.collectionId, checked)}
      variant="secondary"
      className={styles.collectionItem}
    >
      <Checkbox.Content className={styles.collectionContent}>
        <Checkbox.Control className={styles.collectionControl}>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className={styles.collectionText}>
          <span data-slot="label" className={styles.collectionLabel}>
            {getCollectionDisplayName(collection)}
          </span>
          <span data-slot="description" className={styles.collectionCount}>
            {collection.itemCount} 个内容
          </span>
        </span>
      </Checkbox.Content>
    </Checkbox>
  );

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="收藏到"
      size="sm"
      isDismissable={!busy}
      actions={actions}
    >
      <div className={styles.body}>
        {loadingCollections ? (
          <Spin />
        ) : (
          <div className={styles.list}>{(collections ?? []).map(renderCollection)}</div>
        )}

        {showCreateInput ? (
          <div className={styles.createRow}>
            <TextField aria-label="新建收藏夹名称" className={styles.createInput}>
              <Input
                placeholder="收藏夹名称"
                value={newCollectionName}
                autoFocus
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateSubmit();
                  }
                  if (e.key === 'Escape') {
                    setShowCreateInput(false);
                    setNewCollectionName('');
                  }
                }}
              />
            </TextField>
            <Button
              size="sm"
              variant="primary"
              isDisabled={loadingCreate}
              onPress={handleCreateSubmit}
            >
              创建
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={loadingCreate}
              onPress={() => {
                setShowCreateInput(false);
                setNewCollectionName('');
              }}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={styles.newCollectionBtn}
            onPress={() => setShowCreateInput(true)}
          >
            + 新建收藏夹
          </Button>
        )}
      </div>
    </AppModal>
  );
}

export default CollectionPickerModal;
