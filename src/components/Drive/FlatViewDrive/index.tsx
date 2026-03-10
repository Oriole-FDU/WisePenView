import React, { useState } from 'react';
import clsx from 'clsx';
import { LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu';
import FileList from './FileList';
import FileFilter from './FileFilter';
import {
  TAG_QUERY_LOGIC_MODE,
  RESOURCE_SORT_BY,
  RESOURCE_SORT_DIR,
} from '@/services/Resource';
import type { FileFilterValue } from './FileFilter/index.type';
import styles from './style.module.less';

const DEFAULT_FILTER: FileFilterValue = {
  tagIds: [],
  tagNames: [],
  tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
  sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
  sortDir: RESOURCE_SORT_DIR.DESC,
};

const FlatViewDrive: React.FC = () => {
  const [filter, setFilter] = useState<FileFilterValue>(DEFAULT_FILTER);
  const [filterCollapsed, setFilterCollapsed] = useState(true);

  return (
    <>
      {!filterCollapsed && (
        <div className={styles.filterPanel}>
          <FileFilter value={filter} onChange={setFilter} />
        </div>
      )}
      <main
        className={clsx(
          styles.listArea,
          filterCollapsed && styles.listAreaNoDivider
        )}
      >
        <div className={styles.listAreaTopBar}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setFilterCollapsed((v) => !v)}
            title={filterCollapsed ? '展开筛选' : '收起筛选'}
            aria-label={filterCollapsed ? '展开筛选' : '收起筛选'}
          >
            {filterCollapsed ? (
              <LuPanelLeftOpen size={18} />
            ) : (
              <LuPanelLeftClose size={18} />
            )}
            <span className={styles.filterToggleText}>
              {filterCollapsed ? '展开筛选' : '收起筛选'}
            </span>
          </button>
        </div>
        <FileList filter={filter} />
      </main>
    </>
  );
};

export default FlatViewDrive;
