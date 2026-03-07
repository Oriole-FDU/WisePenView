import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Input, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { LuUpload } from 'react-icons/lu';
import { GroupServices } from '@/services/Group';
import type { EditGroupRequest } from '@/services/Group';
import type { EditGroupInfoModalProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;

/** 编辑小组表单值（含封面上传） */
type EditGroupFormValues = Pick<EditGroupRequest, 'groupName' | 'description'> & {
  cover?: UploadFile[];
};

const EditGroupInfoModal: React.FC<EditGroupInfoModalProps> = ({
  open,
  onCancel,
  groupId,
  groupName = '',
  description = '',
  cover,
  onSuccess,
}) => {
  const [form] = Form.useForm<EditGroupFormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ groupName, description });
      // cover 来自 coverUrl (string)，表单 cover 字段为 UploadFile[]，仅用于新上传，不在此初始化
    }
  }, [open, form, groupName, description]);

  const handleConfirm = async () => {
    if (!groupId) {
      message.error('小组ID不存在');
      return;
    }
    try {
      const formValues = await form.validateFields() as EditGroupFormValues;
      setLoading(true);
      const params: EditGroupRequest = {
        groupId: String(groupId),
        groupName: formValues.groupName,
        description: formValues.description,
        coverUrl: cover ?? '',
      };
      await GroupServices.editGroup(params);
      message.success('小组信息已更新');
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('编辑小组信息失败:', error);
      message.error('编辑小组信息失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑小组信息"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} loading={loading}>
          确定
        </Button>,
      ]}
      width={500}
    >
      <Form form={form} layout="vertical" className={styles.modalFormPadding}>
        <Form.Item
          label="小组名称"
          name="groupName"
          rules={[{ required: true, message: '请输入小组名称' }]}
        >
          <Input placeholder="请输入小组名称" />
        </Form.Item>
        <Form.Item label="小组描述" name="description">
          <TextArea rows={4} placeholder="请输入小组描述（可选）" />
        </Form.Item>
        {/* TODO: 图床未实现，上传封面功能待实现 */}
        <Form.Item label="封面图片" name="cover">
          <Upload name="file" beforeUpload={() => false} accept="image/*" maxCount={1}>
            <Button icon={<LuUpload />}>点击上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditGroupInfoModal;
