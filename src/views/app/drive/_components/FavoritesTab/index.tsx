import SegmentedTabs from '@/components/SegmentedTabs';
import { useResourceService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import EditCollectionModal from './EditCollectionModal';
import ByCollectionView from './components/ByCollectionView';
import FavoriteResourceList from './components/FavoriteResourceList';
import styles from './style.module.less';

type TabKey = 'byContent' | 'byCollection';
type FavoritesView =
  | { mode: 'byContent' }
  | { mode: 'byCollection' }
  | { mode: 'collectionDetail'; collectionId: string; collectionName: string | null };

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'byContent', label: '按内容' },
  { key: 'byCollection', label: '按收藏夹' },
];

function FavoritesTab() {
  const resourceService = useResourceService();
  const [view, setView] = useState<FavoritesView>({ mode: 'byContent' });
  const [createOpen, setCreateOpen] = useState(false);

  const {
    data: collections,
    loading: loadingCollections,
    refresh: refreshCollections,
  } = useRequest(() => resourceService.listCollections(), {
    onError: (err) => toast.danger(parseErrorMessage(err)),
  });

  const activeTab: TabKey = view.mode === 'collectionDetail' ? 'byCollection' : view.mode;

  const handleTabChange = (key: TabKey) => {
    setView({ mode: key });
  };

  const handleCollectionClick = (collection: FavoriteCollection) => {
    setView({
      mode: 'collectionDetail',
      collectionId: collection.collectionId,
      collectionName: collection.collectionName,
    });
  };

  const handleCollectionChanged = () => {
    refreshCollections();
    setView({ mode: 'byCollection' });
  };

  const renderTopBar = () => {
    if (view.mode === 'collectionDetail') {
      const displayName = view.collectionName ?? '我的收藏';
      return (
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setView({ mode: 'byCollection' })}
              className={styles.backBtn}
            >
              <ChevronLeft size={16} />
              返回
            </Button>
            <h2 className={styles.detailTitle}>{displayName}</h2>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.topBar}>
        <SegmentedTabs<TabKey>
          ariaLabel="收藏视图切换"
          items={TAB_ITEMS}
          selectedKey={activeTab}
          onSelectionChange={handleTabChange}
          size="sm"
        />
        <Button variant="secondary" size="sm" onPress={() => setCreateOpen(true)}>
          <Plus size={14} />
          新建收藏夹
        </Button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {renderTopBar()}

      <div className={styles.content}>
        {view.mode === 'byContent' && <FavoriteResourceList emptyDescription="暂无收藏内容" />}
        {view.mode === 'byCollection' && (
          <ByCollectionView
            collections={collections ?? []}
            loading={loadingCollections}
            onCollectionClick={handleCollectionClick}
            onRefresh={refreshCollections}
          />
        )}
        {view.mode === 'collectionDetail' && (
          <FavoriteResourceList
            collectionId={view.collectionId}
            emptyDescription="该收藏夹暂无内容"
          />
        )}
      </div>

      {createOpen ? (
        <EditCollectionModal
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          collection={null}
          onSuccess={handleCollectionChanged}
        />
      ) : null}
    </div>
  );
}

export default FavoritesTab;
