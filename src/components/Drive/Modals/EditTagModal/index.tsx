import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button, Tag, message } from 'antd';
import { LuX } from 'react-icons/lu';
import { useResourceService, useTagService } from '@/contexts/ServicesContext';
import type { TagTreeNode } from '@/services/Tag';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import TagTree from '@/components/Common/TagTree';
import type { EditTagModalProps } from './index.type';
import styles from './index.module.less';

/** 递归收集 tagName -> tagId 映射 */
const buildTagNameToIdMap = (nodes: TagTreeNode[], map: Map<string, string>): void => {
  for (const n of nodes) {
    const name = (n.tagName ?? '').trim();
    if (name) map.set(name, n.tagId);
    if (n.children?.length) buildTagNameToIdMap(n.children, map);
  }
};

const EditTagModal: React.FC<EditTagModalProps> = ({
  open,
  onCancel,
  onSuccess,
  file,
  groupId,
}) => {
  const resourceService = useResourceService();
  const tagService = useTagService();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const initFromFile = useCallback(async () => {
    if (!file || !open) return;
    setInitDone(false);
    try {
      const userTagTree = await tagService.getTagTree(groupId ? { groupId } : undefined);
      const nameToId = new Map<string, string>();
      buildTagNameToIdMap(userTagTree, nameToId);
      setTagMap(nameToId);

      const existingNames = file.tagNames ?? [];
      const resolved: { tagId: string; tagName: string }[] = [];
      for (const name of existingNames) {
        const id = nameToId.get(name);
        if (id) resolved.push({ tagId: id, tagName: name });
      }
      setTagIds(resolved.map((r) => r.tagId));
      setTagNames(resolved.map((r) => r.tagName));
    } catch {
      setTagIds([]);
      setTagNames([]);
    } finally {
      setInitDone(true);
    }
  }, [file, open, groupId, tagService]);

  useEffect(() => {
    if (open && file) {
      initFromFile();
    }
  }, [open, file, initFromFile]);

  const reset = useCallback(() => {
    setTagIds([]);
    setTagNames([]);
    setTagMap(new Map());
    setInitDone(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleTreeSelect = useCallback(
    (node: TagTreeNode | null) => {
      if (!node?.tagId) return;
      const { tagId, tagName } = node;
      const name = (tagName ?? tagId).trim();
      if (tagIds.includes(tagId)) return;
      setTagMap((prev) => new Map(prev).set(tagId, name));
      setTagIds((prev) => [...prev, tagId]);
      setTagNames((prev) => [...prev, name]);
    },
    [tagIds]
  );

  const handleRemoveTag = useCallback(
    (tagId: string): void => {
      const idx = tagIds.indexOf(tagId);
      setTagIds((prev) => prev.filter((id) => id !== tagId));
      setTagNames((prev) => prev.filter((_, i) => i !== idx));
    },
    [tagIds]
  );

  const handleSubmit = async () => {
    if (!file) return;
    try {
      setLoading(true);
      await resourceService.updateResourceTags({
        resourceId: file.resourceId,
        tagIds,
        ...(groupId ? { groupId } : {}),
      });
      message.success('标签已更新');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '更新标签失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Modal
      title="编辑标签"
      open={open && !!file}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!initDone}
        >
          确定
        </Button>,
      ]}
      width={400}
    >
      <div className={styles.wrapper}>
        <div className={styles.treeWrapper}>
          <TagTree
            groupId={groupId}
            editable={false}
            onSelect={handleTreeSelect}
            defaultExpandAll={false}
          />
        </div>

        {tagIds.length > 0 && (
          <div className={styles.selectedSection}>
            <span className={styles.selectedTitle}>已选标签 ({tagIds.length})：</span>
            <div className={styles.selectedList}>
              {tagIds.map((tagId) => (
                <Tag
                  key={tagId}
                  variant="outlined"
                  closable
                  onClose={() => handleRemoveTag(tagId)}
                  closeIcon={<LuX size={12} />}
                  className={styles.tagItem}
                >
                  {tagMap.get(tagId) ?? tagNames[tagIds.indexOf(tagId)] ?? tagId}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditTagModal;
