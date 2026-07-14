import { Empty, Spin } from '@/components/Feedback';
import type { FavoriteCollection } from '@/domains/Resource';
import styles from '../style.module.less';
import CollectionCard from './CollectionCard';

interface ByCollectionViewProps {
  collections: FavoriteCollection[];
  loading: boolean;
  onCollectionClick: (collection: FavoriteCollection) => void;
  onRefresh: () => void;
}

/** 按收藏集合视图：卡片网格展示所有集合 */
function ByCollectionView({
  collections,
  loading,
  onCollectionClick,
  onRefresh,
}: ByCollectionViewProps) {
  if (loading) return <Spin />;
  if (collections.length === 0) return <Empty description="暂无收藏夹" />;

  return (
    <div className={styles.collectionGrid}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.collectionId}
          collection={collection}
          onClick={() => onCollectionClick(collection)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export default ByCollectionView;
