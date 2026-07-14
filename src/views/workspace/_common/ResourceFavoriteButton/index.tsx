/** 资源收藏按钮薄层：自行获取收藏状态，处理 0/1/多收藏夹的点击逻辑 */
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Tooltip, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import CollectionPickerModal from '../CollectionPickerModal';
import type { ResourceFavoriteButtonProps } from './index.type';
import styles from './style.module.less';

function ResourceFavoriteButton({
  resourceId,
  variant = 'icon',
  onSuccess,
}: ResourceFavoriteButtonProps) {
  const resourceService = useResourceService();
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { loading: loadingStatus, refresh: refreshFavoriteStatus } = useRequest(
    () => resourceService.getFavoriteStatus(resourceId),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
      onSuccess: (data) => setCollectionIds(data.collectionIds),
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const isFavorited = collectionIds.length > 0;

  const { run: runUnfavorite, loading: unfavoriteLoading } = useRequest(
    async () => {
      await resourceService.changeFavoriteStatus({ resourceId, favorite: false });
      return resourceService.getFavoriteStatus(resourceId);
    },
    {
      manual: true,
      onSuccess: (latest) => {
        setCollectionIds(latest.collectionIds);
        void Promise.resolve(onSuccess?.());
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const handleClick = () => {
    if (collectionIds.length === 1) {
      runUnfavorite();
      return;
    }
    setModalOpen(true);
  };

  const handleConfirmed = (latestCollectionIds: string[]) => {
    setCollectionIds(latestCollectionIds);
    refreshFavoriteStatus();
    void Promise.resolve(onSuccess?.());
  };

  const label = isFavorited ? '已收藏，点击管理' : '收藏';
  const disabled = loadingStatus || unfavoriteLoading;
  const Icon = isFavorited ? BookmarkCheck : Bookmark;

  const iconButton = (
    <button
      type="button"
      className={`${styles.btn} ${isFavorited ? styles.active : ''}`}
      aria-label={label}
      aria-pressed={isFavorited}
      disabled={disabled}
      onClick={handleClick}
    >
      <Icon className={styles.icon} size={16} strokeWidth={1.9} />
    </button>
  );

  const panelButton = (
    <button
      type="button"
      className={`${styles.panelButton} ${isFavorited ? styles.panelButtonActive : ''}`}
      aria-label={label}
      aria-pressed={isFavorited}
      disabled={disabled}
      onClick={handleClick}
    >
      <span className={styles.panelButtonMain}>
        <span className={`${styles.panelIconWrap} ${isFavorited ? styles.active : ''}`}>
          <Icon className={styles.icon} size={16} strokeWidth={1.9} />
        </span>
        <span className={styles.panelCopy}>
          <span className={styles.panelTitle}>{isFavorited ? '已收藏' : '收藏'}</span>
          <span className={styles.panelDescription}>
            {isFavorited ? '管理收藏夹' : '加入收藏夹'}
          </span>
        </span>
      </span>
    </button>
  );

  return (
    <>
      {variant === 'panel' ? (
        panelButton
      ) : (
        <Tooltip>
          <Tooltip.Trigger>{iconButton}</Tooltip.Trigger>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
      )}

      <CollectionPickerModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        resourceId={resourceId}
        initialCollectionIds={collectionIds}
        onConfirmed={handleConfirmed}
      />
    </>
  );
}

export default ResourceFavoriteButton;
