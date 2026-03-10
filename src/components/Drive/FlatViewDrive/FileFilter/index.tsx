import React, { useCallback, useState } from 'react';
import { Tag, Radio, Select } from 'antd';
import { LuX } from 'react-icons/lu';
import TagTree from '@/components/Common/TagTree';
import type { TagTreeNode } from '@/services/Tag';
import {
  TAG_QUERY_LOGIC_MODE,
  RESOURCE_SORT_BY,
  RESOURCE_SORT_DIR,
} from '@/services/Resource';
import type { FileFilterProps, FileFilterValue } from './index.type';
import styles from './style.module.less';

const DEFAULT_VALUE: FileFilterValue = {
  tagIds: [],
  tagNames: [],
  tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
  sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
  sortDir: RESOURCE_SORT_DIR.DESC,
};

const SORT_BY_OPTIONS = [
  { label: '更新时间', value: RESOURCE_SORT_BY.UPDATE_TIME },
  { label: '创建时间', value: RESOURCE_SORT_BY.CREATE_TIME },
  { label: '名称', value: RESOURCE_SORT_BY.NAME },
  { label: '大小', value: RESOURCE_SORT_BY.SIZE },
];

const SORT_DIR_OPTIONS = [
  { label: '升序', value: RESOURCE_SORT_DIR.ASC },
  { label: '降序', value: RESOURCE_SORT_DIR.DESC },
];

const FileFilter: React.FC<FileFilterProps> = ({
  groupId,
  value,
  onChange,
}) => {
  const [innerValue, setInnerValue] = useState<FileFilterValue>(DEFAULT_VALUE);
  const isControlled = value !== undefined;
  const current = isControlled ? value : innerValue;

  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map());

  const updateValue = useCallback(
    (next: FileFilterValue) => {
      if (!isControlled) setInnerValue(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const handleTreeSelect = useCallback(
    (node: TagTreeNode | null) => {
      if (!node?.tagId) return;
      const { tagId, tagName } = node;
      const name = tagName ?? tagId;
      if (current.tagIds.includes(tagId)) return;
      setTagMap((prev) => new Map(prev).set(tagId, name));
      const nextTagIds = [...current.tagIds, tagId];
      const nextTagNames = [...current.tagNames, name];
      updateValue({
        ...current,
        tagIds: nextTagIds,
        tagNames: nextTagNames,
      });
    },
    [current, updateValue]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      const idx = current.tagIds.indexOf(tagId);
      const nextTagIds = current.tagIds.filter((id) => id !== tagId);
      const nextTagNames = current.tagNames.filter((_, i) => i !== idx);
      updateValue({
        ...current,
        tagIds: nextTagIds,
        tagNames: nextTagNames,
      });
    },
    [current, updateValue]
  );

  const handleLogicModeChange = useCallback(
    (val: FileFilterValue['tagQueryLogicMode']) => {
      updateValue({ ...current, tagQueryLogicMode: val });
    },
    [current, updateValue]
  );

  const handleSortByChange = useCallback(
    (val: FileFilterValue['sortBy']) => {
      updateValue({ ...current, sortBy: val });
    },
    [current, updateValue]
  );

  const handleSortDirChange = useCallback(
    (val: FileFilterValue['sortDir']) => {
      updateValue({ ...current, sortDir: val });
    },
    [current, updateValue]
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.sortSection}>
        <div className={styles.controlRow}>
          <span className={styles.optionLabel}>排序字段：</span>
          <Select
            size="small"
            value={current.sortBy}
            onChange={handleSortByChange}
            options={SORT_BY_OPTIONS}
            className={styles.sortSelect}
          />
        </div>
        <div className={styles.controlRow}>
          <span className={styles.optionLabel}>排序方式：</span>
          <Radio.Group
            value={current.sortDir}
            onChange={(e) => handleSortDirChange(e.target.value)}
            size="small"
            options={SORT_DIR_OPTIONS}
          />
        </div>
      </div>

      <div className={styles.header}>
        <span className={styles.optionLabel}>标签匹配：</span>
        <Radio.Group
          value={current.tagQueryLogicMode}
          onChange={(e) => handleLogicModeChange(e.target.value)}
          size="small"
          options={[
            { label: '包含任意', value: TAG_QUERY_LOGIC_MODE.OR },
            { label: '包含全部', value: TAG_QUERY_LOGIC_MODE.AND },
          ]}
        />
      </div>

      <div className={styles.treeWrapper}>
        <TagTree
          groupId={groupId}
          onSelect={handleTreeSelect}
          editable={false}
          defaultExpandAll={false}
        />
      </div>

      {current.tagIds.length > 0 && (
        <div className={styles.selectedSection}>
          <span className={styles.selectedTitle}>
            已选标签 ({current.tagIds.length})：
          </span>
          <div className={styles.selectedList}>
            {current.tagIds.map((tagId) => (
              <Tag
                key={tagId}
                variant="outlined"
                closable
                onClose={() => handleRemoveTag(tagId)}
                closeIcon={<LuX size={12} />}
                className={styles.tagItem}
              >
                {tagMap.get(tagId) ?? current.tagNames[current.tagIds.indexOf(tagId)] ?? tagId}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileFilter;
export type { FileFilterValue } from './index.type';
