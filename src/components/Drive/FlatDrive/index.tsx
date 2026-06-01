import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import { useState } from 'react';
import FileFilter from './FileFilter';
import type { FileFilterValue } from './FileFilter/index.type';
import FileList from './FileList';
import type { FlatDriveProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_FILTER: FileFilterValue = {
  tagIds: [],
  tagNames: [],
  tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
  sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
  sortDir: RESOURCE_SORT_DIR.DESC,
};

function FlatDrive({ groupId }: FlatDriveProps) {
  const [filter, setFilter] = useState<FileFilterValue>(DEFAULT_FILTER);

  return (
    <div className={styles.wrapper}>
      <section className={styles.filterSection}>
        <FileFilter value={filter} onChange={setFilter} />
      </section>
      <main className={styles.listArea}>
        <FileList groupId={groupId} filter={filter} />
      </main>
    </div>
  );
}

export default FlatDrive;
