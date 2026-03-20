import React, { useState, useEffect } from 'react';
import { Modal, Button, InputNumber, Form, Alert } from 'antd';
import { useQuotaService } from '@/contexts/ServicesContext';
import { useMemberEditGuard } from './useMemberEditGuard';
import type { AssignQuotaModalProps } from './index.type';
import SelectedMemberList from '@/components/Common/SelectedMemberList';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const AssignQuotaModal: React.FC<AssignQuotaModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  memberIds,
  members,
  permissionConfig,
}) => {
  const quotaService = useQuotaService();
  const message = useAppMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [groupQuota, setGroupQuotaState] = useState<{ used: number; limit: number }>({
    used: 0,
    limit: 0,
  });

  const maxUsed = Math.max(0, ...members.map((m) => m.used ?? 0));
  const { canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    permissionConfig.editableRolesForQuota,
    { checkOwner: false, forQuota: true }
  );

  useEffect(() => {
    if (open) {
      form.resetFields();
      quotaService
        .fetchGroupQuota(groupId)
        .then(setGroupQuotaState)
        .catch(() => setGroupQuotaState({ used: 0, limit: 0 }));
    }
  }, [open, form, groupId, quotaService]);

  const handleConfirm = async () => {
    try {
      const value = form.getFieldValue('quota');
      if (!value || value <= 0) {
        message.error('请输入有效的配额值');
        return;
      }
      if (value < maxUsed) {
        message.error(`配额限额不能小于成员的当前用量（最大用量：${maxUsed.toLocaleString()}）`);
        return;
      }
      setLoading(true);
      await quotaService.setGroupQuota({
        groupId,
        targetUserIds: memberIds,
        newTokenLimit: Math.floor(value),
      });
      message.success(`已为 ${memberIds.length} 位成员分配配额`);
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('分配配额失败:', error);
      message.error('分配配额失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="分配配额"
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
          loading={loading}
          disabled={confirmDisabled}
        >
          确定
        </Button>,
      ]}
      width={500}
    >
      <Form form={form} layout="vertical" className={styles.modalFormPadding}>
        {!canEdit && (
          <Alert
            description={'您不能分配组长/管理员的配额。'}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <div className={styles.quotaInfo}>
          小组配额使用：{groupQuota.used.toLocaleString()} / {groupQuota.limit.toLocaleString()}{' '}
          计算点
        </div>
        <Form.Item
          label="配额限额"
          name="quota"
          rules={[
            { required: true, message: '请输入配额限额' },
            { type: 'number', min: 1, message: '配额必须大于0' },
            {
              validator: (_, val) =>
                val == null || val >= maxUsed
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(`不能小于成员当前用量（最大：${maxUsed.toLocaleString()}）`)
                    ),
            },
          ]}
        >
          <InputNumber
            className={styles.fullWidth}
            placeholder="请输入整数"
            min={maxUsed || 1}
            precision={0}
          />
        </Form.Item>
        <SelectedMemberList members={members} />
      </Form>
    </Modal>
  );
};

export default AssignQuotaModal;
