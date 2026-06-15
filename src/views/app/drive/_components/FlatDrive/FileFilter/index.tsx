import { Spin } from '@/components/Common/Feedback';
import IconText from '@/components/Common/IconText';
import SegmentedTabs from '@/components/Common/SegmentedTabs';
import StickerManageModal from '@/components/Drive/Modals/StickerManageModal';
import { useStickerService } from '@/domains';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import type { Sticker } from '@/domains/Sticker';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, ListBox, Select, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Plus, Tags, X } from 'lucide-react';
import { useState } from 'react';
import AddStickerModal from '../../AddStickerModal';
import type { FileFilterProps, FileFilterValue } from './index.type';
import styles from './style.module.less';

const DEFAULT_VALUE: FileFilterValue = {
  tagIds: [],
  tagNames: [],
  tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
  sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
  sortDir: RESOURCE_SORT_DIR.DESC,
};

function FileFilter({ value, onChange }: FileFilterProps) {
  const stickerService = useStickerService();
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
      toast.danger(parseErrorMessage(err));
      setStickers([]);
    },
  });

  const updateValue = (patch: Partial<FileFilterValue>) => {
    const next = { ...current, ...patch };
    if (!isControlled) setInnerValue(next);
    onChange?.(next);
  };

  const handlePickTag = (tagId: string, tagName: string) => {
    if (current.tagIds.includes(tagId)) return;
    updateValue({
      tagIds: [...current.tagIds, tagId],
      tagNames: [...current.tagNames, tagName],
    });
  };

  const handleRemoveTag = (tagId: string) => {
    const idx = current.tagIds.indexOf(tagId);
    updateValue({
      tagIds: current.tagIds.filter((id) => id !== tagId),
      tagNames: current.tagNames.filter((_, i) => i !== idx),
    });
  };

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [stickerManageModalOpen, setStickerManageModalOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectedBar}>
        <span className={styles.selectedBarLabel}>已选标签</span>
        <div className={styles.selectedList}>
          {current.tagIds.length === 0 ? (
            <span className={styles.selectedPlaceholder}>点击下方标签加入筛选</span>
          ) : (
            current.tagIds.map((tagId, i) => (
              <Chip key={tagId} variant="secondary" className={styles.selectedTag}>
                {current.tagNames[i] ?? tagId}
                <button
                  type="button"
                  aria-label={`移除标签 ${current.tagNames[i] ?? tagId}`}
                  className={styles.selectedTagClose}
                  onClick={() => handleRemoveTag(tagId)}
                >
                  <X size={13} />
                </button>
              </Chip>
            ))
          )}
        </div>
        <div className={styles.selectedMatch}>
          <span className={styles.selectedMatchLabel}>匹配</span>
          <SegmentedTabs
            ariaLabel="标签匹配方式"
            size="sm"
            items={TAG_QUERY_LOGIC_MODE.options.map((item) => ({
              key: item.value,
              label: item.label,
            }))}
            selectedKey={current.tagQueryLogicMode}
            onSelectionChange={(tagQueryLogicMode) => updateValue({ tagQueryLogicMode })}
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
              <Chip
                key={tagId}
                variant="secondary"
                className={clsx(
                  styles.stickerTag,
                  current.tagIds.includes(tagId) && styles.stickerTagPicked
                )}
                onClick={() => handlePickTag(tagId, tagName)}
              >
                {tagName}
              </Chip>
            ))}
            <Chip
              className={styles.addTag}
              variant="secondary"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={14} />
            </Chip>
          </>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.optionLabel}>排序</span>
          <Select
            aria-label="排序字段"
            value={current.sortBy}
            onChange={(val) => {
              if (val == null || Array.isArray(val)) return;
              updateValue({ sortBy: val as FileFilterValue['sortBy'] });
            }}
            className={styles.sortSelect}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {RESOURCE_SORT_BY.options.map((item) => (
                  <ListBox.Item key={item.key} id={item.value} textValue={item.label}>
                    {item.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <SegmentedTabs
            ariaLabel="排序方向"
            size="sm"
            items={RESOURCE_SORT_DIR.options.map((item) => ({
              key: item.value,
              label: item.label,
            }))}
            selectedKey={current.sortDir}
            onSelectionChange={(sortDir) => updateValue({ sortDir })}
          />
        </div>
        <div className={styles.toolbarRight}>
          <Button variant="secondary" onPress={() => setStickerManageModalOpen(true)}>
            <IconText icon={<Tags />} iconSize={16}>
              管理标签
            </IconText>
          </Button>
        </div>
      </div>

      <AddStickerModal
        isOpen={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => {
          void reloadStickers();
        }}
      />
      <StickerManageModal
        isOpen={stickerManageModalOpen}
        onOpenChange={setStickerManageModalOpen}
        onSuccess={() => {
          void reloadStickers();
        }}
      />
    </div>
  );
}

export default FileFilter;
export type { FileFilterValue } from './index.type';
