import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Modal, Button, Input, Popconfirm, Tag } from 'antd';
import { useRequest } from 'ahooks';
import { LuPlus } from 'react-icons/lu';
import { useStickerService } from '@/contexts/ServicesContext';
import type { Sticker } from '@/services/Sticker';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { StickerManageModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import styles from './style.module.less';

const StickerManageModal: React.FC<StickerManageModalProps> = ({ open, onCancel }) => {
  const stickerService = useStickerService();
  const message = useAppMessage();

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
      message.error(parseErrorMessage(err, '获取标签列表失败'));
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
        message.success('标签已更新');
        const updated = { ...selectedSticker!, tagName: trimmed };
        setStickers((prev) => prev.map((s) => (s.tagId === updated.tagId ? updated : s)));
        setSelectedSticker(updated);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '更新标签失败'));
      },
    }
  );

  const { loading: deleteLoading, run: runDeleteSticker } = useRequest(
    async () => stickerService.deleteSticker({ stickerId: selectedSticker!.tagId }),
    {
      manual: true,
      onSuccess: () => {
        message.success('标签已删除');
        setStickers((prev) => prev.filter((s) => s.tagId !== selectedSticker!.tagId));
        setSelectedSticker(null);
        setEditName('');
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '删除标签失败'));
      },
    }
  );

  const { loading: addLoading, run: runAddSticker } = useRequest(
    async (trimmed: string) => stickerService.addSticker({ stickerName: trimmed }),
    {
      manual: true,
      onSuccess: () => {
        message.success('标签已创建');
        void runFetchStickers();
        setAddName('');
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '创建标签失败'));
      },
    }
  );

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        void runFetchStickers();
        return;
      }
      setSelectedSticker(null);
      setEditName('');
      setAddName('');
    },
    [runFetchStickers]
  );

  const handleSelect = useCallback((sticker: Sticker) => {
    setSelectedSticker((prev) => {
      if (prev?.tagId === sticker.tagId) {
        setEditName('');
        return null;
      }
      setEditName(sticker.tagName);
      return sticker;
    });
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selectedSticker) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      message.warning('请输入标签名称');
      return;
    }
    if (trimmed.startsWith('/')) {
      message.warning('标签名称不能以 / 开头');
      return;
    }
    await runUpdateSticker(trimmed);
  }, [selectedSticker, editName, runUpdateSticker, message]);

  const handleDelete = useCallback(async () => {
    if (!selectedSticker) return;
    await runDeleteSticker();
  }, [selectedSticker, runDeleteSticker]);

  const handleAdd = useCallback(async () => {
    const trimmed = addName.trim();
    if (!trimmed) {
      message.warning('请输入标签名称');
      return;
    }
    if (trimmed.startsWith('/')) {
      message.warning('标签名称不能以 / 开头');
      return;
    }
    await runAddSticker(trimmed);
  }, [addName, runAddSticker, message]);

  return (
    <Modal
      title="管理标签"
      open={open}
      onCancel={onCancel}
      afterOpenChange={handleOpenChange}
      footer={null}
      width={640}
      destroyOnHidden
      classNames={{ body: styles.modalBody }}
    >
      <div className={styles.split}>
        <div className={styles.listPane}>
          <div className={styles.listPaneTitle}>全部标签</div>
          <div className={styles.stickerList}>
            {stickers.map((sticker) => (
              <Tag
                key={sticker.tagId}
                variant="outlined"
                className={clsx(
                  styles.stickerTag,
                  selectedSticker?.tagId === sticker.tagId && styles.stickerTagSelected
                )}
                onClick={() => handleSelect(sticker)}
              >
                {sticker.tagName}
              </Tag>
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
                <Input
                  placeholder="请输入标签名称"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className={styles.formActions}>
                <Button type="default" onClick={() => void handleUpdate()} loading={updateLoading}>
                  保存修改
                </Button>
                <Popconfirm title="确定删除该标签？" onConfirm={() => void handleDelete()}>
                  <Button danger loading={deleteLoading}>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ) : (
            <div className={styles.emptyDetail}>
              <p className={styles.emptyHint}>点击左侧标签进行编辑，或创建新标签</p>
              <div className={styles.addForm}>
                <Input
                  placeholder="请输入标签名称"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
                <Button
                  type="default"
                  icon={<LuPlus />}
                  onClick={() => void handleAdd()}
                  loading={addLoading}
                  style={{ marginTop: 12 }}
                >
                  新建标签
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StickerManageModal;
