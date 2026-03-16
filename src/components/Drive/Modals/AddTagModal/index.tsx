import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, Tree, Spin, message, Tag } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useTagService, useResourceService } from '@/contexts/ServicesContext';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { AddTagModalProps } from './index.type';

import styles from './index.module.less';

function tagTreeToDataNodes(nodes: TagTreeNode[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.tagId,
    title: (
      <Tag className={styles.tagLabel} variant="outlined">
        {node.tagName || '未命名'}
      </Tag>
    ),
    children: node.children?.length ? tagTreeToDataNodes(node.children) : undefined,
    isLeaf: !node.children?.length,
  }));
}

const AddTagModal: React.FC<AddTagModalProps> = ({ open, onCancel, onSuccess, target }) => {
  const tagService = useTagService();
  const resourceService = useResourceService();
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);

  const isFile = target?.type === 'file';
  const resourceId = isFile ? target.data.resourceId : undefined;

  const fetchTagTree = useCallback(async () => {
    setLoading(true);
    try {
      const nodes = await tagService.getTagTree();
      setTreeData(tagTreeToDataNodes(nodes));
    } catch (err) {
      message.error(parseErrorMessage(err, '获取标签树失败'));
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [tagService]);

  useEffect(() => {
    if (open) {
      setCheckedKeys([]);
      fetchTagTree();
    }
  }, [open, fetchTagTree]);

  const handleSubmit = async () => {
    if (!resourceId || checkedKeys.length === 0) {
      if (checkedKeys.length === 0) message.warning('请至少选择一个标签');
      return;
    }
    try {
      setSubmitLoading(true);
      await resourceService.updateResourceTags({
        resourceId,
        tagIds: checkedKeys as string[],
      });
      message.success('已添加标签');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '添加标签失败'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    setCheckedKeys([]);
    onCancel();
  };

  return (
    <Modal
      title="添加标签"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={submitLoading}
          disabled={!isFile || checkedKeys.length === 0}
        >
          确定
        </Button>,
      ]}
      width={400}
    >
      {!isFile && target != null && <div className={styles.hint}>仅支持为文件添加标签</div>}
      {loading ? (
        <div className={styles.spinWrap}>
          <Spin />
        </div>
      ) : (
        <Tree
          checkable
          checkStrictly
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? keys : keys.checked)}
          className={styles.tree}
          blockNode
        />
      )}
    </Modal>
  );
};

export default AddTagModal;
