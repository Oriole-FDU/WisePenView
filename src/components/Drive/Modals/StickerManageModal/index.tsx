import ConfirmAction from '@/components/Common/ConfirmAction';
import IconText from '@/components/Common/IconText';
import { useStickerService } from '@/domains';
import type { Sticker } from '@/domains/Sticker';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { StickerManageModalProps } from './index.type';
import styles from './style.module.less';

function StickerManageModal({ isOpen, onOpenChange, onSuccess }: StickerManageModalProps) {
  const stickerService = useStickerService();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [editName, setEditName] = useState('');
  const [addName, setAddName] = useState('');
  const { run: runFetchStickers } = useRequest(() => stickerService.getStickerList(), {
    manual: true,
    onSuccess: (list) => {
      setStickers(list);
    },
    onError: (err) => {
      toast.danger(parseErrorMessage(err));
      setStickers([]);
    },
  });

  const { loading: updateLoading, run: runUpdateSticker } = useRequest(
    async (trimmed: string) =>
      stickerService.updateSticker({
        stickerId: selectedSticker!.tagId,
        stickerName: trimmed,
      }),
    {
      manual: true,
      onSuccess: (_, [trimmed]) => {
        toast.success('标签已更新');
        const updated = { ...selectedSticker!, tagName: trimmed };
        setStickers((prev) => prev.map((s) => (s.tagId === updated.tagId ? updated : s)));
        setSelectedSticker(updated);
        onSuccess?.();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: deleteLoading, run: runDeleteSticker } = useRequest(
    async () => stickerService.deleteSticker({ stickerId: selectedSticker!.tagId }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('标签已删除');
        setStickers((prev) => prev.filter((s) => s.tagId !== selectedSticker!.tagId));
        setSelectedSticker(null);
        setEditName('');
        onSuccess?.();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: addLoading, run: runAddSticker } = useRequest(
    async (trimmed: string) => stickerService.addSticker({ stickerName: trimmed }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('标签已创建');
        void runFetchStickers();
        setAddName('');
        onSuccess?.();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const isBusy = updateLoading || deleteLoading || addLoading;

  // TODO: refactor
  useEffectForce(() => {
    if (!isOpen) return;
    void runFetchStickers();
  }, [isOpen, runFetchStickers]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isBusy) return;
      setSelectedSticker(null);
      setEditName('');
      setAddName('');
      onOpenChange(false);
    }
  };

  const handleSelect = (sticker: Sticker) => {
    setSelectedSticker((prev) => {
      if (prev?.tagId === sticker.tagId) {
        setEditName('');
        return null;
      }
      setEditName(sticker.tagName);
      return sticker;
    });
  };

  const handleUpdate = async () => {
    if (!selectedSticker) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.warning('请输入标签名称');
      return;
    }
    if (trimmed.startsWith('/')) {
      toast.warning('标签名称不能以 / 开头');
      return;
    }
    await runUpdateSticker(trimmed);
  };

  const handleDelete = async () => {
    if (!selectedSticker) return;
    await runDeleteSticker();
  };

  const handleAdd = async () => {
    const trimmed = addName.trim();
    if (!trimmed) {
      toast.warning('请输入标签名称');
      return;
    }
    if (trimmed.startsWith('/')) {
      toast.warning('标签名称不能以 / 开头');
      return;
    }
    await runAddSticker(trimmed);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!isBusy}>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>管理标签</Modal.Heading>
            </Modal.Header>
            <Modal.Body className={styles.modalBody}>
              <div className={styles.split}>
                <div className={styles.listPane}>
                  <div className={styles.listPaneTitle}>全部标签</div>
                  <div className={styles.stickerList}>
                    {stickers.map((sticker) => (
                      <Chip
                        key={sticker.tagId}
                        size="sm"
                        variant="tertiary"
                        className={clsx(
                          styles.stickerTag,
                          selectedSticker?.tagId === sticker.tagId && styles.stickerTagSelected
                        )}
                        onClick={() => handleSelect(sticker)}
                      >
                        <Chip.Label>{sticker.tagName}</Chip.Label>
                      </Chip>
                    ))}
                    {stickers.length === 0 && (
                      <span className={styles.emptyHint}>暂无标签，在右侧创建</span>
                    )}
                  </div>
                </div>

                <div className={styles.detailPane}>
                  {selectedSticker ? (
                    <div className={styles.form}>
                      <div className={styles.sectionTitle}>编辑标签</div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>标签名称</label>
                        <TextField aria-label="标签名称" value={editName} onChange={setEditName}>
                          <Input placeholder="请输入标签名称" />
                        </TextField>
                      </div>
                      <div className={styles.formActions}>
                        <Button
                          variant="secondary"
                          onPress={() => void handleUpdate()}
                          isDisabled={updateLoading}
                        >
                          保存修改
                        </Button>
                        <ConfirmAction
                          title="确定删除该标签？"
                          confirmText="删除"
                          isDisabled={deleteLoading}
                          isLoading={deleteLoading}
                          onConfirm={() => void handleDelete()}
                        >
                          <button type="button" className={styles.deleteButton}>
                            删除
                          </button>
                        </ConfirmAction>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.emptyDetail}>
                      <p className={styles.emptyHint}>点击左侧标签进行编辑，或创建新标签</p>
                      <div className={styles.addForm}>
                        <TextField aria-label="标签名称" value={addName} onChange={setAddName}>
                          <Input placeholder="请输入标签名称" />
                        </TextField>
                        <Button
                          variant="secondary"
                          onPress={() => void handleAdd()}
                          isDisabled={addLoading}
                          style={{ marginTop: 12 }}
                        >
                          <IconText icon={<Plus />} iconSize={16}>
                            新建标签
                          </IconText>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default StickerManageModal;
