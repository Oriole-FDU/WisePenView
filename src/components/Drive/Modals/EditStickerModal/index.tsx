import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Modal, Tag, Spin, Divider } from 'antd';
import { useRequest } from 'ahooks';
import { LuPlus } from 'react-icons/lu';
import { useStickerService } from '@/contexts/ServicesContext';
import type { Sticker } from '@/services/Sticker';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import AddStickerModal from '@/components/Drive/FlatDrive/FileFilter/AddStickerModal';
import type { EditStickerModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import styles from './index.module.less';

const EditStickerModal: React.FC<EditStickerModalProps> = ({ open, onCancel, onSuccess, file }) => {
  const stickerService = useStickerService();
  const message = useAppMessage();

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { loading: stickerLoading } = useRequest(
    async () => {
      if (!file) return null;
      const list = await stickerService.getStickerList();
      return { list, currentFile: file };
    },
    {
      ready: Boolean(open && file),
      refreshDeps: [open, file, stickerService],
      onSuccess: (res) => {
        if (!res) return;
        const { list, currentFile } = res;
        setStickers(list);
        const initial = currentFile.currentTags ? Object.keys(currentFile.currentTags) : [];
        setSelectedIds(initial);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取标签列表失败'));
        setStickers([]);
        setSelectedIds([]);
      },
    }
  );

  const { loading: submitLoading, run: runUpdateStickers } = useRequest(
    async () =>
      stickerService.updateResourceStickers({
        resourceId: file!.resourceId!,
        stickerIds: selectedIds,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success('标签已更新');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '更新标签失败'));
      },
    }
  );

  const handleToggle = useCallback((tagId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddSuccess = useCallback(() => {
    void (async () => {
      try {
        const list = await stickerService.getStickerList();
        setStickers(list);
      } catch (err) {
        message.error(parseErrorMessage(err, '获取标签列表失败'));
      }
    })();
  }, [stickerService, message]);

  const { unselected, selected } = useMemo(() => {
    const idSet = new Set(selectedIds);
    return {
      unselected: stickers.filter((s) => !idSet.has(s.tagId)),
      selected: stickers.filter((s) => idSet.has(s.tagId)),
    };
  }, [stickers, selectedIds]);

  const handleSubmit = useCallback(async () => {
    if (!file?.resourceId) return;
    await runUpdateStickers();
  }, [file, runUpdateStickers]);

  return (
    <>
      <Modal
        title="编辑标签"
        open={open && !!file}
        onOk={handleSubmit}
        onCancel={onCancel}
        confirmLoading={submitLoading}
        okButtonProps={{ disabled: stickerLoading }}
        destroyOnHidden
        width={400}
      >
        <div className={styles.wrapper}>
          {stickerLoading ? (
            <div className={styles.stickerLoading}>
              <Spin size="small" />
            </div>
          ) : (
            <>
              <div className={styles.stickerList}>
                {unselected.map(({ tagId, tagName }) => (
                  <Tag
                    key={tagId}
                    variant="outlined"
                    className={styles.stickerTag}
                    onClick={() => handleToggle(tagId)}
                  >
                    {tagName}
                  </Tag>
                ))}
                {stickers.length > 0 && unselected.length === 0 && (
                  <span className={styles.allPickedHint}>所有标签均已选中</span>
                )}
                <Tag className={styles.addTag} onClick={() => setAddModalOpen(true)}>
                  <LuPlus size={14} />
                </Tag>
              </div>

              {selected.length > 0 && (
                <>
                  <Divider />
                  <div className={styles.stickerList}>
                    {selected.map(({ tagId, tagName }) => (
                      <Tag
                        key={tagId}
                        variant="outlined"
                        className={clsx(styles.stickerTag, styles.stickerTagPicked)}
                        onClick={() => handleToggle(tagId)}
                      >
                        {tagName}
                      </Tag>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>

      <AddStickerModal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
};

export default EditStickerModal;
