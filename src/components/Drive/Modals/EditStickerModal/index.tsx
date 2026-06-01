import AddStickerModal from '@/components/Drive/FlatDrive/FileFilter/AddStickerModal';
import { useStickerService } from '@/domains';
import type { Sticker } from '@/domains/Sticker';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Divider, Modal, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import styles from './index.module.less';
import type { EditStickerModalProps } from './index.type';

function EditStickerModal({ open, onCancel, onSuccess, file }: EditStickerModalProps) {
  const stickerService = useStickerService();
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
        toast.danger(parseErrorMessage(err));
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
        toast.success('标签已更新');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
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
        toast.danger(parseErrorMessage(err));
      }
    })();
  }, [stickerService]);

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
        isOpen={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}

export default EditStickerModal;
