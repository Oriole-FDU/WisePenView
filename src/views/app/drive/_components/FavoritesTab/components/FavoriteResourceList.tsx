import { Empty, Spin } from '@/components/Feedback';
import { Button } from '@heroui/react';
import { useFavoriteResources } from '../hooks/useFavoriteResources';
import styles from '../style.module.less';
import FavoriteResourceRow from './FavoriteResourceRow';

interface FavoriteResourceListProps {
  collectionId?: string;
  emptyDescription: string;
}

function FavoriteResourceList({ collectionId, emptyDescription }: FavoriteResourceListProps) {
  const { list, loading, page, totalPage, canPrev, canNext, prevPage, nextPage } =
    useFavoriteResources({ collectionId });

  if (loading) return <Spin />;
  if (list.length === 0) return <Empty description={emptyDescription} />;

  return (
    <div className={styles.resourceListWrap}>
      <div className={styles.resourceList}>
        {list.map((item) => (
          <FavoriteResourceRow key={item.resourceId} item={item} />
        ))}
      </div>
      {totalPage > 1 ? (
        <div className={styles.paginationBar}>
          <Button size="sm" variant="secondary" isDisabled={!canPrev} onPress={prevPage}>
            上一页
          </Button>
          <span className={styles.paginationText}>
            {page} / {totalPage}
          </span>
          <Button size="sm" variant="secondary" isDisabled={!canNext} onPress={nextPage}>
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default FavoriteResourceList;
