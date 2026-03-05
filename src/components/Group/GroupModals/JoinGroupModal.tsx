import React from 'react';
import { Modal, Button, Form, Input, message } from 'antd';
import { GroupServices } from '@/services/Group';
import type { JoinGroupRequest } from '@/services/Group';
import type { JoinGroupModalProps } from './index.type';
import styles from './style.module.less';

const INVITE_CODE_LENGTH = 6;

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm<JoinGroupRequest>();
  const isConfirmDisabled = Form.useWatch('inviteCode', form)?.trim().length !== INVITE_CODE_LENGTH;

  const handleConfirm = async () => {
    try {
      const params = (await form.validateFields()) as JoinGroupRequest;
      await GroupServices.joinGroup(params);
      message.success('加入小组成功');
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (err: unknown) {
      const isValidationError =
        err != null &&
        typeof err === 'object' &&
        'errorFields' in err &&
        Array.isArray((err as { errorFields?: unknown }).errorFields);
      if (!isValidationError) {
        message.error('加入小组失败，请重试');
      }
    }
  };

  return (
    <Modal
      title="加入小组"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} disabled={isConfirmDisabled}>
          确定
        </Button>,
      ]}
      width={400}
    >
      <Form form={form} layout="vertical" className={styles.modalFormPadding}>
        <Form.Item
          label="邀请码"
          name="inviteCode"
          rules={[{ required: true, message: '请输入邀请码' }]}
        >
          <Input placeholder="请输入 6 位邀请码" maxLength={INVITE_CODE_LENGTH} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JoinGroupModal;
