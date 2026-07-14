import EntryIcon from '@/components/Icons/EntryIcon';
import { buildDriveNodeScope } from '@/domains/Drive';
import type { FavoriteItem } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import styles from '../style.module.less';

interface FavoriteResourceRowProps {
  item: FavoriteItem;
}

function FavoriteResourceRow({ item }: FavoriteResourceRowProps) {
  const openInWorkspace = useOpenInWorkspace();

  if (!item.accessible || item.resourceInfo == null) {
    return (
      <div className={`${styles.resourceRow} ${styles.inaccessible}`}>
        <EntryIcon entryType="resource" size={18} />
        <span className={styles.resourceName}>资源已删除</span>
        <span className={styles.favoritedAt}>{formatTimestampToDate(item.favoritedAt)}</span>
      </div>
    );
  }

  const { resourceInfo } = item;

  return (
    <button
      type="button"
      className={`${styles.resourceRow} ${styles.resourceRowClickable}`}
      onClick={() =>
        openInWorkspace({
          resourceId: item.resourceId,
          resourceType: resourceInfo.resourceType,
          resourceName: resourceInfo.resourceName,
          driveLocation: { scope: buildDriveNodeScope() },
        })
      }
    >
      <EntryIcon entryType="resource" resourceType={resourceInfo.resourceType} size={18} />
      <span className={styles.resourceName}>{resourceInfo.resourceName}</span>
      <span className={styles.favoritedAt}>{formatTimestampToDate(item.favoritedAt)}</span>
    </button>
  );
}

export default FavoriteResourceRow;
