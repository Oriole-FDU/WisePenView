import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Tag, Radio, Select, Spin } from 'antd';
import { LuX, LuPlus } from 'react-icons/lu';
import { useRequest } from 'ahooks';
import { useStickerService } from '@/contexts/ServicesContext';
import { TAG_QUERY_LOGIC_MODE, RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { FileFilterProps, FileFilterValue } from './index.type';
import type { Sticker } from '@/services/Sticker';
import { useAppMessage } from '@/hooks/useAppMessage';
import AddStickerModal from './AddStickerModal';
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

const FileFilter: React.FC<FileFilterProps> = ({ value, onChange }) => {
  const stickerService = useStickerService();
  const message = useAppMessage();
  const [innerValue, setInnerValue] = useState<FileFilterValue>(DEFAULT_VALUE);
  const isControlled = value !== undefined;
  const current = isControlled ? value : innerValue;

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const { loading, run: reloadStickers } = useRequest(async () => stickerService.getStickerList(), {
    refreshDeps: [stickerService],
    onSuccess: (list) => {
      setStickers(list);
    },
    onError: (err) => {
      message.error(parseErrorMessage(err, '获取标签列表失败'));
      setStickers([]);
    },
  });

  const updateValue = useCallback(
    (patch: Partial<FileFilterValue>) => {
      const next = { ...current, ...patch };
      if (!isControlled) setInnerValue(next);
      onChange?.(next);
    },
    [current, isControlled, onChange]
  );

  const handlePickTag = useCallback(
    (tagId: string, tagName: string) => {
      if (current.tagIds.includes(tagId)) return;
      updateValue({
        tagIds: [...current.tagIds, tagId],
        tagNames: [...current.tagNames, tagName],
      });
    },
    [current, updateValue]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      const idx = current.tagIds.indexOf(tagId);
      updateValue({
        tagIds: current.tagIds.filter((id) => id !== tagId),
        tagNames: current.tagNames.filter((_, i) => i !== idx),
      });
    },
    [current, updateValue]
  );

  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectedBar}>
        <span className={styles.selectedBarLabel}>已选标签</span>
        <div className={styles.selectedList}>
          {current.tagIds.length === 0 ? (
            <span className={styles.selectedPlaceholder}>点击下方标签加入筛选</span>
          ) : (
            current.tagIds.map((tagId, i) => (
              <Tag
                key={tagId}
                variant="outlined"
                closable
                onClose={() => handleRemoveTag(tagId)}
                closeIcon={<LuX size={13} />}
                className={styles.selectedTag}
              >
                {current.tagNames[i] ?? tagId}
              </Tag>
            ))
          )}
        </div>
        <div className={styles.selectedMatch}>
          <span className={styles.selectedMatchLabel}>匹配</span>
          <Radio.Group
            value={current.tagQueryLogicMode}
            onChange={(e) => updateValue({ tagQueryLogicMode: e.target.value })}
            size="middle"
            options={[
              { label: '包含任意', value: TAG_QUERY_LOGIC_MODE.OR },
              { label: '包含全部', value: TAG_QUERY_LOGIC_MODE.AND },
            ]}
          />
        </div>
      </div>

      <div className={styles.stickerList}>
        {loading ? (
          <div className={styles.stickerLoading}>
            <Spin size="small" />
          </div>
        ) : (
          <>
            {stickers.map(({ tagId, tagName }) => (
              <Tag
                key={tagId}
                variant="outlined"
                className={clsx(
                  styles.stickerTag,
                  current.tagIds.includes(tagId) && styles.stickerTagPicked
                )}
                onClick={() => handlePickTag(tagId, tagName)}
              >
                {tagName}
              </Tag>
            ))}
            <Tag className={styles.addTag} onClick={() => setAddModalOpen(true)}>
              <LuPlus size={14} />
            </Tag>
          </>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarChunk}>
          <span className={styles.optionLabel}>排序</span>
          <Select
            size="middle"
            value={current.sortBy}
            onChange={(val) => updateValue({ sortBy: val })}
            options={SORT_BY_OPTIONS}
            className={styles.sortSelect}
          />
          <Radio.Group
            value={current.sortDir}
            onChange={(e) => updateValue({ sortDir: e.target.value })}
            size="middle"
            options={SORT_DIR_OPTIONS}
          />
        </div>
      </div>

      <AddStickerModal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onSuccess={() => {
          void reloadStickers();
        }}
      />
    </div>
  );
};

export default FileFilter;
export type { FileFilterValue } from './index.type';
