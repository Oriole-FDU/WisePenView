import React, { useState, useCallback } from 'react';
import { Splitter } from 'antd';
import TagTree from './TagTree';
import TagInfoForm from './TagInfoForm';
import type { TagTreeResponse } from '@/services/Tag';
import type { TagManagerProps } from './index.type';
import styles from './style.module.less';

const TagManager: React.FC<TagManagerProps> = ({ groupId }) => {
  const [selectedTag, setSelectedTag] = useState<TagTreeResponse | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTreeSelect = useCallback((node: TagTreeResponse | null) => {
    setSelectedTag(node);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className={styles.splitterWrapper}>
      <Splitter className={styles.splitter}>
        <Splitter.Panel defaultSize="50%" min="240px" className={styles.splitterLeft}>
          <TagTree
            groupId={groupId}
            selectedKey={selectedTag?.tagId}
            onSelect={handleTreeSelect}
            refreshTrigger={refreshTrigger}
          />
        </Splitter.Panel>
        <Splitter.Panel defaultSize="50%" min="280px" className={styles.splitterRight}>
          <div className={styles.nodeDetail}>
            {selectedTag ? (
              <TagInfoForm
                tag={selectedTag}
                groupId={groupId}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <div className={styles.nodeDetailEmpty}>
                拖动标签调整层级
                点击标签编辑详情
              </div>
            )}
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default TagManager;
