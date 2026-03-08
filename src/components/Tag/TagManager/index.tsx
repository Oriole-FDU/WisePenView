import React, { useEffect, useState, useCallback } from 'react';
import {
  Splitter,
  Button,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Tree,
  Empty,
  Popconfirm,
  Divider,
  Tag,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { TreeProps } from 'antd';
import { LuPlus, LuChevronDown } from 'react-icons/lu';
import { TagServices } from '@/services/Tag';
import type {
  CreateTagRequest,
  UpdateTagRequest,
  TagTreeResponse,
} from '@/services/Tag';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { TagManagerProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;

/** 判断节点是否有效（排除空叶子节点） */
const isValidNode = (node: TagTreeResponse): boolean =>
  Boolean(node?.tagId && (node.tagName ?? '').trim());

/** 在树中按 tagId 查找节点 */
const findNodeByTagId = (
  nodes: TagTreeResponse[],
  tagId: string
): TagTreeResponse | null => {
  for (const node of nodes) {
    if (node.tagId === tagId) return node;
    if (node.children?.length) {
      const found = findNodeByTagId(node.children, tagId);
      if (found) return found;
    }
  }
  return null;
};

/** 在树中查找某节点的父节点 tagId，根节点返回 undefined */
const findParentTagId = (
  nodes: TagTreeResponse[],
  childTagId: string,
  parentTagId?: string
): string | undefined => {
  for (const node of nodes) {
    if (node.tagId === childTagId) return parentTagId;
    if (node.children?.length) {
      const found = findParentTagId(node.children, childTagId, node.tagId);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

/** 将 TagTreeResponse 转为 antd Tree 的 DataNode */
const toTreeDataNode = (node: TagTreeResponse): DataNode | null => {
  if (!isValidNode(node)) return null;
  const validChildren = node.children
    ?.map(toTreeDataNode)
    .filter((n): n is DataNode => n != null) ?? [];
  const hasChildren = validChildren.length > 0;
  return {
    key: node.tagId,
    title: (
      <Tag variant="outlined" className={styles.tagNode}>
        {node.tagName}
      </Tag>
    ),
    ...(hasChildren ? { children: validChildren } : { isLeaf: true }),
  };
};

const TagManager: React.FC<TagManagerProps> = ({ groupId }) => {
  const [selectedTag, setSelectedTag] = useState<TagTreeResponse | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [treeLoading, setTreeLoading] = useState(true);
  const [dropLoading, setDropLoading] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [rawList, setRawList] = useState<TagTreeResponse[]>([]);
  const [addRootModalOpen, setAddRootModalOpen] = useState(false);
  const [addRootLoading, setAddRootLoading] = useState(false);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addRootForm] = Form.useForm<Pick<CreateTagRequest, 'tagName' | 'tagDesc'>>();
  const [editForm] = Form.useForm<Pick<UpdateTagRequest, 'tagName' | 'tagDesc'>>();
  const [addChildForm] = Form.useForm<Pick<CreateTagRequest, 'tagName' | 'tagDesc'>>();

  const refreshTree = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setTreeLoading(true);
      try {
        const list = await TagServices.getTagTree(groupId ? { groupId } : undefined);
        setRawList(list);
        const nodes = list
          .map(toTreeDataNode)
          .filter((n): n is DataNode => n != null);
        setTreeData(nodes);
      } catch (err) {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
        setRawList([]);
      } finally {
        setTreeLoading(false);
      }
    };
    fetch();
  }, [groupId, refreshTrigger]);

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
    (selectedKeys: React.Key[], info: { node: { key: React.Key } }) => {
      if (selectedKeys.length === 0) {
        setSelectedTag(null);
        return;
      }
      const tagId = String(info.node.key);
      const found = findNodeByTagId(rawList, tagId);
      setSelectedTag(found ?? null);
    },
    [rawList]
  );

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    const { node, dragNode, dropToGap } = info;
    const targetTagId = String(dragNode.key);
    const dropKey = String(node.key);
    const newParentId = dropToGap
      ? findParentTagId(rawList, dropKey)
      : dropKey;

    setDropLoading(true);
    try {
      await TagServices.moveTag({
        targetTagId,
        newParentId,
        ...(groupId ? { groupId } : {}),
      });
      message.success('标签已移动');
      refreshTree();
    } catch (err) {
      message.error(parseErrorMessage(err, '移动标签失败'));
      refreshTree();
      throw err;
    } finally {
      setDropLoading(false);
    }
  };

  const handleAddRoot = async () => {
    try {
      const values = await addRootForm.validateFields();
      setAddRootLoading(true);
      await TagServices.createTag({
        tagName: values.tagName,
        tagDesc: values.tagDesc,
        ...(groupId ? { groupId } : {}),
      });
      message.success('标签已创建');
      addRootForm.resetFields();
      setAddRootModalOpen(false);
      refreshTree();
    } catch (err) {
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
      await TagServices.updateTag({
        targetTagId: selectedTag.tagId,
        tagName: values.tagName,
        tagDesc: values.tagDesc,
        ...(groupId ? { groupId } : {}),
      });
      message.success('标签已更新');
      refreshTree();
    } catch (err) {
      message.error(parseErrorMessage(err, '更新标签失败'));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag?.tagId) return;
    try {
      setDeleteLoading(true);
      await TagServices.removeTag({
        targetTagId: selectedTag.tagId,
        ...(groupId ? { groupId } : {}),
      });
      message.success('标签已删除');
      setSelectedTag(null);
      refreshTree();
    } catch (err) {
      message.error(parseErrorMessage(err, '删除标签失败'));
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!selectedTag?.tagId) return;
    try {
      const values = await addChildForm.validateFields();
      setAddChildLoading(true);
      await TagServices.createTag({
        tagName: values.tagName,
        parentId: selectedTag.tagId,
        tagDesc: values.tagDesc,
        ...(groupId ? { groupId } : {}),
      });
      message.success('子标签已添加');
      addChildForm.resetFields();
      setAddChildModalOpen(false);
      refreshTree();
    } catch (err) {
      message.error(parseErrorMessage(err, '添加子标签失败'));
    } finally {
      setAddChildLoading(false);
    }
  };

  const renderLeftContent = () => {
    if (treeLoading) {
      return (
        <div className={styles.treeWrapper}>
          <Spin />
        </div>
      );
    }
    if (!treeData.length) {
      return (
        <div className={styles.treeWrapper}>
          <Empty description="暂无标签" />
        </div>
      );
    }
    return (
      <div className={styles.treeWrapper}>
        <Tree
          showLine
          draggable
          switcherIcon={
            <span className={styles.switcherIcon}>
              <LuChevronDown size={18} />
            </span>
          }
          defaultExpandAll
          treeData={treeData}
          className={styles.tree}
          selectedKeys={selectedTag ? [selectedTag.tagId] : []}
          onSelect={handleTreeSelect}
          onDrop={handleDrop}
        />
      </div>
    );
  };

  const renderRightContent = () => {
    if (!selectedTag) {
      return (
        <div className={styles.nodeDetailEmpty}>
          <div className={styles.emptyHint}>拖动标签调整层级，点击标签编辑详情</div>
          <Button onClick={() => setAddRootModalOpen(true)}>
            <LuPlus />
            新建标签
          </Button>
        </div>
      );
    }
    return (
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
            <Button type="primary" onClick={handleUpdate} loading={updateLoading}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
        <Divider />
        <div className={styles.sectionTitle}>节点操作</div>
        <div className={styles.nodeActions}>
          <Button onClick={() => { addChildForm.resetFields(); setAddChildModalOpen(true); }}>
            添加子节点
          </Button>
          <Popconfirm
            title="确定删除该标签及其所有子标签？"
            description="此操作不可恢复"
            onConfirm={handleDelete}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ loading: deleteLoading }}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.splitterWrapper}>
      <Splitter className={styles.splitter}>
        <Splitter.Panel defaultSize="50%" min="240px" className={styles.splitterLeft}>
          <div className={styles.leftPanelWrapper}>
            {dropLoading && (
              <div className={styles.dropOverlay}>
                <Spin tip="移动中..." />
              </div>
            )}
            {renderLeftContent()}
          </div>
        </Splitter.Panel>
        <Splitter.Panel defaultSize="50%" min="280px" className={styles.splitterRight}>
          <div className={styles.nodeDetail}>{renderRightContent()}</div>
        </Splitter.Panel>
      </Splitter>

      <Modal
        title="新建标签"
        open={addRootModalOpen}
        onCancel={() => { addRootForm.resetFields(); setAddRootModalOpen(false); }}
        onOk={handleAddRoot}
        okText="确定"
        cancelText="取消"
        confirmLoading={addRootLoading}
      >
        <Form form={addRootForm} layout="vertical" className={styles.addRootForm}>
          <Form.Item
            label="标签名称"
            name="tagName"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item label="标签描述" name="tagDesc">
            <TextArea rows={3} placeholder="请输入标签描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加子标签"
        open={addChildModalOpen}
        onCancel={() => { addChildForm.resetFields(); setAddChildModalOpen(false); }}
        onOk={handleAddChild}
        okText="确定"
        cancelText="取消"
        confirmLoading={addChildLoading}
      >
        <Form form={addChildForm} layout="vertical" className={styles.addChildForm}>
          <Form.Item
            label="子标签名称"
            name="tagName"
            rules={[{ required: true, message: '请输入子标签名称' }]}
          >
            <Input placeholder="请输入子标签名称" />
          </Form.Item>
          <Form.Item label="标签描述" name="tagDesc">
            <TextArea rows={3} placeholder="请输入标签描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManager;
