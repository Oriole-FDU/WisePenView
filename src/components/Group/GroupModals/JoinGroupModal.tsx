import React from 'react';
import { Modal, Button, Form, Input } from 'antd';
import { useRequest } from 'ahooks';
import { useGroupService } from '@/contexts/ServicesContext';
import type { JoinGroupRequest } from '@/services/Group';
import type { JoinGroupModalProps } from './index.type';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';

const INVITE_CODE_LENGTH = 8;

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ open, onCancel, onSuccess }) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [form] = Form.useForm<JoinGroupRequest>();
  const isConfirmDisabled = Form.useWatch('inviteCode', form)?.trim().length !== INVITE_CODE_LENGTH;

  const { loading, run: runJoinGroup } = useRequest(
    async (params: JoinGroupRequest) => groupService.joinGroup(params),
    {
      manual: true,
      onSuccess: () => {
        message.success('加入小组成功');
        form.resetFields();
        onSuccess?.();
        onCancel();
      },
      onError: (err: unknown) => {
        const isValidationError =
          err != null &&
          typeof err === 'object' &&
          'errorFields' in err &&
          Array.isArray((err as { errorFields?: unknown }).errorFields);
        if (!isValidationError) {
          message.error(parseErrorMessage(err, '加入小组失败'));
        }
      },
    }
  );

  const handleConfirm = async () => {
    const params = await form.validateFields();
    runJoinGroup(params);
  };

  return (
    <Modal
      title="加入小组"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
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
          <Input placeholder="请输入 8 位邀请码" maxLength={INVITE_CODE_LENGTH} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JoinGroupModal;
