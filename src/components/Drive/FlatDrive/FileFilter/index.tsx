import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Tag, Radio, Select, Spin, Empty } from 'antd';
import { LuX } from 'react-icons/lu';
import { useTagService } from '@/contexts/ServicesContext';
import { TAG_QUERY_LOGIC_MODE, RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { FileFilterProps, FileFilterValue } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
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

const toPoolItems = (
  flat: { tagId: string; tagName?: string }[]
): { tagId: string; tagName: string }[] =>
  flat
    .filter((n) => n.tagId && (n.tagName ?? '').trim())
    .map((n) => ({ tagId: n.tagId, tagName: (n.tagName ?? '').trim() }));

const FileFilter: React.FC<FileFilterProps> = ({ groupId, value, onChange }) => {
  const tagService = useTagService();
  const message = useAppMessage();
  const [innerValue, setInnerValue] = useState<FileFilterValue>(DEFAULT_VALUE);
  const isControlled = value !== undefined;
  const current = isControlled ? value : innerValue;

  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map());
  const [poolTags, setPoolTags] = useState<{ tagId: string; tagName: string }[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPoolLoading(true);
      try {
        const list = await tagService.getFlatTagTree(groupId ? { groupId } : undefined);
        if (!cancelled) setPoolTags(toPoolItems(list));
      } catch (err) {
        if (!cancelled) {
          message.error(parseErrorMessage(err, '获取标签列表失败'));
          setPoolTags([]);
        }
      } finally {
        if (!cancelled) setPoolLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, tagService, message]);

  const updateValue = useCallback(
    (next: FileFilterValue) => {
      if (!isControlled) setInnerValue(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const handlePickTag = useCallback(
    (tagId: string, tagName: string) => {
      if (current.tagIds.includes(tagId)) return;
      setTagMap((prev) => new Map(prev).set(tagId, tagName));
      updateValue({
        ...current,
        tagIds: [...current.tagIds, tagId],
        tagNames: [...current.tagNames, tagName],
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
      <div className={styles.selectedBar}>
        <span className={styles.selectedBarLabel}>已选标签</span>
        <div className={styles.selectedList}>
          {current.tagIds.length === 0 ? (
            <span className={styles.selectedPlaceholder}>点击下方标签加入筛选</span>
          ) : (
            current.tagIds.map((tagId) => (
              <Tag
                key={tagId}
                variant="outlined"
                closable
                onClose={() => handleRemoveTag(tagId)}
                closeIcon={<LuX size={13} />}
                className={styles.selectedTag}
              >
                {tagMap.get(tagId) ?? current.tagNames[current.tagIds.indexOf(tagId)] ?? tagId}
              </Tag>
            ))
          )}
        </div>
        <div className={styles.selectedMatch}>
          <span className={styles.selectedMatchLabel}>匹配</span>
          <Radio.Group
            value={current.tagQueryLogicMode}
            onChange={(e) => handleLogicModeChange(e.target.value)}
            size="middle"
            options={[
              { label: '包含任意', value: TAG_QUERY_LOGIC_MODE.OR },
              { label: '包含全部', value: TAG_QUERY_LOGIC_MODE.AND },
            ]}
          />
        </div>
      </div>

      <div className={styles.tagPool}>
        {poolLoading ? (
          <div className={styles.poolLoading}>
            <Spin size="small" />
          </div>
        ) : poolTags.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无标签"
            className={styles.poolEmpty}
          />
        ) : (
          poolTags.map(({ tagId, tagName }) => {
            const picked = current.tagIds.includes(tagId);
            return (
              <Tag
                key={tagId}
                variant="outlined"
                className={clsx(styles.poolTag, picked && styles.poolTagPicked)}
                role="button"
                tabIndex={picked ? -1 : 0}
                onClick={() => {
                  if (!picked) handlePickTag(tagId, tagName);
                }}
                onKeyDown={(e) => {
                  if (picked) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePickTag(tagId, tagName);
                  }
                }}
              >
                {tagName}
              </Tag>
            );
          })
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarChunk}>
          <span className={styles.optionLabel}>排序</span>
          <Select
            size="middle"
            value={current.sortBy}
            onChange={handleSortByChange}
            options={SORT_BY_OPTIONS}
            className={styles.sortSelect}
          />
          <Radio.Group
            value={current.sortDir}
            onChange={(e) => handleSortDirChange(e.target.value)}
            size="middle"
            options={SORT_DIR_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
};

export default FileFilter;
export type { FileFilterValue } from './index.type';
