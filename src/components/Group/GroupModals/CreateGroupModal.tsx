import React, { useState } from 'react';
import { Modal, Button, Form, Input, Select, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { LuUpload } from 'react-icons/lu';
import { GroupServices } from '@/services/Group';
import type { CreateGroupRequest } from '@/services/Group';
import { useUserStore } from '@/store/useUserStore';
import { GROUP_TYPE, GROUP_TYPE_LABELS, ALLOWED_GROUP_TYPES_MAP } from '@/constants/group';
import type { CreateGroupModalProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;
const { Option } = Select;

const groupTypeOptionsBase = Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm<CreateGroupRequest>();
  const [submitting, setSubmitting] = useState(false);

  const identityType = useUserStore((state) => state.user?.identityType);
  const allowedGroupTypes = ALLOWED_GROUP_TYPES_MAP[identityType ?? 3];
  const groupTypeOptions = groupTypeOptionsBase.filter((opt) =>
    allowedGroupTypes.includes(opt.value)
  );

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const normalizeUpload = (e: { fileList?: UploadFile[] } | UploadFile[]) =>
    Array.isArray(e) ? e : (e?.fileList ?? []);

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields() as CreateGroupRequest;
      setSubmitting(true);
      await GroupServices.createGroup(values);
      message.success('创建成功');
      form.resetFields();
      onCancel();
      onSuccess?.();
    } catch (err: unknown) {
      const isValidationError =
        err != null &&
        typeof err === 'object' &&
        'errorFields' in err &&
        Array.isArray((err as { errorFields?: unknown }).errorFields);
      if (!isValidationError) {
        const msg = (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
        message.error(msg || '创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="新建小组"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} loading={submitting}>
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
        <Form.Item
          label="小组描述"
          name="description"
          rules={[{ required: true, message: '请输入小组描述' }]}
        >
          <TextArea rows={4} placeholder="请输入小组描述（可选）" />
        </Form.Item>
        <Form.Item
          label="小组类型"
          name="groupType"
          initialValue={GROUP_TYPE.NORMAL}
          rules={[{ required: true, message: '请选择小组类型' }]}
        >
          <Select>
            {groupTypeOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        {/* TODO: 图床未实现，上传封面功能待实现 */}
        <Form.Item
          label="封面图片"
          name="cover"
          valuePropName="fileList"
          getValueFromEvent={normalizeUpload}
        >
          <Upload name="file" beforeUpload={() => false} accept="image/*" maxCount={1}>
            <Button icon={<LuUpload />}>点击上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateGroupModal;
