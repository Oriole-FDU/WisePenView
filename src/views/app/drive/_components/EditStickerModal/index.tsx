import { Spin } from '@/components/Common/Feedback';
import { useStickerService } from '@/domains';
import type { Sticker } from '@/domains/Sticker';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, Modal, Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import AddStickerModal from '../AddStickerModal';
import styles from './index.module.less';
import type { EditStickerModalProps } from './index.type';

function EditStickerModal({ isOpen, onOpenChange, onSuccess, file }: EditStickerModalProps) {
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
      ready: Boolean(isOpen && file),
      refreshDeps: [isOpen, file, stickerService],
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
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleToggle = (tagId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddSuccess = () => {
    void (async () => {
      try {
        const list = await stickerService.getStickerList();
        setStickers(list);
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
  };

  const { unselected, selected } = useMemo(() => {
    const idSet = new Set(selectedIds);
    return {
      unselected: stickers.filter((s) => !idSet.has(s.tagId)),
      selected: stickers.filter((s) => idSet.has(s.tagId)),
    };
  }, [stickers, selectedIds]);

  const handleSubmit = async () => {
    if (!file?.resourceId) return;
    await runUpdateStickers();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && submitLoading) return;
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Modal isOpen={isOpen && !!file} onOpenChange={handleOpenChange}>
        <Modal.Backdrop isDismissable={!submitLoading}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>编辑标签</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className={styles.wrapper}>
                  {stickerLoading ? (
                    <div className={styles.stickerLoading}>
                      <Spin size="small" />
                    </div>
                  ) : (
                    <>
                      <div className={styles.stickerList}>
                        {unselected.map(({ tagId, tagName }) => (
                          <Chip
                            key={tagId}
                            variant="secondary"
                            className={styles.stickerTag}
                            onClick={() => handleToggle(tagId)}
                          >
                            {tagName}
                          </Chip>
                        ))}
                        {stickers.length > 0 && unselected.length === 0 && (
                          <span className={styles.allPickedHint}>所有标签均已选中</span>
                        )}
                        <Chip
                          className={styles.addTag}
                          variant="secondary"
                          onClick={() => setAddModalOpen(true)}
                        >
                          <Plus size={14} />
                        </Chip>
                      </div>

                      {selected.length > 0 && (
                        <>
                          <Separator />
                          <div className={styles.stickerList}>
                            {selected.map(({ tagId, tagName }) => (
                              <Chip
                                key={tagId}
                                className={clsx(styles.stickerTag, styles.stickerTagPicked)}
                                variant="secondary"
                                onClick={() => handleToggle(tagId)}
                              >
                                {tagName}
                              </Chip>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => onOpenChange(false)}
                  isDisabled={submitLoading}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSubmit()}
                  isDisabled={submitLoading || stickerLoading}
                >
                  确定
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
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
