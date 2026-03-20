import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button, Form, Input, Popconfirm, Divider } from 'antd';
import { LuPlus } from 'react-icons/lu';
import TreeNav from '@/components/Common/TreeNav';
import { useTagService } from '@/contexts/ServicesContext';
import type { TagCreateRequest, TagUpdateRequest, TagTreeNode } from '@/services/Tag';
import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { TagManageModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import styles from './style.module.less';

const { TextArea } = Input;

function withGroupId<T extends Record<string, unknown>>(
  payload: T,
  gid: string | undefined
): T & { groupId?: string } {
  return gid ? { ...payload, groupId: gid } : payload;
}

const TagManageModal: React.FC<TagManageModalProps> = ({ open, onCancel, groupId }) => {
  const tagService = useTagService();
  const message = useAppMessage();
  const [selectedTag, setSelectedTag] = useState<TagTreeNode | null>(null);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  const [addRootModalOpen, setAddRootModalOpen] = useState(false);
  const [addRootLoading, setAddRootLoading] = useState(false);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addRootForm] = Form.useForm<Pick<TagCreateRequest, 'tagName' | 'tagDesc'>>();
  const [editForm] = Form.useForm<Pick<TagUpdateRequest, 'tagName' | 'tagDesc'>>();
  const [addChildForm] = Form.useForm<Pick<TagCreateRequest, 'tagName' | 'tagDesc'>>();

  const bumpTree = useCallback(() => {
    setTreeRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedTag(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedTag) {
      editForm.setFieldsValue({
        tagName: selectedTag.tagName ?? '',
        tagDesc: selectedTag.tagDesc ?? '',
      });
    } else {
      editForm.resetFields();
    }
  }, [selectedTag, editForm]);

  const handleTreeSelect = useCallback(
    (item: { type: 'file'; data: ResourceItem } | { type: 'folder'; data: Folder } | null) => {
      if (item === null) {
        setSelectedTag(null);
        return;
      }
      if (item.type !== 'folder') return;
      setSelectedTag(item.data as TagTreeNode);
    },
    []
  );

  const handleAddRoot = async () => {
    try {
      const values = await addRootForm.validateFields();
      setAddRootLoading(true);
      await tagService.addTag(
        withGroupId({ tagName: values.tagName, tagDesc: values.tagDesc }, groupId)
      );
      message.success('标签已创建');
      addRootForm.resetFields();
      setAddRootModalOpen(false);
      bumpTree();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      message.error(parseErrorMessage(err, '创建标签失败'));
    } finally {
      setAddRootLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTag?.tagId) return;
    try {
      const values = await editForm.validateFields();
      setUpdateLoading(true);
      await tagService.updateTag(
        withGroupId(
          {
            targetTagId: selectedTag.tagId,
            tagName: values.tagName ?? '',
            tagDesc: values.tagDesc,
          },
          groupId
        )
      );
      message.success('标签已更新');
      bumpTree();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      message.error(parseErrorMessage(err, '更新标签失败'));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag?.tagId) return;
    try {
      setDeleteLoading(true);
      await tagService.deleteTag(withGroupId({ targetTagId: selectedTag.tagId }, groupId));
      message.success('标签已删除');
      setSelectedTag(null);
      bumpTree();
    } catch (err) {
      message.error(parseErrorMessage(err, '删除标签失败'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!selectedTag?.tagId) return;
    try {
      const values = await addChildForm.validateFields();
      setAddChildLoading(true);
      await tagService.addTag(
        withGroupId(
          {
            tagName: values.tagName,
            parentId: selectedTag.tagId,
            tagDesc: values.tagDesc,
          },
          groupId
        )
      );
      message.success('子标签已添加');
      addChildForm.resetFields();
      setAddChildModalOpen(false);
      bumpTree();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      message.error(parseErrorMessage(err, '添加子标签失败'));
    } finally {
      setAddChildLoading(false);
    }
  };

  return (
    <Modal
      title="管理标签"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={960}
      destroyOnHidden
      classNames={{ body: styles.modalBody }}
    >
      <div className={styles.embed}>
        <div className={styles.split}>
          <div className={styles.treePane}>
            <div className={styles.treePaneHeader}>
              <div className={styles.treePaneTitle}>标签树</div>
              {selectedTag ? (
                <Button type="link" size="small" onClick={() => setSelectedTag(null)}>
                  取消选择
                </Button>
              ) : null}
            </div>
            <div className={styles.treeNavHost}>
              <TreeNav
                mode="tag"
                tagTreeGroupId={groupId}
                tagTreeDraggable
                tagTreeRefreshTrigger={treeRefreshKey}
                tagSelectionControlled
                tagSelectedKey={selectedTag?.tagId ?? null}
                showNewFolderButton={false}
                embedMode
                onSelect={handleTreeSelect}
                className={styles.treeNavFill}
              />
            </div>
          </div>
          <div className={styles.detailPane}>
            {!selectedTag ? (
              <div className={styles.nodeDetailEmpty}>
                <p className={styles.emptyHint}>
                  左侧拖拽调整层级；点击节点后在右侧编辑，或新建标签
                </p>
                <Button type="primary" onClick={() => setAddRootModalOpen(true)} icon={<LuPlus />}>
                  新建标签
                </Button>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.sectionTitle}>标签信息</div>
                <Form form={editForm} layout="vertical">
                  <Form.Item
                    label="标签名称"
                    name="tagName"
                    rules={[{ required: true, message: '请输入标签名称' }]}
                  >
                    <Input placeholder="请输入标签名称" />
                  </Form.Item>
                  <Form.Item label="标签描述" name="tagDesc">
                    <TextArea rows={4} placeholder="请输入标签描述（可选）" />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={() => void handleUpdate()}
                      loading={updateLoading}
                    >
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
                <Divider />
                <div className={styles.sectionTitle}>节点操作</div>
                <div className={styles.nodeActions}>
                  <Button
                    onClick={() => {
                      addChildForm.resetFields();
                      setAddChildModalOpen(true);
                    }}
                  >
                    添加子节点
                  </Button>
                  <Popconfirm
                    title="确定删除该标签及其所有子标签？"
                    onConfirm={() => void handleDelete()}
                  >
                    <Button danger loading={deleteLoading}>
                      删除节点
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            )}
          </div>
        </div>

        <Modal
          title="新建标签"
          open={addRootModalOpen}
          onCancel={() => {
            setAddRootModalOpen(false);
            addRootForm.resetFields();
          }}
          onOk={() => void handleAddRoot()}
          confirmLoading={addRootLoading}
          destroyOnHidden
        >
          <Form form={addRootForm} layout="vertical">
            <Form.Item
              label="标签名称"
              name="tagName"
              rules={[{ required: true, message: '请输入标签名称' }]}
            >
              <Input placeholder="请输入标签名称" />
            </Form.Item>
            <Form.Item label="标签描述" name="tagDesc">
              <TextArea rows={3} placeholder="可选" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="添加子标签"
          open={addChildModalOpen}
          onCancel={() => {
            setAddChildModalOpen(false);
            addChildForm.resetFields();
          }}
          onOk={() => void handleAddChild()}
          confirmLoading={addChildLoading}
          destroyOnHidden
        >
          <Form form={addChildForm} layout="vertical">
            <Form.Item
              label="标签名称"
              name="tagName"
              rules={[{ required: true, message: '请输入标签名称' }]}
            >
              <Input placeholder="请输入子标签名称" />
            </Form.Item>
            <Form.Item label="标签描述" name="tagDesc">
              <TextArea rows={3} placeholder="可选" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Modal>
  );
};

export default TagManageModal;
